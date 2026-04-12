"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { MembershipTierColumns } from "@/components/membership-tier-columns";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthMode = "login" | "signup";
type AccountAuthPanelProps = {
  initialMode?: AuthMode;
};

function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasUpper && hasLower && hasNumber && hasSymbol;
}

function getPasswordChecks(value: string) {
  return {
    minLength: value.length >= 8,
    hasUpper: /[A-Z]/.test(value),
    hasLower: /[a-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSymbol: /[^A-Za-z0-9]/.test(value),
  };
}

export function AccountAuthPanel({ initialMode = "login" }: AccountAuthPanelProps) {
  const router = useRouter();
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const passwordChecks = getPasswordChecks(password);

  const resetStateForMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setHasAcceptedTerms(false);
    setMessage(null);
    setIsSuccess(false);
  };

  const submitLogin = async () => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setIsSuccess(true);
    setMessage("Login successful. Redirecting...");
    router.replace("/account");
    router.refresh();
  };

  const submitSignUp = async () => {
    if (!isStrongPassword(password)) {
      setMessage("Use at least 8 characters with uppercase, lowercase, number, and symbol.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/account` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      setIsSuccess(true);
      setMessage("Account created. Redirecting...");
      router.replace("/account");
      router.refresh();
      return;
    }

    setIsSuccess(true);
    setMessage("Sign-up successful. Please check your email to verify your account.");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    if (!supabaseReady) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    if (mode === "signup" && !hasAcceptedTerms) {
      setMessage("Please confirm that you have read and understood the legal terms before signing up.");
      return;
    }

    setIsPending(true);
    try {
      if (mode === "login") {
        await submitLogin();
      } else {
        await submitSignUp();
      }
    } catch {
      setMessage("Authentication failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section
      className={`account-ui-sans mx-auto w-full rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_16px_48px_-36px_rgba(15,23,42,0.4)] sm:p-6 ${
        mode === "signup" ? "max-w-4xl" : "max-w-md"
      }`}
    >
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        {mode === "login" ? "Log in to your account" : "Create your account"}
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="account-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
            required
          />
        </div>

        <div>
          <label htmlFor="account-password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative w-full">
            <input
              id="account-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
              required
            />
          </div>
          {mode === "signup" ? (
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-px text-[11px] leading-tight sm:text-xs">
              <p className={passwordChecks.minLength ? "text-emerald-700" : "text-slate-600"}>
                {passwordChecks.minLength ? "✓" : "•"} 8+ characters
              </p>
              <p className={passwordChecks.hasUpper ? "text-emerald-700" : "text-slate-600"}>
                {passwordChecks.hasUpper ? "✓" : "•"} Uppercase
              </p>
              <p className={passwordChecks.hasLower ? "text-emerald-700" : "text-slate-600"}>
                {passwordChecks.hasLower ? "✓" : "•"} Lowercase
              </p>
              <p className={passwordChecks.hasNumber ? "text-emerald-700" : "text-slate-600"}>
                {passwordChecks.hasNumber ? "✓" : "•"} Number
              </p>
              <p className={passwordChecks.hasSymbol ? "text-emerald-700" : "text-slate-600"}>
                {passwordChecks.hasSymbol ? "✓" : "•"} Symbol
              </p>
            </div>
          ) : (
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
          )}
        </div>

        {mode === "signup" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hasAcceptedTerms}
                onChange={(event) => setHasAcceptedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>
                I have read and understood the{" "}
                <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-4">
                  Terms of Use
                </Link>
                ,{" "}
                <Link href="/disclaimer" target="_blank" className="font-semibold underline underline-offset-4">
                  Disclaimer
                </Link>
                , and{" "}
                <Link href="/privacy-policy" target="_blank" className="font-semibold underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || (mode === "signup" && !hasAcceptedTerms)}
          className="btn-base btn-md"
        >
          {isPending ? (mode === "login" ? "Logging in..." : "Creating account...") : mode === "login" ? "Log In" : "Sign Up"}
        </button>

        {message ? (
          <p
            className={`rounded-lg border px-3.5 py-3 text-sm ${
              isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message}
          </p>
        ) : null}

        <p className="pt-1 text-sm text-slate-700">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => resetStateForMode(mode === "login" ? "signup" : "login")}
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            {mode === "login" ? "Register now." : "Log in"}
          </button>
        </p>

        {mode === "signup" ? (
          <div className="space-y-3 border-t border-slate-200 pt-5">
            <p className="text-sm leading-relaxed text-slate-600">
              Compare membership tiers. New accounts can be placed on Bronze first, and Silver or Gold can be assigned
              manually later by the site admin.
            </p>
            <MembershipTierColumns effectiveTier="none" tierLoading={false} />
          </div>
        ) : null}
      </form>
    </section>
  );
}
