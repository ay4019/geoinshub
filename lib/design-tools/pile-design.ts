/**
 * Axial compression resistance of a single pile in layered soil to EC7, AASHTO LRFD or TBDY 2018.
 *
 * Follows the author's workbook "PILE BEARING CAPACITY (EC7-AASHTO-TBDY) v4", with these corrections:
 *   • EC7 DA1-C2 uses M1 for pile resistances (EN 1997-1 2.4.7.3.4.2: A2 + (M1 or M2) + R4, M1 for pile
 *     resistance); the workbook applied M2 by dividing φ′ (not tan φ′) by 1.25 and c_u by γ_c′ instead of γ_cu.
 *   • Net pile weight W′ = A Σ(γ_pile − γ_soil) h — the workbook omitted the area A.
 *   • AASHTO / GEC-10 toe limits are upper bounds: q_p = 57.5 N60 ≤ 2870 kPa and q_p = N_c c_u ≤ 3830 kPa
 *     (the workbook used MAX).
 *   • The critical depth caps σ′_v continuously (no need to split a layer at z_c by hand).
 *
 * Shaft resistance is integrated in ≤ 0.1 m steps from the pile head (depth D_f) to the toe.
 *   EC7 / TBDY:  cohesive  f_s = α c_u                 (EC7 α = 0.5; TBDY α from GEC-10: 0.55 − 0.1(c_u/p_a − 1.5))
 *                granular  f_s = K tan δ σ′_v           (K and δ/φ′ by pile type, see DEFAULT_K / DEFAULT_DELTA)
 *                toe       q_b = N_q σ′_v,toe (granular), N_c c_u with N_c = 9 (6 if embedment < 3D) (cohesive)
 *   AASHTO, drilled shafts / CFA (FHWA GEC-10):
 *                cohesive  α = 0.55 (c_u/p_a ≤ 1.5), 0.55 − 0.1(c_u/p_a − 1.5); top 1.5 m and bottom 1D excluded
 *                granular  β = (1 − sin φ′)(σ′_p/σ′_v)^sin φ′ tan φ′ ≤ K_p tan φ′,
 *                          σ′_p/p_a = 0.47 N60^m (m = 0.6 sand, 0.8 silty sand), 0.15 N60 (gravel)
 *                toe       q_p = 57.5 N60 ≤ 2870 kPa (granular); N_c c_u, N_c = 6(1 + 0.2 Z/D) ≤ 9, ≤ 3830 kPa
 *   AASHTO, driven piles (FHWA GEC-12): API α, β = K₀(K_s/K₀) tan δ, Meyerhof SPT toe, 9 c_u.
 * All values SI (m, kPa, kN, kN/m³, degrees).
 */
import { PA, deg2rad } from "@/lib/design-tools/common";
import {
  DEFAULT_TBDY_FACTORS,
  effectiveStressAt,
  type DerivedStrata,
  type DesignCode,
  type NqMethod,
  type PileDesignModel,
  type PileMaterial,
  type PileType,
  type StressLayer,
} from "@/lib/design-tools/pile-strata";

/* ───────────────────────────── code tables ───────────────────────────── */

export const CODE_LABEL: Record<DesignCode, string> = {
  ec7: "Eurocode 7 (EN 1997-1)",
  aashto: "AASHTO LRFD (FHWA GEC-10 / GEC-12)",
  tbdy: "TBDY 2018",
};

export const PILE_TYPE_LABEL: Record<PileType, string> = {
  driven: "Driven pile",
  bored: "Bored pile",
  cfa: "CFA pile",
};

export const MATERIAL_LABEL: Record<PileMaterial, string> = {
  concrete: "Concrete",
  steel: "Steel",
  timber: "Timber",
};

export const MATERIAL_UNIT_WEIGHT: Record<PileMaterial, number> = { concrete: 24, steel: 78.5, timber: 8 };

/** Lateral earth pressure coefficient K for f_s = K tan δ σ′_v (author's workbook). */
export const DEFAULT_K: Record<"ec7" | "tbdy", Record<PileType, number>> = {
  ec7: { driven: 1.5, bored: 0.8, cfa: 1.0 },
  tbdy: { driven: 1.5, bored: 0.7, cfa: 1.0 },
};

/** Interface friction ratio δ/φ′ (author's workbook). */
export const DEFAULT_DELTA: Record<"ec7" | "tbdy", Record<PileType, number>> = {
  ec7: { driven: 0.9, bored: 0.7, cfa: 0.8 },
  tbdy: { driven: 0.95, bored: 0.75, cfa: 0.85 },
};

/** δ/φ′ for AASHTO driven piles by pile material (GEC-12 / Kulhawy 1991). */
export const MATERIAL_DELTA: Record<PileMaterial, number> = { concrete: 0.9, steel: 0.8, timber: 0.85 };

/** n in z_c = D_f + n·D (author's workbook). */
export const DEFAULT_CRITICAL_FACTOR: Record<PileType, number> = { driven: 25, bored: 15, cfa: 20 };

export const EC7_ALPHA_DEFAULT = 0.5;

/** EN 1997-1 Annex A, Tables A.6–A.8: resistance factors for driven, bored and CFA piles. */
export const EC7_R_FACTORS: Record<PileType, { base: Record<"R1" | "R2" | "R4", number>; shaft: Record<"R1" | "R2" | "R4", number> }> = {
  driven: { base: { R1: 1.0, R2: 1.1, R4: 1.3 }, shaft: { R1: 1.0, R2: 1.1, R4: 1.3 } },
  bored: { base: { R1: 1.25, R2: 1.1, R4: 1.6 }, shaft: { R1: 1.0, R2: 1.1, R4: 1.3 } },
  cfa: { base: { R1: 1.1, R2: 1.1, R4: 1.45 }, shaft: { R1: 1.0, R2: 1.1, R4: 1.3 } },
};

export const EC7_COMBOS = [
  { id: "DA1-C1", approach: "DA1", label: "DA1 · Combination 1", sets: "A1 + M1 + R1", r: "R1" },
  { id: "DA1-C2", approach: "DA1", label: "DA1 · Combination 2", sets: "A2 + M1 + R4", r: "R4" },
  { id: "DA2", approach: "DA2", label: "DA2", sets: "A1 + M1 + R2", r: "R2" },
] as const;

/** AASHTO LRFD 9th ed. Tables 10.5.5.2.3-1 (driven, static analysis) and 10.5.5.2.4-1 (drilled shafts). */
export const AASHTO_PHI = {
  driven: { sideCohesive: 0.35, sideGranular: 0.25, tipCohesive: 0.4, tipGranular: 0.3 },
  drilled: { sideCohesive: 0.45, sideGranular: 0.55, tipCohesive: 0.4, tipGranular: 0.5 },
} as const;

/* ───────────────────────────── N_q ───────────────────────────── */

type Table = Array<[number, number]>;
const NQ_TABLES: Record<string, Table> = {
  "navfac-bored": [[26, 5], [28, 8], [30, 10], [31, 12], [32, 14], [33, 17], [34, 21], [35, 25], [36, 30], [37, 38], [38, 43], [39, 60], [40, 72]],
  "navfac-driven": [[26, 10], [28, 15], [30, 21], [31, 24], [32, 29], [33, 35], [34, 42], [35, 50], [36, 62], [37, 77], [38, 86], [39, 120], [40, 145]],
  berezantsev: [[20, 5], [25, 9], [28, 14], [30, 18], [32, 30], [34, 50], [35, 65], [36, 80], [38, 130], [40, 200]],
  meyerhof: [[20, 10], [22, 13], [24, 16], [26, 21], [28, 26], [30, 33], [32, 41], [34, 56], [35, 67], [36, 77], [38, 108], [40, 144]],
  vesic: [[20, 12], [25, 24], [30, 40], [32, 55], [34, 80], [35, 100], [36, 120], [38, 180], [40, 280]],
  "cgs-driven": [[20, 8], [25, 12], [28, 20], [30, 25], [32, 35], [34, 45], [36, 60], [38, 80], [40, 120], [42, 160], [45, 230]],
  "cgs-bored": [[20, 4], [25, 5], [28, 8], [30, 12], [32, 17], [34, 22], [36, 30], [38, 40], [40, 60], [42, 80], [45, 115]],
};

export const NQ_METHOD_LABEL: Record<NqMethod, string> = {
  berezantsev: "Berezantsev et al. (1961)",
  navfac: "NAVFAC DM-7.2 (1986)",
  meyerhof: "Meyerhof (1976)",
  vesic: "Vesić (1977)",
  cgs: "Canadian Foundation Engineering Manual",
  reissner: "Reissner / Prandtl, e^(π tan φ′) tan²(45° + φ′/2)",
};

function interpolate(table: Table, x: number): { value: number; clamped: boolean } {
  if (x <= table[0][0]) return { value: table[0][1], clamped: x < table[0][0] };
  const last = table[table.length - 1];
  if (x >= last[0]) return { value: last[1], clamped: x > last[0] };
  for (let i = 1; i < table.length; i += 1) {
    const [x1, y1] = table[i];
    const [x0, y0] = table[i - 1];
    if (x <= x1) return { value: y0 + ((y1 - y0) * (x - x0)) / (x1 - x0), clamped: false };
  }
  return { value: last[1], clamped: true };
}

export function bearingNq(method: NqMethod, phi: number, pileType: PileType): { value: number; clamped: boolean; table: string } {
  if (method === "reissner") {
    const r = deg2rad(phi);
    return { value: Math.exp(Math.PI * Math.tan(r)) * Math.tan(Math.PI / 4 + r / 2) ** 2, clamped: false, table: "formula" };
  }
  const driven = pileType === "driven";
  const key =
    method === "navfac" ? (driven ? "navfac-driven" : "navfac-bored") : method === "cgs" ? (driven ? "cgs-driven" : "cgs-bored") : method;
  return { ...interpolate(NQ_TABLES[key], phi), table: key };
}

/* ───────────────────────────── helpers ───────────────────────────── */

export function gec10Alpha(cu: number): number {
  const ratio = cu / PA;
  if (ratio <= 1.5) return 0.55;
  return Math.max(0.45, 0.55 - 0.1 * (ratio - 1.5));
}

export function apiAlpha(cu: number, sigmaV: number): number {
  const psi = cu / Math.max(sigmaV, 0.1);
  return Math.min(psi <= 1 ? 0.5 * psi ** -0.5 : 0.5 * psi ** -0.25, 1);
}

export interface ResolvedParameters {
  /** K for f_s = K tan δ σ′_v (EC7/TBDY) or K_s/K₀ (AASHTO driven); null when not used. */
  k: number | null;
  kDefault: number | null;
  kSymbol: "K" | "Kₛ/K₀" | null;
  deltaRatio: number | null;
  deltaDefault: number | null;
  alpha: number | null;
  alphaDefault: number | null;
  criticalFactor: number;
  criticalFactorDefault: number;
  /** True for AASHTO drilled shaft / CFA (GEC-10 methods). */
  gec10: boolean;
}

export function resolveParameters(model: PileDesignModel): ResolvedParameters {
  const criticalFactorDefault = DEFAULT_CRITICAL_FACTOR[model.pileType];
  const criticalFactor = model.criticalDepthFactor ?? criticalFactorDefault;
  if (model.code === "aashto") {
    if (model.pileType === "driven") {
      const deltaDefault = MATERIAL_DELTA[model.material];
      return {
        k: model.ksK0,
        kDefault: 1.5,
        kSymbol: "Kₛ/K₀",
        deltaRatio: model.deltaRatioOverride ?? deltaDefault,
        deltaDefault,
        alpha: null,
        alphaDefault: null,
        criticalFactor,
        criticalFactorDefault,
        gec10: false,
      };
    }
    return {
      k: null,
      kDefault: null,
      kSymbol: null,
      deltaRatio: null,
      deltaDefault: null,
      alpha: null,
      alphaDefault: null,
      criticalFactor,
      criticalFactorDefault,
      gec10: true,
    };
  }
  const code = model.code;
  const kDefault = DEFAULT_K[code][model.pileType];
  const deltaDefault = DEFAULT_DELTA[code][model.pileType];
  const alphaDefault = code === "ec7" ? EC7_ALPHA_DEFAULT : null;
  return {
    k: model.kOverride ?? kDefault,
    kDefault,
    kSymbol: "K",
    deltaRatio: model.deltaRatioOverride ?? deltaDefault,
    deltaDefault,
    alpha: code === "ec7" ? (model.alphaOverride ?? EC7_ALPHA_DEFAULT) : null,
    alphaDefault,
    criticalFactor,
    criticalFactorDefault,
    gec10: false,
  };
}

/* ───────────────────────────── results ───────────────────────────── */

export interface ShaftLayerResult {
  index: number;
  behaviour: "cohesive" | "cohesionless";
  top: number;
  bottom: number;
  length: number;
  meanSigmaV: number;
  meanCoefficient: number;
  unitSide: number;
  resistance: number;
  /** AASHTO resistance factor applied to this layer's side resistance. */
  phi?: number;
}

export interface ShaftProfilePoint {
  z: number;
  sigmaV: number;
  sigmaVUsed: number;
  coefficient: number;
  unitSide: number;
  layerIndex: number;
  excluded: boolean;
}

export interface BaseResult {
  layerIndex: number;
  behaviour: "cohesive" | "cohesionless";
  sigmaV: number;
  sigmaVUsed: number;
  embedment: number;
  factorSymbol: "N_q" | "N_c" | "N60" | "(N₁)₆₀";
  factorValue: number;
  unitResistance: number;
  resistance: number;
  limited: boolean;
  formula: string;
  note?: string;
}

export interface Ec7ComboResult {
  id: string;
  label: string;
  sets: string;
  gammaS: number;
  gammaB: number;
  gammaRd: number;
  design: number;
}

export type DesignResult =
  | { code: "ec7"; combos: Ec7ComboResult[]; governing: Ec7ComboResult; value: number; label: string }
  | {
      code: "aashto";
      phiTip: number;
      sideFactored: number;
      tipFactored: number;
      value: number;
      label: string;
    }
  | { code: "tbdy"; staticValue: number; seismicValue: number; factors: typeof DEFAULT_TBDY_FACTORS; value: number; label: string };

export interface PileAnalysis {
  params: ResolvedParameters;
  diameter: number;
  area: number;
  perimeter: number;
  head: number;
  toe: number;
  criticalDepth: number | null;
  criticalSigmaV: number | null;
  layers: ShaftLayerResult[];
  profile: ShaftProfilePoint[];
  shaft: number;
  base: BaseResult;
  ultimate: number;
  weight: number;
  design: DesignResult;
  notes: string[];
}

export interface PileAnalysisOutcome {
  analysis: PileAnalysis | null;
  errors: string[];
}

function layerIndexAt(strata: DerivedStrata, z: number): number {
  const layers = strata.layers;
  for (let i = 0; i < layers.length; i += 1) if (z < layers[i].bottom || i === layers.length - 1) return i;
  return layers.length - 1;
}

const ok = (v: number) => typeof v === "number" && Number.isFinite(v);

export function validateDesignInputs(model: PileDesignModel): string[] {
  const errors: string[] = [];
  if (!ok(model.diameter) || model.diameter < 0.1 || model.diameter > 4) errors.push("Pile diameter must be between 0.1 and 4 m.");
  if (!ok(model.length) || model.length < 1 || model.length > 100) errors.push("Embedded length must be between 1 and 100 m.");
  if (!ok(model.headDepth) || model.headDepth < 0 || model.headDepth > 30) errors.push("Pile head depth D_f must be between 0 and 30 m.");
  if (!ok(model.pileUnitWeight) || model.pileUnitWeight < 0 || model.pileUnitWeight > 100) errors.push("Pile unit weight must be between 0 and 100 kN/m³.");
  const p = resolveParameters(model);
  if (model.criticalDepthEnabled && (!ok(p.criticalFactor) || p.criticalFactor < 5 || p.criticalFactor > 40)) {
    errors.push("Critical depth factor n (z_c = D_f + n·D) must be between 5 and 40.");
  }
  if (p.k !== null && (!ok(p.k) || p.k < 0.1 || p.k > 5)) errors.push(`${p.kSymbol} must be between 0.1 and 5.`);
  if (p.deltaRatio !== null && (!ok(p.deltaRatio) || p.deltaRatio < 0.3 || p.deltaRatio > 1)) errors.push("δ/φ′ must be between 0.3 and 1.0.");
  if (p.alpha !== null && (!ok(p.alpha) || p.alpha < 0.1 || p.alpha > 1.2)) errors.push("α must be between 0.1 and 1.2.");
  if (model.code === "ec7" && (!ok(model.ec7ModelFactor) || model.ec7ModelFactor < 1 || model.ec7ModelFactor > 2)) {
    errors.push("Model factor γ_Rd must be between 1.0 and 2.0.");
  }
  if (model.code === "tbdy") {
    const f = model.tbdy;
    if ([f.fsShaftStatic, f.fsBaseStatic, f.fsShaftSeismic, f.fsBaseSeismic].some((v) => !ok(v) || v < 1)) {
      errors.push("TBDY safety factors must be at least 1.0.");
    }
  }
  return errors;
}

/** Full analysis for the model's pile, or for another embedded length (capacity-vs-length curve). */
export function analysePile(model: PileDesignModel, strata: DerivedStrata, lengthOverride?: number): PileAnalysisOutcome {
  const errors = [...strata.errors, ...validateDesignInputs(model)];
  if (errors.length || !strata.layers.length) return { analysis: null, errors };

  const params = resolveParameters(model);
  const D = model.diameter;
  const L = lengthOverride ?? model.length;
  const head = model.headDepth;
  const toe = head + L;
  const area = (Math.PI * D ** 2) / 4;
  const perimeter = Math.PI * D;
  const gwt = model.groundwaterDepth;
  const stressLayers: StressLayer[] = strata.layers.map((d) => ({ thickness: Math.max(d.bottom - d.top, 0.01), gamma: d.layer.gamma }));
  const sigma = (z: number) => effectiveStressAt(stressLayers, z, gwt);
  const criticalDepth = model.criticalDepthEnabled ? head + params.criticalFactor * D : null;
  const criticalSigmaV = criticalDepth !== null ? sigma(criticalDepth) : null;
  const sigmaUsed = (z: number) => (criticalDepth !== null && criticalSigmaV !== null && z > criticalDepth ? criticalSigmaV : sigma(z));
  const notes: string[] = [];
  const isDrilled = model.pileType !== "driven";

  // SPT N60 is needed only by the AASHTO methods that use it (GEC-10 shaft and base, GEC-12 base in granular soil).
  const missingN = new Set<number>();

  const acc = strata.layers.map(() => ({ length: 0, sigma: 0, coef: 0, rs: 0, top: Number.POSITIVE_INFINITY, bottom: 0 }));
  const profile: ShaftProfilePoint[] = [];
  let weight = 0;

  // Midpoint integration inside each layer (and on each side of z_c), ≤ 0.1 m per step.
  const cuts = new Set<number>([head, toe]);
  strata.layers.forEach((d, i) => {
    if (i < strata.layers.length - 1 && d.bottom > head && d.bottom < toe) cuts.add(d.bottom);
  });
  if (criticalDepth !== null && criticalDepth > head && criticalDepth < toe) cuts.add(criticalDepth);
  const edges = Array.from(cuts).sort((a, b) => a - b);
  const steps: Array<{ z: number; seg: number }> = [];
  for (let k = 0; k < edges.length - 1; k += 1) {
    const span = edges[k + 1] - edges[k];
    const n = Math.max(1, Math.ceil(span / 0.1));
    for (let j = 0; j < n; j += 1) steps.push({ z: edges[k] + ((j + 0.5) * span) / n, seg: span / n });
  }

  for (const { z, seg } of steps) {
    const li = layerIndexAt(strata, z);
    const d = strata.layers[li];
    const sv = sigma(z);
    const su = sigmaUsed(z);
    let coefficient = 0;
    let excluded = false;

    if (d.meta.behaviour === "cohesive") {
      if (model.code === "ec7") coefficient = params.alpha ?? EC7_ALPHA_DEFAULT;
      else if (model.code === "tbdy") coefficient = model.alphaOverride ?? gec10Alpha(d.cu);
      else if (!isDrilled) coefficient = apiAlpha(d.cu, su);
      else {
        excluded = z - head < 1.5 || z > toe - D;
        coefficient = excluded ? 0 : gec10Alpha(d.cu);
      }
    } else {
      const phi = deg2rad(d.phi);
      if (model.code !== "aashto") {
        coefficient = (params.k ?? 1) * Math.tan((params.deltaRatio ?? 1) * phi);
      } else if (!isDrilled) {
        coefficient = (1 - Math.sin(phi)) * (params.k ?? 1.5) * Math.tan((params.deltaRatio ?? 0.9) * phi);
      } else if (!ok(d.n60)) {
        missingN.add(li);
      } else {
        const sigmaP =
          d.layer.type === "gravel" ? 0.15 * d.n60 * PA : 0.47 * d.n60 ** (d.layer.type === "silty-sand" ? 0.8 : 0.6) * PA;
        const ocr = Math.max(sigmaP / Math.max(su, 0.1), 1);
        const kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;
        coefficient = Math.min((1 - Math.sin(phi)) * ocr ** Math.sin(phi), kp) * Math.tan(phi);
      }
    }
    const unitSide = d.meta.behaviour === "cohesive" ? coefficient * d.cu : coefficient * su;
    const a = acc[li];
    a.length += seg;
    a.sigma += su * seg;
    a.coef += coefficient * seg;
    a.rs += unitSide * perimeter * seg;
    a.top = Math.min(a.top, z - seg / 2);
    a.bottom = Math.max(a.bottom, Math.min(z + seg / 2, toe));
    weight += area * (model.pileUnitWeight - d.layer.gamma) * seg;
    profile.push({ z, sigmaV: sv, sigmaVUsed: su, coefficient, unitSide, layerIndex: li, excluded });
  }

  const layers: ShaftLayerResult[] = strata.layers.map((d, index) => {
    const a = acc[index];
    const phiFactor =
      model.code === "aashto"
        ? (isDrilled ? AASHTO_PHI.drilled : AASHTO_PHI.driven)[d.meta.behaviour === "cohesive" ? "sideCohesive" : "sideGranular"]
        : undefined;
    return {
      index,
      behaviour: d.meta.behaviour,
      top: a.length ? Math.max(a.top, head) : d.top,
      bottom: a.length ? a.bottom : d.bottom,
      length: a.length,
      meanSigmaV: a.length ? a.sigma / a.length : 0,
      meanCoefficient: a.length ? a.coef / a.length : 0,
      unitSide: a.length ? a.rs / (perimeter * a.length) : 0,
      resistance: a.rs,
      phi: phiFactor,
    };
  });
  const shaft = layers.reduce((s, l) => s + l.resistance, 0);

  // Base
  const ti = layerIndexAt(strata, Math.max(toe - 1e-6, 0));
  const t = strata.layers[ti];
  const embedment = toe - Math.max(t.top, head);
  const svToe = sigma(toe);
  const suToe = sigmaUsed(toe);
  let base: BaseResult;
  if (t.meta.behaviour === "cohesive") {
    if (model.code === "aashto" && isDrilled) {
      const nc = Math.min(6 * (1 + 0.2 * embedment / D), 9);
      const q = Math.min(nc * t.cu, 3830);
      base = {
        layerIndex: ti,
        behaviour: "cohesive",
        sigmaV: svToe,
        sigmaVUsed: suToe,
        embedment,
        factorSymbol: "N_c",
        factorValue: nc,
        unitResistance: q,
        resistance: q * area,
        limited: nc * t.cu > 3830,
        formula: "q_p = N_c c_u ≤ 3830 kPa, N_c = 6(1 + 0.2 Z/D) ≤ 9",
      };
    } else {
      const nc = model.code === "aashto" ? 9 : embedment >= 3 * D ? 9 : 6;
      const q = nc * t.cu;
      base = {
        layerIndex: ti,
        behaviour: "cohesive",
        sigmaV: svToe,
        sigmaVUsed: suToe,
        embedment,
        factorSymbol: "N_c",
        factorValue: nc,
        unitResistance: q,
        resistance: q * area,
        limited: false,
        formula: model.code === "aashto" ? "q_t = 9 c_u" : "q_b = N_c c_u, N_c = 9 (embedment ≥ 3D) or 6",
        note: model.code !== "aashto" && nc === 6 ? "Embedment in the bearing layer is less than 3D, so N_c = 6." : undefined,
      };
    }
  } else if (model.code !== "aashto") {
    const nq = bearingNq(model.nqMethod, t.phi, model.pileType);
    const q = nq.value * suToe;
    base = {
      layerIndex: ti,
      behaviour: "cohesionless",
      sigmaV: svToe,
      sigmaVUsed: suToe,
      embedment,
      factorSymbol: "N_q",
      factorValue: nq.value,
      unitResistance: q,
      resistance: q * area,
      limited: false,
      formula: "q_b = N_q σ′_v,b",
      note: nq.clamped ? `φ′ = ${t.phi.toFixed(1)}° is outside the ${NQ_METHOD_LABEL[model.nqMethod]} table; the end value was used.` : undefined,
    };
  } else if (!ok(t.n60)) {
    missingN.add(ti);
    base = {
      layerIndex: ti,
      behaviour: "cohesionless",
      sigmaV: svToe,
      sigmaVUsed: suToe,
      embedment,
      factorSymbol: "N60",
      factorValue: 0,
      unitResistance: 0,
      resistance: 0,
      limited: false,
      formula: "",
    };
  } else if (isDrilled) {
    const n = Math.min(t.n60, 50);
    const q = Math.min(57.5 * n, 2870);
    base = {
      layerIndex: ti,
      behaviour: "cohesionless",
      sigmaV: svToe,
      sigmaVUsed: suToe,
      embedment,
      factorSymbol: "N60",
      factorValue: t.n60,
      unitResistance: q,
      resistance: q * area,
      limited: 57.5 * t.n60 > 2870,
      formula: "q_p = 57.5 N60 ≤ 2870 kPa",
      note: t.n60 > 50 ? "N60 > 50 at the toe: GEC-10 treats the material as an intermediate geomaterial." : undefined,
    };
  } else {
    const cn = Math.min(Math.sqrt(PA / Math.max(svToe, 1)), 1.7);
    const n160 = t.n60 * cn;
    const raw = 40 * n160 * (embedment / D);
    const q = Math.min(raw, 400 * n160);
    base = {
      layerIndex: ti,
      behaviour: "cohesionless",
      sigmaV: svToe,
      sigmaVUsed: suToe,
      embedment,
      factorSymbol: "(N₁)₆₀",
      factorValue: n160,
      unitResistance: q,
      resistance: q * area,
      limited: raw > 400 * n160,
      formula: "q_t = 40 (N₁)₆₀ D_b/D ≤ 400 (N₁)₆₀ kPa",
    };
  }

  if (missingN.size) {
    const list = Array.from(missingN)
      .sort((a, b) => a - b)
      .map((i) => `layer ${i + 1} (${strata.layers[i].meta.label})`)
      .join(", ");
    return {
      analysis: null,
      errors: [`AASHTO ${isDrilled ? "GEC-10" : "GEC-12"} works from SPT N₆₀ in granular soil — enter N₆₀ for ${list}.`],
    };
  }

  const ultimate = shaft + base.resistance;
  const w = model.deductWeight ? weight : 0;
  let design: DesignResult;
  if (model.code === "ec7") {
    const r = EC7_R_FACTORS[model.pileType];
    const gRd = model.ec7ModelFactor;
    const combos: Ec7ComboResult[] = EC7_COMBOS.map((c) => {
      const gs = r.shaft[c.r];
      const gb = r.base[c.r];
      return { id: c.id, label: c.label, sets: c.sets, gammaS: gs, gammaB: gb, gammaRd: gRd, design: shaft / (gs * gRd) + base.resistance / (gb * gRd) - w };
    });
    const candidates = combos.filter((c) => (model.ec7Approach === "DA1" ? c.id.startsWith("DA1") : c.id === "DA2"));
    const governing = candidates.reduce((m, c) => (c.design < m.design ? c : m), candidates[0]);
    design = { code: "ec7", combos, governing, value: governing.design, label: `R_c,d (${model.ec7Approach === "DA1" ? `DA1, ${governing.id.slice(4)} governs` : "DA2"})` };
  } else if (model.code === "aashto") {
    const table = isDrilled ? AASHTO_PHI.drilled : AASHTO_PHI.driven;
    const phiTip = base.behaviour === "cohesive" ? table.tipCohesive : table.tipGranular;
    const sideFactored = layers.reduce((s, l) => s + (l.phi ?? 0) * l.resistance, 0);
    const tipFactored = phiTip * base.resistance;
    design = { code: "aashto", phiTip, sideFactored, tipFactored, value: sideFactored + tipFactored - w, label: "R_R = Σφ R_n" };
  } else {
    const f = model.tbdy;
    const staticValue = shaft / f.fsShaftStatic + base.resistance / f.fsBaseStatic - w;
    const seismicValue = shaft / f.fsShaftSeismic + base.resistance / f.fsBaseSeismic - w;
    design = { code: "tbdy", staticValue, seismicValue, factors: f, value: staticValue, label: "R_a, static" };
  }

  if (criticalDepth !== null && criticalDepth < toe) {
    notes.push(`σ′_v is held at ${criticalSigmaV?.toFixed(1)} kPa below the critical depth z_c = ${criticalDepth.toFixed(2)} m.`);
  }
  if (model.code === "aashto" && isDrilled) notes.push("GEC-10: side resistance in cohesive soil is excluded over the top 1.5 m and the bottom one diameter.");
  if (model.code === "aashto" && model.pileType === "cfa") notes.push("AASHTO has no separate CFA provisions; drilled-shaft methods and resistance factors are used (FHWA GEC-8).");
  if (base.note) notes.push(base.note);

  return {
    analysis: {
      params,
      diameter: D,
      area,
      perimeter,
      head,
      toe,
      criticalDepth,
      criticalSigmaV,
      layers,
      profile,
      shaft,
      base,
      ultimate,
      weight,
      design,
      notes,
    },
    errors: [],
  };
}

export interface CapacityCurvePoint {
  /** Toe depth below ground, m. */
  toe: number;
  side: number;
  base: number;
  ultimate: number;
  design: number;
}

export function capacityCurve(model: PileDesignModel, strata: DerivedStrata, maxToeDepth: number, steps = 60): CapacityCurvePoint[] {
  const points: CapacityCurvePoint[] = [];
  const minL = 1;
  const maxL = Math.max(maxToeDepth - model.headDepth, minL + 0.5);
  for (let i = 0; i <= steps; i += 1) {
    const L = minL + ((maxL - minL) * i) / steps;
    const { analysis } = analysePile(model, strata, L);
    if (!analysis) continue;
    points.push({ toe: analysis.toe, side: analysis.shaft, base: analysis.base.resistance, ultimate: analysis.ultimate, design: analysis.design.value });
  }
  return points;
}
