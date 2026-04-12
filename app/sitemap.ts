import type { MetadataRoute } from "next";

import { getArticleSlugs, getToolSlugs } from "@/lib/data-layer";
import { getSiteUrl } from "@/lib/site-url";

const baseUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/tools",
    "/blog",
    "/contact",
    "/terms",
    "/privacy-policy",
    "/disclaimer",
    "/docs/guide",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
  }));

  const toolRoutes: MetadataRoute.Sitemap = getToolSlugs().map((slug) => ({
    url: `${baseUrl}/tools/${slug}`,
    lastModified: now,
  }));

  const insightRoutes: MetadataRoute.Sitemap = getArticleSlugs().map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: now,
  }));

  return [...staticRoutes, ...toolRoutes, ...insightRoutes];
}
