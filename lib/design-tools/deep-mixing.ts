/**
 * Deep mixing method (DMM) columns for embankment / foundation support — unit-cell design checks after
 * FHWA-HRT-13-046 "Design Manual: Deep Mixing for Embankment and Foundation Support" (Bruce, Berg, Collin,
 * Filz, Terashi & Yang 2013) and Filz & Navin (2006).
 *
 *   a_s = A_col / A_trib                          (area replacement ratio)
 *   q_u,field = λ_f q_u,lab                       (field/lab strength ratio, typically 0.5 for wet mixing)
 *   q_u,design = q_u,field (1 − k_v V)            (reduction for strength variability, V = COV)
 *   s_col = 0.5 q_u,design                        (design column shear strength)
 *   s_comp = a_s s_col + (1 − a_s) s_soil         (composite strength, shear/panel action only)
 *   E_col = β_E q_u,field                         (β_E ≈ 150 typical, 50–250 range)
 *   E_comp = a_s E_col + (1 − a_s) E_soil         (composite constrained modulus)
 *   σ_col = q E_col / E_comp ;  σ_soil = q E_soil / E_comp
 *   S_treated = q H / E_comp
 */
import {
  readChoice,
  readNumber,
  round,
  screeningWarnings,
  tributaryArea,
  type DesignCalculator,
} from "@/lib/design-tools/common";

export interface DeepMixingInput {
  diameter: number;
  spacing: number;
  pattern: "square" | "triangular";
  quLab: number; // kPa
  fieldLabRatio: number;
  strengthCov: number; // COV of field strength (0–0.6)
  kv: number; // multiplier on COV (≈1.0 for ~85% reliability)
  modulusRatio: number; // E_col / q_u,field
  soilShearStrength: number; // c_u (kPa)
  soilModulus: number; // constrained modulus of soft soil (kPa)
  appliedStress: number; // q (kPa)
  treatedThickness: number; // H (m)
  axialFs: number; // required FS on column axial stress
  requiredCompositeStrength: number; // kPa (0 to skip)
}

export function computeDeepMixing(input: DeepMixingInput) {
  const areaCol = (Math.PI * input.diameter ** 2) / 4;
  const areaTrib = tributaryArea(input.spacing, input.pattern);
  if (areaCol >= areaTrib) {
    throw new Error("Columns overlap: increase spacing or use a panel/block layout analysis.");
  }
  const as = areaCol / areaTrib;
  const quField = input.quLab * input.fieldLabRatio;
  const quDesign = quField * Math.max(1 - input.kv * input.strengthCov, 0.1);
  const sCol = 0.5 * quDesign;
  const sComp = as * sCol + (1 - as) * input.soilShearStrength;
  const eCol = input.modulusRatio * quField;
  const eComp = as * eCol + (1 - as) * input.soilModulus;
  const n = eCol / input.soilModulus;
  const sigmaCol = (input.appliedStress * eCol) / eComp;
  const sigmaSoil = (input.appliedStress * input.soilModulus) / eComp;
  const settlementTreated = (input.appliedStress * input.treatedThickness) / eComp;
  const settlementUntreated = (input.appliedStress * input.treatedThickness) / input.soilModulus;
  const axialCapacity = quDesign / input.axialFs;
  const asRequired =
    input.requiredCompositeStrength > 0
      ? (input.requiredCompositeStrength - input.soilShearStrength) / Math.max(sCol - input.soilShearStrength, 1e-6)
      : Number.NaN;
  return {
    areaCol,
    areaTrib,
    as,
    quField,
    quDesign,
    sCol,
    sComp,
    eCol,
    eComp,
    n,
    sigmaCol,
    sigmaSoil,
    settlementTreated,
    settlementUntreated,
    axialCapacity,
    axialOk: sigmaCol <= axialCapacity,
    asRequired,
  };
}

export const deepMixingCalculator: DesignCalculator = (values) => {
  const input: DeepMixingInput = {
    diameter: readNumber(values, "diameter", "Column diameter", { min: 0.3, max: 3 }),
    spacing: readNumber(values, "spacing", "Column spacing", { min: 0.3 }),
    pattern: readChoice(values, "pattern", ["square", "triangular"] as const, "square"),
    quLab: readNumber(values, "quLab", "Laboratory q_u", { min: 50 }),
    fieldLabRatio: readNumber(values, "fieldLabRatio", "Field/lab strength ratio", { min: 0.2, max: 1, fallback: 0.5 }),
    strengthCov: readNumber(values, "strengthCov", "Strength COV", { min: 0, max: 0.8, fallback: 0.35 }),
    kv: readNumber(values, "kv", "Variability multiplier k_v", { min: 0, max: 2, fallback: 1 }),
    modulusRatio: readNumber(values, "modulusRatio", "E_col / q_u,field", { min: 30, max: 1000, fallback: 150 }),
    soilShearStrength: readNumber(values, "soilCu", "Soft soil c_u", { min: 1 }),
    soilModulus: readNumber(values, "soilModulus", "Soft soil constrained modulus", { min: 100 }),
    appliedStress: readNumber(values, "appliedStress", "Applied stress q", { min: 1 }),
    treatedThickness: readNumber(values, "treatedThickness", "Treated thickness H", { min: 0.5 }),
    axialFs: readNumber(values, "axialFs", "Column axial FS", { min: 1, fallback: 1.5 }),
    requiredCompositeStrength: readNumber(values, "requiredCompositeStrength", "Required composite strength", {
      min: 0,
      fallback: 0,
    }),
  };
  const r = computeDeepMixing(input);
  const warnings: string[] = [];
  if (!r.axialOk) warnings.push("Column axial stress exceeds q_u,design / FS — increase a_s or strength.");
  if (r.as < 0.15) warnings.push("a_s below about 0.15 is unusually low for embankment support with isolated columns.");
  warnings.push(
    "Isolated columns under embankment edges can fail by bending/rotation rather than shear; FHWA-HRT-13-046 recommends panels/walls there and a numerical check of composite strength assumptions.",
  );

  return {
    title: "Deep Mixing Columns — Unit-Cell Design (FHWA-HRT-13-046)",
    summary: `a_s = ${round(r.as, 3)}, composite strength ${round(r.sComp, 1)} kPa, treated-zone settlement ${round(
      r.settlementTreated * 1000,
      0,
    )} mm (untreated ${round(r.settlementUntreated * 1000, 0)} mm).`,
    items: [
      { label: "Area replacement ratio, a_s", value: round(r.as, 4) },
      { label: "Field strength, q_u,field", value: round(r.quField, 1), unit: "kPa" },
      { label: "Design strength, q_u,design", value: round(r.quDesign, 1), unit: "kPa" },
      { label: "Column design shear strength, s_col", value: round(r.sCol, 1), unit: "kPa" },
      { label: "Composite shear strength, s_comp", value: round(r.sComp, 1), unit: "kPa" },
      { label: "Column modulus, E_col", value: round(r.eCol / 1000, 1), unit: "MPa" },
      { label: "Composite modulus, E_comp", value: round(r.eComp / 1000, 2), unit: "MPa" },
      { label: "Modular ratio, n = E_col/E_soil", value: round(r.n, 1) },
      { label: "Column stress, σ_col", value: round(r.sigmaCol, 1), unit: "kPa" },
      { label: "Soil stress, σ_soil", value: round(r.sigmaSoil, 1), unit: "kPa" },
      { label: "Allowable column stress, q_u,design / FS", value: round(r.axialCapacity, 1), unit: "kPa" },
      { label: "Settlement of treated zone", value: round(r.settlementTreated * 1000, 1), unit: "mm" },
      { label: "Settlement without treatment (same zone)", value: round(r.settlementUntreated * 1000, 1), unit: "mm" },
      ...(Number.isFinite(r.asRequired)
        ? [{ label: "a_s required for target composite strength", value: round(r.asRequired, 3) }]
        : []),
    ],
    notes: [
      "Equal-strain unit cell: columns and soil settle equally, stresses share in proportion to modulus.",
      "Settlement of soil below the treated zone must be added separately.",
    ],
    warnings: screeningWarnings(warnings),
  };
};
