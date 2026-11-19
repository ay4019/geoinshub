/**
 * Soil nail walls — FHWA GEC-7 "Soil Nail Walls Reference Manual" (Lazarte, Robinson, Gómez, Baxter,
 * Cadden & Berg 2015, FHWA-NHI-14-007), ASD checks.
 *
 *   Pullout per unit length      Q = π D_DH q_u
 *   Pullout resistance (nail k)  R_P = Q L_p,k  (L_p beyond the critical slip surface)
 *   Tensile resistance           R_T = f_y A_t
 *   Service nail force (GEC-7 simplified)   T_max-s = λ K_a γ H S_h S_v,  λ ≈ 0.6–1.0
 *   Global stability: single planar wedge through the toe, nails contributing
 *     T_k = min(R_P,k / FS_P, R_T / FS_T) / S_h  per metre of wall:
 *     FS_G = [c′L_f + (W cosθ − k_h W sinθ + ΣT sin(θ+i)) tanφ′ + ΣT cos(θ+i)] / (W sinθ + k_h W cosθ)
 *   Minimum FS (GEC-7 ASD): global 1.5 (static), pullout 2.0, tensile 1.8.
 */
import {
  deg2rad,
  rad2deg,
  readNumber,
  round,
  screeningWarnings,
  type DesignCalculator,
} from "@/lib/design-tools/common";

export interface SoilNailInput {
  height: number;
  faceBatter: number; // deg from vertical (leaning into the soil)
  backslope: number; // deg
  unitWeight: number;
  cohesion: number;
  phi: number;
  surcharge: number;
  nailLength: number;
  nailInclination: number; // deg below horizontal
  sh: number;
  sv: number;
  firstRowDepth: number;
  drillholeDiameter: number; // m
  bondStrength: number; // kPa (ultimate)
  barDiameter: number; // mm
  yieldStrength: number; // MPa
  lambda: number;
  kh: number;
  fsPullout: number;
  fsTensile: number;
}

/** Coulomb active coefficient (δ = 0) for a face inclined ω from vertical (leaning into the backfill) and backslope β. */
export function coulombKa(phiDeg: number, faceBatterDeg: number, backslopeDeg: number): number {
  const phi = deg2rad(phiDeg);
  const alpha = deg2rad(90 + faceBatterDeg);
  const beta = deg2rad(backslopeDeg);
  if (backslopeDeg >= phiDeg) throw new Error("Backslope must be flatter than φ′ for a Coulomb active state.");
  const root = Math.sqrt((Math.sin(phi) * Math.sin(phi - beta)) / (Math.sin(alpha) * Math.sin(alpha + beta)));
  return Math.sin(alpha + phi) ** 2 / (Math.sin(alpha) ** 2 * Math.sin(alpha) * (1 + root) ** 2);
}

export function computeSoilNailWall(input: SoilNailInput) {
  const { height: H } = input;
  const tanW = Math.tan(deg2rad(input.faceBatter));
  const tanB = Math.tan(deg2rad(input.backslope));
  const i = deg2rad(input.nailInclination);
  const xTop = -H * tanW;
  const at = (Math.PI * (input.barDiameter / 1000) ** 2) / 4; // m2
  const rt = input.yieldStrength * 1000 * at; // kN
  const q = Math.PI * input.drillholeDiameter * input.bondStrength; // kN/m

  const rows: Array<{ depth: number; xHead: number; yHead: number }> = [];
  for (let z = input.firstRowDepth; z < H - 0.25 * input.sv + 1e-9; z += input.sv) {
    const yHead = H - z;
    rows.push({ depth: z, xHead: -yHead * tanW, yHead });
  }
  if (!rows.length) throw new Error("No nail rows fit within the wall height — check first-row depth and S_v.");

  const evaluate = (thetaDeg: number) => {
    const th = deg2rad(thetaDeg);
    const tanT = Math.tan(th);
    const u = (H * (1 - tanW * tanB)) / (tanT - tanB); // horizontal distance of crest intersection from toe
    if (!(u > -xTop)) return null;
    const pts: Array<[number, number]> = [
      [0, 0],
      [xTop, H],
      [-u, u * tanT],
    ];
    const area = Math.abs(
      (pts[0][0] * (pts[1][1] - pts[2][1]) + pts[1][0] * (pts[2][1] - pts[0][1]) + pts[2][0] * (pts[0][1] - pts[1][1])) / 2,
    );
    const W = input.unitWeight * area + input.surcharge * (u + xTop);
    const lf = u / Math.cos(th);
    let tSum = 0;
    const nailForces = rows.map((row) => {
      const s = (row.yHead + row.xHead * tanT) / (Math.sin(i) + Math.cos(i) * tanT);
      const lp = Math.max(input.nailLength - Math.max(s, 0), 0);
      const rp = q * lp;
      const t = Math.min(rp / input.fsPullout, rt / input.fsTensile) / input.sh;
      tSum += t;
      return { ...row, lengthInsideWedge: Math.max(s, 0), lp, rp };
    });
    const tanPhi = Math.tan(deg2rad(input.phi));
    const resisting =
      input.cohesion * lf +
      (W * Math.cos(th) - input.kh * W * Math.sin(th) + tSum * Math.sin(th + i)) * tanPhi +
      tSum * Math.cos(th + i);
    const driving = W * Math.sin(th) + input.kh * W * Math.cos(th);
    return { theta: thetaDeg, fs: resisting / driving, W, lf, nailForces, tSum };
  };

  let critical: ReturnType<typeof evaluate> = null;
  for (let t = Math.max(input.backslope + 1, 15); t <= 85; t += 0.25) {
    const r = evaluate(t);
    if (r && (!critical || r.fs < critical.fs)) critical = r;
  }
  if (!critical) throw new Error("No admissible failure wedge found.");

  const ka = coulombKa(input.phi, input.faceBatter, input.backslope);
  const tMaxS = input.lambda * ka * input.unitWeight * H * input.sh * input.sv;
  const minPullout = Math.min(...critical.nailForces.map((n) => n.rp));
  return {
    ka,
    tMaxS,
    rt,
    pulloutPerMetre: q,
    critical,
    fsTensile: rt / tMaxS,
    fsPulloutMin: minPullout / tMaxS,
    rows: rows.length,
    lengthRatio: input.nailLength / H,
    wedgeAngle: rad2deg(deg2rad(critical.theta)),
  };
}

export const soilNailingCalculator: DesignCalculator = (values) => {
  const input: SoilNailInput = {
    height: readNumber(values, "height", "Wall height H", { min: 1, max: 30 }),
    faceBatter: readNumber(values, "faceBatter", "Face batter", { min: 0, max: 30, fallback: 0 }),
    backslope: readNumber(values, "backslope", "Backslope", { min: 0, max: 40, fallback: 0 }),
    unitWeight: readNumber(values, "unitWeight", "Unit weight", { min: 14, max: 23 }),
    cohesion: readNumber(values, "cohesion", "c′", { min: 0 }),
    phi: readNumber(values, "phi", "φ′", { min: 20, max: 45 }),
    surcharge: readNumber(values, "surcharge", "Surcharge", { min: 0, fallback: 0 }),
    nailLength: readNumber(values, "nailLength", "Nail length L", { min: 1 }),
    nailInclination: readNumber(values, "nailInclination", "Nail inclination", { min: 0, max: 30, fallback: 15 }),
    sh: readNumber(values, "sh", "Horizontal spacing S_h", { min: 0.5, max: 3 }),
    sv: readNumber(values, "sv", "Vertical spacing S_v", { min: 0.5, max: 3 }),
    firstRowDepth: readNumber(values, "firstRowDepth", "First row depth", { min: 0.2, fallback: 0.75 }),
    drillholeDiameter: readNumber(values, "drillholeDiameter", "Drillhole diameter", { min: 0.05, max: 0.3 }),
    bondStrength: readNumber(values, "bondStrength", "Ultimate bond strength q_u", { min: 10 }),
    barDiameter: readNumber(values, "barDiameter", "Bar diameter", { min: 16, max: 50 }),
    yieldStrength: readNumber(values, "yieldStrength", "Bar yield strength f_y", { min: 250, max: 1000, fallback: 420 }),
    lambda: readNumber(values, "lambda", "Normalised nail force λ", { min: 0.4, max: 1.2, fallback: 0.75 }),
    kh: readNumber(values, "kh", "k_h", { min: 0, max: 0.4, fallback: 0 }),
    fsPullout: readNumber(values, "fsPullout", "FS pullout", { min: 1, fallback: 2 }),
    fsTensile: readNumber(values, "fsTensile", "FS tensile", { min: 1, fallback: 1.8 }),
  };
  const r = computeSoilNailWall(input);
  const fsGlobalTarget = input.kh > 0 ? 1.1 : 1.5;
  const warnings: string[] = [];
  if (r.critical.fs < fsGlobalTarget) warnings.push(`Global wedge FS ${round(r.critical.fs, 2)} < ${fsGlobalTarget}.`);
  if (r.fsTensile < input.fsTensile) warnings.push(`Tensile FS ${round(r.fsTensile, 2)} < ${input.fsTensile}.`);
  if (r.fsPulloutMin < input.fsPullout) warnings.push(`Lowest-row pullout FS ${round(r.fsPulloutMin, 2)} < ${input.fsPullout}.`);
  if (r.lengthRatio < 0.6) warnings.push("L/H below about 0.6 is outside typical GEC-7 practice (0.7–1.0).");

  return {
    title: "Soil Nail Wall — Preliminary ASD Checks (FHWA GEC-7)",
    summary: `${r.rows} nail rows; global wedge FS = ${round(r.critical.fs, 2)} at θ = ${round(r.wedgeAngle, 1)}°; tensile FS = ${round(
      r.fsTensile,
      2,
    )}; minimum pullout FS = ${round(r.fsPulloutMin, 2)}.`,
    items: [
      { label: "Coulomb K_a (δ = 0)", value: round(r.ka, 3) },
      { label: "Service nail force, T_max-s = λK_aγHS_hS_v", value: round(r.tMaxS, 1), unit: "kN" },
      { label: "Tensile resistance, R_T", value: round(r.rt, 1), unit: "kN" },
      { label: "Pullout capacity per metre, Q = πD_DH q_u", value: round(r.pulloutPerMetre, 1), unit: "kN/m" },
      ...r.critical.nailForces.map((n, k) => ({
        label: `Row ${k + 1} (z = ${round(n.depth, 2)} m): L_p beyond critical plane`,
        value: round(n.lp, 2),
        unit: "m",
      })),
      { label: "Critical wedge angle θ", value: round(r.wedgeAngle, 1), unit: "deg" },
      { label: "Wedge weight (incl. surcharge)", value: round(r.critical.W, 1), unit: "kN/m" },
      { label: "Global wedge FS", value: round(r.critical.fs, 3) },
      { label: "Tensile FS = R_T / T_max-s", value: round(r.fsTensile, 2) },
      { label: "Minimum pullout FS = R_P / T_max-s", value: round(r.fsPulloutMin, 2) },
      { label: "L/H", value: round(r.lengthRatio, 2) },
    ],
    notes: [
      "Single planar wedge through the toe is a screening model; GEC-7 global stability should be confirmed with a limit-equilibrium program (e.g. circular/compound surfaces).",
      "Groundwater is not modelled; drained conditions are assumed.",
      "Facing (flexure, punching shear, headed studs) and corrosion protection checks are not included.",
    ],
    warnings: screeningWarnings(warnings),
  };
};
