export type LiquefactionMethod = "tbdy-2018" | "idriss-boulanger-2008";

export interface LiquefactionScreeningInputs {
  method: LiquefactionMethod;
  magnitude: number;
  peakGroundAcceleration: number;
  groundwaterDepth: number;
  unitWeight: number;
  finesContent: number;
  sampleDepth: number;
  n160: number;
}

export interface LiquefactionScreeningResult {
  method: LiquefactionMethod;
  sigmaV0: number;
  sigmaV0Effective: number;
  rd: number;
  crr75: number;
  fos: number;
  minimumRequiredFos: number;
  demandValue: number;
  resistanceValue: number;
  demandLabel: "tau_eq" | "CSR";
  resistanceLabel: "tau_R" | "CRR_M";
  alpha?: number;
  beta?: number;
  n160f?: number;
  n160fCapped?: number;
  cm?: number;
  tauResistance?: number;
  tauEarthquake?: number;
  deltaN?: number;
  n160cs?: number;
  n160csCapped?: number;
  msf?: number;
  csr?: number;
  crrMagnitudeCorrected?: number;
}

const GAMMA_W = 9.81;

export function getTbdyAlphaBeta(finesContent: number): { alpha: number; beta: number } {
  if (finesContent <= 5) {
    return { alpha: 0, beta: 1 };
  }

  if (finesContent <= 35) {
    return {
      alpha: Math.exp(1.76 - 190 / finesContent ** 2),
      beta: 0.99 + finesContent ** 1.5 / 1000,
    };
  }

  return { alpha: 5, beta: 1.2 };
}

export function getIdrissBoulangerDeltaN(finesContent: number): number {
  if (finesContent <= 5) {
    return 0;
  }

  const fc = Math.min(finesContent, 35);
  const deltaN = Math.exp(1.63 + 9.7 / (fc + 0.01) - (15.7 / (fc + 0.01)) ** 2);
  return Math.min(deltaN, 5.5);
}

export function getLiquefactionRd(sampleDepth: number): number {
  if (sampleDepth <= 9.15) {
    return 1 - 0.00765 * sampleDepth;
  }

  if (sampleDepth <= 23) {
    return 1.174 - 0.0267 * sampleDepth;
  }

  if (sampleDepth <= 30) {
    return 0.744 - 0.008 * sampleDepth;
  }

  return 0.5;
}

export function getTbdyMagnitudeFactor(magnitude: number): number {
  return 10 ** 2.24 / magnitude ** 2.56;
}

export function getIdrissBoulangerMsf(magnitude: number): number {
  return Math.min(1.8, 6.9 * Math.exp(-magnitude / 4) - 0.058);
}

function computeTotalAndEffectiveStress(sampleDepth: number, groundwaterDepth: number, unitWeight: number) {
  const sigmaV0 = unitWeight * sampleDepth;
  const porePressure = Math.max(0, sampleDepth - groundwaterDepth) * GAMMA_W;
  const sigmaV0Effective = Math.max(1, sigmaV0 - porePressure);

  return { sigmaV0, sigmaV0Effective };
}

function computeTbdyScreening(inputs: LiquefactionScreeningInputs): LiquefactionScreeningResult {
  const { magnitude, peakGroundAcceleration, groundwaterDepth, unitWeight, finesContent, sampleDepth, n160 } = inputs;
  const { alpha, beta } = getTbdyAlphaBeta(finesContent);
  const n160f = alpha + beta * n160;
  const n160fCapped = Math.min(n160f, 30);
  const crr75 =
    1 / (34 - n160fCapped) +
    n160fCapped / 135 +
    50 / (10 * n160fCapped + 45) ** 2 -
    1 / 200;
  const cm = getTbdyMagnitudeFactor(magnitude);
  const rd = getLiquefactionRd(sampleDepth);
  const { sigmaV0, sigmaV0Effective } = computeTotalAndEffectiveStress(sampleDepth, groundwaterDepth, unitWeight);
  const tauResistance = crr75 * cm * sigmaV0Effective;
  const tauEarthquake = 0.65 * sigmaV0 * peakGroundAcceleration * rd;
  const fos = tauResistance / Math.max(tauEarthquake, 1e-6);

  return {
    method: "tbdy-2018",
    alpha,
    beta,
    n160f,
    n160fCapped,
    rd,
    cm,
    sigmaV0,
    sigmaV0Effective,
    tauResistance,
    tauEarthquake,
    crr75,
    fos,
    minimumRequiredFos: 1.1,
    demandValue: tauEarthquake,
    resistanceValue: tauResistance,
    demandLabel: "tau_eq",
    resistanceLabel: "tau_R",
  };
}

function computeIdrissBoulangerScreening(inputs: LiquefactionScreeningInputs): LiquefactionScreeningResult {
  const { magnitude, peakGroundAcceleration, groundwaterDepth, unitWeight, finesContent, sampleDepth, n160 } = inputs;
  const deltaN = getIdrissBoulangerDeltaN(finesContent);
  const n160cs = n160 + deltaN;
  const n160csCapped = Math.min(n160cs, 37.5);
  const crr75 = Math.exp(
    n160csCapped / 14.1 +
      (n160csCapped / 126) ** 2 -
      (n160csCapped / 23.6) ** 3 +
      (n160csCapped / 25.4) ** 4 -
      2.8,
  );
  const msf = getIdrissBoulangerMsf(magnitude);
  const rd = getLiquefactionRd(sampleDepth);
  const { sigmaV0, sigmaV0Effective } = computeTotalAndEffectiveStress(sampleDepth, groundwaterDepth, unitWeight);
  const csr = 0.65 * peakGroundAcceleration * (sigmaV0 / Math.max(sigmaV0Effective, 1)) * rd;
  const crrMagnitudeCorrected = crr75 * msf;
  const fos = crrMagnitudeCorrected / Math.max(csr, 1e-6);

  return {
    method: "idriss-boulanger-2008",
    deltaN,
    n160cs,
    n160csCapped,
    rd,
    sigmaV0,
    sigmaV0Effective,
    crr75,
    msf,
    csr,
    crrMagnitudeCorrected,
    fos,
    minimumRequiredFos: 1,
    demandValue: csr,
    resistanceValue: crrMagnitudeCorrected,
    demandLabel: "CSR",
    resistanceLabel: "CRR_M",
  };
}

export function computeLiquefactionScreening(inputs: LiquefactionScreeningInputs): LiquefactionScreeningResult {
  return inputs.method === "idriss-boulanger-2008"
    ? computeIdrissBoulangerScreening(inputs)
    : computeTbdyScreening(inputs);
}
