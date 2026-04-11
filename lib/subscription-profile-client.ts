import type { SupabaseClient } from "@supabase/supabase-js";

import { normaliseSubscriptionTier, type SubscriptionTier } from "@/lib/subscription";

export type MyProfileRow = {
  subscription_tier: SubscriptionTier;
  is_admin: boolean;
};

/**
 * Loads the current user's row from `public.profiles` (`subscription_tier`, `is_admin`) via RPC when available
 * (bypasses RLS quirks), otherwise falls back to a direct select.
 */
export async function fetchMySubscriptionProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyProfileRow | null> {
  const rpcResult = await supabase.rpc("get_my_subscription_profile");

  if (!rpcResult.error && rpcResult.data !== null && rpcResult.data !== undefined) {
    const raw = rpcResult.data as unknown;
    const rows = Array.isArray(raw) ? raw : [raw];
    const first = rows[0] as { subscription_tier?: string; is_admin?: boolean } | undefined;
    if (first && (first.subscription_tier !== undefined || first.is_admin !== undefined)) {
      return {
        subscription_tier: normaliseSubscriptionTier(first.subscription_tier),
        is_admin: Boolean(first.is_admin),
      };
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as { subscription_tier?: string; is_admin?: boolean };
  return {
    subscription_tier: normaliseSubscriptionTier(row.subscription_tier),
    is_admin: Boolean(row.is_admin),
  };
}
