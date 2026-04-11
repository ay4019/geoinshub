"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
