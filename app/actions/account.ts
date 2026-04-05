"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface DeleteAccountResult {
  ok: boolean;
  message: string;
}

export async function deleteCurrentUserAccountAction(): Promise<DeleteAccountResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "You must be signed in to delete your account." };
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return { ok: false, message: deleteError.message };
    }

    await supabase.auth.signOut();
    return { ok: true, message: "Your account has been deleted." };
  } catch {
    return {
      ok: false,
      message: "Account deletion is not configured yet. Please set SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }
}
