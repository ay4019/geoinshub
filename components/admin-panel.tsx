"use client";

import Link from "next/link";
import { useState } from "react";

import { adminSearchUserByEmailAction } from "@/app/actions/admin";
import { adminSetUserSubscriptionTierAction } from "@/app/actions/subscription";
import type { SubscriptionTier } from "@/lib/subscription";

interface AdminPanelProps {
  adminEmail: string;
}

export function AdminPanel({ adminEmail }: AdminPanelProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const [targetUserId, setTargetUserId] = useState("");
  const [tierPick, setTierPick] = useState<SubscriptionTier>("bronze");
  const [tierSaving, setTierSaving] = useState(false);
  const [tierMessage, setTierMessage] = useState<string | null>(null);

  const runSearch = async () => {
    setSearchMessage(null);
    setSearching(true);
    try {
      const res = await adminSearchUserByEmailAction(searchEmail);
      if (!res.ok) {
        setSearchMessage(res.message);
        return;
      }
      setTargetUserId(res.user.id);
      setSearchMessage(`Found: ${res.user.email ?? res.user.id}`);
    } finally {
      setSearching(false);
    }
  };

  const applyTier = async () => {
    setTierMessage(null);
    const id = targetUserId.trim();
    if (!id) {
      setTierMessage("Enter a user UUID or search by email first.");
      return;
    }
    setTierSaving(true);
    try {
      const res = await adminSetUserSubscriptionTierAction(id, tierPick);
      setTierMessage(res.ok ? res.message : res.message);
    } finally {
      setTierSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-800">{adminEmail}</span>. Manage subscription tiers for
            your users.
          </p>
        </div>
        <Link href="/account" className="btn-base btn-md">
          Back to Account
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Find user by email</h2>
        <p className="mt-1 text-sm text-slate-600">
          Searches the first 1000 users returned by Supabase Auth. If not found, use the user&apos;s UUID from
          Supabase Dashboard → Authentication.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="btn-base btn-md shrink-0 bg-slate-900 text-white hover:bg-slate-800"
            disabled={searching || !searchEmail.trim()}
            onClick={() => void runSearch()}
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {searchMessage ? (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              searchMessage.startsWith("Found:")
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-950"
            }`}
          >
            {searchMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Set subscription tier</h2>
        <p className="mt-1 text-sm text-slate-600">
          Updates <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">public.profiles</code> for the given user
          ID. Requires server-side service role.
        </p>
        <div className="mt-4 space-y-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-700">User ID (UUID)</span>
            <input
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-slate-500"
              spellCheck={false}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-700">New tier</span>
            <select
              value={tierPick}
              onChange={(e) => setTierPick(e.target.value as SubscriptionTier)}
              className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="none">none</option>
              <option value="bronze">bronze</option>
              <option value="silver">silver</option>
              <option value="gold">gold</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-base btn-md bg-amber-800 text-white hover:bg-amber-900"
            disabled={tierSaving || !targetUserId.trim()}
            onClick={() => void applyTier()}
          >
            {tierSaving ? "Saving…" : "Apply tier"}
          </button>
          {tierMessage ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{tierMessage}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Grant admin access to another account</p>
        <p className="mt-1">
          In Supabase SQL Editor run (replace the UUID with the user id from Authentication):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800">
          {`update public.profiles\n  set is_admin = true\n  where id = 'USER-UUID-HERE';`}
        </pre>
      </section>
    </div>
  );
}
