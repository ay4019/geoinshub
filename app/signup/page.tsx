import type { Metadata } from "next";

import { SignUpForm } from "@/components/sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Geotechnical Insights Hub account with Supabase Auth.",
};

export default function SignUpPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[780px] space-y-5">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Sign Up</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Secure email/password sign-up powered by Supabase Auth.
          </p>
        </header>

        <SignUpForm />
      </div>
    </div>
  );
}
