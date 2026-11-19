import Image from "next/image";
import Link from "next/link";

import type { InsightArticle } from "@/lib/types";

/** Blog index for the field-notebook design: a plain list instead of a card grid (no dates or read times). */
export function FieldBlogIndex({ articles }: { articles: InsightArticle[] }) {
  return (
    <div className="mx-auto max-w-[1120px]" style={{ paddingBottom: 48 }}>
      <header className="fd-page-head" style={{ paddingTop: 0 }}>
        <p className="fd-label">Blog · {articles.length} articles</p>
        <h1>Writing</h1>
        <p>
          Geotechnical and railway engineering articles: design code comparisons, the principles behind the calculations,
          and how academic methods meet field practice. Site observations and photographs support the discussion of
          assumptions, uncertainty and the responsible use of simplified methods.
        </p>
      </header>

      <section style={{ maxWidth: 900, marginTop: 28, borderTop: "2px solid var(--fd-ink)" }}>
        {articles.map((article) => (
          <article key={article.slug} className="fd-entry fd-entry-with-thumb">
            <div>
              <h3>
                <Link href={`/blog/${article.slug}`}>{article.title}</Link>
              </h3>
              <p>{article.excerpt}</p>
              {article.tags.length ? (
                <p className="fd-label" style={{ marginTop: 8 }}>
                  {article.tags.slice(0, 4).join(" · ")}
                </p>
              ) : null}
            </div>
            <Link href={`/blog/${article.slug}`} className="fd-entry-thumb" tabIndex={-1} aria-hidden="true">
              <Image src={article.thumbnail} alt="" fill className="object-cover" sizes="132px" />
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
