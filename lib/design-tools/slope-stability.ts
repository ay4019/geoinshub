/**
 * Slope stability engines.
 *
 * 1. Infinite slope (Skempton & DeLory 1957; Duncan, Wright & Brandon 2014) with seepage ratio m and
 *    pseudo-static k_h:
 *      FS = [c' + (γ z cos²β − k_h γ z sinβ cosβ − m γ_w z cos²β) tanφ'] / [γ z (sinβ cosβ + k_h cos²β)]
 *
 * 2. Simplified Bishop (1955) circular slip analysis of a simple slope (crest, face, toe) with up to two
 *    horizontal strata, a horizontal phreatic surface or r_u, crest surcharge, and pseudo-static k_h.
 *    The critical circle is located by a centre-grid × tangent-depth search.
 *      FS = Σ{[c' b + (W − u b) tanφ'] / m_α} / Σ[W sinα + k_h W (y_c − y_g)/R]
 *      m_α = cosα + sinα tanφ' / FS
 *    Geometry: crest at y = H for x ≤ 0, face from (0, H) down to (L, 0) with L = H / tanβ, toe at y = 0.
 */
import {
  GAMMA_W,
  deg2rad,
  readChoice,
  readNumber,
  round,
  screeningWarnings,
  type DesignCalculator,
} from "@/lib/design-tools/common";
import type { CalculationResult } from "@/lib/types";

export interface InfiniteSlopeInput {
  slopeAngle: number; // deg
  depth: number; // m, vertical depth of slip plane
  unitWeight: number; // kN/m3
  cohesion: number; // kPa
  phi: number; // deg
  seepageRatio: number; // m = h_w / z (0 dry ... 1 fully saturated, slope-parallel seepage)
  kh: number;
}

export function computeInfiniteSlope(input: InfiniteSlopeInput) {
  const beta = deg2rad(input.slopeAngle);
  const phi = deg2rad(input.phi);
  const { depth: z, unitWeight: g, cohesion: c, seepageRatio: m, kh } = input;
  const normal = g * z * Math.cos(beta) ** 2 - kh * g * z * Math.sin(beta) * Math.cos(beta);
  const pore = m * GAMMA_W * z * Math.cos(beta) ** 2;
  const shear = g * z * (Math.sin(beta) * Math.cos(beta) + kh * Math.cos(beta) ** 2);
  const resisting = c + Math.max(normal - pore, 0) * Math.tan(phi);
  return { normalEffective: normal - pore, porePressure: pore, shear, resisting, fs: resisting / Math.max(shear, 1e-9) };
}

export interface Stratum {
  unitWeight: number;
  cohesion: number;
  phi: number; // deg
}

export interface BishopInput {
  height: number; // H
  slopeAngle: number; // β (deg)
  upper: Stratum;
  lower: Stratum | null;
  interfaceElevation: number; // y of upper/lower boundary (ignored if lower is null)
  waterMode: "none" | "phreatic" | "ru";
  phreaticElevation: number; // y of horizontal phreatic surface
  ru: number;
  surcharge: number; // kPa on crest (x ≤ 0)
  kh: number;
  slices?: number;
}

export interface SlipCircle {
  xc: number;
  yc: number;
  radius: number;
  fs: number;
  xEntry: number;
  xExit: number;
  depthBelowToe: number;
}

function groundElevation(x: number, H: number, L: number): number {
  if (x <= 0) return H;
  if (x >= L) return 0;
  return H * (1 - x / L);
}

function stratumAt(input: BishopInput, y: number): Stratum {
  if (input.lower && y < input.interfaceElevation) return input.lower;
  return input.upper;
}

function columnWeight(input: BishopInput, yBase: number, yTop: number, width: number): number {
  if (yTop <= yBase) return 0;
  if (!input.lower) return input.upper.unitWeight * (yTop - yBase) * width;
  const yi = input.interfaceElevation;
  const lowerPart = Math.max(0, Math.min(yTop, yi) - yBase);
  const upperPart = Math.max(0, yTop - Math.max(yBase, yi));
  return (input.lower.unitWeight * lowerPart + input.upper.unitWeight * upperPart) * width;
}

/** Bishop simplified FS for one circle, or null when the circle does not cut a valid sliding mass. */
export function bishopFactorOfSafety(input: BishopInput, xc: number, yc: number, radius: number): SlipCircle | null {
  const H = input.height;
  const L = H / Math.tan(deg2rad(input.slopeAngle));
  const n = input.slices ?? 40;
  const arcY = (x: number) => yc - Math.sqrt(Math.max(radius ** 2 - (x - xc) ** 2, 0));

  // Locate the continuous x-range where ground lies above the arc.
  const samples = 240;
  const x0 = xc - radius;
  const step = (2 * radius) / samples;
  let bestStart = Number.NaN;
  let bestEnd = Number.NaN;
  let runStart = Number.NaN;
  for (let i = 0; i <= samples; i += 1) {
    const x = x0 + i * step;
    const inside = groundElevation(x, H, L) - arcY(x) > 1e-6 && Math.abs(x - xc) < radius;
    if (inside && Number.isNaN(runStart)) runStart = x;
    if ((!inside || i === samples) && !Number.isNaN(runStart)) {
      const runEnd = inside ? x : x - step;
      if (Number.isNaN(bestStart) || runEnd - runStart > bestEnd - bestStart) {
        bestStart = runStart;
        bestEnd = runEnd;
      }
      runStart = Number.NaN;
    }
  }
  if (Number.isNaN(bestStart) || bestEnd - bestStart < 0.05 * H) return null;

  // Refine entry/exit by bisection.
  const refine = (inX: number, outX: number) => {
    let a = inX;
    let b = outX;
    for (let k = 0; k < 30; k += 1) {
      const mid = (a + b) / 2;
      const inside = groundElevation(mid, H, L) - arcY(mid) > 0 && Math.abs(mid - xc) < radius;
      if (inside) a = mid;
      else b = mid;
    }
    return (a + b) / 2;
  };
  const xEntry = refine(bestStart, Math.max(bestStart - step, xc - radius));
  const xExit = refine(bestEnd, Math.min(bestEnd + step, xc + radius));

  const b = (xExit - xEntry) / n;
  type Slice = { W: number; ub: number; c: number; tanPhi: number; sinA: number; cosA: number; arm: number };
  const slices: Slice[] = [];
  let maxDepthBelowGround = 0;

  for (let i = 0; i < n; i += 1) {
    const xm = xEntry + (i + 0.5) * b;
    const yBase = arcY(xm);
    const yTop = groundElevation(xm, H, L);
    if (yTop <= yBase) continue;
    maxDepthBelowGround = Math.max(maxDepthBelowGround, yTop - yBase);
    let W = columnWeight(input, yBase, yTop, b);
    const surchargeLoad = xm <= 0 ? input.surcharge * b : 0;
    let u = 0;
    if (input.waterMode === "phreatic") {
      u = GAMMA_W * Math.max(0, Math.min(input.phreaticElevation, yTop) - yBase);
    } else if (input.waterMode === "ru") {
      u = input.ru * (W / b);
    }
    W += surchargeLoad;
    const soil = stratumAt(input, yBase);
    const sinA = (xc - xm) / radius;
    const cosA = Math.sqrt(Math.max(1 - sinA ** 2, 0));
    const ycg = (yBase + yTop) / 2;
    slices.push({ W, ub: u * b, c: soil.cohesion, tanPhi: Math.tan(deg2rad(soil.phi)), sinA, cosA, arm: yc - ycg });
  }
  if (slices.length < 5 || maxDepthBelowGround < 0.05 * H) return null;

  const driving = slices.reduce((s, sl) => s + sl.W * sl.sinA + input.kh * sl.W * (sl.arm / radius), 0);
  if (driving <= 1e-6) return null;

  let fs = 1.2;
  for (let iter = 0; iter < 100; iter += 1) {
    let resisting = 0;
    for (const sl of slices) {
      const mAlpha = sl.cosA + (sl.sinA * sl.tanPhi) / fs;
      if (mAlpha < 0.2) return null; // numerically unstable steep exit; reject circle (Whitman & Bailey 1967)
      resisting += (sl.c * b + Math.max(sl.W - sl.ub, 0) * sl.tanPhi) / mAlpha;
    }
    const next = resisting / driving;
    if (Math.abs(next - fs) < 1e-5) {
      fs = next;
      break;
    }
    fs = next;
  }

  return { xc, yc, radius, fs, xEntry, xExit, depthBelowToe: Math.max(0, -(yc - radius)) };
}

export function searchCriticalCircle(input: BishopInput, maxDepthBelowToe: number) {
  const H = input.height;
  const L = H / Math.tan(deg2rad(input.slopeAngle));
  let best: SlipCircle | null = null;
  let evaluated = 0;

  const xs = 24;
  const ys = 18;
  const rs = 14;
  for (let i = 0; i <= xs; i += 1) {
    const xc = -0.5 * H + ((L + 1.0 * H) * i) / xs;
    for (let j = 0; j <= ys; j += 1) {
      const yc = H * 1.05 + (2.5 * H * j) / ys;
      for (let k = 0; k <= rs; k += 1) {
        const yTangent = -maxDepthBelowToe + ((maxDepthBelowToe + 0.85 * H) * k) / rs;
        const radius = yc - yTangent;
        if (radius <= 0) continue;
        const circle = bishopFactorOfSafety(input, xc, yc, radius);
        evaluated += 1;
        if (circle && (!best || circle.fs < best.fs)) best = circle;
      }
    }
  }

  // Local refinement around the best centre.
  if (best) {
    let stepX = (L + H) / xs;
    let stepY = (2.5 * H) / ys;
    let stepR = (maxDepthBelowToe + 0.85 * H) / rs;
    for (let pass = 0; pass < 4; pass += 1) {
      const centre: SlipCircle = best;
      for (let a = -2; a <= 2; a += 1) {
        for (let c = -2; c <= 2; c += 1) {
          for (let d = -2; d <= 2; d += 1) {
            const xc = centre.xc + (a * stepX) / 2;
            const yc = centre.yc + (c * stepY) / 2;
            const radius = centre.radius + (d * stepR) / 2;
            if (yc <= H || radius <= 0 || yc - radius < -maxDepthBelowToe - 1e-9) continue;
            const circle = bishopFactorOfSafety(input, xc, yc, radius);
            evaluated += 1;
            if (circle && best && circle.fs < best.fs) best = circle;
          }
        }
      }
      stepX /= 2;
      stepY /= 2;
      stepR /= 2;
    }
  }

  return { best, evaluated };
}

export const slopeStabilityCalculator: DesignCalculator = (values): CalculationResult => {
  const mode = readChoice(values, "analysisMode", ["bishop", "infinite"] as const, "bishop");
  const kh = readNumber(values, "kh", "Horizontal seismic coefficient k_h", { min: 0, max: 0.5, fallback: 0 });
  const targetFs = readNumber(values, "targetFs", "Target FS", { min: 1, fallback: kh > 0 ? 1.1 : 1.5 });

  if (mode === "infinite") {
    const input: InfiniteSlopeInput = {
      slopeAngle: readNumber(values, "slopeAngle", "Slope angle β", { min: 1, max: 80 }),
      depth: readNumber(values, "slipDepth", "Slip depth z", { min: 0.1 }),
      unitWeight: readNumber(values, "gamma1", "Unit weight", { min: 10, max: 25 }),
      cohesion: readNumber(values, "c1", "c′", { min: 0 }),
      phi: readNumber(values, "phi1", "φ′", { min: 0, max: 50 }),
      seepageRatio: readNumber(values, "seepageRatio", "Seepage ratio m", { min: 0, max: 1, fallback: 0 }),
      kh,
    };
    const r = computeInfiniteSlope(input);
    return {
      title: "Infinite Slope Stability",
      summary: `FS = ${round(r.fs, 3)} (target ${targetFs}).`,
      items: [
        { label: "Normal effective stress on slip plane, σ′_n", value: round(r.normalEffective, 2), unit: "kPa" },
        { label: "Pore pressure on slip plane, u", value: round(r.porePressure, 2), unit: "kPa" },
        { label: "Driving shear stress, τ_d", value: round(r.shear, 2), unit: "kPa" },
        { label: "Available shear strength, τ_f", value: round(r.resisting, 2), unit: "kPa" },
        { label: "Factor of safety, FS", value: round(r.fs, 3) },
      ],
      notes: [
        "Slope-parallel seepage with the phreatic surface at height m·z above the slip plane.",
        "Pseudo-static k_h acts horizontally out of the slope.",
      ],
      warnings: screeningWarnings(r.fs < targetFs ? [`FS below target ${targetFs}.`] : []),
    };
  }

  const height = readNumber(values, "height", "Slope height H", { min: 1, max: 100 });
  const twoLayers = values.stratification === "two";
  const input: BishopInput = {
    height,
    slopeAngle: readNumber(values, "slopeAngle", "Slope angle β", { min: 5, max: 80 }),
    upper: {
      unitWeight: readNumber(values, "gamma1", "Upper stratum unit weight", { min: 10, max: 25 }),
      cohesion: readNumber(values, "c1", "Upper stratum c′", { min: 0 }),
      phi: readNumber(values, "phi1", "Upper stratum φ′", { min: 0, max: 50 }),
    },
    lower: twoLayers
      ? {
          unitWeight: readNumber(values, "gamma2", "Lower stratum unit weight", { min: 10, max: 25 }),
          cohesion: readNumber(values, "c2", "Lower stratum c′", { min: 0 }),
          phi: readNumber(values, "phi2", "Lower stratum φ′", { min: 0, max: 50 }),
        }
      : null,
    interfaceElevation: twoLayers ? readNumber(values, "interfaceElevation", "Interface elevation", { fallback: 0 }) : 0,
    waterMode: readChoice(values, "waterMode", ["none", "phreatic", "ru"] as const, "none"),
    phreaticElevation: readNumber(values, "phreaticElevation", "Phreatic surface elevation", { fallback: -1000 }),
    ru: readNumber(values, "ru", "Pore pressure ratio r_u", { min: 0, max: 0.8, fallback: 0 }),
    surcharge: readNumber(values, "surcharge", "Crest surcharge", { min: 0, fallback: 0 }),
    kh,
  };
  const maxDepth = readNumber(values, "maxDepthBelowToe", "Search depth below toe", { min: 0, fallback: height });
  const { best, evaluated } = searchCriticalCircle(input, maxDepth);
  if (!best) {
    throw new Error("No admissible slip circle was found. Check the geometry and the search depth.");
  }

  return {
    title: "Slope Stability — Simplified Bishop",
    summary: `Minimum FS = ${round(best.fs, 3)} from ${evaluated} trial circles (target ${targetFs}).`,
    items: [
      { label: "Minimum factor of safety, FS_min", value: round(best.fs, 3) },
      { label: "Critical centre x_c (toe of face at x = H/tanβ)", value: round(best.xc, 2), unit: "m" },
      { label: "Critical centre y_c (above toe level)", value: round(best.yc, 2), unit: "m" },
      { label: "Radius R", value: round(best.radius, 2), unit: "m" },
      { label: "Slip entry x (crest side)", value: round(best.xEntry, 2), unit: "m" },
      { label: "Slip exit x (toe side)", value: round(best.xExit, 2), unit: "m" },
      { label: "Depth of circle below toe", value: round(best.depthBelowToe, 2), unit: "m" },
    ],
    notes: [
      "Coordinates: crest edge at x = 0 (y = H), toe at x = H/tanβ (y = 0).",
      "Bishop's simplified method satisfies moment equilibrium of the circle and vertical force equilibrium of slices.",
      input.waterMode === "phreatic"
        ? "Pore pressure from a horizontal phreatic surface (hydrostatic, no seepage forces)."
        : input.waterMode === "ru"
          ? "Pore pressure from the r_u coefficient (u = r_u γ h)."
          : "Dry slope (no pore pressure).",
    ],
    warnings: screeningWarnings(best.fs < targetFs ? [`FS below target ${targetFs}.`] : []),
  };
};
