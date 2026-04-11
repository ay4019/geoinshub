"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

import { interpretProfileReportAction } from "@/app/actions/ai-report";
import { consumeReportGenerationAction } from "@/app/actions/subscription";
import { useSubscription } from "@/components/subscription-context";
import { tierAllowsAiAnalysis, tierAllowsReports } from "@/lib/subscription";
import { createToolReportPdf } from "@/lib/tool-report-pdf";
import {
  CU_REPORT_FIGURE_2_CAPTION,
  CU_REPORT_REFERENCE_ENTRIES,
  CU_REPORT_STROUD_FIGURE_CAPTION,
  CU_REPORT_STROUD_FIGURE_PLACEHOLDER,
  CU_REPORT_TABLE_1_TITLE,
  getToolReportTemplate,
} from "@/lib/tool-report-templates";

export interface CuProfileReportPoint {
  boreholeId: string;
  depth: number;
  pi: number;
  n60: number;
  f1: number;
  cu: number;
}

interface CuProfileReportTabProps {
  toolSlug: string;
  toolTitle: string;
  /** Guests cannot open the on-page report preview (Create report). */
  isAuthenticated: boolean;
  unitSystem?: string;
  projectName?: string | null;
  boreholeIds?: string[];
  depthUnit?: string;
  stressUnit?: string;
  points?: CuProfileReportPoint[];
  columns?: Array<{ header: string; key: string }>;
  rows?: Array<Record<string, string>>;
  plotImageDataUrl?: string | null;
  getFreshPlotImageDataUrl?: () => Promise<string | null>;
}

/** Gemini-backed AI interpretation is available through the server action. */
const AI_EVALUATION_REPORT_ENABLED = true;

const AI_ANALYZE_BUTTON_CLASS =
  "inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-[#d7c28a] bg-[linear-gradient(180deg,#fff8e7_0%,#f7ebc4_100%)] px-4 py-3 text-[0.95rem] font-semibold text-[#5f4718] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_-20px_rgba(161,98,7,0.45)] transition hover:border-[#c9af68] hover:bg-[linear-gradient(180deg,#fff4d8_0%,#f3e2ad_100%)] hover:text-[#4a3510] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_14px_28px_-22px_rgba(161,98,7,0.5)] disabled:cursor-not-allowed disabled:opacity-60";
const AI_INTERPRETATION_STORAGE_PREFIX = "gih:ai-interpretation";
const AI_INTERPRETATION_PROMPT_VERSION = "v2";

const PDF_MEMBERSHIP_TITLE =
  "PDF export and cloud save require Bronze membership or higher. You can keep using the tools with manual inputs.";

/** Matches PDF Figure 1 / Table 1 / Figure 2 caption typography. */
const CU_REPORT_CAPTION_TEXT_CLASS =
  "text-center text-sm font-medium leading-snug text-slate-700";

const SUB_CLASS = "text-[0.72em] align-baseline";

/** Renders c_u, N60 / N_60, f1 / f_1 with consistent subscripts (aligned with PDF engineering text). */
function formatNarrativeTextWithSubscripts(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(N_60|f_1|\bN60\b|\bf1\b|c_u)/g);
  return parts.map((part, i) => {
    const k = `${keyPrefix}-${i}`;
    if (part === "c_u") {
      return (
        <span key={k}>
          c<sub className={SUB_CLASS}>u</sub>
        </span>
      );
    }
    if (part === "N60" || part === "N_60") {
      return (
        <span key={k}>
          N<sub className={SUB_CLASS}>60</sub>
        </span>
      );
    }
    if (part === "f1" || part === "f_1") {
      return (
        <span key={k}>
          f<sub className={SUB_CLASS}>1</sub>
        </span>
      );
    }
    return <span key={k}>{part}</span>;
  });
}

function formatDataTableHeaderLabel(header: string): ReactNode {
  if (header === "N60") {
    return (
      <>
        N<sub className={SUB_CLASS}>60</sub>
      </>
    );
  }
  if (header === "f1") {
    return (
      <>
        f<sub className={SUB_CLASS}>1</sub>
      </>
    );
  }
  const cuParens = /^cu\s*\(([^)]+)\)$/.exec(header);
  if (cuParens) {
    return (
      <>
        c<sub className={SUB_CLASS}>u</sub> ({cuParens[1]})
      </>
    );
  }
  return formatNarrativeTextWithSubscripts(header, `th-${header}`);
}

/** Matches PDF `tool-report-pdf` heading detection: "1. …", "1.1. …", etc. Single-line blocks only. */
function isNumberedSectionHeadingBlock(block: string): boolean {
  const t = block.trim();
  if (t.includes("\n")) {
    return false;
  }
  return /^\d+(?:\.\d+)*\.\s+.+$/.test(t);
}

function isCuEquationLine(block: string): boolean {
  const s = block.trim().replace(/\s+/g, " ");
  return /^c_u\s*=\s*f_?1\s+x\s+N_?60\s*\(\s*kPa\s*\)$/i.test(s);
}

function CuReportEquationDisplay() {
  return (
    <div className="my-5 flex w-full items-baseline justify-between gap-3 sm:gap-4">
      <span className="w-10 shrink-0 sm:w-12" aria-hidden />
      <p className="min-w-0 flex-1 text-center font-serif text-[16px] italic leading-relaxed tracking-wide text-slate-900 sm:text-[17px]">
        <span className="inline-flex flex-wrap items-baseline justify-center gap-x-0.5">
          <span>
            c<sub className={SUB_CLASS}>u</sub>
          </span>
          <span className="mx-0.5">=</span>
          <span>
            f<sub className={SUB_CLASS}>1</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif">×</span>
          <span>
            N<sub className={SUB_CLASS}>60</sub>
          </span>
          <span className="ml-1">(kPa)</span>
        </span>
      </p>
      <span className="w-10 shrink-0 text-right font-serif text-[13px] font-semibold not-italic tracking-tight text-slate-700 sm:w-12 sm:text-sm">
        Eq.1
      </span>
    </div>
  );
}

function getColumns(depthUnit: string, stressUnit: string) {
  return [
    { header: "Borehole", key: "Borehole" },
    { header: `Depth (${depthUnit})`, key: `Depth (${depthUnit})` },
    { header: "PI (%)", key: "PI (%)" },
    { header: "N60", key: "N60" },
    { header: "f1", key: "f1" },
    { header: `cu (${stressUnit})`, key: `cu (${stressUnit})` },
  ];
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function buildAiInterpretationSignature(input: {
  toolSlug: string;
  toolTitle: string;
  depthUnit: string;
  stressUnit: string;
  projectName: string | null;
  aiPromptHint: string | null;
  narrativeText: string;
  rows: Array<Record<string, string>>;
  plotImageDataUrl: string | null;
}) {
  return hashText(
    JSON.stringify({
      promptVersion: AI_INTERPRETATION_PROMPT_VERSION,
      toolSlug: input.toolSlug,
      toolTitle: input.toolTitle,
      depthUnit: input.depthUnit,
      stressUnit: input.stressUnit,
      projectName: input.projectName,
      aiPromptHint: input.aiPromptHint,
      narrativeText: input.narrativeText,
      rows: input.rows,
      plotImageDataUrl: input.plotImageDataUrl,
    }),
  );
}

function shouldPersistAiInterpretation(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !(
    normalized.startsWith("no profile plot") ||
    normalized.startsWith("no profile table data") ||
    normalized.startsWith("profile plot image format is invalid") ||
    normalized.startsWith("ai analysis is enabled") ||
    normalized.startsWith("gemini ai request failed") ||
    normalized.startsWith("gemini returned no text") ||
    normalized.startsWith("gemini ai is temporarily unavailable")
  );
}

export function CuProfileReportTab({
  toolSlug,
  toolTitle,
  isAuthenticated,
  unitSystem,
  projectName,
  boreholeIds,
  depthUnit,
  stressUnit,
  points = [],
  columns: customColumns,
  rows: customRows,
  plotImageDataUrl,
  getFreshPlotImageDataUrl,
}: CuProfileReportTabProps) {
  const { effectiveTier, loading: subscriptionLoading } = useSubscription();
  const reportsOk = tierAllowsReports(effectiveTier);
  const aiTierOk = tierAllowsAiAnalysis(effectiveTier);

  const aiButtonTitle = useMemo(() => {
    if (!AI_EVALUATION_REPORT_ENABLED) {
      return "AI evaluation is not available until the AI add-on is configured.";
    }
    if (subscriptionLoading) {
      return undefined;
    }
    if (aiTierOk) {
      return undefined;
    }
    if (effectiveTier === "none") {
      return "AI analysis requires Silver or Gold membership. Sign up; new accounts start on Bronze, then you can upgrade.";
    }
    return "AI analysis requires Silver or Gold membership.";
  }, [aiTierOk, effectiveTier, subscriptionLoading]);
  const [isPending, startTransition] = useTransition();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isAiPanelVisible, setIsAiPanelVisible] = useState(false);
  const [isAiPanelDismissed, setIsAiPanelDismissed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [reportPanelOpen, setReportPanelOpen] = useState(false);
  const reportPanelContentId = useId();

  useEffect(() => {
    if (!isAuthenticated) {
      setReportPanelOpen(false);
      setIsAiPanelVisible(false);
      setIsAiPanelDismissed(true);
    }
  }, [isAuthenticated]);

  const template = useMemo(() => getToolReportTemplate(toolSlug), [toolSlug]);
  const resolvedDepthUnit = depthUnit ?? "m";
  const resolvedStressUnit = stressUnit ?? "kPa";

  const generatedRows = useMemo(
    () =>
      [...points]
        .sort(
          (a, b) =>
            a.boreholeId.localeCompare(b.boreholeId, undefined, { numeric: true, sensitivity: "base" }) ||
            a.depth - b.depth,
        )
        .map((point) => ({
          Borehole: point.boreholeId,
          [`Depth (${resolvedDepthUnit})`]: point.depth.toFixed(2),
          "PI (%)": point.pi.toFixed(2),
          N60: point.n60.toFixed(2),
          f1: point.f1.toFixed(2),
          [`cu (${resolvedStressUnit})`]: point.cu.toFixed(2),
        })),
    [points, resolvedDepthUnit, resolvedStressUnit],
  );

  const tableRows = useMemo(() => {
    if (Array.isArray(customRows) && customRows.length > 0) {
      return customRows;
    }
    return generatedRows;
  }, [customRows, generatedRows]);
  const columns = useMemo(
    () =>
      Array.isArray(customColumns) && customColumns.length > 0
        ? customColumns
        : getColumns(resolvedDepthUnit, resolvedStressUnit),
    [customColumns, resolvedDepthUnit, resolvedStressUnit],
  );

  const hasData = useMemo(
    () => Boolean(plotImageDataUrl) || typeof getFreshPlotImageDataUrl === "function",
    [getFreshPlotImageDataUrl, plotImageDataUrl],
  );

  const resolvePlotImage = async () => {
    if (plotImageDataUrl) {
      return plotImageDataUrl;
    }
    if (getFreshPlotImageDataUrl) {
      return getFreshPlotImageDataUrl();
    }
    return null;
  };

  const normalizedColumns = useMemo(
    () => (columns.length ? columns : [{ header: "Info", key: "Info" }]),
    [columns],
  );
  const normalizedRows = useMemo(
    () => (tableRows.length ? tableRows : [{ Info: "No tabulated rows were available at report time." }]),
    [tableRows],
  );
  const resolvedNarrative = useMemo(() => {
    const boreholes = Array.from(new Set((boreholeIds ?? []).map((item) => String(item).trim()).filter(Boolean)));
    const boreholeText = boreholes.length ? boreholes.join(", ") : "[Borehole ID’s]";
    const projectText = (projectName ?? "").trim() || "[Project Name]";
    return template.defaultNarrative
      .replaceAll("{{boreholes}}", boreholeText)
      .replaceAll("{{projectName}}", projectText);
  }, [boreholeIds, projectName, template.defaultNarrative]);
  const aiInterpretationStorageKey = useMemo(() => `${AI_INTERPRETATION_STORAGE_PREFIX}:${toolSlug}`, [toolSlug]);
  const aiInterpretationSignature = useMemo(
    () =>
      buildAiInterpretationSignature({
        toolSlug,
        toolTitle,
        depthUnit: resolvedDepthUnit,
        stressUnit: resolvedStressUnit,
        projectName: projectName ?? null,
        aiPromptHint: template.aiPromptHint ?? null,
        narrativeText: resolvedNarrative,
        rows: normalizedRows,
        plotImageDataUrl: plotImageDataUrl ?? null,
      }),
    [normalizedRows, plotImageDataUrl, projectName, resolvedDepthUnit, resolvedNarrative, resolvedStressUnit, template.aiPromptHint, toolSlug, toolTitle],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(aiInterpretationStorageKey);
    if (!raw) {
      setAiText("");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { signature?: string; text?: string };
      if (parsed.signature === aiInterpretationSignature && parsed.text?.trim()) {
        setAiText(parsed.text);
        setIsAiPanelVisible(true);
        setIsAiPanelDismissed(false);
        return;
      }
    } catch {}

    setAiText("");
    setIsAiPanelVisible(false);
    setIsAiPanelDismissed(false);
  }, [aiInterpretationSignature, aiInterpretationStorageKey]);

  const handleCloseAllReportUi = () => {
    setReportPanelOpen(false);
    setIsAiPanelVisible(false);
    setIsAiPanelDismissed(true);
    setStatus(null);
  };

  const handleToggleReportPanel = () => {
    if (reportPanelOpen) {
      setReportPanelOpen(false);
      return;
    }
    if (!isAuthenticated) {
      setStatus("Rapor önizlemesi için önce giriş yapın veya kayıt olun.");
      return;
    }

    setReportPanelOpen(true);
    if (aiText.trim()) {
      setIsAiPanelVisible(true);
      setIsAiPanelDismissed(false);
    }
  };

  const createAiInterpretation = async () => {
    const currentPlot = await resolvePlotImage();

    const text = await interpretProfileReportAction({
      toolSlug,
      toolTitle,
      depthUnit: resolvedDepthUnit,
      valueUnit: resolvedStressUnit,
      resolvedNarrative: resolvedNarrative
        .replaceAll(CU_REPORT_STROUD_FIGURE_PLACEHOLDER, "")
        .replace(/\n{3,}/g, "\n\n"),
      tableRows: normalizedRows,
      plotImageDataUrl: currentPlot,
      aiPromptHint: template.aiPromptHint,
    });
    const currentSignature = buildAiInterpretationSignature({
      toolSlug,
      toolTitle,
      depthUnit: resolvedDepthUnit,
      stressUnit: resolvedStressUnit,
      projectName: projectName ?? null,
      aiPromptHint: template.aiPromptHint ?? null,
      narrativeText: resolvedNarrative,
      rows: normalizedRows,
      plotImageDataUrl: currentPlot ?? null,
    });
    setAiText(text);
    setIsAiPanelVisible(true);
    setIsAiPanelDismissed(false);
    if (typeof window !== "undefined" && shouldPersistAiInterpretation(text)) {
      window.localStorage.setItem(
        aiInterpretationStorageKey,
        JSON.stringify({
          signature: currentSignature,
          text,
        }),
      );
    }
    return text;
  };

  const handleReportPdf = async () => {
    if (!reportsOk) {
      setStatus(
        "PDF export and cloud save require Bronze membership or higher. You can keep using the tools with manual inputs.",
      );
      return;
    }
    const currentPlot = await resolvePlotImage();
    if (!currentPlot) {
      setStatus("No profile plot is ready yet. Please complete Soil Profile Plot first.");
      return;
    }

    setStatus(null);
    setIsExportingPdf(true);
    try {
      const quota = await consumeReportGenerationAction();
      if (!quota.ok) {
        setStatus(quota.message);
        return;
      }
      await createToolReportPdf({
        toolTitle,
        toolSlug,
        unitSystem: unitSystem ?? "metric",
        narrativeText: resolvedNarrative,
        columns: normalizedColumns,
        rows: normalizedRows,
        plotImageDataUrl: currentPlot,
        aiParagraph: aiText.trim() || null,
      });
      setStatus("Report created — PDF downloaded.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleAiReport = () => {
    if (!AI_EVALUATION_REPORT_ENABLED) {
      return;
    }
    if (
      aiText.trim() &&
      !isAiPanelDismissed &&
      typeof window !== "undefined" &&
      !window.confirm("An AI interpretation already exists. Do you want to generate it again?")
    ) {
      return;
    }
    if (aiText.trim() && isAiPanelDismissed) {
      setIsAiPanelVisible(true);
      setIsAiPanelDismissed(false);
      setStatus(null);
      return;
    }
    startTransition(async () => {
      setStatus(null);
      const text = await createAiInterpretation();
      setStatus(text ? "AI interpretation generated." : null);
    });
  };

  const handleInterpretOnly = () => {
    startTransition(async () => {
      const text = await createAiInterpretation();
      setStatus(text ? "AI interpretation updated." : null);
    });
  };

  const narrativeBlocks = useMemo(
    () =>
      resolvedNarrative
        .split(/\n\s*\n/g)
        .map((block) => block.trim())
        .filter(Boolean),
    [resolvedNarrative],
  );

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Report</h2>
            <p className="text-left text-sm leading-relaxed text-slate-600 sm:text-[15px] sm:leading-7">
              <span className="font-bold text-slate-800">Create report</span> builds the draft report for this tool and
              opens it in the panel below; press it again to hide only that preview.{" "}
              <span className="font-bold text-slate-800">Download PDF</span> is inside the panel once the Soil Profile Plot
              is ready. For a quick AI interpretation of the tabulated values and the profile plot, use{" "}
              <span className="font-bold text-slate-800">Analyze with AI</span>.
            </p>
          </div>

          {!reportsOk ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950 sm:px-5 sm:py-5">
              <p className="break-words">
                To create projects and boreholes, save analyses, generate reports, and run AI analysis,{" "}
                <Link
                  href="/account?mode=signup"
                  className="font-semibold text-amber-900 underline decoration-amber-700/60 underline-offset-2 hover:text-amber-950"
                >
                  sign up
                </Link>{" "}
                and choose a membership tier that fits you. Without signing up, you can still use the tools with manual
                inputs only.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              className="btn-base btn-md w-full max-w-[280px]"
              aria-expanded={reportPanelOpen}
              aria-controls={reportPanelContentId}
              onClick={handleToggleReportPanel}
              disabled={!isAuthenticated && !reportPanelOpen}
              title={
                !isAuthenticated && !reportPanelOpen
                  ? "Rapor önizlemesi için giriş yapın veya kayıt olun."
                  : undefined
              }
            >
              {reportPanelOpen ? "Close report" : "Create report"}
            </button>
            <button
              type="button"
              className={`${AI_ANALYZE_BUTTON_CLASS} max-w-[280px]`}
              onClick={handleAiReport}
              disabled={
                !AI_EVALUATION_REPORT_ENABLED ||
                isPending ||
                isExportingPdf ||
                !aiTierOk ||
                subscriptionLoading
              }
              title={aiButtonTitle}
            >
              {isPending ? "Analyzing..." : "Analyze with AI"}
            </button>
          </div>
        </div>

        {reportPanelOpen ? (
          <div
            id={reportPanelContentId}
            className="mt-8 rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:mt-10 sm:p-5"
            role="region"
            aria-label="Report preview"
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Report narrative</h3>
            <div className="mt-4 space-y-4 pr-0.5 text-left text-sm leading-7 text-slate-800 sm:mt-5 sm:text-[15px] sm:leading-8">
              {narrativeBlocks.map((block, i) => {
                if (block.trim() === CU_REPORT_STROUD_FIGURE_PLACEHOLDER) {
                  return (
                    <figure key={`narr-${i}`} className="my-4">
                      <img
                        src="/images/stroud-1974-f1-pi.png"
                        alt={CU_REPORT_STROUD_FIGURE_CAPTION}
                        className="mx-auto h-auto max-h-52 w-full max-w-lg rounded border border-slate-200 bg-white object-contain sm:max-h-56 sm:max-w-xl"
                      />
                      <figcaption className={`mt-2 ${CU_REPORT_CAPTION_TEXT_CLASS}`}>
                        {formatNarrativeTextWithSubscripts(CU_REPORT_STROUD_FIGURE_CAPTION, "fig1-cap")}
                      </figcaption>
                    </figure>
                  );
                }
                if (isCuEquationLine(block)) {
                  return <CuReportEquationDisplay key={`narr-${i}`} />;
                }
                const heading = isNumberedSectionHeadingBlock(block);
                return (
                  <p
                    key={`narr-${i}`}
                    className={
                      heading
                        ? "whitespace-pre-wrap text-justify font-bold text-slate-900"
                        : "whitespace-pre-wrap text-justify"
                    }
                  >
                    {formatNarrativeTextWithSubscripts(block, `narr-${i}`)}
                  </p>
                );
              })}
            </div>

            {toolSlug === "cu-from-pi-and-spt" ? (
              <div className="mt-6">
                <p className={`${CU_REPORT_CAPTION_TEXT_CLASS} mx-auto max-w-3xl`}>
                  {formatNarrativeTextWithSubscripts(CU_REPORT_TABLE_1_TITLE, "tbl1-title")}
                </p>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2 sm:p-3">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          {normalizedColumns.map((column) => (
                            <th key={column.key} className="border border-slate-200 px-2 py-2 text-left font-bold">
                              {formatDataTableHeaderLabel(column.header)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {normalizedRows.map((row, idx) => (
                          <tr key={`r-${idx}`} className="bg-white">
                            {normalizedColumns.map((column) => (
                              <td key={`${idx}-${column.key}`} className="border border-slate-200 px-2 py-2 text-slate-900">
                                {String(row[column.key] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {plotImageDataUrl ? (
                  <figure className="mt-8 w-full">
                    <div className="flex w-full justify-center">
                      <img
                        src={plotImageDataUrl}
                        alt={CU_REPORT_FIGURE_2_CAPTION}
                        className="h-auto max-h-[min(65vh,36rem)] w-full max-w-5xl rounded-lg border border-slate-200 bg-white object-contain object-center sm:max-h-[min(70vh,40rem)]"
                      />
                    </div>
                    <figcaption className={`mt-2 ${CU_REPORT_CAPTION_TEXT_CLASS}`}>
                      {formatNarrativeTextWithSubscripts(CU_REPORT_FIGURE_2_CAPTION, "fig2-cap")}
                    </figcaption>
                  </figure>
                ) : (
                  <p className="mt-8 text-justify text-sm text-slate-500">
                    Soil profile plot appears below after you open the Soil Profile Plot tab and the chart is generated.
                  </p>
                )}

                {isAiPanelVisible && !isAiPanelDismissed && aiText.trim() ? (
                  <div className="mt-10 border-t border-slate-200 pt-6">
                    <h3 className="text-base font-bold text-slate-900">AI Interpretation</h3>
                    <p className="mt-3 text-justify text-sm leading-7 text-slate-800">{aiText}</p>
                  </div>
                ) : null}

                <div className="mt-10 border-t border-slate-200 pt-6">
                  <h3 className="text-base font-bold text-slate-900">2. References</h3>
                  <ul className="mt-3 list-none space-y-3 text-justify text-sm leading-relaxed text-slate-700">
                    {CU_REPORT_REFERENCE_ENTRIES.map((entry, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="shrink-0 text-slate-400" aria-hidden>
                          -
                        </span>
                        <span>{entry}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col items-center border-t border-slate-200 pt-5">
              <div className="flex w-full max-w-[280px] flex-col items-center gap-3">
                <button
                  type="button"
                  className={isAiPanelVisible && !isAiPanelDismissed && aiText.trim() ? "hidden" : "btn-base btn-md w-full"}
                  onClick={handleReportPdf}
                  disabled={isExportingPdf || !reportsOk}
                  title={!reportsOk ? PDF_MEMBERSHIP_TITLE : undefined}
                >
                  {isExportingPdf ? "Preparing PDF…" : "Download PDF"}
                </button>
                <button
                  type="button"
                  className={isAiPanelVisible && !isAiPanelDismissed && aiText.trim() ? "hidden" : "btn-base btn-md w-full"}
                  aria-expanded={reportPanelOpen}
                  aria-controls={reportPanelContentId}
                  onClick={handleToggleReportPanel}
                  disabled={!isAuthenticated && !reportPanelOpen}
                  title={
                    !isAuthenticated && !reportPanelOpen
                      ? "Rapor önizlemesi için giriş yapın veya kayıt olun."
                      : undefined
                  }
                >
                  {reportPanelOpen ? "Close report" : "Create report"}
                </button>
                <button
                  type="button"
                  className={AI_ANALYZE_BUTTON_CLASS}
                  onClick={handleAiReport}
                  disabled={
                    !AI_EVALUATION_REPORT_ENABLED ||
                    isPending ||
                    isExportingPdf ||
                    !aiTierOk ||
                    subscriptionLoading
                  }
                  title={aiButtonTitle}
                >
                  {isPending ? "Analyzing..." : "Analyze with AI"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isAiPanelVisible && !isAiPanelDismissed && aiText.trim() ? (
          <div className="mt-8 sm:mt-10">
            <div className="rounded-xl border border-amber-300 bg-[linear-gradient(135deg,#fff8e6,#fff2c7)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-amber-900">AI Interpretation</h3>
                <span className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                  Analyze with AI
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-800">{aiText}</p>
            </div>
            <div className="mx-auto mt-4 flex w-full max-w-[280px] flex-col gap-3">
              <button
                type="button"
                className="btn-base btn-md w-full"
                onClick={handleReportPdf}
                disabled={isExportingPdf || !reportsOk}
                title={!reportsOk ? PDF_MEMBERSHIP_TITLE : undefined}
              >
                {isExportingPdf ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button
                type="button"
                className="btn-base btn-md w-full"
                aria-expanded={reportPanelOpen}
                aria-controls={reportPanelContentId}
                onClick={handleCloseAllReportUi}
              >
                Close report
              </button>
            </div>
          </div>
        ) : null}

        {status ? (
          <p className="mt-6 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
            {status}
          </p>
        ) : null}

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:mt-10 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Report types</h3>
          <ul className="mt-3 space-y-3 text-left text-sm leading-relaxed text-slate-700">
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-slate-400">
                -
              </span>
              <span>
                <strong className="font-bold">Create report:</strong> Opens an on-page draft that presents your
                project- and borehole-specific analysis results together with relevant literature notes and references
                (narrative, parameter table, and profile plot).
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-slate-400">
                -
              </span>
              <span>
                <strong className="font-bold">Analyze with AI:</strong>{" "}
                {AI_EVALUATION_REPORT_ENABLED ? (
                  <>
                    Generates an on-page AI interpretation panel from the report data and the current profile plot.
                  </>
                ) : (
                  <span className="text-slate-600">
                    Generates an on-page AI interpretation panel once the AI add-on is enabled.
                  </span>
                )}
              </span>
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
}
