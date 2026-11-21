/**
 * Modulus of subgrade reaction (yatak katsayısı) k_s for shallow foundations / mats on elastic supports.
 *
 *   Vesić (1961), simplified as in Bowles (1996):  k_s = E_s / [B (1 − ν²)]
 *   Bowles (1996) from bearing capacity:           k_s = 40 · FS · q_a   (kN/m³, q_a in kPa; q_ult at ≈ 25 mm)
 *   From a settlement analysis:                    k_s = q / s
 *   Terzaghi (1955) plate-load scaling (0.3 m plate, k₁):
 *        sand:  k_s = k₁ [(B + 0.3) / (2B)]²
 *        clay:  k_s = k₁ (0.3 / B) (m + 0.5) / (1.5 m),  m = L/B
 * k_s is not a soil property: it depends on foundation size, load level and settlement. Values are SI (kN/m³);
 * the result also lists MN/m³ and t/m³ (1 t/m³ = 9.81 kN/m³) as commonly quoted in Turkish practice.
 */
import { readChoice, readNumber, round, screeningWarnings, type DesignCalculator } from "@/lib/design-tools/common";

export interface SubgradeInput {
  width: number; // B, m
  length: number; // L, m
  es: number; // kPa (0 = skip)
  nu: number;
  qa: number; // kPa (0 = skip)
  fs: number;
  q: number; // kPa contact pressure for settlement route
  s: number; // mm (0 = skip)
  plateK: number; // MN/m³ for a 0.3 m plate (0 = skip)
  plateSoil: "sand" | "clay";
}

export interface SubgradeEstimate {
  key: string;
  label: string;
  ks: number; // kN/m³
}

export function computeSubgradeModulus(input: SubgradeInput): SubgradeEstimate[] {
  const out: SubgradeEstimate[] = [];
  const B = input.width;
  const m = Math.max(input.length / B, 1);
  if (input.es > 0) {
    out.push({ key: "vesic", label: "Vesić (1961) / Bowles: E_s / [B(1 − ν²)]", ks: input.es / (B * (1 - input.nu ** 2)) });
  }
  if (input.qa > 0) {
    out.push({ key: "bowles", label: "Bowles (1996): 40 · FS · q_a", ks: 40 * input.fs * input.qa });
  }
  if (input.s > 0 && input.q > 0) {
    out.push({ key: "settlement", label: "Settlement analysis: q / s", ks: input.q / (input.s / 1000) });
  }
  if (input.plateK > 0) {
    const k1 = input.plateK * 1000;
    const ks = input.plateSoil === "sand" ? k1 * ((B + 0.3) / (2 * B)) ** 2 : k1 * (0.3 / B) * ((m + 0.5) / (1.5 * m));
    out.push({ key: "plate", label: `Terzaghi (1955) plate scaling, ${input.plateSoil}`, ks });
  }
  return out;
}

const fmt = (ks: number) => `${round(ks / 1000, 1)} MN/m³ · ${round(ks / 9.81, 0)} t/m³`;

export const subgradeReactionCalculator: DesignCalculator = (values) => {
  const input: SubgradeInput = {
    width: readNumber(values, "width", "Foundation width B", { min: 0.3, max: 100 }),
    length: readNumber(values, "length", "Foundation length L", { min: 0.3, max: 300 }),
    es: readNumber(values, "es", "Soil modulus E_s", { min: 0, fallback: 0 }),
    nu: readNumber(values, "nu", "Poisson's ratio ν", { min: 0, max: 0.49, fallback: 0.3 }),
    qa: readNumber(values, "qa", "Allowable bearing pressure q_a", { min: 0, fallback: 0 }),
    fs: readNumber(values, "fs", "Factor of safety", { min: 1, fallback: 3 }),
    q: readNumber(values, "q", "Contact pressure q", { min: 0, fallback: 0 }),
    s: readNumber(values, "s", "Settlement s", { min: 0, fallback: 0 }),
    plateK: readNumber(values, "plateK", "Plate-load k₁", { min: 0, fallback: 0 }),
    plateSoil: readChoice(values, "plateSoil", ["sand", "clay"] as const, "sand"),
  };
  if (input.length < input.width) throw new Error("Foundation length L must not be smaller than width B.");
  const list = computeSubgradeModulus(input);
  if (!list.length) throw new Error("Enter at least one of: E_s, q_a, a settlement (with q), or a plate-load k₁.");
  const values_ = list.map((e) => e.ks);
  const min = Math.min(...values_);
  const max = Math.max(...values_);
  const sorted = [...values_].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

  return {
    headline: [
      { label: "Modulus of subgrade reaction, k_s (median)", value: round(median / 1000, 1), unit: "MN/m³", note: `${Math.round(median / 9.81).toLocaleString("en-US")} t/m³ · range ${round(min / 1000, 1)}–${round(max / 1000, 1)} MN/m³` },
    ],
    title: "Modulus of Subgrade Reaction (k_s)",
    summary:
      list.length > 1
        ? `k_s ranges from ${round(min / 1000, 1)} to ${round(max / 1000, 1)} MN/m³ over ${list.length} methods (median ${fmt(median)}) for B = ${round(input.width, 2)} m.`
        : `k_s = ${fmt(list[0].ks)} for B = ${round(input.width, 2)} m.`,
    items: [
      ...list.map((e) => ({ label: e.label, value: round(e.ks, 0), unit: "kN/m³" })),
      ...list.map((e) => ({ label: `${e.label.split(":")[0]} — in MN/m³ / t/m³`, value: fmt(e.ks) })),
      ...(list.length > 1 ? [{ label: "Median of methods", value: fmt(median) }] : []),
    ],
    notes: [
      "k_s is not a soil property: it falls as the loaded width grows and depends on the load level. Use the value for the actual foundation size, and bracket it (e.g. ×0.5 and ×2) in the structural analysis.",
      "For mats, k_s from a settlement analysis (q / s) under the actual load is the most consistent with the soil profile.",
      ...(input.es > 0 ? ["E_s should be the modulus averaged over a depth of about 2B below the foundation."] : []),
    ],
    warnings: screeningWarnings(max / Math.max(min, 1) > 4 ? ["The methods differ by more than a factor of 4 — review the input moduli and the allowable pressure."] : []),
  };
};
