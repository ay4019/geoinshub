"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRONZE_MAX_REPORTS_PER_DAY,
  effectiveSubscriptionTier,
  normaliseSubscriptionTier,
  SILVER_MAX_AI_ANALYSES_PER_DAY,
  type SubscriptionTier,
  usageDateKeyEuropeIstanbul,
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

/** Silver: max AI analyses per day. Gold: unlimited. Bronze/none: blocked before calling this. */
export async function consumeAiAnalysisAction(): Promise<QuotaResult> {
  const auth = await requireUserId();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }
  const tier = await loadEffectiveTierForGating(auth.userId);
  if (tier === "gold") {
    return { ok: true, message: "ok" };
  }
  if (tier !== "silver") {
    return { ok: false, message: "AI analysis requires Silver or Gold." };
  }

  const supabase = await createSupabaseServerClient();
  const today = usageDateKeyEuropeIstanbul();
  const { data: row, error: selErr } = await supabase
    .from("usage_daily")
    .select("id, ai_analyses")
    .eq("user_id", auth.userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (selErr) {
    return { ok: false, message: selErr.message };
  }

  const current = (row as { id?: string; ai_analyses?: number } | null)?.ai_analyses ?? 0;
  if (current >= SILVER_MAX_AI_ANALYSES_PER_DAY) {
    return {
      ok: false,
      message: `Daily AI analysis limit reached (${SILVER_MAX_AI_ANALYSES_PER_DAY} per day on Silver). Gold has unlimited AI analyses.`,
    };
  }

  if (!row) {
    const { error: insErr } = await supabase.from("usage_daily").insert({
      user_id: auth.userId,
      usage_date: today,
      reports_generated: 0,
      ai_analyses: 1,
    });
    if (insErr) {
      return { ok: false, message: insErr.message };
    }
    return { ok: true, message: "ok", remaining: SILVER_MAX_AI_ANALYSES_PER_DAY - 1 };
  }

  const { error: upErr } = await supabase
    .from("usage_daily")
    .update({ ai_analyses: current + 1 })
    .eq("id", (row as { id: string }).id);

  if (upErr) {
    return { ok: false, message: upErr.message };
  }
  return { ok: true, message: "ok", remaining: SILVER_MAX_AI_ANALYSES_PER_DAY - current - 1 };
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
    const { error } = await admin.from("profiles").upsert(
      {
        id,
        subscription_tier: tier,
        tier_source: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: `Tier set to ${tier}.` };
  } catch {
    return { ok: false, message: "Server could not update profile (service role missing?)." };
  }
}
