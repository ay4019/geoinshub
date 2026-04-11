"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRONZE_MAX_REPORTS_PER_DAY,
  effectiveSubscriptionTier,
  MATRIX_AI_REPORTS_PER_WEEK,
  normaliseSubscriptionTier,
  type SubscriptionTier,
  tierAllowsAiAnalysis,
  usageDateKeyEuropeIstanbul,
  usageWeekMondayKeyEuropeIstanbul,
} from "@/lib/subscription";

export interface SubscriptionProfile {
  subscription_tier: SubscriptionTier;
  is_admin: boolean;
}

export interface QuotaResult {
  ok: boolean;
  message: string;
  remaining?: number;
}

async function requireUserId(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: "You must be signed in." };
  }
  return { userId: user.id };
}

/** Loads stored tier + is_admin and returns effective tier for quotas (admins → Gold). */
async function loadEffectiveTierForGating(userId: string): Promise<SubscriptionTier> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("subscription_tier, is_admin").eq("id", userId).maybeSingle();
  const row = data as { subscription_tier?: string; is_admin?: boolean } | null;
  return effectiveSubscriptionTier(normaliseSubscriptionTier(row?.subscription_tier), Boolean(row?.is_admin));
}

export async function getSubscriptionProfileAction(): Promise<SubscriptionProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data } = await supabase.from("profiles").select("subscription_tier, is_admin").eq("id", user.id).maybeSingle();
  if (!data) {
    return { subscription_tier: "bronze", is_admin: false };
  }
  const row = data as { subscription_tier?: string; is_admin?: boolean };
  return {
    subscription_tier: normaliseSubscriptionTier(row.subscription_tier),
    is_admin: Boolean(row.is_admin),
  };
}

/** Consume one report slot (matrix PDF or tool report PDF). Bronze: daily cap; Silver/Gold: unlimited. */
export async function consumeReportGenerationAction(): Promise<QuotaResult> {
  const auth = await requireUserId();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }
  const tier = await loadEffectiveTierForGating(auth.userId);
  if (tier === "none") {
    return { ok: false, message: "Reports require an active membership (Bronze or higher)." };
  }
  if (tier === "silver" || tier === "gold") {
    return { ok: true, message: "ok" };
  }

  const supabase = await createSupabaseServerClient();
  const today = usageDateKeyEuropeIstanbul();
  const { data: row, error: selErr } = await supabase
    .from("usage_daily")
    .select("id, reports_generated")
    .eq("user_id", auth.userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (selErr) {
    return { ok: false, message: selErr.message };
  }

  const current = (row as { id?: string; reports_generated?: number } | null)?.reports_generated ?? 0;
  if (current >= BRONZE_MAX_REPORTS_PER_DAY) {
    return {
      ok: false,
      message: `Daily report limit reached (${BRONZE_MAX_REPORTS_PER_DAY} per day on Bronze). Upgrade to Silver or Gold for unlimited reports.`,
    };
  }

  if (!row) {
    const { error: insErr } = await supabase.from("usage_daily").insert({
      user_id: auth.userId,
      usage_date: today,
      reports_generated: 1,
      ai_analyses: 0,
    });
    if (insErr) {
      return { ok: false, message: insErr.message };
    }
    return { ok: true, message: "ok", remaining: BRONZE_MAX_REPORTS_PER_DAY - 1 };
  }

  const { error: upErr } = await supabase
    .from("usage_daily")
    .update({ reports_generated: current + 1 })
    .eq("id", (row as { id: string }).id);

  if (upErr) {
    return { ok: false, message: upErr.message };
  }
  return { ok: true, message: "ok", remaining: BRONZE_MAX_REPORTS_PER_DAY - current - 1 };
}

/** Gold: unlimited AI analyses (tool “Analyze with AI”). Other tiers blocked before calling this. */
export async function consumeAiAnalysisAction(): Promise<QuotaResult> {
  const auth = await requireUserId();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }
  const tier = await loadEffectiveTierForGating(auth.userId);
  if (tier === "gold") {
    return { ok: true, message: "ok" };
  }
  return { ok: false, message: "AI analysis requires Gold membership." };
}

export interface MatrixAiWeeklyQuotaPayload {
  isAdmin: boolean;
  /** Weekly cap for Gold (non-admin); admins are exempt. */
  limit: number;
  used: number;
  remaining: number;
  weekStart: string;
}

/** Weekly matrix AI report quota (Gold 5/week in Europe/Istanbul; admins unlimited). */
export async function getMatrixAiWeeklyQuotaAction(): Promise<
  { ok: true; data: MatrixAiWeeklyQuotaPayload } | { ok: false; message: string }
> {
  const auth = await requireUserId();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, is_admin")
    .eq("id", auth.userId)
    .maybeSingle();
  const row = profile as { subscription_tier?: string; is_admin?: boolean } | null;
  const isAdmin = Boolean(row?.is_admin);
  const tier = effectiveSubscriptionTier(normaliseSubscriptionTier(row?.subscription_tier), isAdmin);
  const weekStart = usageWeekMondayKeyEuropeIstanbul();

  if (!tierAllowsAiAnalysis(tier, isAdmin)) {
    return {
      ok: true,
      data: {
        isAdmin: false,
        limit: MATRIX_AI_REPORTS_PER_WEEK,
        used: 0,
        remaining: 0,
        weekStart,
      },
    };
  }

  if (isAdmin) {
    return {
      ok: true,
      data: {
        isAdmin: true,
        limit: MATRIX_AI_REPORTS_PER_WEEK,
        used: 0,
        remaining: MATRIX_AI_REPORTS_PER_WEEK,
        weekStart,
      },
    };
  }

  const { data: usageRow } = await supabase
    .from("usage_weekly_matrix_ai")
    .select("report_generations")
    .eq("user_id", auth.userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const used = (usageRow as { report_generations?: number } | null)?.report_generations ?? 0;
  return {
    ok: true,
    data: {
      isAdmin: false,
      limit: MATRIX_AI_REPORTS_PER_WEEK,
      used,
      remaining: Math.max(0, MATRIX_AI_REPORTS_PER_WEEK - used),
      weekStart,
    },
  };
}

/** Used by integrated-matrix-ai server action after a successful generation. */
export async function incrementMatrixAiReportUsage(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const weekStart = usageWeekMondayKeyEuropeIstanbul();
  const { data: existing } = await supabase
    .from("usage_weekly_matrix_ai")
    .select("report_generations")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const next = ((existing as { report_generations?: number } | null)?.report_generations ?? 0) + 1;
  const { error } = await supabase.from("usage_weekly_matrix_ai").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      report_generations: next,
    },
    { onConflict: "user_id,week_start" },
  );
  if (error) {
    console.error("incrementMatrixAiReportUsage", error.message);
  }
}

/** Updates `public.profiles.subscription_tier` (canonical column; legacy `plan` is dropped by migration). */
export async function adminSetUserSubscriptionTierAction(
  targetUserId: string,
  nextTier: SubscriptionTier,
): Promise<{ ok: boolean; message: string }> {
  const auth = await requireUserId();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const tier = normaliseSubscriptionTier(nextTier);
  const supabase = await createSupabaseServerClient();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", auth.userId).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return { ok: false, message: "Admin only." };
  }

  try {
    const admin = createSupabaseAdminClient();
    const id = targetUserId.trim();
    const { data: written, error } = await admin
      .from("profiles")
      .upsert(
        {
          id,
          subscription_tier: tier,
          tier_source: "manual",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("subscription_tier")
      .maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }

    const persisted = normaliseSubscriptionTier((written as { subscription_tier?: string } | null)?.subscription_tier);
    if (persisted !== tier) {
      return {
        ok: false,
        message: `Save did not persist (DB has "${persisted ?? "missing"}", expected "${tier}"). Check that the user UUID exists in Authentication and that SUPABASE_SERVICE_ROLE_KEY is set on the server.`,
      };
    }

    return { ok: true, message: `Tier set to ${tier} (verified in database).` };
  } catch {
    return { ok: false, message: "Server could not update profile (service role missing?)." };
  }
}
