import type { Metadata } from "next";

import { GuideCprimeProfileAutofillSnapshot } from "@/components/guide-cprime-profile-autofill-snapshot";

export const metadata: Metadata = {
  title: "Guide capture — c′ profile autofill",
  robots: { index: false, follow: false },
};

export default function GuideCaptureCprimeProfileAutofillPage() {
  return (
    <div className="min-h-screen bg-slate-100/80 px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <GuideCprimeProfileAutofillSnapshot />
      </div>
    </div>
  );
}
