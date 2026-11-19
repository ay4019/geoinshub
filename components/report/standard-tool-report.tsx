"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { interpretProfileReportAction } from "@/app/actions/ai-report";
import { consumeReportGenerationAction } from "@/app/actions/subscription";
import { useSubscription } from "@/components/subscription-context";
import { isSuccessfulAiInterpretationBody, sanitizeAiInterpretationText } from "@/lib/ai-interpretation-sanitize";
import {
  AI_DATA_SHARING_NOTICE,
  AI_INTERPRETATION_NOTICE,
  REPORT_RESPONSIBILITY_PARAGRAPHS,
  REPORT_STATUS_BANNER,
} from "@/lib/legal/report-disclaimer";
import { AI_ANALYZE_BUTTON_CLASS } from "@/lib/report-button-styles";
import { buildDepthProfileChartPng } from "@/lib/reports/depth-profile-chart";
import { getStandardReportContent } from "@/lib/reports/standard-report-content";
import {
  buildStandardReportDocument,
  reportMethodText,
  type ReportBlock,
} from "@/lib/reports/standard-report-document";
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";
import { tierAllowsAiAnalysis, tierAllowsReports } from "@/lib/subscription";

interface StandardToolReportProps {
  toolSlug: string;
  toolTitle: string;
  assumptions: string[];
  limitations: string[];
  unitSystem: string;
  projectName: string | null;
  boreholeIds: string[];
  payload: StandardReportPayload | null;
  /** Where the user prepares the data (e.g. "Soil Profile Plot" or "Calculation"). */
  sourceTabLabel: string;
}

function BlockView({ block, index }: { block: ReportBlock; index: number }) {
  switch (block.kind) {
    case "heading":
      return block.level === 1 ? (
        <h3 className="mt-8 border-b border-slate-200 pb-1.5 text-base font-bold text-[#163d6b] first:mt-0 sm:text-lg">{block.text}</h3>
      ) : (
        <h4 className="mt-5 text-sm font-bold text-slate-900 sm:text-[15px]">{block.text}</h4>
      );
    case "paragraph":
      return <p className="text-justify text-sm leading-7 text-slate-800 sm:text-[15px]">{block.text}</p>;
    case "equation":
      return (
        <div className="my-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="w-8 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 text-center font-serif text-[15px] italic text-slate-900 sm:text-base">{block.text}</p>
            <span className="w-8 shrink-0 text-right font-serif text-sm text-slate-600">{block.label}</span>
          </div>
          {block.where ? <p className="mt-1 pl-8 text-xs leading-5 text-slate-500">where {block.where}</p> : null}
        </div>
      );
    case "bullets":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-800">
          {block.items.map((item, i) => (
            <li key={`${index}-${i}`}>{item}</li>
          ))}
        </ul>
      );
    case "keyValue":
      return (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{block.title}</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={`${index}-${i}`} className="border border-slate-200">
                  <th className="w-[42%] bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-700">{row.label}</th>
                  <td className="px-3 py-1.5 text-slate-900">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "table":
      return (
        <div className="space-y-1.5">
          <p className="text-center text-sm font-medium text-slate-700">{block.title}</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-center text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {block.columns.map((c) => (
                    <th key={c.key} className="px-2 py-2 font-semibold">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={`${index}-${i}`} className="border-t border-slate-200">
                    {block.columns.map((c) => (
                      <td key={c.key} className="px-2 py-1.5 text-slate-800">
                        {row[c.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "figure":
      return (
        <figure className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
          <img src={block.dataUrl} alt={block.caption} className="mx-auto h-auto w-full max-w-2xl rounded border border-slate-200 bg-white" />
          <figcaption className="mt-2 text-center text-sm font-medium text-slate-700">{block.caption}</figcaption>
        </figure>
      );
    case "ai":
      return (
        <div className="rounded-xl border-2 border-amber-400 bg-[linear-gradient(165deg,#fffbeb,#fef3c7)] p-4 sm:p-5">
          <p className="text-xs italic leading-5 text-amber-900">{AI_INTERPRETATION_NOTICE}</p>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-800">
            {block.text
              .split(/\n\s*\n/g)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={`${index}-${i}`} className="text-justify">
                  {p}
                </p>
              ))}
          </div>
        </div>
      );
    case "references":
      return (
        <ul className="space-y-1.5 pl-4 text-sm leading-6 text-slate-700 [text-indent:-1rem]">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "responsibility":
      return (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-[13px] leading-6 text-slate-700">
          {REPORT_RESPONSIBILITY_PARAGRAPHS.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      );
  }
}

export function StandardToolReport({
  toolSlug,
  toolTitle,
  assumptions,
  limitations,
  unitSystem,
  projectName,
  boreholeIds,
  payload,
  sourceTabLabel,
}: StandardToolReportProps) {
  const content = getStandardReportContent(toolSlug);
  const { effectiveTier, loading: subscriptionLoading } = useSubscription();
  const reportsOk = tierAllowsReports(effectiveTier);
  const aiTierOk = tierAllowsAiAnalysis(effectiveTier);
  const [open, setOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // A new data set invalidates a previous AI interpretation.
  useEffect(() => {
    setAiText("");
  }, [payload]);

  const figures = useMemo(() => {
    if (!payload) return [];
    return payload.series.map((series) => ({
      seriesKey: series.key,
      dataUrl: buildDepthProfileChartPng({
        title: `Depth vs ${series.label}`,
        series,
        points: payload.points,
        depthUnit: payload.depthUnit,
      }),
    }));
  }, [payload]);

  const report = useMemo(() => {
    if (!content || !payload) return null;
    return buildStandardReportDocument({
      content,
      ctx: { toolSlug, toolTitle, projectName, boreholeIds, unitSystem, assumptions, limitations },
      payload,
      figures,
      aiText,
    });
  }, [aiText, assumptions, boreholeIds, content, figures, limitations, payload, projectName, toolSlug, toolTitle, unitSystem]);

  if (!content) {
    return null;
  }

  const hasData = Boolean(payload && (payload.rows.length || payload.keyResults?.length));

  const handlePdf = async () => {
    if (!report) return;
    if (!reportsOk) {
      setStatus("PDF export requires Bronze membership or higher.");
      return;
    }
    setExporting(true);
    setStatus(null);
    try {
      const quota = await consumeReportGenerationAction();
      if (!quota.ok) {
        setStatus(quota.message);
        return;
      }
      const { createStandardReportPdf } = await import("@/lib/reports/standard-report-pdf");
      await createStandardReportPdf(report, toolSlug);
      setStatus("Report created — PDF downloaded.");
    } catch {
      setStatus("The PDF could not be created. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleAi = () => {
    if (!payload || !content) return;
    startTransition(async () => {
      setStatus(null);
      const raw = await interpretProfileReportAction({
        toolSlug,
        toolTitle,
        depthUnit: payload.depthUnit,
        valueUnit: payload.series[0]?.unit ?? "",
        resolvedNarrative: reportMethodText(content, payload),
        tableRows: payload.rows.length
          ? payload.rows
          : (payload.keyResults ?? []).map((r) => ({ Parameter: r.label, Value: r.value })),
        plotImageDataUrl: figures[0]?.dataUrl || null,
        plotImageDataUrl2: figures[1]?.dataUrl || null,
        aiPromptHint: content.aiHint,
        primaryValueKeys: payload.series.map((s) => s.key),
      });
      const text = raw ? sanitizeAiInterpretationText(raw) : "";
      if (text && isSuccessfulAiInterpretationBody(text)) {
        setAiText(text);
        setOpen(true);
        setStatus("AI interpretation added to the report. Review it critically before use.");
      } else {
        setStatus(text || "The AI interpretation could not be generated. Please try again.");
      }
    });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Report</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          The report has two parts: <strong>general information</strong> on the method, equations, assumptions and
          references, followed by the <strong>project-specific assessment</strong> built from the data on the{" "}
          {sourceTabLabel} tab — inputs, results table, profile figures and a statistical summary. Update the data there
          and the report follows automatically.
        </p>
        {!reportsOk ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Report preview and PDF export require a member account.{" "}
            <Link href="/account?mode=signup" className="font-semibold underline underline-offset-2">
              Sign up
            </Link>{" "}
            to use reports.
          </p>
        ) : null}

        <div className="mx-auto mt-5 flex w-full max-w-md flex-col gap-3">
          <button
            type="button"
            className="btn-base btn-md w-full"
            onClick={() => setOpen((v) => !v)}
            disabled={!hasData || !reportsOk}
            title={!hasData ? `Prepare data on the ${sourceTabLabel} tab first.` : undefined}
          >
            {open ? "Close report" : "Create report"}
          </button>
          <button type="button" className="btn-base btn-md w-full" onClick={() => void handlePdf()} disabled={!hasData || exporting || !reportsOk}>
            {exporting ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            className={AI_ANALYZE_BUTTON_CLASS}
            onClick={handleAi}
            disabled={!hasData || isPending || !aiTierOk || subscriptionLoading}
            title={!aiTierOk ? "AI analysis requires Gold membership." : undefined}
          >
            {isPending ? "Analysing…" : aiText ? "Re-run AI analysis" : "Analyse with AI"}
          </button>
          <p className="text-center text-[11px] leading-4 text-slate-500">{AI_DATA_SHARING_NOTICE}</p>
        </div>

        {!hasData ? (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            No results yet. Enter data on the {sourceTabLabel} tab, then return here.
          </p>
        ) : null}
        {status ? (
          <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
        ) : null}
      </div>

      {open && report ? (
        <article className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-6" aria-label="Report preview">
          <header className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Geotechnical Insights Hub · Preliminary assessment report
            </p>
            <h3 className="text-xl font-bold text-slate-900">{report.subject}</h3>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="font-semibold text-slate-600">Tool</dt>
              <dd className="text-slate-900">{toolTitle}</dd>
              <dt className="font-semibold text-slate-600">Project</dt>
              <dd className="text-slate-900">{projectName?.trim() || "Not specified"}</dd>
              <dt className="font-semibold text-slate-600">Boreholes</dt>
              <dd className="text-slate-900">{boreholeIds.length ? boreholeIds.join(", ") : "As listed in the results table"}</dd>
            </dl>
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
              {REPORT_STATUS_BANNER}
            </p>
          </header>
          {report.blocks.map((block, i) => (
            <BlockView key={`${block.kind}-${i}`} block={block} index={i} />
          ))}
        </article>
      ) : null}
    </section>
  );
}
