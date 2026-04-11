import {
  BRONZE_MAX_BOREHOLES_PER_PROJECT,
  BRONZE_MAX_PROJECTS,
  BRONZE_MAX_REPORTS_PER_DAY,
  BRONZE_MAX_SAMPLES_PER_BOREHOLE,
  SILVER_MAX_AI_ANALYSES_PER_DAY,
  type SubscriptionTier,
} from "@/lib/subscription";

function SubscriptionPlanColumn({
  tierId,
  currentTier,
  title,
  subtitle,
  className,
  titleClass,
  features,
}: {
  tierId: SubscriptionTier;
  currentTier: SubscriptionTier;
  title: string;
  subtitle: string;
  className: string;
  titleClass: string;
  features: string[];
}) {
  const isCurrent = currentTier === tierId;
  return (
    <div
      className={`flex flex-col rounded-2xl border-2 p-4 shadow-sm transition-shadow sm:p-5 ${className} ${
        isCurrent ? "ring-2 ring-offset-2 ring-offset-slate-50 ring-slate-900/80 shadow-md" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={`text-lg font-bold tracking-tight ${titleClass}`}>{title}</p>
          <p className="mt-0.5 text-xs font-medium opacity-90">{subtitle}</p>
        </div>
        {isCurrent ? (
          <span className="shrink-0 rounded-full bg-black/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900">
            Your tier
          </span>
        ) : null}
      </div>
      <ul className="mt-1 flex flex-1 flex-col gap-2.5 text-xs leading-snug sm:text-[13px]">
        {features.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-emerald-800/90" aria-hidden>
              ✓
            </span>
            <span className="text-left opacity-95">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const bronzeFeatures = [
  `Up to ${BRONZE_MAX_PROJECTS} projects`,
  `Up to ${BRONZE_MAX_BOREHOLES_PER_PROJECT} borehole IDs per project`,
  `Up to ${BRONZE_MAX_SAMPLES_PER_BOREHOLE} samples per borehole`,
  `Integrated parameter reports — max ${BRONZE_MAX_REPORTS_PER_DAY} PDFs per day (Europe/Istanbul)`,
  "Save analyses and matrix to the cloud",
  "AI profile interpretation — not included",
] as const;

const silverFeatures = [
  "Unlimited projects and boreholes",
  "Unlimited integrated reports and PDF exports",
  `AI analysis — max ${SILVER_MAX_AI_ANALYSES_PER_DAY} runs per day (Europe/Istanbul)`,
  "All Bronze features included",
] as const;

const goldFeatures = [
  "Unlimited projects, reports, and AI analyses",
  "Priority use of new features as they ship",
  "All Silver features included",
] as const;

export function MembershipTierColumns({
  effectiveTier,
  tierLoading,
}: {
  effectiveTier: SubscriptionTier;
  tierLoading: boolean;
}) {
  if (tierLoading) {
    return <p className="text-sm text-slate-500">Loading membership tiers…</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SubscriptionPlanColumn
        tierId="bronze"
        currentTier={effectiveTier}
        title="Bronze"
        subtitle="Default membership — copper tier"
        className="border-[#6B4423] bg-gradient-to-b from-[#f6ece3] via-[#e9d4c0] to-[#d4b896] text-[#2a1810] ring-[#8B5A2B]/35"
        titleClass="text-[#3d2314]"
        features={[...bronzeFeatures]}
      />
      <SubscriptionPlanColumn
        tierId="silver"
        currentTier={effectiveTier}
        title="Silver"
        subtitle="Full analysis capacity"
        className="border-slate-400/70 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/70 text-slate-900 ring-slate-500/30"
        titleClass="text-slate-900"
        features={[...silverFeatures]}
      />
      <SubscriptionPlanColumn
        tierId="gold"
        currentTier={effectiveTier}
        title="Gold"
        subtitle="No limits"
        className="border-amber-400/80 bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100/80 text-amber-950 ring-amber-500/35"
        titleClass="text-amber-950"
        features={[...goldFeatures]}
      />
    </div>
  );
}
