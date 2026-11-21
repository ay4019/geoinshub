/**
 * Static axial compression capacity of single piles in layered soil.
 *
 * Driven piles — FHWA GEC-12 (Hannigan et al. 2016, FHWA-NHI-16-009) static analysis framework:
 *   • cohesive side: total-stress alpha method, alpha from API RP 2GEO / Randolph & Murphy (1985):
 *       psi = c_u / sigma'_v ; alpha = 0.5 psi^-0.5 (psi <= 1), 0.5 psi^-0.25 (psi > 1), alpha <= 1.0
 *   • cohesionless side: effective-stress beta method, beta = K tan(delta),
 *       K = K_0 (K_s/K_0), K_0 = 1 - sin(phi') (Kulhawy 1984, 1991)
 *   • cohesive toe: q_t = 9 c_u
 *   • cohesionless toe: Meyerhof (1976) SPT method as given in GEC-12, q_t = 40 N̄60 (D_b/D) <= 400 N̄60 kPa
 *
 * Drilled shafts — FHWA GEC-10 (Brown et al. 2010/2018, FHWA-NHI-18-024):
 *   • cohesive side: alpha = 0.55 for c_u/p_a <= 1.5, 0.55 - 0.1(c_u/p_a - 1.5) up to 2.5;
 *     top 1.5 m and bottom 1 D excluded
 *   • cohesionless side: beta = (1 - sin phi')(sigma'_p/sigma'_v)^(sin phi') tan phi' <= K_p tan phi',
 *     sigma'_p/p_a = 0.47 N60^m (m = 0.6 clean sand, 0.8 silty sand) (Mayne 2007)
 *   • cohesive toe: q_p = 9 c_u <= 3.83 MPa
 *   • cohesionless toe: q_p = 57.5 N60 kPa <= 2.9 MPa (1.2 N60 ksf <= 60 ksf)
 */
import {
  GAMMA_W,
  PA,
  deg2rad,
  readChoice,
  readNumber,
  round,
  screeningWarnings,
  type DesignCalculator,
  type FormValues,
} from "@/lib/design-tools/common";
import type { CalculationResult } from "@/lib/types";

export type PileMethod = "driven" | "drilled-shaft";
export type LayerSoil = "clay" | "sand";
export type PileMaterial = "concrete" | "steel" | "timber";

export interface PileLayer {
  thickness: number; // m
  soil: LayerSoil;
  unitWeight: number; // kN/m3 (total; buoyant handled via GWT)
  cu: number; // kPa (clay)
  phi: number; // deg (sand)
  n60: number; // blows/0.3 m (sand)
  /** GEC-10 sigma'_p exponent per layer (silty sand m = 0.8); falls back to PileInput.siltySand. */
  siltySand?: boolean;
}

export interface PileInput {
  method: PileMethod;
  diameter: number; // m
  length: number; // m (embedded)
  groundwaterDepth: number; // m
  layers: PileLayer[];
  material: PileMaterial;
  ksK0: number; // driven-pile lateral stress ratio K_s/K_0
  siltySand: boolean; // GEC-10 sigma'_p exponent
  factorOfSafety: number;
}

export interface PileLayerResult {
  index: number;
  soil: LayerSoil;
  top: number;
  bottom: number;
  embeddedLength: number;
  meanSigmaV: number;
  coefficient: number; // alpha or beta (average)
  unitSide: number; // kPa (average)
  sideResistance: number; // kN
}

export interface PileResult {
  perimeter: number;
  toeArea: number;
  layers: PileLayerResult[];
  sideResistance: number;
  toeUnitResistance: number;
  toeResistance: number;
  ultimate: number;
  allowable: number;
  toeSoil: LayerSoil;
  sigmaVToe: number;
  /** Side-resistance distribution along the shaft, one point per integration step. */
  profile: PileProfilePoint[];
  notes: string[];
}

export interface PileProfilePoint {
  z: number; // m
  sigmaV: number; // kPa
  coefficient: number; // alpha or beta
  unitSide: number; // kPa
  layerIndex: number;
}

const DELTA_RATIO: Record<PileMaterial, number> = { concrete: 0.9, steel: 0.8, timber: 0.85 };

function layerAt(layers: PileLayer[], depth: number): { layer: PileLayer; index: number; top: number } {
  let top = 0;
  for (let i = 0; i < layers.length; i += 1) {
    const bottom = top + layers[i].thickness;
    if (depth < bottom || i === layers.length - 1) {
      return { layer: layers[i], index: i, top };
    }
    top = bottom;
  }
  return { layer: layers[layers.length - 1], index: layers.length - 1, top };
}

/** Vertical effective stress at depth z for the layered profile (layers extended downward by the last one). */
export function verticalEffectiveStress(layers: PileLayer[], z: number, gwt: number): number {
  let sigma = 0;
  let top = 0;
  for (let i = 0; i < layers.length && top < z; i += 1) {
    const isLast = i === layers.length - 1;
    const bottom = isLast ? Math.max(z, top + layers[i].thickness) : top + layers[i].thickness;
    const segBottom = Math.min(bottom, z);
    sigma += layers[i].unitWeight * (segBottom - top);
    top = segBottom;
  }
  return Math.max(sigma - GAMMA_W * Math.max(z - gwt, 0), 0.1);
}

function apiAlpha(cu: number, sigmaV: number): number {
  const psi = cu / Math.max(sigmaV, 0.1);
  const alpha = psi <= 1 ? 0.5 * psi ** -0.5 : 0.5 * psi ** -0.25;
  return Math.min(alpha, 1);
}

function gec10Alpha(cu: number): number {
  const ratio = cu / PA;
  if (ratio <= 1.5) return 0.55;
  return Math.max(0.45, 0.55 - 0.1 * (ratio - 1.5));
}

export function computePileAxialCapacity(input: PileInput): PileResult {
  const { method, diameter: D, length: L, groundwaterDepth: gwt, layers } = input;
  const perimeter = Math.PI * D;
  const toeArea = (Math.PI * D ** 2) / 4;
  const dz = Math.min(0.1, L / 200);
  const notes: string[] = [];

  const layerResults: PileLayerResult[] = layers.map((layer, index) => ({
    index,
    soil: layer.soil,
    top: 0,
    bottom: 0,
    embeddedLength: 0,
    meanSigmaV: 0,
    coefficient: 0,
    unitSide: 0,
    sideResistance: 0,
  }));
  let cursor = 0;
  layers.forEach((layer, index) => {
    layerResults[index].top = cursor;
    cursor += layer.thickness;
    layerResults[index].bottom = index === layers.length - 1 ? Math.max(cursor, L) : cursor;
  });

  const coefSum = new Array(layers.length).fill(0);
  const sigmaSum = new Array(layers.length).fill(0);
  const lengthSum = new Array(layers.length).fill(0);
  const profile: PileProfilePoint[] = [];

  for (let z = dz / 2; z < L; z += dz) {
    const seg = Math.min(dz, L - (z - dz / 2));
    const { layer, index } = layerAt(layers, z);
    const sigmaV = verticalEffectiveStress(layers, z, gwt);
    let coefficient = 0;
    let fs = 0;

    if (method === "driven") {
      if (layer.soil === "clay") {
        coefficient = apiAlpha(layer.cu, sigmaV);
        fs = coefficient * layer.cu;
      } else {
        const phi = deg2rad(layer.phi);
        const k = (1 - Math.sin(phi)) * input.ksK0;
        coefficient = k * Math.tan(DELTA_RATIO[input.material] * phi);
        fs = coefficient * sigmaV;
      }
    } else {
      const excluded = z < 1.5 || z > L - D;
      if (layer.soil === "clay") {
        coefficient = excluded ? 0 : gec10Alpha(layer.cu);
        fs = coefficient * layer.cu;
      } else {
        const phi = deg2rad(layer.phi);
        const m = (layer.siltySand ?? input.siltySand) ? 0.8 : 0.6;
        const sigmaP = 0.47 * Math.max(layer.n60, 1) ** m * PA;
        const ocr = Math.max(sigmaP / sigmaV, 1);
        const kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;
        coefficient = Math.min((1 - Math.sin(phi)) * ocr ** Math.sin(phi), kp) * Math.tan(phi);
        fs = coefficient * sigmaV;
      }
    }

    coefSum[index] += coefficient * seg;
    sigmaSum[index] += sigmaV * seg;
    lengthSum[index] += seg;
    layerResults[index].sideResistance += fs * perimeter * seg;
    profile.push({ z, sigmaV, coefficient, unitSide: fs, layerIndex: index });
  }

  layerResults.forEach((result, index) => {
    result.embeddedLength = lengthSum[index];
    if (lengthSum[index] > 0) {
      result.coefficient = coefSum[index] / lengthSum[index];
      result.meanSigmaV = sigmaSum[index] / lengthSum[index];
      result.unitSide = result.sideResistance / (perimeter * lengthSum[index]);
    }
  });

  const { layer: toeLayer, top: toeLayerTop } = layerAt(layers, Math.max(L - 1e-6, 0));
  const sigmaVToe = verticalEffectiveStress(layers, L, gwt);
  let toeUnit = 0;

  if (toeLayer.soil === "clay") {
    toeUnit = method === "driven" ? 9 * toeLayer.cu : Math.min(9 * toeLayer.cu, 3830);
  } else if (method === "driven") {
    const db = Math.max(L - toeLayerTop, 0);
    const cn = Math.min(Math.sqrt(PA / Math.max(sigmaVToe, 1)), 1.7);
    const n160 = toeLayer.n60 * cn;
    toeUnit = Math.min(40 * n160 * (db / D), 400 * n160);
    notes.push(
      `Toe (Meyerhof 1976, GEC-12): (N1)60 = ${round(n160, 1)} from N60 with C_N = ${round(cn, 2)}; bearing-stratum embedment D_b = ${round(db, 2)} m.`,
    );
  } else {
    toeUnit = Math.min(57.5 * Math.min(toeLayer.n60, 50), 2870);
    if (toeLayer.n60 > 50) {
      notes.push("GEC-10: N60 > 50 at the toe — treat as intermediate geomaterial (IGM) rather than soil.");
    }
  }

  const sideResistance = layerResults.reduce((sum, r) => sum + r.sideResistance, 0);
  const toeResistance = toeUnit * toeArea;
  const ultimate = sideResistance + toeResistance;

  if (method === "drilled-shaft") {
    notes.push("GEC-10: side resistance in cohesive soil excluded over the top 1.5 m and bottom one diameter.");
    notes.push("GEC-10 toe values correspond to a toe displacement of about 5% of the shaft diameter.");
  } else {
    notes.push("Driven-pile side resistance in cohesionless soil uses beta = K tan(delta) without a limiting critical depth (Fellenius).");
  }

  return {
    perimeter,
    toeArea,
    layers: layerResults,
    sideResistance,
    toeUnitResistance: toeUnit,
    toeResistance,
    ultimate,
    allowable: ultimate / input.factorOfSafety,
    toeSoil: toeLayer.soil,
    sigmaVToe,
    profile,
    notes,
  };
}

/** Reads up to three layers from flat form fields: layer{n}Thickness, layer{n}Soil, layer{n}Gamma, layer{n}Cu, layer{n}Phi, layer{n}N60. */
export function readLayers(values: FormValues, maxLayers = 3): PileLayer[] {
  const layers: PileLayer[] = [];
  for (let n = 1; n <= maxLayers; n += 1) {
    const thickness = Number(values[`layer${n}Thickness`] ?? 0);
    if (!Number.isFinite(thickness) || thickness <= 0) continue;
    const soil = readChoice(values, `layer${n}Soil`, ["clay", "sand"] as const, "clay");
    layers.push({
      thickness,
      soil,
      unitWeight: readNumber(values, `layer${n}Gamma`, `Layer ${n} unit weight`, { min: 10, max: 25, fallback: 18 }),
      cu: soil === "clay" ? readNumber(values, `layer${n}Cu`, `Layer ${n} c_u`, { min: 1, fallback: 50 }) : 0,
      phi: soil === "sand" ? readNumber(values, `layer${n}Phi`, `Layer ${n} φ′`, { min: 20, max: 45, fallback: 32 }) : 0,
      n60: soil === "sand" ? readNumber(values, `layer${n}N60`, `Layer ${n} N60`, { min: 1, max: 100, fallback: 20 }) : 0,
    });
  }
  if (!layers.length) {
    throw new Error("Define at least one soil layer with a positive thickness.");
  }
  return layers;
}

export const pileAxialCapacityCalculator: DesignCalculator = (values): CalculationResult => {
  const method = readChoice(values, "method", ["driven", "drilled-shaft"] as const, "driven");
  const input: PileInput = {
    method,
    diameter: readNumber(values, "diameter", "Pile diameter", { min: 0.1, max: 4 }),
    length: readNumber(values, "length", "Embedded length", { min: 1, max: 100 }),
    groundwaterDepth: readNumber(values, "groundwaterDepth", "Groundwater depth", { min: 0, fallback: 100 }),
    layers: readLayers(values),
    material: readChoice(values, "material", ["concrete", "steel", "timber"] as const, "concrete"),
    ksK0: readNumber(values, "ksK0", "K_s/K_0", { min: 0.5, max: 2.5, fallback: method === "driven" ? 1.5 : 1 }),
    siltySand: values.sandType === "silty",
    factorOfSafety: readNumber(values, "factorOfSafety", "Factor of safety", { min: 1.5, fallback: 2.5 }),
  };
  const result = computePileAxialCapacity(input);

  return {
    title: method === "driven" ? "Driven Pile Static Capacity (FHWA GEC-12)" : "Drilled Shaft Axial Capacity (FHWA GEC-10)",
    summary: `Ultimate ${round(result.ultimate, 0)} kN = side ${round(result.sideResistance, 0)} kN + toe ${round(
      result.toeResistance,
      0,
    )} kN; allowable ${round(result.allowable, 0)} kN with FS = ${input.factorOfSafety}.`,
    items: [
      ...result.layers
        .filter((layer) => layer.embeddedLength > 0)
        .map((layer) => ({
          label: `Layer ${layer.index + 1} (${layer.soil}, ${round(layer.top, 1)}–${round(Math.min(layer.bottom, input.length), 1)} m): ${
            layer.soil === "clay" ? "α" : "β"
          } = ${round(layer.coefficient, 3)}, f_s = ${round(layer.unitSide, 1)} kPa`,
          value: round(layer.sideResistance, 1),
          unit: "kN",
        })),
      { label: "Total side resistance, R_s", value: round(result.sideResistance, 1), unit: "kN" },
      { label: "σ'_v at toe", value: round(result.sigmaVToe, 1), unit: "kPa" },
      { label: "Unit toe resistance, q_t", value: round(result.toeUnitResistance, 1), unit: "kPa" },
      { label: "Toe resistance, R_t", value: round(result.toeResistance, 1), unit: "kN" },
      { label: "Ultimate resistance, R_u", value: round(result.ultimate, 1), unit: "kN" },
      { label: "Allowable resistance, R_u / FS", value: round(result.allowable, 1), unit: "kN" },
    ],
    notes: [
      ...result.notes,
      "Pile self-weight, downdrag, group effects, and set-up/relaxation are not included.",
      "For LRFD, apply the AASHTO resistance factors appropriate to the static method and the field verification method instead of FS.",
    ],
    warnings: screeningWarnings(
      result.sideResistance / Math.max(result.ultimate, 1) < 0.2 ? ["Capacity is dominated by toe resistance — confirm toe stratum thickness below the pile tip."] : [],
    ),
  };
};
