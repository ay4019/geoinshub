import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

import { AccountAuthPanel } from "@/components/account-auth-panel";
import { LogoutButton } from "@/components/logout-button";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Geotechnical Insights Hub account page.",
};

export default async function AccountPage() {
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
        <AccountAuthPanel />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-[1200px] rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Account</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">Welcome to Geotechnical Insights Hub.</p>
        </div>

        <dl className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="font-medium text-slate-700">Email</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/reset-password" className="btn-base btn-md">
            Change Password
          </Link>
          <LogoutButton className="btn-base btn-md" />
        </div>
      </section>
    </div>
  );
}
