"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthMode = "login" | "signup";

function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasUpper && hasLower && hasNumber && hasSymbol;
}

export function AccountAuthPanel() {
  const router = useRouter();
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetStateForMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
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
    <section className="mx-auto w-full max-w-[1200px] rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7">
      <h2 className="text-2xl font-semibold text-slate-900">
        {mode === "login" ? "Log in to your account" : "Create your account"}
      </h2>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
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
            <p className="mt-2 text-sm text-slate-600">
              At least 8 characters with uppercase, lowercase, number, and symbol
            </p>
          ) : (
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
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
          {mode === "login" ? "No account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => resetStateForMode(mode === "login" ? "signup" : "login")}
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </form>
    </section>
  );
}
