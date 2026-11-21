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

/** Unique borehole IDs in first-seen order (the tool may pass one entry per sample). */
export function uniqueBoreholes(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function listText(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** One sentence describing where the data came from: boreholes, sample count and depth range. */
function dataSourceSentence(ctx: StandardReportContext, payload: StandardReportPayload): string {
  const project = ctx.projectName?.trim() ? ` of the ${ctx.projectName.trim()} project` : "";
  const fromPoints = uniqueBoreholes(payload.points.map((p) => p.boreholeId));
  const boreholes = fromPoints.length ? fromPoints : uniqueBoreholes(ctx.boreholeIds);
  const depths = payload.points.map((p) => p.depth).filter(Number.isFinite);
  const samples = payload.rows.length || payload.points.length;
  const where = boreholes.length ? ` from ${boreholes.length === 1 ? "borehole" : "boreholes"} ${listText(boreholes)}${project}` : project;
  const range = depths.length
    ? `, between ${formatNumber(Math.min(...depths))} and ${formatNumber(Math.max(...depths))} ${payload.depthUnit} depth`
    : "";
  return `The assessment uses ${plural(samples, "sample")}${where}${range}, as entered in the tool.`;
}

/** Three significant figures — enough for a narrative summary (exact values are in the table). */
function sig(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  return formatNumber(Number(value.toPrecision(3)), 3);
}

function trendWords(slope: number, r2: number, unit: string, depthUnit: string): string {
  const dir = slope > 0 ? "increase" : "decrease";
  const rate = `${sig(Math.abs(slope))}${unit} per ${depthUnit}`;
  if (r2 >= 0.5) return `Values ${dir} clearly with depth, by roughly ${rate}.`;
  if (r2 >= 0.2) return `There is a weak tendency for values to ${dir} with depth.`;
  return "There is no clear trend with depth.";
}

/** Plain-language summary of each plotted quantity — range, typical value, depth trend, borehole differences. */
function resultSummaries(payload: StandardReportPayload): string[] {
  const out: string[] = [];
  for (const series of payload.series) {
    const pts = payload.points
      .map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.values[series.key] }))
      .filter((p): p is { boreholeId: string; depth: number; value: number } => typeof p.value === "number" && Number.isFinite(p.value));
    if (!pts.length) continue;
    const s = summariseSeries(pts);
    const u = series.unit ? ` ${series.unit}` : "";
    const parts: string[] = [];
    parts.push(
      s.overall.n === 1
        ? `${series.label} is ${sig(s.overall.mean)}${u}.`
        : `${series.label} ranges from ${sig(s.overall.min)} to ${sig(s.overall.max)}${u}, with an average of ${sig(s.overall.mean)}${u}.`,
    );
    if (s.trend) parts.push(trendWords(s.trend.slope, s.trend.r2, u, payload.depthUnit));
    if (s.byBorehole.length > 1) {
      const means = s.byBorehole.map((b) => b.stats.mean);
      const spread = Math.max(...means) - Math.min(...means);
      parts.push(
        spread > 0.25 * Math.abs(s.overall.mean)
          ? `Average values differ noticeably between boreholes (${s.byBorehole.map((b) => `${b.boreholeId} ${sig(b.stats.mean)}${u}`).join(", ")}), which may reflect variation across the site.`
          : "The boreholes give broadly consistent values.",
      );
    }
    if (s.outliers.length) {
      parts.push(
        `${s.outliers.length === 1 ? "One value stands" : `${s.outliers.length} values stand`} out from the rest (${s.outliers
          .map((o) => `${sig(o.value)}${u} at ${sig(o.depth)} ${payload.depthUnit}, ${o.boreholeId}`)
          .join("; ")}) and should be checked.`,
      );
    }
    if (s.overall.n < 5) parts.push("With so few values, these observations are indicative only.");
    out.push(parts.join(" "));
  }
  return out;
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
  let section = 0;
  const h1 = (text: string) => blocks.push({ kind: "heading", level: 1, text: `${++section}. ${text}` });
  const isSingleCase = !payload.points.length && !payload.series.length;

  // 1. Introduction — what and why
  h1("Introduction");
  content.introduction.forEach((text) => blocks.push({ kind: "paragraph", text }));

  // 2. Method — how, then the equations
  h1("Method");
  blocks.push({ kind: "paragraph", text: content.method });
  content.equations.forEach((e, i) => blocks.push({ kind: "equation", text: e.text, label: `(${i + 1})`, where: e.where }));

  // 3. Input data
  h1("Input Data");
  blocks.push({
    kind: "paragraph",
    text:
      payload.dataSentence ??
      (isSingleCase
        ? "The assessment uses the single design case defined by the inputs below, as entered in the tool."
        : dataSourceSentence(ctx, payload)),
  });
  if (payload.inputs?.length) blocks.push({ kind: "keyValue", title: "Inputs", rows: payload.inputs });
  payload.methodNotes?.forEach((text) => blocks.push({ kind: "paragraph", text }));
  if (payload.exclusions?.length) {
    blocks.push({ kind: "paragraph", text: "Not included in the results:" });
    blocks.push({ kind: "bullets", items: payload.exclusions });
  }

  // Calculation steps (design tools) — numbered equations continue from the Method section.
  if (payload.steps?.length) {
    h1("Calculation Steps");
    let eq = content.equations.length;
    payload.steps.forEach((step, i) => {
      blocks.push({ kind: "heading", level: 2, text: `Step ${i + 1} — ${step.title}` });
      step.paragraphs.forEach((text) => blocks.push({ kind: "paragraph", text }));
      step.equations?.forEach((e) => blocks.push({ kind: "equation", text: e.text, label: `(${++eq})`, where: e.where }));
      if (step.bullets?.length) blocks.push({ kind: "bullets", items: step.bullets });
      if (step.table?.rows.length) blocks.push({ kind: "table", ...step.table });
      step.after?.forEach((text) => blocks.push({ kind: "paragraph", text }));
    });
  }

  // 4. Results — key values, table, figures, short summary
  h1("Results");
  if (payload.keyResults?.length) blocks.push({ kind: "keyValue", title: "Key results", rows: payload.keyResults });
  if (payload.rows.length) blocks.push({ kind: "table", title: content.tableTitle, columns: payload.columns, rows: payload.rows });
  let fig = 0;
  for (const f of options.figures) {
    if (!f.dataUrl) continue;
    const series = payload.series.find((s) => s.key === f.seriesKey);
    if (!series) continue;
    fig += 1;
    blocks.push({ kind: "figure", caption: `Figure ${fig}. ${content.figureCaption(series)}`, dataUrl: f.dataUrl });
  }
  const summaries = payload.skipSeriesSummary ? [] : resultSummaries(payload);
  if (summaries.length) {
    blocks.push({ kind: "heading", level: 2, text: "Summary" });
    summaries.forEach((text) => blocks.push({ kind: "paragraph", text }));
  }

  if (options.aiText?.trim()) {
    h1("AI-Assisted Interpretation");
    blocks.push({ kind: "ai", text: options.aiText.trim() });
  }

  // 5. Notes on use — guidance + the tool's assumptions and limitations
  const notes = [...ctx.assumptions, ...ctx.limitations].map((t) => t.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  if (content.guidance?.length || notes.length) {
    h1("Notes on Use");
    content.guidance?.forEach((text) => blocks.push({ kind: "paragraph", text }));
    if (notes.length) blocks.push({ kind: "bullets", items: notes });
  }

  h1("Responsibility");
  blocks.push({ kind: "responsibility" });
  blocks.push({ kind: "heading", level: 1, text: "References" });
  blocks.push({ kind: "references", items: content.references });

  return {
    subject: content.subject,
    toolTitle: ctx.toolTitle,
    projectName: ctx.projectName,
    boreholeIds: uniqueBoreholes(ctx.boreholeIds),
    unitSystem: ctx.unitSystem,
    blocks,
  };
}

/** Plain-text method summary for the AI prompt's "base report text". */
export function reportMethodText(content: StandardReportContent, payload: StandardReportPayload): string {
  return [
    ...content.introduction,
    content.method,
    ...content.equations.map((e) => `Equation: ${e.text}${e.where ? ` (${e.where})` : ""}`),
    ...(content.guidance ?? []),
    ...(payload.methodNotes ?? []),
    ...(payload.steps ?? []).flatMap((s) => [
      `Step: ${s.title}`,
      ...s.paragraphs,
      ...(s.equations ?? []).map((e) => `Equation: ${e.text}${e.where ? ` (${e.where})` : ""}`),
      ...(s.bullets ?? []),
      ...(s.after ?? []),
    ]),
    `References: ${content.references.join(" | ")}`,
  ].join("\n\n");
}
