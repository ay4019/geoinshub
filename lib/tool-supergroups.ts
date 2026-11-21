/**
 * Top-level groups of the tool catalogue. Site characterisation tools work on project borehole data; geotechnical
 * analysis tools take their own inputs, so the Projects and Boreholes selector is hidden for them.
 * Shared by the catalogue (client), the tools layout (server) and the tools header (client).
 */
export const TOOL_SUPERGROUPS = [
  {
    id: "site-characterization",
    title: "Site Characterisation Tools",
    categories: ["Shear Strength Tools", "Rigidity / Deformation Tools", "Stress Related Tools", "Field & In-Situ Testing", "Soil Parameters"],
  },
  {
    id: "geotechnical-analysis",
    title: "Geotechnical Analysis Tools",
    categories: [
      "Bearing Capacity",
      "Settlement",
      "Liquefaction",
      "Earth Pressure & Retaining Structures",
      "Pile Foundations",
      "Slope Stability",
      "Ground Improvement",
      "Railway Geotechnics",
    ],
  },
] as const;

export type ToolSupergroupId = (typeof TOOL_SUPERGROUPS)[number]["id"];

export const ANALYSIS_SUPERGROUP: ToolSupergroupId = "geotechnical-analysis";

export function isAnalysisCategory(category: string): boolean {
  return (TOOL_SUPERGROUPS[1].categories as readonly string[]).includes(category);
}

/** The catalogue keeps the selected group in ?section= and announces changes with this window event. */
export const TOOLS_SECTION_EVENT = "gih:tools-section";

export function readToolsSection(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("section");
}

export function writeToolsSection(id: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("section", id);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(TOOLS_SECTION_EVENT));
}
