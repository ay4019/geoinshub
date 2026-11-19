"use server";

import { consumeAiAnalysisAction } from "@/app/actions/subscription";
import { isSuccessfulAiInterpretationBody, sanitizeAiInterpretationText } from "@/lib/ai-interpretation-sanitize";

interface ProfileReportAiRequest {
  toolSlug: string;
  toolTitle: string;
  depthUnit: string;
  valueUnit: string;
  resolvedNarrative: string;
  tableRows: Array<Record<string, string>>;
  plotImageDataUrl?: string | null;
  /** Second profile figure (e.g. SPT (N1)60 vs depth). Sent after the first image to Gemini. */
  plotImageDataUrl2?: string | null;
  aiPromptHint?: string;
  /** Exact table column keys holding the reported parameter(s); overrides the per-tool heuristics. */
  primaryValueKeys?: string[];
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface TableSummaryResult {
  recordCount: number;
  primaryValueKey: string | null;
  minLabel: string;
  maxLabel: string;
  meanLabel: string;
  representativeRows: string[];
  rowsAreSampled: boolean;
  depthKey: string | null;
  depthMin: number | null;
  depthMax: number | null;
  boreholeCount: number;
}

function buildSystemPrompt(): string {
  return [
    "You are a senior geotechnical engineer writing the interpretation section of a preliminary parameter report.",
    "",
    "OUTPUT FORMAT",
    "- Exactly three paragraphs separated by one blank line; 230-320 words in total, at most about 110 words per paragraph. Finish every sentence; never stop mid-sentence.",
    "- No headings, bullet points, tables, or markdown. Objective, technical British English.",
    "- Paragraph 1 (interpretation): describe the profile using the statistics supplied — range, central value, and depth trend (cite the slope and r2 when given).",
    "- Paragraph 2 (variability and data quality): compare boreholes, comment on scatter (CoV), flagged outliers, refusals, and whether the number of records supports the observed trend; state whether apparent changes are more likely stratigraphic or test variability.",
    "- Paragraph 3 (design relevance): explain how the results should inform the selection of a cautious representative value for preliminary design (qualitatively, or as a range drawn only from the supplied statistics), state the main limitation of the correlation described in the base report text, and recommend review by a qualified geotechnical engineer and any specific verification testing that would reduce uncertainty.",
    "",
    "EVIDENCE RULES (mandatory)",
    "- Use only numbers that appear in the input (statistics, table rows, base report text); you may round them. Do not calculate new parameters or introduce other correlations.",
    "- Do not cite standards, codes, papers, or authors that are not named in the base report text.",
    "- If there are fewer than 5 records or only one borehole, say explicitly that the dataset is too small for a statistically meaningful trend.",
    "- If a plot appears to disagree with the table, rely on the table and mention the discrepancy.",
    "- Never claim code compliance or final design adequacy.",
    "",
    "NOTATION",
    "- Plain ASCII only: c_u, c', phi', N60, (N1)60, f1, sigma'_v0, Eoed, m_v, kPa, m. No Unicode subscripts.",
    "",
    "When two profile plots are provided (e.g. SPT N60-depth and normalised (N1)60-depth), compare both: comment on energy-corrected blow count versus stress-normalised trends and any divergence between them.",
    "",
    "SINGLE-CALCULATION RESULTS",
    "- If the table has no depth column (e.g. a bearing capacity calculation), there is no profile: paragraph 1 interprets the result and the governing terms, paragraph 2 discusses sensitivity to the input parameters and data quality, paragraph 3 covers design relevance and limitations.",
  ].join("\n");
}

const BOREHOLE_KEY_PATTERN = /^(borehole(\s*id)?|boreholeid|bh(\s*id)?)$/i;

function detectBoreholeKey(rows: Array<Record<string, string>>): string | null {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return keys.find((key) => BOREHOLE_KEY_PATTERN.test(key.trim())) ?? null;
}

/** Column keys that carry the reported parameter for each tool (falls back to all numeric columns). */
const TOOL_PRIMARY_KEY_HINTS: Record<string, RegExp[]> = {
  "spt-corrections": [/^n60$/i, /^n160$/i],
  "cu-from-pi-and-spt": [/^cu\s*\(/i],
  "cprime-from-cu": [/^c′|^c'/i],
  "friction-angle-from-pi": [/^φ′|^phi/i],
  "eoed-from-mv": [/eoed/i, /^m_?v/i],
};

function describe(values: number[]) {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, mean, sd, cov: mean !== 0 ? sd / Math.abs(mean) : 0, min: Math.min(...values), max: Math.max(...values) };
}

function linearTrend(points: Array<{ x: number; y: number }>) {
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

const fmt = (v: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(v);

/** Per-parameter, per-borehole, trend, and outlier statistics so the model does not have to infer them from sampled rows. */
function buildEngineeringStatistics(toolData: ProfileReportAiRequest): string[] {
  const rows = toolData.tableRows;
  const depthKey = detectDepthKey(rows, toolData.depthUnit);
  if (!depthKey) {
    // Single-calculation tables (Parameter / Value) have no comparable numeric column to summarise.
    return [];
  }
  const boreholeKey = detectBoreholeKey(rows);
  const numericColumns = getNumericColumnValues(rows);
  const hints = TOOL_PRIMARY_KEY_HINTS[toolData.toolSlug];
  const candidateKeys = Array.from(numericColumns.keys()).filter((key) => key !== depthKey && key !== boreholeKey);
  const explicit = (toolData.primaryValueKeys ?? []).filter((key) => candidateKeys.includes(key));
  const primaryKeys = explicit.length
    ? explicit
    : hints
      ? candidateKeys.filter((key) => hints.some((pattern) => pattern.test(key.trim())))
      : candidateKeys.slice(-2);
  const lines: string[] = [];
  const fieldNKey = Array.from(numericColumns.keys()).find((key) => /^(n|nfield|field n)$/i.test(key.trim()));
  const isRefusalRow = (rowIndex: number) =>
    toolData.toolSlug === "spt-corrections" && fieldNKey !== undefined && (parseNumericValue(rows[rowIndex]?.[fieldNKey]) ?? 0) >= 50;

  for (const key of primaryKeys.length ? primaryKeys : candidateKeys.slice(-1)) {
    // Refusal blow counts are lower bounds; keep them out of the statistics and report them separately.
    const entries = (numericColumns.get(key) ?? []).filter((e) => !isRefusalRow(e.rowIndex));
    if (!entries.length) continue;
    const d = describe(entries.map((e) => e.value));
    lines.push(
      `* ${key}: n = ${d.n}, min ${fmt(d.min)}, max ${fmt(d.max)}, mean ${fmt(d.mean)}, standard deviation ${fmt(d.sd)}, CoV ${fmt(d.cov)}`,
    );

    if (depthKey) {
      const pts = entries
        .map((e) => ({ x: parseNumericValue(rows[e.rowIndex]?.[depthKey]), y: e.value }))
        .filter((p): p is { x: number; y: number } => p.x !== null);
      const trend = linearTrend(pts);
      if (trend) {
        lines.push(`  - depth trend (all boreholes): slope ${fmt(trend.slope)} per ${toolData.depthUnit}, r2 ${fmt(trend.r2)}`);
      }
    }

    if (boreholeKey) {
      const byBh = new Map<string, number[]>();
      entries.forEach((e) => {
        const bh = (rows[e.rowIndex]?.[boreholeKey] ?? "").trim() || "unlabelled";
        byBh.set(bh, [...(byBh.get(bh) ?? []), e.value]);
      });
      if (byBh.size > 1) {
        const parts = Array.from(byBh.entries()).map(([bh, vals]) => {
          const s = describe(vals);
          return `${bh} (n ${s.n}, mean ${fmt(s.mean)}, range ${fmt(s.min)}-${fmt(s.max)})`;
        });
        lines.push(`  - by borehole: ${parts.join("; ")}`);
      }
    }

    if (d.n >= 5 && d.sd > 0) {
      const outliers = entries.filter((e) => Math.abs(e.value - d.mean) / d.sd > 2);
      if (outliers.length) {
        lines.push(
          `  - values more than 2 standard deviations from the mean: ${outliers
            .map((e) => `${fmt(e.value)} at row ${e.rowIndex + 1}`)
            .join(", ")}`,
        );
      }
    }
  }

  if (toolData.toolSlug === "spt-corrections") {
    const refusals = rows.map((_, i) => i).filter(isRefusalRow);
    lines.push(
      `* SPT refusals (field N = 50, excluded from the statistics above, lower-bound resistance): ${refusals.length}${
        refusals.length && depthKey ? ` at depths ${refusals.map((i) => rows[i]?.[depthKey] ?? "?").join(", ")} ${toolData.depthUnit}` : ""
      }`,
    );
  }

  return lines;
}

/** Drops a trailing partial sentence when the model hit the token limit. */
function trimToLastCompleteSentence(text: string): string {
  const trimmed = text.trim();
  const lastStop = Math.max(
    trimmed.lastIndexOf(". "),
    trimmed.lastIndexOf(".\n"),
    trimmed.endsWith(".") ? trimmed.length - 1 : -1,
  );
  return lastStop > 0 ? trimmed.slice(0, lastStop + 1).trim() : trimmed;
}

function extractGeminiText(payload: GeminiGenerateContentResponse): string {
  const parts =
    payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean) ?? [];

  return parts.join("\n\n").trim();
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/u.exec(dataUrl.trim());
  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().replaceAll(",", "");
  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumericLabel(value: number, unit: string, key?: string | null): string {
  const numeric = Number.isFinite(value)
    ? new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(value)
    : "unavailable";
  const unitText = unit.trim() ? ` ${unit.trim()}` : "";
  const keyText = key?.trim() ? ` (${key})` : "";
  return `${numeric}${unitText}${keyText}`;
}

function formatRow(row: Record<string, string>, index: number): string {
  const pairs = Object.entries(row)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  return `${index + 1}. ${pairs}`;
}

function detectDepthKey(rows: Array<Record<string, string>>, depthUnit: string): string | null {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const exactMatch = keys.find((key) => key.toLowerCase() === `depth (${depthUnit})`.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }

  const unitMatch = keys.find(
    (key) => key.toLowerCase().includes("depth") && key.toLowerCase().includes(depthUnit.toLowerCase()),
  );
  if (unitMatch) {
    return unitMatch;
  }

  return keys.find((key) => key.toLowerCase().includes("depth")) ?? null;
}

function getNumericColumnValues(rows: Array<Record<string, string>>) {
  const numericColumns = new Map<string, Array<{ rowIndex: number; value: number }>>();

  rows.forEach((row, rowIndex) => {
    Object.entries(row).forEach(([key, rawValue]) => {
      const numericValue = parseNumericValue(rawValue);
      if (numericValue === null) {
        return;
      }

      const bucket = numericColumns.get(key) ?? [];
      bucket.push({ rowIndex, value: numericValue });
      numericColumns.set(key, bucket);
    });
  });

  return numericColumns;
}

function pickPrimaryValueKey(
  rows: Array<Record<string, string>>,
  numericColumns: Map<string, Array<{ rowIndex: number; value: number }>>,
  valueUnit: string,
  depthKey: string | null,
): string | null {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const filtered = keys.filter((key) => key !== depthKey && (numericColumns.get(key)?.length ?? 0) > 0);
  if (!filtered.length) {
    return null;
  }

  const exactUnitMatches = filtered.filter((key) => key.toLowerCase().includes(`(${valueUnit.toLowerCase()})`));
  if (exactUnitMatches.length) {
    return exactUnitMatches[exactUnitMatches.length - 1] ?? null;
  }

  const unitMatches = filtered.filter((key) => key.toLowerCase().includes(valueUnit.toLowerCase()));
  if (unitMatches.length) {
    return unitMatches[unitMatches.length - 1] ?? null;
  }

  return filtered[filtered.length - 1] ?? null;
}

function buildRepresentativeRowIndexes(
  rows: Array<Record<string, string>>,
  primaryValueEntries: Array<{ rowIndex: number; value: number }>,
  maxRows: number,
) {
  const indexes = new Set<number>();
  if (!rows.length) {
    return [];
  }

  indexes.add(0);
  indexes.add(rows.length - 1);

  if (primaryValueEntries.length) {
    const minEntry = primaryValueEntries.reduce((lowest, current) => (current.value < lowest.value ? current : lowest));
    const maxEntry = primaryValueEntries.reduce((highest, current) => (current.value > highest.value ? current : highest));
    indexes.add(minEntry.rowIndex);
    indexes.add(maxEntry.rowIndex);
  }

  if (rows.length > 2) {
    const slots = Math.max(maxRows - indexes.size, 0);
    for (let i = 1; i <= slots; i += 1) {
      const idx = Math.round((i / (slots + 1)) * (rows.length - 1));
      indexes.add(idx);
    }
  }

  return Array.from(indexes)
    .sort((a, b) => a - b)
    .slice(0, maxRows);
}

function buildTableSummary(toolData: ProfileReportAiRequest): TableSummaryResult {
  const rows = toolData.tableRows;
  const recordCount = rows.length;
  const depthKey = detectDepthKey(rows, toolData.depthUnit);
  const numericColumns = getNumericColumnValues(rows);
  const primaryValueKey = pickPrimaryValueKey(rows, numericColumns, toolData.valueUnit, depthKey);
  const primaryValueEntries = primaryValueKey ? (numericColumns.get(primaryValueKey) ?? []) : [];
  const depthEntries = depthKey ? (numericColumns.get(depthKey) ?? []) : [];

  const minValue = primaryValueEntries.length ? Math.min(...primaryValueEntries.map((entry) => entry.value)) : null;
  const maxValue = primaryValueEntries.length ? Math.max(...primaryValueEntries.map((entry) => entry.value)) : null;
  const meanValue = primaryValueEntries.length
    ? primaryValueEntries.reduce((sum, entry) => sum + entry.value, 0) / primaryValueEntries.length
    : null;

  const boreholeKey = detectBoreholeKey(rows);
  const boreholeCount = boreholeKey
    ? new Set(rows.map((row) => (row[boreholeKey] ?? "").trim()).filter(Boolean)).size
    : 0;

  const representativeRowIndexes = buildRepresentativeRowIndexes(rows, primaryValueEntries, 16);
  const representativeRows = representativeRowIndexes.map((rowIndex) => formatRow(rows[rowIndex] ?? {}, rowIndex));

  return {
    recordCount,
    primaryValueKey,
    minLabel:
      minValue === null ? "unavailable from current table structure" : formatNumericLabel(minValue, toolData.valueUnit, primaryValueKey),
    maxLabel:
      maxValue === null ? "unavailable from current table structure" : formatNumericLabel(maxValue, toolData.valueUnit, primaryValueKey),
    meanLabel:
      meanValue === null ? "unavailable from current table structure" : formatNumericLabel(meanValue, toolData.valueUnit, primaryValueKey),
    representativeRows,
    rowsAreSampled: representativeRowIndexes.length < rows.length,
    depthKey,
    depthMin: depthEntries.length ? Math.min(...depthEntries.map((entry) => entry.value)) : null,
    depthMax: depthEntries.length ? Math.max(...depthEntries.map((entry) => entry.value)) : null,
    boreholeCount,
  };
}

function buildPlotSummary(toolData: ProfileReportAiRequest, tableSummary: TableSummaryResult): string {
  const hasFirst = Boolean(toolData.plotImageDataUrl);
  const hasSecond = Boolean(toolData.plotImageDataUrl2);
  if (!hasFirst && !hasSecond) {
    return "No plot description provided.";
  }

  const parts: string[] = [];

  if (toolData.toolSlug === "spt-corrections" && hasFirst && hasSecond) {
    parts.push(
      "Two plot images are attached in order: (1) N60 versus depth; (2) normalised blow count (N1)60 versus depth.",
    );
  } else if (hasFirst && hasSecond) {
    parts.push("Two plot images are attached in order; interpret both together with the table.");
  } else {
    parts.push("Plot image provided.");
  }

  if (tableSummary.primaryValueKey) {
    parts.push(
      `The primary plot is expected to represent ${tableSummary.primaryValueKey} against depth-related records for ${tableSummary.recordCount} samples.`,
    );
  } else {
    parts.push(`The plot(s) are associated with ${tableSummary.recordCount} tabulated records.`);
  }

  if (tableSummary.depthMin !== null && tableSummary.depthMax !== null) {
    parts.push(
      `The interpreted depth range from the tabulated data is ${formatNumericLabel(tableSummary.depthMin, toolData.depthUnit, tableSummary.depthKey)} to ${formatNumericLabel(tableSummary.depthMax, toolData.depthUnit, tableSummary.depthKey)}.`,
    );
  }

  if (tableSummary.boreholeCount > 0) {
    parts.push(
      `The current dataset covers ${tableSummary.boreholeCount} borehole${tableSummary.boreholeCount === 1 ? "" : "s"}.`,
    );
  }

  if (tableSummary.primaryValueKey || hasSecond) {
    parts.push(
      `Use the attached plot${hasSecond ? "s" : ""} as visual support for trend confirmation, but rely only on values evidenced by the table and the image${hasSecond ? "s" : ""}.`,
    );
  }

  return parts.join(" ");
}

/** SPT tables carry blow counts, not stresses; the generic stress unit would mislabel them. */
function withValueUnit(toolData: ProfileReportAiRequest): ProfileReportAiRequest {
  return toolData.toolSlug === "spt-corrections" ? { ...toolData, valueUnit: "blows/0.3 m" } : toolData;
}

function buildUserPrompt(rawToolData: ProfileReportAiRequest): string {
  const toolData = withValueUnit(rawToolData);
  const tableSummary = buildTableSummary(toolData);
  const engineeringStatistics = buildEngineeringStatistics(toolData);
  const plotSummary = buildPlotSummary(toolData, tableSummary);
  const projectHint = toolData.aiPromptHint?.trim() || "No project hint provided.";
  const resolvedNarrative = toolData.resolvedNarrative.trim() || "No base report text provided.";
  const detailedTable = tableSummary.rowsAreSampled
    ? [
        "Only representative rows are included below to control token usage; summary statistics reflect the broader dataset.",
        ...tableSummary.representativeRows,
      ].join("\n")
    : tableSummary.representativeRows.join("\n");

  return [
    `Tool slug: ${toolData.toolSlug}`,
    `Tool title: ${toolData.toolTitle}`,
    "",
    "Units:",
    `depth (${toolData.depthUnit}), value (${toolData.valueUnit})`,
    "",
    "Project hint:",
    projectHint,
    "",
    "Base report text:",
    resolvedNarrative,
    "",
    "Table Data Summary:",
    "",
    `* Number of records: ${tableSummary.recordCount}`,
    `* Number of boreholes: ${tableSummary.boreholeCount || "not identified"}`,
    ...(tableSummary.depthMin !== null && tableSummary.depthMax !== null
      ? [`* Depth range: ${fmt(tableSummary.depthMin)}-${fmt(tableSummary.depthMax)} ${toolData.depthUnit}`]
      : []),
    // The per-parameter statistics below supersede the generic single-column range (which cannot exclude refusals).
    ...(engineeringStatistics.length || !tableSummary.depthKey
      ? []
      : [`* Value range: ${tableSummary.minLabel} - ${tableSummary.maxLabel}`, `* Mean value: ${tableSummary.meanLabel}`]),
    ...(tableSummary.depthKey ? [] : ["* This is a single-calculation result table (no depth profile)."]),
    "",
    "Engineering statistics (computed server-side from the full table; quote these rather than estimating):",
    ...(engineeringStatistics.length ? engineeringStatistics : ["* not applicable (see the detailed table below)"]),
    "",
    "Detailed table:",
    detailedTable || "No representative rows could be derived from the current table.",
    "",
    "Plot description:",
    plotSummary,
    "",
    "Instructions:",
    "Review the tabulated values and the plot description together.",
    ...(toolData.toolSlug === "spt-corrections" && toolData.plotImageDataUrl2
      ? [
          "Both SPT profile plots are attached: relate N60 trends to (N1)60 after overburden normalisation where the data supports it.",
        ]
      : []),
    "Use the base report text only as supporting context (method, correlation, references) and do not repeat it.",
    "Write the three paragraphs defined in the system instructions: interpretation, variability and data quality, design relevance.",
    "If the data is inconsistent or limited, explicitly state uncertainty.",
  ].join("\n");
}

async function requestGeminiInterpretation(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  imageParts: ReadonlyArray<{ mimeType: string; data: string }>,
  maxOutputTokens: number,
  thinkingBudget: number,
) {
  const userParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [{ text: userPrompt }];
  for (const imagePart of imageParts) {
    userParts.push({
      inline_data: {
        mime_type: imagePart.mimeType,
        data: imagePart.data,
      },
    });
  }

  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens,
        thinkingConfig: {
          thinkingBudget,
        },
      },
    }),
  });
}

export async function interpretProfileReportAction(request: ProfileReportAiRequest): Promise<string> {
  try {
    if (!request.tableRows?.length) {
      return "No profile table data was found. Please prepare profile rows first.";
    }

    const imageParts: Array<{ mimeType: string; data: string }> = [];
    if (request.plotImageDataUrl) {
      const parsed = parseDataUrl(request.plotImageDataUrl);
      if (!parsed) {
        return "Profile plot image format is invalid. Please regenerate the plot and try again.";
      }
      imageParts.push({ mimeType: parsed.mimeType, data: parsed.data });
    }
    if (request.plotImageDataUrl2) {
      const parsed2 = parseDataUrl(request.plotImageDataUrl2);
      if (!parsed2) {
        return "Second profile plot image format is invalid. Please regenerate the plot and try again.";
      }
      imageParts.push({ mimeType: parsed2.mimeType, data: parsed2.data });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return "AI analysis is enabled, but GEMINI_API_KEY is missing on the server.";
    }

    const quota = await consumeAiAnalysisAction();
    if (!quota.ok) {
      return quota.message;
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(request);

    let response = await requestGeminiInterpretation(apiKey, model, systemPrompt, userPrompt, imageParts, 1000, 0);
    if (!response.ok) {
      return `Gemini AI request failed (${response.status}).`;
    }

    let payload = (await response.json()) as GeminiGenerateContentResponse;
    let text = extractGeminiText(payload);
    const finishReason = payload.candidates?.[0]?.finishReason;

    if (!isSuccessfulAiInterpretationBody(text) || finishReason === "MAX_TOKENS") {
      response = await requestGeminiInterpretation(apiKey, model, systemPrompt, userPrompt, imageParts, 1400, 0);
      if (response.ok) {
        payload = (await response.json()) as GeminiGenerateContentResponse;
        text = extractGeminiText(payload);
        if (payload.candidates?.[0]?.finishReason === "MAX_TOKENS") {
          text = trimToLastCompleteSentence(text);
        }
      }
    }

    if (isSuccessfulAiInterpretationBody(text)) {
      return sanitizeAiInterpretationText(text);
    }
    return text || "Gemini returned no text. Please try again.";
  } catch {
    return "Gemini AI is temporarily unavailable. Please try again.";
  }
}
