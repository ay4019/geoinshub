import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EngineeringText } from "@/components/engineering-text";
import { ToolCalculator } from "@/components/tool-calculator";
import { ToolUnitToggle } from "@/components/tool-unit-provider";
import { getToolBySlug, getToolSlugs } from "@/lib/data-layer";

interface ToolDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getToolSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ToolDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return { title: "Tool Not Found" };
  }

  return {
    title: tool.title,
    description: tool.shortDescription,
  };
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/tools" className="inline-flex text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        {"<-"} Back to all tools
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{tool.category}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              <EngineeringText text={tool.title} />
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <EngineeringText text={tool.shortDescription} />
            </p>
          </div>
          <ToolUnitToggle compact />
        </div>
      </section>

      <ToolCalculator tool={tool} />
    </div>
  );
}
