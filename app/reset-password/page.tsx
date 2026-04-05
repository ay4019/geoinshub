import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password after opening your reset link.",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[780px] space-y-5">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Reset Password</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Set your new password using the active recovery session from your email link.
          </p>
        </header>

        <ResetPasswordForm />
      </div>
    </div>
  );
}

