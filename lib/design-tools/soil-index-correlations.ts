/**
 * Index-property correlations for site characterisation.
 *
 * Relative density from SPT:
 *   Skempton (1986):            D_r = √[(N1)60 / C_d], C_d ≈ 60 (NC fine–medium sands)
 *   Kulhawy & Mayne (1990):     D_r = √[(N1)60 / (C_p C_A C_OCR)], C_p = 60 + 25 log D50(mm),
 *                               C_A = 1.2 + 0.05 log(t/100), C_OCR = OCR^0.18
 *   Idriss & Boulanger (2008):  D_r = √[(N1)60 / 46]
 *
 * Compressibility:
 *   Skempton (1944) remoulded:          C_c = 0.007 (LL − 7)
 *   Terzaghi & Peck (1967) undisturbed: C_c = 0.009 (LL − 10)
 *   Nishida (1956):                     C_c = 1.15 (e_0 − 0.35)
 *   Azzouz et al. (1976):               C_c = 0.40 (e_0 − 0.25)
 *   Koppula (1981):                     C_c = 0.01 w_n
 *   C_r ≈ C_c/10 – C_c/5;  C_α ≈ (0.04 ± 0.01) C_c  (Mesri & Godlewski 1977)
 *
 * Undrained strength ratio:
 *   SHANSEP (Ladd 1991):        s_u/σ′_v = S · OCR^m  (S ≈ 0.22, m ≈ 0.8)
 *   Mesri (1975):               s_u(mob)/σ′_p ≈ 0.22
 *   Skempton (1957), NC:        s_u/σ′_v = 0.11 + 0.0037 PI
 */
import { readChoice, readNumber, round, screeningWarnings, type DesignCalculator } from "@/lib/design-tools/common";

export function relativeDensityFromSpt(input: { n160: number; d50: number; ageYears: number; ocr: number }) {
  const skempton = Math.sqrt(input.n160 / 60);
  const cp = 60 + 25 * Math.log10(Math.max(input.d50, 0.05));
  const ca = 1.2 + 0.05 * Math.log10(Math.max(input.ageYears, 1) / 100);
  const cocr = Math.max(input.ocr, 1) ** 0.18;
  const kulhawyMayne = Math.sqrt(input.n160 / (cp * ca * cocr));
  const idrissBoulanger = Math.sqrt(input.n160 / 46);
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
  return {
    skempton: clamp(skempton),
    kulhawyMayne: clamp(kulhawyMayne),
    idrissBoulanger: clamp(idrissBoulanger),
    cp,
    ca,
    cocr,
  };
}

export function densityDescriptor(dr: number): string {
  if (dr < 0.15) return "Very loose";
  if (dr < 0.35) return "Loose";
  if (dr < 0.65) return "Medium dense";
  if (dr < 0.85) return "Dense";
  return "Very dense";
}

export const relativeDensityCalculator: DesignCalculator = (values) => {
  const n160 = readNumber(values, "n160", "(N1)60", { min: 0.5, max: 100 });
  const r = relativeDensityFromSpt({
    n160,
    d50: readNumber(values, "d50", "D50", { min: 0.05, max: 10, fallback: 0.3 }),
    ageYears: readNumber(values, "ageYears", "Deposit age", { min: 1, fallback: 1000 }),
    ocr: readNumber(values, "ocr", "OCR", { min: 1, max: 20, fallback: 1 }),
  });
  const selected = readChoice(values, "method", ["kulhawy-mayne", "skempton", "idriss-boulanger"] as const, "kulhawy-mayne");
  const pick = selected === "skempton" ? r.skempton : selected === "idriss-boulanger" ? r.idrissBoulanger : r.kulhawyMayne;
  return {
    title: "Relative Density from SPT",
    summary: `D_r = ${round(pick * 100, 0)}% (${densityDescriptor(pick)}) by the selected method.`,
    items: [
      { label: "Skempton (1986), C_d = 60", value: round(r.skempton * 100, 1), unit: "%" },
      { label: "Kulhawy & Mayne (1990)", value: round(r.kulhawyMayne * 100, 1), unit: "%" },
      { label: "C_p / C_A / C_OCR", value: `${round(r.cp, 1)} / ${round(r.ca, 3)} / ${round(r.cocr, 3)}` },
      { label: "Idriss & Boulanger (2008), C_d = 46", value: round(r.idrissBoulanger * 100, 1), unit: "%" },
      { label: "Density descriptor (selected)", value: densityDescriptor(pick) },
    ],
    notes: ["Input must be energy- and overburden-corrected (N1)60 for clean sand; fines, cementation, and gravel bias the result."],
    warnings: screeningWarnings(),
  };
};

export function compressionIndexCorrelations(input: { ll: number; e0: number; wn: number }) {
  const list = [
    { key: "skempton", label: "Skempton (1944): 0.007(LL − 7)", cc: 0.007 * (input.ll - 7) },
    { key: "terzaghi-peck", label: "Terzaghi & Peck (1967): 0.009(LL − 10)", cc: 0.009 * (input.ll - 10) },
    { key: "nishida", label: "Nishida (1956): 1.15(e0 − 0.35)", cc: 1.15 * (input.e0 - 0.35) },
    { key: "azzouz", label: "Azzouz et al. (1976): 0.40(e0 − 0.25)", cc: 0.4 * (input.e0 - 0.25) },
    { key: "koppula", label: "Koppula (1981): 0.01 w_n", cc: 0.01 * input.wn },
  ].filter((c) => c.cc > 0);
  const values = list.map((c) => c.cc);
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1);
  return { list, mean, min: Math.min(...values), max: Math.max(...values) };
}

export const compressionIndexCalculator: DesignCalculator = (values) => {
  const ll = readNumber(values, "ll", "Liquid limit LL", { min: 10, max: 300 });
  const e0 = readNumber(values, "e0", "Initial void ratio e0", { min: 0.3, max: 6 });
  const wn = readNumber(values, "wn", "Natural water content w_n", { min: 5, max: 300 });
  const r = compressionIndexCorrelations({ ll, e0, wn });
  if (!r.list.length) throw new Error("Inputs give no positive C_c estimate.");
  return {
    title: "Compression Index Correlations",
    summary: `C_c ≈ ${round(r.mean, 3)} (range ${round(r.min, 3)}–${round(r.max, 3)}); C_r ≈ ${round(r.mean / 10, 3)}–${round(
      r.mean / 5,
      3,
    )}; C_α ≈ ${round(0.04 * r.mean, 4)}.`,
    items: [
      ...r.list.map((c) => ({ label: c.label, value: round(c.cc, 3) })),
      { label: "Mean C_c", value: round(r.mean, 3) },
      { label: "C_c / (1 + e0) — compression ratio", value: round(r.mean / (1 + e0), 4) },
      { label: "Recompression index C_r (C_c/10 – C_c/5)", value: `${round(r.mean / 10, 3)} – ${round(r.mean / 5, 3)}` },
      { label: "Secondary compression C_α ≈ 0.04 C_c", value: round(0.04 * r.mean, 4) },
    ],
    notes: ["Correlations are for inorganic clays; organic soils and peats require laboratory testing (C_α/C_c ≈ 0.05–0.07)."],
    warnings: screeningWarnings(),
  };
};

export const undrainedStrengthRatioCalculator: DesignCalculator = (values) => {
  const sigmaV = readNumber(values, "sigmaV", "σ′_v0", { min: 1 });
  const sigmaP = readNumber(values, "sigmaP", "σ′_p", { min: 1 });
  const pi = readNumber(values, "pi", "Plasticity index", { min: 0, max: 150 });
  const S = readNumber(values, "S", "SHANSEP S", { min: 0.1, max: 0.5, fallback: 0.22 });
  const m = readNumber(values, "m", "SHANSEP m", { min: 0.5, max: 1, fallback: 0.8 });
  const ocr = Math.max(sigmaP / sigmaV, 1);
  const shansep = S * ocr ** m * sigmaV;
  const mesri = 0.22 * sigmaP;
  const skemptonNc = (0.11 + 0.0037 * pi) * sigmaV;
  return {
    title: "Undrained Strength from Stress History",
    summary: `OCR = ${round(ocr, 2)}; s_u ≈ ${round(shansep, 1)} kPa (SHANSEP), ${round(mesri, 1)} kPa (Mesri).`,
    items: [
      { label: "OCR = σ′_p / σ′_v0", value: round(ocr, 3) },
      { label: "SHANSEP s_u = S·OCR^m·σ′_v0", value: round(shansep, 1), unit: "kPa" },
      { label: "Mesri (1975) s_u = 0.22σ′_p", value: round(mesri, 1), unit: "kPa" },
      { label: "Skempton (1957) NC s_u = (0.11 + 0.0037PI)σ′_v0", value: round(skemptonNc, 1), unit: "kPa" },
    ],
    notes: [
      "S = 0.22 and m = 0.8 are typical for homogeneous low-OCR clays in DSS-type (average) shearing; use triaxial compression/extension values for anisotropic analyses.",
      "Skempton (1957) applies to normally consolidated clays only.",
    ],
    warnings: screeningWarnings(),
  };
};
