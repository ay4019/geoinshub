import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide capture — header",
  robots: { index: false, follow: false },
};

/** Minimal page so the header can be screenshot with guide tier styling (see lib/guide-capture). */
export default function GuideCaptureAccountHeaderPage() {
  return <div className="min-h-[30vh] bg-slate-50" />;
}
