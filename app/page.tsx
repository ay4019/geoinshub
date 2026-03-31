import Link from "next/link";

import { getMetricsAction } from "@/app/actions/analytics";
import { ArticleCard } from "@/components/article-card";
import { CounterGrid } from "@/components/counter-grid";
import { ToolCard } from "@/components/tool-card";
import { VisitTracker } from "@/components/visit-tracker";
import { getFeaturedArticles, getFeaturedTools } from "@/lib/data-layer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const counters = await getMetricsAction();
  const featuredTools = getFeaturedTools(3);
  const featuredInsights = getFeaturedArticles(3);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-16 px-4 py-10 sm:px-6 sm:py-12">
      <VisitTracker />

      <section className="flex flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-col gap-6">
          <h1 className="pb-1 text-4xl font-bold leading-[1.12] text-slate-900 sm:text-5xl lg:text-6xl">
            Geotechnical Insights Hub
          </h1>
          <p className="text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
            Geotechnical Insights Hub brings together fundamental soil mechanics calculations, advanced technical topics, and the latest developments in geotechnical engineering.
            <br />
            <br />
            A structured platform designed to support rigorous analysis, informed parameter selection, and practical engineering decision-making.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 sm:gap-6">
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
      </section>

      <CounterGrid counters={counters} />

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Featured Tools</h2>
            <p className="mt-1 text-sm text-slate-700">Practical calculators for preliminary geotechnical assessments.</p>
          </div>
          <Link href="/tools" className="text-sm font-semibold text-slate-800 transition-colors hover:text-slate-950">
            View more
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Featured Blog</h2>
            <p className="mt-1 text-sm text-slate-700">Owner-written articles on methods, assumptions, and interpretation.</p>
          </div>
          <Link
            href="/blog"
            className="text-sm font-semibold text-slate-800 transition-colors hover:text-slate-950"
          >
            View more
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredInsights.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}


