import Image from "next/image";
import Link from "next/link";

import type { InsightArticle } from "@/lib/types";

interface ArticleCardProps {
  article: InsightArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
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
