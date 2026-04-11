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

      <section className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-8 sm:p-10">
        <div className="flex flex-col gap-4 sm:gap-5">
          <h1 className="pb-0.5 text-3xl font-bold leading-tight text-slate-900 sm:pb-1 sm:text-5xl sm:leading-[1.12] lg:text-6xl">
            Geotechnical Insights Hub
          </h1>
          <p className="max-w-4xl text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-relaxed">
            Calculators, technical writing, and cloud project workflows in one place—so you can move from field data and
            correlations to documented assumptions and preliminary design checks with fewer hand-offs. Built for practice,
            research, and teaching.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <Link href="/tools" className="btn-base btn-lg">
            Explore Tools
          </Link>
          <Link href="/blog" className="btn-base btn-lg">
            Read Blog
          </Link>
        </div>
        <div className="border-t border-slate-200 pt-6">
          <p className="text-base leading-relaxed text-slate-700 sm:text-lg">
            <span className="font-semibold text-slate-900">New to the hub?</span>{" "}
            <Link
              href="/docs/guide"
              className="font-semibold !text-amber-700 underline !decoration-amber-400/90 decoration-2 underline-offset-[5px] transition-colors hover:!text-amber-800 hover:!decoration-amber-500"
            >
              Getting started guide
            </Link>
            <span className="text-slate-600"> — tools, account, projects, and saved analyses.</span>
          </p>
        </div>
      </section>

      <section className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Featured Tools</h2>
            <p className="mt-1 text-sm text-slate-600">
              Highlights from the catalogue — browse everything under{" "}
              <Link href="/tools" className="font-semibold text-slate-800 underline-offset-2 hover:underline">
                Tools
              </Link>
              .
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
            <p className="mt-1 text-sm text-slate-600">
              Latest posts — the full archive lives on{" "}
              <Link href="/blog" className="font-semibold text-slate-800 underline-offset-2 hover:underline">
                Blog
              </Link>
              .
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


