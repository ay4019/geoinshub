"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { deleteCurrentUserAccountAction } from "@/app/actions/account";
import { LogoutButton } from "@/components/logout-button";
import { MembershipTierColumns } from "@/components/membership-tier-columns";
import { useSubscription } from "@/components/subscription-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isGuideCapturePath } from "@/lib/guide-capture";
import { effectiveSubscriptionTier, effectiveTierDisplayLabel, tierUi } from "@/lib/subscription";

type MainAccountTab = "subscription" | "personal";
type PersonalTab = "information" | "password" | "privacy";

interface AccountDashboardPanelProps {
  email: string;
}

const mainTabItems: Array<{ id: MainAccountTab; label: string }> = [
  { id: "subscription", label: "Subscription" },
  { id: "personal", label: "Personal Information" },
];

const personalTabItems: Array<{ id: PersonalTab; label: string }> = [
  { id: "information", label: "Information" },
  { id: "password", label: "Password" },
  { id: "privacy", label: "Privacy" },
];

export function AccountDashboardPanel({ email }: AccountDashboardPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const guideCapture = isGuideCapturePath(pathname);
  const subscription = useSubscription();
  const tier = guideCapture ? "gold" : subscription.tier;
  const isAdmin = guideCapture ? false : subscription.isAdmin;
  const tierLoading = guideCapture ? false : subscription.loading;
  const refreshSubscription = subscription.refresh;
  const effectiveTier = useMemo(() => effectiveSubscriptionTier(tier, isAdmin), [tier, isAdmin]);
  const effectiveTierLabel = useMemo(() => effectiveTierDisplayLabel(tier, isAdmin), [tier, isAdmin]);
  const tierStyle = tierUi(tier, isAdmin);
  const [activeMainTab, setActiveMainTab] = useState<MainAccountTab>("subscription");
  const [activePersonalTab, setActivePersonalTab] = useState<PersonalTab>("information");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteOk, setDeleteOk] = useState(false);

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

  const onDeleteAccount = async () => {
    const confirmed = window.confirm(
      "This will permanently delete your account and you will lose access immediately. Continue?",
    );

    if (!confirmed) {
      return;
    }

    setDeleteMessage(null);
    setDeleteOk(false);
    setIsDeletingAccount(true);
    try {
      const result = await deleteCurrentUserAccountAction();
      setDeleteMessage(result.message);
      setDeleteOk(result.ok);

      if (result.ok) {
        router.replace("/account");
        router.refresh();
      }
    } catch {
      setDeleteMessage("Account deletion failed. Please try again.");
      setDeleteOk(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <section
      className={`account-ui-sans mx-auto max-w-[1200px] rounded-[1.5rem] border-2 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7 ${tierStyle.borderClass}`}
      style={tierStyle.ringStyle}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Account</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Manage your profile and subscription from here. Cloud projects and boreholes live on the{" "}
            <Link href="/projects" className="font-semibold text-slate-800 underline decoration-slate-400/80 underline-offset-2 hover:text-slate-950">
              Projects
            </Link>{" "}
            page. Update personal information, change your password, review your tier, and control privacy settings.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {mainTabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveMainTab(tab.id)}
            className={`btn-base btn-md ${
              activeMainTab === tab.id
                ? tab.id === "subscription"
                  ? tierStyle.tabActiveClass
                  : "bg-slate-900 text-white hover:bg-slate-800"
                : ""
            }`}
          >
            {tab.label}
          </button>
        ))}
        <LogoutButton className="btn-base btn-md btn-danger" />
      </div>

      {activeMainTab === "subscription" ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
              {tierLoading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                <div className="text-sm text-slate-600">
                  <p>
                    Current tier:{" "}
                    <span
                      className={`font-semibold ${
                        effectiveTier === "none"
                          ? "text-slate-700"
                          : effectiveTier === "bronze"
                            ? "text-[#5c2e12]"
                            : effectiveTier === "silver"
                              ? "text-slate-900"
                              : "text-amber-900"
                      }`}
                    >
                      {effectiveTierLabel}
                    </span>
                    {isAdmin ? (
                      <span className="text-slate-500"> - all premium features unlocked for administrators.</span>
                    ) : effectiveTier === "silver" || effectiveTier === "gold" ? (
                      <span className="text-slate-500"> - includes everything in Bronze, plus more.</span>
                    ) : null}
                    {!isAdmin && effectiveTier === "none" ? (
                      <span className="text-slate-500"> - contact the site admin to start with Bronze.</span>
                    ) : null}
                  </p>
                  {!isAdmin && tier === "bronze" ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Bronze is currently assigned manually by the site admin and includes cloud projects and reports.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void refreshSubscription()}
                    disabled={tierLoading}
                    className="mt-2 text-left text-xs font-medium text-slate-600 underline decoration-slate-400/80 underline-offset-2 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh status from server
                  </button>
                </div>
              )}
            </div>

            {tierLoading ? (
              <p className="text-sm text-slate-600">Loading subscription details...</p>
            ) : (
              <>
                <MembershipTierColumns effectiveTier={effectiveTier} tierLoading={tierLoading} />

                <p className="text-center text-xs text-slate-500">
                  Daily quotas reset on the Europe/Istanbul calendar day. Membership tiers are currently managed manually
                  by the site administrator from the admin panel.
                </p>
                {isAdmin ? (
                  <p className="text-center text-sm text-slate-600">
                    <Link
                      href="/admin"
                      className="font-semibold text-amber-900 underline decoration-amber-700/50 underline-offset-4 hover:text-amber-950"
                    >
                      Admin panel
                    </Link>{" "}
                    - search users by email and set tiers.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {personalTabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePersonalTab(tab.id)}
                className={`btn-base btn-md ${
                  activePersonalTab === tab.id ? "bg-slate-900 text-white hover:bg-slate-800" : ""
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activePersonalTab === "information" ? (
          <dl className="text-sm">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <dt className="font-medium text-slate-700">Email</dt>
              <dd className="min-w-0 break-all text-slate-900">{email}</dd>
            </div>
          </dl>
        ) : null}

        {activePersonalTab === "password" ? (
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

        {activePersonalTab === "privacy" ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="space-y-1">
              <p className="font-medium text-slate-900">Privacy and Account Deletion</p>
              <p>
                Please review our{" "}
                <Link href="/privacy-policy" className="font-semibold underline underline-offset-4">
                  Privacy Policy
                </Link>{" "}
                for data handling details.
              </p>
              <p>This action permanently deletes your account from the authentication system.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void onDeleteAccount();
              }}
              disabled={isDeletingAccount}
              className="btn-base btn-md border-red-200 text-red-700 hover:bg-red-50"
            >
              {isDeletingAccount ? "Deleting..." : "Delete Account"}
            </button>
            {deleteMessage ? (
              <p
                className={`rounded-lg border px-3.5 py-3 text-sm ${
                  deleteOk ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {deleteMessage}
              </p>
            ) : null}
          </div>
        ) : null}
        </div>
      )}
    </section>
  );
}
