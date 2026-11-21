import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EngineeringText } from "@/components/engineering-text";
import { SubscriptionOverride } from "@/components/subscription-context";
import { ToolCalculator } from "@/components/tool-calculator";
import { ToolUnitProvider } from "@/components/tool-unit-provider";
import { ToolsHeader } from "@/components/tools-header";
import { getAnalysisToolSlugs, getToolBySlug } from "@/lib/data-layer";
import { normaliseSubscriptionTier } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "Guide capture — tool",
  robots: { index: false, follow: false },
};

/** A tool page rendered as a chosen membership tier (?tier=none|bronze|silver|gold) for user-guide screenshots. */
export default async function GuideCaptureToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tier?: string }>;
}) {
  const { slug } = await params;
  const { tier: tierParam } = await searchParams;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  const tier = tierParam === "none" ? "none" : normaliseSubscriptionTier(tierParam ?? "gold");

  return (
    <ToolUnitProvider>
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 py-6 sm:px-6 sm:py-12" data-guide-capture="tool">
      <ToolsHeader analysisSlugs={getAnalysisToolSlugs()} />
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{tool.category}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          <EngineeringText text={tool.title} />
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          <EngineeringText text={tool.shortDescription} />
        </p>
      </section>
      <SubscriptionOverride tier={tier}>
        <ToolCalculator tool={tool} captureTier={tier} />
      </SubscriptionOverride>
    </div>
    </ToolUnitProvider>
  );
}
