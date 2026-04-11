import type { SupabaseClient } from "@supabase/supabase-js";

import { normaliseSubscriptionTier, type SubscriptionTier } from "@/lib/subscription";

export type MyProfileRow = {
  subscription_tier: SubscriptionTier;
  is_admin: boolean;
};

/**
 * Loads the current user's row from `public.profiles` (`subscription_tier`, `is_admin`).
 * Prefer a direct `select` (matches what PostgREST returns for the session JWT).
 * Fall back to `get_my_subscription_profile` RPC if the table read fails (e.g. RLS edge case).
 */
export async function fetchMySubscriptionProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyProfileRow | null> {
  const { data: direct, error: directErr } = await supabase
    .from("profiles")
    .select("subscription_tier, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!directErr && direct) {
    const row = direct as { subscription_tier?: string; is_admin?: boolean };
    return {
      subscription_tier: normaliseSubscriptionTier(row.subscription_tier),
      is_admin: Boolean(row.is_admin),
    };
  }

  const rpcResult = await supabase.rpc("get_my_subscription_profile");

  if (rpcResult.error || rpcResult.data === null || rpcResult.data === undefined) {
    return null;
  }

  const raw = rpcResult.data as unknown;
  const rows = Array.isArray(raw) ? raw : [raw];
  const first = rows[0] as { subscription_tier?: string; is_admin?: boolean } | undefined;
  if (!first || (first.subscription_tier === undefined && first.is_admin === undefined)) {
    return null;
  }

  return {
    subscription_tier: normaliseSubscriptionTier(first.subscription_tier),
    is_admin: Boolean(first.is_admin),
  };
}
