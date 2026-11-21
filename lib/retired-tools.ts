/**
 * Tools that were retired or merged into another tool. Saved project results and parameters from them stay in
 * the project (and in the integrated parameter matrix); these entries tell the UI how to treat links to them.
 */
export interface RetiredTool {
  /** Tool that now provides the same parameter, or null when nothing replaces it. */
  replacementSlug: string | null;
  message: string;
}

export const RETIRED_TOOLS: Record<string, RetiredTool> = {
  "cprime-from-cu": {
    replacementSlug: null,
    message:
      "The c′ from cᵤ tool has been retired (c′ = 0.1cᵤ has no reliable basis). Saved c′ values remain in the parameter matrix; take c′ from drained triaxial tests or a cautious 0–5 kPa for clays.",
  },
  "eurocode-7-bearing-resistance": {
    replacementSlug: "traditional-bearing-capacity-methods",
    message:
      "Eurocode 7 bearing resistance is now a method option in Shallow Foundation Bearing Capacity. Open that tool and choose “Eurocode 7 (EN 1997-1 Annex D)”.",
  },
  "compression-index-correlations": {
    replacementSlug: "eoed-from-mv",
    message: "Compression index correlations are now part of Consolidation Parameters (Eoed, m_v and C_c).",
  },
};

export function getRetiredTool(slug: string | null | undefined): RetiredTool | null {
  return slug ? (RETIRED_TOOLS[slug.trim()] ?? null) : null;
}
