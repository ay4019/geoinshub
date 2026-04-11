const STORAGE_KEY_PREFIX = "gih:m-ai:v1";

export interface MatrixAiReportCachePayload {
  text: string;
  truncated: boolean;
  /** Fingerprint of matrix rows when the report was saved. */
  fingerprint: string;
  savedAt: number;
}

export function matrixAiReportStorageKey(authUserId: string, projectId: string): string {
  return `${STORAGE_KEY_PREFIX}:${authUserId}:${projectId}`;
}

/** Stable fingerprint for cache invalidation warnings when the matrix changes. */
export function fingerprintIntegratedMatrixRows(
  rows: Array<{ boreholeLabel: string; sampleDepth: number | null; values: Record<string, string> }>,
): string {
  const compact = rows.map((r) => ({
    b: r.boreholeLabel,
    d: r.sampleDepth,
    v: r.values,
  }));
  const json = JSON.stringify(compact);
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
