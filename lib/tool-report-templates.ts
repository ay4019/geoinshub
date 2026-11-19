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
  "Sorensen, K.K. and Okkels, N. (2013) 'Correlation between drained shear strength and plasticity index of undisturbed overconsolidated clays', Proceedings of the 18th International Conference on Soil Mechanics and Geotechnical Engineering, Paris, pp. 423-428.",
];

/** Effective friction angle (φ′) from PI — Table 1 / on-screen caption. */
export const PHI_PI_REPORT_TABLE_1_TITLE =
  "Table 1 — Effective friction angle (φ′) from plasticity index (PI), by borehole and depth";

export const PHI_PI_REPORT_FIGURE_1_CAPTION =
  "Figure 1: Soil profile — effective friction angle (φ′) versus depth";

export const PHI_PI_REPORT_REFERENCE_ENTRIES: readonly string[] = [
  "Das, B.M. (2011) Principles of Foundation Engineering. 7th edn. Stamford, CT: Cengage Learning.",
  "Sorensen, K.K. and Okkels, N. (2013) 'Correlation between drained shear strength and plasticity index of undisturbed overconsolidated clays', Proceedings of the 18th International Conference on Soil Mechanics and Geotechnical Engineering, Paris, pp. 423-428.",
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
  "EN ISO 22476-3. Geotechnical investigation and testing — Field testing — Part 3: Standard penetration test.",
  "Liao, S.S.C. and Whitman, R.V. (1986) 'Overburden correction factors for SPT in sand', Journal of Geotechnical Engineering, 112(3), pp. 373-377.",
  "Skempton, A.W. (1986) 'Standard penetration test procedures and the effects in sands of overburden pressure, relative density, particle size, ageing and overconsolidation', Geotechnique, 36(3), pp. 425-447.",
  "Youd, T.L. et al. (2001) 'Liquefaction resistance of soils: summary report from the 1996 NCEER and 1998 NCEER/NSF workshops', Journal of Geotechnical and Geoenvironmental Engineering, 127(10), pp. 817-833.",
];

/** Single-line blocks in `spt-corrections` narrative; PDF/UI render centered equations with Eq.1 / Eq.2 labels. */
export const SPT_REPORT_EQ_N60_PLACEHOLDER = "[[SPT_EQ_N60]]";
export const SPT_REPORT_EQ_N160_PLACEHOLDER = "[[SPT_EQ_N160]]";

/** Single-line block in `eoed-from-mv` narrative; UI/PDF replace with PI-f2 chart. */
export const EOED_REPORT_PI_F2_FIGURE_PLACEHOLDER = "[[PI_F2_FIGURE]]";

export const EOED_REPORT_PI_F2_FIGURE_CAPTION =
  "Figure 1: PI-f2 chart used to select f2 for the empirical Eoed = f2N60 alternative";

export const EOED_REPORT_TABLE_1_TITLE =
  "Table 1 — Oedometer constrained modulus (Eoed) by borehole and depth";

export const EOED_REPORT_FIGURE_2_CAPTION =
  "Figure 2: Soil profile — coefficient of volume compressibility (mv) versus depth";

export const EOED_REPORT_FIGURE_3_CAPTION =
  "Figure 3: Soil profile — oedometer constrained modulus (Eoed) versus depth";

export const EOED_REPORT_REFERENCE_ENTRIES: readonly string[] = [
  "Das, B.M. and Sobhan, K. (2021) Principles of Geotechnical Engineering. 10th edn. Boston, MA: Cengage Learning.",
  "Stroud, M.A. (1974) 'The Standard Penetration Test in insensitive clays and soft rocks', Proceedings of the European Symposium on Penetration Testing (ESOPT), Stockholm, Vol. 2, pp. 367-375.",
  "Tomlinson, M.J. (2001) Foundation Design and Construction. 7th edn. Harlow: Pearson Education.",
  "Bowles, J.E. (1996) Foundation Analysis and Design. 5th edn. New York: McGraw-Hill.",
];

const defaultNarrative =
  "This preliminary geotechnical report presents tool-based calculations and profile visualisation generated within Geotechnical Insights Hub. The results are intended for early-stage screening, technical comparison, and assumption testing. They must be reviewed and verified by qualified engineers, together with project-specific investigation data and governing design requirements, before any design or construction decision is made.";

const TOOL_REPORT_TEMPLATES: Record<string, ToolReportTemplate> = {
  default: {
    defaultNarrative,
    aiPromptHint:
      "Focus on practical trend interpretation, possible data quality checks, and cautious preliminary implications.",
  },
  "eoed-from-mv": {
    defaultNarrative: `1. Determination of Deformation Parameters

The oedometer constrained modulus (Eoed) represents one-dimensional compression stiffness and is commonly interpreted from oedometer test data. When the coefficient of volume compressibility (m_v) is available for the relevant stress interval, Eoed is calculated directly as the reciprocal of m_v.

Where oedometer test data are not available, an empirical screening alternative may be used. In this route, the plasticity index (PI) is used to select f2 from the PI-f2 chart of Stroud (1974), reproduced in Figure 1, and Eoed is estimated from the corrected SPT resistance N60. The f2 chart was derived for insensitive overconsolidated clays and weak rocks, so the resulting stiffness is indicative only.

${EOED_REPORT_PI_F2_FIGURE_PLACEHOLDER}

The calculation paths used in this assessment are:

Eoed = 1 / m_v

f2 = f(PI)

Eoed = f2 x N60

{{eoedMethodParagraph}}

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 1, Figure 2 and Figure 3.`,
    aiPromptHint:
      "Interpret Eoed profiles from either direct mv input or the PI-f2 chart alternative. Comment on stress dependency, PI and N60 data quality, borehole consistency, and the limitations of empirical stiffness screening versus oedometer testing.",
  },
  "cprime-from-cu": {
    defaultNarrative: `1. Determination of Soil Parameters

The geotechnical design parameters to be adopted in the analyses are intended to be derived from both field and laboratory test results. The collected data are interpreted using widely accepted empirical correlations available in the literature, as outlined in the following sections, to establish representative soil parameters for design purposes. Where necessary, alternative correlations recognised in the literature may also be employed to ensure consistency and reliability in parameter selection.

Within the scope of this section, the correlations used for the estimation of strength parameters are presented separately for cohesive and cohesionless soil types.

1.1. Effective Cohesion (c′)

For parameter screening, the effective cohesion (c′) is assigned using cautious soil-type defaults unless the empirical c_u-based alternative is explicitly selected.

For normally consolidated clays, c′ should generally be kept within a low 0-5 kPa range. For sand and gravel, c′ is taken as 0 kPa. The c′ = 0.1 × c_u relationship, commonly attributed in practice to the overconsolidated-clay data of Sorensen and Okkels (2013), is retained only as an optional empirical alternative; it should not be assumed valid for all clays and should be checked against drained triaxial or direct shear tests.

{{cprimeMethodParagraph}}

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 1 and Figure 2.`,
    aiPromptHint:
      "Interpret effective cohesion (c′) using the selected method: soil-type defaults for NC clay and sand / gravel, or the optional c′ = 0.1 c_u empirical alternative only when explicitly selected. Comment on profile trends, consistency across boreholes, and limitations of the selected assumption.",
  },
  "friction-angle-from-pi": {
    defaultNarrative: `1. Determination of Soil Parameters

The geotechnical design parameters to be adopted in the analyses are intended to be derived from both field and laboratory test results. The collected data are interpreted using widely accepted empirical correlations available in the literature, as outlined in the following sections, to establish representative soil parameters for design purposes. Where necessary, alternative correlations recognised in the literature may also be employed to ensure consistency and reliability in parameter selection.

Within the scope of this section, the correlations used for the estimation of strength parameters are presented separately for cohesive and cohesionless soil types.

1.1. Effective Friction Angle (φ′)

For cohesive soils, the effective friction angle (φ′) has been estimated using the mean-trend correlation proposed by Sorensen and Okkels (2013) for undisturbed overconsolidated clays, which relates plasticity index (PI) to drained strength. The correlation should be applied within the PI range of its database (approximately PI = 4 to 50); outside that range, or for normally consolidated, organic, or highly fissured clays, laboratory verification is required.

According to this relationship, φ′ is expressed as a function of PI and has been approximated as:

φ′ = 45 − 14 log₁₀(PI) (deg)

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 1 and Figure 1.`,
    aiPromptHint:
      "Interpret effective friction angle (φ′) derived from PI via the Sorensen and Okkels (2013) style relationship (φ′ = 45 − 14 log₁₀(PI)), commenting on profile trends, consistency across boreholes, and limitations of empirical PI-based screening.",
  },
  "spt-corrections": {
    defaultNarrative: `1. Determination of Soil Parameters

1.1. Standard Penetration Test (SPT) corrections

The Standard Penetration Test (SPT) is a widely used in-situ testing method for assessing the mechanical properties and relative density or consistency of soils. The test is normally performed in accordance with ASTM D1586/D1586M or EN ISO 22476-3.

The procedure involves driving a standard split-spoon sampler into the soil using a 63.5 kg hammer falling from a height of 760 mm. The number of blows required to advance the sampler over a total penetration of 450 mm is recorded in three consecutive increments of 150 mm. The blows corresponding to the first 150 mm are considered as seating and are disregarded. The sum of the blows recorded for the subsequent 300 mm penetration is defined as the penetration resistance N, commonly referred to as the SPT N-value.

If the sampler fails to penetrate 150 mm within 50 blows, the test is terminated and refusal is recorded. In such cases, the result is typically expressed in the form 50/n, where n represents the achieved penetration in centimetres.

The measured SPT N-values are corrected to account for testing conditions. The energy-standardised value N60 is obtained by applying correction factors for hammer energy (C_E = ER/60), borehole diameter (C_b), rod length (C_r), and sampler configuration (C_s), following Youd et al. (2001) and Skempton (1986). The overburden-corrected value (N1)60 is then obtained with the overburden correction factor C_N of Liao and Whitman (1986), as adopted by Youd et al. (2001).

{{sptEquipmentParagraph}}

The rod length correction C_r is assigned from the depth bands of Youd et al. (2001), with the rod length approximated by the sample depth. Vertical effective stress σ′v0 at the sample depth is evaluated from bulk unit weight and groundwater depth (water unit weight γw = 9.81 kN/m³). The overburden correction factor is calculated as C_N = 9.78 (1/σ′v0)^0.5 with σ′v0 in kPa, and is limited to the range 0.40 to 1.70.

[[SPT_EQ_N60]]

[[SPT_EQ_N160]]

The overburden-corrected resistance may also be written as (N1)60 = C_N N60; as a practical screening cap, (N1)60 is not taken greater than 2 N60. Samples recorded as refusal (N = 50) are reported as N60 = (N1)60 = 50 without further correction and should be interpreted as lower-bound resistances.

The corrected SPT values are tabulated in Table 2 using the correction sequence and depth bands implemented in this assessment.

Within this scope, the boreholes {{boreholes}} associated with the {{projectName}} Project have been evaluated. The obtained results, together with the soil profile established with respect to depth, are presented in Table 2. SPT N60 and (N1)60 plots are given in Figure 1 and Figure 2.`,
    aiPromptHint:
      "Interpret corrected SPT N60 and (N1)60 profiles versus depth. Comment on consistency across boreholes, the effect of the assumed hammer energy ratio (a measured ER is preferred), the depth-band rod length correction, how C_N lowers (N1)60 below N60 at depth and raises it near the surface, refusal values as lower bounds, and which subsequent correlations (density, friction angle, liquefaction) depend on N60 versus (N1)60.",
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
      "Interpret the c_u profile obtained from c_u = f1 x N60 (Stroud 1974). Comment on whether c_u increases with depth as expected for a normally to lightly overconsolidated clay or indicates a desiccated crust or stiff layer, on the influence of PI on f1, on consistency across boreholes, and on the fact that SPT-based c_u is indicative only and should be checked against laboratory (UU triaxial) or field vane data.",
  },
};

export function getToolReportTemplate(toolSlug: string): ToolReportTemplate {
  return TOOL_REPORT_TEMPLATES[toolSlug] ?? TOOL_REPORT_TEMPLATES.default;
}
