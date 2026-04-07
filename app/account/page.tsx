import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";

import { AccountAuthPanel } from "@/components/account-auth-panel";
import { AccountDashboardPanel } from "@/components/account-dashboard-panel";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Geotechnical Insights Hub account page.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = mode === "signup" ? "signup" : "login";
  const supabaseConfigured = isSupabaseConfigured();
  let user: User | null = null;

  if (supabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6">
        <AccountAuthPanel initialMode={initialMode} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <AccountDashboardPanel email={user.email ?? "-"} />
    </div>
  );
}
