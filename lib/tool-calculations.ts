import { computeLiquefactionScreening } from "@/lib/liquefaction-screening";
import { computePostLiquefactionSettlement } from "@/lib/post-liquefaction-settlement";
import type { CalculationResult } from "@/lib/types";

export type FormValues = Record<string, string>;

type Calculator = (values: FormValues) => CalculationResult;

const G = 9.81;
const PA = 100;

function parseNumber(value: string | undefined, fieldLabel: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a valid number.`);
  }
  return parsed;
}

function ensurePositive(value: number, fieldLabel: string): number {
  if (value <= 0) {
    throw new Error(`${fieldLabel} must be greater than zero.`);
  }
  return value;
}

function ensureNonNegative(value: number, fieldLabel: string): number {
  if (value < 0) {
    throw new Error(`${fieldLabel} must be zero or greater.`);
  }
  return value;
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function integrateRectangularBoussinesqStress(q: number, b: number, l: number, z: number): number {
  if (z <= 0) {
    return q;
  }

  const nx = 48;
  const ny = 48;
  const dx = b / nx;
  const dy = l / ny;
  let sigmaZ = 0;

  for (let ix = 0; ix < nx; ix += 1) {
    const x = -b / 2 + dx * (ix + 0.5);

    for (let iy = 0; iy < ny; iy += 1) {
      const y = -l / 2 + dy * (iy + 0.5);
      const radiusSquared = x * x + y * y + z * z;
      const radius = Math.sqrt(radiusSquared);
      const dArea = dx * dy;
      sigmaZ += (3 * q * dArea * z ** 3) / (2 * Math.PI * radius ** 5);
    }
  }

  return sigmaZ;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function log10(value: number): number {
  return Math.log(value) / Math.LN10;
}

function formatOneIn(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return "n/a";
  }

  return `1:${round(1 / ratio, 0)}`;
}

function baseWarnings(): string[] {
  return [
    "Simplified output only. Do not use directly for final design.",
    "Project-specific investigation, engineering judgement, and code checks remain required.",
  ];
}

function interpolateStroudF1(pi: number): { f1: number; band: string; anchorText: string } {
  if (pi <= 15) {
    return { f1: 6.5, band: "PI <= 15", anchorText: "Anchored at PI = 15 -> f1 = 6.5" };
  }

  if (pi <= 20) {
    const f1 = 6.5 + ((5.5 - 6.5) * (pi - 15)) / 5;
    return { f1, band: "15 < PI <= 20", anchorText: "Interpolated between PI = 15 (f1 = 6.5) and PI = 20 (f1 = 5.5)" };
  }

  if (pi <= 25) {
    const f1 = 5.5 + ((5.0 - 5.5) * (pi - 20)) / 5;
    return { f1, band: "20 < PI <= 25", anchorText: "Interpolated between PI = 20 (f1 = 5.5) and PI = 25 (f1 = 5.0)" };
  }

  if (pi <= 30) {
    const f1 = 5.0 + ((4.8 - 5.0) * (pi - 25)) / 5;
    return { f1, band: "25 < PI <= 30", anchorText: "Interpolated between PI = 25 (f1 = 5.0) and PI = 30 (f1 = 4.8)" };
  }

  if (pi <= 35) {
    const f1 = 4.8 + ((4.5 - 4.8) * (pi - 30)) / 5;
    return { f1, band: "30 < PI <= 35", anchorText: "Interpolated between PI = 30 (f1 = 4.8) and PI = 35 (f1 = 4.5)" };
  }

  if (pi <= 40) {
    const f1 = 4.5 + ((4.4 - 4.5) * (pi - 35)) / 5;
    return { f1, band: "35 < PI <= 40", anchorText: "Interpolated between PI = 35 (f1 = 4.5) and PI = 40 (f1 = 4.4)" };
  }

  return { f1: 4.4, band: "PI > 40", anchorText: "Anchored at PI >= 40 -> f1 = 4.4" };
}

/** Stroud (1974) f₁ from PI for profile tools using cᵤ = f₁ × N₆₀ (same as cu-from-pi-and-spt). */
export function stroudF1FromPi(pi: number): number {
  return interpolateStroudF1(Math.max(0, pi)).f1;
}

function computeCrFromSampleDepth(sampleDepth: number): number {
  if (sampleDepth < 3) {
    return 0.75;
  }
  if (sampleDepth < 4) {
    return 0.8;
  }
  if (sampleDepth < 6) {
    return 0.85;
  }
  if (sampleDepth < 10) {
    return 0.95;
  }
  if (sampleDepth <= 30) {
    return 1;
  }
  // For z > 30 m the source table indicates variable values below 1.0.
  // A screening default is applied here.
  return 0.95;
}

function computeCbFromBoreholeDiameterSelection(selection: string): number {
  if (selection === "lt115") {
    return 1.0;
  }
  if (selection === "115to200") {
    return 1.05;
  }
  if (selection === "gt200") {
    return 1.15;
  }

  // Backward compatibility with older saved numeric values.
  const numeric = Number(selection);
  if (Number.isFinite(numeric)) {
    if (numeric > 200) {
      return 1.15;
    }
    if (numeric < 115) {
      return 1.0;
    }
    return 1.05;
  }

  return 1.0;
}

function estimateEuCuRatioFromPiOcr(pi: number, ocr: number): number {
  const boundedPi = Math.max(pi, 0.1);
  const boundedOcr = Math.min(Math.max(ocr, 1), 10);

  if (boundedPi < 30) {
    return 1500 * boundedOcr ** -0.58;
  }
  if (boundedPi <= 50) {
    return 600 * boundedOcr ** -0.55;
  }
  return 300 * boundedOcr ** -0.58;
}

function betaPrimeFromCohesiveSoilType(soilType: string): number {
  if (soilType === "soft-clay") {
    return 0.4;
  }
  if (soilType === "stiff-clay") {
    return 0.6;
  }
  return 0.7;
}

function estimateEprimeFromCohesionlessSpt(correlation: string, n: number): number {
  switch (correlation) {
    case "km-silty-clayey-500n60":
      return 500 * n;
    case "km-clean-1000n60":
      return 1000 * n;
    case "km-oc-clean-1500n60":
      return 1500 * n;
    case "bw-nc-500-n55-plus15":
      return 500 * (n + 15);
    case "bw-nc-7000-sqrt-n55":
      return 7000 * Math.sqrt(n);
    case "bw-nc-6000-n55":
      return 6000 * n;
    case "bw-nc-15000-ln-n55":
      return 15000 * Math.log(n);
    case "bw-nc-22000-ln-n55":
      return 22000 * Math.log(n);
    case "bw-nc-2600-n55":
      return 2600 * n;
    case "bw-nc-2900-n55":
      return 2900 * n;
    case "bw-sat-250-n55-plus15":
      return 250 * (n + 15);
    case "bw-gravel-1200-n55-plus6":
      return 1200 * (n + 6);
    case "bw-gravel-conditional":
      return n <= 15 ? 600 * (n + 6) : 2000 + 600 * (n + 6);
    case "bw-clayey-320-n55-plus15":
      return 320 * (n + 15);
    case "bw-silty-300-n55-plus6":
      return 300 * (n + 6);
    default:
      return 1000 * n;
  }
}

function cohesionlessCorrelationLabel(correlation: string): string {
  switch (correlation) {
    case "km-silty-clayey-500n60":
      return "Kulhawy & Mayne (1990): E' = 500N60";
    case "km-clean-1000n60":
      return "Kulhawy & Mayne (1990): E' = 1000N60";
    case "km-oc-clean-1500n60":
      return "Kulhawy & Mayne (1990): E' = 1500N60";
    case "bw-nc-500-n55-plus15":
      return "Bowles (1996): E' = 500(N55 + 15)";
    case "bw-nc-7000-sqrt-n55":
      return "Bowles (1996): E' = 7000N55^0.5";
    case "bw-nc-6000-n55":
      return "Bowles (1996): E' = 6000N55";
    case "bw-nc-15000-ln-n55":
      return "Bowles (1996): E' = 15000ln(N55)";
    case "bw-nc-22000-ln-n55":
      return "Bowles (1996): E' = 22000ln(N55)";
    case "bw-nc-2600-n55":
      return "Bowles (1996): E' = 2600N55";
    case "bw-nc-2900-n55":
      return "Bowles (1996): E' = 2900N55";
    case "bw-sat-250-n55-plus15":
      return "Bowles (1996): E' = 250(N55 + 15)";
    case "bw-gravel-1200-n55-plus6":
      return "Bowles (1996): E' = 1200(N55 + 6)";
    case "bw-gravel-conditional":
      return "Bowles (1996): conditional gravelly sands formula";
    case "bw-clayey-320-n55-plus15":
      return "Bowles (1996): E' = 320(N55 + 15)";
    case "bw-silty-300-n55-plus6":
      return "Bowles (1996): E' = 300(N55 + 6)";
    default:
      return "Kulhawy & Mayne (1990): E' = 1000N60";
  }
}

function bearingCapacityCore(
  method: "terzaghi" | "meyerhof" | "hansen" | "vesic",
  values: FormValues,
): CalculationResult {
  const GAMMA_W = 9.81; // kN/m3
  const c = parseNumber(values.cohesion, "Effective cohesion");
  const phiDeg = parseNumber(values.frictionAngle, "Effective friction angle");
  const gamma = ensurePositive(parseNumber(values.unitWeight, "Effective unit weight"), "Effective unit weight");
  const b = ensurePositive(parseNumber(values.width, "Foundation width"), "Foundation width");
  const l = ensurePositive(parseNumber(values.length, "Foundation length"), "Foundation length");
  const df = parseNumber(values.embedment, "Embedment depth");
  const fs = ensurePositive(parseNumber(values.factorOfSafety, "Factor of safety"), "Factor of safety");
  const gwt = Math.max(0, parseNumber(values.groundwaterDepth ?? "9999", "Groundwater table depth"));

  if (phiDeg < 0 || phiDeg > 50) {
    throw new Error("Friction angle should be between 0 and 50 degrees for this simplified method.");
  }

  if (fs <= 1) {
    throw new Error("Factor of safety should be greater than 1.");
  }

  const phi = degToRad(phiDeg);
  const tanPhi = Math.tan(phi);
  const nq = Math.exp(Math.PI * tanPhi) * Math.tan(Math.PI / 4 + phi / 2) ** 2;
  const nc = phiDeg === 0 ? 5.14 : (nq - 1) / Math.max(tanPhi, 1e-6);

  let ngamma = 0;
  if (method === "vesic") {
    ngamma = 2 * (nq + 1) * tanPhi;
  } else if (method === "meyerhof" || method === "hansen") {
    ngamma = (nq - 1) * Math.tan(1.4 * phi);
  } else {
    ngamma = 1.5 * (nq - 1) * tanPhi;
  }

  const ratio = Math.min(b / l, 1);
  const sc = 1 + 0.2 * ratio;
  const sq = 1 + 0.1 * ratio;
  const sgamma = Math.max(0.6, 1 - 0.4 * ratio);
  const dc = method === "terzaghi" ? 1 : 1 + 0.2 * Math.min(df / b, 5);
  const dq = method === "terzaghi" ? 1 : 1 + 0.1 * Math.min(df / b, 5);
  const dgamma = 1;

  const gammaSub = Math.max(gamma - GAMMA_W, 0.1);
  const effectiveStressAtDepth = (z: number): number => Math.max(gamma * z - GAMMA_W * Math.max(z - gwt, 0), 0);
  const surcharge = effectiveStressAtDepth(df);

  const averageEffectiveUnitWeight = (zTop: number, zBottom: number): number => {
    const top = Math.max(0, Math.min(zTop, zBottom));
    const bottom = Math.max(top, zBottom);
    if (bottom <= top) {
      return gamma;
    }
    const len = bottom - top;
    const unsatLen = Math.max(0, Math.min(bottom, gwt) - top);
    const satLen = len - unsatLen;
    return (gamma * unsatLen + gammaSub * satLen) / len;
  };

  // Common approximation: use an average effective unit weight over ~B below the base for the N_gamma term.
  const gammaForNgamma = averageEffectiveUnitWeight(df, df + b);
  const qult =
    c * nc * sc * dc +
    surcharge * nq * sq * dq +
    0.5 * gammaForNgamma * b * ngamma * sgamma * dgamma;
  const qall = qult / fs;

  return {
    title: `${method.charAt(0).toUpperCase() + method.slice(1)} Bearing Capacity`,
    summary: `Simplified rectangular footing check with φ′ = ${round(phiDeg, 1)} deg and B/L = ${round(
      b / l,
      2,
    )}.`,
    items: [
      { label: "N_c", value: round(nc, 3) },
      { label: "N_q", value: round(nq, 3) },
      { label: "N_gamma", value: round(ngamma, 3) },
      { label: "q (effective surcharge @ Df)", value: round(surcharge, 2), unit: "kPa" },
      { label: "gamma' used (avg over Df→Df+B)", value: round(gammaForNgamma, 3), unit: "kN/m3" },
      { label: "q_ult", value: round(qult, 2), unit: "kPa" },
      { label: "q_all", value: round(qall, 2), unit: "kPa" },
    ],
    notes: [
      `Shape factors were simplified with B/L = ${round(ratio, 2)}.`,
      `GWT correction uses gamma' = gamma - ${GAMMA_W} below the water table (simplified).`,
      "Inclination, base inclination, and eccentricity are not included in this check.",
    ],
    warnings: baseWarnings(),
  };
}

function ec7BearingCapacity(values: FormValues): CalculationResult {
  const GAMMA_W = 9.81; // kN/m3
  const designApproach = values.designApproach || "da1-combination-1";
  const c = parseNumber(values.cohesion, "Effective cohesion");
  const phiDeg = parseNumber(values.frictionAngle, "Effective friction angle");
  const gamma = ensurePositive(parseNumber(values.unitWeight, "Effective unit weight"), "Effective unit weight");
  const b = ensurePositive(parseNumber(values.width, "Foundation width"), "Foundation width");
  const l = ensurePositive(parseNumber(values.length, "Foundation length"), "Foundation length");
  const df = parseNumber(values.embedment, "Embedment depth");
  const gwt = Math.max(0, parseNumber(values.groundwaterDepth ?? "9999", "Groundwater table depth"));

  const factorSets: Record<
    string,
    { actionSet: string; gammaMphi: number; gammaMc: number; gammaR: number; ngammaMethod: "meyerhof" | "vesic" }
  > = {
    "da1-combination-1": { actionSet: "A1 + M1 + R1", gammaMphi: 1, gammaMc: 1, gammaR: 1, ngammaMethod: "meyerhof" },
    "da1-combination-2": { actionSet: "A2 + M2 + R1", gammaMphi: 1.25, gammaMc: 1.25, gammaR: 1, ngammaMethod: "meyerhof" },
    da2: { actionSet: "A1 + M1 + R2", gammaMphi: 1, gammaMc: 1, gammaR: 1.4, ngammaMethod: "meyerhof" },
    da3: { actionSet: "(A1 or A2) + M2 + R3", gammaMphi: 1.25, gammaMc: 1.25, gammaR: 1.4, ngammaMethod: "vesic" },
  };

  const factors = factorSets[designApproach] ?? factorSets["da1-combination-1"];
  const phi = degToRad(phiDeg);
  const tanPhiD = Math.tan(phi) / factors.gammaMphi;
  const phiDegD = (Math.atan(tanPhiD) * 180) / Math.PI;
  const cDesign = c / factors.gammaMc;
  const nq = Math.exp(Math.PI * tanPhiD) * Math.tan(Math.PI / 4 + Math.atan(tanPhiD) / 2) ** 2;
  const nc = Math.abs(tanPhiD) < 1e-6 ? 5.14 : (nq - 1) / tanPhiD;
  const ngamma =
    factors.ngammaMethod === "vesic"
      ? 2 * (nq + 1) * tanPhiD
      : (nq - 1) * Math.tan(1.4 * Math.atan(tanPhiD));

  const ratio = Math.min(b / l, 1);
  const sc = 1 + 0.2 * ratio;
  const sq = 1 + 0.1 * ratio;
  const sgamma = Math.max(0.6, 1 - 0.4 * ratio);
  const dc = 1 + 0.2 * Math.min(df / b, 5);
  const dq = 1 + 0.1 * Math.min(df / b, 5);

  const gammaSub = Math.max(gamma - GAMMA_W, 0.1);
  const effectiveStressAtDepth = (z: number): number => Math.max(gamma * z - GAMMA_W * Math.max(z - gwt, 0), 0);
  const surcharge = effectiveStressAtDepth(df);
  const averageEffectiveUnitWeight = (zTop: number, zBottom: number): number => {
    const top = Math.max(0, Math.min(zTop, zBottom));
    const bottom = Math.max(top, zBottom);
    if (bottom <= top) {
      return gamma;
    }
    const len = bottom - top;
    const unsatLen = Math.max(0, Math.min(bottom, gwt) - top);
    const satLen = len - unsatLen;
    return (gamma * unsatLen + gammaSub * satLen) / len;
  };
  const gammaForNgamma = averageEffectiveUnitWeight(df, df + b);
  const qultDesign =
    cDesign * nc * sc * dc +
    surcharge * nq * sq * dq +
    0.5 * gammaForNgamma * b * ngamma * sgamma;
  const qrd = qultDesign / factors.gammaR;

  return {
    title: "Eurocode 7 Bearing Resistance Screening",
    summary: `Design approach ${designApproach.toUpperCase().replaceAll("-", " ")} represented as ${factors.actionSet}.`,
    items: [
      { label: "phi_d", value: round(phiDegD, 2), unit: "deg" },
      { label: "c_d", value: round(cDesign, 2), unit: "kPa" },
      { label: "N_q", value: round(nq, 3) },
      { label: "N_c", value: round(nc, 3) },
      { label: "N_gamma", value: round(ngamma, 3) },
      { label: "q (effective surcharge @ Df)", value: round(surcharge, 2), unit: "kPa" },
      { label: "gamma' used (avg over Df→Df+B)", value: round(gammaForNgamma, 3), unit: "kN/m3" },
      { label: "q_ult,d", value: round(qultDesign, 2), unit: "kPa" },
      { label: "q_Rd", value: round(qrd, 2), unit: "kPa" },
      { label: "gamma_R,v", value: round(factors.gammaR, 2) },
    ],
    notes: [
      `Material factors applied: gamma_M,phi = ${factors.gammaMphi}, gamma_M,c = ${factors.gammaMc}.`,
      "This tool screens the resistance side only; full Eurocode 7 verification also requires factored action effects and National Annex choices.",
    ],
    warnings: [
      "Indicative Eurocode 7 screening only. Do not treat this as a code-compliant design check.",
      "National Annex requirements and full Ed versus Rd verification remain the designer's responsibility.",
    ],
  };
}

const calculators: Record<string, Calculator> = {
  "degree-of-saturation": (values) => {
    const w = parseNumber(values.waterContent, "Water content") / 100;
    const gs = ensurePositive(parseNumber(values.specificGravity, "Specific gravity"), "Specific gravity");
    const e = ensurePositive(parseNumber(values.voidRatio, "Void ratio"), "Void ratio");
    const sr = (w * gs) / e;

    return {
      title: "Degree of Saturation",
      items: [
        { label: "Degree of saturation", value: round(sr * 100, 2), unit: "%" },
        { label: "Saturation ratio", value: round(sr, 3) },
      ],
      notes: ["Values above 100% indicate inconsistent phase-relationship inputs."],
      warnings: baseWarnings(),
    };
  },
  "water-content": (values) => {
    const wetMass = ensurePositive(parseNumber(values.wetMass, "Wet mass"), "Wet mass");
    const dryMass = ensurePositive(parseNumber(values.dryMass, "Dry mass"), "Dry mass");
    if (wetMass < dryMass) {
      throw new Error("Wet mass should not be less than dry mass.");
    }

    const waterContent = (wetMass - dryMass) / dryMass;

    return {
      title: "Water Content",
      items: [
        { label: "Water content", value: round(waterContent * 100, 2), unit: "%" },
        { label: "Water mass", value: round(wetMass - dryMass, 3), unit: "g" },
      ],
      notes: ["Assumes oven-dry mass represents the dry state."],
      warnings: baseWarnings(),
    };
  },
  "bulk-dry-density": (values) => {
    const totalWeight = ensurePositive(parseNumber(values.totalWeight, "Total weight"), "Total weight");
    const volume = ensurePositive(parseNumber(values.volume, "Volume"), "Volume");
    const waterContent = parseNumber(values.waterContent, "Water content") / 100;
    const gamma = totalWeight / volume;
    const gammaDry = gamma / (1 + waterContent);
    const rhoDry = (gammaDry * 1000) / G;

    return {
      title: "Bulk and Dry Density",
      items: [
        { label: "Bulk unit weight", value: round(gamma, 3), unit: "kN/m3" },
        { label: "Dry unit weight", value: round(gammaDry, 3), unit: "kN/m3" },
        { label: "Dry density", value: round(rhoDry, 1), unit: "kg/m3" },
      ],
      notes: ["Water content is assumed gravimetric."],
      warnings: baseWarnings(),
    };
  },
  "gmax-from-vs": (values) => {
    const densityInputMode = values.densityInputMode === "mass-density" ? "mass-density" : "unit-weight";
    const vs = ensurePositive(parseNumber(values.vs, "Shear wave velocity"), "Shear wave velocity");
    const densityKgM3 =
      densityInputMode === "mass-density"
        ? ensurePositive(parseNumber(values.density, "Mass density"), "Mass density")
        : (ensurePositive(parseNumber(values.unitWeight, "Unit weight"), "Unit weight") * 1000) / G;
    const gmaxKpa = (densityKgM3 * vs ** 2) / 1000;
    const unitWeight = (densityKgM3 * G) / 1000;

    return {
      title: "Small-Strain Shear Modulus",
      items: [
        { label: "Gmax", value: round(gmaxKpa / 1000, 3), unit: "MPa" },
        { label: "Mass density, rho", value: round(densityKgM3, 1), unit: "kg/m3" },
        { label: "Unit weight, gamma", value: round(unitWeight, 3), unit: "kN/m3" },
      ],
      notes: ["Gmax applies to very small strain levels and should not be treated as a working-strain modulus."],
      warnings: baseWarnings(),
    };
  },
  "eoed-from-mv": (values) => {
    const mv = ensurePositive(parseNumber(values.mv, "m_v"), "m_v");
    const eoed = 1 / mv;

    return {
      title: "Constrained Modulus",
      items: [{ label: "Eoed", value: round(eoed, 3), unit: "MPa" }],
      notes: ["Because m_v is stress-dependent, Eoed should be interpreted over the same stress range."],
      warnings: baseWarnings(),
    };
  },
  "ocr-calculator": (values) => {
    const sigmaP = ensurePositive(parseNumber(values.preconsolidationStress, "Preconsolidation stress"), "Preconsolidation stress");
    const sampleDepth = ensureNonNegative(parseNumber(values.sampleDepth, "Sample depth"), "Sample depth");
    const groundwaterDepth = ensureNonNegative(
      parseNumber(values.groundwaterDepth, "Groundwater depth"),
      "Groundwater depth",
    );
    const unitWeight = ensurePositive(parseNumber(values.unitWeight, "Bulk unit weight"), "Bulk unit weight");
    const sigmaV = Math.max(unitWeight * sampleDepth - 9.81 * Math.max(sampleDepth - groundwaterDepth, 0), 0.1);
    const ocr = sigmaP / sigmaV;

    return {
      title: "Overconsolidation Ratio",
      items: [
        { label: "Current vertical effective stress, sigma'_v0", value: round(sigmaV, 2), unit: "kPa" },
        { label: "OCR", value: round(ocr, 3) },
      ],
      notes: [ocr > 1 ? "The soil is overconsolidated in this simplified interpretation." : "The soil is approximately normally consolidated."],
      warnings: baseWarnings(),
    };
  },
  "aashto-classification": (values) => {
    const p10 = parseNumber(values.passing10, "Percent passing No. 10");
    const p40 = parseNumber(values.passing40, "Percent passing No. 40");
    const p200 = parseNumber(values.passing200, "Percent passing No. 200");
    const ll = parseNumber(values.liquidLimit, "Liquid limit");
    const pi = parseNumber(values.plasticityIndex, "Plasticity index");

    let group = "Unclassified";
    if (p200 <= 35) {
      if (p10 <= 50 && p40 <= 30 && p200 <= 15 && pi <= 6) {
        group = "A-1-a";
      } else if (p40 <= 50 && p200 <= 25 && pi <= 6) {
        group = "A-1-b";
      } else if (p40 > 50 && p200 <= 10 && pi <= 6) {
        group = "A-3";
      } else if (pi <= 10 && ll <= 40) {
        group = "A-2-4";
      } else if (pi <= 10 && ll > 40) {
        group = "A-2-5";
      } else if (pi > 10 && ll <= 40) {
        group = "A-2-6";
      } else {
        group = "A-2-7";
      }
    } else if (ll <= 40 && pi <= 10) {
      group = "A-4";
    } else if (ll > 40 && pi <= 10) {
      group = "A-5";
    } else if (ll <= 40 && pi > 10) {
      group = "A-6";
    } else {
      group = pi <= ll - 30 ? "A-7-5" : "A-7-6";
    }

    const term1 = Math.max(0, p200 - 35) * (0.2 + 0.005 * Math.max(0, ll - 40));
    const term2 = 0.01 * Math.max(0, p200 - 15) * Math.max(0, pi - 10);
    const gi = round(term1 + term2, 0);

    return {
      title: "AASHTO Classification",
      summary: `Estimated group: ${group}.`,
      items: [
        { label: "Group", value: group },
        { label: "Group index", value: gi },
      ],
      notes: ["Full subgrade assessment should still consider drainage, frost, and compaction behaviour."],
      warnings: baseWarnings(),
    };
  },
  "plasticity-chart-visualizer": (values) => {
    const ll = parseNumber(values.liquidLimit, "Liquid limit");
    const pl = parseNumber(values.plasticLimit, "Plastic limit");
    const fines = parseNumber(values.fines, "Percent passing No. 200");
    if (pl > ll) {
      throw new Error("Plastic limit cannot exceed liquid limit.");
    }
    const pi = ll - pl;
    const aLine = 0.73 * (ll - 20);
    let zone = "Silt-like / below A-line";
    if (pi >= aLine) {
      zone = ll < 50 ? "CL-style zone" : "CH-style zone";
    } else if (ll < 50) {
      zone = "ML-style zone";
    } else {
      zone = "MH-style zone";
    }
    if (fines < 50) {
      zone = `${zone} with coarse fraction review still required`;
    }

    return {
      title: "Plasticity Chart Interpretation",
      items: [
        { label: "PI", value: round(pi, 2) },
        { label: "A-line PI", value: round(aLine, 2) },
        { label: "Chart zone", value: zone },
        { label: "Plot point", value: `(LL = ${round(ll, 1)}, PI = ${round(pi, 1)})` },
      ],
      notes: ["This tool interprets the chart location but does not replace a formal laboratory classification."],
      warnings: baseWarnings(),
    };
  },
  "liquefaction-soil-screening": (values) => {
    const pi = parseNumber(values.plasticityIndex, "Plasticity index");
    const fines = parseNumber(values.fines, "Fines content");
    const ll = parseNumber(values.liquidLimit, "Liquid limit");

    let screening = "Lower susceptibility in this simplified screen";
    if (pi < 7 && fines < 35 && ll < 35) {
      screening = "Potentially susceptible";
    } else if (pi < 12 && fines < 50) {
      screening = "Borderline / context dependent";
    }

    return {
      title: "Liquefaction Soil Screening",
      summary: screening,
      items: [
        { label: "Plasticity index", value: round(pi, 1), unit: "%" },
        { label: "Fines content", value: round(fines, 1), unit: "%" },
        { label: "Liquid limit", value: round(ll, 1), unit: "%" },
      ],
      notes: ["This is only a material-behaviour screen and not a triggering calculation."],
      warnings: [
        "Liquefaction screening only. Do not use as a final seismic design basis.",
        "Site-specific cyclic resistance evaluation and engineering judgement are required.",
      ],
    };
  },
  "traditional-bearing-capacity-methods": (values) => {
    const selectedMethod = values.method;
    const method =
      selectedMethod === "meyerhof" ||
      selectedMethod === "hansen" ||
      selectedMethod === "vesic" ||
      selectedMethod === "terzaghi"
        ? selectedMethod
        : "terzaghi";

    return bearingCapacityCore(method, values);
  },
  "eurocode-7-bearing-resistance": (values) => ec7BearingCapacity(values),
  "bearing-capacity-eccentricity-correction": (values) => {
    const b = ensurePositive(parseNumber(values.width, "Foundation width"), "Foundation width");
    const l = ensurePositive(parseNumber(values.length, "Foundation length"), "Foundation length");
    const load = ensurePositive(parseNumber(values.verticalLoad, "Vertical load"), "Vertical load");
    const momentX = Math.max(0, parseNumber(values.momentX, "Moment about x-axis"));
    const momentY = Math.max(0, parseNumber(values.momentY, "Moment about y-axis"));
    const ex = momentY / load;
    const ey = momentX / load;
    const be = b - 2 * ex;
    const le = l - 2 * ey;
    if (be <= 0 || le <= 0) {
      throw new Error("Eccentricities are too large for a positive effective area.");
    }
    const aeff = be * le;
    return {
      title: "Effective Area Correction",
      items: [
        { label: "e_x", value: round(ex, 3), unit: "m" },
        { label: "e_y", value: round(ey, 3), unit: "m" },
        { label: "Effective width", value: round(be, 3), unit: "m" },
        { label: "Effective length", value: round(le, 3), unit: "m" },
        { label: "Effective area", value: round(aeff, 3), unit: "m2" },
        { label: "q_eff", value: round(load / aeff, 2), unit: "kPa" },
      ],
      notes: [
        "Eccentricities are derived internally from the input axial load and moments.",
        "This effective-area concept should be paired with a separate bearing or settlement check.",
      ],
      warnings: baseWarnings(),
    };
  },
  "integrated-settlement-analysis": (values) => {
    const loadCase = values.loadCase === "structure" ? "structure" : "embankment";
    const q0 = ensurePositive(parseNumber(values.surfaceLoad, "Surface load"), "Surface load");
    const excavationDepth =
      loadCase === "structure"
        ? Math.max(0, parseNumber(values.excavationDepth ?? "0", "Excavation depth"))
        : 0;
    const gammaExc = 18;
    const qApplied = loadCase === "structure" ? Math.max(q0 - gammaExc * excavationDepth, 0) : q0;
    const zRef = 3;

    let influence = 0;
    if (loadCase === "embankment") {
      const a = ensurePositive(parseNumber(values.a, "Embankment parameter a"), "Embankment parameter a");
      const b = ensurePositive(parseNumber(values.b, "Embankment parameter b"), "Embankment parameter b");
      const az = Math.max(a / zRef, 0);
      const bz = Math.max(b / zRef, 0);
      // Osterberg-inspired screening interpolation (v1).
      const azTerm = 1 - Math.exp(-0.55 * az);
      const bzTerm = 1 - Math.exp(-0.35 * Math.pow(bz, 0.85));
      influence = Math.max(0, Math.min(0.5, 0.5 * azTerm * (0.45 + 0.55 * bzTerm)));
    } else {
      const width = ensurePositive(parseNumber(values.width, "Structure width B"), "Structure width B");
      const length = ensurePositive(parseNumber(values.length, "Structure length L"), "Structure length L");
      influence = (width * length) / ((width + zRef) * (length + zRef));
    }

    const deltaSigma = qApplied * influence;

    return {
      title: "Integrated Settlement Screening",
      summary:
        "Use the Soil Profile tab for full layered immediate + consolidation settlement totals with clay/sand assignment and mv or Cc/Cr alternatives.",
      items: [
        { label: "Selected load case", value: loadCase === "embankment" ? "Embankment" : "Structure" },
        ...(loadCase === "structure"
          ? [
              { label: "Excavation depth, D_exc", value: round(excavationDepth, 3), unit: "m" },
              { label: "Net surface load, q_net", value: round(qApplied, 2), unit: "kPa" },
            ]
          : []),
        { label: "Reference influence factor, I", value: round(influence, 4) },
        { label: "Reference stress increase, Δσ", value: round(deltaSigma, 2), unit: "kPa" },
      ],
      notes: [
        "This Calculation tab gives a compact stress-screening preview only.",
        "The full settlement workflow is implemented in the Soil Profile tab.",
      ],
      warnings: baseWarnings(),
    };
  },
  "schmertmann-settlement": (values) => {
    const q = ensurePositive(parseNumber(values.netPressure, "Net pressure"), "Net pressure");
    const b = ensurePositive(parseNumber(values.width, "Width"), "Width");
    const es = ensurePositive(parseNumber(values.elasticModulus, "Elastic modulus"), "Elastic modulus");
    const c1 = ensurePositive(parseNumber(values.c1, "C1"), "C1");
    const c2 = ensurePositive(parseNumber(values.c2, "C2"), "C2");
    const iz = ensurePositive(parseNumber(values.izAverage, "Average influence factor"), "Average influence factor");
    const s = (c1 * c2 * q * b * iz) / es;
    return {
      title: "Schmertmann-Style Settlement",
      items: [
        { label: "Estimated settlement", value: round(s, 4), unit: "m" },
        { label: "Estimated settlement", value: round(s * 1000, 1), unit: "mm" },
      ],
      notes: ["The user-supplied C1, C2, and I_z(avg) control the result strongly."],
      warnings: baseWarnings(),
    };
  },
  "secondary-compression-settlement": (values) => {
    const ca = ensurePositive(parseNumber(values.cAlpha, "C_alpha"), "C_alpha");
    const ep = ensurePositive(parseNumber(values.voidRatio, "Void ratio"), "Void ratio");
    const h = ensurePositive(parseNumber(values.layerThickness, "Layer thickness"), "Layer thickness");
    const t1 = ensurePositive(parseNumber(values.t1, "t1"), "t1");
    const t2 = ensurePositive(parseNumber(values.t2, "t2"), "t2");
    if (t2 <= t1) {
      throw new Error("Final time t2 should be greater than t1.");
    }
    const s = (h * ca * log10(t2 / t1)) / (1 + ep);
    return {
      title: "Secondary Compression Settlement",
      items: [
        { label: "Secondary settlement", value: round(s, 4), unit: "m" },
        { label: "Secondary settlement", value: round(s * 1000, 1), unit: "mm" },
      ],
      notes: ["Creep behaviour is often highly uncertain and should be checked against project experience."],
      warnings: baseWarnings(),
    };
  },
  "layered-settlement": (values) => {
    const layers = [
      {
        h: Math.max(0, parseNumber(values.h1, "Layer 1 thickness")),
        mv: Math.max(0, parseNumber(values.mv1, "Layer 1 m_v")),
        ds: Math.max(0, parseNumber(values.ds1, "Layer 1 stress increase")),
      },
      {
        h: Math.max(0, parseNumber(values.h2, "Layer 2 thickness")),
        mv: Math.max(0, parseNumber(values.mv2, "Layer 2 m_v")),
        ds: Math.max(0, parseNumber(values.ds2, "Layer 2 stress increase")),
      },
      {
        h: Math.max(0, parseNumber(values.h3, "Layer 3 thickness")),
        mv: Math.max(0, parseNumber(values.mv3, "Layer 3 m_v")),
        ds: Math.max(0, parseNumber(values.ds3, "Layer 3 stress increase")),
      },
    ];
    const settlements = layers.map((layer) => layer.mv * (layer.ds / 1000) * layer.h);
    const total = settlements.reduce((sum, value) => sum + value, 0);

    return {
      title: "Layered Settlement",
      items: [
        { label: "Layer 1 settlement", value: round(settlements[0] * 1000, 1), unit: "mm" },
        { label: "Layer 2 settlement", value: round(settlements[1] * 1000, 1), unit: "mm" },
        { label: "Layer 3 settlement", value: round(settlements[2] * 1000, 1), unit: "mm" },
        { label: "Total settlement", value: round(total * 1000, 1), unit: "mm" },
      ],
      notes: ["Each layer is treated independently with user-supplied stress increase at its representative depth."],
      warnings: baseWarnings(),
    };
  },
  "stress-distribution-21": (values) => {
    const method =
      values.method === "thirty-degree" || values.method === "boussinesq" || values.method === "two-to-one"
        ? values.method
        : "two-to-one";
    const q = ensurePositive(parseNumber(values.appliedPressure, "Applied pressure"), "Applied pressure");
    const b = ensurePositive(parseNumber(values.width, "Width"), "Width");
    const l = ensurePositive(parseNumber(values.length, "Length"), "Length");
    const z = Math.max(0, parseNumber(values.depth, "Depth"));
    const spreadFactor =
      method === "two-to-one" ? 0.5 : method === "thirty-degree" ? Math.tan(Math.PI / 6) : 0;
    const spreadWidth = method === "boussinesq" ? b : b + 2 * spreadFactor * z;
    const spreadLength = method === "boussinesq" ? l : l + 2 * spreadFactor * z;
    const deltaSigma =
      method === "boussinesq"
        ? integrateRectangularBoussinesqStress(q, b, l, z)
        : (q * b * l) / (spreadWidth * spreadLength);

    const methodLabel =
      method === "two-to-one" ? "2:1 Method" : method === "thirty-degree" ? "30 Degree Method" : "Boussinesq";

    return {
      title: "Stress Distribution",
      summary: `Selected method: ${methodLabel}.`,
      items: [
        { label: "Vertical stress increase", value: round(deltaSigma, 2), unit: "kPa" },
        { label: "Stress ratio, Î”Ïƒ_z / q", value: round(deltaSigma / q, 3) },
        ...(method === "boussinesq"
          ? [{ label: "Evaluation point", value: "Footing centreline" }]
          : [
              { label: "Spread width at depth", value: round(spreadWidth, 3), unit: "m" },
              { label: "Spread length at depth", value: round(spreadLength, 3), unit: "m" },
            ]),
      ],
      notes: [
        method === "two-to-one"
          ? "The 2:1 method assumes a 2 vertical to 1 horizontal load spread and gives an average stress over the expanded area."
          : method === "thirty-degree"
            ? "The 30-degree method spreads the loaded area using side slopes defined by tan(30Â°) and returns an average stress over that area."
            : "The Boussinesq option numerically integrates the elastic point-load solution over the loaded rectangle and reports the centreline stress at the selected depth.",
      ],
      warnings: baseWarnings(),
    };
  },
  "rankine-earth-pressure": (values) => {
    const phiDeg = parseNumber(values.frictionAngle, "Friction angle");
    const gamma = ensurePositive(parseNumber(values.unitWeight, "Unit weight"), "Unit weight");
    const h = ensurePositive(parseNumber(values.height, "Retained height"), "Retained height");
    const surcharge = Math.max(0, parseNumber(values.surcharge, "Surcharge"));
    const phi = degToRad(phiDeg);
    const ka = Math.tan(Math.PI / 4 - phi / 2) ** 2;
    const kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;
    const pa = 0.5 * ka * gamma * h ** 2 + ka * surcharge * h;
    const pp = 0.5 * kp * gamma * h ** 2 + kp * surcharge * h;
    return {
      title: "Rankine Earth Pressure",
      items: [
        { label: "Ka", value: round(ka, 3) },
        { label: "Kp", value: round(kp, 3) },
        { label: "Active resultant", value: round(pa, 2), unit: "kN/m" },
        { label: "Passive resultant", value: round(pp, 2), unit: "kN/m" },
      ],
      notes: ["Reported forces are per unit length of wall."],
      warnings: baseWarnings(),
    };
  },
  "coulomb-earth-pressure": (values) => {
    const phiDeg = parseNumber(values.frictionAngle, "Friction angle");
    const deltaDeg = parseNumber(values.wallFriction, "Wall friction");
    const gamma = ensurePositive(parseNumber(values.unitWeight, "Unit weight"), "Unit weight");
    const h = ensurePositive(parseNumber(values.height, "Retained height"), "Retained height");
    const surcharge = Math.max(0, parseNumber(values.surcharge, "Surcharge"));
    if (deltaDeg > phiDeg) {
      throw new Error("Wall friction should not exceed backfill friction angle in this simplified tool.");
    }
    const phi = degToRad(phiDeg);
    const delta = degToRad(deltaDeg);
    const root = Math.sqrt((Math.sin(phi + delta) * Math.sin(phi)) / Math.max(Math.cos(delta), 1e-6));
    const ka = (Math.cos(phi) ** 2) / (Math.cos(delta) * (1 + root) ** 2);
    const pa = 0.5 * ka * gamma * h ** 2 + ka * surcharge * h;
    return {
      title: "Coulomb Active Pressure",
      items: [
        { label: "Ka", value: round(ka, 3) },
        { label: "Active resultant", value: round(pa, 2), unit: "kN/m" },
      ],
      notes: ["This expression is restricted to a vertical wall and horizontal backfill."],
      warnings: baseWarnings(),
    };
  },
  "k0-earth-pressure": (values) => {
    const phiDeg = parseNumber(values.frictionAngle, "Friction angle");
    const ocr = ensurePositive(parseNumber(values.ocr, "OCR"), "OCR");
    const sigmaV = ensurePositive(parseNumber(values.verticalStress, "Vertical stress"), "Vertical stress");
    const phi = degToRad(phiDeg);
    const k0nc = 1 - Math.sin(phi);
    const k0oc = k0nc * ocr ** Math.sin(phi);
    const ka = Math.tan(Math.PI / 4 - phi / 2) ** 2;
    const kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;
    return {
      title: "Earth Pressure Coefficients",
      items: [
        { label: "K0 (NC)", value: round(k0nc, 3) },
        { label: "K0 (OCR-adjusted)", value: round(k0oc, 3) },
        { label: "Kactive (Ka)", value: round(ka, 3) },
        { label: "Kpassive (Kp)", value: round(kp, 3) },
        { label: "sigma'h,0", value: round(k0oc * sigmaV, 2), unit: "kPa" },
        { label: "sigma'h,a", value: round(ka * sigmaV, 2), unit: "kPa" },
        { label: "sigma'h,p", value: round(kp * sigmaV, 2), unit: "kPa" },
      ],
      notes: [
        "K0 is reported with OCR adjustment using a Jaky-based screening relation.",
        "Kactive and Kpassive are Rankine coefficients for drained frictional backfill assumptions.",
      ],
      warnings: baseWarnings(),
    };
  },
  "pile-axial-capacity": (values) => {
    const fsUnit = Math.max(0, parseNumber(values.shaftResistance, "Unit shaft resistance"));
    const d = ensurePositive(parseNumber(values.diameter, "Pile diameter"), "Pile diameter");
    const l = ensurePositive(parseNumber(values.embeddedLength, "Embedded length"), "Embedded length");
    const qb = Math.max(0, parseNumber(values.baseResistance, "Base resistance"));
    const fs = ensurePositive(parseNumber(values.factorOfSafety, "Factor of safety"), "Factor of safety");
    const qs = fsUnit * Math.PI * d * l;
    const qbForce = qb * (Math.PI * d ** 2) / 4;
    const qult = qs + qbForce;
    return {
      title: "Pile Axial Capacity",
      items: [
        { label: "Shaft resistance", value: round(qs, 1), unit: "kN" },
        { label: "Base resistance", value: round(qbForce, 1), unit: "kN" },
        { label: "Ultimate capacity", value: round(qult, 1), unit: "kN" },
        { label: "Allowable capacity", value: round(qult / fs, 1), unit: "kN" },
      ],
      notes: ["Compression-only screening. Tension, settlement, and drivability are not considered."],
      warnings: baseWarnings(),
    };
  },
  "pile-alpha-beta-lambda": (values) => {
    const method = values.method || "alpha";
    const coefficient = Math.max(0, parseNumber(values.coefficient, "Method coefficient"));
    const referenceStress = Math.max(0, parseNumber(values.referenceStress, "Reference stress"));
    const perimeter = ensurePositive(parseNumber(values.perimeter, "Perimeter"), "Perimeter");
    const length = ensurePositive(parseNumber(values.embeddedLength, "Embedded length"), "Embedded length");
    const shaftStress = coefficient * referenceStress;
    const shaftCapacity = shaftStress * perimeter * length;
    return {
      title: "Alpha / Beta / Lambda Shaft Capacity",
      summary: `Method interpreted as ${method}.`,
      items: [
        { label: "Unit shaft stress", value: round(shaftStress, 2), unit: "kPa" },
        { label: "Shaft capacity", value: round(shaftCapacity, 1), unit: "kN" },
      ],
      notes: ["Reference stress must be chosen to match the selected method and local practice."],
      warnings: baseWarnings(),
    };
  },
  "negative-skin-friction": (values) => {
    const beta = Math.max(0, parseNumber(values.betaNegative, "Negative friction coefficient"));
    const sigma = Math.max(0, parseNumber(values.effectiveStress, "Effective stress"));
    const perimeter = ensurePositive(parseNumber(values.perimeter, "Perimeter"), "Perimeter");
    const dragLength = ensurePositive(parseNumber(values.dragLength, "Drag length"), "Drag length");
    const fneg = beta * sigma;
    const qneg = fneg * perimeter * dragLength;
    return {
      title: "Negative Skin Friction",
      items: [
        { label: "Unit negative shaft stress", value: round(fneg, 2), unit: "kPa" },
        { label: "Downdrag load", value: round(qneg, 1), unit: "kN" },
      ],
      notes: ["Neutral plane location and interaction with structural load are not included."],
      warnings: baseWarnings(),
    };
  },
  "pile-group-efficiency": (values) => {
    const rows = Math.max(1, Math.round(parseNumber(values.rows, "Rows")));
    const columns = Math.max(1, Math.round(parseNumber(values.columns, "Columns")));
    const d = ensurePositive(parseNumber(values.diameter, "Pile diameter"), "Pile diameter");
    const spacing = ensurePositive(parseNumber(values.spacing, "Spacing"), "Spacing");
    const singlePile = ensurePositive(parseNumber(values.singlePileAllowable, "Single pile allowable capacity"), "Single pile allowable capacity");
    const thetaDeg = (Math.atan(d / spacing) * 180) / Math.PI;
    const efficiencyRaw =
      1 - (thetaDeg * (((rows - 1) * columns) + ((columns - 1) * rows))) / (90 * rows * columns);
    const efficiency = Math.max(0.2, Math.min(1, efficiencyRaw));
    const totalAllowable = efficiency * rows * columns * singlePile;
    return {
      title: "Pile Group Efficiency",
      items: [
        { label: "Group efficiency", value: round(efficiency, 3) },
        { label: "Estimated group allowable capacity", value: round(totalAllowable, 1), unit: "kN" },
      ],
      notes: ["Converse-Labarre style efficiency is only a preliminary spacing-based estimate."],
      warnings: baseWarnings(),
    };
  },
  "preloading-settlement": (values) => {
    const cc = ensurePositive(parseNumber(values.compressionIndex, "Compression index"), "Compression index");
    const e0 = ensurePositive(parseNumber(values.voidRatio, "Void ratio"), "Void ratio");
    const h = ensurePositive(parseNumber(values.layerThickness, "Layer thickness"), "Layer thickness");
    const sigma0 = ensurePositive(parseNumber(values.initialStress, "Initial stress"), "Initial stress");
    const dsService = Math.max(0, parseNumber(values.serviceStress, "Service stress"));
    const dsPreload = Math.max(0, parseNumber(values.preloadStress, "Preload stress"));
    const serviceSettlement = h * (cc / (1 + e0)) * log10((sigma0 + dsService) / sigma0);
    const preloadSettlement = h * (cc / (1 + e0)) * log10((sigma0 + dsPreload) / sigma0);
    return {
      title: "Preloading Check",
      items: [
        { label: "Settlement under service load", value: round(serviceSettlement * 1000, 1), unit: "mm" },
        { label: "Settlement under preload", value: round(preloadSettlement * 1000, 1), unit: "mm" },
        { label: "Preload / service stress ratio", value: round((sigma0 + dsPreload) / (sigma0 + dsService), 3) },
      ],
      notes: ["This comparison is intended to show stress margin rather than full staged preloading behaviour."],
      warnings: baseWarnings(),
    };
  },
  "wick-drains-time-factor": (values) => {
    const ch = ensurePositive(parseNumber(values.ch, "c_h"), "c_h");
    const time = ensurePositive(parseNumber(values.time, "Time"), "Time");
    const de = ensurePositive(parseNumber(values.equivalentDiameter, "Equivalent diameter"), "Equivalent diameter");
    const dw = ensurePositive(parseNumber(values.drainDiameter, "Drain diameter"), "Drain diameter");
    if (de <= dw) {
      throw new Error("Equivalent influence diameter should exceed drain diameter.");
    }
    const th = (ch * time) / (de ** 2);
    const fn = Math.log(de / dw) - 0.75;
    if (fn <= 0) {
      throw new Error("Drain geometry gives a non-physical F(n).");
    }
    const u = 1 - Math.exp((-8 * th) / fn);
    return {
      title: "Radial Consolidation by Wick Drains",
      items: [
        { label: "Time factor, Th", value: round(th, 3) },
        { label: "F(n)", value: round(fn, 3) },
        { label: "Average consolidation", value: round(u * 100, 1), unit: "%" },
      ],
      notes: ["This is a no-smear, no-well-resistance estimate."],
      warnings: baseWarnings(),
    };
  },
  "stone-column-improvement": (values) => {
    const as = parseNumber(values.replacementRatio, "Replacement ratio");
    const n = ensurePositive(parseNumber(values.stressConcentration, "Stress concentration ratio"), "Stress concentration ratio");
    const untreated = Math.max(0, parseNumber(values.untreatedSettlement, "Untreated settlement"));
    const factor = 1 / (1 - as * (1 - 1 / n));
    const improved = untreated / factor;
    return {
      title: "Stone Column Improvement",
      items: [
        { label: "Improvement factor", value: round(factor, 3) },
        { label: "Improved settlement", value: round(improved, 1), unit: "mm" },
      ],
      notes: ["Area-replacement screening does not capture bulging, drainage, or installation effects."],
      warnings: baseWarnings(),
    };
  },
  "liquefaction-csr": (values) => {
    const amax = Math.max(0, parseNumber(values.amax, "Peak horizontal acceleration"));
    const sigmaV = ensurePositive(parseNumber(values.totalStress, "Total stress"), "Total stress");
    const sigmaVEff = ensurePositive(parseNumber(values.effectiveStress, "Effective stress"), "Effective stress");
    const rd = ensurePositive(parseNumber(values.rd, "Stress reduction factor"), "Stress reduction factor");
    const csr = 0.65 * amax * (sigmaV / sigmaVEff) * rd;
    return {
      title: "Cyclic Stress Ratio",
      items: [{ label: "CSR", value: round(csr, 3) }],
      notes: ["CSR is only the seismic demand side of a liquefaction triggering check."],
      warnings: [
        "Liquefaction screening only. Do not use as a final seismic design basis.",
        "Site-specific cyclic resistance evaluation and engineering judgement are required.",
      ],
    };
  },
  "seed-idriss-liquefaction-screening": (values) => {
    const method = values.method === "idriss-boulanger-2008" ? "idriss-boulanger-2008" : "tbdy-2018";
    const magnitude = ensurePositive(parseNumber(values.magnitude, "Earthquake magnitude"), "Earthquake magnitude");
    const peakGroundAcceleration = Math.max(0, parseNumber(values.peakGroundAcceleration, "Peak ground acceleration"));
    const groundwaterDepth = Math.max(0, parseNumber(values.groundwaterDepth, "Groundwater depth"));
    const unitWeight = ensurePositive(parseNumber(values.unitWeight, "Bulk unit weight"), "Bulk unit weight");
    const finesContent = Math.max(0, parseNumber(values.finesContent, "Fines content"));
    const sampleDepth = ensurePositive(parseNumber(values.sampleDepth, "Sample depth"), "Sample depth");
    const n160 = ensurePositive(parseNumber(values.n160, "(N1)60"), "(N1)60");
    const screening = computeLiquefactionScreening({
      method,
      magnitude,
      peakGroundAcceleration,
      groundwaterDepth,
      unitWeight,
      finesContent,
      sampleDepth,
      n160,
    });

    const isTbdy = screening.method === "tbdy-2018";
    const threshold = screening.minimumRequiredFos;

    return {
      title: "Liquefaction Potential",
      summary:
        screening.fos < threshold
          ? "Potential triggering concern in this simplified screening."
          : "No triggering concern in this simplified screening.",
      items: isTbdy
        ? [
            { label: "alpha", value: round(screening.alpha ?? 0, 3) },
            { label: "beta", value: round(screening.beta ?? 0, 3) },
            { label: "(N1)60_f", value: round(screening.n160f ?? 0, 2) },
            { label: "CRR_7.5", value: round(screening.crr75, 3) },
            { label: "C_M", value: round(screening.cm ?? 0, 3) },
            { label: "r_d", value: round(screening.rd, 3) },
            { label: "σ_v0", value: round(screening.sigmaV0, 2), unit: "kPa" },
            { label: "σ'_v0", value: round(screening.sigmaV0Effective, 2), unit: "kPa" },
            { label: "τ_R", value: round(screening.tauResistance ?? 0, 2), unit: "kPa" },
            { label: "τ_eq", value: round(screening.tauEarthquake ?? 0, 2), unit: "kPa" },
            { label: "Factor of safety", value: round(screening.fos, 3) },
            { label: "Minimum required FS", value: round(threshold, 2) },
          ]
        : [
            { label: "Fines correction increment", value: round(screening.deltaN ?? 0, 3) },
            { label: "(N1)60,cs", value: round(screening.n160cs ?? 0, 2) },
            { label: "CRR_7.5", value: round(screening.crr75, 3) },
            { label: "MSF", value: round(screening.msf ?? 0, 3) },
            { label: "r_d", value: round(screening.rd, 3) },
            { label: "σ_v0", value: round(screening.sigmaV0, 2), unit: "kPa" },
            { label: "σ'_v0", value: round(screening.sigmaV0Effective, 2), unit: "kPa" },
            { label: "CSR", value: round(screening.csr ?? 0, 3) },
            { label: "CRR_M", value: round(screening.crrMagnitudeCorrected ?? 0, 3) },
            { label: "Factor of safety", value: round(screening.fos, 3) },
            { label: "Minimum required FS", value: round(threshold, 2) },
          ],
      notes: [
        isTbdy
          ? (screening.n160f ?? 0) > 30
            ? "The fines-corrected SPT resistance exceeds the usual range of the simplified base curve; the CRR expression has been capped at (N1)60_f = 30 for screening."
            : "The fines-corrected SPT resistance remains within the usual range of the simplified base curve."
          : (screening.n160cs ?? 0) > 37.5
            ? "The clean-sand equivalent resistance exceeds the usual upper range of the Idriss and Boulanger base curve; (N1)60,cs has been capped at 37.5 for screening."
            : "The clean-sand equivalent resistance remains within the usual range of the Idriss and Boulanger base curve.",
        !isTbdy
          ? "Fines correction increment means ΔN_(1,60): the increment added to the corrected SPT resistance so that (N1)60 can be converted to clean-sand equivalent (N1)60,cs."
          : "Alpha and beta are used directly to convert (N1)60 to the fines-adjusted resistance used by the selected TBDY route.",
        isTbdy
          ? "For the TBDY route, the screening check is treated as satisfactory when FS is at least 1.10."
          : "For the Idriss and Boulanger route, the screening check is treated as satisfactory when FS is at least 1.00.",
      ],
      warnings: [
        ...(screening.fos < threshold ? ["Liquefaction Potential!"] : []),
        "Liquefaction screening only. Do not use as a final seismic design basis.",
        "Site-specific cyclic resistance evaluation and engineering judgement are required.",
      ],
    };
  },
  "post-liquefaction-settlement": (values) => {
    const correctedSptResistance = ensurePositive(
      parseNumber(values.correctedSptResistance, "Corrected SPT resistance"),
      "Corrected SPT resistance",
    );
    const factorOfSafety = ensurePositive(
      parseNumber(values.factorOfSafety, "Liquefaction triggering factor of safety"),
      "Liquefaction triggering factor of safety",
    );
    const layerThickness = ensurePositive(parseNumber(values.layerThickness, "Delta thickness"), "Delta thickness");
    const settlement = computePostLiquefactionSettlement({
      correctedSptResistance,
      factorOfSafety,
      layerThickness,
    });

    return {
      title: "Liquefiable Soil Settlement",
      summary:
        factorOfSafety >= 2
          ? "The selected factor of safety limits post-liquefaction shear strain to zero in this simplified screening estimate."
          : "Relative density is inferred from corrected SPT resistance, then maximum shear strain and volumetric strain are estimated in sequence.",
      items: [
        {
          label: "Relative density, D_r",
          value: round(settlement.relativeDensity, 3),
        },
        {
          label: "Limiting shear strain, gamma_lim",
          value: round(settlement.limitingShearStrain, 3),
          unit: "%",
        },
        {
          label: "Threshold parameter, F_alpha",
          value: round(settlement.thresholdParameter, 3),
        },
        {
          label: "Maximum shear strain, gamma_max",
          value: round(settlement.maxShearStrain, 3),
          unit: "%",
        },
        {
          label: "Volumetric strain, epsilon_v",
          value: round(settlement.volumetricStrain, 3),
          unit: "%",
        },
        { label: "Settlement", value: round(settlement.settlementM, 4), unit: "m" },
        { label: "Settlement", value: round(settlement.settlementM * 1000, 1), unit: "mm" },
      ],
      notes: [
        "The tool treats D_r as a simplified screening correlation from corrected SPT resistance.",
        "gamma_lim is calculated automatically from the Idriss and Boulanger style relative-density expression.",
      ],
      warnings: [
        "Post-liquefaction settlement screening only. Review the site-wide Disclaimer before engineering use.",
      ],
    };
  },
  "liquefaction-crr": (values) => {
    const n = parseNumber(values.n160cs, "Corrected clean-sand resistance");
    const crr = 1 / (34 - n) + n / 135 + 50 / (10 * n + 45) ** 2 - 1 / 200;
    return {
      title: "Simplified CRR7.5",
      items: [{ label: "CRR7.5", value: round(crr, 3) }],
      notes: ["The input should already reflect clean-sand equivalent corrected resistance."],
      warnings: [
        "Liquefaction screening only. Do not use as a final seismic design basis.",
        "Site-specific cyclic resistance evaluation and engineering judgement are required.",
      ],
    };
  },
  "liquefaction-factor-of-safety": (values) => {
    const csr = ensurePositive(parseNumber(values.csr, "CSR"), "CSR");
    const crr75 = ensurePositive(parseNumber(values.crr75, "CRR7.5"), "CRR7.5");
    const msf = ensurePositive(parseNumber(values.msf, "MSF"), "MSF");
    const ksigma = ensurePositive(parseNumber(values.ksigma, "K_sigma"), "K_sigma");
    const fos = (crr75 * msf * ksigma) / csr;
    return {
      title: "Liquefaction Triggering FoS",
      items: [{ label: "Factor of safety", value: round(fos, 3) }],
      notes: ["FoS < 1.0 indicates triggering concern in this simplified framework."],
      warnings: [
        "Liquefaction screening only. Do not use as a final seismic design basis.",
        "Site-specific cyclic resistance evaluation and engineering judgement are required.",
      ],
    };
  },
  "track-stiffness": (values) => {
    const load = ensurePositive(parseNumber(values.load, "Load"), "Load");
    const deflection = ensurePositive(parseNumber(values.deflection, "Deflection"), "Deflection");
    return {
      title: "Track Stiffness",
      items: [{ label: "Track stiffness", value: round(load / deflection, 3), unit: "kN/mm" }],
      notes: ["Track stiffness is a local load-deflection indicator and not a full dynamic model."],
      warnings: baseWarnings(),
    };
  },
  "subgrade-modulus": (values) => {
    const pressure = ensurePositive(parseNumber(values.pressure, "Pressure"), "Pressure");
    const deflectionMm = ensurePositive(parseNumber(values.deflection, "Deflection"), "Deflection");
    const deflectionM = deflectionMm / 1000;
    const ks = pressure / deflectionM;
    return {
      title: "Subgrade Modulus",
      items: [
        { label: "Subgrade reaction modulus", value: round(ks, 1), unit: "kN/m3" },
        { label: "Subgrade reaction modulus", value: round(ks / 1000, 3), unit: "MN/m3" },
      ],
      notes: ["The result depends strongly on loaded area size, stress level, and moisture condition."],
      warnings: baseWarnings(),
    };
  },
  "ballast-settlement": (values) => {
    const a = Math.max(0, parseNumber(values.coefficientA, "Coefficient a"));
    const b = Math.max(0, parseNumber(values.exponentB, "Exponent b"));
    const cycles = ensurePositive(parseNumber(values.cycles, "Load cycles"), "Load cycles");
    const settlement = a * cycles ** b;
    return {
      title: "Ballast Settlement",
      items: [{ label: "Estimated cumulative settlement", value: round(settlement, 2), unit: "mm" }],
      notes: ["The calibration coefficients dominate this result and should come from project or literature data."],
      warnings: baseWarnings(),
    };
  },
  "track-modulus": (values) => {
    const load = ensurePositive(parseNumber(values.load, "Load"), "Load");
    const deflectionM = ensurePositive(parseNumber(values.deflection, "Deflection"), "Deflection") / 1000;
    const spacing = ensurePositive(parseNumber(values.spacing, "Sleeper spacing"), "Sleeper spacing");
    const modulus = load / (deflectionM * spacing);
    return {
      title: "Distributed Track Modulus",
      items: [{ label: "Track modulus", value: round(modulus, 1), unit: "kPa" }],
      notes: ["This screening definition normalises local support stiffness by sleeper spacing."],
      warnings: baseWarnings(),
    };
  },
  "differential-settlement-indicator": (values) => {
    const settlementA = parseNumber(values.settlementA, "Settlement A");
    const settlementB = parseNumber(values.settlementB, "Settlement B");
    const gaugeLength = ensurePositive(parseNumber(values.gaugeLength, "Gauge length"), "Gauge length");
    const diffMm = Math.abs(settlementA - settlementB);
    const ratio = diffMm / (gaugeLength * 1000);
    return {
      title: "Differential Settlement Indicator",
      items: [
        { label: "Settlement difference", value: round(diffMm, 2), unit: "mm" },
        { label: "Differential ratio", value: round(ratio, 5) },
        { label: "Equivalent slope", value: formatOneIn(ratio) },
      ],
      notes: ["Use operator-specific maintenance thresholds and track geometry limits."],
      warnings: baseWarnings(),
    };
  },
  "spt-corrections": (values) => {
    const hammerType = values.hammerType ?? "safety";
    const nField = ensurePositive(parseNumber(values.nField, "Field N"), "Field N");
    const er = ensurePositive(parseNumber(values.energyRatio, "Energy ratio"), "Energy ratio");
    const cb = computeCbFromBoreholeDiameterSelection(values.boreholeDiameterFactor ?? "lt115");
    const cs = ensurePositive(parseNumber(values.samplerFactor, "Cs"), "Cs");
    const sampleDepth = ensureNonNegative(parseNumber(values.sampleDepth, "Sample depth"), "Sample depth");
    const groundwaterDepth = ensureNonNegative(parseNumber(values.groundwaterDepth, "Groundwater depth"), "Groundwater depth");
    const unitWeight = ensurePositive(parseNumber(values.unitWeight, "Bulk unit weight"), "Bulk unit weight");
    const cr = computeCrFromSampleDepth(sampleDepth);
    const sigmaEff = Math.max(unitWeight * sampleDepth - 9.81 * Math.max(sampleDepth - groundwaterDepth, 0), 0.1);
    const ce = er / 60;
    const isSptRefusal = nField === 50;
    let n60 = nField * ce * cb * cr * cs;
    const cnRaw = 9.78 * Math.sqrt(1 / sigmaEff);
    const cn = Math.max(0.4, Math.min(cnRaw, 1.7));
    let n160 = Math.min(n60 * cn, 2 * n60);
    if (isSptRefusal) {
      n60 = 50;
      n160 = 50;
    }
    const hammerRange =
      hammerType === "automatic" ? [90, 160] : hammerType === "donut" ? [45, 100] : [60, 117];
    const erRangeWarning =
      er < hammerRange[0] || er > hammerRange[1]
        ? [
            `ER is outside the typical ${hammerType === "automatic" ? "automatic trip hammer" : hammerType === "donut" ? "donut hammer" : "safety hammer"} range (${hammerRange[0]}-${hammerRange[1]}%).`,
          ]
        : [];

    return {
      title: "SPT Corrections",
      items: [
        { label: "C_E", value: round(ce, 3) },
        { label: "C_b", value: round(cb, 3) },
        { label: "C_r", value: round(cr, 3) },
        { label: "C_s", value: round(cs, 3) },
        { label: "Calculated vertical effective stress, sigma'_v0", value: round(sigmaEff, 2), unit: "kPa" },
        { label: "C_N", value: round(cn, 3) },
        { label: "N60", value: round(n60, 2) },
        { label: "(N1)60", value: round(n160, 2) },
      ],
      notes: [
        ...(isSptRefusal
          ? [
              "Field N = 50 is treated as refusal (Refü); N60 and (N1)60 are taken as 50 for screening (corrections not applied to these outputs).",
            ]
          : []),
        "Vertical effective stress is computed from sample depth, groundwater depth, and bulk unit weight.",
        "C_r is assigned automatically from sample depth ranges (<3: 0.75, 3-4: 0.80, 4-6: 0.85, 6-10: 0.95, 10-30: 1.00, >30 m: 0.95 screening default).",
        "C_N uses Idriss and Boulanger (2008): C_N = 9.78(1/sigma'_v0)^0.5 with bounds 0.40 to 1.70.",
        "Further fines correction may still be needed for liquefaction work.",
        "The tool enforces the practical screening cap (N1)60 <= 2N60.",
      ],
      warnings: [...erRangeWarning, ...baseWarnings()],
    };
  },
  "cpt-parameter-correlation": (values) => {
    const soilType = values.soilType || "clay";
    const qcMpa = ensurePositive(parseNumber(values.qc, "qc"), "qc");
    const sigmaV = Math.max(0, parseNumber(values.totalStress, "Total stress"));
    const nkt = ensurePositive(parseNumber(values.nkt, "Nkt"), "Nkt");
    const qcKpa = qcMpa * 1000;
    if (soilType === "clay") {
      const su = (qcKpa - sigmaV) / nkt;
      return {
        title: "CPT Clay Correlation",
        items: [{ label: "Estimated su", value: round(su, 2), unit: "kPa" }],
        notes: ["Nkt should be selected from local experience or project-specific calibration."],
        warnings: baseWarnings(),
      };
    }

    const phi = 17.6 + 11 * log10(qcKpa / PA);
    return {
      title: "CPT Sand Correlation",
      items: [{ label: "Estimated φ′", value: round(phi, 2), unit: "deg" }],
      notes: ["This is a broad correlation and should be checked against local sand behaviour."],
      warnings: baseWarnings(),
    };
  },
  "lwd-modulus": (values) => {
    const sigma = ensurePositive(parseNumber(values.peakStress, "Peak stress"), "Peak stress");
    const r = ensurePositive(parseNumber(values.plateRadius, "Plate radius"), "Plate radius");
    const s = ensurePositive(parseNumber(values.deflection, "Deflection"), "Deflection") / 1000;
    const evdKpa = (1.5 * r * sigma) / s;
    return {
      title: "LWD Modulus",
      items: [{ label: "Evd", value: round(evdKpa / 1000, 3), unit: "MPa" }],
      notes: ["Different devices and standards may use slightly different scaling factors."],
      warnings: baseWarnings(),
    };
  },
  "plate-load-test-modulus": (values) => {
    const deltaQ = ensurePositive(parseNumber(values.deltaPressure, "Delta q"), "Delta q");
    const deltaS = ensurePositive(parseNumber(values.deltaSettlement, "Delta s"), "Delta s") / 1000;
    const diameter = ensurePositive(parseNumber(values.plateDiameter, "Plate diameter"), "Plate diameter");
    const nu = parseNumber(values.poissonRatio, "Poisson ratio");
    if (nu < 0 || nu >= 0.5) {
      throw new Error("Poisson ratio should be between 0 and 0.5.");
    }
    const a = diameter / 2;
    const k = deltaQ / deltaS;
    const e = (Math.PI * a * (1 - nu ** 2) * k) / 2;
    return {
      title: "Plate Load Test Modulus",
      items: [
        { label: "Subgrade reaction modulus", value: round(k, 1), unit: "kN/m3" },
        { label: "Elastic modulus estimate", value: round(e / 1000, 3), unit: "MPa" },
      ],
      notes: ["Interpret the result with care because plate size and stress range matter strongly."],
      warnings: baseWarnings(),
    };
  },
  "cu-vs-depth": (values) => {
    const cu0 = Math.max(0, parseNumber(values.cuSurface, "Surface undrained strength"));
    const gradient = Math.max(0, parseNumber(values.gradient, "Gradient"));
    const depth = Math.max(0, parseNumber(values.depth, "Depth"));
    const cu = cu0 + gradient * depth;
    return {
      title: "Undrained Strength Profile",
      items: [{ label: "Estimated cu at depth", value: round(cu, 2), unit: "kPa" }],
      notes: ["A linear profile is only a first-pass representation of strength gain with depth."],
      warnings: baseWarnings(),
    };
  },
  "cu-from-pi-and-spt": (values) => {
    const pi = Math.max(0, parseNumber(values.plasticityIndex, "Plasticity Index"));
    const n60 = ensurePositive(parseNumber(values.n60, "Corrected SPT resistance"), "Corrected SPT resistance");
    const interpretation = interpolateStroudF1(pi);
    const cu = interpretation.f1 * n60;

    return {
      title: "Undrained Shear Strength from SPT",
      summary: `Stroud (1974) PI-to-f1 interpretation (${interpretation.band}) combined with corrected N60.`,
      items: [
        { label: "Selected PI segment", value: interpretation.band },
        { label: "Interpolated f1", value: round(interpretation.f1, 2) },
        { label: "Input N60", value: round(n60, 2) },
        { label: "Estimated cu", value: round(cu, 2), unit: "kPa" },
      ],
      notes: [
        interpretation.anchorText,
        "f1 is interpreted from PI using the Stroud chart anchors and linear interpolation.",
        "cu is then calculated directly as f1 x N60.",
      ],
      warnings: baseWarnings(),
    };
  },
  "cu-from-pressuremeter": (values) => {
    const pln = ensurePositive(
      parseNumber(values.pln, "Pressuremeter net limit pressure"),
      "Pressuremeter net limit pressure",
    );
    const cu = 0.67 * pln ** 0.75;

    return {
      title: "Undrained Shear Strength from Pressuremeter",
      summary: "Baguelin (1978) empirical pressuremeter interpretation.",
      items: [
        { label: "Input P_LN", value: round(pln, 2), unit: "kPa" },
        { label: "Estimated c_u", value: round(cu, 2), unit: "kPa" },
      ],
      notes: ["Computed with c_u = 0.67(P_LN)^0.75."],
      warnings: baseWarnings(),
    };
  },
  "cprime-from-cu": (values) => {
    const cu = ensurePositive(
      parseNumber(values.cu, "Undrained shear strength"),
      "Undrained shear strength",
    );
    const cprime = 0.1 * cu;

    return {
      title: "Effective Cohesion from c_u",
      summary: "Simplified c′ = 0.1c_u correlation for cohesive soils.",
      items: [
        { label: "Input c_u", value: round(cu, 2), unit: "kPa" },
        { label: "c′ = 0.1c_u", value: round(cprime, 2), unit: "kPa" },
      ],
      notes: [],
      warnings: baseWarnings(),
    };
  },
  "friction-angle-from-spt": (values) => {
    const n60 = ensurePositive(parseNumber(values.n60, "N60"), "N60");
    const phi = 27.1 + 0.3 * n60 - 0.00054 * n60 ** 2;
    return {
      title: "Estimated Friction Angle",
      items: [{ label: "φ′", value: round(phi, 2), unit: "deg" }],
      notes: ["Use this only as an initial estimate for granular soils."],
      warnings: baseWarnings(),
    };
  },
  "friction-angle-from-pi": (values) => {
    const pi = ensurePositive(parseNumber(values.plasticityIndex, "Plasticity Index"), "Plasticity Index");
    const phi = 45 - 14 * log10(pi);

    return {
      title: "Effective Friction Angle from PI",
      summary: "PI-based cohesive-soil screening relation.",
      items: [
        { label: "Input PI", value: round(pi, 2), unit: "%" },
        { label: "Estimated φ′", value: round(phi, 2), unit: "deg" },
      ],
      notes: ["Computed with φ′ = 45 − 14 log₁₀(PI)."],
      warnings: baseWarnings(),
    };
  },
  "modulus-from-cu": (values) => {
    const cu = ensurePositive(parseNumber(values.cu, "cu"), "cu");
    const ratio = ensurePositive(parseNumber(values.ratio, "E/cu ratio"), "E/cu ratio");
    return {
      title: "Elastic Modulus from cu",
      items: [{ label: "Estimated elastic modulus", value: round(cu * ratio, 1), unit: "kPa" }],
      notes: ["The chosen modulus ratio should reflect soil type and strain level."],
      warnings: baseWarnings(),
    };
  },
  "eu-from-spt-butler-1975": (values) => {
    const n60 = ensurePositive(parseNumber(values.n60, "N60"), "N60");
    const ratio = ensurePositive(parseNumber(values.euN60Ratio, "Eu/N60 ratio"), "Eu/N60 ratio");

    if (ratio < 1000 || ratio > 1200) {
      throw new Error("Eu/N60 ratio must stay within 1000 to 1200 for the Butler (1975) range.");
    }

    const eu = ratio * n60;
    const euLower = 1000 * n60;
    const euUpper = 1200 * n60;

    return {
      title: "Undrained Deformation Modulus from SPT",
      summary: "Computed with Butler (1975): Eu/N60 = 1000-1200 kN/m2 for cohesive-soil screening.",
      items: [
        { label: "Input N60", value: round(n60, 2) },
        { label: "Selected Eu/N60", value: round(ratio, 2), unit: "kPa" },
        { label: "Estimated Eu", value: round(eu, 2), unit: "kPa" },
        { label: "Butler lower Eu", value: round(euLower, 2), unit: "kPa" },
        { label: "Butler upper Eu", value: round(euUpper, 2), unit: "kPa" },
      ],
      notes: [
        "This tool keeps Eu/N60 within 1000 to 1200 as reported in Butler (1975) for preliminary cohesive-soil interpretation.",
      ],
      warnings: baseWarnings(),
    };
  },
  "effective-modulus-eprime-cohesive": (values) => {
    const cu = ensurePositive(parseNumber(values.cu, "Undrained shear strength"), "Undrained shear strength");
    const pi = ensurePositive(parseNumber(values.plasticityIndex, "Plasticity Index"), "Plasticity Index");
    const ocr = ensurePositive(parseNumber(values.ocr, "OCR"), "OCR");
    const betaPrime = betaPrimeFromCohesiveSoilType(values.soilType ?? "stiff-clay");
    const euCuRatio = estimateEuCuRatioFromPiOcr(pi, ocr);
    const eu = euCuRatio * cu;
    const ePrime = betaPrime * eu;

    return {
      title: "Effective Modulus for Cohesive Soils",
      summary: "Computed using E' = beta'Eu with PI-OCR based Eu/cu screening relation.",
      items: [
        { label: "Input c_u", value: round(cu, 2), unit: "kPa" },
        { label: "Input PI", value: round(pi, 2), unit: "%" },
        { label: "Input OCR", value: round(ocr, 2) },
        { label: "Selected beta'", value: round(betaPrime, 2) },
        { label: "Estimated E_u/c_u", value: round(euCuRatio, 1) },
        { label: "Estimated E_u", value: round(eu, 2), unit: "kPa" },
        { label: "Estimated E'", value: round(ePrime, 2), unit: "kPa" },
      ],
      notes: [
        "Eu/cu is interpreted from PI and OCR bands as a screening-level correlation.",
        "OCR is internally bounded to 1-10 to stay within the chart range used in this tool.",
      ],
      warnings: baseWarnings(),
    };
  },
  "eprime-from-spt-cohesionless": (values) => {
    const correlation = values.correlation ?? "km-clean-1000n60";
    const nValue = ensurePositive(parseNumber(values.nValue, "Corrected SPT resistance"), "Corrected SPT resistance");

    if ((correlation === "bw-nc-15000-ln-n55" || correlation === "bw-nc-22000-ln-n55") && nValue <= 1) {
      throw new Error("For logarithmic Bowles options, N55 should be greater than 1.");
    }

    const ePrime = estimateEprimeFromCohesionlessSpt(correlation, nValue);

    return {
      title: "Effective Modulus for Cohesionless Soils",
      summary: "Computed from the selected Kulhawy-Mayne or Bowles SPT-based correlation.",
      items: [
        { label: "Selected correlation", value: cohesionlessCorrelationLabel(correlation) },
        { label: "Input N value", value: round(nValue, 2) },
        { label: "Estimated E'", value: round(ePrime, 2), unit: "kPa" },
      ],
      notes: [
        "N is interpreted as N60 for Kulhawy-Mayne options and N55 for Bowles options.",
      ],
      warnings: baseWarnings(),
    };
  },
  "resilient-modulus-from-cbr": (values) => {
    const cbr = ensurePositive(parseNumber(values.cbr, "CBR"), "CBR");
    return {
      title: "Resilient Modulus from CBR",
      items: [{ label: "Mr", value: round(10.34 * cbr, 2), unit: "MPa" }],
      notes: ["This simple pavement-style correlation should be locally calibrated where possible."],
      warnings: baseWarnings(),
    };
  },
};

export function calculateBySlug(slug: string, values: FormValues): CalculationResult {
  const calculator = calculators[slug];

  if (!calculator) {
    throw new Error("No calculator configured for this tool yet.");
  }

  return calculator(values);
}

