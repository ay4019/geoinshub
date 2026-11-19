"use client";

import { buildDepthProfilePng } from "@/lib/charts/depth-profile-png";
import type { StandardReportPoint, StandardReportSeries } from "@/lib/reports/standard-report-types";

/**
 * Report figure for a standard-report series: depth-versus-value profile in the shared chart style
 * (lib/charts/depth-profile*). Returns a PNG data URL, or "" if there is nothing to plot.
 */
export function buildDepthProfileChartPng(options: {
  title: string;
  series: StandardReportSeries;
  points: StandardReportPoint[];
  depthUnit: string;
}): string {
  const { series } = options;
  const data = options.points.flatMap((p) => {
    const value = p.values[series.key];
    return typeof value === "number" && Number.isFinite(value) && Number.isFinite(p.depth)
      ? [{ boreholeId: p.boreholeId, depth: p.depth, value }]
      : [];
  });
  return buildDepthProfilePng({
    title: options.title,
    xLabel: series.unit ? `${series.label} (${series.unit})` : series.label,
    depthUnit: options.depthUnit,
    data,
    referenceLines: series.referenceLine ? [series.referenceLine] : undefined,
  });
}
