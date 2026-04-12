import type { BoreholeRecord } from "@/lib/project-boreholes";
import type { TierLimits } from "@/lib/subscription";

/** @deprecated Use getTierLimits() for tier-aware caps. */
export const MAX_PROJECTS_PER_USER = 3;

/** @deprecated Use getTierLimits(). */
export const MAX_BOREHOLES_PER_PROJECT = 5;

function sanitiseBoreholeLabel(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .replace(/[▼▾▿▲△]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "BH not set";
}

export function boreholeLabelKey(value: string | null | undefined): string {
  return sanitiseBoreholeLabel(value).toLowerCase();
}

export function countDistinctBoreholeLabels(rows: Pick<BoreholeRecord, "borehole_id">[]): number {
  return new Set(rows.map((row) => boreholeLabelKey(row.borehole_id))).size;
}

function countSamplesForBoreholeKey(rows: Pick<BoreholeRecord, "borehole_id">[], proposedLabel: string): number {
  const key = boreholeLabelKey(proposedLabel);
  return rows.filter((row) => boreholeLabelKey(row.borehole_id) === key).length;
}

/**
 * Validates adding a sample row with `proposedLabel` under tier limits.
 * - New borehole ID: checks distinct borehole count.
 * - Existing borehole ID: checks sample count for that ID.
 */
export function validateBoreholeSampleAdd(
  rows: Pick<BoreholeRecord, "borehole_id">[],
  proposedLabel: string,
  limits: TierLimits,
): { ok: true } | { ok: false; message: string } {
  const maxB = limits.maxBoreholesPerProject;
  const maxS = limits.maxSamplesPerBorehole;
  const keys = new Set(rows.map((row) => boreholeLabelKey(row.borehole_id)));
  const nextKey = boreholeLabelKey(proposedLabel);

  if (keys.has(nextKey)) {
    if (Number.isFinite(maxS) && countSamplesForBoreholeKey(rows, proposedLabel) >= maxS) {
      return {
        ok: false,
        message: `This borehole already has the maximum of ${maxS} samples for your subscription tier.`,
      };
    }
    return { ok: true };
  }

  if (Number.isFinite(maxB) && keys.size >= maxB) {
    return {
      ok: false,
      message: `Each project can have at most ${maxB} boreholes on your tier. Add samples under an existing borehole ID or ask the site admin for a higher tier.`,
    };
  }
  return { ok: true };
}

/** @deprecated Use validateBoreholeSampleAdd with tier limits. */
export function wouldExceedBoreholeLimit(
  rows: Pick<BoreholeRecord, "borehole_id">[],
  proposedLabel: string,
  maxBoreholesPerProject = MAX_BOREHOLES_PER_PROJECT,
): boolean {
  const keys = new Set(rows.map((row) => boreholeLabelKey(row.borehole_id)));
  const nextKey = boreholeLabelKey(proposedLabel);
  if (keys.has(nextKey)) {
    return false;
  }
  return keys.size >= maxBoreholesPerProject;
}
