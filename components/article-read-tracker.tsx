"use client";

import { useEffect } from "react";

import { incrementArticleReadAction } from "@/app/actions/analytics";

interface ArticleReadTrackerProps {
  slug: string;
}

export function ArticleReadTracker({ slug }: ArticleReadTrackerProps) {
  useEffect(() => {
    if (!slug) {
      return;
    }

    void incrementArticleReadAction(slug);
  }, [slug]);

  return null;
}
