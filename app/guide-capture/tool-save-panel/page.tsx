import type { Metadata } from "next";

import { GuideToolSavePanelSnapshot } from "@/components/guide-tool-save-panel-snapshot";

export const metadata: Metadata = {
  title: "Guide capture — Save profile analysis",
  robots: { index: false, follow: false },
};

export default function GuideCaptureToolSavePanelPage() {
  return (
    <div className="min-h-screen bg-slate-100/80 px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <GuideToolSavePanelSnapshot />
      </div>
    </div>
  );
}
