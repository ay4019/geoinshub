import Link from "next/link";

import { ArticleCard } from "@/components/article-card";
import { ToolCard } from "@/components/tool-card";
import { VisitTracker } from "@/components/visit-tracker";
import { getFeaturedArticles, getFeaturedTools } from "@/lib/data-layer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featuredTools = getFeaturedTools(3);
  const featuredInsights = getFeaturedArticles(3);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-10 px-3 py-6 sm:space-y-16 sm:px-6 sm:py-12">
      <VisitTracker />

      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-8 sm:p-10">
        <div className="flex flex-col gap-4 sm:gap-6">
          <h1 className="pb-0.5 text-3xl font-bold leading-tight text-slate-900 sm:pb-1 sm:text-5xl sm:leading-[1.12] lg:text-6xl">
            Geotechnical Insights Hub
          </h1>
          <p className="text-sm leading-6 text-slate-700 sm:text-lg sm:leading-8">
            Geotechnical Insights Hub brings together practical soil mechanics, design code interpretation, and real-world engineering experience in a single platform. From fundamental calculations to advanced geotechnical behaviour, the content is structured to support clear assumptions, consistent parameter selection, and reliable analysis.
            <br />
            <br />
            Applicable across engineering practice, academic research, and education, it brings together analytical tools, technical insights, and field-based understanding—supporting applications from learning to design and construction, and enabling more confident and defensible geotechnical decisions.
          </p>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-wrap gap-3 sm:gap-6">
          <Link
            href="/tools"
            className="btn-base btn-lg"
          >
              Explore Tools
          </Link>
          <Link
            href="/blog"
            className="btn-base btn-lg"
          >
            Read Blog
          </Link>
          </div>
          <p className="text-xs text-slate-600 sm:text-sm">
            Need help getting started?{" "}
            <Link
              href="/docs/guide"
              className="font-semibold text-slate-800 underline underline-offset-4 transition-colors hover:text-slate-950"
            >
              Guide
            </Link>
          </p>
        </div>
      </section>

      <section className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Featured Tools</h2>
            <p className="mt-1 text-xs text-slate-700 sm:text-sm">
              A curated set of engineering tools, organised under Site Characterisation and Geotechnical Analysis, is
              designed to support systematic and reliable preliminary assessments, with full access available via{" "}
              <span className="font-semibold text-slate-900">View More</span> or the{" "}
              <span className="font-semibold text-slate-900">Tools</span> page.
            </p>
          </div>
          <Link
            href="/tools"
            className="shrink-0 self-start text-sm font-semibold text-slate-800 transition-colors hover:text-slate-950 sm:self-auto"
          >
            View more
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {featuredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Featured Blog</h2>
            <p className="mt-1 text-xs text-slate-700 sm:text-sm">
              A curated selection of geotechnical and railway engineering articles presents design interpretation,
              calculation logic, and field-informed technical judgement, with full access available via{" "}
              <span className="font-semibold text-slate-900">View More</span> or the{" "}
              <span className="font-semibold text-slate-900">Blog</span> page.
            </p>
          </div>
          <Link
            href="/blog"
            className="shrink-0 self-start text-sm font-semibold text-slate-800 transition-colors hover:text-slate-950 sm:self-auto"
          >
            View more
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {featuredInsights.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}


