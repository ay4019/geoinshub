import type { Metadata } from "next";

import { GuideEuN60AutofillSnapshot } from "@/components/guide-eu-n60-autofill-snapshot";

export const metadata: Metadata = {
  title: "Guide capture — Eu N60 autofill",
  robots: { index: false, follow: false },
};

export default function GuideCaptureEuN60AutofillPage() {
  return (
    <div className="min-h-screen bg-slate-100/80 px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <GuideEuN60AutofillSnapshot />
      </div>
    </div>
  );
}
