import {
  BRONZE_MAX_BOREHOLES_PER_PROJECT,
  BRONZE_MAX_PROJECTS,
  BRONZE_MAX_SAMPLES_PER_BOREHOLE,
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
              +
            </span>
            <span className="text-left opacity-95">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const bronzeFeatures = [
  "Free — every new account starts here",
  "Calculation steps with every intermediate value (e.g. Nq, CSR, CRR)",
  "Tool Information tab: method, equations, assumptions and references",
  "Save analyses and project data to the cloud",
  `Up to ${BRONZE_MAX_PROJECTS} projects, ${BRONZE_MAX_BOREHOLES_PER_PROJECT} boreholes per project, ${BRONZE_MAX_SAMPLES_PER_BOREHOLE} samples per borehole`,
] as const;

const silverFeatures = [
  "Full derivations: every formula with your numbers substituted",
  "Unlimited projects, boreholes and samples",
  "Further questions in blog research articles (guided follow-ups)",
  "All Bronze features included",
] as const;

const goldFeatures = [
  "Tool reports: Create report and Download PDF",
  "Excel export of profile tables and the project parameter matrix",
  "AI analysis in profile tools and the AI engineering report for projects (weekly quota may apply)",
  "AASHTO and TBDY design codes in the pile capacity tool",
  "Priority access to new features",
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
    return <p className="text-sm text-slate-500">Loading membership tiers...</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SubscriptionPlanColumn
        tierId="bronze"
        currentTier={effectiveTier}
        title="Bronze"
        subtitle="Free membership — step values"
        className="border-[#6B4423] bg-gradient-to-b from-[#f6ece3] via-[#e9d4c0] to-[#d4b896] text-[#2a1810] ring-[#8B5A2B]/35"
        titleClass="text-[#3d2314]"
        features={[...bronzeFeatures]}
      />
      <SubscriptionPlanColumn
        tierId="silver"
        currentTier={effectiveTier}
        title="Silver"
        subtitle="Full calculation derivations"
        className="border-slate-400/70 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/70 text-slate-900 ring-slate-500/30"
        titleClass="text-slate-900"
        features={[...silverFeatures]}
      />
      <SubscriptionPlanColumn
        tierId="gold"
        currentTier={effectiveTier}
        title="Gold"
        subtitle="Reports, exports, AI and premium codes"
        className="border-amber-400/80 bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100/80 text-amber-950 ring-amber-500/35"
        titleClass="text-amber-950"
        features={[...goldFeatures]}
      />
    </div>
  );
}
