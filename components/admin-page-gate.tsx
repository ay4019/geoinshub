"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminPanel } from "@/components/admin-panel";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchMySubscriptionProfile } from "@/lib/subscription-profile-client";

/**
 * Admin route must match the same session as the browser (PKCE/local storage).
 * Server-only cookie reads can miss the session and wrongly redirect non-admins.
 */
export function AdminPageGate() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (!user) {
        router.replace("/account");
        return;
      }

      const profile = await fetchMySubscriptionProfile(supabase, user.id);

      if (cancelled) {
        return;
      }

      if (!profile?.is_admin) {
        router.replace("/account");
        return;
      }

      setAdminEmail(user.email ?? user.id);
      setReady(true);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
        <p>Checking admin access…</p>
      </div>
    );
  }

  return <AdminPanel adminEmail={adminEmail} />;
}
