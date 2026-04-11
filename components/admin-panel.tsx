"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { adminListMembersWithTiersAction, adminSearchUserByEmailAction, type AdminMemberTierRow } from "@/app/actions/admin";
import { adminSetUserSubscriptionTierAction } from "@/app/actions/subscription";
import type { SubscriptionTier } from "@/lib/subscription";

interface AdminPanelProps {
  adminEmail: string;
}

const tierBadgeClass: Record<SubscriptionTier, string> = {
  none: "bg-slate-100 text-slate-800 ring-slate-200",
  bronze: "bg-[#f0e6dc] text-[#3d2314] ring-[#c4a990]",
  silver: "bg-slate-200/90 text-slate-900 ring-slate-400",
  gold: "bg-amber-100 text-amber-950 ring-amber-300",
};

export function AdminPanel({ adminEmail }: AdminPanelProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const [targetUserId, setTargetUserId] = useState("");
  const [tierPick, setTierPick] = useState<SubscriptionTier>("bronze");
  const [tierSaving, setTierSaving] = useState(false);
  const [tierMessage, setTierMessage] = useState<string | null>(null);

  const [memberRows, setMemberRows] = useState<AdminMemberTierRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersNote, setMembersNote] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<"all" | SubscriptionTier>("all");

  const loadMembers = useCallback(async () => {
    setMembersError(null);
    setMembersLoading(true);
    try {
      const res = await adminListMembersWithTiersAction();
      if (!res.ok) {
        setMembersError(res.message);
        setMemberRows([]);
        setMembersNote(null);
        return;
      }
      setMemberRows(res.rows);
      setMembersNote(res.note);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    if (tierFilter === "all") {
      return memberRows;
    }
    return memberRows.filter((r) => r.subscription_tier === tierFilter);
  }, [memberRows, tierFilter]);

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
      if (res.ok) {
        void loadMembers();
      }
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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Members &amp; tiers</h2>
            <p className="mt-1 text-sm text-slate-600">
              Auth kullanıcıları (ilk 1000) ile <code className="rounded bg-slate-100 px-1 text-xs">profiles</code>{" "}
              birleştirilir; Gold / Silver / Bronze / none burada görünür.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span className="sr-only sm:not-sr-only">Filter</span>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as "all" | SubscriptionTier)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
              >
                <option value="all">All tiers</option>
                <option value="gold">gold</option>
                <option value="silver">silver</option>
                <option value="bronze">bronze</option>
                <option value="none">none</option>
              </select>
            </label>
            <button
              type="button"
              className="btn-base btn-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              disabled={membersLoading}
              onClick={() => void loadMembers()}
            >
              {membersLoading ? "Loading…" : "Refresh list"}
            </button>
          </div>
        </div>

        {membersError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{membersError}</p>
        ) : null}
        {membersNote ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{membersNote}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5">Email</th>
                <th className="whitespace-nowrap px-3 py-2.5">Tier</th>
                <th className="whitespace-nowrap px-3 py-2.5">Admin</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-normal normal-case tracking-normal">
                  User ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {membersLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Loading members…
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No rows match this filter.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="max-w-[220px] truncate px-3 py-2 text-slate-900" title={row.email ?? undefined}>
                      {row.email ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tierBadgeClass[row.subscription_tier]}`}
                      >
                        {row.subscription_tier}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{row.is_admin ? "Yes" : "—"}</td>
                    <td className="max-w-[min(360px,40vw)] truncate px-3 py-2 font-mono text-[11px] text-slate-600" title={row.id}>
                      {row.id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!membersLoading ? (
          <p className="mt-2 text-xs text-slate-500">
            {filteredMembers.length} row{filteredMembers.length === 1 ? "" : "s"}
            {tierFilter !== "all" ? ` (filtered from ${memberRows.length})` : ""}.
          </p>
        ) : null}
      </section>

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
          Sets <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">public.profiles.subscription_tier</code> for
          the given user ID (legacy <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">plan</code> column is
          removed by migration). Requires server-side service role.
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
