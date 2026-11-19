import { formatNumber, summariseSeries } from "@/lib/reports/report-statistics";
import type {
  StandardReportContent,
  StandardReportContext,
  StandardReportPayload,
} from "@/lib/reports/standard-report-types";

/** Renderer-independent report model; rendered to HTML (preview) and to PDF from the same blocks. */
export type ReportBlock =
  | { kind: "heading"; level: 1 | 2; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "equation"; text: string; label: string; where?: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "keyValue"; title: string; rows: Array<{ label: string; value: string }> }
  | { kind: "table"; title: string; columns: Array<{ header: string; key: string }>; rows: Array<Record<string, string>> }
  | { kind: "figure"; caption: string; dataUrl: string }
  | { kind: "ai"; text: string }
  | { kind: "references"; items: string[] }
  | { kind: "responsibility" };

export interface ReportDocument {
  subject: string;
  toolTitle: string;
  projectName: string | null;
  boreholeIds: string[];
  unitSystem: string;
  blocks: ReportBlock[];
}

function seriesStatisticsParagraphs(payload: StandardReportPayload): string[] {
  const paragraphs: string[] = [];
  for (const series of payload.series) {
    const pts = payload.points
      .map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.values[series.key] }))
      .filter((p): p is { boreholeId: string; depth: number; value: number } => typeof p.value === "number" && Number.isFinite(p.value));
    if (!pts.length) continue;
    const s = summariseSeries(pts);
    const u = series.unit ? ` ${series.unit}` : "";
    const depths = pts.map((p) => p.depth);
    const parts = [
      `${series.label}: ${s.overall.n} value${s.overall.n === 1 ? "" : "s"} from ${s.byBorehole.length} borehole${
        s.byBorehole.length === 1 ? "" : "s"
      } between ${formatNumber(Math.min(...depths))} and ${formatNumber(Math.max(...depths))} ${payload.depthUnit} depth; range ${formatNumber(
        s.overall.min,
      )}–${formatNumber(s.overall.max)}${u}, mean ${formatNumber(s.overall.mean)}${u}`,
    ];
    if (s.overall.n > 1) {
      parts[0] += `, standard deviation ${formatNumber(s.overall.sd)}${u} (coefficient of variation ${formatNumber(s.overall.cov, 2)})`;
    }
    parts[0] += ".";
    if (s.trend) {
      parts.push(
        `A least-squares fit against depth gives a gradient of ${formatNumber(s.trend.slope)}${u} per ${payload.depthUnit} (r² = ${formatNumber(
          s.trend.r2,
          2,
        )}).`,
      );
    }
    if (s.byBorehole.length > 1) {
      parts.push(
        `Borehole means: ${s.byBorehole
          .map((b) => `${b.boreholeId} ${formatNumber(b.stats.mean)}${u} (n = ${b.stats.n})`)
          .join("; ")}.`,
      );
    }
    if (s.outliers.length) {
      parts.push(
        `Values more than two standard deviations from the mean: ${s.outliers
          .map((o) => `${formatNumber(o.value)}${u} at ${formatNumber(o.depth)} ${payload.depthUnit} (${o.boreholeId})`)
          .join(", ")}.`,
      );
    }
    if (s.overall.n < 5) {
      parts.push("Fewer than five values are available, so these statistics are indicative only and do not establish a reliable trend.");
    }
    paragraphs.push(parts.join(" "));
  }
  return paragraphs;
}

export function buildStandardReportDocument(options: {
  content: StandardReportContent;
  ctx: StandardReportContext;
  payload: StandardReportPayload;
  figures: Array<{ seriesKey: string; dataUrl: string }>;
  aiText?: string | null;
}): ReportDocument {
  const { content, ctx, payload } = options;
  const blocks: ReportBlock[] = [];
  let eq = 0;
  let fig = 0;

  // ── Part 1: General information ──
  blocks.push({ kind: "heading", level: 1, text: "1. General Information" });
  blocks.push({ kind: "heading", level: 2, text: "1.1 Scope and purpose" });
  content.introduction.forEach((text) => blocks.push({ kind: "paragraph", text }));
  blocks.push({ kind: "heading", level: 2, text: "1.2 Method and governing equations" });
  content.equations.forEach((e) => {
    eq += 1;
    blocks.push({ kind: "equation", text: e.text, label: `(${eq})`, where: e.where });
  });
  if (content.guidance?.length) {
    blocks.push({ kind: "heading", level: 2, text: "1.3 Interpretation guidance" });
    content.guidance.forEach((text) => blocks.push({ kind: "paragraph", text }));
  }
  const assumptions = [...ctx.assumptions, ...ctx.limitations].map((t) => t.replace(/<[^>]+>/g, ""));
  if (assumptions.length) {
    blocks.push({ kind: "heading", level: 2, text: content.guidance?.length ? "1.4 Assumptions and limitations" : "1.3 Assumptions and limitations" });
    blocks.push({ kind: "bullets", items: assumptions });
  }

  // ── Part 2: Project-specific assessment ──
  blocks.push({ kind: "heading", level: 1, text: "2. Project-Specific Assessment" });
  blocks.push({ kind: "heading", level: 2, text: "2.1 Input data and assumptions" });
  const projectText = ctx.projectName?.trim() ? `the ${ctx.projectName.trim()} project` : "the project";
  const bhText = ctx.boreholeIds.length ? `boreholes ${ctx.boreholeIds.join(", ")}` : "the samples listed in the results table";
  const isSingleCase = !payload.points.length && !payload.series.length;
  blocks.push({
    kind: "paragraph",
    text: isSingleCase
      ? "The method described in Part 1 has been applied to the single design case defined by the inputs below, as entered in the tool by the user. The input values have not been verified by Geotechnical Insights Hub; their source, quality, and representativeness are the responsibility of the user."
      : `The method described in Part 1 has been applied to ${bhText} of ${projectText}, using the values entered in the tool by the user. The input data have not been verified by Geotechnical Insights Hub; their source, quality, and representativeness are the responsibility of the user.`,
  });
  if (payload.inputs?.length) blocks.push({ kind: "keyValue", title: "Project-level inputs", rows: payload.inputs });
  payload.methodNotes?.forEach((text) => blocks.push({ kind: "paragraph", text }));
  if (payload.exclusions?.length) {
    blocks.push({ kind: "paragraph", text: "The following samples were not carried through the analysis:" });
    blocks.push({ kind: "bullets", items: payload.exclusions });
  }

  blocks.push({ kind: "heading", level: 2, text: "2.2 Results" });
  if (payload.keyResults?.length) blocks.push({ kind: "keyValue", title: "Key results", rows: payload.keyResults });
  if (payload.rows.length) {
    blocks.push({ kind: "table", title: content.tableTitle, columns: payload.columns, rows: payload.rows });
  }

  const figures = options.figures.filter((f) => f.dataUrl);
  if (figures.length) {
    blocks.push({ kind: "heading", level: 2, text: "2.3 Profile figures" });
    for (const f of figures) {
      const series = payload.series.find((s) => s.key === f.seriesKey);
      if (!series) continue;
      fig += 1;
      blocks.push({ kind: "figure", caption: `Figure ${fig}: ${content.figureCaption(series)}`, dataUrl: f.dataUrl });
    }
  }

  const stats = seriesStatisticsParagraphs(payload);
  if (stats.length) {
    blocks.push({ kind: "heading", level: 2, text: figures.length ? "2.4 Statistical summary" : "2.3 Statistical summary" });
    blocks.push({
      kind: "paragraph",
      text: "The following descriptive statistics are calculated directly from the tabulated results. They describe the data set; they are not characteristic or design values.",
    });
    stats.forEach((text) => blocks.push({ kind: "paragraph", text }));
  }

  if (options.aiText?.trim()) {
    blocks.push({ kind: "heading", level: 2, text: "AI-assisted interpretation" });
    blocks.push({ kind: "ai", text: options.aiText.trim() });
  }

  // ── Part 3 and references ──
  blocks.push({ kind: "heading", level: 1, text: "3. Limitations and Responsibility" });
  blocks.push({ kind: "responsibility" });
  blocks.push({ kind: "heading", level: 1, text: "References" });
  blocks.push({ kind: "references", items: content.references });

  return {
    subject: content.subject,
    toolTitle: ctx.toolTitle,
    projectName: ctx.projectName,
    boreholeIds: ctx.boreholeIds,
    unitSystem: ctx.unitSystem,
    blocks,
  };
}

/** Plain-text version of Part 1 for the AI prompt's "base report text". */
export function reportMethodText(content: StandardReportContent, payload: StandardReportPayload): string {
  return [
    ...content.introduction,
    ...content.equations.map((e) => `Equation: ${e.text}${e.where ? ` (${e.where})` : ""}`),
    ...(content.guidance ?? []),
    ...(payload.methodNotes ?? []),
    `References: ${content.references.join(" | ")}`,
  ].join("\n\n");
}
