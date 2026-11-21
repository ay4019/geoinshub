/**
 * Soil-strata and design-input model behind the interactive pile tabs (Soil Strata → Pile Capacity → Report).
 *
 * The UI works with descriptive soil types and lets each layer take its strength either directly
 * (c_u for cohesive, φ′ for cohesionless) or from SPT N60:
 *   • cohesive:      c_u = f₁ · N60                                (Stroud 1974; f₁ ≈ 4.4–6 kPa, default 5)
 *   • cohesionless:  φ′ = 27.1 + 0.3 (N₁)60 − 0.00054 (N₁)60²      (Wolff 1989, after Peck, Hanson & Thornburn 1974)
 *                    (N₁)60 = C_N N60, C_N = (p_a/σ′_v)^0.5 ≤ 1.7, σ′_v at mid-layer
 * N60 is only required where it is used: strength from SPT, or an AASHTO method that works from N60
 * (checked in lib/design-tools/pile-design.ts). The capacity engine is lib/design-tools/pile-design.ts.
 * All values are SI (m, kPa, kN/m³, kN, degrees).
 */
import { GAMMA_W, PA, round } from "@/lib/design-tools/common";

export type StrataSoilType = "clay" | "silty-clay" | "silt" | "sand" | "silty-sand" | "gravel";
export type StrengthSource = "direct" | "spt";
export type Behaviour = "cohesive" | "cohesionless";

export interface SoilTypeMeta {
  label: string;
  short: string;
  behaviour: Behaviour;
  /** Base fill and pattern ink of the section drawing (decorative; every layer is also labelled). */
  fill: string;
  ink: string;
  defaults: { gamma: number; cu: number; phi: number; n60: number };
}

export const SOIL_TYPES: Record<StrataSoilType, SoilTypeMeta> = {
  clay: { label: "Clay", short: "CL", behaviour: "cohesive", fill: "#c9a27e", ink: "#7d5634", defaults: { gamma: 18, cu: 40, phi: 0, n60: 8 } },
  "silty-clay": {
    label: "Silty clay",
    short: "CL-ML",
    behaviour: "cohesive",
    fill: "#d4b591",
    ink: "#86613d",
    defaults: { gamma: 18.5, cu: 50, phi: 0, n60: 10 },
  },
  silt: { label: "Silt", short: "ML", behaviour: "cohesive", fill: "#ddcba8", ink: "#8b7550", defaults: { gamma: 18.5, cu: 35, phi: 0, n60: 7 } },
  sand: { label: "Sand", short: "SP", behaviour: "cohesionless", fill: "#ecd69e", ink: "#a8843a", defaults: { gamma: 19, cu: 0, phi: 33, n60: 20 } },
  "silty-sand": {
    label: "Silty sand",
    short: "SM",
    behaviour: "cohesionless",
    fill: "#e2d0a4",
    ink: "#97793f",
    defaults: { gamma: 19, cu: 0, phi: 31, n60: 15 },
  },
  gravel: { label: "Gravel", short: "GW", behaviour: "cohesionless", fill: "#cfc3ad", ink: "#7a6a52", defaults: { gamma: 20.5, cu: 0, phi: 38, n60: 40 } },
};

export const SOIL_TYPE_ORDER: StrataSoilType[] = ["clay", "silty-clay", "silt", "sand", "silty-sand", "gravel"];

export interface StrataLayer {
  id: string;
  type: StrataSoilType;
  thickness: number;
  gamma: number;
  source: StrengthSource;
  cu: number;
  phi: number;
  /** NaN / null when not entered (optional for direct φ′ or c_u). */
  n60: number;
}

/* ───────────────────────────── design inputs ───────────────────────────── */

export type DesignCode = "ec7" | "aashto" | "tbdy";
export type PileType = "driven" | "bored" | "cfa";
export type PileMaterial = "concrete" | "steel" | "timber";
export type NqMethod = "berezantsev" | "navfac" | "meyerhof" | "vesic" | "cgs" | "reissner";
export type Ec7Approach = "DA1" | "DA2";

export interface PileDesignModel {
  layers: StrataLayer[];
  groundwaterDepth: number;
  /** Stroud (1974) f₁ for c_u = f₁ N60, kPa per blow. */
  stroudF1: number;

  code: DesignCode;
  pileType: PileType;
  material: PileMaterial;
  diameter: number;
  /** Embedded length below the pile head, m. */
  length: number;
  /** Depth of the pile head (cap underside / excavation level) below ground, D_f, m. */
  headDepth: number;
  /** Unit weight of the pile material, kN/m³. */
  pileUnitWeight: number;
  /** Subtract the net pile weight W′ = A Σ(γ_pile − γ_soil) h from the design resistance. */
  deductWeight: boolean;

  /** Limit σ′_v below the critical depth z_c = D_f + n·D. */
  criticalDepthEnabled: boolean;
  /** n in z_c = D_f + n·D; null → default for the pile type (driven 25, bored 15, CFA 20). */
  criticalDepthFactor: number | null;

  /** Overrides (null → code/pile-type default). */
  kOverride: number | null;
  deltaRatioOverride: number | null;
  alphaOverride: number | null;
  /** AASHTO driven piles: K_s/K₀ in β = K₀ (K_s/K₀) tan δ. */
  ksK0: number;

  nqMethod: NqMethod;
  ec7Approach: Ec7Approach;
  ec7ModelFactor: number;
  tbdy: { fsShaftStatic: number; fsBaseStatic: number; fsShaftSeismic: number; fsBaseSeismic: number };
}

export interface DerivedStrataLayer {
  layer: StrataLayer;
  meta: SoilTypeMeta;
  index: number;
  top: number;
  bottom: number;
  midSigmaV: number;
  cu: number;
  phi: number;
  /** NaN when not given. */
  n60: number;
  strengthNote: string;
  errors: string[];
}

export interface DerivedStrata {
  layers: DerivedStrataLayer[];
  totalThickness: number;
  errors: string[];
  isValid: boolean;
}

let idCounter = 0;
export function newLayerId(): string {
  idCounter += 1;
  return `L${Date.now().toString(36)}${idCounter}`;
}

export function createLayer(type: StrataSoilType, thickness = 4, source: StrengthSource = "direct"): StrataLayer {
  const d = SOIL_TYPES[type].defaults;
  return { id: newLayerId(), type, thickness, gamma: d.gamma, source, cu: d.cu, phi: d.phi, n60: d.n60 };
}

export interface StrataPreset {
  id: string;
  label: string;
  groundwaterDepth: number;
  layers: Array<Omit<StrataLayer, "id">>;
}

export const STRATA_PRESETS: StrataPreset[] = [
  {
    id: "clay-over-sand",
    label: "Soft clay over dense sand",
    groundwaterDepth: 2,
    layers: [
      { type: "clay", thickness: 6, gamma: 18, source: "direct", cu: 40, phi: 0, n60: Number.NaN },
      { type: "silty-sand", thickness: 8, gamma: 19, source: "spt", cu: 0, phi: 31, n60: 18 },
      { type: "sand", thickness: 10, gamma: 20, source: "direct", cu: 0, phi: 35, n60: 38 },
    ],
  },
  {
    id: "stiff-clay",
    label: "Stiffening clay profile",
    groundwaterDepth: 1.5,
    layers: [
      { type: "silt", thickness: 3, gamma: 18, source: "direct", cu: 30, phi: 0, n60: Number.NaN },
      { type: "clay", thickness: 9, gamma: 18.5, source: "direct", cu: 60, phi: 0, n60: Number.NaN },
      { type: "silty-clay", thickness: 14, gamma: 19.5, source: "spt", cu: 0, phi: 0, n60: 28 },
    ],
  },
  {
    id: "alluvial",
    label: "Alluvial sands on gravel",
    groundwaterDepth: 3,
    layers: [
      { type: "silty-sand", thickness: 4, gamma: 18.5, source: "spt", cu: 0, phi: 30, n60: 9 },
      { type: "clay", thickness: 3, gamma: 18, source: "spt", cu: 0, phi: 0, n60: 7 },
      { type: "sand", thickness: 9, gamma: 19.5, source: "spt", cu: 0, phi: 34, n60: 24 },
      { type: "gravel", thickness: 8, gamma: 21, source: "direct", cu: 0, phi: 38, n60: 45 },
    ],
  },
];

export function presetLayers(preset: StrataPreset): StrataLayer[] {
  return preset.layers.map((layer) => ({ ...layer, id: newLayerId() }));
}

export const DEFAULT_TBDY_FACTORS = { fsShaftStatic: 2, fsBaseStatic: 3, fsShaftSeismic: 1.5, fsBaseSeismic: 2 };

export function createDefaultPileModel(): PileDesignModel {
  const preset = STRATA_PRESETS[0];
  return {
    layers: presetLayers(preset),
    groundwaterDepth: preset.groundwaterDepth,
    stroudF1: 5,
    code: "ec7",
    pileType: "bored",
    material: "concrete",
    diameter: 0.8,
    length: 18,
    headDepth: 0,
    pileUnitWeight: 24,
    deductWeight: true,
    criticalDepthEnabled: true,
    criticalDepthFactor: null,
    kOverride: null,
    deltaRatioOverride: null,
    alphaOverride: null,
    ksK0: 1.5,
    nqMethod: "berezantsev",
    ec7Approach: "DA1",
    ec7ModelFactor: 1.5,
    tbdy: { ...DEFAULT_TBDY_FACTORS },
  };
}

/** Merges a stored (possibly older) model over the defaults; JSON turns NaN into null. */
export function normaliseModel(raw: Partial<PileDesignModel>): PileDesignModel {
  const base = createDefaultPileModel();
  const layers = Array.isArray(raw.layers) && raw.layers.length ? raw.layers : base.layers;
  return {
    ...base,
    ...raw,
    tbdy: { ...base.tbdy, ...(raw.tbdy ?? {}) },
    layers: layers.map((l) => ({
      ...createLayer(SOIL_TYPES[l.type] ? l.type : "clay"),
      ...l,
      n60: typeof l.n60 === "number" ? l.n60 : Number.NaN,
    })),
  };
}

/** Design codes that need a Gold membership; EC7 is open to everyone. */
export const PREMIUM_DESIGN_CODES: DesignCode[] = ["aashto", "tbdy"];

/** Falls back to EC7 when the stored model uses a code the viewer's membership does not unlock. */
export function gateDesignCode(model: PileDesignModel, premiumUnlocked: boolean): PileDesignModel {
  if (premiumUnlocked || !PREMIUM_DESIGN_CODES.includes(model.code)) return model;
  return { ...model, code: "ec7", deductWeight: true, kOverride: null, deltaRatioOverride: null, alphaOverride: null, nqMethod: "berezantsev" };
}

/* ───────────────────────────── stresses & strata ───────────────────────────── */

export interface StressLayer {
  thickness: number;
  gamma: number;
}

/** Vertical effective stress at depth z (hydrostatic water from gwt; last layer extends downward). */
export function effectiveStressAt(layers: StressLayer[], z: number, gwt: number): number {
  let sigma = 0;
  let top = 0;
  for (let i = 0; i < layers.length && top < z; i += 1) {
    const isLast = i === layers.length - 1;
    const bottom = isLast ? Math.max(z, top + layers[i].thickness) : top + layers[i].thickness;
    const segBottom = Math.min(bottom, z);
    sigma += layers[i].gamma * (segBottom - top);
    top = segBottom;
  }
  return Math.max(sigma - GAMMA_W * Math.max(z - gwt, 0), 0);
}

export function wolffPhi(n60: number, sigmaV: number): { phi: number; n160: number; cn: number } {
  const cn = Math.min(Math.sqrt(PA / Math.max(sigmaV, 1)), 1.7);
  const n160 = Math.max(n60, 0) * cn;
  const phi = Math.min(Math.max(27.1 + 0.3 * n160 - 0.00054 * n160 ** 2, 25), 45);
  return { phi, n160, cn };
}

const finite = (value: number): boolean => typeof value === "number" && Number.isFinite(value);

export function deriveStrata(model: PileDesignModel): DerivedStrata {
  const errors: string[] = [];
  if (!model.layers.length) errors.push("Add at least one soil layer.");
  if (!finite(model.groundwaterDepth) || model.groundwaterDepth < 0) errors.push("Groundwater depth must be zero or positive.");

  const stressLayers: StressLayer[] = model.layers.map((layer) => ({
    thickness: finite(layer.thickness) && layer.thickness > 0 ? layer.thickness : 0.01,
    gamma: finite(layer.gamma) ? layer.gamma : 18,
  }));
  const gwt = finite(model.groundwaterDepth) ? Math.max(model.groundwaterDepth, 0) : 100;

  let top = 0;
  const layers: DerivedStrataLayer[] = model.layers.map((layer, index) => {
    const meta = SOIL_TYPES[layer.type];
    const layerErrors: string[] = [];
    if (!finite(layer.thickness) || layer.thickness <= 0) layerErrors.push("Thickness must be greater than 0.");
    if (!finite(layer.gamma) || layer.gamma < 10 || layer.gamma > 25) layerErrors.push("γ must be between 10 and 25 kN/m³.");

    const thickness = finite(layer.thickness) && layer.thickness > 0 ? layer.thickness : 0;
    const bottom = top + thickness;
    const midSigmaV = stressLayers.length ? effectiveStressAt(stressLayers, Math.max(top + thickness / 2, 0.01), gwt) : 0;
    const hasN = finite(layer.n60) && layer.n60 > 0;

    let cu = 0;
    let phi = 0;
    let strengthNote = "";
    if (layer.source === "spt" && (!hasN || layer.n60 < 1 || layer.n60 > 100)) {
      layerErrors.push("N₆₀ between 1 and 100 is needed to derive the strength.");
    } else if (hasN && (layer.n60 < 1 || layer.n60 > 100)) {
      layerErrors.push("N₆₀ must be between 1 and 100.");
    }

    if (meta.behaviour === "cohesive") {
      if (layer.source === "spt") {
        const f1 = finite(model.stroudF1) && model.stroudF1 > 0 ? model.stroudF1 : 5;
        cu = f1 * (hasN ? layer.n60 : 0);
        strengthNote = `Stroud (1974): cᵤ = ${round(f1, 2)} × N₆₀`;
      } else {
        cu = layer.cu;
        strengthNote = "Entered cᵤ";
        if (!finite(cu) || cu < 1) layerErrors.push("cᵤ must be at least 1 kPa.");
      }
    } else if (layer.source === "spt") {
      const w = wolffPhi(hasN ? layer.n60 : 0, midSigmaV);
      phi = w.phi;
      strengthNote = `Wolff (1989), (N₁)₆₀ = ${round(w.n160, 1)}`;
    } else {
      phi = layer.phi;
      strengthNote = "Entered φ′";
      if (!finite(phi) || phi < 20 || phi > 45) layerErrors.push("φ′ must be between 20° and 45°.");
    }

    const derived: DerivedStrataLayer = {
      layer,
      meta,
      index,
      top,
      bottom,
      midSigmaV,
      cu,
      phi,
      n60: hasN ? layer.n60 : Number.NaN,
      strengthNote,
      errors: layerErrors,
    };
    top = bottom;
    return derived;
  });

  layers.forEach((layer) => layer.errors.forEach((message) => errors.push(`Layer ${layer.index + 1} (${layer.meta.label}): ${message}`)));
  return { layers, totalThickness: top, errors, isValid: errors.length === 0 };
}
