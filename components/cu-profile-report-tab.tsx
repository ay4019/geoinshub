"use client";

import { useMemo, useState, useTransition } from "react";

import { interpretProfileReportAction } from "@/app/actions/ai-report";
import { createToolReportPdf } from "@/lib/tool-report-pdf";
import { getToolReportTemplate } from "@/lib/tool-report-templates";

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
  depthUnit?: string;
  stressUnit?: string;
  points?: CuProfileReportPoint[];
  columns?: Array<{ header: string; key: string }>;
  rows?: Array<Record<string, string>>;
  plotImageDataUrl?: string | null;
  getFreshPlotImageDataUrl?: () => Promise<string | null>;
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
  depthUnit,
  stressUnit,
  points = [],
  columns: customColumns,
  rows: customRows,
  plotImageDataUrl,
  getFreshPlotImageDataUrl,
}: CuProfileReportTabProps) {
  const [isPending, startTransition] = useTransition();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [aiText, setAiText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

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

  const tableRows = useMemo(() => (Array.isArray(customRows) ? customRows : generatedRows), [customRows, generatedRows]);
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

  const createAiInterpretation = async () => {
    const currentPlot = await resolvePlotImage();
    if (!currentPlot) {
      const fallback = "No profile plot is ready yet. Please complete Soil Profile Plot first.";
      setAiText(fallback);
      return fallback;
    }

    const text = await interpretProfileReportAction({
      toolSlug,
      toolTitle,
      depthUnit: resolvedDepthUnit,
      valueUnit: resolvedStressUnit,
      templateText: template.defaultNarrative,
      tableRows: normalizedRows,
      plotImageDataUrl: currentPlot,
      aiPromptHint: template.aiPromptHint,
    });
    setAiText(text);
    return text;
  };

  const handleReportPdf = async () => {
    const currentPlot = await resolvePlotImage();
    if (!currentPlot) {
      setStatus("No profile plot is ready yet. Please complete Soil Profile Plot first.");
      return;
    }

    setStatus(null);
    setIsExportingPdf(true);
    try {
      await createToolReportPdf({
        toolTitle,
        toolSlug,
        unitSystem: "metric",
        narrativeText: template.defaultNarrative,
        columns: normalizedColumns,
        rows: normalizedRows,
        plotImageDataUrl: currentPlot,
      });
      setStatus("PDF report downloaded.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleAiReportPdf = () => {
    startTransition(async () => {
      setStatus(null);
      const aiParagraph = aiText.trim() || (await createAiInterpretation());

      const currentPlot = await resolvePlotImage();
      if (!currentPlot) {
        setStatus("No profile plot is ready yet. Please complete Soil Profile Plot first.");
        return;
      }

      setIsExportingPdf(true);
      try {
        await createToolReportPdf({
          toolTitle,
          toolSlug,
          unitSystem: "metric",
          narrativeText: template.defaultNarrative,
          columns: normalizedColumns,
          rows: normalizedRows,
          plotImageDataUrl: currentPlot,
          aiParagraph,
        });
        setStatus("AI report PDF downloaded.");
      } finally {
        setIsExportingPdf(false);
      }
    });
  };

  const handleInterpretOnly = () => {
    startTransition(async () => {
      const text = await createAiInterpretation();
      setStatus(text ? "AI interpretation updated." : null);
    });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Report</h2>
        <p className="mt-1 text-sm text-slate-600">
          Based on the entered project and borehole information, together with the processed test results, a report
          containing the derived design parameters and the related profile plot can be generated from this section.
        </p>

        <div className="mt-4 flex justify-end">
          <div className="flex w-full max-w-[280px] flex-col gap-2">
            <button type="button" className="btn-base btn-md w-full" onClick={handleReportPdf} disabled={isExportingPdf}>
              {isExportingPdf ? "Preparing..." : "Download PDF Report"}
            </button>
            <button
              type="button"
              className="btn-base btn-md w-full"
              onClick={handleAiReportPdf}
              disabled={isPending || isExportingPdf}
            >
              {isPending ? "Generating..." : "Report with Evaluation"}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Report types</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-slate-400">
                -
              </span>
              <span>
                <strong>Download PDF Report:</strong> Exports the base report with calculation data tables and profile plot.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-slate-400">
                -
              </span>
              <span>
                <strong>Report with Evaluation:</strong> Includes the same base content plus an additional AI-supported
                interpretation paragraph.
              </span>
            </li>
          </ul>
        </div>

        {status ? (
          <p className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
        ) : null}
      </div>
    </section>
  );
}
