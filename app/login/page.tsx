import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your Geotechnical Insights Hub account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/account";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[780px] space-y-5">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Login</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Secure email/password login powered by Supabase Auth.
          </p>
        </header>

        <LoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
