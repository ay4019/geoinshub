import type { StandardReportContent, StandardReportSeries } from "@/lib/reports/standard-report-types";

/**
 * Fixed text of the standard report for each tool (Introduction, Method, equations, Notes on use, references).
 * Keep it short and readable — it should explain the subject, not exhaust it; detailed interpretation is left
 * to the optional AI section. Project-specific sections are built from the tool payload at report time
 * (lib/reports/standard-report-document.ts). Equations use Unicode sub/superscripts that exist in the embedded
 * Noto Sans subset (see lib/pdf-safe-text.ts).
 */

const profileCaption = (series: StandardReportSeries) =>
  `${series.label}${series.unit ? ` (${series.unit})` : ""} versus depth, by borehole`;

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

const REF2 = {
  liaoWhitman:
    "Liao, S.S.C. and Whitman, R.V. (1986) 'Overburden correction factors for SPT in sand', Journal of Geotechnical Engineering, 112(3), pp. 373-377.",
  skempton86:
    "Skempton, A.W. (1986) 'Standard penetration test procedures and the effects in sands of overburden pressure, relative density, particle size, ageing and overconsolidation', Géotechnique, 36(3), pp. 425-447.",
  astmD1586:
    "ASTM D1586/D1586M. Standard Test Method for Standard Penetration Test (SPT) and Split-Barrel Sampling of Soils. West Conshohocken, PA: ASTM International.",
  sorensenOkkels:
    "Sorensen, K.K. and Okkels, N. (2013) 'Correlation between drained shear strength and plasticity index of undisturbed overconsolidated clays', Proceedings of the 18th ICSMGE, Paris, pp. 423-428.",
  laddFoott:
    "Ladd, C.C. and Foott, R. (1974) 'New design procedure for stability of soft clays', Journal of the Geotechnical Engineering Division, ASCE, 100(GT7), pp. 763-786.",
  mitchell:
    "Mitchell, J.K. (1976) Fundamentals of Soil Behavior. New York: Wiley.",
  tomlinson:
    "Tomlinson, M.J. (2001) Foundation Design and Construction. 7th edn. Harlow: Pearson Education.",
  stroudButler:
    "Stroud, M.A. and Butler, F.G. (1975) 'The standard penetration test and the engineering properties of glacial materials', Proceedings of the Symposium on Engineering Behaviour of Glacial Materials, Birmingham, pp. 117-128.",
  dasSobhan:
    "Das, B.M. and Sobhan, K. (2021) Principles of Geotechnical Engineering. 10th edn. Boston, MA: Cengage Learning.",
};

export const STANDARD_REPORT_CONTENT: Record<string, StandardReportContent> = {
  "spt-corrections": {
    subject: "SPT Corrections: N₆₀ and (N₁)₆₀",
    introduction: [
      "The Standard Penetration Test (SPT) blow count N depends not only on the soil but also on the equipment and the depth of the test. Before it is used in correlations for strength, stiffness or liquefaction, it is corrected to a common energy level (N₆₀) and, for sands, to a common overburden stress ((N₁)₆₀).",
    ],
    method:
      "N₆₀ is obtained by multiplying the field blow count by factors for hammer energy, borehole diameter, rod length and sampler type. (N₁)₆₀ then normalises N₆₀ to an effective overburden stress of about 100 kPa using the Liao and Whitman (1986) factor C_N, which is capped at 1.70.",
    equations: [
      { text: "N₆₀ = N · C_E · C_B · C_R · C_S", where: "C_E = ER/60 (energy), C_B borehole diameter, C_R rod length, C_S sampler" },
      { text: "σ′ᵥ₀ = γ z − γw · max(z − z_w, 0)" },
      { text: "(N₁)₆₀ = C_N · N₆₀,   C_N = 9.78 (1/σ′ᵥ₀)⁰·⁵ ≤ 1.70", where: "σ′ᵥ₀ in kPa" },
    ],
    guidance: [
      "The energy ratio has the largest effect on N₆₀ and should come from hammer calibration where possible. (N₁)₆₀ is intended for sands; for clays, N₆₀ is normally used directly in correlations.",
    ],
    references: [REF2.skempton86, REF2.liaoWhitman, REF.youd2001, REF.ib2008, REF2.astmD1586],
    tableTitle: "Table 1. SPT correction factors, N₆₀ and (N₁)₆₀",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the N60 and (N1)60 profiles: trend with depth, borehole consistency, refusal values (N = 50), the effect of the selected energy ratio and the overburden correction near the surface.",
  },

  "cu-from-pi-and-spt": {
    subject: "Undrained Shear Strength (cᵤ) from SPT and PI",
    introduction: [
      "The undrained shear strength cᵤ governs the short-term stability of foundations, slopes and excavations in saturated clay. Where laboratory or in-situ strength tests are limited, it can be estimated from SPT results combined with the plasticity index.",
    ],
    method:
      "Stroud (1974) showed that, for insensitive clays, cᵤ is approximately proportional to N₆₀, with a factor f₁ that decreases as plasticity increases (about 6.5 kPa per blow for low-plasticity clays to about 4.5 kPa for high-plasticity clays). f₁ is read at each sample's PI and multiplied by N₆₀.",
    equations: [
      { text: "cᵤ = f₁ · N₆₀", where: "f₁ (kPa) from the Stroud (1974) relationship with PI" },
    ],
    guidance: [
      "The correlation applies to insensitive, overconsolidated clays and weak rocks. It is less reliable in soft or sensitive clays, where vane or CPT data are preferable. Results should be compared with any available laboratory strength tests.",
    ],
    references: [REF.stroud, REF.kulhawyMayne],
    tableTitle: "Table 1. PI, N₆₀, f₁ and undrained shear strength cᵤ",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the cu profile from Stroud (1974): trend with depth, borehole consistency, influence of PI on f1, and that the correlation suits insensitive overconsolidated clays.",
  },

  "cprime-from-cu": {
    subject: "Effective Cohesion (c′)",
    introduction: [
      "The effective cohesion c′ is the intercept of the drained strength envelope and is needed for long-term (drained) stability and bearing capacity calculations. In most uncemented soils it is small, and its value has a large influence on the results of slope stability analyses.",
    ],
    method:
      "Two options are available. By default, c′ is taken as a low value for normally consolidated clay (0–5 kPa) and as zero for sands and gravels. Alternatively, c′ can be estimated as 10% of the undrained shear strength cᵤ. The option used is stated in the Input Data section.",
    equations: [
      { text: "c′ = 0–5 kPa (NC clay),   c′ = 0 (sand and gravel)", where: "soil-type default" },
      { text: "c′ = 0.1 · cᵤ", where: "optional empirical alternative" },
    ],
    guidance: [
      "c′ measured in the laboratory is often an artefact of fitting a straight line to curved strength data. Conservative, low values are normally adopted in design, and c′ = 0 is common for long-term stability of excavated slopes.",
    ],
    references: [REF2.sorensenOkkels, REF2.laddFoott],
    tableTitle: "Table 1. Undrained shear strength and effective cohesion c′",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the c' values: which option was used, how c' varies with depth and soil type, and why low or zero c' is usually adopted for long-term stability.",
  },

  "friction-angle-from-pi": {
    subject: "Effective Friction Angle (φ′) from Plasticity Index",
    introduction: [
      "The effective friction angle φ′ of a clay controls its long-term (drained) strength. It decreases as plasticity increases, because platy clay minerals slide past each other more easily. Where drained triaxial or shear box tests are not available, φ′ can be estimated from the plasticity index PI.",
    ],
    method:
      "This assessment uses an empirical relationship between φ′ and the logarithm of PI, consistent with the trends reported by Mitchell (1976), Kulhawy and Mayne (1990) and Sorensen and Okkels (2013).",
    equations: [{ text: "φ′ = 45 − 14 log₁₀(PI)", where: "PI in %; φ′ in degrees" }],
    guidance: [
      "The correlation gives a typical value for clays and shows significant scatter. It should be checked against laboratory tests, and residual strength should be considered where pre-existing shear surfaces may be present.",
    ],
    references: [REF2.mitchell, REF.kulhawyMayne, REF2.sorensenOkkels],
    tableTitle: "Table 1. Plasticity index and effective friction angle φ′",
    figureCaption: profileCaption,
    aiHint:
      "Interpret phi' from PI: variation with depth and between boreholes, the inverse relation with plasticity, and the need for laboratory confirmation.",
  },

  "eoed-from-mv": {
    subject: "Oedometer Modulus (E_oed)",
    introduction: [
      "The oedometer (constrained) modulus E_oed describes how much a soil compresses under vertical load when sideways movement is prevented. It is the stiffness used in one-dimensional settlement calculations for clays and silts.",
    ],
    method:
      "E_oed is the reciprocal of the coefficient of volume compressibility mᵥ measured in oedometer tests. Where mᵥ is not available, it can be estimated from SPT results as f₂ · N₆₀, with f₂ read from the plasticity index (Stroud and Butler, 1975). The method used is stated in the Input Data section.",
    equations: [
      { text: "E_oed = 1 / mᵥ" },
      { text: "E_oed = f₂ · N₆₀", where: "f₂ from the PI chart (Stroud and Butler, 1975)" },
    ],
    guidance: [
      "mᵥ, and therefore E_oed, depends on the stress range over which it is measured. The value used should correspond to the stress increase expected under the structure.",
    ],
    references: [REF2.stroudButler, REF2.tomlinson, REF2.dasSobhan, REF.bowles],
    tableTitle: "Table 1. Compressibility inputs and oedometer modulus E_oed",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the Eoed profile: trend with depth, the input route (mv or PI-f2 with N60), borehole consistency and stress-level dependence of mv.",
  },

  "gmax-from-vs": {
    subject: "Small-Strain Shear Modulus (Gₘₐₓ)",
    introduction: [
      "The small-strain shear modulus Gₘₐₓ is the stiffness of soil at very small shear strains (below about 0.001%), where its response is essentially elastic. It is the reference stiffness for seismic site response and dynamic analyses, and the starting point of the strain-dependent stiffness models used for settlement and soil–structure interaction.",
    ],
    method:
      "Gₘₐₓ follows directly from the shear-wave velocity Vₛ and the mass density ρ of the soil. Because Vₛ is usually measured in the field (downhole, crosshole, seismic CPT or MASW), Gₘₐₓ is one of the few stiffness parameters that can be obtained without disturbing the soil.",
    equations: [
      { text: "ρ = γ / g", where: "γ = bulk unit weight (kN/m³), g = 9.81 m/s²" },
      { text: "Gₘₐₓ = ρ Vₛ²", where: "Vₛ = shear-wave velocity (m/s); Gₘₐₓ reported in MPa" },
    ],
    guidance: [
      "Gₘₐₓ is not a working-load stiffness. Under foundation or wall loading the soil strains more, and the operative stiffness is typically 10–50% of Gₘₐₓ. It should be reduced with a modulus degradation curve suited to the expected strain level (e.g. Hardin and Drnevich, 1972).",
    ],
    references: [REF.kramer, REF.hardinDrnevich],
    tableTitle: "Table 1. Shear-wave velocity, unit weight and small-strain shear modulus",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the Vs and Gmax profiles: increase with depth and confining stress, borehole consistency, anomalously stiff or soft zones, and the fact that Gmax is a very-small-strain stiffness that must be degraded for working strains. Mention whether Vs appears measured or correlated only if the base text says so.",
  },

  "ocr-calculator": {
    subject: "Overconsolidation Ratio (OCR)",
    introduction: [
      "The overconsolidation ratio (OCR) describes the stress history of a soil: how the largest vertical effective stress it has carried in the past compares with the stress acting today. It has a strong influence on compressibility, undrained strength and at-rest earth pressure, which makes it a key parameter for settlement and stability assessments in clays.",
    ],
    method:
      "OCR is the ratio of the preconsolidation stress σ′ₚ, normally interpreted from oedometer tests, to the current vertical effective stress σ′ᵥ₀, which is calculated from the unit weight and the groundwater level. OCR ≈ 1 indicates a normally consolidated soil; lightly overconsolidated soils typically lie between 1 and 4, and heavily overconsolidated soils above 4.",
    equations: [
      { text: "σ′ᵥ₀ = γ z − γw (z − z_w)", where: "z = sample depth, z_w = groundwater depth (term applies below the water table), γw = 9.81 kN/m³" },
      { text: "OCR = σ′ₚ / σ′ᵥ₀" },
    ],
    guidance: [
      "Close to the ground surface σ′ᵥ₀ is small, so OCR is sensitive to the unit weight and groundwater level used. OCR values below 1 usually point to sample disturbance or an incorrect groundwater assumption rather than a genuinely underconsolidated soil, and should be checked.",
    ],
    references: [REF.casagrande, REF.tpm],
    tableTitle: "Table 1. Vertical effective stress, preconsolidation stress and OCR",
    figureCaption: profileCaption,
    aiHint:
      "Interpret sigma'_v0 and OCR versus depth: identify a desiccated or overconsolidated crust (OCR decreasing with depth), normally consolidated zones (OCR near 1), and any OCR < 1 that suggests disturbance or groundwater error. Comment on implications for compressibility (C_r vs C_c) qualitatively.",
  },

  "friction-angle-from-spt": {
    subject: "Effective Friction Angle (φ′) from SPT",
    introduction: [
      "The effective friction angle φ′ governs the shear strength of sands and gravels and is needed for bearing capacity, earth pressure and slope stability calculations. Because granular soils are difficult to sample without disturbance, φ′ is commonly estimated from Standard Penetration Test results.",
    ],
    method:
      "This assessment uses the expression of Wolff (1989), a fit to the well-known chart of Peck, Hanson and Thornburn (1974), which relates φ′ to the corrected blow count (N₁)₆₀. The correlation reflects the effect of relative density and confinement, and applies to granular soils only.",
    equations: [
      { text: "φ′ = 27.1 + 0.3 (N₁)₆₀ − 0.00054 (N₁)₆₀²", where: "(N₁)₆₀ = energy- and overburden-corrected blow count; φ′ in degrees" },
    ],
    guidance: [
      "The result is a peak friction angle for preliminary design. Values above about 40° should be adopted with caution, and lower constant-volume values (roughly 30–35° for quartz sands) are more appropriate where large strains are expected. The correlation does not apply to clays or cemented soils.",
    ],
    references: [REF.pht, REF.wolff, REF.kulhawyMayne],
    tableTitle: "Table 1. Corrected SPT resistance (N₁)₆₀ and effective friction angle φ′",
    figureCaption: profileCaption,
    aiHint:
      "Interpret phi' derived from (N1)60 using the Wolff (1989) fit to Peck, Hanson & Thornburn: trend with depth, borehole consistency, values above 40 deg, and the applicability to granular soils only.",
  },

  "eu-from-spt-butler-1975": {
    subject: "Undrained Deformation Modulus (Eᵤ) from SPT",
    introduction: [
      "The undrained Young's modulus Eᵤ controls the immediate settlement of foundations on saturated clays, which occurs as load is applied and before any drainage takes place. Where stiffness tests are not available, Eᵤ can be estimated from SPT results.",
    ],
    method:
      "From case histories in stiff, overconsolidated clays, Butler (1975) found that Eᵤ is roughly 1.0 to 1.2 MPa for each SPT blow (N₆₀). Eᵤ is obtained by multiplying N₆₀ by the ratio selected for each sample within this range.",
    equations: [{ text: "Eᵤ = (Eᵤ / N₆₀) · N₆₀", where: "Eᵤ / N₆₀ = 1000–1200 kPa; N₆₀ = energy-corrected blow count" }],
    guidance: [
      "The correlation was developed for stiff, overconsolidated clays and should not be applied to soft, normally consolidated or sensitive clays. It is suitable for preliminary estimates; stiffness for final design should be confirmed by testing or by back-analysis of comparable structures.",
    ],
    references: [REF.butler, REF.stroud, REF.kulhawyMayne],
    tableTitle: "Table 1. Corrected SPT resistance N₆₀ and undrained modulus Eᵤ",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the Eu profile derived from Eu = (1000-1200) x N60 (Butler 1975): trend with depth, borehole consistency, and the limitation that the correlation is for stiff overconsolidated clays.",
  },

  "effective-modulus-eprime-cohesive": {
    subject: "Drained Young's Modulus (E′) of Cohesive Soils",
    introduction: [
      "The drained Young's modulus E′ is used to estimate the long-term settlement of foundations on clay, once excess pore pressures have dissipated. It is rarely measured directly, so it is often derived from the undrained shear strength.",
    ],
    method:
      "The undrained modulus Eᵤ is first estimated from the undrained shear strength cᵤ, using a ratio Eᵤ/cᵤ that depends on the plasticity index and the overconsolidation ratio (Duncan and Buchignani, 1976). It is then converted to drained conditions with a factor β′ = E′/Eᵤ chosen for the soil type.",
    equations: [
      { text: "Eᵤ = (Eᵤ / cᵤ) · cᵤ", where: "Eᵤ/cᵤ from the Duncan and Buchignani (1976) chart, as a function of PI and OCR" },
      { text: "E′ = β′ · Eᵤ", where: "β′ = 0.4 (soft clay), 0.6 (stiff clay), 0.7 (silt or silty clay)" },
    ],
    guidance: [
      "The β′ values are screening assumptions. E′ should be checked against oedometer or drained triaxial results before it is used in design.",
    ],
    references: [REF.duncanBuchignani, REF.kulhawyMayne],
    tableTitle: "Table 1. Undrained and drained Young's modulus",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the E' profile obtained as beta' x Eu: trend with depth, influence of the selected beta' (soil type) and Eu/cu ratio, borehole consistency, and the need to calibrate against oedometer or triaxial stiffness.",
  },

  "eprime-from-spt-cohesionless": {
    subject: "Drained Young's Modulus (E′) of Cohesionless Soils",
    introduction: [
      "The drained Young's modulus E′ governs the settlement of foundations on sands and gravels. As these soils are hard to sample without disturbance, E′ is usually estimated from SPT blow counts.",
    ],
    method:
      "Empirical correlations relate E′ to the SPT blow count for different types of sand, for example those of Kulhawy and Mayne (1990) and the expressions compiled by Bowles (1996). The correlation selected for this assessment is stated in the Input Data section.",
    equations: [
      { text: "E′ = 500 N₆₀ (silty sand),  1000 N₆₀ (clean NC sand),  1500 N₆₀ (clean OC sand)", where: "E′ in kPa; Kulhawy and Mayne (1990)" },
      { text: "E′ = 500 (N₅₅ + 15)  or  E′ = 7000 √N₅₅, and other soil-specific forms", where: "E′ in kPa; Bowles (1996); N₅₅ = blow count at 55% energy" },
    ],
    guidance: [
      "SPT-based stiffness correlations typically scatter by a factor of about two, because stiffness also depends on stress history, ageing and strain level, which the SPT does not capture. The results should be treated as indicative.",
    ],
    references: [REF.kulhawyMayne, REF.bowles],
    tableTitle: "Table 1. SPT resistance and drained Young's modulus E′",
    figureCaption: profileCaption,
    aiHint:
      "Interpret the E' profile from the selected SPT correlation: trend with depth, borehole consistency, the energy basis (N60 vs N55) of the chosen correlation, and the typical factor-of-two scatter of SPT-based stiffness.",
  },

  "seed-idriss-liquefaction-screening": {
    subject: "Liquefaction Triggering Screening",
    introduction: [
      "Liquefaction is the sudden loss of strength of loose, saturated sands during earthquake shaking, caused by a build-up of pore water pressure. This screening checks, sample by sample, whether liquefaction is likely to be triggered by the design earthquake.",
    ],
    method:
      "The simplified procedure of Seed and Idriss compares the cyclic stress produced by the earthquake (CSR) with the cyclic resistance of the soil (CRR), estimated from the corrected SPT blow count. Their ratio is the factor of safety FS. The procedure used, TBDY 2018 Section 16 (FS ≥ 1.10 required) or Idriss and Boulanger (2008), is stated in the Input Data section. Samples above the water table, deeper than 20 m, or with (N₁)₆₀ > 30 are treated as non-liquefiable.",
    equations: [
      { text: "CSR = 0.65 (σᵥ₀ / σ′ᵥ₀) (aₘₐₓ / g) r_d", where: "aₘₐₓ = peak ground acceleration, r_d = depth reduction factor" },
      { text: "FS = CRR₇.₅ · MSF · K_σ / CSR", where: "MSF = magnitude scaling factor, K_σ = overburden correction" },
    ],
    guidance: [
      "FS indicates whether liquefaction is likely to start; it does not describe the consequences. Settlement, lateral spreading and loss of bearing capacity need a separate assessment, and borderline results call for more detailed, site-specific analysis.",
    ],
    references: [REF.tbdy, REF.youd2001, REF.ib2008],
    tableTitle: "Table 1. Liquefaction triggering screening results",
    figureCaption: (series) => `Factor of safety against liquefaction versus depth (${series.referenceLine?.label ?? "FS limit"} shown dashed)`,
    aiHint:
      "Interpret the factor of safety versus depth: which depths and boreholes fall below the acceptance threshold, how FS varies with (N1)60 and fines content, the role of groundwater depth, and that consequences (settlement, lateral spreading) are not assessed by this screening.",
  },

  "integrated-settlement-analysis": {
    subject: "Foundation Settlement",
    introduction: [
      "This assessment estimates how much a shallow foundation will settle: the immediate settlement of all layers as the load is applied, and the slower consolidation settlement of clay layers as pore water drains away. It also estimates the time needed for consolidation.",
    ],
    method:
      "The stress increase beneath the centre of the foundation is calculated with Boussinesq's elastic solution at the mid-depth of each layer. Immediate settlement uses the layer's elastic modulus; consolidation settlement uses either mᵥ or the compression indices C_c and C_r together with the layer OCR. The time to consolidate follows Terzaghi's one-dimensional theory.",
    equations: [
      { text: "sᵢ = Δσ_z H (1 − ν²) / Eₛ", where: "Δσ_z = stress increase at layer mid-depth, H = layer thickness" },
      { text: "s_c = mᵥ Δσ_z H   or   s_c = H/(1 + e₀) [C_r log(σ′ₚ/σ′ᵥ₀) + C_c log((σ′ᵥ₀ + Δσ_z)/σ′ₚ)]" },
      { text: "t = T_v H_dr² / c_v", where: "T_v = time factor, H_dr = drainage path length" },
    ],
    guidance: [
      "Using a single stress point per layer is approximate for thick layers, which should be subdivided. Secondary compression, three-dimensional effects and foundation rigidity are not included.",
    ],
    references: [REF.boussinesq, REF.tpm, REF.navfac],
    tableTitle: "Table 1. Stress increase and settlement by layer",
    figureCaption: (series) => `${series.label} versus layer mid-depth`,
    aiHint:
      "Interpret the layer-by-layer settlement: which layers dominate, the split between immediate and consolidation settlement, the effect of stress increase decaying with depth, and the main sensitivities (modulus, C_c/m_v, OCR).",
  },

  "traditional-bearing-capacity-methods": {
    subject: "Bearing Capacity of a Shallow Foundation",
    introduction: [
      "The ultimate bearing capacity is the pressure at which the soil beneath a shallow foundation fails in shear. This assessment evaluates it for a vertically and centrally loaded footing using the classical methods of Terzaghi, Meyerhof, Hansen and Vesić.",
    ],
    method:
      "Each method adds together the contributions of soil cohesion, the overburden beside the footing and the weight of soil beneath it, through bearing capacity factors that depend on φ′, with its own shape and depth factors. Below the water table the buoyant unit weight is used. The allowable pressure is the ultimate value divided by a global factor of safety.",
    equations: [
      { text: "q_ult = c′ N_c s_c d_c + q N_q s_q d_q + 0.5 γ′ B N_γ s_γ d_γ" },
      { text: "q_all = q_ult / FS" },
    ],
    guidance: [
      "Inclined or eccentric loads, sloping ground and layered soils are not included. In many cases settlement, rather than bearing failure, limits the allowable pressure and should be checked separately.",
    ],
    references: [REF.terzaghi43, REF.meyerhof63, REF.hansen70, REF.vesic73, REF.coduto],
    tableTitle: "Table 1. Bearing capacity factors and results",
    figureCaption: () => "",
    aiHint:
      "Interpret the bearing capacity result: which term (cohesion, overburden, self-weight) dominates, the influence of groundwater and embedment, the method selected, and that settlement may govern.",
  },

  "eurocode-7-bearing-resistance": {
    subject: "Bearing Resistance to Eurocode 7",
    introduction: [
      "Eurocode 7 (EN 1997-1) checks the bearing resistance of a spread foundation by showing that the design load does not exceed the design resistance, V_d ≤ R_d. This assessment calculates the resistance side of that check.",
    ],
    method:
      "Partial factors from the selected Design Approach are applied to the soil strength and to the resistance, and the drained bearing resistance is calculated with the method given in Annex D of the standard. The design loads and any National Annex requirements remain the designer's responsibility.",
    equations: [
      { text: "tan φ′_d = tan φ′_k / γ_φ′,   c′_d = c′_k / γ_c′" },
      { text: "R/A′ = c′ N_c s_c + q′ N_q s_q + 0.5 γ′ B′ N_γ s_γ", where: "Annex D, with N_γ = 2 (N_q − 1) tan φ′" },
      { text: "R_d = R / γ_R,v" },
    ],
    guidance: [
      "Annex D is informative, and National Annexes may require different methods or partial factors. Load inclination, base tilt and eccentricity are not included in this assessment.",
    ],
    references: [REF.en1997, REF.frank],
    tableTitle: "Table 1. Design parameters and bearing resistance",
    figureCaption: () => "",
    aiHint:
      "Interpret the EC7 resistance-side result: effect of the selected design approach and partial factors on phi'_d and R_d, dominant resistance term, and that V_d <= R_d and the National Annex remain the designer's responsibility.",
  },
};

const PILE_REF = {
  aashto: "AASHTO (2020) LRFD Bridge Design Specifications. 9th edn, Section 10 — Foundations. Washington, DC: American Association of State Highway and Transportation Officials.",
  gec10:
    "Brown, D.A., Turner, J.P., Castelli, R.J. and Loehr, E.J. (2018) Drilled Shafts: Construction Procedures and Design Methods. FHWA-NHI-18-024 (GEC-10). Washington, DC: Federal Highway Administration.",
  gec12:
    "Hannigan, P.J., Rausche, F., Likins, G.E., Robinson, B.R. and Becker, M.L. (2016) Design and Construction of Driven Pile Foundations, Vol. I. FHWA-NHI-16-009 (GEC-12). Washington, DC: Federal Highway Administration.",
  gec8:
    "Brown, D.A., Dapp, S.D., Thompson, W.R. and Lazarte, C.A. (2007) Design and Construction of Continuous Flight Auger (CFA) Piles. FHWA-HIF-07-039 (GEC-8). Washington, DC: Federal Highway Administration.",
  berezantsev:
    "Berezantsev, V.G., Khristoforov, V.S. and Golubkov, V.N. (1961) 'Load bearing capacity and deformation of piled foundations', Proceedings of the 5th ICSMFE, Paris, Vol. 2, pp. 11-15.",
  meyerhof76:
    "Meyerhof, G.G. (1976) 'Bearing capacity and settlement of pile foundations', Journal of the Geotechnical Engineering Division, ASCE, 102(GT3), pp. 197-228.",
  vesic77: "Vesić, A.S. (1977) Design of Pile Foundations. NCHRP Synthesis 42. Washington, DC: Transportation Research Board.",
  navfac72: "NAVFAC (1986) Design Manual 7.02 — Foundations and Earth Structures. Alexandria, VA: Naval Facilities Engineering Command.",
  cfem: "Canadian Geotechnical Society (2006) Canadian Foundation Engineering Manual. 4th edn. Richmond, BC: BiTech Publishers.",
  kulhawy91: "Kulhawy, F.H. (1991) 'Drilled shaft foundations', in Fang, H.-Y. (ed.) Foundation Engineering Handbook. 2nd edn. New York: Van Nostrand Reinhold, pp. 537-552.",
  mayne07: "Mayne, P.W. (2007) Cone Penetration Testing — A Synthesis of Highway Practice. NCHRP Synthesis 368. Washington, DC: Transportation Research Board.",
  api: "API (2011) RP 2GEO — Geotechnical and Foundation Design Considerations. Washington, DC: American Petroleum Institute.",
  tomlinsonPiles: "Tomlinson, M.J. and Woodward, J. (2014) Pile Design and Construction Practice. 6th edn. Boca Raton, FL: CRC Press.",
  poulosDavis: "Poulos, H.G. and Davis, E.H. (1980) Pile Foundation Analysis and Design. New York: Wiley.",
};

STANDARD_REPORT_CONTENT["pile-axial-capacity-fhwa"] = {
  subject: "Axial Compression Resistance of a Single Pile",
  introduction: [
    "A pile carries axial compression partly by friction or adhesion along its shaft and partly by bearing at its base. This assessment calculates both contributions for a single vertical pile in the layered ground model entered in the tool, and converts the calculated (ultimate) resistance into a design value with the safety format of the selected design code.",
    "Each stage of the calculation is set out in the Calculation Steps section: the pile type and material, the effective stresses and critical depth, the lateral earth pressure coefficient, the α and β methods for the shaft, the base resistance and finally the code-specific design resistance.",
  ],
  method:
    "The shaft resistance is the unit shaft resistance f_s integrated over the pile perimeter from the pile head to the toe, using a total-stress α method in cohesive soils and an effective-stress β method in cohesionless soils. The base resistance is the unit base resistance q_b times the base area. Vertical effective stress is calculated from the layer unit weights with a hydrostatic water table, and may be held constant below a critical depth.",
  equations: [
    { text: "Rᵤ = Rₛ + R_b", where: "Rᵤ ultimate (calculated) resistance, Rₛ shaft resistance, R_b base resistance" },
    { text: "Rₛ = Σ fₛ,ᵢ · π D · Δzᵢ", where: "fₛ unit shaft resistance of each depth increment Δz, D pile diameter" },
    { text: "R_b = q_b · A_b,   A_b = π D² / 4", where: "q_b unit base resistance, A_b base area" },
  ],
  guidance: [
    "The result is the geotechnical resistance of a single pile. Group efficiency, negative skin friction, settlement, lateral loading and the structural capacity of the pile section must be checked separately. Static formulae should be calibrated against pile load tests where possible.",
  ],
  references: [
    REF.en1997,
    PILE_REF.aashto,
    REF.tbdy,
    PILE_REF.gec10,
    PILE_REF.gec12,
    PILE_REF.gec8,
    PILE_REF.berezantsev,
    PILE_REF.meyerhof76,
    PILE_REF.vesic77,
    PILE_REF.navfac72,
    PILE_REF.cfem,
    PILE_REF.kulhawy91,
    PILE_REF.mayne07,
    PILE_REF.api,
    REF.stroud,
    REF.wolff,
    PILE_REF.tomlinsonPiles,
    PILE_REF.poulosDavis,
  ],
  tableTitle: "Table 1. Shaft resistance by layer",
  figureCaption: (series) =>
    series.key === "fs"
      ? "Unit shaft resistance fₛ along the pile (kPa) versus depth"
      : "Ultimate resistance Rᵤ (kN) versus pile toe depth for the same pile diameter",
  aiHint:
    "Interpret the single-pile axial resistance: which layers provide most shaft resistance, the share of base resistance, the effect of the critical depth limit, the pile type and design code factors, and what should be checked next (load tests, group effects, settlement, negative skin friction).",
};

export function getStandardReportContent(slug: string): StandardReportContent | null {
  return STANDARD_REPORT_CONTENT[slug] ?? null;
}
