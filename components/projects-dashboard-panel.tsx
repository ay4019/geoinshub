"use client";

import { AccountProjectsPanel } from "@/components/account-projects-panel";
import { useSubscription } from "@/components/subscription-context";
import { tierUi } from "@/lib/subscription";

export function ProjectsDashboardPanel() {
  const { tier, isAdmin } = useSubscription();
  const tierStyle = tierUi(tier, isAdmin);

  return (
    <section
      className={`account-ui-sans mx-auto max-w-[1200px] rounded-[1.5rem] border-2 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7 ${tierStyle.borderClass}`}
      style={tierStyle.ringStyle}
    >
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Projects</h1>
        <p className="text-sm leading-6 text-slate-600 sm:text-base">
          Manage cloud projects, boreholes, and saved analyses linked to your tools and reports.
        </p>
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <AccountProjectsPanel />
      </div>
    </section>
  );
}
