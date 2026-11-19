/** Deterministic descriptive statistics shared by the report engine and the AI prompt builder. */

export interface DescriptiveStats {
  n: number;
  mean: number;
  sd: number;
  cov: number;
  min: number;
  max: number;
}

export function describe(values: number[]): DescriptiveStats {
  const n = values.length;
  if (!n) return { n: 0, mean: Number.NaN, sd: Number.NaN, cov: Number.NaN, min: Number.NaN, max: Number.NaN };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, mean, sd, cov: mean !== 0 ? sd / Math.abs(mean) : 0, min: Math.min(...values), max: Math.max(...values) };
}

/** Least-squares slope of y on x and coefficient of determination; null when fewer than 3 points or no spread. */
export function linearTrend(points: Array<{ x: number; y: number }>): { slope: number; r2: number } | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const syy = points.reduce((s, p) => s + (p.y - my) ** 2, 0);
  const sxy = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  if (sxx === 0 || syy === 0) return null;
  return { slope: sxy / sxx, r2: (sxy * sxy) / (sxx * syy) };
}

export function formatNumber(value: number, maxDecimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const decimals = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 10 ? 2 : maxDecimals;
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: decimals }).format(value);
}

export interface SeriesSummary {
  overall: DescriptiveStats;
  trend: { slope: number; r2: number } | null;
  byBorehole: Array<{ boreholeId: string; stats: DescriptiveStats }>;
  outliers: Array<{ boreholeId: string; depth: number; value: number }>;
}

export function summariseSeries(points: Array<{ boreholeId: string; depth: number; value: number }>): SeriesSummary {
  const overall = describe(points.map((p) => p.value));
  const trend = linearTrend(points.map((p) => ({ x: p.depth, y: p.value })));
  const groups = new Map<string, number[]>();
  points.forEach((p) => groups.set(p.boreholeId, [...(groups.get(p.boreholeId) ?? []), p.value]));
  const byBorehole = Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([boreholeId, vals]) => ({ boreholeId, stats: describe(vals) }));
  const outliers =
    overall.n >= 5 && overall.sd > 0 ? points.filter((p) => Math.abs(p.value - overall.mean) / overall.sd > 2) : [];
  return { overall, trend, byBorehole, outliers };
}
