/**
 * Stone columns (vibro-replacement) — FHWA/RD-83/026 "Design and Construction of Stone Columns"
 * (Barksdale & Bachus 1983), FHWA GEC-13 (Schaefer et al. 2017, FHWA-NHI-16-027) and Priebe (1995).
 *
 *   a_s = A_col / A_trib
 *   Equilibrium method (Barksdale & Bachus): μ_s = 1 / [1 + (n − 1) a_s], μ_c = n / [1 + (n − 1) a_s]
 *     S_improved / S_untreated = μ_s
 *   Priebe (1995) basic improvement factor (ν = 1/3):
 *     n_0 = 1 + a_s [ (5 − a_s) / (4 K_ac (1 − a_s)) − 1 ],  K_ac = tan²(45° − φ_c/2)
 *   Single-column bulging capacity (Hughes & Withers 1974): q_ult ≈ K_pc (σ′_r0 + 4 c_u)
 */
import {
  deg2rad,
  readChoice,
  readNumber,
  round,
  screeningWarnings,
  tributaryArea,
  type DesignCalculator,
} from "@/lib/design-tools/common";

export interface StoneColumnInput {
  diameter: number;
  spacing: number;
  pattern: "square" | "triangular";
  columnPhi: number; // deg
  stressConcentration: number; // n (Barksdale & Bachus 2–5)
  soilCu: number;
  soilMv: number; // m2/MN
  layerThickness: number;
  appliedStress: number;
  sigmaR0: number; // initial effective lateral stress at critical depth (kPa)
  bearingFs: number;
}

export function computeStoneColumns(input: StoneColumnInput) {
  const areaCol = (Math.PI * input.diameter ** 2) / 4;
  const areaTrib = tributaryArea(input.spacing, input.pattern);
  if (areaCol >= areaTrib) throw new Error("Columns overlap: increase spacing.");
  const as = areaCol / areaTrib;
  const n = input.stressConcentration;
  const muS = 1 / (1 + (n - 1) * as);
  const muC = n / (1 + (n - 1) * as);
  const phiC = deg2rad(input.columnPhi);
  const kac = Math.tan(Math.PI / 4 - phiC / 2) ** 2;
  const kpc = Math.tan(Math.PI / 4 + phiC / 2) ** 2;
  const n0 = 1 + as * ((5 - as) / (4 * kac * (1 - as)) - 1);
  const settlementUntreated = (input.soilMv / 1000) * input.appliedStress * input.layerThickness;
  const settlementEquilibrium = settlementUntreated * muS;
  const settlementPriebe = settlementUntreated / n0;
  const qUltColumn = kpc * (input.sigmaR0 + 4 * input.soilCu);
  const columnStress = muC * input.appliedStress;
  return {
    as,
    muS,
    muC,
    kac,
    kpc,
    n0,
    settlementUntreated,
    settlementEquilibrium,
    settlementPriebe,
    qUltColumn,
    columnStress,
    columnFs: qUltColumn / Math.max(columnStress, 1e-6),
  };
}

export const stoneColumnsCalculator: DesignCalculator = (values) => {
  const input: StoneColumnInput = {
    diameter: readNumber(values, "diameter", "Column diameter", { min: 0.4, max: 1.5 }),
    spacing: readNumber(values, "spacing", "Column spacing", { min: 0.8 }),
    pattern: readChoice(values, "pattern", ["square", "triangular"] as const, "triangular"),
    columnPhi: readNumber(values, "columnPhi", "Column friction angle", { min: 30, max: 50, fallback: 40 }),
    stressConcentration: readNumber(values, "stressConcentration", "Stress concentration ratio n", {
      min: 1,
      max: 10,
      fallback: 3,
    }),
    soilCu: readNumber(values, "soilCu", "Soft soil c_u", { min: 1 }),
    soilMv: readNumber(values, "soilMv", "Soft soil m_v", { min: 0.001 }),
    layerThickness: readNumber(values, "layerThickness", "Treated thickness", { min: 0.5 }),
    appliedStress: readNumber(values, "appliedStress", "Applied stress q", { min: 1 }),
    sigmaR0: readNumber(values, "sigmaR0", "Initial lateral effective stress σ′_r0", { min: 0, fallback: 0 }),
    bearingFs: readNumber(values, "bearingFs", "Required column FS", { min: 1, fallback: 2 }),
  };
  const r = computeStoneColumns(input);
  const warnings: string[] = [];
  if (input.soilCu < 15) {
    warnings.push("c_u < 15 kPa: lateral support is usually insufficient for stone columns (FHWA GEC-13); consider rigid inclusions or DMM.");
  }
  if (r.columnFs < input.bearingFs) warnings.push(`Column bulging FS ${round(r.columnFs, 2)} below required ${input.bearingFs}.`);

  return {
    title: "Stone Columns — Settlement Improvement (FHWA / Priebe)",
    summary: `a_s = ${round(r.as, 3)}; settlement reduced from ${round(r.settlementUntreated * 1000, 0)} mm to ${round(
      r.settlementEquilibrium * 1000,
      0,
    )} mm (equilibrium) / ${round(r.settlementPriebe * 1000, 0)} mm (Priebe n_0).`,
    items: [
      { label: "Area replacement ratio, a_s", value: round(r.as, 4) },
      { label: "Stress reduction in soil, μ_s", value: round(r.muS, 3) },
      { label: "Stress concentration in column, μ_c", value: round(r.muC, 3) },
      { label: "Priebe basic improvement factor, n_0", value: round(r.n0, 3) },
      { label: "Untreated consolidation settlement", value: round(r.settlementUntreated * 1000, 1), unit: "mm" },
      { label: "Improved settlement — equilibrium method", value: round(r.settlementEquilibrium * 1000, 1), unit: "mm" },
      { label: "Improved settlement — Priebe n_0", value: round(r.settlementPriebe * 1000, 1), unit: "mm" },
      { label: "Column stress, σ_c = μ_c q", value: round(r.columnStress, 1), unit: "kPa" },
      { label: "Bulging capacity, q_ult = K_pc(σ′_r0 + 4c_u)", value: round(r.qUltColumn, 1), unit: "kPa" },
      { label: "Column FS against bulging", value: round(r.columnFs, 2) },
    ],
    notes: [
      "Untreated settlement uses S = m_v q H over the treated thickness only.",
      "Priebe n_0 assumes incompressible column material and ν = 1/3; depth and compressibility corrections (n_1, n_2) are not applied.",
      "Radial consolidation through the columns can be estimated with the PVD tool using the column as the drain.",
    ],
    warnings: screeningWarnings(warnings),
  };
};
