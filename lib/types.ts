export const TOOL_CATEGORIES = [
  "Shear Strength Tools",
  "Rigidity / Deformation Tools",
  "Stress Related Tools",
  "Soil Parameters",
  "Soil Classification",
  "Bearing Capacity",
  "Settlement",
  "Earth Pressure & Retaining Structures",
  "Pile Foundations",
  "Slope Stability",
  "Ground Improvement",
  "Liquefaction",
  "Railway Geotechnics",
  "Field & In-Situ Testing",
  "Correlations & Empirical Tools",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
export type ToolInputType = "number" | "select";
export type UnitSystem = "metric" | "american";
/** "draft" = implemented and registered but hidden from listings and routes until switched to "active". */
export type ToolStatus = "active" | "archived" | "draft";

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
  /** Optional heading the Calculation form groups consecutive inputs under. */
  group?: string;
}

export interface ToolInformation {
  methodology: string;
  assumptions: string[];
  limitations: string[];
  equations: string[];
  references: string[];
  disclaimer: string;
  tables?: ToolInformationTable[];
  figures?: ToolInformationFigure[];
}

export interface ToolInformationTable {
  title: string;
  columns: string[];
  rows: string[][];
  note?: string;
}

export interface ToolInformationFigure {
  src: string;
  alt: string;
  caption?: string;
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

export type ArticleStatus = "active" | "archived";

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
  /** Omitted or "active" = shown in listings; "archived" = hidden from blog and static routes. */
  status?: ArticleStatus;
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
    }
  | {
      type: "further_reading_dialog";
      triggerLabel: string;
      dialogTitle: string;
      /** Built-in extended content (e.g. long Q&A from a source document). */
      preset?: FurtherQuestionsPreset;
    }
  | {
      type: "list";
      /** Plain strings, or `{ term, text }` to render a bold lead-in followed by the text. */
      items: Array<string | { term: string; text: string }>;
    };

export type FurtherQuestionsPreset = "hardening-soil-further-questions" | "liquefaction-further-questions";

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

/** Headline result shown to everyone (also guests) right under the Calculate button. */
export interface CalculationHeadline {
  label: string;
  value: number | string;
  unit?: string;
  /** pass / fail checks get a green or red badge. */
  status?: "pass" | "fail";
  note?: string;
}

/**
 * One line of the detailed calculation. Bronze sees label = value; Silver and Gold also see the general formula and
 * the formula with the numbers substituted.
 */
export interface CalculationStepLine extends CalculationResultItem {
  formula?: string;
  substituted?: string;
}

export interface CalculationStep {
  title: string;
  lines: CalculationStepLine[];
}

export interface CalculationResult {
  title: string;
  summary?: string;
  items: CalculationResultItem[];
  notes: string[];
  warnings: string[];
  /** Key results; when absent the first item is used. */
  headline?: CalculationHeadline[];
  /** Step-by-step calculation; when absent the items are shown as a single step. */
  steps?: CalculationStep[];
}
