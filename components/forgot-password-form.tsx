"use client";

import Link from "next/link";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    if (!isSupabaseConfigured()) {
      setMessage("Supabase is not configured yet. Please add the required environment variables.");
      return;
    }

    setIsPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/reset-password` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setIsSuccess(true);
      setMessage("Password reset email sent. Please check your inbox.");
      setEmail("");
    } catch {
      setMessage("Could not send reset email. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Forgot Password</h2>
        <p className="text-sm leading-6 text-slate-600">
          Enter your email address and we will send a password reset link.
        </p>
      </div>

      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email Address
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-base btn-md">
        {isPending ? "Sending..." : "Send Reset Link"}
      </button>

      {message ? (
        <p
          className={`rounded-xl border px-3.5 py-3 text-sm ${
            isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </p>
      ) : null}

      <p className="text-sm text-slate-600">
        Back to{" "}
        <Link href="/account" className="font-medium text-slate-900 underline-offset-4 hover:underline">
          Account
        </Link>
      </p>
    </form>
  );
}

