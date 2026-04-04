"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface LoginFormProps {
  nextPath?: string;
}

export function LoginForm({ nextPath = "/account" }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!isSupabaseConfigured()) {
      setMessage("Supabase is not configured yet. Please add the required environment variables.");
      return;
    }

    setIsPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setMessage("Login failed. Please try again.");
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
        <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
        <p className="text-sm leading-6 text-slate-600">
          Access your account with email and password.
        </p>
      </div>

      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email Address
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-base btn-md">
        {isPending ? "Logging in..." : "Login"}
      </button>

      {message ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">{message}</p>
      ) : null}

      <p className="text-sm text-slate-600">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-slate-900 underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
