/**
 * Prefabricated vertical drains (PVD) — FHWA/RD-86/168 (Rixner, Kraemer & Smith 1986), FHWA GEC-13
 * (Schaefer et al. 2017), Hansbo (1981) smear solution, Carrillo (1942) combination.
 *
 *   d_w = (a + b)/2                                   (Rixner et al. 1986)
 *   d_e = 1.128 s (square), 1.050 s (triangular)
 *   F = ln(n/s) + (k_h/k_s) ln(s) − 0.75 + F_r,  n = d_e/d_w, s = d_s/d_w
 *   F_r = π z (2l − z) k_h / q_w                       (well resistance, optional)
 *   U_h = 1 − exp(−8 T_h / F),  T_h = c_h t / d_e²
 *   U = 1 − (1 − U_h)(1 − U_v)
 */
import {
  equivalentInfluenceDiameter,
  readChoice,
  readNumber,
  round,
  screeningWarnings,
  terzaghiAverageDegree,
  type DesignCalculator,
} from "@/lib/design-tools/common";

export interface PvdInput {
  spacing: number;
  pattern: "square" | "triangular";
  drainWidth: number; // mm
  drainThickness: number; // mm
  smearRatio: number; // d_s / d_w
  permeabilityRatio: number; // k_h / k_s
  ch: number; // m2/year
  cv: number; // m2/year
  drainagePath: number; // H_dr for vertical flow (m)
  time: number; // years
  targetU: number; // %
  wellResistance: number; // F_r (0 to ignore)
}

export function computePvd(input: PvdInput) {
  const dw = ((input.drainWidth + input.drainThickness) / 2) / 1000;
  const de = equivalentInfluenceDiameter(input.spacing, input.pattern);
  const n = de / dw;
  const s = input.smearRatio;
  const F = Math.log(n / s) + input.permeabilityRatio * Math.log(s) - 0.75 + input.wellResistance;
  const degree = (t: number) => {
    const th = (input.ch * t) / de ** 2;
    const uh = 1 - Math.exp((-8 * th) / F);
    const tv = (input.cv * t) / input.drainagePath ** 2;
    const uv = terzaghiAverageDegree(tv);
    return { th, uh, tv, uv, u: 1 - (1 - uh) * (1 - uv) };
  };
  const atTime = degree(input.time);
  const target = input.targetU / 100;
  let lo = 0;
  let hi = 1;
  while (degree(hi).u < target && hi < 1e4) hi *= 2;
  for (let k = 0; k < 80; k += 1) {
    const mid = (lo + hi) / 2;
    if (degree(mid).u < target) lo = mid;
    else hi = mid;
  }
  const timeToTarget = (lo + hi) / 2;

  // Spacing that reaches the target within the given time (radial only, conservative).
  let sLo = 0.5;
  let sHi = 5;
  const uhFor = (sp: number) => {
    const d = equivalentInfluenceDiameter(sp, input.pattern);
    const f = Math.log(d / dw / s) + input.permeabilityRatio * Math.log(s) - 0.75 + input.wellResistance;
    return 1 - Math.exp((-8 * input.ch * input.time) / (d ** 2 * f));
  };
  let requiredSpacing = Number.NaN;
  if (uhFor(sLo) >= target) {
    for (let k = 0; k < 60; k += 1) {
      const mid = (sLo + sHi) / 2;
      if (uhFor(mid) >= target) sLo = mid;
      else sHi = mid;
    }
    requiredSpacing = sLo;
  }
  return { dw, de, n, F, atTime, timeToTarget, requiredSpacing };
}

export const verticalDrainsCalculator: DesignCalculator = (values) => {
  const input: PvdInput = {
    spacing: readNumber(values, "spacing", "PVD spacing", { min: 0.5, max: 5 }),
    pattern: readChoice(values, "pattern", ["square", "triangular"] as const, "triangular"),
    drainWidth: readNumber(values, "drainWidth", "Drain width a", { min: 50, max: 200, fallback: 100 }),
    drainThickness: readNumber(values, "drainThickness", "Drain thickness b", { min: 2, max: 10, fallback: 4 }),
    smearRatio: readNumber(values, "smearRatio", "Smear ratio d_s/d_w", { min: 1, max: 6, fallback: 2 }),
    permeabilityRatio: readNumber(values, "permeabilityRatio", "k_h/k_s", { min: 1, max: 10, fallback: 2 }),
    ch: readNumber(values, "ch", "c_h", { min: 0.01 }),
    cv: readNumber(values, "cv", "c_v", { min: 0 }),
    drainagePath: readNumber(values, "drainagePath", "Vertical drainage path H_dr", { min: 0.5 }),
    time: readNumber(values, "time", "Time t", { min: 0.001 }),
    targetU: readNumber(values, "targetU", "Target U", { min: 10, max: 99, fallback: 90 }),
    wellResistance: readNumber(values, "wellResistance", "Well resistance F_r", { min: 0, fallback: 0 }),
  };
  const r = computePvd(input);
  return {
    title: "Prefabricated Vertical Drains — Radial + Vertical Consolidation",
    summary: `U = ${round(r.atTime.u * 100, 1)}% after ${input.time} yr; ${input.targetU}% reached after ${round(
      r.timeToTarget * 12,
      1,
    )} months.`,
    items: [
      { label: "Equivalent drain diameter, d_w", value: round(r.dw * 1000, 1), unit: "mm" },
      { label: "Influence diameter, d_e", value: round(r.de, 3), unit: "m" },
      { label: "n = d_e / d_w", value: round(r.n, 1) },
      { label: "Hansbo F (smear + well resistance)", value: round(r.F, 3) },
      { label: "T_h at t", value: round(r.atTime.th, 4) },
      { label: "U_h at t", value: round(r.atTime.uh * 100, 1), unit: "%" },
      { label: "T_v at t", value: round(r.atTime.tv, 4) },
      { label: "U_v at t", value: round(r.atTime.uv * 100, 1), unit: "%" },
      { label: "Combined U at t (Carrillo)", value: round(r.atTime.u * 100, 1), unit: "%" },
      { label: `Time to U = ${input.targetU}%`, value: round(r.timeToTarget * 12, 2), unit: "months" },
      {
        label: `Spacing for U_h = ${input.targetU}% at t (radial only)`,
        value: Number.isFinite(r.requiredSpacing) ? round(r.requiredSpacing, 2) : "< 0.5",
        unit: "m",
      },
    ],
    notes: [
      "c_h is often taken as 1–2 c_v for field design, but should be back-calculated from trial embankments or CPTu dissipation where possible.",
      "Drain installation disturbance is represented through d_s/d_w and k_h/k_s (Hansbo 1981).",
    ],
    warnings: screeningWarnings(),
  };
};
