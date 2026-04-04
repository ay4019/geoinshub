import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Geotechnical Insights Hub account page.",
};

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-[780px] rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Supabase is not configured. Add env variables before using account features.
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "User";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-[780px] rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Account</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            You are signed in with Supabase Auth.
          </p>
        </div>

        <dl className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="font-medium text-slate-700">Name</dt>
            <dd className="text-slate-900">{fullName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-medium text-slate-700">Email</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-medium text-slate-700">User ID</dt>
            <dd className="text-slate-900">{user.id}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <LogoutButton className="btn-base btn-md" />
        </div>
      </section>
    </div>
  );
}

