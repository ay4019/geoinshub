"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface SignUpFormProps {
  showSwitchLink?: boolean;
}

export function SignUpForm({ showSwitchLink = true }: SignUpFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/account` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setIsSuccess(true);
        setMessage("Account created successfully. Redirecting to your account...");
        setTimeout(() => {
          router.replace("/account");
          router.refresh();
        }, 700);
        return;
      }

      setIsSuccess(true);
      setMessage("Sign-up successful. Please check your email to confirm your account.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("Sign-up failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7"
    >
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Create Account</h2>
        <p className="text-sm leading-6 text-slate-600">
          Create an account with your email and password using secure Supabase authentication.
        </p>
        <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/90 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-5">
          <p className="text-center text-[13px] font-semibold leading-snug tracking-tight text-amber-950 sm:text-sm">
            Register now — become a <span className="whitespace-nowrap text-amber-900">free Gold</span> member
          </p>
          <p className="mt-1.5 text-center text-xs leading-relaxed text-amber-900/85">
            New sign-ups currently receive full Gold access at no extra cost. Secure sign-in with Supabase.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email Address
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <div>
        <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 characters"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <div>
        <label htmlFor="signup-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
          Confirm Password
        </label>
        <input
          id="signup-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-base btn-md">
        {isPending ? "Creating account..." : "Sign Up"}
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

      {showSwitchLink ? (
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
            Login
          </Link>
        </p>
      ) : null}
    </form>
  );
}
