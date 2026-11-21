"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { EngineeringText } from "@/components/engineering-text";
import type { SubscriptionTier } from "@/lib/subscription";
import type { CalculationHeadline, CalculationResult, CalculationStep } from "@/lib/types";

/** What a viewer may see of the detailed calculation. */
export type DetailLevel = "guest" | "bronze" | "silver" | "gold";

export function detailLevelFor(isSignedIn: boolean, tier: SubscriptionTier): DetailLevel {
  if (!isSignedIn || tier === "none") return "guest";
  return tier;
}

export const DETAILS_ANCHOR = "detailed-calculations";

export function scrollToDetails() {
  document.getElementById(DETAILS_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ───────────────────────────── headline ───────────────────────────── */

export function ResultHeadline({ result, emptyText = "Run the calculation to see the result." }: { result: CalculationResult | null; emptyText?: string }) {
  if (!result) {
    return (
      <aside className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 shadow-sm">{emptyText}</aside>
    );
  }
  const headline: CalculationHeadline[] = result.headline?.length ? result.headline : result.items.slice(0, 1);
  const statuses = (result.headline ?? []).map((h) => h.status).filter(Boolean);
  const overall = statuses.length ? (statuses.every((s) => s === "pass") ? "pass" : "fail") : null;
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Result</p>
          <p className="text-sm font-semibold text-slate-800">
            <EngineeringText text={result.title} />
          </p>
        </div>
        {overall ? (
          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold text-white ${overall === "pass" ? "bg-emerald-700" : "bg-red-700"}`}>
            {overall === "pass" ? "✓ Passes" : "✗ Does not pass"}
          </span>
        ) : null}
      </div>
      <div className={`mt-3 grid gap-2 ${headline.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {headline.map((h, i) => {
          const status = h.status;
          const note = h.note;
          return (
            <div
              key={`${h.label}-${i}`}
              className={`rounded-lg border px-3 py-2 ${
                status === "fail" ? "border-red-200 bg-red-50" : status === "pass" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-xs text-slate-600">
                <EngineeringText text={h.label} />
              </p>
              <p className="text-xl font-semibold tabular-nums text-slate-900">
                {h.value}
                {h.unit ? <span className="ml-1 text-sm font-medium text-slate-600">{h.unit}</span> : null}
              </p>
              {note ? (
                <p className="text-[11px] text-slate-500">
                  <EngineeringText text={note} />
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={scrollToDetails} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-800 underline underline-offset-4 hover:text-slate-950">
        Detailed calculations <span aria-hidden="true">↓</span>
      </button>
    </aside>
  );
}

/* ───────────────────────────── detail gating ───────────────────────────── */

const LEVEL_COPY: Record<DetailLevel, { badge: string; next?: string }> = {
  guest: { badge: "Members only", next: "Sign up free (Bronze) to see every calculation step." },
  bronze: { badge: "Bronze · values", next: "Silver shows the formula behind every value, with your numbers substituted." },
  silver: { badge: "Silver · full derivation", next: "Gold adds a downloadable report of this calculation." },
  gold: { badge: "Gold · full derivation" },
};

/** Blurs its children for guests and shows a sign-up call to action on top. */
export function TierGate({
  level,
  children,
  minHeight = 160,
  title = "Detailed calculations are for members",
  message = "Create a free Bronze account to see every step of this calculation.",
}: {
  level: DetailLevel;
  children: ReactNode;
  minHeight?: number;
  title?: string;
  message?: string;
}) {
  if (level !== "guest") return <>{children}</>;
  return (
    <div className="relative" style={{ minHeight }}>
      <div aria-hidden="true" className="pointer-events-none select-none blur-[5px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-10">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white/95 px-5 py-4 text-center shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{message}</p>
          <div className="mt-3 flex justify-center gap-2">
            <Link href="/account?mode=signup" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
              Sign up free
            </Link>
            <Link href="/login" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-slate-500">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, index, showFormulas }: { step: CalculationStep; index: number; showFormulas: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">
        {index + 1}. <EngineeringText text={step.title} />
      </p>
      <dl className="mt-2 divide-y divide-slate-100">
        {step.lines.map((line, i) => (
          <div key={`${line.label}-${i}`} className="py-2">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <dt className="text-slate-700">
                <EngineeringText text={line.label} />
              </dt>
              <dd className="shrink-0 font-semibold tabular-nums text-slate-900">
                {line.value}
                {line.unit ? ` ${line.unit}` : ""}
              </dd>
            </div>
            {showFormulas && (line.formula || line.substituted) ? (
              <div className="mt-1 space-y-0.5 rounded-md bg-slate-50 px-3 py-1.5 font-serif text-[14px] text-slate-800">
                {line.formula ? (
                  <p>
                    <EngineeringText text={line.formula} />
                  </p>
                ) : null}
                {line.substituted ? (
                  <p className="text-slate-600">
                    = <EngineeringText text={line.substituted} />
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DetailedCalculations({
  result,
  level,
  equations = [],
  onOpenReport,
}: {
  result: CalculationResult;
  level: DetailLevel;
  /** Tool equations (HTML) shown to Silver/Gold when a calculator has no step formulas. */
  equations?: string[];
  onOpenReport?: () => void;
}) {
  const steps: CalculationStep[] = result.steps?.length ? result.steps : [{ title: "Calculated values", lines: result.items }];
  const hasStepFormulas = steps.some((s) => s.lines.some((l) => l.formula || l.substituted));
  const showFormulas = level === "silver" || level === "gold";
  const copy = LEVEL_COPY[level];

  return (
    <section id={DETAILS_ANCHOR} className="scroll-mt-28 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Detailed calculations</p>
          <h2 className="text-lg font-semibold text-slate-900">How the result was obtained</h2>
        </div>
        <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">{copy.badge}</span>
      </div>

      {copy.next && level !== "guest" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>{copy.next}</span>
          <Link href="/account" className="font-semibold underline underline-offset-2">
            Membership
          </Link>
        </div>
      ) : null}

      <TierGate level={level} minHeight={260}>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <StepCard key={`${step.title}-${i}`} step={step} index={i} showFormulas={showFormulas} />
          ))}
          {showFormulas && !hasStepFormulas && equations.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Governing equations</p>
              <ul className="mt-2 space-y-2">
                {equations.map((eq, i) => (
                  <li key={i} className="rounded-md bg-slate-50 px-3 py-2 font-serif text-[15px] text-slate-800" dangerouslySetInnerHTML={{ __html: eq }} />
                ))}
              </ul>
            </div>
          ) : null}
          {result.notes.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              {result.notes.map((n, i) => (
                <li key={i}>
                  <EngineeringText text={n} />
                </li>
              ))}
            </ul>
          ) : null}
          {showFormulas ? <p className="text-[11px] text-slate-500">Substituted values are in SI units.</p> : null}
        </div>
      </TierGate>

      {level === "gold" && onOpenReport ? (
        <button type="button" onClick={onOpenReport} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Open the report for this calculation
        </button>
      ) : null}
    </section>
  );
}
