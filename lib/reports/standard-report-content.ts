import type { StandardReportContent, StandardReportSeries } from "@/lib/reports/standard-report-types";

/**
 * Part 1 ("General information") of the standard report for each tool. Text is project-independent;
 * Part 2 is assembled from the tool payload at report time. Equations use Unicode sub/superscripts that
 * exist in the embedded Noto Sans subset (see lib/pdf-safe-text.ts).
 */

const profileCaption = (subject: string) => (series: StandardReportSeries) =>
  `${subject}: ${series.label}${series.unit ? ` (${series.unit})` : ""} versus depth, by borehole`;

const REF = {
  kramer: "Kramer, S.L. (1996) Geotechnical Earthquake Engineering. Upper Saddle River, NJ: Prentice Hall.",
  hardinDrnevich:
    "Hardin, B.O. and Drnevich, V.P. (1972) 'Shear modulus and damping in soils: design equations and curves', Journal of the Soil Mechanics and Foundations Division, ASCE, 98(SM7), pp. 667-692.",
  tpm: "Terzaghi, K., Peck, R.B. and Mesri, G. (1996) Soil Mechanics in Engineering Practice. 3rd edn. New York: Wiley.",
  casagrande:
    "Casagrande, A. (1936) 'The determination of the pre-consolidation load and its practical significance', Proceedings of the 1st ICSMFE, Cambridge, MA, Vol. 3, pp. 60-64.",
  kulhawyMayne:
    "Kulhawy, F.H. and Mayne, P.W. (1990) Manual on Estimating Soil Properties for Foundation Design. Report EL-6800. Palo Alto, CA: Electric Power Research Institute.",
  pht: "Peck, R.B., Hanson, W.E. and Thornburn, T.H. (1974) Foundation Engineering. 2nd edn. New York: Wiley.",
  wolff:
    "Wolff, T.F. (1989) 'Pile capacity prediction using parameter functions', in Predicted and Observed Axial Behavior of Piles. ASCE Geotechnical Special Publication 23, pp. 96-106.",
  butler:
    "Butler, F.G. (1975) 'Heavily over-consolidated clays', in Settlement of Structures. Proceedings of the Conference organised by the British Geotechnical Society, Cambridge, 1974. London: Pentech Press.",
  stroud:
    "Stroud, M.A. (1974) 'The Standard Penetration Test in insensitive clays and soft rocks', Proceedings of the European Symposium on Penetration Testing (ESOPT), Stockholm, Vol. 2, pp. 367-375.",
  duncanBuchignani:
    "Duncan, J.M. and Buchignani, A.L. (1976) An Engineering Manual for Settlement Studies. Geotechnical Engineering Report. Berkeley: Department of Civil Engineering, University of California.",
  bowles: "Bowles, J.E. (1996) Foundation Analysis and Design. 5th edn. New York: McGraw-Hill.",
  tbdy: "AFAD (2018) Türkiye Bina Deprem Yönetmeliği (TBDY 2018), Bölüm 16. Ankara: Afet ve Acil Durum Yönetimi Başkanlığı.",
  youd2001:
    "Youd, T.L. et al. (2001) 'Liquefaction resistance of soils: summary report from the 1996 NCEER and 1998 NCEER/NSF workshops', Journal of Geotechnical and Geoenvironmental Engineering, 127(10), pp. 817-833.",
  ib2008: "Idriss, I.M. and Boulanger, R.W. (2008) Soil Liquefaction During Earthquakes. MNO-12. Oakland, CA: Earthquake Engineering Research Institute.",
  boussinesq:
    "Poulos, H.G. and Davis, E.H. (1974) Elastic Solutions for Soil and Rock Mechanics. New York: Wiley.",
  navfac: "NAVFAC (1986) Design Manual 7.01 — Soil Mechanics. Alexandria, VA: Naval Facilities Engineering Command.",
  terzaghi43: "Terzaghi, K. (1943) Theoretical Soil Mechanics. New York: Wiley.",
  meyerhof63:
    "Meyerhof, G.G. (1963) 'Some recent research on the bearing capacity of foundations', Canadian Geotechnical Journal, 1(1), pp. 16-26.",
  hansen70: "Hansen, J.B. (1970) A Revised and Extended Formula for Bearing Capacity. Bulletin No. 28. Copenhagen: Danish Geotechnical Institute.",
  vesic73:
    "Vesić, A.S. (1973) 'Analysis of ultimate loads of shallow foundations', Journal of the Soil Mechanics and Foundations Division, ASCE, 99(SM1), pp. 45-73.",
  coduto: "Coduto, D.P. (2001) Foundation Design: Principles and Practices. 2nd edn. Upper Saddle River, NJ: Prentice Hall.",
  en1997: "EN 1997-1:2004 Eurocode 7: Geotechnical design — Part 1: General rules (including Annexes A and D). Brussels: CEN.",
  frank: "Frank, R. et al. (2004) Designers' Guide to EN 1997-1 Eurocode 7: Geotechnical Design — General Rules. London: Thomas Telford.",
};

export const STANDARD_REPORT_CONTENT: Record<string, StandardReportContent> = {
  "gmax-from-vs": {
    subject: "Small-Strain Shear Modulus (Gₘₐₓ)",
    introduction: [
      "The small-strain shear modulus Gₘₐₓ (also G₀) is the stiffness of soil at shear strains below about 10⁻⁵, where the response is effectively elastic. It is a fundamental input for site response analysis, dynamic soil–structure interaction, and advanced constitutive models (e.g. the small-strain stiffness of the HS-small model), and the reference value from which strain-dependent stiffness degradation curves are scaled.",
      "Because Gₘₐₓ is controlled by the shear-wave velocity Vₛ, which can be measured in situ by seismic methods (downhole, crosshole, seismic CPT, MASW), it is one of the few soil stiffness parameters that can be determined with little sample disturbance. The mass density ρ is obtained from the bulk unit weight.",
    ],
    equations: [
      { text: "ρ = γ / g", where: "ρ = mass density (kg/m³), γ = bulk unit weight (kN/m³), g = 9.81 m/s²" },
      { text: "Gₘₐₓ = ρ Vₛ²", where: "Vₛ = shear-wave velocity (m/s); Gₘₐₓ in Pa, reported in MPa" },
    ],
    guidance: [
      "Gₘₐₓ applies only to very small strains. Working-strain stiffness for settlement or retaining-wall analyses is typically 0.1–0.5 Gₘₐₓ depending on strain level, and must be selected with a degradation curve (e.g. Hardin and Drnevich, 1972) rather than taken directly from this value.",
    ],
    references: [REF.kramer, REF.hardinDrnevich],
    tableTitle: "Table 1 — Shear-wave velocity, unit weight and small-strain shear modulus by borehole and depth",
    figureCaption: profileCaption("Soil profile"),
    aiHint:
      "Interpret the Vs and Gmax profiles: increase with depth and confining stress, borehole consistency, anomalously stiff or soft zones, and the fact that Gmax is a very-small-strain stiffness that must be degraded for working strains. Mention whether Vs appears measured or correlated only if the base text says so.",
  },

  "ocr-calculator": {
    subject: "Overconsolidation Ratio (OCR)",
    introduction: [
      "The overconsolidation ratio expresses the stress history of a soil as the ratio between the maximum past vertical effective stress (preconsolidation stress σ′ₚ) and the current in-situ vertical effective stress σ′ᵥ₀. Normally consolidated soils have OCR ≈ 1; lightly overconsolidated soils typically 1–4; heavily overconsolidated soils exceed about 4.",
      "Stress history governs compressibility (recompression versus virgin compression), undrained strength ratio, at-rest earth pressure, and stiffness. σ′ₚ is normally interpreted from oedometer tests (e.g. the Casagrande construction) or estimated from in-situ tests; σ′ᵥ₀ follows from unit weight and groundwater conditions.",
    ],
    equations: [
      { text: "σ′ᵥ₀ = γ z − γw (z − z_w),  z > z_w", where: "z = sample depth, z_w = groundwater depth, γw = 9.81 kN/m³" },
      { text: "OCR = σ′ₚ / σ′ᵥ₀" },
    ],
    guidance: [
      "OCR is sensitive to the groundwater level and unit weight adopted for σ′ᵥ₀, particularly near the surface where σ′ᵥ₀ is small. Values below 1 usually indicate sample disturbance in the oedometer test, underconsolidation, or an incorrect groundwater assumption, and should be investigated.",
    ],
    references: [REF.casagrande, REF.tpm],
    tableTitle: "Table 1 — Vertical effective stress, preconsolidation stress and OCR by borehole and depth",
    figureCaption: profileCaption("Soil profile"),
    aiHint:
      "Interpret sigma'_v0 and OCR versus depth: identify a desiccated or overconsolidated crust (OCR decreasing with depth), normally consolidated zones (OCR near 1), and any OCR < 1 that suggests disturbance or groundwater error. Comment on implications for compressibility (C_r vs C_c) qualitatively.",
  },

  "friction-angle-from-spt": {
    subject: "Effective Friction Angle (φ′) from SPT",
    introduction: [
      "For clean to silty sands and gravels, undisturbed sampling is rarely practical, so the peak effective friction angle φ′ is commonly estimated from the overburden-corrected SPT blow count (N₁)₆₀. Peck, Hanson and Thornburn (1974) presented a chart relating blow count to φ′; Wolff (1989) fitted it with a quadratic expression in (N₁)₆₀.",
      "The correlation reflects the combined influence of relative density and confinement on dilatancy. It applies to granular soils only and is not valid for clays, cemented soils or gravels with oversized particles that inflate the blow count.",
    ],
    equations: [
      { text: "φ′ ≈ 27.1 + 0.3 (N₁)₆₀ − 0.00054 (N₁)₆₀²", where: "(N₁)₆₀ = energy- and overburden-corrected blow count; φ′ in degrees" },
    ],
    guidance: [
      "The estimated φ′ is a peak value for preliminary design. Values above about 40° should be adopted with caution, and constant-volume (critical state) friction angles of roughly 30–35° for quartz sands are more appropriate where large strains develop.",
    ],
    references: [REF.pht, REF.wolff, REF.kulhawyMayne],
    tableTitle: "Table 1 — Corrected SPT resistance (N₁)₆₀ and estimated effective friction angle φ′ by borehole and depth",
    figureCaption: profileCaption("Soil profile"),
    aiHint:
      "Interpret phi' derived from (N1)60 using the Wolff (1989) fit to Peck, Hanson & Thornburn: trend with depth, borehole consistency, values above 40 deg, and the applicability to granular soils only.",
  },

  "eu-from-spt-butler-1975": {
    subject: "Undrained Deformation Modulus (Eᵤ) from SPT",
    introduction: [
      "The undrained Young's modulus Eᵤ governs immediate (undrained) settlement of foundations on saturated clays. Where laboratory or in-situ stiffness measurements are not available, Eᵤ may be estimated from the energy-corrected SPT resistance N₆₀ using the empirical range reported by Butler (1975) for heavily overconsolidated clays: Eᵤ/N₆₀ ≈ 1.0–1.2 MPa.",
      "The correlation was derived from back-analysed case histories in stiff, overconsolidated clays and reflects stiffness at the strain levels typical of foundation loading. It should not be extrapolated to soft, normally consolidated or sensitive clays.",
    ],
    equations: [
      { text: "Eᵤ = (Eᵤ / N₆₀) · N₆₀,  Eᵤ / N₆₀ = 1000–1200 kPa", where: "N₆₀ = energy-corrected blow count; Eᵤ in kPa" },
    ],
    references: [REF.butler, REF.stroud, REF.kulhawyMayne],
    tableTitle: "Table 1 — Corrected SPT resistance N₆₀ and undrained deformation modulus Eᵤ by borehole and depth",
    figureCaption: profileCaption("Soil profile"),
    aiHint:
      "Interpret the Eu profile derived from Eu = (1000-1200) x N60 (Butler 1975): trend with depth, borehole consistency, and the limitation that the correlation is for stiff overconsolidated clays.",
  },

  "effective-modulus-eprime-cohesive": {
    subject: "Drained Young's Modulus (E′) of Cohesive Soils",
    introduction: [
      "Long-term (drained) settlement analyses of clays require the drained Young's modulus E′. A common route estimates the undrained modulus from the undrained shear strength through a modulus ratio Eᵤ/cᵤ that depends on plasticity and overconsolidation (Duncan and Buchignani, 1976), and then converts to drained conditions with a factor β′ = E′/Eᵤ.",
      "For an isotropic elastic material, E′/Eᵤ = 2(1 + ν′)/3, i.e. about 0.8–0.87 for ν′ = 0.2–0.3. Lower β′ values are used in practice for soft and silty clays to reflect non-linearity and higher compressibility; the β′ adopted for each sample is listed in Part 2.",
    ],
    equations: [
      { text: "Eᵤ = (Eᵤ / cᵤ) · cᵤ" },
      { text: "Eᵤ/cᵤ = 1500·OCR⁻⁰·⁵⁸ (PI < 30);  600·OCR⁻⁰·⁵⁵ (30 ≤ PI ≤ 50);  300·OCR⁻⁰·⁵⁸ (PI > 50)", where: "fit to the chart of Duncan and Buchignani (1976), 1 ≤ OCR ≤ 10" },
      { text: "E′ = β′ · Eᵤ", where: "β′ = 0.4 (soft clay), 0.6 (stiff clay), 0.7 (silt / silty clay) as adopted in this tool" },
    ],
    guidance: [
      "The β′ values used here are screening assumptions below the elastic bound and must be confirmed against oedometer (Eoed) or drained triaxial stiffness data before use in design.",
    ],
    references: [REF.duncanBuchignani, REF.kulhawyMayne],
    tableTitle: "Table 1 — Deformation modulus and drained Young's modulus E′ by borehole and depth",
    figureCaption: profileCaption("Soil profile"),
    aiHint:
      "Interpret the E' profile obtained as beta' x Eu: trend with depth, influence of the selected beta' (soil type) and Eu/cu ratio, borehole consistency, and the need to calibrate against oedometer or triaxial stiffness.",
  },

  "eprime-from-spt-cohesionless": {
    subject: "Drained Young's Modulus (E′) of Cohesionless Soils",
    introduction: [
      "Settlement of foundations on sands and gravels is governed by the drained Young's modulus E′, which is difficult to measure on undisturbed samples. Empirical correlations with the SPT blow count are therefore widely used for preliminary design. Kulhawy and Mayne (1990) relate E′/pₐ to N₆₀ for silty, clean normally consolidated and clean overconsolidated sands; Bowles (1996) tabulates several N₅₅-based expressions by soil type.",
      "The correlations show large scatter (often a factor of two) because E′ depends on strain level, stress history, ageing and cementation, none of which the SPT captures directly. The correlation selected for this assessment is stated in Part 2.",
    ],
    equations: [
      { text: "E′ = 500 N₆₀ (silty sand), 1000 N₆₀ (clean NC sand), 1500 N₆₀ (clean OC sand)  [kPa]", where: "Kulhawy and Mayne (1990), E′/pₐ = 5, 10, 15 N₆₀" },
      { text: "E′ = 500 (N₅₅ + 15) kPa,  E′ = 7000 (N₅₅)⁰·⁵ kPa, and further soil-specific forms (Bowles, 1996)", where: "N₅₅ = blow count normalised to 55% energy" },
    ],
    references: [REF.kulhawyMayne, REF.bowles],
    tableTitle: "Table 1 — SPT resistance and drained Young's modulus E′ by borehole and depth",
    figureCaption: profileCaption("Soil profile"),
    aiHint:
      "Interpret the E' profile from the selected SPT correlation: trend with depth, borehole consistency, the energy basis (N60 vs N55) of the chosen correlation, and the typical factor-of-two scatter of SPT-based stiffness.",
  },

  "seed-idriss-liquefaction-screening": {
    subject: "Liquefaction Triggering Screening",
    introduction: [
      "Liquefaction triggering is evaluated with the simplified stress-based procedure originated by Seed and Idriss: the cyclic stress (demand) induced by the design earthquake is compared with the cyclic resistance of the soil inferred from the corrected SPT blow count. The ratio of resistance to demand is the factor of safety against triggering, FS.",
      "Two procedures are available: the TBDY 2018 (Turkish Building Earthquake Code, Section 16) route, which uses the Youd et al. (2001) fines adjustment, resistance curve and magnitude factor and requires FS ≥ 1.10; and the Idriss and Boulanger (2008) route with its clean-sand equivalent blow count, magnitude scaling factor, depth reduction factor and overburden correction K_σ. The procedure used is stated in Part 2.",
      "Samples above the groundwater table, deeper than 20 m, or with (N₁)₆₀ > 30 are screened out as non-liquefiable within this simplified framework and are listed separately.",
    ],
    equations: [
      { text: "CSR = 0.65 (σᵥ₀ / σ′ᵥ₀) (aₘₐₓ / g) r_d" },
      { text: "TBDY 2018:  τ_eq = 0.65 σᵥ₀ (0.4 S_DS) r_d,  τ_R = CRR₇.₅ C_M σ′ᵥ₀,  FS = τ_R / τ_eq ≥ 1.10" },
      { text: "Idriss & Boulanger (2008):  FS = CRR₇.₅ · MSF · K_σ / CSR" },
      { text: "(N₁)₆₀cs = (N₁)₆₀ + Δ(N₁)₆₀  (I&B);  (N₁)₆₀f = α + β (N₁)₆₀  (TBDY / Youd et al.)" },
    ],
    guidance: [
      "FS from this screening indicates whether triggering is likely under the design motion; it does not quantify consequences. Settlement, lateral spreading, loss of bearing and post-liquefaction stability must be evaluated separately, and borderline or critical cases require site-specific analysis (e.g. CPT-based assessment, site response analysis).",
    ],
    references: [REF.tbdy, REF.youd2001, REF.ib2008],
    tableTitle: "Table 1 — Liquefaction triggering screening results by borehole and depth",
    figureCaption: (series) => `Factor of safety against liquefaction triggering versus depth (${series.referenceLine?.label ?? "FS limit"} shown dashed)`,
    aiHint:
      "Interpret the factor of safety versus depth: which depths and boreholes fall below the acceptance threshold, how FS varies with (N1)60 and fines content, the role of groundwater depth, and that consequences (settlement, lateral spreading) are not assessed by this screening.",
  },

  "integrated-settlement-analysis": {
    subject: "Foundation Settlement (Immediate and Consolidation)",
    introduction: [
      "Settlement of a shallow foundation is estimated as the sum of immediate (elastic) settlement of all layers and primary consolidation settlement of clay layers. The vertical stress increase beneath the centre of a uniformly loaded rectangular area is computed with Boussinesq elastic theory at the mid-depth of each layer, measured below the foundation base; the net applied pressure accounts for the weight of excavated soil.",
      "Immediate settlement uses the layer modulus Eₛ with a plane-strain factor (1 − ν²) and neglects lateral stress changes. Consolidation settlement uses either the coefficient of volume compressibility mᵥ or the compression and recompression indices C_c and C_r with the layer overconsolidation ratio. The time to reach the target degree of consolidation follows Terzaghi's one-dimensional theory.",
    ],
    equations: [
      { text: "q_net = q₀ − Σ γᵢ Δz_exc,i" },
      { text: "Δσ_z = I_z · q_net  (Boussinesq, centre of rectangle B × L, depth below base)" },
      { text: "sᵢ = Δσ_z H (1 − ν²) / Eₛ" },
      { text: "s_c = mᵥ Δσ_z H   or   s_c = H/(1 + e₀) [C_r log(σ′ₚ/σ′ᵥ₀) + C_c log((σ′ᵥ₀ + Δσ_z)/σ′ₚ)]" },
      { text: "t = T_v H_dr² / c_v" },
    ],
    guidance: [
      "Layer-wise settlement with a single stress point per layer becomes inaccurate for thick layers; sub-divide layers thicker than about B/2. Secondary compression, three-dimensional consolidation and foundation rigidity are not included.",
    ],
    references: [REF.boussinesq, REF.tpm, REF.navfac],
    tableTitle: "Table 1 — Stress increase and settlement by layer",
    figureCaption: (series) => `${series.label} versus layer mid-depth`,
    aiHint:
      "Interpret the layer-by-layer settlement: which layers dominate, the split between immediate and consolidation settlement, the effect of stress increase decaying with depth, and the main sensitivities (modulus, C_c/m_v, OCR).",
  },

  "traditional-bearing-capacity-methods": {
    subject: "Ultimate Bearing Capacity of Shallow Foundations",
    introduction: [
      "The ultimate bearing capacity of a shallow foundation under vertical, central load is evaluated with the general bearing capacity equation, superposing the contributions of cohesion, overburden and soil weight. Terzaghi (1943) introduced the equation; Meyerhof (1963), Hansen (1970) and Vesić (1973) extended it with shape and depth factors and revised the Nγ term. Each method is applied here with its own factors.",
      "The allowable bearing pressure is obtained by dividing the ultimate value by a global factor of safety. Groundwater is accounted for by using the buoyant unit weight below the water table in the overburden and Nγ terms.",
    ],
    equations: [
      { text: "q_ult = c′ N_c s_c d_c + q N_q s_q d_q + 0.5 γ′ B N_γ s_γ d_γ" },
      { text: "N_q = e^(π tanφ′) tan²(45° + φ′/2),  N_c = (N_q − 1) cotφ′" },
      { text: "N_γ: Meyerhof (N_q − 1) tan(1.4φ′); Hansen 1.5 (N_q − 1) tanφ′; Vesić 2 (N_q + 1) tanφ′" },
      { text: "q_all = q_ult / FS" },
    ],
    guidance: [
      "Load inclination, eccentricity, sloping ground, layered soils and punching failure in loose or soft soils are not included. Settlement frequently governs the allowable pressure before ultimate bearing failure and must be checked separately.",
    ],
    references: [REF.terzaghi43, REF.meyerhof63, REF.hansen70, REF.vesic73, REF.coduto],
    tableTitle: "Table 1 — Bearing capacity factors and results",
    figureCaption: () => "",
    aiHint:
      "Interpret the bearing capacity result: which term (cohesion, overburden, self-weight) dominates, the influence of groundwater and embedment, the method selected, and that settlement may govern.",
  },

  "eurocode-7-bearing-resistance": {
    subject: "Bearing Resistance to EN 1997-1 (Annex D)",
    introduction: [
      "EN 1997-1 verifies the geotechnical ultimate limit state of a spread foundation by showing that the design action effect does not exceed the design bearing resistance, V_d ≤ R_d. Partial factors are applied according to the selected Design Approach: DA1 (Combinations 1 and 2), DA2 or DA3, with factor sets A (actions), M (materials) and R (resistances) given in Annex A and the National Annex.",
      "The drained bearing resistance is calculated with the informative Annex D method using design values of the strength parameters. This report presents the resistance side only; the design actions and the National Annex choices must be applied by the designer.",
    ],
    equations: [
      { text: "tanφ′_d = tanφ′_k / γ_φ′,   c′_d = c′_k / γ_c′" },
      { text: "R/A′ = c′ N_c b_c s_c i_c + q′ N_q b_q s_q i_q + 0.5 γ′ B′ N_γ b_γ s_γ i_γ" },
      { text: "N_γ = 2 (N_q − 1) tanφ′,  s_q = 1 + (B′/L′) sinφ′,  s_γ = 1 − 0.3 B′/L′" },
      { text: "R_d = R / γ_R,v   (γ_R,v = 1.0 for R1 and R3, 1.4 for R2)" },
    ],
    guidance: [
      "Annex D is informative; National Annexes may prescribe other methods or factors. Inclination, base tilt and eccentricity factors (i, b, effective area A′) are not applied in this assessment.",
    ],
    references: [REF.en1997, REF.frank],
    tableTitle: "Table 1 — Design parameters and bearing resistance",
    figureCaption: () => "",
    aiHint:
      "Interpret the EC7 resistance-side result: effect of the selected design approach and partial factors on phi'_d and R_d, dominant resistance term, and that V_d <= R_d and the National Annex remain the designer's responsibility.",
  },
};

export function getStandardReportContent(slug: string): StandardReportContent | null {
  return STANDARD_REPORT_CONTENT[slug] ?? null;
}
