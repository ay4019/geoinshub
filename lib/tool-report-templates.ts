export interface ToolReportTemplate {
  defaultNarrative: string;
  aiPromptHint?: string;
}

/** Single-line block in `cu-from-pi-and-spt` narrative; UI/PDF replace with Stroud (1974) figure. */
export const CU_REPORT_STROUD_FIGURE_PLACEHOLDER = "[[STROUD_FIGURE_1]]";

export const CU_REPORT_STROUD_FIGURE_CAPTION =
  "Figure 1: Relationship between SPT (N60), plasticity index (PI), and undrained shear strength (Stroud, 1974)";

/** Centered report heading; matches on-screen caption typography. */
export const CU_REPORT_TABLE_1_TITLE =
  "Table 1 — Undrained shear strength (c_u) from SPT (N60) and plasticity index (PI), by borehole and depth";

export const CU_REPORT_FIGURE_2_CAPTION =
  "Figure 2: Soil profile — undrained shear strength (c_u) versus depth";

/** Same order as PDF §2; shared by on-screen report and `createToolReportPdf`. */
export const CU_REPORT_REFERENCE_ENTRIES: readonly string[] = [
  "Das, B.M. (2011) Principles of Foundation Engineering. 7th edn. Stamford, CT: Cengage Learning.",
  "Stroud, M.A. (1974) 'The Standard Penetration Test in insensitive clays and soft rocks', Proceedings of the European Symposium on Penetration Testing (ESOPT), Stockholm, Vol. 2, pp. 367-375.",
  "Skempton, A.W. (1986) 'Standard penetration test procedures and the effects in sands of overburden pressure, relative density, particle size, ageing and overconsolidation', Geotechnique, 36(3), 425-447.",
  "Clayton, C.R.I. (1995) The Standard Penetration Test (SPT): Methods and Interpretation. CIRIA Report 143. London: CIRIA.",
  "Kulhawy, F.H. and Mayne, P.W. (1990) Manual on Estimating Soil Properties for Foundation Design. Report EL-6800, Electric Power Research Institute, Palo Alto, CA.",
  "Terzaghi, K., Peck, R.B. and Mesri, G. (1996) Soil Mechanics in Engineering Practice. 3rd edn. New York: Wiley.",
];

const defaultNarrative =
  "This preliminary geotechnical report presents tool-based calculations and profile visualisation generated within Geotechnical Insights Hub. The results are intended for early-stage screening, technical comparison, and assumption testing. They must be reviewed and verified by qualified engineers, together with project-specific investigation data and governing design requirements, before any design or construction decision is made.";

const TOOL_REPORT_TEMPLATES: Record<string, ToolReportTemplate> = {
  default: {
    defaultNarrative,
    aiPromptHint:
      "Focus on practical trend interpretation, possible data quality checks, and cautious preliminary implications.",
  },
  "cu-from-pi-and-spt": {
    defaultNarrative: `1. Determination of Soil Parameters

The geotechnical design parameters to be adopted in the analyses are intended to be derived from both field and laboratory test results. The collected data are interpreted using widely accepted empirical correlations available in the literature, as outlined in the following sections, to establish representative soil parameters for design purposes. Where necessary, alternative correlations recognized in the literature may also be employed to ensure consistency and reliability in parameter selection.

Within the scope of this section, the correlations used for the estimation of strength parameters are presented separately for cohesive and cohesionless soil types.

1.1. Undrained Shear Strength (c_u)

The undrained shear strength of cohesive soils has been evaluated using the empirical framework proposed by Stroud (1974), which relates SPT blow counts to soil plasticity for screening estimates of strength in cohesive materials.

In this approach, representative SPT N60 values and plasticity index (PI) are read for each depth interval of interest. The adopted values have been obtained using the correlation presented in Figure 1.

${CU_REPORT_STROUD_FIGURE_PLACEHOLDER}

For routine screening, blow counts are expressed as energy-corrected N60. The factor f1 is taken from Figure 1 for the plasticity index of the soil layer; where PI lies outside the chart range, or where soil behaviour departs from the Stroud correlation, alternative correlations or laboratory verification should be considered.

Based on the chart, the undrained shear strength (c_u) has been determined by multiplying the SPT N60 value by the corresponding f1 factor selected for the relevant plasticity index (PI). This relationship is expressed in Equation (1).

c_u = f1 x N60 (kPa)

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 1 and Figure 2.`,
    aiPromptHint:
      "Interpret undrained shear strength profile trends from PI and SPT-based screening values, highlighting consistency across boreholes.",
  },
};

export function getToolReportTemplate(toolSlug: string): ToolReportTemplate {
  return TOOL_REPORT_TEMPLATES[toolSlug] ?? TOOL_REPORT_TEMPLATES.default;
}

