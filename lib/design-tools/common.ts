/**
 * Shared helpers for the design-tool engines in lib/design-tools.
 *
 * Every engine exposes two layers:
 *  1. a typed, pure `compute*` function (SI units: m, kN, kPa, kN/m3, degrees) that can be unit-tested
 *     and reused by future custom UIs (layer tables, plots);
 *  2. a `FormValues -> CalculationResult` adapter registered in ./registry.ts so the generic
 *     ToolCalculator can run the tool as soon as its definition in data/tools-drafts.ts is activated.
 */
import type { CalculationResult } from "@/lib/types";

export type FormValues = Record<string, string>;
export type DesignCalculator = (values: FormValues) => CalculationResult;

export const GAMMA_W = 9.81; // kN/m3
export const PA = 101.325; // kPa, atmospheric pressure

export function readNumber(
  values: FormValues,
  key: string,
  label: string,
  options: { min?: number; max?: number; fallback?: number; exclusiveMin?: boolean } = {},
): number {
  const raw = values[key];
  const parsed = raw === undefined || raw === "" ? options.fallback ?? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (options.min !== undefined) {
    if (options.exclusiveMin ? parsed <= options.min : parsed < options.min) {
      throw new Error(`${label} must be ${options.exclusiveMin ? "greater than" : "at least"} ${options.min}.`);
    }
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${label} must not exceed ${options.max}.`);
  }
  return parsed;
}

export function readChoice<T extends string>(values: FormValues, key: string, allowed: readonly T[], fallback: T): T {
  const raw = values[key];
  return (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;
}

export function round(value: number, digits = 3): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export const deg2rad = (deg: number): number => (deg * Math.PI) / 180;
export const rad2deg = (rad: number): number => (rad * 180) / Math.PI;

/** Unit-cell area per column for square or triangular patterns (centre-to-centre spacing s). */
export function tributaryArea(spacing: number, pattern: "square" | "triangular"): number {
  return pattern === "square" ? spacing ** 2 : (Math.sqrt(3) / 2) * spacing ** 2;
}

/** Equivalent unit-cell diameter d_e (Barron 1948): 1.128 s (square), 1.050 s (triangular). */
export function equivalentInfluenceDiameter(spacing: number, pattern: "square" | "triangular"): number {
  return Math.sqrt((4 * tributaryArea(spacing, pattern)) / Math.PI);
}

export function screeningWarnings(extra: string[] = []): string[] {
  return [
    ...extra,
    "Preliminary design output. Verify against the cited manual, project-specific data, and an independent check before use.",
  ];
}

/** Terzaghi one-dimensional average degree of consolidation U_v(T_v) (Sivakugan & Das closed form). */
export function terzaghiAverageDegree(tv: number): number {
  if (tv <= 0) {
    return 0;
  }
  // Series solution, accurate for all T_v.
  let sum = 0;
  for (let m = 0; m < 60; m += 1) {
    const M = (Math.PI / 2) * (2 * m + 1);
    sum += (2 / M ** 2) * Math.exp(-(M ** 2) * tv);
  }
  return Math.min(Math.max(1 - sum, 0), 1);
}
