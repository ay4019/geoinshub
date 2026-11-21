import { tools as toolLibrary } from "@/data/tools";
import { draftTools } from "@/data/tools-drafts";
import articlesData from "@/data/articles.json";
import { isAnalysisCategory } from "@/lib/tool-supergroups";
import type { InsightArticle, ToolDefinition } from "@/lib/types";

const tools = [...(toolLibrary as ToolDefinition[]), ...draftTools];
const articles = articlesData as InsightArticle[];

function isActiveArticle(article: InsightArticle): boolean {
  return article.status !== "archived";
}

function getActiveArticles(): InsightArticle[] {
  return articles.filter(isActiveArticle);
}
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
  // Merged tools: old URLs open the tool that now contains them.
  "compression-index-correlations": "eoed-from-mv",
  "eurocode-7-bearing-resistance": "traditional-bearing-capacity-methods",
};

function isActiveTool(tool: ToolDefinition): boolean {
  return tool.status !== "archived" && tool.status !== "draft";
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
    "gmax-from-vs",
    "traditional-bearing-capacity-methods",
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
  return [...getActiveArticles()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getFeaturedArticles(limit = 3): InsightArticle[] {
  return getAllArticles()
    .filter((article) => article.featured)
    .slice(0, limit);
}

export function getArticleBySlug(slug: string): InsightArticle | undefined {
  return getActiveArticles().find((article) => article.slug === slug);
}

export function getToolSlugs(): string[] {
  return getActiveTools().map((tool) => tool.slug);
}

export function getArticleSlugs(): string[] {
  return getActiveArticles().map((article) => article.slug);
}

/**
 * Slugs (including aliases) of geotechnical analysis tools that take their own inputs — the tools header hides the
 * project/borehole selector there. Liquefaction tools are kept out: they import samples from project boreholes.
 */
export function getAnalysisToolSlugs(): string[] {
  const slugs = getActiveTools()
    .filter((tool) => isAnalysisCategory(tool.category) && tool.category !== "Liquefaction")
    .map((tool) => tool.slug);
  const aliases = Object.entries(toolAliases)
    .filter(([, target]) => slugs.includes(target))
    .map(([alias]) => alias);
  return [...slugs, ...aliases];
}
