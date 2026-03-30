import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    <article className="space-y-6">
      <ArticleReadTracker slug={article.slug} />

      <Link href="/blog" className="inline-flex text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        {"<-"} Back to blog
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl leading-tight font-semibold text-slate-900">{article.title}</h1>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5 text-base leading-8 text-slate-700">
          {blocks.map((block, index) => {
            if (block.type === "paragraph") {
              return <p key={`${block.type}-${index}`}>{block.text}</p>;
            }

            if (block.type === "note") {
              return (
                <p key={`${block.type}-${index}`} className="text-sm italic leading-7 text-slate-600">
                  {block.text}
                </p>
              );
            }

            if (block.type === "image") {
              return (
                <figure key={`${block.type}-${index}`} className="space-y-3">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <Image
                      src={block.src}
                      alt={block.alt}
                      width={1200}
                      height={675}
                      className="h-auto w-full object-contain"
                    />
                  </div>
                  {block.caption ? <figcaption className="text-sm leading-6 text-slate-500">{block.caption}</figcaption> : null}
                </figure>
              );
            }

            if (block.type === "equation") {
              return (
                <div key={`${block.type}-${index}`} className="space-y-2">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex min-w-max items-start justify-between gap-6">
                      <div className="space-y-3 font-serif text-lg leading-relaxed tracking-tight text-slate-900 [&_sub]:text-[0.72em] [&_sub]:align-[-0.25em] [&_sup]:text-[0.72em] [&_sup]:align-[0.45em]">
                        {block.lines.map((line, lineIndex) => (
                          <div
                            key={`${block.type}-${index}-${lineIndex}`}
                            dangerouslySetInnerHTML={{ __html: line }}
                          />
                        ))}
                      </div>
                      {block.label ? <div className="shrink-0 pt-1 text-sm font-medium text-slate-500">{block.label}</div> : null}
                    </div>
                  </div>
                  {block.caption ? <p className="text-sm leading-6 text-slate-500">{block.caption}</p> : null}
                </div>
              );
            }

            if (block.type === "heading") {
              return (
                <h2 key={`${block.type}-${index}`} className="pt-3 text-xl font-semibold text-slate-900">
                  {block.text}
                </h2>
              );
            }

            if (block.type === "author") {
              return (
                <p key={`${block.type}-${index}`} className="font-medium text-slate-800">
                  {block.text}
                </p>
              );
            }

            if (block.type === "bibliography") {
              return (
                <ul key={`${block.type}-${index}`} className="space-y-2 text-base leading-8 text-slate-700">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }

            return null;
          })}
        </div>

      </section>
    </article>
  );
}
