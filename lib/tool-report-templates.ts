export interface ToolReportTemplate {
  defaultNarrative: string;
  aiPromptHint?: string;
}

/** Single-line block in `cu-from-pi-and-spt` narrative; UI/PDF replace with Stroud (1974) figure. */
export const CU_REPORT_STROUD_FIGURE_PLACEHOLDER = "[[STROUD_FIGURE_1]]";

export const CU_REPORT_STROUD_FIGURE_CAPTION =
  "Figure 1: Relationship between SPT (N60), plasticity index (PI), and undrained shear strength (Stroud, 1974)";

/** Centred report heading; matches on-screen caption typography. */
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

/** Effective cohesion (c′) from undrained shear strength — Table 1 / on-screen caption. */
export const CPRIME_REPORT_TABLE_1_TITLE =
  "Table 1 — Effective cohesion (c′) from undrained shear strength (c_u), by borehole and depth";

export const CPRIME_REPORT_FIGURE_2_CAPTION =
  "Figure 2: Soil profile — effective cohesion (c′) versus depth";

export const CPRIME_REPORT_REFERENCE_ENTRIES: readonly string[] = [
  "Das, B.M. (2011) Principles of Foundation Engineering. 7th edn. Stamford, CT: Cengage Learning.",
  "Sorensen, K.K. and Okkels, N. (2013) 'Correlation between undrained shear strength and effective cohesion in clays', Proceedings of the Institution of Civil Engineers – Geotechnical Engineering, 166(5), pp. 432–441.",
];

/** Effective friction angle (φ′) from PI — Table 1 / on-screen caption. */
export const PHI_PI_REPORT_TABLE_1_TITLE =
  "Table 1 — Effective friction angle (φ′) from plasticity index (PI), by borehole and depth";

export const PHI_PI_REPORT_FIGURE_1_CAPTION =
  "Figure 1: Soil profile — effective friction angle (φ′) versus depth";

export const PHI_PI_REPORT_REFERENCE_ENTRIES: readonly string[] = [
  "Das, B.M. (2011) Principles of Foundation Engineering. 7th edn. Stamford, CT: Cengage Learning.",
  "Sorensen, K.K. and Okkels, N. (2013) 'Correlation between soil plasticity and effective strength parameters', Proceedings of the Institution of Civil Engineers – Geotechnical Engineering, 166(5), pp. 432–441.",
];

/** SPT corrections — results table (PDF / on-screen). */
export const SPT_REPORT_TABLE_2_TITLE =
  "Table 2 — Corrected SPT resistances (N\u2086\u2080 and (N\u2081)\u2086\u2080) and correction factors, by borehole and sample depth";

export const SPT_REPORT_FIGURE_1_CAPTION =
  "Figure 1: Soil profile — corrected SPT resistance N\u2086\u2080 versus depth";

export const SPT_REPORT_FIGURE_2_CAPTION =
  "Figure 2: Soil profile — overburden-corrected resistance (N\u2081)\u2086\u2080 versus depth";

export const SPT_REPORT_REFERENCE_ENTRIES: readonly string[] = [
  "Das, B.M. (2011) Principles of Foundation Engineering. 7th edn. Stamford, CT: Cengage Learning.",
  "ASTM D1586/D1586M. Standard Test Method for Standard Penetration Test (SPT) and Split-Barrel Sampling of Soils.",
  "Idriss, I.M. and Boulanger, R.W. (2008) Soil Liquefaction During Earthquakes. Oakland, CA: Earthquake Engineering Research Institute.",
];

/** Single-line blocks in `spt-corrections` narrative; PDF/UI render centered equations with Eq.1 / Eq.2 labels. */
export const SPT_REPORT_EQ_N60_PLACEHOLDER = "[[SPT_EQ_N60]]";
export const SPT_REPORT_EQ_N160_PLACEHOLDER = "[[SPT_EQ_N160]]";

const defaultNarrative =
  "This preliminary geotechnical report presents tool-based calculations and profile visualisation generated within Geotechnical Insights Hub. The results are intended for early-stage screening, technical comparison, and assumption testing. They must be reviewed and verified by qualified engineers, together with project-specific investigation data and governing design requirements, before any design or construction decision is made.";

const TOOL_REPORT_TEMPLATES: Record<string, ToolReportTemplate> = {
  default: {
    defaultNarrative,
    aiPromptHint:
      "Focus on practical trend interpretation, possible data quality checks, and cautious preliminary implications.",
  },
  "cprime-from-cu": {
    defaultNarrative: `1. Determination of Soil Parameters

The geotechnical design parameters to be adopted in the analyses are intended to be derived from both field and laboratory test results. The collected data are interpreted using widely accepted empirical correlations available in the literature, as outlined in the following sections, to establish representative soil parameters for design purposes. Where necessary, alternative correlations recognised in the literature may also be employed to ensure consistency and reliability in parameter selection.

Within the scope of this section, the correlations used for the estimation of strength parameters are presented separately for cohesive and cohesionless soil types.

1.1. Effective Shear Strength (c′)

For cohesive soils, the effective cohesion (c′) has been estimated using the empirical correlation presented in Figure 2.3, as proposed by Sorensen and Okkels.

According to this relationship, the effective cohesion is expressed as a function of the undrained shear strength (c_u), and has been approximated as:

c′ = 0.1 × c_u (kPa)

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 1 and Figure 2.`,
    aiPromptHint:
      "Interpret effective cohesion (c′) derived from c_u via the Sorensen and Okkels (2013) style relationship (c′ = 0.1 c_u), commenting on profile trends, consistency across boreholes, and limitations of the correlation.",
  },
  "friction-angle-from-pi": {
    defaultNarrative: `1. Determination of Soil Parameters

The geotechnical design parameters to be adopted in the analyses are intended to be derived from both field and laboratory test results. The collected data are interpreted using widely accepted empirical correlations available in the literature, as outlined in the following sections, to establish representative soil parameters for design purposes. Where necessary, alternative correlations recognised in the literature may also be employed to ensure consistency and reliability in parameter selection.

Within the scope of this section, the correlations used for the estimation of strength parameters are presented separately for cohesive and cohesionless soil types.

1.1. Effective Friction Angle (φ′)

For cohesive soils, the effective friction angle (φ′) has been estimated using the empirical correlation proposed by Sorensen and Okkels (2013), which relates plasticity index (PI) to effective strength trends for screening estimates.

According to this relationship, φ′ is expressed as a function of PI and has been approximated as:

φ′ = 45 − 14 log₁₀(PI) (deg)

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 1 and Figure 1.`,
    aiPromptHint:
      "Interpret effective friction angle (φ′) derived from PI via the Sorensen and Okkels (2013) style relationship (φ′ = 45 − 14 log₁₀(PI)), commenting on profile trends, consistency across boreholes, and limitations of empirical PI-based screening.",
  },
  "spt-corrections": {
    defaultNarrative: `1. Determination of Soil Parameters

1.1. Standard Penetration Test (SPT) corrections

The Standard Penetration Test (SPT) is a widely used in-situ testing method for assessing the mechanical properties and relative density or consistency of soils. The test is conducted in accordance with ASTM D1586 and EN ISO 22476-3.

The procedure involves driving a standard split-spoon sampler into the soil using a 63.5 kg hammer falling from a height of 760 mm. The number of blows required to advance the sampler over a total penetration of 450 mm is recorded in three consecutive increments of 150 mm. The blows corresponding to the first 150 mm are considered as seating and are disregarded. The sum of the blows recorded for the subsequent 300 mm penetration is defined as the penetration resistance N, commonly referred to as the SPT N-value.

If the sampler fails to penetrate 150 mm within 50 blows, the test is terminated and refusal is recorded. In such cases, the result is typically expressed in the form 50/n, where n represents the achieved penetration in centimetres.

The measured SPT N-values are corrected for factors such as hammer energy, borehole diameter, rod length, and sampler configuration to obtain normalised N60 values. These corrected values are used together with overburden correction to obtain (N1)60 for subsequent empirical correlations.

The measured SPT N-values are corrected to account for testing conditions. The normalised value N60 is obtained by applying correction factors for rod length (C_r), sampler type (C_s), borehole diameter (C_b), and hammer energy (C_E). Furthermore, the overburden-corrected value (N1)60 is determined by incorporating the overburden correction factor (C_N) following Idriss and Boulanger (2008). Here, C_N represents the overburden correction factor, C_r the rod length correction factor, C_s the sampler correction factor, C_b the borehole diameter correction factor, and C_E the energy correction factor.

{{sptEquipmentParagraph}}

Vertical effective stress σ′v0 at the sample depth is evaluated from bulk unit weight and groundwater depth (water unit weight γw = 9.81 kN/m³). The overburden correction factor C_N is computed from σ′v0, with 0.40 ≤ C_N ≤ 1.70.

[[SPT_EQ_N60]]

[[SPT_EQ_N160]]

The overburden-corrected resistance may also be written as (N1)60 = C_N N60, subject to (N1)60 ≤ 2 N60.

The corrected SPT values are tabulated in Table 2 using the correction sequence and depth bands implemented in this assessment.

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 2. SPT N60 and (N1)60 plots are given in Figure 1 and Figure 2.`,
    aiPromptHint:
      "Interpret corrected SPT N60 and (N1)60 profiles versus depth, comment on consistency across boreholes, energy and equipment assumptions, overburden correction (CN), and limitations of standardised corrections versus project-specific verification.",
  },
  "cu-from-pi-and-spt": {
    defaultNarrative: `1. Determination of Soil Parameters

The geotechnical design parameters to be adopted in the analyses are intended to be derived from both field and laboratory test results. The collected data are interpreted using widely accepted empirical correlations available in the literature, as outlined in the following sections, to establish representative soil parameters for design purposes. Where necessary, alternative correlations recognised in the literature may also be employed to ensure consistency and reliability in parameter selection.

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

