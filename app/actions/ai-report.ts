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
    "You are a geotechnical engineering reporting assistant.",
    "",
    "Return exactly one concise technical paragraph between 300 and 350 words.",
    "Absolute maximum: 400 words.",
    "",
    "The tone must be objective, technical, and suitable for preliminary engineering assessment.",
    "",
    "Base your interpretation strictly on the provided data. Do not invent values or trends not supported by the input.",
    "",
    "Where uncertainty exists, state it clearly using cautious engineering language.",
    "",
    "Include:",
    "",
    "* a clear interpretation of the results,",
    "* a brief comment on variability, trends, or anomalies if present,",
    "* a short design-oriented remark explaining how the results may influence parameter selection.",
    "",
    "Do not claim regulatory compliance or final design suitability.",
    "",
    "Include at least one cautionary statement recommending review by a qualified engineer.",
    "",
    "Avoid repetition and unnecessary verbosity. Prioritise technical clarity over length.",
    "",
    "Use plain ASCII for symbols where relevant: c_u, N60, N1_60 or (N1)60, and f1 (avoid Unicode subscripts and markdown formatting).",
    "",
    "When two profile plots are provided (e.g. SPT N60-depth and normalized (N1)60-depth), compare both: comment on energy-corrected blow count versus stress-normalized trends and any divergence between them.",
  ].join("\n");
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

  const boreholeCount = new Set(
    rows
      .map((row) => row.Borehole ?? row["Borehole ID"] ?? row["BoreholeId"] ?? row["BH"] ?? "")
      .map((value) => value.trim())
      .filter(Boolean),
  ).size;

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
      "Two plot images are attached in order: (1) N60 versus depth; (2) normalized blow count (N1)60 versus depth.",
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

function buildUserPrompt(toolData: ProfileReportAiRequest): string {
  const tableSummary = buildTableSummary(toolData);
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
    `* Value range: ${tableSummary.minLabel} - ${tableSummary.maxLabel}`,
    `* Mean value: ${tableSummary.meanLabel}`,
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
          "Both SPT profile plots are attached: relate N60 trends to (N1)60 after overburden normalization where the data supports it.",
        ]
      : []),
    "Use the base report text only as supporting context and avoid repetition.",
    "Focus on engineering interpretation, variability, and design relevance.",
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

    let response = await requestGeminiInterpretation(apiKey, model, systemPrompt, userPrompt, imageParts, 640, 0);
    if (!response.ok) {
      return `Gemini AI request failed (${response.status}).`;
    }

    let payload = (await response.json()) as GeminiGenerateContentResponse;
    let text = extractGeminiText(payload);
    const finishReason = payload.candidates?.[0]?.finishReason;

    if (!isSuccessfulAiInterpretationBody(text) || finishReason === "MAX_TOKENS") {
      response = await requestGeminiInterpretation(apiKey, model, systemPrompt, userPrompt, imageParts, 760, 0);
      if (response.ok) {
        payload = (await response.json()) as GeminiGenerateContentResponse;
        text = extractGeminiText(payload);
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
