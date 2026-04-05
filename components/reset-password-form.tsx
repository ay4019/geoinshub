"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
        return;
      }

      setIsSuccess(true);
      setMessage("Password updated successfully. Redirecting to account...");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.replace("/account");
        router.refresh();
      }, 700);
    } catch {
      setMessage("Password update failed. Please try again.");
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
        <h2 className="text-2xl font-semibold text-slate-900">Set New Password</h2>
        <p className="text-sm leading-6 text-slate-600">
          Enter your new password. This page should be opened from the email reset link.
        </p>
      </div>

      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-slate-700">
          New Password
        </label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 characters"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <div>
        <label htmlFor="reset-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
          Confirm New Password
        </label>
        <input
          id="reset-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your new password"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-base btn-md">
        {isPending ? "Updating..." : "Update Password"}
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

