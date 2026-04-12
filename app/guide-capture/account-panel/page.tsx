import type { Metadata } from "next";

import { AccountDashboardPanel } from "@/components/account-dashboard-panel";

export const metadata: Metadata = {
  title: "Guide capture — account panel",
  robots: { index: false, follow: false },
};

/** Renders the account dashboard with simulated Gold tier for user-guide screenshots. */
export default function GuideCaptureAccountPanelPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <AccountDashboardPanel email="you@example.com" />
    </div>
  );
}
