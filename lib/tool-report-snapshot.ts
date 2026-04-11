/** Stored in `tool_results.result_payload` for on-page tool reports (distinct from profile-analysis snapshots). */

export const TOOL_REPORT_SNAPSHOT_TYPE = "tool-report-snapshot-v1" as const;

export type ToolReportSnapshotPayload = {
  snapshotType: typeof TOOL_REPORT_SNAPSHOT_TYPE;
  savedAt: string;
  toolSlug: string;
  dataSignature: string;
  narrative: string;
  rows: Array<Record<string, string>>;
  aiText: string;
};

export function isToolReportSnapshotPayload(value: unknown): value is ToolReportSnapshotPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  return v.snapshotType === TOOL_REPORT_SNAPSHOT_TYPE && typeof v.dataSignature === "string";
}
