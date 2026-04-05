"use client";

import { useState } from "react";

import { LogoutButton } from "@/components/logout-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AccountTab = "information" | "password" | "subscription" | "privacy";

interface AccountDashboardPanelProps {
  email: string;
}

const tabItems: Array<{ id: AccountTab; label: string }> = [
  { id: "information", label: "Information" },
  { id: "password", label: "Password" },
  { id: "subscription", label: "Subscription" },
  { id: "privacy", label: "Privacy" },
];

export function AccountDashboardPanel({ email }: AccountDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<AccountTab>("information");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);

  const submitPasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordOk(false);

    if (!isSupabaseConfigured()) {
      setPasswordMessage("Supabase is not configured.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage(error.message);
        return;
      }

      setPasswordOk(true);
      setPasswordMessage("Password changed successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage("Password change failed. Please try again.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1200px] rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Account</h1>
        <p className="text-sm leading-6 text-slate-600 sm:text-base">Welcome to Geotechnical Insights Hub.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`btn-base btn-md ${
              activeTab === tab.id ? "bg-slate-900 text-white hover:bg-slate-800" : ""
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        {activeTab === "information" ? (
          <dl className="text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-medium text-slate-700">Email</dt>
              <dd className="text-slate-900">{email}</dd>
            </div>
          </dl>
        ) : null}

        {activeTab === "password" ? (
          <form onSubmit={submitPasswordChange} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium text-slate-700">
                Confirm New Password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your new password"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
                required
              />
            </div>
            <button type="submit" disabled={isUpdatingPassword} className="btn-base btn-md">
              {isUpdatingPassword ? "Updating..." : "Change Password"}
            </button>
            {passwordMessage ? (
              <p
                className={`rounded-lg border px-3.5 py-3 text-sm ${
                  passwordOk ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {passwordMessage}
              </p>
            ) : null}
          </form>
        ) : null}

        {activeTab === "subscription" ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Subscription Status</p>
            <p>Subscription features are not active yet.</p>
          </div>
        ) : null}

        {activeTab === "privacy" ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="space-y-1">
              <p className="font-medium text-slate-900">Privacy and Account Deletion</p>
              <p>
                If you want to delete your account, please submit a deletion request. This action is not active yet in this version.
              </p>
            </div>
            <button type="button" className="btn-base btn-md border-red-200 text-red-700 hover:bg-red-50">
              Delete Account (Not Active Yet)
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <LogoutButton className="btn-base btn-md" />
      </div>
    </section>
  );
}
