"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useSubscription } from "@/components/subscription-context";
import { AI_ANALYZE_BUTTON_CLASS } from "@/lib/report-button-styles";
import { tierAllowsAiAnalysis, tierAllowsReports } from "@/lib/subscription";

const AI_EVALUATION_REPORT_ENABLED = true;

/**
 * Shown on the Report tab for signed-out users on tools that do not yet ship a full report template.
 * Matches the marketing layout of the c_u / PI–SPT report tab so the experience looks “ready” before login.
 */
export function ReportGuestPanel() {
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
              disabled
              title="Sign in to preview the report."
            >
              Create report
            </button>
            <button
              type="button"
              className={`${AI_ANALYZE_BUTTON_CLASS} max-w-[280px]`}
              disabled={!AI_EVALUATION_REPORT_ENABLED || !aiTierOk || subscriptionLoading}
              title={aiButtonTitle}
            >
              Analyze with AI
            </button>
          </div>
        </div>

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
