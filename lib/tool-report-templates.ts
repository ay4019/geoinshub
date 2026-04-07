export interface ToolReportTemplate {
  defaultNarrative: string;
  aiPromptHint?: string;
}

const defaultNarrative =
  "This preliminary geotechnical report presents tool-based calculations and profile visualisation generated within Geotechnical Insights Hub. The results are intended for early-stage screening, technical comparison, and assumption testing. They must be reviewed and verified by qualified engineers, together with project-specific investigation data and governing design requirements, before any design or construction decision is made.";

const TOOL_REPORT_TEMPLATES: Record<string, ToolReportTemplate> = {
  default: {
    defaultNarrative,
    aiPromptHint:
      "Focus on practical trend interpretation, possible data quality checks, and cautious preliminary implications.",
  },
  "cu-from-pi-and-spt": {
    defaultNarrative,
    aiPromptHint:
      "Interpret undrained shear strength profile trends from PI and SPT-based screening values, highlighting consistency across boreholes.",
  },
};

export function getToolReportTemplate(toolSlug: string): ToolReportTemplate {
  return TOOL_REPORT_TEMPLATES[toolSlug] ?? TOOL_REPORT_TEMPLATES.default;
}

