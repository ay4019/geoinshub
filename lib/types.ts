export const TOOL_CATEGORIES = [
  "Soil Parameters",
  "Soil Classification",
  "Bearing Capacity",
  "Settlement",
  "Earth Pressure & Retaining Structures",
  "Pile Foundations",
  "Ground Improvement",
  "Liquefaction",
  "Railway Geotechnics",
  "Field & In-Situ Testing",
  "Correlations & Empirical Tools",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
export type ToolInputType = "number" | "select";
export type UnitSystem = "metric" | "american";
export type ToolStatus = "active" | "archived";

export interface ToolInputOption {
  label: string;
  value: string;
}

export interface ToolInput {
  name: string;
  label: string;
  type: ToolInputType;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string;
  options?: ToolInputOption[];
}

export interface ToolInformation {
  methodology: string;
  assumptions: string[];
  limitations: string[];
  equations: string[];
  references: string[];
  disclaimer: string;
  tables?: ToolInformationTable[];
}

export interface ToolInformationTable {
  title: string;
  columns: string[];
  rows: string[][];
  note?: string;
}

export interface ToolDefinition {
  slug: string;
  title: string;
  category: ToolCategory;
  status?: ToolStatus;
  shortDescription: string;
  tags: string[];
  keywords: string[];
  featured: boolean;
  inputs: ToolInput[];
  information: ToolInformation;
}

export interface InsightArticle {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  thumbnail: string;
  featured: boolean;
  readTimeMinutes: number;
  content: string[];
  blocks?: InsightArticleBlock[];
}

export type InsightArticleBlock =
  | {
      type: "paragraph" | "note" | "heading" | "author";
      text: string;
    }
  | {
      type: "equation";
      lines: string[];
      label?: string;
      caption?: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
    }
  | {
      type: "bibliography";
      items: string[];
    };

export interface CounterStore {
  visits: number;
  toolUses: number;
  articleReads: number;
  toolBreakdown: Record<string, number>;
  articleBreakdown: Record<string, number>;
}

export interface PublicCounters {
  visits: number;
  toolUses: number;
  articleReads: number;
}

export interface CalculationResultItem {
  label: string;
  value: number | string;
  unit?: string;
}

export interface CalculationResult {
  title: string;
  summary?: string;
  items: CalculationResultItem[];
  notes: string[];
  warnings: string[];
}
