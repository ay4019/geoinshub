"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { interpretProfileReportAction } from "@/app/actions/ai-report";
import { consumeReportGenerationAction } from "@/app/actions/subscription";
import { ScriptText } from "@/components/script-text";
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
  type ReportDocument,
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
        <h3 className="!mt-9 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900 first:!mt-0">
          <ScriptText text={block.text} />
        </h3>
      ) : (
        <h4 className="!mt-6 text-[15px] font-semibold text-slate-900">
          <ScriptText text={block.text} />
        </h4>
      );
    case "paragraph":
      return (
        <p className="text-[15px] leading-[1.7] text-slate-800">
          <ScriptText text={block.text} />
        </p>
      );
    case "equation":
      return (
        <div className="!my-4">
          <div className="flex items-baseline gap-3">
            <p className="min-w-0 flex-1 text-center font-serif text-base text-slate-900">
              <ScriptText text={block.text} />
            </p>
            <span className="w-8 shrink-0 text-right font-serif text-sm text-slate-500">{block.label}</span>
          </div>
          {block.where ? (
            <p className="mt-1 text-center text-[13px] leading-[1.5] text-slate-500">
              where <ScriptText text={block.where} />
            </p>
          ) : null}
        </div>
      );
    case "bullets":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] text-slate-800 marker:text-slate-400">
          {block.items.map((item, i) => (
            <li key={`${index}-${i}`}>
              <ScriptText text={item} />
            </li>
          ))}
        </ul>
      );
    case "keyValue":
      return (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 border-y border-slate-200 text-sm sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          {block.rows.map((row, i) => (
            <div key={`${index}-${i}`} className="contents">
              <dt className="border-b border-slate-100 py-2 text-slate-600 last-of-type:border-0">
                <ScriptText text={row.label} />
              </dt>
              <dd className="border-b border-slate-100 py-2 font-medium tabular-nums text-slate-900">
                <ScriptText text={row.value} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <figure className="!my-5 space-y-2">
          <figcaption className="text-sm font-medium text-slate-700">
            <ScriptText text={block.title} />
          </figcaption>
          <div className="overflow-x-auto">
            <table className="min-w-full border-y border-slate-300 text-right text-[13px] tabular-nums">
              <thead className="border-b border-slate-300 text-slate-600">
                <tr>
                  {block.columns.map((c, ci) => (
                    <th key={c.key} className={`whitespace-nowrap px-2.5 py-2 font-semibold ${ci === 0 ? "text-left" : ""}`}>
                      <ScriptText text={c.header} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={`${index}-${i}`} className="border-t border-slate-100">
                    {block.columns.map((c, ci) => (
                      <td key={c.key} className={`whitespace-nowrap px-2.5 py-1.5 text-slate-800 ${ci === 0 ? "text-left" : ""}`}>
                        <ScriptText text={row[c.key] ?? "—"} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case "figure":
      return (
        <figure className="!my-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
          <img src={block.dataUrl} alt={block.caption} className="mx-auto h-auto w-full max-w-[40rem]" />
          <figcaption className="mt-2 text-center text-sm text-slate-600">
            <ScriptText text={block.caption} />
          </figcaption>
        </figure>
      );
    case "ai":
      return (
        <div className="border-l-2 border-amber-600 pl-4">
          <p className="text-xs italic leading-[1.5] text-slate-500">{AI_INTERPRETATION_NOTICE}</p>
          <div className="mt-3 space-y-3 text-[15px] leading-[1.7] text-slate-800">
            {block.text
              .split(/\n\s*\n/g)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={`${index}-${i}`}>
                  <ScriptText text={p} />
                </p>
              ))}
          </div>
        </div>
      );
    case "references":
      return (
        <ul className="space-y-1.5 pl-4 text-[13px] leading-[1.6] text-slate-600 [text-indent:-1rem]">
          {block.items.map((item) => (
            <li key={item}>
              <ScriptText text={item} />
            </li>
          ))}
        </ul>
      );
    case "responsibility":
      return (
        <div className="space-y-2 text-[13px] leading-[1.6] text-slate-600">
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
      setStatus("Tool reports are available to Gold members.");
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
            Report preview and PDF export are available to Gold members.{" "}
            <Link href="/account" className="font-semibold underline underline-offset-2">
              See membership
            </Link>
            .
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

      {open && report ? <ReportArticle report={report} /> : null}
    </section>
  );
}

/** The report document itself (on-screen preview). Same blocks as the PDF. */
export function ReportArticle({ report }: { report: ReportDocument }) {
  return (
    <article
      className="mx-auto max-w-[52rem] space-y-4 rounded-lg border border-slate-200 bg-white px-5 py-7 sm:px-12 sm:py-10"
      aria-label="Report preview"
    >
      <header className="space-y-4 border-b-2 border-slate-800 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
          Geotechnical Insights Hub · Preliminary assessment
        </p>
        <h3 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-[1.75rem]">
          <ScriptText text={report.subject} />
        </h3>
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Tool</dt>
          <dd className="text-slate-900">
            <ScriptText text={report.toolTitle} />
          </dd>
          <dt className="text-slate-500">Project</dt>
          <dd className="text-slate-900">{report.projectName?.trim() || "Not specified"}</dd>
          <dt className="text-slate-500">Boreholes</dt>
          <dd className="text-slate-900">{report.boreholeIds.length ? report.boreholeIds.join(", ") : "As listed in the results"}</dd>
          <dt className="text-slate-500">Date</dt>
          <dd className="text-slate-900">
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </dd>
        </dl>
        <p className="text-xs leading-[1.5] text-slate-500">{REPORT_STATUS_BANNER}</p>
      </header>
      {report.blocks.map((block, i) => (
        <BlockView key={`${block.kind}-${i}`} block={block} index={i} />
      ))}
    </article>
  );
}
