/**
 * CPT / CPTu single-point interpretation — Robertson (2009, 2010), Robertson & Cabal (2015 Guide to CPT),
 * Kulhawy & Mayne (1990), Mayne (2007).
 *
 *   q_t = q_c + u_2 (1 − a)
 *   γ/γ_w = 0.27 log R_f + 0.36 log(q_t/p_a) + 1.236            (Robertson & Cabal 2010)
 *   Q_tn = [(q_t − σ_v)/p_a] (p_a/σ′_v)^n ;  F_r = f_s/(q_t − σ_v) × 100
 *   n = 0.381 I_c + 0.05 (σ′_v/p_a) − 0.15 ≤ 1.0              (iterative)
 *   I_c = √[(3.47 − log Q_tn)² + (log F_r + 1.22)²]
 *   s_u = (q_t − σ_v)/N_kt
 *   σ′_p = 0.33 (q_t − σ_v)  (Kulhawy & Mayne 1990, clays)
 *   φ′ = 17.6 + 11 log Q_tn  (Kulhawy & Mayne 1990, clean sands)
 *   V_s = [α_vs (q_t − σ_v)/p_a]^0.5, α_vs = 10^(0.55 I_c + 1.68)   (Robertson 2009)
 *   M = α_M (q_t − σ_v): α_M = Q_t (I_c > 2.2, Q_t < 14) or 14; 0.0188·10^(0.55 I_c + 1.68) for I_c ≤ 2.2
 *   (q_t/p_a)/N_60 = 10^(1.1268 − 0.2817 I_c)                    (Robertson 2012)
 */
import { GAMMA_W, PA, readNumber, round, screeningWarnings, type DesignCalculator } from "@/lib/design-tools/common";

export const SBTN_ZONES = [
  { max: 1.31, zone: 7, label: "Gravelly sand to dense sand" },
  { max: 2.05, zone: 6, label: "Sands — clean sand to silty sand" },
  { max: 2.6, zone: 5, label: "Sand mixtures — silty sand to sandy silt" },
  { max: 2.95, zone: 4, label: "Silt mixtures — clayey silt to silty clay" },
  { max: 3.6, zone: 3, label: "Clays — silty clay to clay" },
  { max: Number.POSITIVE_INFINITY, zone: 2, label: "Organic soils — clay" },
];

export function computeCpt(input: {
  qc: number; // MPa
  fs: number; // kPa
  u2: number; // kPa
  areaRatio: number;
  depth: number;
  groundwaterDepth: number;
  unitWeight: number; // 0 = estimate
  nkt: number;
}) {
  const qt = input.qc * 1000 + input.u2 * (1 - input.areaRatio); // kPa
  const rf = (input.fs / qt) * 100;
  const gammaEst = GAMMA_W * (0.27 * Math.log10(Math.max(rf, 0.1)) + 0.36 * Math.log10(qt / PA) + 1.236);
  const gamma = input.unitWeight > 0 ? input.unitWeight : Math.min(Math.max(gammaEst, 14), 22);
  const sigmaV = gamma * input.depth;
  const u0 = GAMMA_W * Math.max(input.depth - input.groundwaterDepth, 0);
  const sigmaVe = Math.max(sigmaV - u0, 1);
  const net = Math.max(qt - sigmaV, 1);
  const fr = (input.fs / net) * 100;
  const bq = (input.u2 - u0) / net;
  const qt1 = net / sigmaVe;

  let n = 1;
  let ic = 0;
  let qtn = 0;
  for (let k = 0; k < 50; k += 1) {
    qtn = (net / PA) * (PA / sigmaVe) ** n;
    ic = Math.sqrt((3.47 - Math.log10(qtn)) ** 2 + (Math.log10(Math.max(fr, 0.01)) + 1.22) ** 2);
    const nNext = Math.min(0.381 * ic + 0.05 * (sigmaVe / PA) - 0.15, 1);
    if (Math.abs(nNext - n) < 1e-4) {
      n = nNext;
      break;
    }
    n = nNext;
  }
  const zone = SBTN_ZONES.find((z) => ic < z.max) ?? SBTN_ZONES[SBTN_ZONES.length - 1];
  const sandLike = ic <= 2.6;
  const alphaVs = 10 ** (0.55 * ic + 1.68);
  const vs = Math.sqrt((alphaVs * net) / PA);
  const alphaM = ic > 2.2 ? (qt1 < 14 ? qt1 : 14) : 0.0188 * 10 ** (0.55 * ic + 1.68);
  const constrainedModulus = alphaM * net;
  const n60 = qt / PA / 10 ** (1.1268 - 0.2817 * ic);
  return {
    qt,
    rf,
    gamma,
    gammaEstimated: input.unitWeight <= 0,
    sigmaV,
    sigmaVe,
    u0,
    fr,
    bq,
    qt1,
    n,
    qtn,
    ic,
    zone,
    sandLike,
    su: sandLike ? Number.NaN : net / input.nkt,
    sigmaP: sandLike ? Number.NaN : 0.33 * net,
    ocr: sandLike ? Number.NaN : (0.33 * net) / sigmaVe,
    phi: sandLike ? 17.6 + 11 * Math.log10(qtn) : Number.NaN,
    dr: sandLike ? Math.min(Math.sqrt(qtn / 350), 1) : Number.NaN,
    vs,
    constrainedModulus,
    n60,
  };
}

export const cptInterpretationCalculator: DesignCalculator = (values) => {
  const r = computeCpt({
    qc: readNumber(values, "qc", "Cone resistance q_c", { min: 0.05, max: 100 }),
    fs: readNumber(values, "fs", "Sleeve friction f_s", { min: 0 }),
    u2: readNumber(values, "u2", "Pore pressure u_2", { fallback: 0 }),
    areaRatio: readNumber(values, "areaRatio", "Net area ratio a", { min: 0.5, max: 1, fallback: 0.8 }),
    depth: readNumber(values, "depth", "Depth", { min: 0.1 }),
    groundwaterDepth: readNumber(values, "groundwaterDepth", "Groundwater depth", { min: 0 }),
    unitWeight: readNumber(values, "unitWeight", "Unit weight (0 = estimate)", { min: 0, fallback: 0 }),
    nkt: readNumber(values, "nkt", "Cone factor N_kt", { min: 8, max: 30, fallback: 14 }),
  });
  const items = [
    { label: "Corrected cone resistance, q_t", value: round(r.qt / 1000, 3), unit: "MPa" },
    { label: r.gammaEstimated ? "Unit weight (Robertson & Cabal 2010 estimate)" : "Unit weight (input)", value: round(r.gamma, 2), unit: "kN/m3" },
    { label: "σ_v0 / σ′_v0", value: `${round(r.sigmaV, 1)} / ${round(r.sigmaVe, 1)}`, unit: "kPa" },
    { label: "Normalised friction ratio, F_r", value: round(r.fr, 3), unit: "%" },
    { label: "Pore pressure ratio, B_q", value: round(r.bq, 3) },
    { label: "Stress exponent, n", value: round(r.n, 3) },
    { label: "Normalised cone resistance, Q_tn", value: round(r.qtn, 2) },
    { label: "Soil behaviour type index, I_c", value: round(r.ic, 3) },
    { label: "SBTn zone (Robertson 2009)", value: `${r.zone.zone} — ${r.zone.label}` },
    ...(r.sandLike
      ? [
          { label: "Peak friction angle, φ′ (Kulhawy & Mayne)", value: round(r.phi, 1), unit: "deg" },
          { label: "Relative density, D_r ≈ √(Q_tn/350)", value: round(r.dr * 100, 0), unit: "%" },
        ]
      : [
          { label: "Undrained shear strength, s_u", value: round(r.su, 1), unit: "kPa" },
          { label: "Preconsolidation stress, σ′_p", value: round(r.sigmaP, 1), unit: "kPa" },
          { label: "OCR", value: round(r.ocr, 2) },
        ]),
    { label: "Shear wave velocity, V_s (Robertson 2009)", value: round(r.vs, 0), unit: "m/s" },
    { label: "Constrained modulus, M", value: round(r.constrainedModulus / 1000, 2), unit: "MPa" },
    { label: "Equivalent N_60 (Robertson 2012)", value: round(r.n60, 1) },
  ];
  return {
    title: "CPT / CPTu Interpretation (Robertson SBTn)",
    summary: `I_c = ${round(r.ic, 2)} → zone ${r.zone.zone} (${r.zone.label}); ${r.sandLike ? "drained (sand-like)" : "undrained (clay-like)"} interpretation.`,
    items,
    notes: [
      "I_c ≤ 2.6 is treated as sand-like (drained) and I_c > 2.6 as clay-like (undrained) for parameter selection.",
      "N_kt typically 10–18; calibrate against site-specific vane or triaxial data.",
    ],
    warnings: screeningWarnings(r.ic > 2.4 && r.ic < 2.8 ? ["I_c is near the 2.6 boundary — check both drained and undrained parameter sets."] : []),
  };
};
