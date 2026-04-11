import type { BoreholeRecord } from "@/lib/project-boreholes";

/** Free tier: max projects per user account. */
export const MAX_PROJECTS_PER_USER = 3;

/** Free tier: max distinct borehole IDs per project (samples can exceed this; each ID is one borehole). */
export const MAX_BOREHOLES_PER_PROJECT = 6;

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

/** True if inserting a row with this label would add a new distinct borehole beyond the limit. */
export function wouldExceedBoreholeLimit(
  rows: Pick<BoreholeRecord, "borehole_id">[],
  proposedLabel: string,
): boolean {
  const keys = new Set(rows.map((row) => boreholeLabelKey(row.borehole_id)));
  const nextKey = boreholeLabelKey(proposedLabel);
  if (keys.has(nextKey)) {
    return false;
  }
  return keys.size >= MAX_BOREHOLES_PER_PROJECT;
}
