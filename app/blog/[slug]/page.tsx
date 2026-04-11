import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleFurtherReadingDialog } from "@/components/article-further-reading-dialog";
import { ArticleReadTracker } from "@/components/article-read-tracker";
import { getArticleBySlug, getArticleSlugs } from "@/lib/data-layer";

interface BlogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return { title: "Article Not Found" };
  }

  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const blocks = article.blocks ?? article.content.map((paragraph) => ({ type: "paragraph" as const, text: paragraph }));

  return (
    <article className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      <ArticleReadTracker slug={article.slug} />

      <Link
        href="/blog"
        className="inline-flex text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 sm:text-lg"
      >
        {"<-"} Back to blog
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-8 sm:py-6">
        <h1 className="text-xl leading-snug font-semibold text-slate-900 sm:text-3xl sm:leading-tight">{article.title}</h1>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-8">
        <div className="space-y-5 text-sm leading-7 text-slate-700 sm:space-y-6 sm:text-[16px] sm:leading-8">
          {blocks.map((block, index) => {
            if (block.type === "paragraph") {
              return <p key={`${block.type}-${index}`}>{block.text}</p>;
            }

            if (block.type === "note") {
              return (
                <p key={`${block.type}-${index}`} className="text-xs italic leading-6 text-slate-600 sm:text-sm sm:leading-7">
                  {block.text}
                </p>
              );
            }

            if (block.type === "image") {
              return (
                <figure key={`${block.type}-${index}`} className="mx-auto max-w-4xl space-y-3">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <Image
                      src={block.src}
                      alt={block.alt}
                      width={1200}
                      height={675}
                      className="h-auto w-full object-contain"
                    />
                  </div>
                  {block.caption ? (
                    <figcaption className="text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">{block.caption}</figcaption>
                  ) : null}
                </figure>
              );
            }

            if (block.type === "equation") {
              return (
                <div key={`${block.type}-${index}`} className="mx-auto max-w-4xl space-y-2">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex min-w-max items-start justify-between gap-6">
                      <div className="space-y-3 font-serif text-base leading-relaxed tracking-tight text-slate-900 sm:text-lg [&_sub]:text-[0.72em] [&_sub]:align-[-0.25em] [&_sup]:text-[0.72em] [&_sup]:align-[0.45em]">
                        {block.lines.map((line, lineIndex) => (
                          <div
                            key={`${block.type}-${index}-${lineIndex}`}
                            dangerouslySetInnerHTML={{ __html: line }}
                          />
                        ))}
                      </div>
                      {block.label ? (
                        <div className="shrink-0 pt-1 text-xs font-medium text-slate-500 sm:text-sm">{block.label}</div>
                      ) : null}
                    </div>
                  </div>
                  {block.caption ? <p className="text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">{block.caption}</p> : null}
                </div>
              );
            }

            if (block.type === "heading") {
              return (
                <h2 key={`${block.type}-${index}`} className="pt-2 text-lg font-semibold text-slate-900 sm:pt-3 sm:text-2xl">
                  {block.text}
                </h2>
              );
            }

            if (block.type === "author") {
              return (
                <p key={`${block.type}-${index}`} className="text-sm font-medium text-slate-800 sm:text-base">
                  {block.text}
                </p>
              );
            }

            if (block.type === "bibliography") {
              return (
                <ul key={`${block.type}-${index}`} className="space-y-2 text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }

            if (block.type === "further_reading_dialog") {
              return <ArticleFurtherReadingDialog key={`${block.type}-${index}`} block={block} />;
            }

            return null;
          })}
        </div>

      </section>
    </article>
  );
}
