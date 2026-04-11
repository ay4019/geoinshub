"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normaliseSubscriptionTier, type SubscriptionTier } from "@/lib/subscription";

async function requireAdminUserId(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { error: "You must be signed in." };
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return { error: "Admin access required." };
  }
  return { userId: user.id };
}

export type AdminUserSearchResult = {
  id: string;
  email: string | null;
};

export type AdminMemberTierRow = {
  id: string;
  email: string | null;
  subscription_tier: SubscriptionTier;
  is_admin: boolean;
};

/**
 * Lists auth users (first page, up to 1000) merged with `public.profiles` tiers.
 * Profiles without a match in that auth page still appear (email unknown).
 */
export async function adminListMembersWithTiersAction(): Promise<
  { ok: true; rows: AdminMemberTierRow[]; note: string | null } | { ok: false; message: string }
> {
  const gate = await requireAdminUserId();
  if ("error" in gate) {
    return { ok: false, message: gate.error };
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return { ok: false, message: listErr.message };
    }

    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, subscription_tier, is_admin")
      .order("subscription_tier", { ascending: true })
      .order("id", { ascending: true });

    if (profErr) {
      return { ok: false, message: profErr.message };
    }

    const profileRows = (profiles ?? []) as { id: string; subscription_tier?: string; is_admin?: boolean }[];
    const profileMap = new Map(profileRows.map((p) => [p.id, p]));

    const authUsers = listData?.users ?? [];
    const seen = new Set<string>();

    const rows: AdminMemberTierRow[] = authUsers.map((u) => {
      seen.add(u.id);
      const p = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        subscription_tier: normaliseSubscriptionTier(p?.subscription_tier),
        is_admin: Boolean(p?.is_admin),
      };
    });

    for (const p of profileRows) {
      if (!seen.has(p.id)) {
        rows.push({
          id: p.id,
          email: null,
          subscription_tier: normaliseSubscriptionTier(p.subscription_tier),
          is_admin: Boolean(p.is_admin),
        });
      }
    }

    rows.sort((a, b) => {
      const order = (t: SubscriptionTier) =>
        ({ none: 0, bronze: 1, silver: 2, gold: 3 } as const)[t] ?? 9;
      const c = order(a.subscription_tier) - order(b.subscription_tier);
      if (c !== 0) {
        return c;
      }
      return (a.email ?? a.id).localeCompare(b.email ?? b.id);
    });

    const note =
      authUsers.length >= 1000
        ? "E-postalar yalnızca Auth API’nin ilk 1000 hesabı için gösterilir; kalan profiller e-posta olmadan listelenir."
        : null;

    return { ok: true, rows, note };
  } catch {
    return { ok: false, message: "Could not load member list (SUPABASE_SERVICE_ROLE_KEY missing?)." };
  }
}

/**
 * Looks up an auth user by exact email (case-insensitive) in the first page of results.
 * Large projects may need UUID from the Supabase dashboard instead.
 */
export async function adminSearchUserByEmailAction(
  email: string,
): Promise<{ ok: true; user: AdminUserSearchResult } | { ok: false; message: string }> {
  const gate = await requireAdminUserId();
  if ("error" in gate) {
    return { ok: false, message: gate.error };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      return { ok: false, message: error.message };
    }
    const match = data.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
    if (!match) {
      return {
        ok: false,
        message:
          "No user with that email in the first 1000 accounts. Open Supabase → Authentication, copy the user UUID, and paste it below.",
      };
    }
    return { ok: true, user: { id: match.id, email: match.email ?? null } };
  } catch {
    return { ok: false, message: "Admin API unavailable. Is SUPABASE_SERVICE_ROLE_KEY set on the server?" };
  }
}
