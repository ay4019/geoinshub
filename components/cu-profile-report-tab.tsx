"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";

import { interpretProfileReportAction } from "@/app/actions/ai-report";
import { consumeReportGenerationAction } from "@/app/actions/subscription";
import { useSubscription } from "@/components/subscription-context";
import { isSuccessfulAiInterpretationBody, sanitizeAiInterpretationText } from "@/lib/ai-interpretation-sanitize";
import { tierAllowsAiAnalysis, tierAllowsReports } from "@/lib/subscription";
import { createToolReportPdf } from "@/lib/tool-report-pdf";
import { AI_ANALYZE_BUTTON_CLASS } from "@/lib/report-button-styles";
import {
  CPRIME_REPORT_FIGURE_2_CAPTION,
  CPRIME_REPORT_REFERENCE_ENTRIES,
  CPRIME_REPORT_TABLE_1_TITLE,
  CU_REPORT_FIGURE_2_CAPTION,
  CU_REPORT_REFERENCE_ENTRIES,
  CU_REPORT_STROUD_FIGURE_CAPTION,
  CU_REPORT_STROUD_FIGURE_PLACEHOLDER,
  CU_REPORT_TABLE_1_TITLE,
  PHI_PI_REPORT_FIGURE_1_CAPTION,
  PHI_PI_REPORT_REFERENCE_ENTRIES,
  PHI_PI_REPORT_TABLE_1_TITLE,
  SPT_REPORT_FIGURE_1_CAPTION,
  SPT_REPORT_EQ_N160_PLACEHOLDER,
  SPT_REPORT_EQ_N60_PLACEHOLDER,
  SPT_REPORT_FIGURE_2_CAPTION,
  SPT_REPORT_REFERENCE_ENTRIES,
  SPT_REPORT_TABLE_2_TITLE,
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
  /** Guests cannot open the on-page report preview (Create Report). */
  isAuthenticated: boolean;
  authUserId?: string | null;
  projectId?: string | null;
  boreholeId?: string | null;
  unitSystem?: string;
  projectName?: string | null;
  boreholeIds?: string[];
  depthUnit?: string;
  stressUnit?: string;
  points?: CuProfileReportPoint[];
  columns?: Array<{ header: string; key: string }>;
  rows?: Array<Record<string, string>>;
  plotImageDataUrl?: string | null;
  /** Second profile figure (e.g. SPT (N1)60 vs depth). */
  plotImageDataUrl2?: string | null;
  getFreshPlotImageDataUrl?: () => Promise<string | null>;
  /** SPT Soil Profile Plot selections (hammer, ER, borehole diameter, sampler). */
  sptReportEquipment?: {
    hammerTypeLabel: string;
    energyRatioLabel: string;
    boreholeDiameterLabel: string;
    samplerLabel: string;
  } | null;
}

/** Gemini-backed AI interpretation is available through the server action. */
const AI_EVALUATION_REPORT_ENABLED = true;

const PDF_MEMBERSHIP_TITLE =
  "PDF export requires Bronze membership or higher. You can keep using the tools with manual inputs.";

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

const SPT_NARR_SPLIT =
  /(\(N1\)60|N_60|C_N|C_E|C_b|C_r|C_s|\bN60\b|c_u|f_1|\bf1\b)/g;

/** SPT report: C_E, C_b, C_r, C_s, C_N and (N1)60 with proper subscripts. */
function formatSptNarrativeTextWithSubscripts(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(SPT_NARR_SPLIT);
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
    if (part === "(N1)60") {
      return (
        <span key={k} className="whitespace-nowrap">
          <span>(</span>
          <span>N</span>
          <sub className={SUB_CLASS}>1</sub>
          <span>)</span>
          <sub className={SUB_CLASS}>60</sub>
        </span>
      );
    }
    if (part === "C_N") {
      return (
        <span key={k}>
          C<sub className={SUB_CLASS}>N</sub>
        </span>
      );
    }
    if (part === "C_E") {
      return (
        <span key={k}>
          C<sub className={SUB_CLASS}>E</sub>
        </span>
      );
    }
    if (part === "C_b") {
      return (
        <span key={k}>
          C<sub className={SUB_CLASS}>b</sub>
        </span>
      );
    }
    if (part === "C_r") {
      return (
        <span key={k}>
          C<sub className={SUB_CLASS}>r</sub>
        </span>
      );
    }
    if (part === "C_s") {
      return (
        <span key={k}>
          C<sub className={SUB_CLASS}>s</sub>
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
  const cprimeParens = /^c′\s*\(([^)]+)\)$/.exec(header);
  if (cprimeParens) {
    return (
      <>
        c′ ({cprimeParens[1]})
      </>
    );
  }
  const phiParens = /^φ′\s*\(([^)]+)\)$/.exec(header);
  if (phiParens) {
    return (
      <>
        φ′ ({phiParens[1]})
      </>
    );
  }
  if (header === "C_E") {
    return (
      <>
        C<sub className={SUB_CLASS}>E</sub>
      </>
    );
  }
  if (header === "C_b") {
    return (
      <>
        C<sub className={SUB_CLASS}>b</sub>
      </>
    );
  }
  if (header === "C_r") {
    return (
      <>
        C<sub className={SUB_CLASS}>r</sub>
      </>
    );
  }
  if (header === "C_N") {
    return (
      <>
        C<sub className={SUB_CLASS}>N</sub>
      </>
    );
  }
  if (header === "(N1)60") {
    return (
      <>
        (N<sub className={SUB_CLASS}>1</sub>)<sub className={SUB_CLASS}>60</sub>
      </>
    );
  }
  if (/σ′v0/.test(header)) {
    return <span>{header}</span>;
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

function isCprimeEquationLine(block: string): boolean {
  const s = block.trim().replace(/\s+/g, " ").replace(/x/gi, "×");
  return /^c′\s*=\s*0[.,]1\s*×\s*c_u\s*\(\s*kPa\s*\)$/i.test(s);
}

function isPhiPiEquationLine(block: string): boolean {
  const s = block
    .trim()
    .replace(/\s+/g, " ")
    .replace(/−/g, "-")
    .replace(/log₁₀/gi, "log10")
    .replace(/′/g, "'")
    .replace(/φ/g, "phi");
  return /^phi'?\s*=\s*45\s*-\s*14\s*log10\s*\(\s*PI\s*\)/i.test(s);
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

function ReportAiInterpretationGold({ text, toolSlug }: { text: string; toolSlug?: string }) {
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);
  const blocks = paragraphs.length ? paragraphs : [text.trim()].filter(Boolean);

  return (
    <div className="mt-10">
      <div className="rounded-xl border-2 border-amber-400 bg-[linear-gradient(165deg,#fffbeb,#fef3c7)] p-4 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-amber-950">AI Interpretation</h3>
          <span className="rounded-full border border-amber-500/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">
            Analyse with AI
          </span>
        </div>
        <div className="mt-3 space-y-3 text-sm leading-7 text-slate-800">
          {blocks.map((para, idx) => (
            <p key={`ai-p-${idx}`} className="text-justify">
              {toolSlug === "spt-corrections"
                ? formatSptNarrativeTextWithSubscripts(para, `ai-body-${idx}`)
                : formatNarrativeTextWithSubscripts(para, `ai-body-${idx}`)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function CprimeReportEquationDisplay() {
  return (
    <div className="my-5 flex w-full items-baseline justify-between gap-3 sm:gap-4">
      <span className="w-10 shrink-0 sm:w-12" aria-hidden />
      <p className="min-w-0 flex-1 text-center font-serif text-[16px] italic leading-relaxed tracking-wide text-slate-900 sm:text-[17px]">
        <span className="inline-flex flex-wrap items-baseline justify-center gap-x-0.5">
          <span>c′</span>
          <span className="mx-0.5">=</span>
          <span>0.1</span>
          <span className="mx-0.5 translate-y-px font-serif">×</span>
          <span>
            c<sub className={SUB_CLASS}>u</sub>
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

function PhiPiReportEquationDisplay() {
  return (
    <div className="my-5 flex w-full items-baseline justify-between gap-3 sm:gap-4">
      <span className="w-10 shrink-0 sm:w-12" aria-hidden />
      <p className="min-w-0 flex-1 text-center font-serif text-[16px] italic leading-relaxed tracking-wide text-slate-900 sm:text-[17px]">
        <span className="inline-flex flex-wrap items-baseline justify-center gap-x-0.5">
          <span>φ′</span>
          <span className="mx-0.5">=</span>
          <span>45</span>
          <span className="mx-0.5">−</span>
          <span>14</span>
          <span className="mx-0.5">log</span>
          <sub className={SUB_CLASS}>10</sub>
          <span>(PI)</span>
          <span className="ml-1">(deg)</span>
        </span>
      </p>
      <span className="w-10 shrink-0 text-right font-serif text-[13px] font-semibold not-italic tracking-tight text-slate-700 sm:w-12 sm:text-sm">
        Eq.1
      </span>
    </div>
  );
}

function SptN60ReportEquationDisplay() {
  return (
    <div className="my-5 flex w-full items-baseline justify-between gap-3 sm:gap-4">
      <span className="w-10 shrink-0 sm:w-12" aria-hidden />
      <p className="min-w-0 flex-1 text-center font-serif text-[16px] italic leading-relaxed tracking-wide text-slate-900 sm:text-[17px]">
        <span className="inline-flex flex-wrap items-baseline justify-center gap-x-0.5">
          <span>
            N<sub className={SUB_CLASS}>60</sub>
          </span>
          <span className="mx-0.5">=</span>
          <span className="italic">N</span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>R</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>S</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>b</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>E</sub>
          </span>
        </span>
      </p>
      <span className="w-10 shrink-0 text-right font-serif text-[13px] font-semibold not-italic tracking-tight text-slate-700 sm:w-12 sm:text-sm">
        Eq.1
      </span>
    </div>
  );
}

function SptN160ReportEquationDisplay() {
  return (
    <div className="my-5 flex w-full items-baseline justify-between gap-3 sm:gap-4">
      <span className="w-10 shrink-0 sm:w-12" aria-hidden />
      <p className="min-w-0 flex-1 text-center font-serif text-[16px] italic leading-relaxed tracking-wide text-slate-900 sm:text-[17px]">
        <span className="inline-flex flex-wrap items-baseline justify-center gap-x-0.5">
          <span className="whitespace-nowrap">
            <span>(</span>
            <span>N</span>
            <sub className={SUB_CLASS}>1</sub>
            <span>)</span>
            <sub className={SUB_CLASS}>60</sub>
          </span>
          <span className="mx-0.5">=</span>
          <span className="italic">N</span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>N</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>R</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>S</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>b</sub>
          </span>
          <span className="mx-0.5 translate-y-px font-serif not-italic">×</span>
          <span>
            C<sub className={SUB_CLASS}>E</sub>
          </span>
        </span>
      </p>
      <span className="w-10 shrink-0 text-right font-serif text-[13px] font-semibold not-italic tracking-tight text-slate-700 sm:w-12 sm:text-sm">
        Eq.2
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

export function CuProfileReportTab({
  toolSlug,
  toolTitle,
  isAuthenticated,
  projectId = null,
  boreholeId = null,
  unitSystem,
  projectName,
  boreholeIds,
  depthUnit,
  stressUnit,
  points = [],
  columns: customColumns,
  rows: customRows,
  plotImageDataUrl,
  plotImageDataUrl2 = null,
  getFreshPlotImageDataUrl,
  sptReportEquipment = null,
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
      return "AI analysis requires Gold membership. Sign up; new accounts start on Bronze, then you can upgrade.";
    }
    return "AI analysis requires Gold membership.";
  }, [aiTierOk, effectiveTier, subscriptionLoading]);
  const [isPending, startTransition] = useTransition();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isAiPanelVisible, setIsAiPanelVisible] = useState(false);
  const [isAiPanelDismissed, setIsAiPanelDismissed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [reportPanelOpen, setReportPanelOpen] = useState(false);
  /** After Analyse with AI completes successfully once, the top Analyse with AI button stays off until page reload. */
  const [analyzeWithAiLockedThisSession, setAnalyzeWithAiLockedThisSession] = useState(false);
  const reportRegionRef = useRef<HTMLDivElement | null>(null);
  const reportPanelContentId = useId();

  const template = useMemo(() => getToolReportTemplate(toolSlug), [toolSlug]);
  const resolvedDepthUnit = depthUnit ?? "m";
  const resolvedStressUnit = stressUnit ?? "kPa";

  const generatedRows = useMemo(
    () =>
      toolSlug === "cprime-from-cu" || toolSlug === "friction-angle-from-pi" || toolSlug === "spt-corrections"
        ? []
        : [...points]
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
    [points, resolvedDepthUnit, resolvedStressUnit, toolSlug],
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

  const hasData = useMemo(() => {
    if (toolSlug === "spt-corrections") {
      return Boolean(plotImageDataUrl && plotImageDataUrl2);
    }
    return Boolean(plotImageDataUrl) || typeof getFreshPlotImageDataUrl === "function";
  }, [getFreshPlotImageDataUrl, plotImageDataUrl, plotImageDataUrl2, toolSlug]);

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
    const sptEquipmentParagraph =
      toolSlug === "spt-corrections" && sptReportEquipment
        ? `For this assessment, the following SPT testing and equipment assumptions were adopted: hammer type — ${sptReportEquipment.hammerTypeLabel}; hammer energy ratio (ER) — ${sptReportEquipment.energyRatioLabel}; borehole diameter classification — ${sptReportEquipment.boreholeDiameterLabel}; sampler configuration — ${sptReportEquipment.samplerLabel}. These selections determine the energy correction factor C_E, the borehole diameter factor C_b, and the sampler factor C_s applied in the computations.`
        : toolSlug === "spt-corrections"
          ? "SPT equipment inputs (hammer type, hammer energy ratio ER, borehole diameter class, and sampler configuration) are taken from the Soil Profile Plot tab; configure them there before exporting the report."
          : "";
    return template.defaultNarrative
      .replaceAll("{{boreholes}}", boreholeText)
      .replaceAll("{{projectName}}", projectText)
      .replaceAll("{{sptEquipmentParagraph}}", sptEquipmentParagraph);
  }, [boreholeIds, projectName, sptReportEquipment, template.defaultNarrative, toolSlug]);

  const aiInterpretationShowing = Boolean(aiText.trim() && isAiPanelVisible && !isAiPanelDismissed);

  useEffect(() => {
    if (!isAuthenticated) {
      setReportPanelOpen(false);
      setIsAiPanelVisible(false);
      setIsAiPanelDismissed(true);
      setAiText("");
    }
  }, [isAuthenticated]);

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
      setStatus("Sign in or create an account to preview the report.");
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
    if (toolSlug === "spt-corrections" && (!currentPlot || !plotImageDataUrl2)) {
      return "Both SPT profile plots (N60 and (N1)60) are required for AI analysis. Open Soil Profile Plot and ensure charts are generated.";
    }

    const raw = await interpretProfileReportAction({
      toolSlug,
      toolTitle,
      depthUnit: resolvedDepthUnit,
      valueUnit: resolvedStressUnit,
      resolvedNarrative: resolvedNarrative
        .replaceAll(CU_REPORT_STROUD_FIGURE_PLACEHOLDER, "")
        .replaceAll(
          SPT_REPORT_EQ_N60_PLACEHOLDER,
          "Equation (1) states N60 equals N times C_r, C_s, C_b, and C_E.",
        )
        .replaceAll(
          SPT_REPORT_EQ_N160_PLACEHOLDER,
          "Equation (2) states (N1)60 equals N times C_N, C_r, C_s, C_b, and C_E.",
        )
        .replace(/\n{3,}/g, "\n\n"),
      tableRows: normalizedRows,
      plotImageDataUrl: currentPlot,
      plotImageDataUrl2: toolSlug === "spt-corrections" ? plotImageDataUrl2 : null,
      aiPromptHint: template.aiPromptHint,
    });
    const text = raw ? sanitizeAiInterpretationText(raw) : "";
    setAiText(text);
    setIsAiPanelVisible(true);
    setIsAiPanelDismissed(false);
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
    if (toolSlug === "spt-corrections" && !plotImageDataUrl2) {
      setStatus("Both SPT profile plots (N60 and (N1)60) are required. Open Soil Profile Plot and ensure charts are generated.");
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
        plotImageDataUrl2: toolSlug === "spt-corrections" ? plotImageDataUrl2 : null,
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
      setReportPanelOpen(true);
      window.setTimeout(() => {
        reportRegionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 160);
      return;
    }
    startTransition(async () => {
      setStatus(null);
      const text = await createAiInterpretation();
      if (text && isSuccessfulAiInterpretationBody(text)) {
        setAnalyzeWithAiLockedThisSession(true);
        setReportPanelOpen(true);
        setStatus("AI interpretation generated.");
        window.setTimeout(() => {
          reportRegionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 180);
      } else if (text) {
        setStatus(text);
      } else {
        setStatus(null);
      }
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
          <div>
            <h2 className="text-lg font-bold text-slate-900">Report</h2>
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
          ) : (
            <p className="text-sm leading-relaxed text-slate-700">
              Create report builds the draft report for this tool and opens it in the panel below; press it again to hide
              only that preview. <strong className="font-semibold text-slate-900">Download PDF</strong> is available for
              eligible accounts once the Soil Profile Plot is ready. For a quick AI interpretation of the tabulated
              values and the profile plot, use <strong className="font-semibold text-slate-900">Analyse with AI</strong>.
            </p>
          )}

          <div className="mx-auto flex w-full max-w-md flex-col gap-3">
            <button
              type="button"
              className="btn-base btn-md flex w-full items-center justify-center gap-2"
              aria-expanded={reportPanelOpen}
              aria-controls={reportPanelContentId}
              onClick={() => handleToggleReportPanel()}
              disabled={!isAuthenticated && !reportPanelOpen}
              title={
                !isAuthenticated && !reportPanelOpen ? "Sign in or create an account to preview the report." : undefined
              }
            >
              <span>
                {reportPanelOpen
                  ? "Close report"
                  : analyzeWithAiLockedThisSession
                    ? "Open report"
                    : "Create report"}
              </span>
              {reportPanelOpen ? (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
            <button
              type="button"
              className={`${AI_ANALYZE_BUTTON_CLASS} w-full`}
              onClick={handleAiReport}
              disabled={
                !AI_EVALUATION_REPORT_ENABLED ||
                isPending ||
                isExportingPdf ||
                !aiTierOk ||
                subscriptionLoading ||
                analyzeWithAiLockedThisSession
              }
              title={
                analyzeWithAiLockedThisSession
                  ? "Analyse with AI was used this session. Refresh the page to run it again."
                  : aiButtonTitle
              }
            >
              {isPending ? "Analysing..." : "Analyse with AI"}
            </button>
          </div>

          {status ? (
            <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
              {status}
            </p>
          ) : null}

          {reportPanelOpen ? (
          <div
            ref={reportRegionRef}
            id={reportPanelContentId}
            className="mx-auto mt-6 w-full max-w-none rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:p-5"
            role="region"
            aria-label="Report preview"
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Report narrative</h3>
            <div className="mt-4 space-y-4 pr-0.5 text-left text-sm leading-7 text-slate-800 sm:mt-5 sm:text-[15px] sm:leading-8">
              {narrativeBlocks.map((block, i) => {
                if (block.trim() === SPT_REPORT_EQ_N60_PLACEHOLDER) {
                  return <SptN60ReportEquationDisplay key={`narr-${i}`} />;
                }
                if (block.trim() === SPT_REPORT_EQ_N160_PLACEHOLDER) {
                  return <SptN160ReportEquationDisplay key={`narr-${i}`} />;
                }
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
                if (toolSlug === "cprime-from-cu" && isCprimeEquationLine(block)) {
                  return <CprimeReportEquationDisplay key={`narr-${i}`} />;
                }
                if (toolSlug === "friction-angle-from-pi" && isPhiPiEquationLine(block)) {
                  return <PhiPiReportEquationDisplay key={`narr-${i}`} />;
                }
                if (toolSlug === "cu-from-pi-and-spt" && isCuEquationLine(block)) {
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
                    {toolSlug === "spt-corrections"
                      ? formatSptNarrativeTextWithSubscripts(block, `narr-${i}`)
                      : formatNarrativeTextWithSubscripts(block, `narr-${i}`)}
                  </p>
                );
              })}
            </div>

            {toolSlug === "cu-from-pi-and-spt" ||
            toolSlug === "cprime-from-cu" ||
            toolSlug === "friction-angle-from-pi" ||
            toolSlug === "spt-corrections" ? (
              <div className="mt-6">
                <p className={`${CU_REPORT_CAPTION_TEXT_CLASS} mx-auto max-w-3xl`}>
                  {toolSlug === "spt-corrections"
                    ? formatSptNarrativeTextWithSubscripts(SPT_REPORT_TABLE_2_TITLE, "tbl1-title")
                    : formatNarrativeTextWithSubscripts(
                        toolSlug === "cprime-from-cu"
                          ? CPRIME_REPORT_TABLE_1_TITLE
                          : toolSlug === "friction-angle-from-pi"
                            ? PHI_PI_REPORT_TABLE_1_TITLE
                            : CU_REPORT_TABLE_1_TITLE,
                        "tbl1-title",
                      )}
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
                        alt={
                          toolSlug === "cprime-from-cu"
                            ? CPRIME_REPORT_FIGURE_2_CAPTION
                            : toolSlug === "friction-angle-from-pi"
                              ? PHI_PI_REPORT_FIGURE_1_CAPTION
                              : toolSlug === "spt-corrections"
                                ? SPT_REPORT_FIGURE_1_CAPTION
                                : CU_REPORT_FIGURE_2_CAPTION
                        }
                        className="h-auto max-h-[min(65vh,36rem)] w-full max-w-5xl rounded-lg border border-slate-200 bg-white object-contain object-center sm:max-h-[min(70vh,40rem)]"
                      />
                    </div>
                    <figcaption className={`mt-2 ${CU_REPORT_CAPTION_TEXT_CLASS}`}>
                      {toolSlug === "spt-corrections"
                        ? formatSptNarrativeTextWithSubscripts(SPT_REPORT_FIGURE_1_CAPTION, "fig2-cap")
                        : formatNarrativeTextWithSubscripts(
                            toolSlug === "cprime-from-cu"
                              ? CPRIME_REPORT_FIGURE_2_CAPTION
                              : toolSlug === "friction-angle-from-pi"
                                ? PHI_PI_REPORT_FIGURE_1_CAPTION
                                : CU_REPORT_FIGURE_2_CAPTION,
                            "fig2-cap",
                          )}
                    </figcaption>
                  </figure>
                ) : (
                  <p className="mt-8 text-justify text-sm text-slate-500">
                    Soil profile plot appears below after you open the Soil Profile Plot tab and the chart is generated.
                  </p>
                )}

                {toolSlug === "spt-corrections" && plotImageDataUrl2 ? (
                  <figure className="mt-10 w-full">
                    <div className="flex w-full justify-center">
                      <img
                        src={plotImageDataUrl2}
                        alt={SPT_REPORT_FIGURE_2_CAPTION}
                        className="h-auto max-h-[min(65vh,36rem)] w-full max-w-5xl rounded-lg border border-slate-200 bg-white object-contain object-center sm:max-h-[min(70vh,40rem)]"
                      />
                    </div>
                    <figcaption className={`mt-2 ${CU_REPORT_CAPTION_TEXT_CLASS}`}>
                      {formatSptNarrativeTextWithSubscripts(SPT_REPORT_FIGURE_2_CAPTION, "spt-fig2-cap")}
                    </figcaption>
                  </figure>
                ) : null}

                {aiInterpretationShowing ? <ReportAiInterpretationGold text={aiText} toolSlug={toolSlug} /> : null}

                <div className="mt-10 border-t border-slate-200 pt-6">
                  <h3 className="text-base font-bold text-slate-900">2. References</h3>
                  <ul className="mt-3 list-none space-y-3 text-justify text-sm leading-relaxed text-slate-700">
                    {(toolSlug === "cprime-from-cu"
                      ? CPRIME_REPORT_REFERENCE_ENTRIES
                      : toolSlug === "friction-angle-from-pi"
                        ? PHI_PI_REPORT_REFERENCE_ENTRIES
                        : toolSlug === "spt-corrections"
                          ? SPT_REPORT_REFERENCE_ENTRIES
                          : CU_REPORT_REFERENCE_ENTRIES
                    ).map(
                      (entry, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="shrink-0 text-slate-400" aria-hidden>
                            -
                          </span>
                          <span>{entry}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            ) : null}

            {!(
              toolSlug === "cu-from-pi-and-spt" ||
              toolSlug === "cprime-from-cu" ||
              toolSlug === "friction-angle-from-pi" ||
              toolSlug === "spt-corrections"
            ) && aiInterpretationShowing ? (
              <ReportAiInterpretationGold text={aiText} toolSlug={toolSlug} />
            ) : null}
          </div>
        ) : null}

        {reportPanelOpen ? (
          <div className="mx-auto mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <button
              type="button"
              className="btn-base btn-md w-full sm:w-auto sm:min-w-[11rem]"
              onClick={() => void handleReportPdf()}
              disabled={isExportingPdf || !reportsOk}
              title={!reportsOk ? PDF_MEMBERSHIP_TITLE : undefined}
            >
              {isExportingPdf ? "Preparing…" : "Download Report"}
            </button>
            <button type="button" className="btn-base btn-md w-full sm:w-auto sm:min-w-[11rem]" onClick={handleCloseAllReportUi}>
              Close Report
            </button>
          </div>
        ) : null}

        {reportsOk ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
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
                  <strong className="font-bold">Analyse with AI:</strong>{" "}
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
        ) : null}

        </div>
      </div>
    </section>
  );
}
