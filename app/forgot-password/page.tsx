import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset email for your account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[780px] space-y-5">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Forgot Password</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Request a reset email and then set your new password securely.
          </p>
        </header>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}

