export type SubscriptionTier = "none" | "bronze" | "silver" | "gold";

export interface TierLimits {
  maxProjects: number;
  maxBoreholesPerProject: number;
  maxSamplesPerBorehole: number;
}

export const BRONZE_MAX_PROJECTS = 3;
export const BRONZE_MAX_BOREHOLES_PER_PROJECT = 5;
export const BRONZE_MAX_SAMPLES_PER_BOREHOLE = 30;
export const BRONZE_MAX_REPORTS_PER_DAY = 15;
export const SILVER_MAX_AI_ANALYSES_PER_DAY = 5;

export function normaliseSubscriptionTier(value: string | null | undefined): SubscriptionTier {
  if (value === "bronze" || value === "silver" || value === "gold" || value === "none") {
    return value;
  }
  return "none";
}

export function getTierLimits(tier: SubscriptionTier | null | undefined): TierLimits {
  const t = normaliseSubscriptionTier(tier ?? undefined);
  if (t === "none") {
    return { maxProjects: 0, maxBoreholesPerProject: 0, maxSamplesPerBorehole: 0 };
  }
  if (t === "bronze") {
    return {
      maxProjects: BRONZE_MAX_PROJECTS,
      maxBoreholesPerProject: BRONZE_MAX_BOREHOLES_PER_PROJECT,
      maxSamplesPerBorehole: BRONZE_MAX_SAMPLES_PER_BOREHOLE,
    };
  }
  return {
    maxProjects: Number.POSITIVE_INFINITY,
    maxBoreholesPerProject: Number.POSITIVE_INFINITY,
    maxSamplesPerBorehole: Number.POSITIVE_INFINITY,
  };
}

export function tierAllowsReports(tier: SubscriptionTier | null | undefined): boolean {
  return normaliseSubscriptionTier(tier ?? undefined) !== "none";
}

export function tierAllowsAiAnalysis(tier: SubscriptionTier | null | undefined): boolean {
  const t = normaliseSubscriptionTier(tier ?? undefined);
  return t === "silver" || t === "gold";
}

/** Istanbul calendar date YYYY-MM-DD for daily quotas. */
export function usageDateKeyEuropeIstanbul(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) {
    return d.toISOString().slice(0, 10);
  }
  return `${y}-${m}-${day}`;
}

export const TIER_UI = {
  none: {
    label: "No membership",
    borderClass: "border-slate-300",
    tabActiveClass: "bg-slate-700 text-white hover:bg-slate-600",
    ringStyle: { boxShadow: "0 0 0 2px rgb(148 163 184)" } as const,
  },
  bronze: {
    label: "Bronze",
    borderClass: "border-[#8B5A2B]/85",
    tabActiveClass: "bg-[#6B4423] text-[#fdf6ee] hover:bg-[#5a381c]",
    ringStyle: { boxShadow: "0 0 0 2px rgb(107 68 35 / 0.55)" } as const,
  },
  silver: {
    label: "Silver",
    borderClass: "border-slate-400",
    tabActiveClass: "bg-slate-500 text-white hover:bg-slate-400",
    ringStyle: { boxShadow: "0 0 0 2px rgb(148 163 184 / 0.9)" } as const,
  },
  gold: {
    label: "Gold",
    borderClass: "border-amber-500",
    tabActiveClass: "bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:from-amber-500 hover:to-yellow-500",
    ringStyle: { boxShadow: "0 0 0 2px rgb(245 158 11 / 0.85)" } as const,
  },
} as const;

export function tierUi(tier: SubscriptionTier | null | undefined) {
  const t = normaliseSubscriptionTier(tier ?? undefined);
  return TIER_UI[t];
}
