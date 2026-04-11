"use server";

import { incrementMatrixAiReportUsage } from "@/app/actions/subscription";
import { INTEGRATED_MATRIX_AI_SYSTEM_PROMPT } from "@/lib/integrated-matrix-ai-prompt";
import { sanitizeMatrixAiMarkdown } from "@/lib/matrix-ai-markdown";
import {
  MATRIX_AI_REPORTS_PER_WEEK,
  effectiveSubscriptionTier,
  normaliseSubscriptionTier,
  tierAllowsAiAnalysis,
  usageWeekMondayKeyEuropeIstanbul,
} from "@/lib/subscription";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_MATRIX_ROWS = 250;

export interface IntegratedMatrixAiRowPayload {
  boreholeLabel: string;
  soilBehaviorLabel: string;
  sampleDepth: number | null;
  values: Record<string, string>;
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

function extractGeminiText(payload: GeminiGenerateContentResponse): string {
  const parts =
    payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean) ?? [];

  return parts.join("\n\n").trim();
}

function buildUserPrompt(
  projectName: string,
  columnOrder: string[],
  columnHeaders: string[],
  rows: IntegratedMatrixAiRowPayload[],
): string {
  const headerCells = ["#", "Borehole ID", "Soil behavior", "Sample depth", ...columnHeaders];
  const headerLine = headerCells.join(" | ");
  const separator = headerCells.map(() => "---").join(" | ");

  return [
    `Project name: ${projectName}`,
    "",
    "The following integrated geotechnical parameter matrix was compiled from project borehole/sample data and saved tool outputs. Column codes in parentheses match the application database parameter codes.",
    "",
    "Matrix (markdown table):",
    "",
    `| ${headerLine} |`,
    `| ${separator} |`,
    ...rows.map((row, index) => {
      const depthCell = row.sampleDepth === null ? "-" : String(row.sampleDepth);
      const cells = [
        String(index + 1),
        row.boreholeLabel,
        row.soilBehaviorLabel,
        depthCell,
        ...columnOrder.map((code) => row.values[code] ?? "-"),
      ];
      return `| ${cells.join(" | ")} |`;
    }),
    "",
    "Parameter code key (for reference):",
    columnOrder.map((code, i) => `- ${columnHeaders[i] ?? code} → parameter code "${code}"`).join("\n"),
    "",
    "Instructions:",
    "- Treat missing values (-) as absent; do not invent numerical inputs.",
    "- Base the interpretation strictly on the matrix; acknowledge uncertainty where data are sparse.",
    "- Follow the required output structure, section headings, and word-count rules in the system instructions.",
    "",
    "TABLE COMPLETION (mandatory for your response):",
    "- In sections 3 and 5, use full GFM markdown tables: every line starts with \"|\", include a separator row \"| --- | --- | ... |\", then immediately add ONE data row per engineering layer (minimum one data row per table).",
    "- Do NOT output a table that stops after the header and separator — empty tables with only column titles are invalid.",
    "- Finish all layer rows in section 3 before starting section 4; finish section 5’s table before section 6.",
  ].join("\n");
}

export type IntegratedMatrixAiResult =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; message: string };

/**
 * Gold-only. Admins: no weekly cap. Gold (non-admin): MATRIX_AI_REPORTS_PER_WEEK per Europe/Istanbul week.
 */
export async function interpretIntegratedMatrixReportAction(request: {
  projectName: string;
  columnOrder: string[];
  columnHeaders: string[];
  rows: IntegratedMatrixAiRowPayload[];
}): Promise<IntegratedMatrixAiResult> {
  try {
    if (!request.rows?.length) {
      return { ok: false, message: "No matrix rows were provided. Build the integrated parameter matrix first." };
    }
    if (request.rows.length > MAX_MATRIX_ROWS) {
      return {
        ok: false,
        message: `This interpretation supports at most ${MAX_MATRIX_ROWS} matrix rows. Reduce scope or split the project.`,
      };
    }
    if (!request.columnOrder?.length) {
      return { ok: false, message: "Column order is missing." };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { ok: false, message: "You must be signed in." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, is_admin")
      .eq("id", user.id)
      .maybeSingle();
    const row = profile as { subscription_tier?: string; is_admin?: boolean } | null;
    const isAdmin = Boolean(row?.is_admin);
    const tier = effectiveSubscriptionTier(normaliseSubscriptionTier(row?.subscription_tier), isAdmin);

    if (!tierAllowsAiAnalysis(tier, isAdmin)) {
      return { ok: false, message: "AI engineering reports from the integrated matrix require Gold membership." };
    }

    if (!isAdmin) {
      const weekStart = usageWeekMondayKeyEuropeIstanbul();
      const { data: usageRow } = await supabase
        .from("usage_weekly_matrix_ai")
        .select("report_generations")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      const used = (usageRow as { report_generations?: number } | null)?.report_generations ?? 0;
      if (used >= MATRIX_AI_REPORTS_PER_WEEK) {
        return {
          ok: false,
          message: `Weekly generation limit reached (${MATRIX_AI_REPORTS_PER_WEEK} matrix AI reports per week on Gold). The limit resets on Monday (Europe/Istanbul).`,
        };
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { ok: false, message: "AI reporting is not configured (GEMINI_API_KEY missing on the server)." };
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const maxOut = Number.parseInt(process.env.GEMINI_MATRIX_MAX_OUTPUT_TOKENS ?? "24576", 10);
    const maxOutputTokens = Number.isFinite(maxOut) && maxOut >= 1024 ? Math.min(maxOut, 65536) : 24576;
    const userPrompt = buildUserPrompt(request.projectName, request.columnOrder, request.columnHeaders, request.rows);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: INTEGRATED_MATRIX_AI_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!response.ok) {
      return { ok: false, message: `AI request failed (${response.status}). Please try again later.` };
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const rawText = extractGeminiText(payload);
    if (!rawText) {
      return { ok: false, message: "The model returned no text. Please try again." };
    }
    const text = sanitizeMatrixAiMarkdown(rawText);
    if (!text) {
      return { ok: false, message: "The model returned no usable text after cleanup. Please try again." };
    }
    const finishReason = payload.candidates?.[0]?.finishReason;
    const truncated = finishReason === "MAX_TOKENS";

    if (!isAdmin) {
      await incrementMatrixAiReportUsage(user.id);
    }

    return { ok: true, text, truncated };
  } catch {
    return { ok: false, message: "AI reporting is temporarily unavailable. Please try again." };
  }
}
