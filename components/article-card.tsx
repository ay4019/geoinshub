import Image from "next/image";
import Link from "next/link";

import type { InsightArticle } from "@/lib/types";

interface ArticleCardProps {
  article: InsightArticle;
  /** "open": image and text without a surrounding frame (used on the home page). */
  variant?: "card" | "open";
}

export function ArticleCard({ article, variant = "card" }: ArticleCardProps) {
  if (variant === "open") {
    return (
      <article className="group flex h-full flex-col">
        <Link href={`/blog/${article.slug}`} className="relative block h-44 w-full overflow-hidden rounded-md sm:h-52" tabIndex={-1}>
          <Image
            src={article.thumbnail}
            alt={`${article.title} thumbnail`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        </Link>
        <h3 className="mt-3 text-base leading-snug font-semibold text-slate-900 sm:text-[1.05rem]">
          <Link href={`/blog/${article.slug}`} className="transition-colors duration-200 hover:!text-amber-800">
            {article.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-600">{article.excerpt}</p>
        <Link
          href={`/blog/${article.slug}`}
          className="mt-2 w-fit text-sm font-semibold !text-amber-800 underline-offset-4 hover:underline"
        >
          Read article →
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44 w-full sm:h-56">
        <Image
          src={article.thumbnail}
          alt={`${article.title} thumbnail`}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 33vw, 100vw"
        />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="text-sm leading-snug font-semibold text-slate-900 sm:text-[1.05rem]">
          <Link
            href={`/blog/${article.slug}`}
            className="transition-colors duration-200 hover:text-slate-700"
          >
            {article.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-[11px] leading-[1.45] text-slate-600 sm:mt-2.5 sm:text-sm sm:leading-6">{article.excerpt}</p>
        <Link
          href={`/blog/${article.slug}`}
          className="btn-base btn-md mt-2 w-fit text-xs sm:mt-3 sm:text-[0.95rem]"
        >
          Read Article
        </Link>
      </div>
    </article>
  );
}
