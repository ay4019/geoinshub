import type { Metadata } from "next";

import { GuideProjectsDashboardSnapshot } from "@/components/guide-projects-dashboard-snapshot";

export const metadata: Metadata = {
  title: "Guide capture — Projects (empty)",
  robots: { index: false, follow: false },
};

export default function GuideCaptureProjectsEmptyPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <GuideProjectsDashboardSnapshot variant="empty" />
    </div>
  );
}
