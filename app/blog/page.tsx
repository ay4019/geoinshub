import { ArticleCard } from "@/components/article-card";
import { getAllArticles } from "@/lib/data-layer";

export default function BlogPage() {
  const articles = getAllArticles();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Blog</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          Geotechnical and railway engineering insights are presented through technically grounded articles, where
          design code comparisons, underlying calculation principles, and the integration of academic knowledge with
          field practice are systematically explored. Practical observations, construction methodologies, and selected
          site photographs are incorporated to support engineering judgement, alongside discussions on assumptions,
          uncertainties, and the responsible application of simplified methods.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </section>
    </div>
  );
}
