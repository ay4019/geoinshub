import { tools as toolLibrary } from "@/data/tools";
import articlesData from "@/data/articles.json";
import type { InsightArticle, ToolDefinition } from "@/lib/types";

const tools = toolLibrary as ToolDefinition[];
const articles = articlesData as InsightArticle[];
const toolAliases: Record<string, string> = {
  "shallow-foundation-bearing-capacity": "traditional-bearing-capacity-methods",
  "terzaghi-bearing-capacity": "traditional-bearing-capacity-methods",
  "meyerhof-bearing-capacity": "traditional-bearing-capacity-methods",
  "hansen-bearing-capacity": "traditional-bearing-capacity-methods",
  "vesic-bearing-capacity": "traditional-bearing-capacity-methods",
  "allowable-bearing-capacity": "traditional-bearing-capacity-methods",
  "liquefaction-csr": "seed-idriss-liquefaction-screening",
  "liquefaction-crr": "seed-idriss-liquefaction-screening",
  "liquefaction-factor-of-safety": "seed-idriss-liquefaction-screening",
  "gmax-vs-correlation": "gmax-from-vs",
};

function isActiveTool(tool: ToolDefinition): boolean {
  return tool.status !== "archived";
}

function getActiveTools(): ToolDefinition[] {
  return tools.filter(isActiveTool);
}

export function getAllTools(): ToolDefinition[] {
  return getActiveTools();
}

export function getFeaturedTools(limit = 3): ToolDefinition[] {
  const featuredHomeSlugs = [
    "spt-corrections",
    "modulus-from-cu",
    "eurocode-7-bearing-resistance",
  ];

  const curatedTools = featuredHomeSlugs
    .map((slug) => getActiveTools().find((tool) => tool.slug === slug))
    .filter((tool): tool is ToolDefinition => Boolean(tool));

  return curatedTools.slice(0, limit);
}

export function getToolsByCategory(): Record<string, ToolDefinition[]> {
  return getActiveTools().reduce<Record<string, ToolDefinition[]>>((acc, tool) => {
    acc[tool.category] ??= [];
    acc[tool.category].push(tool);
    return acc;
  }, {});
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  const resolvedSlug = toolAliases[slug] ?? slug;
  return getActiveTools().find((tool) => tool.slug === resolvedSlug);
}

export function getAllArticles(): InsightArticle[] {
  return [...articles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getFeaturedArticles(limit = 3): InsightArticle[] {
  return getAllArticles()
    .filter((article) => article.featured)
    .slice(0, limit);
}

export function getArticleBySlug(slug: string): InsightArticle | undefined {
  return articles.find((article) => article.slug === slug);
}

export function getToolSlugs(): string[] {
  return getActiveTools().map((tool) => tool.slug);
}

export function getArticleSlugs(): string[] {
  return articles.map((article) => article.slug);
}
