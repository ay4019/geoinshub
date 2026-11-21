/**
 * External stability of a cantilever or gravity retaining wall, per metre run (SI: m, kN, kPa, kN/m³, degrees).
 *
 * Geometry (origin at the toe, base underside; x towards the backfill, y up):
 *   base  [0, B] × [0, t_b];  stem from x = b_toe (front, battered) to x_s = b_toe + t_stem,bot (back face vertical),
 *   stem top thickness t_top; total height H from the base underside to the top of the stem.
 *   Gravity wall: trapezoid with vertical front face from x = b_toe and back face from x_s at the base to
 *   b_toe + t_top at the top (soil rests on the battered back face).
 * Earth pressure on the virtual vertical back through the heel end (x = B), height H′ = H + (B − x_s) tan β:
 *   Rankine (sloping backfill): K_a = cos β (cos β − √(cos²β − cos²φ′)) / (cos β + √(cos²β − cos²φ′)), thrust ∥ slope
 *   P_a = ½ γ H′² K_a at H′/3;  surcharge P_q = q K_a H′ at H′/2.
 * Seismic (optional) — Mononobe–Okabe on the vertical virtual back, δ = β, ψ = atan(k_h / (1 − k_v)):
 *   K_AE = cos²(φ′ − ψ) / { cos ψ cos(δ + ψ) [1 + √( sin(φ′ + δ) sin(φ′ − β − ψ) / (cos(δ + ψ) cos β) )]² }
 *   P_AE = ½ γ H′² (1 − k_v) K_AE; increment ΔP_AE = P_AE − P_a at 0.6 H′ (Seed & Whitman 1970);
 *   inertia k_h W of the wall and of the soil above the heel at their centroids; weights × (1 − k_v).
 * Checks: overturning about the toe, sliding (base friction tan δ_b + adhesion + optional passive), eccentricity
 * (|e| ≤ B/6 static, ≤ B/4 seismic), base pressure (trapezoidal / triangular), bearing capacity on B′ = B − 2e with
 * Meyerhof inclination factors, and the allowable pressure if one is given.
 */
import { deg2rad, readChoice, readNumber, round, screeningWarnings, type DesignCalculator } from "@/lib/design-tools/common";

export type WallType = "cantilever" | "gravity";

export interface RetainingWallInput {
  wallType: WallType;
  H: number;
  tTop: number;
  tStemBot: number;
  B: number;
  toe: number;
  tBase: number;
  /** Soil cover in front of the wall, measured from the base underside. */
  D: number;
  gammaConcrete: number;
  gamma: number;
  phi: number;
  slope: number; // β, deg
  surcharge: number;
  gammaF: number;
  phiF: number;
  cF: number;
  baseFrictionRatio: number; // δ_b / φ_f
  adhesionRatio: number; // c_a / c_f
  passive: boolean;
  passiveFactor: number;
  qAllow: number; // 0 = not given
  seismic: boolean;
  kh: number;
  kv: number;
}

export interface WallForce {
  label: string;
  /** Horizontal (+ towards the toe, i.e. overturning) and vertical (+ down) components, kN/m. */
  h: number;
  v: number;
  /** Point of application. */
  x: number;
  y: number;
  kind: "weight" | "earth" | "surcharge" | "seismic" | "inertia" | "passive";
}

export interface CheckResult {
  name: string;
  value: number;
  required: number;
  ok: boolean;
  /** "min" = value must be ≥ required; "max" = value must be ≤ required. */
  sense: "min" | "max";
}

export interface RetainingWallResult {
  input: RetainingWallInput;
  xs: number;
  heel: number;
  Hv: number; // H′ on the virtual back
  Ka: number;
  Kae: number | null;
  Kp: number;
  forces: WallForce[];
  sumV: number;
  sumH: number;
  mResist: number;
  mOverturn: number;
  e: number;
  qMax: number;
  qMin: number;
  qUlt: number;
  bEff: number;
  inclination: number;
  checks: CheckResult[];
  criteria: { overturning: number; sliding: number; bearing: number; eLimitRatio: number };
  notes: string[];
}

function rankineKa(phi: number, beta: number): number {
  const p = deg2rad(phi);
  const b = deg2rad(beta);
  const root = Math.sqrt(Math.max(Math.cos(b) ** 2 - Math.cos(p) ** 2, 0));
  return (Math.cos(b) * (Math.cos(b) - root)) / (Math.cos(b) + root);
}

export function mononobeOkabe(phi: number, beta: number, delta: number, kh: number, kv: number): number | null {
  const p = deg2rad(phi);
  const b = deg2rad(beta);
  const d = deg2rad(delta);
  const psi = Math.atan(kh / Math.max(1 - kv, 1e-6));
  const s = Math.sin(p + d) * Math.sin(p - b - psi);
  if (p - b - psi < 0 || s < 0) return null;
  const den = Math.cos(psi) * Math.cos(d + psi) * (1 + Math.sqrt(s / (Math.cos(d + psi) * Math.cos(b)))) ** 2;
  return Math.cos(p - psi) ** 2 / den;
}

function bearingFactors(phi: number) {
  const p = deg2rad(phi);
  const nq = phi > 0 ? Math.exp(Math.PI * Math.tan(p)) * Math.tan(Math.PI / 4 + p / 2) ** 2 : 1;
  const nc = phi > 0 ? (nq - 1) / Math.tan(p) : 5.14;
  const ng = phi > 0 ? (nq - 1) * Math.tan(1.4 * p) : 0;
  return { nq, nc, ng };
}

export function validateRetainingWall(i: RetainingWallInput): string[] {
  const errors: string[] = [];
  if (!(i.H > 0.5)) errors.push("Wall height H must be greater than 0.5 m.");
  if (!(i.tBase > 0) || i.tBase >= i.H) errors.push("Base thickness must be positive and smaller than H.");
  if (!(i.tTop > 0) || !(i.tStemBot >= i.tTop)) errors.push("Stem thickness at the base must be at least the top thickness.");
  if (!(i.B > 0)) errors.push("Base width B must be positive.");
  if (i.toe < 0 || i.toe + i.tStemBot > i.B + 1e-9) errors.push("Toe + stem thickness must not exceed the base width B.");
  if (i.D < 0 || i.D > i.H) errors.push("Front soil depth D must be between 0 and H.");
  if (i.slope < 0 || i.slope >= i.phi) errors.push("Backfill slope β must be less than φ′.");
  if (i.seismic && (i.kh < 0 || i.kh > 0.6 || i.kv < -0.3 || i.kv > 0.3)) errors.push("Seismic coefficients out of range.");
  return errors;
}

export function computeRetainingWall(i: RetainingWallInput): RetainingWallResult {
  const errors = validateRetainingWall(i);
  if (errors.length) throw new Error(errors[0]);
  const notes: string[] = [];
  const xs = i.toe + i.tStemBot; // back face of the stem at the base top
  const heel = Math.max(i.B - xs, 0);
  const hs = i.H - i.tBase;
  const tanB = Math.tan(deg2rad(i.slope));
  const Hv = i.H + heel * tanB;
  const forces: WallForce[] = [];
  const kvF = i.seismic ? 1 - i.kv : 1;

  // Weights.
  const addWeight = (label: string, area: number, gamma: number, x: number, y: number) => {
    const w = area * gamma;
    forces.push({ label, h: 0, v: w * kvF, x, y, kind: "weight" });
    if (i.seismic && i.kh > 0) forces.push({ label: `${label} inertia`, h: i.kh * w, v: 0, x, y, kind: "inertia" });
  };
  addWeight("Base slab", i.B * i.tBase, i.gammaConcrete, i.B / 2, i.tBase / 2);
  if (i.wallType === "cantilever") {
    // Stem: rectangle (top thickness) at the back + triangle (batter) at the front.
    const rectX = xs - i.tTop / 2;
    addWeight("Stem (rectangular part)", i.tTop * hs, i.gammaConcrete, rectX, i.tBase + hs / 2);
    const batter = i.tStemBot - i.tTop;
    if (batter > 0) addWeight("Stem (battered part)", 0.5 * batter * hs, i.gammaConcrete, i.toe + (2 / 3) * batter, i.tBase + hs / 3);
    if (heel > 0) addWeight("Soil above heel", heel * hs, i.gamma, xs + heel / 2, i.tBase + hs / 2);
  } else {
    // Gravity: front face vertical at x = toe; back face from x_s (base) to toe + t_top (top).
    const front = i.toe;
    addWeight("Wall (rectangular part)", i.tTop * hs, i.gammaConcrete, front + i.tTop / 2, i.tBase + hs / 2);
    const batter = i.tStemBot - i.tTop;
    if (batter > 0) {
      addWeight("Wall (battered part)", 0.5 * batter * hs, i.gammaConcrete, front + i.tTop + batter / 3, i.tBase + hs / 3);
      addWeight("Soil on battered back", 0.5 * batter * hs, i.gamma, front + i.tTop + (2 / 3) * batter, i.tBase + (2 / 3) * hs);
    }
    if (heel > 0) addWeight("Soil above heel", heel * hs, i.gamma, xs + heel / 2, i.tBase + hs / 2);
  }
  if (heel > 0 && tanB > 0) {
    const hTri = heel * tanB;
    addWeight("Sloping backfill above heel", 0.5 * heel * hTri, i.gamma, xs + (2 / 3) * heel, i.H + hTri / 3);
  }
  if (i.D > i.tBase && i.toe > 0) {
    // Front soil over the toe slab (resisting weight).
    const h = i.D - i.tBase;
    const w = i.toe * h * i.gammaF;
    forces.push({ label: "Soil above toe", h: 0, v: w * kvF, x: i.toe / 2, y: i.tBase + h / 2, kind: "weight" });
  }

  // Earth pressure on the virtual back (inclined at β).
  const Ka = rankineKa(i.phi, i.slope);
  const cosB = Math.cos(deg2rad(i.slope));
  const sinB = Math.sin(deg2rad(i.slope));
  const Pa = 0.5 * i.gamma * Hv ** 2 * Ka;
  forces.push({ label: "Active earth thrust P_a", h: Pa * cosB, v: Pa * sinB, x: i.B, y: Hv / 3, kind: "earth" });
  if (i.surcharge > 0) {
    const Pq = i.surcharge * Ka * Hv;
    forces.push({ label: "Surcharge thrust P_q", h: Pq * cosB, v: Pq * sinB, x: i.B, y: Hv / 2, kind: "surcharge" });
  }

  let Kae: number | null = null;
  if (i.seismic) {
    Kae = mononobeOkabe(i.phi, i.slope, i.slope, i.kh, i.kv);
    if (Kae === null) throw new Error("Mononobe–Okabe has no solution: φ′ − β − ψ < 0 (seismic coefficient too large for this backfill).");
    const dP = 0.5 * i.gamma * Hv ** 2 * ((1 - i.kv) * Kae - Ka);
    if (dP > 0) forces.push({ label: "Seismic increment ΔP_AE", h: dP * cosB, v: dP * sinB, x: i.B, y: 0.6 * Hv, kind: "seismic" });
    if (i.surcharge > 0) {
      const dPq = i.surcharge * Hv * ((1 - i.kv) * Kae - Ka);
      if (dPq > 0) forces.push({ label: "Seismic surcharge increment", h: dPq * cosB, v: dPq * sinB, x: i.B, y: Hv / 2, kind: "seismic" });
    }
  }

  // Passive resistance in front of the toe (level ground).
  const Kp = Math.tan(Math.PI / 4 + deg2rad(i.phiF) / 2) ** 2;
  let Pp = 0;
  if (i.passive && i.D > 0) {
    Pp = i.passiveFactor * (0.5 * i.gammaF * i.D ** 2 * Kp + 2 * i.cF * Math.sqrt(Kp) * i.D);
    forces.push({ label: "Passive resistance (reduced)", h: -Pp, v: 0, x: 0, y: i.D / 3, kind: "passive" });
  }

  // Equilibrium.
  const driving = forces.filter((f) => f.h > 0);
  const sumH = driving.reduce((s, f) => s + f.h, 0);
  const sumV = forces.reduce((s, f) => s + f.v, 0);
  const mOverturn = driving.reduce((s, f) => s + f.h * f.y, 0);
  const mResist = forces.reduce((s, f) => s + f.v * f.x, 0) + (Pp > 0 ? Pp * (i.D / 3) : 0);
  const xbar = (mResist - mOverturn) / Math.max(sumV, 1e-9);
  const e = i.B / 2 - xbar;

  let qMax: number;
  let qMin: number;
  if (Math.abs(e) <= i.B / 6) {
    qMax = (sumV / i.B) * (1 + (6 * Math.abs(e)) / i.B);
    qMin = (sumV / i.B) * (1 - (6 * Math.abs(e)) / i.B);
  } else {
    const a = Math.max(i.B / 2 - Math.abs(e), 1e-6);
    qMax = (2 * sumV) / (3 * a);
    qMin = 0;
    notes.push("Resultant outside the middle third: part of the base is in tension (q_min = 0, triangular pressure).");
  }

  // Bearing capacity (Meyerhof, effective width, inclination).
  const { nq, nc, ng } = bearingFactors(i.phiF);
  const bEff = Math.max(i.B - 2 * Math.abs(e), 0.01);
  const netH = Math.max(sumH - Pp, 0);
  const alpha = (Math.atan(netH / Math.max(sumV, 1e-9)) * 180) / Math.PI;
  const iq = (1 - alpha / 90) ** 2;
  const ig = i.phiF > 0 ? Math.max(1 - alpha / i.phiF, 0) ** 2 : 0;
  const qOver = i.gammaF * i.D;
  const qUlt = i.cF * nc * iq + qOver * nq * iq + 0.5 * i.gammaF * bEff * ng * ig;

  const criteria = i.seismic
    ? { overturning: 1.5, sliding: 1.1, bearing: 2.0, eLimitRatio: 1 / 4 }
    : { overturning: 2.0, sliding: 1.5, bearing: 3.0, eLimitRatio: 1 / 6 };
  const resistSliding = sumV * Math.tan(deg2rad(i.baseFrictionRatio * i.phiF)) + i.adhesionRatio * i.cF * i.B + Pp;
  const fsOT = mResist / Math.max(mOverturn, 1e-9);
  const fsSL = resistSliding / Math.max(sumH, 1e-9);
  const fsBC = qUlt / Math.max(qMax, 1e-9);
  const checks: CheckResult[] = [
    { name: "Overturning FS", value: fsOT, required: criteria.overturning, ok: fsOT >= criteria.overturning, sense: "min" },
    { name: "Sliding FS", value: fsSL, required: criteria.sliding, ok: fsSL >= criteria.sliding, sense: "min" },
    { name: "Eccentricity |e|", value: Math.abs(e), required: i.B * criteria.eLimitRatio, ok: Math.abs(e) <= i.B * criteria.eLimitRatio, sense: "max" },
    { name: "Bearing FS = q_ult / q_max", value: fsBC, required: criteria.bearing, ok: fsBC >= criteria.bearing, sense: "min" },
  ];
  if (i.qAllow > 0) checks.push({ name: "q_max ≤ allowable", value: qMax, required: i.qAllow, ok: qMax <= i.qAllow, sense: "max" });
  if (e < 0) notes.push("The resultant lies behind the base centre (towards the heel).");

  return { input: i, xs, heel, Hv, Ka, Kae, Kp, forces, sumV, sumH, mResist, mOverturn, e, qMax, qMin, qUlt, bEff, inclination: alpha, checks, criteria, notes };
}

export function readRetainingWall(values: Record<string, string>): RetainingWallInput {
  const seismic = values.seismic === "mononobe-okabe";
  return {
    wallType: readChoice(values, "wallType", ["cantilever", "gravity"] as const, "cantilever"),
    H: readNumber(values, "height", "Wall height H", { min: 0.5, max: 20 }),
    tTop: readNumber(values, "stemTop", "Stem top thickness", { min: 0.1, max: 5 }),
    tStemBot: readNumber(values, "stemBottom", "Stem thickness at base", { min: 0.1, max: 10 }),
    B: readNumber(values, "baseWidth", "Base width B", { min: 0.3, max: 30 }),
    toe: readNumber(values, "toeLength", "Toe length", { min: 0, max: 20 }),
    tBase: readNumber(values, "baseThickness", "Base thickness", { min: 0.1, max: 5 }),
    D: readNumber(values, "frontDepth", "Front soil depth D", { min: 0, fallback: 0 }),
    gammaConcrete: readNumber(values, "gammaConcrete", "Concrete unit weight", { min: 15, max: 30, fallback: 24 }),
    gamma: readNumber(values, "gamma", "Backfill γ", { min: 10, max: 25 }),
    phi: readNumber(values, "phi", "Backfill φ′", { min: 15, max: 50 }),
    slope: readNumber(values, "slope", "Backfill slope β", { min: 0, max: 45, fallback: 0 }),
    surcharge: readNumber(values, "surcharge", "Surcharge q", { min: 0, fallback: 0 }),
    gammaF: readNumber(values, "gammaF", "Foundation soil γ", { min: 10, max: 25 }),
    phiF: readNumber(values, "phiF", "Foundation soil φ′", { min: 0, max: 50 }),
    cF: readNumber(values, "cF", "Foundation soil c′", { min: 0, fallback: 0 }),
    baseFrictionRatio: readNumber(values, "baseFrictionRatio", "δ_b / φ′", { min: 0.3, max: 1, fallback: 2 / 3 }),
    adhesionRatio: readNumber(values, "adhesionRatio", "c_a / c′", { min: 0, max: 1, fallback: 0.5 }),
    passive: values.passive === "include",
    passiveFactor: readNumber(values, "passiveFactor", "Passive reduction factor", { min: 0, max: 1, fallback: 0.5 }),
    qAllow: readNumber(values, "qAllow", "Allowable bearing pressure", { min: 0, fallback: 0 }),
    seismic,
    kh: seismic ? readNumber(values, "kh", "k_h", { min: 0, max: 0.6, fallback: 0 }) : 0,
    kv: seismic ? readNumber(values, "kv", "k_v", { min: -0.3, max: 0.3, fallback: 0 }) : 0,
  };
}

export const retainingWallCalculator: DesignCalculator = (values) => {
  const r = computeRetainingWall(readRetainingWall(values));
  const allOk = r.checks.every((c) => c.ok);
  const fmtCheck = (c: CheckResult) => `${round(c.value, c.sense === "max" ? 2 : 2)} (${c.sense === "min" ? "≥" : "≤"} ${round(c.required, 2)}) ${c.ok ? "OK" : "NOT OK"}`;
  const i = r.input;
  const r2 = (v: number) => round(v, 2);
  const r3 = (v: number) => round(v, 3);
  const [ot, sl, ecc, bc] = r.checks;
  const weights = r.forces.filter((f) => f.kind === "weight");
  const driving = r.forces.filter((f) => f.h > 0);
  const resistSl = r.sumV * Math.tan((i.baseFrictionRatio * i.phiF * Math.PI) / 180) + i.adhesionRatio * i.cF * i.B;
  const passiveF = r.forces.find((f) => f.kind === "passive");
  const status = (c: CheckResult) => (c.ok ? ("pass" as const) : ("fail" as const));

  return {
    headline: [
      { label: "Overturning", value: r2(ot.value), status: status(ot), note: `FS ≥ ${ot.required}` },
      { label: "Sliding", value: r2(sl.value), status: status(sl), note: `FS ≥ ${sl.required}` },
      { label: "Eccentricity |e|", value: r3(ecc.value), unit: "m", status: status(ecc), note: `≤ B/${i.seismic ? 4 : 6} = ${r3(ecc.required)} m` },
      { label: "Bearing", value: r2(bc.value), status: status(bc), note: `FS = q_ult / q_max ≥ ${bc.required}` },
    ],
    steps: [
      {
        title: "Earth pressure on the virtual back",
        lines: [
          { label: "Height on the virtual back, H′", value: r2(r.Hv), unit: "m", formula: "H′ = H + (B − x_s) tanβ", substituted: `${i.H} + ${r2(r.heel)}·tan${i.slope}° = ${r2(r.Hv)} m` },
          {
            label: "Active coefficient, K_a",
            value: r3(r.Ka),
            formula: "K_a = cosβ (cosβ − √(cos²β − cos²φ′)) / (cosβ + √(cos²β − cos²φ′))",
            substituted: `β = ${i.slope}°, φ′ = ${i.phi}° → ${r3(r.Ka)}`,
          },
          ...driving
            .filter((f) => f.kind === "earth" || f.kind === "surcharge")
            .map((f) => ({
              label: `${f.label} (horizontal)`,
              value: r2(f.h),
              unit: "kN/m",
              formula: f.kind === "earth" ? "P_a = ½ γ H′² K_a, at H′/3" : "P_q = q K_a H′, at H′/2",
              substituted:
                f.kind === "earth"
                  ? `0.5·${i.gamma}·${r2(r.Hv)}²·${r3(r.Ka)} = ${r2(f.h / Math.cos((i.slope * Math.PI) / 180))} kN/m`
                  : `${i.surcharge}·${r3(r.Ka)}·${r2(r.Hv)} = ${r2(f.h / Math.cos((i.slope * Math.PI) / 180))} kN/m`,
            })),
          ...(r.Kae !== null
            ? [
                {
                  label: "Seismic coefficient, K_AE",
                  value: r3(r.Kae),
                  formula: "Mononobe–Okabe, ψ = atan(k_h / (1 − k_v)), δ = β",
                  substituted: `k_h = ${i.kh}, k_v = ${i.kv} → ψ = ${r2((Math.atan(i.kh / (1 - i.kv)) * 180) / Math.PI)}°, K_AE = ${r3(r.Kae)}`,
                },
                ...driving
                  .filter((f) => f.kind === "seismic" || f.kind === "inertia")
                  .map((f) => ({
                    label: f.label,
                    value: r2(f.h),
                    unit: "kN/m",
                    formula: f.kind === "seismic" ? "ΔP_AE = ½ γ H′² [(1 − k_v)K_AE − K_a], at 0.6H′" : "k_h · W",
                  })),
              ]
            : []),
        ],
      },
      {
        title: "Weights and resisting moments about the toe",
        lines: weights.map((f) => ({
          label: f.label,
          value: r2(f.v),
          unit: "kN/m",
          formula: "M = W · x",
          substituted: `${r2(f.v)} × ${r2(f.x)} = ${r2(f.v * f.x)} kN·m/m`,
        })),
      },
      {
        title: "Overturning",
        lines: [
          { label: "Resisting moment ΣM_R", value: r2(r.mResist), unit: "kN·m/m", formula: "ΣM_R = Σ V·x (weights, vertical thrust components, passive)" },
          { label: "Overturning moment ΣM_O", value: r2(r.mOverturn), unit: "kN·m/m", formula: "ΣM_O = Σ H·y (thrusts, seismic, inertia)" },
          { label: "FS overturning", value: r2(ot.value), formula: "FS_OT = ΣM_R / ΣM_O", substituted: `${r2(r.mResist)} / ${r2(r.mOverturn)} = ${r2(ot.value)} (required ${ot.required})` },
        ],
      },
      {
        title: "Sliding",
        lines: [
          { label: "ΣV", value: r2(r.sumV), unit: "kN/m" },
          { label: "ΣH (driving)", value: r2(r.sumH), unit: "kN/m" },
          {
            label: "Base resistance",
            value: r2(resistSl),
            unit: "kN/m",
            formula: "ΣV tan(δ_b) + c_a B,  δ_b = (δ_b/φ′)·φ′",
            substituted: `${r2(r.sumV)}·tan(${r2(i.baseFrictionRatio * i.phiF)}°) + ${r2(i.adhesionRatio * i.cF)}·${i.B} = ${r2(resistSl)} kN/m`,
          },
          ...(passiveF ? [{ label: "Passive resistance (reduced)", value: r2(-passiveF.h), unit: "kN/m", formula: "f · (½ γ D² K_p + 2c′√K_p D)" }] : []),
          { label: "FS sliding", value: r2(sl.value), formula: "FS_SL = (ΣV tanδ_b + c_a B + P_p) / ΣH", substituted: `${r2(resistSl + (passiveF ? -passiveF.h : 0))} / ${r2(r.sumH)} = ${r2(sl.value)} (required ${sl.required})` },
        ],
      },
      {
        title: "Eccentricity and base pressure",
        lines: [
          { label: "Eccentricity e", value: r3(r.e), unit: "m", formula: "e = B/2 − (ΣM_R − ΣM_O)/ΣV", substituted: `${i.B}/2 − (${r2(r.mResist)} − ${r2(r.mOverturn)})/${r2(r.sumV)} = ${r3(r.e)} m (limit ${r3(ecc.required)} m)` },
          { label: "q_max", value: r2(r.qMax), unit: "kPa", formula: Math.abs(r.e) <= i.B / 6 ? "q_max = (ΣV/B)(1 + 6e/B)" : "q_max = 2ΣV / (3(B/2 − e))", substituted: Math.abs(r.e) <= i.B / 6 ? `(${r2(r.sumV)}/${i.B})(1 + 6·${r3(Math.abs(r.e))}/${i.B}) = ${r2(r.qMax)} kPa` : undefined },
          { label: "q_min", value: r2(r.qMin), unit: "kPa", formula: "q_min = (ΣV/B)(1 − 6e/B) ≥ 0" },
        ],
      },
      {
        title: "Bearing capacity",
        lines: [
          { label: "Effective width B′", value: r2(r.bEff), unit: "m", formula: "B′ = B − 2|e|", substituted: `${i.B} − 2·${r3(Math.abs(r.e))} = ${r2(r.bEff)} m` },
          { label: "Load inclination α", value: round(r.inclination, 1), unit: "deg", formula: "α = atan(ΣH / ΣV)" },
          { label: "q_ult", value: round(r.qUlt, 0), unit: "kPa", formula: "q_ult = c′N_c i_c + qN_q i_q + ½γB′N_γ i_γ,  i_c = i_q = (1 − α/90)²,  i_γ = (1 − α/φ′)²" },
          { label: "FS bearing", value: r2(bc.value), formula: "FS = q_ult / q_max", substituted: `${round(r.qUlt, 0)} / ${r2(r.qMax)} = ${r2(bc.value)} (required ${bc.required})` },
        ],
      },
    ],
    title: `Retaining Wall Stability — ${r.input.seismic ? "Seismic (Mononobe–Okabe)" : "Static"}`,
    summary: `${allOk ? "All checks satisfied" : `${r.checks.filter((c) => !c.ok).length} check(s) not satisfied`}: overturning FS ${round(r.checks[0].value, 2)}, sliding FS ${round(r.checks[1].value, 2)}, e = ${round(r.e, 3)} m, q_max = ${round(r.qMax, 0)} kPa.`,
    items: [
      ...r.checks.map((c) => ({ label: c.name, value: fmtCheck(c) })),
      { label: "Active coefficient K_a (Rankine)", value: round(r.Ka, 3) },
      ...(r.Kae !== null ? [{ label: "Seismic coefficient K_AE (Mononobe–Okabe)", value: round(r.Kae, 3) }] : []),
      { label: "Height on virtual back H′", value: round(r.Hv, 2), unit: "m" },
      { label: "Sum of vertical forces ΣV", value: round(r.sumV, 1), unit: "kN/m" },
      { label: "Sum of driving horizontal forces ΣH", value: round(r.sumH, 1), unit: "kN/m" },
      { label: "Resisting moment about toe M_R", value: round(r.mResist, 1), unit: "kN·m/m" },
      { label: "Overturning moment about toe M_O", value: round(r.mOverturn, 1), unit: "kN·m/m" },
      { label: "Eccentricity e (from base centre)", value: round(r.e, 3), unit: "m" },
      { label: "Base pressure q_max", value: round(r.qMax, 1), unit: "kPa" },
      { label: "Base pressure q_min", value: round(r.qMin, 1), unit: "kPa" },
      { label: "Effective base width B′ = B − 2e", value: round(r.bEff, 2), unit: "m" },
      { label: "Load inclination", value: round(r.inclination, 1), unit: "deg" },
      { label: "Ultimate bearing capacity q_ult (Meyerhof)", value: round(r.qUlt, 0), unit: "kPa" },
    ],
    notes: [
      "Rankine pressure on the vertical plane through the heel end; thrust parallel to the backfill slope.",
      r.input.seismic
        ? "Seismic: Mononobe–Okabe K_AE; dynamic increment at 0.6H′ (Seed & Whitman 1970); inertia of the wall and the soil above the heel included."
        : `Required: overturning ≥ ${r.criteria.overturning}, sliding ≥ ${r.criteria.sliding}, |e| ≤ B/6, bearing FS ≥ ${r.criteria.bearing}.`,
      "Drained backfill (no water pressure behind the wall); structural design of the stem and slabs is not included.",
      ...r.notes,
    ],
    warnings: screeningWarnings(allOk ? [] : r.checks.filter((c) => !c.ok).map((c) => `${c.name} not satisfied.`)),
  };
};
