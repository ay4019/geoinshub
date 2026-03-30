import type { ToolDefinition, ToolInformation, ToolInput } from "@/lib/types";

const standardDisclaimer =
  "Read the general disclaimer below before using this output in any engineering workflow. Independent engineering review is required before design use.";

const liquefactionDisclaimer =
  "Liquefaction outputs are screening-level only. Read the general disclaimer below before using this result, and do not rely on it as a final seismic design basis.";

const phaseRefs = [
  "Lambe, T.W. and Whitman, R.V. (1969). Soil Mechanics. John Wiley & Sons.",
  "Das, B.M. and Sobhan, K. (2018). Principles of Geotechnical Engineering. Cengage.",
];

const classificationRefs = [
  "ASTM D2487. Standard Practice for Classification of Soils for Engineering Purposes (Unified Soil Classification System).",
  "AASHTO M 145. Standard Specification for Classification of Soils and Soil-Aggregate Mixtures for Highway Construction Purposes.",
  "Casagrande, A. (1948). Classification and identification of soils. Transactions, ASCE.",
];

const bearingRefs = [
  "Terzaghi, K. (1943). Theoretical Soil Mechanics. John Wiley & Sons.",
  "Meyerhof, G.G. (1963). Some recent research on the bearing capacity of foundations. Canadian Geotechnical Journal, 1(1), 16-26.",
  "Hansen, J.B. (1970). A revised and extended formula for bearing capacity. Danish Geotechnical Institute Bulletin 28.",
  "Vesic, A.S. (1973). Analysis of ultimate loads of shallow foundations. Journal of the Soil Mechanics and Foundations Division, ASCE, 99(SM1), 45-73.",
  "USACE EM 1110-1-1905. Bearing Capacity of Soils.",
];

const settlementRefs = [
  "Schmertmann, J.H. (1970). Static cone to compute static settlement over sand. Journal of the Soil Mechanics and Foundations Division, ASCE, 96(SM3), 1011-1043.",
  "Schmertmann, J.H., Hartman, J.P., and Brown, P.R. (1978). Improved strain influence factor diagrams. Journal of the Geotechnical Engineering Division, ASCE, 104(GT8), 1131-1135.",
  "NAVFAC DM 7.1 and DM 7.2. Soil Mechanics, Foundations, and Earth Structures.",
  "Mesri, G. and Godlewski, P.M. (1977). Time- and stress-compressibility interrelationship. Journal of the Geotechnical Engineering Division, ASCE, 103(GT5), 417-430.",
  "Boussinesq, J. (1885). Application des potentiels a l'etude de l'equilibre et du mouvement des solides elastiques.",
];

const retainingRefs = [
  "Rankine, W.J.M. (1857). On the stability of loose earth. Philosophical Transactions of the Royal Society.",
  "Coulomb, C.A. (1776). Essai sur une application des regles de maximis et minimis a quelques problemes de statique relatifs a l'architecture.",
  "Jaky, J. (1944). The coefficient of earth pressure at rest. Journal of the Society of Hungarian Architects and Engineers.",
];

const pileRefs = [
  "FHWA NHI-16-009. Design and Construction of Driven Pile Foundations, Volume I.",
  "FHWA NHI-18-024. Drilled Shafts: Construction Procedures and LRFD Design Methods.",
  "Tomlinson, M. and Woodward, J. (2014). Pile Design and Construction Practice. CRC Press.",
  "Reese, L.C. and O'Neill, M.W. (1988). Drilled Shafts: Construction Procedures and Design Methods. FHWA.",
];

const improvementRefs = [
  "Barron, R.A. (1948). Consolidation of fine-grained soils by drain wells. Transactions, ASCE, 113, 718-742.",
  "Hansbo, S. (1981). Consolidation of fine-grained soils by prefabricated drains. Proceedings of the 10th ICSMFE.",
  "Priebe, H.J. (1995). The design of vibro replacement. Ground Engineering, 28(10), 31-37.",
];

const liquefactionRefs = [
  "Seed, H.B. and Idriss, I.M. (1971). Simplified procedure for evaluating soil liquefaction potential. Journal of the Soil Mechanics and Foundations Division, ASCE, 97(SM9), 1249-1273.",
  "Youd, T.L. et al. (2001). Liquefaction resistance of soils: Summary report from the 1996 NCEER and 1998 NCEER/NSF workshops. Journal of Geotechnical and Geoenvironmental Engineering, ASCE, 127(10), 817-833.",
  "Boulanger, R.W. and Idriss, I.M. (2014). CPT and SPT Based Liquefaction Triggering Procedures. Center for Geotechnical Modeling, UC Davis.",
  "FHWA NHI-11-032 and FHWA NHI-11-033. Geotechnical Earthquake Engineering for Highways Manual.",
];

const railwayRefs = [
  "Selig, E.T. and Waters, J.M. (1994). Track Geotechnology and Substructure Management. Thomas Telford.",
  "Li, D. and Selig, E.T. (1998). Method for railroad track foundation design. I: Development. Journal of Geotechnical and Geoenvironmental Engineering, ASCE, 124(4), 316-322.",
  "AREMA. Manual for Railway Engineering.",
  "UIC guidance on track support stiffness and trackbed evaluation.",
];

const fieldRefs = [
  "ASTM D1586. Standard Test Method for Standard Penetration Test (SPT) and Split-Barrel Sampling of Soils.",
  "ASTM D5778. Standard Test Method for Electronic Friction Cone and Piezocone Penetration Testing of Soils.",
  "ASTM E2583. Standard Test Method for Measuring Deflections with a Light Weight Deflectometer (LWD).",
  "ASTM D1194 and ASTM D1196. Plate load testing procedures for soils and flexible pavement components.",
  "FHWA subsurface investigation and in-situ testing manuals.",
];

const empiricalRefs = [
  "Kulhawy, F.H. and Mayne, P.W. (1990). Manual on Estimating Soil Properties for Foundation Design. Electric Power Research Institute (EPRI EL-6800).",
  "Peck, R.B., Hanson, W.E., and Thornburn, T.H. (1974). Foundation Engineering, 2nd ed. John Wiley & Sons.",
  "NAVFAC DM 7.1. Soil Mechanics.",
  "Use local calibration wherever possible when applying empirical correlations.",
];

function info(config: Omit<ToolInformation, "disclaimer"> & { disclaimer?: string }): ToolInformation {
  return {
    ...config,
    disclaimer: config.disclaimer ?? standardDisclaimer,
  };
}

function num(
  name: string,
  label: string,
  defaultValue: number,
  unit?: string,
  extra?: Partial<ToolInput>,
): ToolInput {
  return {
    name,
    label,
    type: "number",
    defaultValue,
    unit,
    step: 0.1,
    ...extra,
  };
}

function select(
  name: string,
  label: string,
  defaultValue: string,
  options: Array<{ label: string; value: string }>,
): ToolInput {
  return {
    name,
    label,
    type: "select",
    defaultValue,
    options,
  };
}

const soilParameterTools: ToolDefinition[] = [
  {
    slug: "degree-of-saturation",
    status: "archived",
    title: "Degree of Saturation",
    category: "Soil Parameters",
    shortDescription: "Estimate degree of saturation from water content, specific gravity, and void ratio.",
    tags: ["phase relationships", "saturation"],
    keywords: ["Sr", "water content", "void ratio", "Gs"],
    featured: true,
    inputs: [
      num("waterContent", "Water content, w", 12, "%", { min: 0, step: 0.1 }),
      num("specificGravity", "Specific gravity of solids, Gs", 2.7, undefined, {
        min: 1.5,
        max: 3.5,
        step: 0.01,
      }),
      num("voidRatio", "Void ratio, e", 0.7, undefined, { min: 0.05, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Computes the gravimetric degree of saturation from the classical phase relationship among water content, void ratio, and specific gravity.",
      assumptions: [
        "Water content is gravimetric.",
        "Specific gravity and void ratio are representative of the same soil state.",
      ],
      limitations: [
        "Results above 100% indicate inconsistent input data.",
        "No correction is made for trapped air or dissolved salts.",
      ],
      equations: ["S<sub>r</sub> = w G<sub>s</sub> / e"],
      references: phaseRefs,
    }),
  },
  {
    slug: "water-content",
    status: "archived",
    title: "Water Content",
    category: "Soil Parameters",
    shortDescription: "Calculate gravimetric water content from wet and dry mass.",
    tags: ["water content", "laboratory"],
    keywords: ["moisture", "oven dry", "sample mass"],
    featured: false,
    inputs: [
      num("wetMass", "Wet mass", 125, "g", { min: 0.01, step: 0.01 }),
      num("dryMass", "Dry mass", 100, "g", { min: 0.01, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Uses the standard gravimetric definition of water content based on wet and oven-dry sample mass.",
      assumptions: [
        "Dry mass represents an oven-dry condition.",
        "No material loss other than water occurs during drying.",
      ],
      limitations: [
        "Organic soils and salts may require additional interpretation.",
        "Mass measurements should come from a controlled laboratory procedure.",
      ],
      equations: ["w = (m<sub>wet</sub> - m<sub>dry</sub>) / m<sub>dry</sub>"],
      references: phaseRefs,
    }),
  },
  {
    slug: "bulk-dry-density",
    status: "archived",
    title: "Bulk and Dry Density",
    category: "Soil Parameters",
    shortDescription:
      "Calculate bulk unit weight, dry unit weight, and dry density from sample weight, volume, and moisture.",
    tags: ["density", "unit weight"],
    keywords: ["bulk density", "dry density", "gamma", "sample volume"],
    featured: false,
    inputs: [
      num("totalWeight", "Total soil weight", 18, "kN", { min: 0.001, step: 0.01 }),
      num("volume", "Sample volume", 1, "m3", { min: 0.0001, step: 0.001 }),
      num("waterContent", "Water content, w", 10, "%", { min: 0, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Determines moist unit weight from weight and volume, then converts to dry unit weight and dry density using gravimetric water content.",
      assumptions: [
        "Weight and volume refer to the same representative sample.",
        "Water content is expressed on a dry-mass basis.",
      ],
      limitations: [
        "Void redistribution and sample disturbance are ignored.",
        "Do not mix field bulk volume with laboratory water content without care.",
      ],
      equations: [
        "&gamma; = W / V",
        "&gamma;<sub>d</sub> = &gamma; / (1 + w)",
        "&rho;<sub>d</sub> = &gamma;<sub>d</sub> / g",
      ],
      references: phaseRefs,
    }),
  },
  {
    slug: "gmax-from-vs",
    status: "active",
    title: "Gmax from Vs",
    category: "Soil Parameters",
    shortDescription:
      "Estimate small-strain shear modulus from shear wave velocity using either unit weight or mass density input.",
    tags: ["small strain", "Vs"],
    keywords: ["Gmax", "shear wave velocity", "dynamic modulus", "density", "unit weight"],
    featured: false,
    inputs: [
      select("densityInputMode", "Density input mode", "unit-weight", [
        { label: "Use unit weight, γ", value: "unit-weight" },
        { label: "Use mass density, ρ", value: "mass-density" },
      ]),
      num("unitWeight", "Unit weight, gamma", 18.5, "kN/m3", { min: 1, step: 0.1 }),
      num("density", "Mass density, rho", 1900, "kg/m3", { min: 100, step: 1 }),
      num("vs", "Shear wave velocity, Vs", 180, "m/s", { min: 1, step: 1 }),
    ],
    information: info({
      methodology:
        "Applies the elastic wave relation Gmax = rho Vs^2. The tool can either infer mass density from unit weight or use mass density directly, so the same small-strain modulus can be calculated from either input style.",
      assumptions: [
        "Input Vs is representative of the layer and stress state of interest.",
        "Small-strain stiffness is appropriate for the intended use.",
      ],
      limitations: [
        "This is not a working-strain modulus.",
        "Anisotropy and strain degradation are not included.",
      ],
      equations: [
        "&rho; = &gamma; / g",
        "G<sub>max</sub> = &rho;V<sub>s</sub><sup>2</sup>",
        "G<sub>max</sub> = (&gamma; / g)V<sub>s</sub><sup>2</sup>",
      ],
      references: [...phaseRefs, ...empiricalRefs],
    }),
  },
  {
    slug: "eoed-from-mv",
    status: "active",
    title: "Oedometer Modulus from m_v",
    category: "Soil Parameters",
    shortDescription: "Convert coefficient of volume compressibility to one-dimensional constrained modulus.",
    tags: ["compressibility", "oedometer"],
    keywords: ["mv", "Eoed", "M"],
    featured: false,
    inputs: [num("mv", "Coefficient of volume compressibility, m_v", 0.4, "m2/MN", { min: 0.0001, step: 0.01 })],
    information: info({
      methodology:
        "Uses the reciprocal relationship between constrained modulus and coefficient of volume compressibility.",
      assumptions: [
        "m_v is appropriate for the stress range under consideration.",
        "One-dimensional constrained deformation is the relevant idealisation.",
      ],
      limitations: [
        "The modulus is stress-level dependent.",
        "Do not extrapolate a single oedometer modulus too broadly.",
      ],
      equations: ["E<sub>oed</sub> = 1 / m<sub>v</sub>"],
      references: settlementRefs,
    }),
  },
  {
    slug: "ocr-calculator",
    status: "active",
    title: "OCR Calculator",
    category: "Soil Parameters",
    shortDescription:
      "Calculate overconsolidation ratio from preconsolidation stress and current effective stress.",
    tags: ["stress history", "OCR"],
    keywords: ["preconsolidation", "sigma p", "overconsolidated"],
    featured: false,
    inputs: [
      num("preconsolidationStress", "Preconsolidation stress, sigma'p", 150, "kPa", { min: 0.1, step: 0.1 }),
      num("effectiveOverburden", "Current vertical effective stress, sigma'v0", 75, "kPa", {
        min: 0.1,
        step: 0.1,
      }),
    ],
    information: info({
      methodology:
        "Computes stress history through the ratio of preconsolidation stress to present vertical effective stress.",
      assumptions: ["Preconsolidation stress has been interpreted correctly from laboratory or field data."],
      limitations: [
        "OCR alone does not define stiffness, strength, or creep behaviour.",
        "Sampling disturbance can strongly affect sigma'p interpretation.",
      ],
      equations: ["OCR = &sigma;'<sub>p</sub> / &sigma;'<sub>v0</sub>"],
      references: settlementRefs,
    }),
  },
];

const classificationTools: ToolDefinition[] = [
  {
    slug: "aashto-classification",
    status: "archived",
    title: "AASHTO Classification",
    category: "Soil Classification",
    shortDescription:
      "Classify soil into AASHTO groups using sieve fractions, liquid limit, and plasticity index.",
    tags: ["AASHTO", "classification"],
    keywords: ["group index", "A-1", "A-7", "subgrade"],
    featured: true,
    inputs: [
      num("passing10", "Percent passing No. 10 sieve", 65, "%", { min: 0, max: 100, step: 0.1 }),
      num("passing40", "Percent passing No. 40 sieve", 42, "%", { min: 0, max: 100, step: 0.1 }),
      num("passing200", "Percent passing No. 200 sieve", 22, "%", { min: 0, max: 100, step: 0.1 }),
      num("liquidLimit", "Liquid limit, LL", 35, "%", { min: 0, max: 120, step: 0.1 }),
      num("plasticityIndex", "Plasticity index, PI", 8, "%", { min: 0, max: 120, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Applies the usual AASHTO M 145 group thresholds and computes a screening-level group index.",
      assumptions: [
        "Atterberg limits and gradation are representative.",
        "The material falls within the normal range of highway subgrade classification practice.",
      ],
      limitations: [
        "Organic and unusual materials may need specialist review.",
        "This tool simplifies the tabulated classification logic for rapid screening.",
      ],
      equations: ["GI = (F - 35)[0.2 + 0.005(LL - 40)] + 0.01(F - 15)(PI - 10)"],
      references: classificationRefs,
    }),
  },
  {
    slug: "plasticity-chart-visualizer",
    status: "archived",
    title: "Plasticity Chart Visualizer",
    category: "Soil Classification",
    shortDescription:
      "Locate a soil on the Casagrande plasticity chart and return a simplified zone interpretation.",
    tags: ["Atterberg limits", "plasticity chart"],
    keywords: ["LL", "PL", "PI", "A-line"],
    featured: false,
    inputs: [
      num("liquidLimit", "Liquid limit, LL", 50, "%", { min: 0, max: 120, step: 0.1 }),
      num("plasticLimit", "Plastic limit, PL", 22, "%", { min: 0, max: 120, step: 0.1 }),
      num("fines", "Percent passing No. 200 sieve", 70, "%", { min: 0, max: 100, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Computes PI and compares the point with the A-line and the LL = 50 vertical boundary to provide a chart-based description.",
      assumptions: [
        "Fine-grained behaviour dominates the classification.",
        "Atterberg limits were measured consistently.",
      ],
      limitations: [
        "This tool does not render a laboratory-certified USCS symbol.",
        "Organic checks and coarse fraction gradation remain outside scope.",
      ],
      equations: ["PI = LL - PL", "PI<sub>A</sub> = 0.73(LL - 20)"],
      references: classificationRefs,
    }),
  },
  {
    slug: "liquefaction-soil-screening",
    status: "archived",
    title: "Liquefaction Soil Screening",
    category: "Soil Classification",
    shortDescription:
      "Screen fines content and plasticity to flag whether a soil may be potentially susceptible to liquefaction-style behaviour.",
    tags: ["screening", "fines"],
    keywords: ["PI", "fines content", "susceptibility"],
    featured: false,
    inputs: [
      num("plasticityIndex", "Plasticity index, PI", 6, "%", { min: 0, max: 60, step: 0.1 }),
      num("fines", "Fines content", 18, "%", { min: 0, max: 100, step: 0.1 }),
      num("liquidLimit", "Liquid limit, LL", 28, "%", { min: 0, max: 120, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Provides an indicative susceptibility screen using PI, fines content, and liquid limit ranges commonly discussed in liquefaction studies.",
      assumptions: ["The purpose is only to flag whether more detailed seismic review is warranted."],
      limitations: [
        "This is not a liquefaction triggering analysis.",
        "Mineralogy, ageing, stress state, and fabric are not captured.",
      ],
      equations: ["Screening is rule-based using PI, LL, and fines content thresholds."],
      references: [...classificationRefs, ...liquefactionRefs],
      disclaimer: liquefactionDisclaimer,
    }),
  },
];

const bearingTools: ToolDefinition[] = [
  {
    slug: "traditional-bearing-capacity-methods",
    status: "active",
    title: "Traditional Bearing Capacity Methods",
    category: "Bearing Capacity",
    shortDescription:
      "Compare Terzaghi, Meyerhof, Hansen, and Vesic general shear methods within a single shallow foundation tool.",
    tags: ["bearing capacity", "shallow foundation"],
    keywords: ["Terzaghi", "Meyerhof", "Hansen", "Vesic", "Nc", "Nq", "Ngamma"],
    featured: true,
    inputs: [
      select("method", "Bearing capacity method", "terzaghi", [
        { label: "Terzaghi", value: "terzaghi" },
        { label: "Meyerhof", value: "meyerhof" },
        { label: "Hansen", value: "hansen" },
        { label: "Vesic", value: "vesic" },
      ]),
      num("cohesion", "Effective cohesion, c'", 10, "kPa", { min: 0 }),
      num("frictionAngle", "Effective friction angle, phi'", 30, "deg", { min: 0, max: 50 }),
      num("unitWeight", "Effective unit weight, gamma", 18, "kN/m3", { min: 1 }),
      num("width", "Foundation width, B", 2, "m", { min: 0.1, step: 0.01 }),
      num("length", "Foundation length, L", 3, "m", { min: 0.1, step: 0.01 }),
      num("embedment", "Embedment depth, Df", 1.2, "m", { min: 0, step: 0.01 }),
      num("factorOfSafety", "Factor of safety", 3, undefined, { min: 1.5, step: 0.1 }),
    ],
    information: info({
      methodology:
        "This tool compares four commonly cited general shear bearing-capacity methods for shallow rectangular footings. Nq and Nc are calculated from the classical friction-angle expressions, while the N-gamma term follows the selected traditional method formulation.",
      assumptions: [
        "General shear failure and drained parameter use are assumed.",
        "Rectangular footing shape effects are simplified for decision-support use.",
        "Groundwater, load inclination, and eccentric loading are not handled in this tool.",
      ],
      limitations: [
        "Do not treat the result as a code-compliant foundation design.",
        "Settlement may govern well before ultimate bearing failure.",
        "Method differences are only one part of the uncertainty; parameter selection remains critical.",
      ],
      equations: [
        "N<sub>q</sub> = e<sup>&pi;tan&phi;'</sup> tan<sup>2</sup>(45 + &phi;'/2)",
        "N<sub>c</sub> = (N<sub>q</sub> - 1) / tan&phi;'",
        "N<sub>&gamma;,Terzaghi</sub> = 1.5(N<sub>q</sub> - 1)tan&phi;'",
        "N<sub>&gamma;,Meyerhof/Hansen</sub> = (N<sub>q</sub> - 1)tan(1.4&phi;')",
        "N<sub>&gamma;,Vesic</sub> = 2(N<sub>q</sub> + 1)tan&phi;'",
        "q<sub>ult</sub> = c'N<sub>c</sub>s<sub>c</sub>d<sub>c</sub> + qN<sub>q</sub>s<sub>q</sub>d<sub>q</sub> + 0.5&gamma;BN<sub>&gamma;</sub>s<sub>&gamma;</sub>d<sub>&gamma;</sub>",
        "q = &gamma; D<sub>f</sub>",
        "q<sub>all</sub> = q<sub>ult</sub> / FS",
      ],
      references: bearingRefs,
    }),
  },
  {
    slug: "eurocode-7-bearing-resistance",
    status: "active",
    title: "Eurocode 7 Bearing Resistance Screening",
    category: "Bearing Capacity",
    shortDescription:
      "Review a simplified Eurocode 7-style bearing resistance check with Design Approach selection and transparent partial-factor presentation.",
    tags: ["Eurocode 7", "bearing resistance", "design approach"],
    keywords: ["EC7", "DA1", "DA2", "DA3", "partial factors", "bearing resistance"],
    featured: false,
    inputs: [
      select("designApproach", "Eurocode 7 design approach", "da1-combination-1", [
        { label: "DA1 Combination 1", value: "da1-combination-1" },
        { label: "DA1 Combination 2", value: "da1-combination-2" },
        { label: "DA2", value: "da2" },
        { label: "DA3", value: "da3" },
      ]),
      num("cohesion", "Effective cohesion, c'", 10, "kPa", { min: 0 }),
      num("frictionAngle", "Effective friction angle, phi'", 30, "deg", { min: 0, max: 50 }),
      num("unitWeight", "Effective unit weight, gamma", 18, "kN/m3", { min: 1 }),
      num("width", "Foundation width, B", 2, "m", { min: 0.1, step: 0.01 }),
      num("length", "Foundation length, L", 3, "m", { min: 0.1, step: 0.01 }),
      num("embedment", "Embedment depth, Df", 1.2, "m", { min: 0, step: 0.01 }),
    ],
    information: info({
      methodology:
        "This tool screens the resistance side of a Eurocode 7 bearing-capacity check for shallow rectangular footings. The selected design approach is represented through simplified material and resistance factors so the effect of Design Approach choice can be reviewed transparently.",
      assumptions: [
        "General shear failure and drained parameter use are assumed.",
        "The tool screens the resistance side rather than carrying out a full Ed versus Rd verification.",
        "Rectangular footing shape and depth effects are simplified for transparency.",
      ],
      limitations: [
        "Do not treat the result as a code-compliant Eurocode 7 design.",
        "National Annex requirements are not embedded.",
        "Factored action effects, combination rules, and full GEO/STR verification remain outside this simplified implementation.",
      ],
      equations: [
        "N<sub>q</sub> = e<sup>&pi;tan&phi;'</sup> tan<sup>2</sup>(45 + &phi;'/2)",
        "N<sub>c</sub> = (N<sub>q</sub> - 1) / tan&phi;'",
        "tan&phi;'<sub>d</sub> = tan&phi;' / &gamma;<sub>M,&phi;</sub>",
        "c'<sub>d</sub> = c' / &gamma;<sub>M,c</sub>",
        "q<sub>Rd</sub> = q<sub>ult,d</sub> / &gamma;<sub>R,v</sub>",
        "DA1 Combination 1 = A1 + M1 + R1",
        "DA1 Combination 2 = A2 + M2 + R1",
        "DA2 = A1 + M1 + R2",
        "DA3 = (A1 or A2) + M2 + R3",
      ],
      references: bearingRefs,
      tables: [
        {
          title: "Design Approach Factors Used In This Screening Tool",
          columns: ["Design Approach", "Action Set", "gamma_M,phi", "gamma_M,c", "gamma_R,v"],
          rows: [
            ["DA1 Combination 1", "A1 + M1 + R1", "1.00", "1.00", "1.00"],
            ["DA1 Combination 2", "A2 + M2 + R1", "1.25", "1.25", "1.00"],
            ["DA2", "A1 + M1 + R2", "1.00", "1.00", "1.40"],
            ["DA3", "(A1 or A2) + M2 + R3", "1.25", "1.25", "1.40"],
          ],
          note: "These values are presented for transparent screening only. National Annex choices and project-specific interpretation still govern actual design.",
        },
      ],
    }),
  },
  {
    slug: "bearing-capacity-eccentricity-correction",
    status: "active",
    title: "Eccentricity Correction",
    category: "Bearing Capacity",
    shortDescription:
      "Derive footing eccentricity from axial load and bending moments, then apply an effective area correction.",
    tags: ["effective area", "eccentric load"],
    keywords: ["B'", "L'", "A'", "middle third", "moment", "eccentricity"],
    featured: false,
    inputs: [
      num("width", "Foundation width, B", 2, "m", { min: 0.1, step: 0.01 }),
      num("length", "Foundation length, L", 3, "m", { min: 0.1, step: 0.01 }),
      num("verticalLoad", "Vertical load, P", 1200, "kN", { min: 0.1, step: 1 }),
      num("momentX", "Moment about x-axis, M_x", 60, "kN-m", { min: 0, step: 1 }),
      num("momentY", "Moment about y-axis, M_y", 120, "kN-m", { min: 0, step: 1 }),
    ],
    information: info({
      methodology:
        "First computes eccentricity from the applied axial load and moments, then uses the effective area concept by reducing footing dimensions by twice the eccentricity in each axis.",
      assumptions: [
        "The load remains compressive over the effective area.",
        "The applied moments and axial load are transferred to the footing base without significant redistribution.",
        "The resultant remains within the kern for the intended interpretation.",
      ],
      limitations: [
        "No coupling with bearing capacity factors or moment redistribution is included.",
        "Tension beneath part of the footing requires more careful treatment.",
      ],
      equations: [
        "e<sub>x</sub> = M<sub>y</sub> / P",
        "e<sub>y</sub> = M<sub>x</sub> / P",
        "B' = B - 2e<sub>x</sub>",
        "L' = L - 2e<sub>y</sub>",
        "q<sub>eff</sub> = P / (B'L')",
      ],
      references: bearingRefs,
    }),
  },
];

const settlementTools: ToolDefinition[] = [
  {
    slug: "schmertmann-settlement",
    status: "active",
    title: "Schmertmann Settlement (Simplified)",
    category: "Settlement",
    shortDescription: "Estimate immediate settlement using a simplified Schmertmann-style modulus expression.",
    tags: ["settlement", "sand", "Schmertmann"],
    keywords: ["Iz", "C1", "C2", "Es"],
    featured: true,
    inputs: [
      num("netPressure", "Net foundation pressure, q_net", 180, "kPa", { min: 0.1, step: 0.1 }),
      num("width", "Foundation width, B", 2.5, "m", { min: 0.1, step: 0.01 }),
      num("elasticModulus", "Representative modulus, E_s", 20000, "kPa", { min: 100, step: 10 }),
      num("c1", "Depth correction, C1", 1.0, undefined, { min: 0.1, step: 0.01 }),
      num("c2", "Creep correction, C2", 1.1, undefined, { min: 0.1, step: 0.01 }),
      num("izAverage", "Average strain influence factor, I_z(avg)", 0.8, undefined, {
        min: 0.1,
        step: 0.01,
      }),
    ],
    information: info({
      methodology:
        "Uses a compact Schmertmann-style relation where the user supplies representative correction and influence factors for the depth interval of interest.",
      assumptions: [
        "Representative modulus and strain influence factors have been selected appropriately.",
        "The check is intended for shallow foundation option screening.",
      ],
      limitations: [
        "This is not a full layer-by-layer strain integration.",
        "Stress-dependent modulus variation and groundwater effects are omitted.",
      ],
      equations: ["s = C<sub>1</sub>C<sub>2</sub>q<sub>net</sub>BI<sub>z(avg)</sub> / E<sub>s</sub>"],
      references: settlementRefs,
    }),
  },
  {
    slug: "secondary-compression-settlement",
    status: "active",
    title: "Secondary Compression (Creep)",
    category: "Settlement",
    shortDescription: "Estimate post-primary creep settlement using the secondary compression index.",
    tags: ["creep", "secondary compression"],
    keywords: ["Calpha", "time", "organic soil"],
    featured: false,
    inputs: [
      num("cAlpha", "Secondary compression index, C_alpha", 0.02, undefined, { min: 0.0001, step: 0.001 }),
      num("voidRatio", "Void ratio at end of primary, e_p", 1.0, undefined, { min: 0.05, step: 0.01 }),
      num("layerThickness", "Layer thickness, H", 5, "m", { min: 0.1, step: 0.01 }),
      num("t1", "Time at end of primary, t1", 1, "yr", { min: 0.001, step: 0.1 }),
      num("t2", "Final time, t2", 20, "yr", { min: 0.001, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Uses the classical log-time expression for secondary compression after primary consolidation has effectively ended.",
      assumptions: [
        "Primary consolidation is complete at time t1.",
        "C_alpha is representative over the selected time range.",
      ],
      limitations: [
        "Creep behaviour is highly soil-specific and stress-history dependent.",
        "Organic soils, peats, and structured clays need particular care.",
      ],
      equations: ["s<sub>sec</sub> = HC<sub>&alpha;</sub>log(t<sub>2</sub>/t<sub>1</sub>) / (1 + e<sub>p</sub>)"],
      references: settlementRefs,
    }),
  },
  {
    slug: "layered-settlement",
    status: "active",
    title: "Layered Settlement",
    category: "Settlement",
    shortDescription: "Sum one-dimensional settlement across up to three compressible layers.",
    tags: ["layered settlement", "mv"],
    keywords: ["sum of layers", "strain", "compressibility"],
    featured: false,
    inputs: [
      num("h1", "Layer 1 thickness", 2, "m", { min: 0, step: 0.01 }),
      num("mv1", "Layer 1 m_v", 0.25, "m2/MN", { min: 0, step: 0.01 }),
      num("ds1", "Layer 1 stress increase", 40, "kPa", { min: 0, step: 0.1 }),
      num("h2", "Layer 2 thickness", 3, "m", { min: 0, step: 0.01 }),
      num("mv2", "Layer 2 m_v", 0.35, "m2/MN", { min: 0, step: 0.01 }),
      num("ds2", "Layer 2 stress increase", 25, "kPa", { min: 0, step: 0.1 }),
      num("h3", "Layer 3 thickness", 2, "m", { min: 0, step: 0.01 }),
      num("mv3", "Layer 3 m_v", 0.2, "m2/MN", { min: 0, step: 0.01 }),
      num("ds3", "Layer 3 stress increase", 15, "kPa", { min: 0, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Computes one-dimensional strain in each layer from m_v Delta sigma and sums the settlement contribution through the profile.",
      assumptions: [
        "Each layer is internally uniform.",
        "Stress increments have already been estimated for the layer centres.",
      ],
      limitations: [
        "Only three layers are included in this v1 tool.",
        "Time rate, creep, and nonlinearity are not included.",
      ],
      equations: [
        "s<sub>i</sub> = m<sub>v,i</sub>&Delta;&sigma;'<sub>i</sub>H<sub>i</sub>",
        "s<sub>total</sub> = &Sigma;s<sub>i</sub>",
      ],
      references: settlementRefs,
    }),
  },
  {
    slug: "stress-distribution-21",
    status: "active",
    title: "Stress Distribution Methods",
    category: "Settlement",
    shortDescription:
      "Estimate vertical stress increase beneath a rectangular foundation using 2:1, 30-degree, or Boussinesq-based approaches.",
    tags: ["stress distribution", "2:1", "Boussinesq"],
    keywords: ["Delta sigma", "rectangular footing", "depth", "30 degree", "Boussinesq"],
    featured: false,
    inputs: [
      select("method", "Stress distribution method", "two-to-one", [
        { label: "2:1 Method", value: "two-to-one" },
        { label: "30 Degree Method", value: "thirty-degree" },
        { label: "Boussinesq (centreline)", value: "boussinesq" },
      ]),
      num("appliedPressure", "Net applied pressure, q", 150, "kPa", { min: 0.1, step: 0.1 }),
      num("width", "Foundation width, B", 2, "m", { min: 0.1, step: 0.01 }),
      num("length", "Foundation length, L", 3, "m", { min: 0.1, step: 0.01 }),
      num("depth", "Depth below foundation base, z", 2, "m", { min: 0, step: 0.01 }),
    ],
    information: info({
      methodology:
        "This tool compares three common screening approaches for stress increase beneath a rectangular footing: a 2 vertical to 1 horizontal spread, a 30-degree spread, and a Boussinesq-based elastic solution evaluated beneath the footing centreline.",
      assumptions: [
        "A uniformly loaded rectangular footing is assumed.",
        "The 2:1 and 30-degree approaches represent simplified stress spread idealisations.",
        "The Boussinesq option is reported for the footing centreline rather than as a full area-average stress.",
      ],
      limitations: [
        "Layering, stiffness contrast, and groundwater effects are not captured.",
        "The 2:1 and 30-degree methods are screening tools and not elastic continuum solutions.",
        "The Boussinesq result depends on an elastic half-space assumption and is shown here only at the footing centreline.",
      ],
      equations: [
        "&Delta;&sigma;<sub>z,2:1</sub> = qBL / [(B + z)(L + z)]",
        "&Delta;&sigma;<sub>z,30&deg;</sub> = qBL / [(B + 2z tan30&deg;)(L + 2z tan30&deg;)]",
        "&Delta;&sigma;<sub>z,B</sub> = &int;&int;<sub>A</sub> (3qz<sup>3</sup> / 2&pi;R<sup>5</sup>) dA",
      ],
      references: settlementRefs,
    }),
  },
];

const earthPressureTools: ToolDefinition[] = [
  {
    slug: "rankine-earth-pressure",
    status: "archived",
    title: "Rankine Active and Passive Pressure",
    category: "Earth Pressure & Retaining Structures",
    shortDescription: "Compute Rankine Ka, Kp, and simplified resultant forces for level backfill.",
    tags: ["Rankine", "retaining wall"],
    keywords: ["Ka", "Kp", "active pressure", "passive pressure"],
    featured: false,
    inputs: [
      num("frictionAngle", "Backfill friction angle, phi'", 32, "deg", { min: 0, max: 50, step: 0.1 }),
      num("unitWeight", "Backfill unit weight, gamma", 19, "kN/m3", { min: 1, step: 0.1 }),
      num("height", "Retained height, H", 5, "m", { min: 0.1, step: 0.01 }),
      num("surcharge", "Uniform surcharge, q", 0, "kPa", { min: 0, step: 0.1 }),
    ],
    information: info({
      methodology: "Applies Rankine coefficients for level backfill and reports resultant forces per unit wall length.",
      assumptions: [
        "Wall friction is neglected.",
        "Backfill surface is horizontal and the wall back is vertical.",
      ],
      limitations: [
        "Seismic, water, cohesion, and compaction effects are not included.",
        "Passive resistance should be used cautiously in practice.",
      ],
      equations: [
        "K<sub>a</sub> = tan<sup>2</sup>(45 - &phi;'/2)",
        "K<sub>p</sub> = tan<sup>2</sup>(45 + &phi;'/2)",
        "P<sub>a</sub> = 0.5K<sub>a</sub>&gamma;H<sup>2</sup> + K<sub>a</sub>qH",
      ],
      references: retainingRefs,
    }),
  },
  {
    slug: "coulomb-earth-pressure",
    status: "archived",
    title: "Coulomb Earth Pressure (Simplified)",
    category: "Earth Pressure & Retaining Structures",
    shortDescription:
      "Estimate active earth pressure for a vertical wall with horizontal backfill using a simplified Coulomb expression.",
    tags: ["Coulomb", "wall friction"],
    keywords: ["Ka", "delta", "wall friction"],
    featured: false,
    inputs: [
      num("frictionAngle", "Backfill friction angle, phi'", 32, "deg", { min: 0, max: 50, step: 0.1 }),
      num("wallFriction", "Wall friction angle, delta", 12, "deg", { min: 0, max: 30, step: 0.1 }),
      num("unitWeight", "Backfill unit weight, gamma", 19, "kN/m3", { min: 1, step: 0.1 }),
      num("height", "Retained height, H", 5, "m", { min: 0.1, step: 0.01 }),
      num("surcharge", "Uniform surcharge, q", 0, "kPa", { min: 0, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Uses a simplified vertical-wall, horizontal-backfill Coulomb formulation to show how wall friction can alter active pressure.",
      assumptions: [
        "Wall back is vertical and backfill is horizontal.",
        "Only active earth pressure is reported in this simplified form.",
      ],
      limitations: [
        "General sloping backfill and battered wall geometry are outside scope.",
        "Construction sequence and drainage effects are not captured.",
      ],
      equations: [
        "K<sub>a,C</sub> = cos<sup>2</sup>&phi;' / { cos&delta; [1 + (sin(&phi;' + &delta;) sin&phi;' / cos&delta;)<sup>0.5</sup>] }<sup>2</sup>",
      ],
      references: retainingRefs,
    }),
  },
  {
    slug: "k0-earth-pressure",
    status: "archived",
    title: "At-Rest Earth Pressure K0",
    category: "Earth Pressure & Retaining Structures",
    shortDescription:
      "Estimate at-rest earth pressure coefficient using Jaky's relation and an OCR adjustment.",
    tags: ["K0", "Jaky"],
    keywords: ["at-rest", "OCR", "lateral stress"],
    featured: false,
    inputs: [
      num("frictionAngle", "Effective friction angle, phi'", 30, "deg", { min: 0, max: 50, step: 0.1 }),
      num("ocr", "Overconsolidation ratio, OCR", 1, undefined, { min: 1, step: 0.1 }),
      num("verticalStress", "Vertical effective stress, sigma'v", 100, "kPa", { min: 0.1, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Computes Jaky's K0 for normally consolidated soil and an OCR-adjusted version for stress-history screening.",
      assumptions: [
        "The soil is not heavily structured or cemented.",
        "Effective stress friction angle is representative.",
      ],
      limitations: [
        "Many soils depart from Jaky's relation.",
        "Stress rotation and unloading-reloading path effects are not captured.",
      ],
      equations: [
        "K<sub>0,NC</sub> = 1 - sin&phi;'",
        "K<sub>0,OC</sub> = K<sub>0,NC</sub> OCR<sup>sin&phi;'</sup>",
      ],
      references: retainingRefs,
    }),
  },
];

const pileTools: ToolDefinition[] = [
  {
    slug: "pile-axial-capacity",
    status: "archived",
    title: "Pile Axial Capacity",
    category: "Pile Foundations",
    shortDescription: "Sum shaft and base resistance into ultimate and allowable axial pile capacity.",
    tags: ["pile capacity", "shaft resistance"],
    keywords: ["Qs", "Qb", "Qult"],
    featured: false,
    inputs: [
      num("shaftResistance", "Unit shaft resistance, f_s", 55, "kPa", { min: 0, step: 0.1 }),
      num("diameter", "Pile diameter, D", 0.6, "m", { min: 0.05, step: 0.01 }),
      num("embeddedLength", "Embedded length, L", 18, "m", { min: 0.1, step: 0.01 }),
      num("baseResistance", "Unit base resistance, q_b", 3500, "kPa", { min: 0, step: 1 }),
      num("factorOfSafety", "Factor of safety", 2.5, undefined, { min: 1.5, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Uses perimeter times embedded length for shaft resistance and pile base area for end bearing, then applies a chosen factor of safety.",
      assumptions: [
        "Uniform unit shaft resistance and base resistance are assumed.",
        "Compression loading only is considered.",
      ],
      limitations: [
        "Installation effects, setup, cyclic loading, and settlement compatibility are not included.",
        "Layer-specific capacity should be checked separately in design.",
      ],
      equations: [
        "Q<sub>s</sub> = f<sub>s</sub>(&pi;DL)",
        "Q<sub>b</sub> = q<sub>b</sub>(&pi;D<sup>2</sup>/4)",
        "Q<sub>all</sub> = (Q<sub>s</sub> + Q<sub>b</sub>) / FS",
      ],
      references: pileRefs,
    }),
  },
  {
    slug: "pile-alpha-beta-lambda",
    status: "archived",
    title: "Alpha / Beta / Lambda Shaft Method",
    category: "Pile Foundations",
    shortDescription:
      "Apply a generic alpha, beta, or lambda shaft-resistance method using a user-supplied coefficient and reference stress.",
    tags: ["alpha method", "beta method", "lambda method"],
    keywords: ["shaft resistance", "interface stress", "deep foundations"],
    featured: false,
    inputs: [
      select("method", "Method", "alpha", [
        { label: "Alpha", value: "alpha" },
        { label: "Beta", value: "beta" },
        { label: "Lambda", value: "lambda" },
      ]),
      num("coefficient", "Method coefficient", 0.7, undefined, { min: 0, step: 0.01 }),
      num("referenceStress", "Reference stress for selected method", 80, "kPa", { min: 0, step: 0.1 }),
      num("perimeter", "Pile perimeter", 1.9, "m", { min: 0.01, step: 0.01 }),
      num("embeddedLength", "Embedded length", 16, "m", { min: 0.1, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Applies a generic interface resistance form where shaft stress equals the chosen method coefficient times an appropriate reference stress.",
      assumptions: [
        "The user selects the correct coefficient and reference stress for the method in use.",
        "The goal is transparent screening rather than detailed pile design.",
      ],
      limitations: [
        "Different alpha, beta, and lambda formulations use different reference quantities in practice.",
        "Always calibrate against local practice and load testing when available.",
      ],
      equations: ["f<sub>s</sub> = C&sigma;<sub>ref</sub>", "Q<sub>s</sub> = f<sub>s</sub>PL"],
      references: pileRefs,
    }),
  },
  {
    slug: "negative-skin-friction",
    status: "archived",
    title: "Negative Skin Friction",
    category: "Pile Foundations",
    shortDescription: "Estimate downdrag load from a unit negative shaft stress over a drag length.",
    tags: ["downdrag", "negative skin friction"],
    keywords: ["beta", "dragload", "settling fill"],
    featured: false,
    inputs: [
      num("betaNegative", "Negative friction coefficient, beta_neg", 0.2, undefined, { min: 0, step: 0.01 }),
      num("effectiveStress", "Average vertical effective stress", 90, "kPa", { min: 0, step: 0.1 }),
      num("perimeter", "Pile perimeter", 1.9, "m", { min: 0.01, step: 0.01 }),
      num("dragLength", "Drag length", 8, "m", { min: 0.1, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Uses a beta-style relation for average negative shaft stress over the specified drag length.",
      assumptions: [
        "Average stress conditions are representative over the drag zone.",
        "Compression-only dragload screening is intended.",
      ],
      limitations: [
        "Neutral plane location is not analysed.",
        "Time-dependent fill settlement and group interaction are not included.",
      ],
      equations: [
        "f<sub>neg</sub> = &beta;<sub>neg</sub>&sigma;'<sub>v</sub>",
        "Q<sub>neg</sub> = f<sub>neg</sub>PL<sub>drag</sub>",
      ],
      references: pileRefs,
    }),
  },
  {
    slug: "pile-group-efficiency",
    status: "archived",
    title: "Pile Group Efficiency",
    category: "Pile Foundations",
    shortDescription: "Estimate group efficiency with a Converse-Labarre style spacing correction.",
    tags: ["pile group", "efficiency"],
    keywords: ["Converse Labarre", "group capacity", "spacing"],
    featured: false,
    inputs: [
      num("rows", "Number of rows, m", 3, undefined, { min: 1, step: 1 }),
      num("columns", "Number of columns, n", 3, undefined, { min: 1, step: 1 }),
      num("diameter", "Pile diameter, D", 0.6, "m", { min: 0.05, step: 0.01 }),
      num("spacing", "Pile spacing, s", 1.8, "m", { min: 0.05, step: 0.01 }),
      num("singlePileAllowable", "Allowable capacity of one pile", 900, "kN", { min: 0.1, step: 1 }),
    ],
    information: info({
      methodology:
        "Applies a common approximate spacing-based group efficiency relation for preliminary group capacity screening.",
      assumptions: ["Pile spacing is uniform in both directions.", "Single-pile allowable capacity is already established."],
      limitations: [
        "Block failure and settlement compatibility require separate review.",
        "This empirical efficiency relation should not replace project-specific analysis.",
      ],
      equations: ["&eta;<sub>g</sub> = 1 - {arctan(D/s)[(m - 1)n + (n - 1)m]} / (90mn)"],
      references: pileRefs,
    }),
  },
];

const improvementTools: ToolDefinition[] = [
  {
    slug: "preloading-settlement",
    status: "archived",
    title: "Preloading Settlement Check",
    category: "Ground Improvement",
    shortDescription:
      "Compare service-load settlement and preload-stage settlement using a simple one-dimensional consolidation expression.",
    tags: ["preloading", "surcharge"],
    keywords: ["settlement gain", "preload", "OCR"],
    featured: false,
    inputs: [
      num("compressionIndex", "Compression index, Cc", 0.3, undefined, { min: 0.01, step: 0.01 }),
      num("voidRatio", "Initial void ratio, e0", 1.0, undefined, { min: 0.05, step: 0.01 }),
      num("layerThickness", "Compressible thickness, H", 6, "m", { min: 0.1, step: 0.01 }),
      num("initialStress", "Initial effective stress, sigma'0", 80, "kPa", { min: 0.1, step: 0.1 }),
      num("serviceStress", "Service stress increase", 35, "kPa", { min: 0, step: 0.1 }),
      num("preloadStress", "Preload stress increase", 60, "kPa", { min: 0, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Compares settlement under service loading and settlement under a higher preload stage using the log-stress relationship for normally consolidated behaviour.",
      assumptions: ["Normal consolidation is assumed.", "The tool is intended for relative comparison of preload magnitude."],
      limitations: [
        "Recompression behaviour after surcharge removal is not modelled explicitly.",
        "Drainage and time-rate are outside this tool.",
      ],
      equations: ["s = HC<sub>c</sub>log[( &sigma;'<sub>0</sub> + &Delta;&sigma;' ) / &sigma;'<sub>0</sub>] / (1 + e<sub>0</sub>)"],
      references: improvementRefs,
    }),
  },
  {
    slug: "wick-drains-time-factor",
    status: "archived",
    title: "Wick Drains Time Factor",
    category: "Ground Improvement",
    shortDescription:
      "Estimate radial consolidation for vertical drains using a Barron-type simplified time factor.",
    tags: ["PVD", "radial consolidation"],
    keywords: ["wick drain", "Barron", "time factor"],
    featured: false,
    inputs: [
      num("ch", "Horizontal coefficient of consolidation, c_h", 3, "m2/yr", { min: 0.0001, step: 0.1 }),
      num("time", "Elapsed time, t", 0.5, "yr", { min: 0.0001, step: 0.01 }),
      num("equivalentDiameter", "Equivalent influence diameter, d_e", 1.2, "m", { min: 0.01, step: 0.01 }),
      num("drainDiameter", "Drain diameter, d_w", 0.1, "m", { min: 0.001, step: 0.001 }),
    ],
    information: info({
      methodology:
        "Uses a no-smear Barron-style radial consolidation expression to estimate average degree of consolidation around a drain.",
      assumptions: ["Smear and well resistance are ignored.", "Equivalent drain spacing has already been determined."],
      limitations: [
        "Field performance often differs materially from the ideal radial solution.",
        "Vertical drainage and staged loading are not included.",
      ],
      equations: [
        "T<sub>h</sub> = c<sub>h</sub>t / d<sub>e</sub><sup>2</sup>",
        "F(n) = ln(d<sub>e</sub>/d<sub>w</sub>) - 0.75",
        "U = 1 - exp[-8T<sub>h</sub>/F(n)]",
      ],
      references: improvementRefs,
    }),
  },
  {
    slug: "stone-column-improvement",
    status: "archived",
    title: "Stone Column Improvement Factor",
    category: "Ground Improvement",
    shortDescription:
      "Estimate a simple settlement reduction factor from area replacement ratio and stress concentration.",
    tags: ["stone columns", "settlement reduction"],
    keywords: ["replacement ratio", "improvement factor", "stress concentration"],
    featured: false,
    inputs: [
      num("replacementRatio", "Area replacement ratio, a_s", 0.18, undefined, {
        min: 0.01,
        max: 0.8,
        step: 0.01,
      }),
      num("stressConcentration", "Stress concentration ratio, n", 3.5, undefined, { min: 1, step: 0.1 }),
      num("untreatedSettlement", "Untreated settlement", 90, "mm", { min: 0, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Uses a compact area-replacement concept to estimate a screening-level settlement improvement factor.",
      assumptions: [
        "Stress concentration ratio is known or sensibly assumed.",
        "Area replacement ratio adequately characterises the treatment layout.",
      ],
      limitations: [
        "Bulging, drainage benefits, and installation effects are ignored.",
        "Use detailed design methods for final spacing and performance prediction.",
      ],
      equations: ["IF = 1 / [1 - a<sub>s</sub>(1 - 1/n)]"],
      references: improvementRefs,
    }),
  },
];

const liquefactionTools: ToolDefinition[] = [
  {
    slug: "seed-idriss-liquefaction-screening",
    status: "active",
    title: "Liquefaction Potential",
    category: "Liquefaction",
    shortDescription:
      "Screen liquefaction triggering with either the TBDY 2018 procedure, in force since 1 January 2019, or an Idriss and Boulanger (2008) SPT-based route.",
    tags: ["liquefaction", "TBDY", "Idriss-Boulanger", "SPT"],
    keywords: ["CSR", "CRR", "FS", "SDS", "amax", "N1,60", "fines content"],
    featured: true,
    inputs: [
      select("method", "Liquefaction method", "idriss-boulanger-2008", [
        { label: "Idriss & Boulanger (2008)", value: "idriss-boulanger-2008" },
        { label: "TBDY 2018 (in force since 1 Jan 2019)", value: "tbdy-2018" },
      ]),
      num("magnitude", "Earthquake magnitude, M_w", 7.5, undefined, { min: 5, max: 9, step: 0.1 }),
      num("peakGroundAcceleration", "Peak Ground Acceleration, PGA", 0.30, "g", {
        min: 0,
        step: 0.01,
      }),
      num("groundwaterDepth", "Groundwater depth, GWT", 1.5, "m", { min: 0, step: 0.1 }),
      num("unitWeight", "Unit weight, gamma", 18, "kN/m3", { min: 1, step: 0.1 }),
      num("finesContent", "Fines content, FC", 15, "%", { min: 0, max: 100, step: 0.1 }),
      num("sampleDepth", "Sample depth, z", 4, "m", { min: 0.1, step: 0.1 }),
      num("n160", "Corrected SPT resistance, (N1)60", 15, undefined, { min: 1, max: 60, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Use the method selector to switch between the TBDY 2018 screening procedure, which came into force on 1 January 2019, and an Idriss and Boulanger (2008) SPT-based screening route. A single Peak Ground Acceleration input is shared by both routes, while the fines correction, seismic demand form, resistance expression, and acceptance threshold change with the selected method.",
      assumptions: [
        "The selected method is used consistently for both the demand side and the resistance side of the screening calculation.",
        "Input (N1)60 is already appropriately corrected for energy and overburden before use in this tool.",
        "A single representative bulk unit weight is used to estimate total and effective vertical stress at the sample depth.",
      ],
      limitations: [
        "This is not a full site response, cyclic stress, or performance-based liquefaction assessment.",
        "Depth reduction factor, fines correction, and magnitude scaling are simplified screening relations and should not replace project-specific seismic evaluation.",
        "Consequences such as lateral spreading, settlement, ejecta, and structure-soil interaction remain outside scope.",
      ],
      equations: [
        "&alpha; = 0, &beta; = 1 for FC &le; 5; &alpha; = e<sup>(1.76 - 190 / FC<sup>2</sup>)</sup>, &beta; = 0.99 + FC<sup>1.5</sup> / 1000 for 5 &lt; FC &le; 35; &alpha; = 5, &beta; = 1.2 for FC &gt; 35",
        "(N<sub>1</sub>)<sub>60f</sub> = &alpha; + &beta;(N<sub>1</sub>)<sub>60</sub>",
        "CRR<sub>M7.5</sub> = 1 / (34 - N) + N / 135 + 50 / (10N + 45)<sup>2</sup> - 1 / 200",
        "C<sub>M</sub> = 10<sup>2.24</sup> / M<sub>w</sub><sup>2.56</sup>",
        "r<sub>d</sub> = 1 - 0.00765z for z &le; 9.15 m; r<sub>d</sub> = 1.174 - 0.0267z for 9.15 &lt; z &le; 23 m; r<sub>d</sub> = 0.744 - 0.008z for 23 &lt; z &le; 30 m",
        "&tau;<sub>R</sub> = CRR<sub>M7.5</sub>C<sub>M</sub>&sigma;'<sub>v0</sub>",
        "&tau;<sub>eq</sub> = 0.65&sigma;<sub>v0</sub>(0.4SDS)r<sub>d</sub>",
        "FS = &tau;<sub>R</sub> / &tau;<sub>eq</sub>",
      ],
      tables: [
        {
          title: "Layered Screening Criteria",
          columns: ["Condition", "Layered tab outcome", "Reason"],
          rows: [
            ["Sample depth > 20 m", "Outside sample depth range", "The layered pilot excludes deeper samples from the simplified screening workflow."],
            ["Sample depth <= groundwater depth", "Above GWT", "Samples above the groundwater table are screened out in this quick liquefaction check."],
            ["(N1)60 > 30", "(N1)60 > 30", "The layered pilot flags dense or high-resistance samples instead of continuing with the simplified triggering check."],
            ["None of the above", "Analysis", "The tool continues with the selected method-specific demand, resistance, and factor-of-safety sequence."],
          ],
          note: "These layered-tab criteria are screening rules built into the pilot workflow so the user can see whether the selected simplified triggering calculation is being advanced or intentionally held back.",
        },
      ],
      references: [
        "AFAD (2018). Turkiye Bina Deprem Yonetmeligi (TBDY 2018). Official regulation published in 2018 and in force since 1 January 2019.",
        "Idriss, I.M. and Boulanger, R.W. (2008). Soil Liquefaction During Earthquakes. Earthquake Engineering Research Institute (EERI).",
        ...liquefactionRefs,
      ],
      disclaimer: liquefactionDisclaimer,
    }),
  },
  {
    slug: "liquefaction-csr",
    status: "archived",
    title: "Liquefaction CSR",
    category: "Liquefaction",
    shortDescription: "Compute cyclic stress ratio using the simplified Seed-Idriss expression.",
    tags: ["CSR", "earthquake"],
    keywords: ["amax", "rd", "cyclic stress ratio"],
    featured: false,
    inputs: [
      num("amax", "Peak horizontal acceleration, amax/g", 0.25, "g", { min: 0, step: 0.01 }),
      num("totalStress", "Total vertical stress, sigma_v0", 150, "kPa", { min: 0.1, step: 0.1 }),
      num("effectiveStress", "Effective vertical stress, sigma'v0", 90, "kPa", { min: 0.1, step: 0.1 }),
      num("rd", "Stress reduction factor, r_d", 0.9, undefined, { min: 0.1, max: 1.2, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Applies the familiar simplified cyclic stress ratio expression widely used in liquefaction triggering screening.",
      assumptions: [
        "Equivalent uniform loading is assumed.",
        "Input stresses and r_d already reflect the depth of interest.",
      ],
      limitations: [
        "Magnitude scaling and stress corrections are separate from CSR.",
        "This tool alone does not indicate liquefaction susceptibility or consequence.",
      ],
      equations: ["CSR = 0.65(a<sub>max</sub>/g)(&sigma;<sub>v0</sub> / &sigma;'<sub>v0</sub>)r<sub>d</sub>"],
      tables: [
        {
          title: "Layered Screening Criteria",
          columns: ["Condition", "Layered tab outcome", "Reason"],
          rows: [
            ["Sample depth > 20 m", "Outside sample depth range", "The layered pilot excludes deeper samples from the simplified screening workflow."],
            ["Sample depth <= groundwater depth", "Above GWT", "Samples above the groundwater table are screened out in this quick liquefaction check."],
            ["(N1)60 > 30", "(N1)60 > 30", "The layered pilot flags dense or high-resistance samples instead of continuing with the simplified triggering check."],
            ["None of the above", "Analyse", "The tool continues to C_M, CRR_7.5, r_d, tau_R, tau_eq, and FS."],
          ],
          note: "These layered-tab criteria are screening rules built into the pilot workflow so the user can see whether the simplified triggering calculation is being advanced or intentionally held back.",
        },
      ],
      references: liquefactionRefs,
      disclaimer: liquefactionDisclaimer,
    }),
  },
  {
    slug: "liquefaction-crr",
    status: "archived",
    title: "Liquefaction CRR (Simplified)",
    category: "Liquefaction",
    shortDescription:
      "Estimate clean-sand equivalent CRR at magnitude 7.5 from corrected SPT resistance.",
    tags: ["CRR", "SPT"],
    keywords: ["N1,60cs", "clean sand equivalent", "triggering"],
    featured: false,
    inputs: [num("n160cs", "Corrected clean-sand resistance, (N1)60cs", 18, undefined, { min: 1, max: 35, step: 0.1 })],
    information: info({
      methodology:
        "Uses a common simplified polynomial expression for clean-sand equivalent SPT resistance at earthquake magnitude 7.5.",
      assumptions: [
        "The supplied corrected SPT resistance is defensible.",
        "The correlation is used only within its usual range.",
      ],
      limitations: [
        "Corrections for fines, overburden, and sampler details are outside this tool.",
        "Detailed triggering analysis still requires engineering judgement.",
      ],
      equations: ["CRR<sub>7.5</sub> = 1/(34 - N) + N/135 + 50/(10N + 45)<sup>2</sup> - 1/200"],
      tables: [
        {
          title: "Layered Screening Criteria",
          columns: ["Condition", "Layered tab outcome", "Reason"],
          rows: [
            ["Sample depth > 20 m", "Outside sample depth range", "The layered pilot excludes deeper samples from the simplified screening workflow."],
            ["Sample depth <= groundwater depth", "Above GWT", "Samples above the groundwater table are screened out in this quick liquefaction check."],
            ["(N1)60 > 30", "(N1)60 > 30", "The layered pilot flags dense or high-resistance samples instead of continuing with the simplified triggering check."],
            ["None of the above", "Analyse", "The tool continues to C_M, CRR_7.5, r_d, tau_R, tau_eq, and FS."],
          ],
          note: "These layered-tab criteria are screening rules built into the pilot workflow so the user can see whether the simplified triggering calculation is being advanced or intentionally held back.",
        },
      ],
      references: liquefactionRefs,
      disclaimer: liquefactionDisclaimer,
    }),
  },
  {
    slug: "liquefaction-factor-of-safety",
    status: "archived",
    title: "Liquefaction Factor of Safety",
    category: "Liquefaction",
    shortDescription:
      "Combine CSR, CRR, and correction factors into a screening-level factor of safety against triggering.",
    tags: ["factor of safety", "liquefaction"],
    keywords: ["CSR", "CRR", "MSF", "Ksigma"],
    featured: true,
    inputs: [
      num("csr", "CSR", 0.19, undefined, { min: 0.0001, step: 0.001 }),
      num("crr75", "CRR7.5", 0.22, undefined, { min: 0.0001, step: 0.001 }),
      num("msf", "Magnitude scaling factor, MSF", 1.1, undefined, { min: 0.1, step: 0.01 }),
      num("ksigma", "Overburden correction, K_sigma", 1.0, undefined, { min: 0.1, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Forms a screening-level liquefaction triggering factor of safety from cyclic demand, cyclic resistance, and selected correction factors.",
      assumptions: ["CSR and CRR inputs have already been corrected appropriately for the soil profile and depth."],
      limitations: [
        "This output is not sufficient for consequence assessment.",
        "Layering, drainage, and seismic hazard uncertainty remain critical.",
      ],
      equations: ["FoS = (CRR<sub>7.5</sub>MSF K<sub>&sigma;</sub>) / CSR"],
      tables: [
        {
          title: "Layered Screening Criteria",
          columns: ["Condition", "Layered tab outcome", "Reason"],
          rows: [
            ["Sample depth > 20 m", "Outside sample depth range", "The layered pilot excludes deeper samples from the simplified screening workflow."],
            ["Sample depth <= groundwater depth", "Above GWT", "Samples above the groundwater table are screened out in this quick liquefaction check."],
            ["(N1)60 > 30", "(N1)60 > 30", "The layered pilot flags dense or high-resistance samples instead of continuing with the simplified triggering check."],
            ["None of the above", "Analyse", "The tool continues to C_M, CRR_7.5, r_d, tau_R, tau_eq, and FS."],
          ],
          note: "These layered-tab criteria are screening rules built into the pilot workflow so the user can see whether the simplified triggering calculation is being advanced or intentionally held back.",
        },
      ],
      references: liquefactionRefs,
      disclaimer: liquefactionDisclaimer,
    }),
  },
  {
    slug: "post-liquefaction-settlement",
    status: "active",
    title: "Liquefiable Soil Settlement",
    category: "Liquefaction",
    shortDescription:
      "Estimate post-liquefaction settlement in a Youd-style screening workflow by inferring relative density from corrected SPT resistance and then calculating maximum shear strain and volumetric strain.",
    tags: ["post-liquefaction", "settlement", "Youd"],
    keywords: ["relative density", "maximum shear strain", "volumetric strain", "N1,60", "layer thickness"],
    featured: false,
    inputs: [
      num("correctedSptResistance", "Corrected SPT resistance, (N1)60", 15, undefined, {
        min: 1,
        max: 60,
        step: 0.1,
      }),
      num("factorOfSafety", "Liquefaction triggering factor of safety, FS", 0.85, undefined, {
        min: 0.1,
        max: 3,
        step: 0.01,
      }),
      num("layerThickness", "Delta thickness, delta_H", 4, "m", { min: 0.1, step: 0.01 }),
    ],
    information: info({
      methodology:
        "This pilot post-liquefaction settlement tool follows a Youd-style consequence-screening logic using corrected SPT resistance and liquefaction triggering factor of safety as the main inputs. Relative density is estimated from corrected SPT resistance, limiting shear strain is then calculated from relative density using an Idriss and Boulanger style expression, a threshold parameter is formed from relative density, maximum shear strain is estimated with the calculated limiting shear strain as the cap, volumetric strain is then estimated from relative density and maximum shear strain, and settlement is obtained from volumetric strain times layer thickness.",
      assumptions: [
        "The corrected SPT resistance is representative of the liquefiable layer being assessed.",
        "The simplified D_r correlation from corrected SPT resistance is acceptable for this screening-level workflow.",
        "The Idriss and Boulanger style limiting-shear-strain expression is being used as a screening estimate rather than a full project-specific strain-chart interpretation.",
      ],
      limitations: [
        "The relative-density correlation and post-liquefaction strain expressions are screening approximations and should not replace project-specific settlement analysis.",
        "Limiting shear strain is generated from a simplified relative-density relation and should not be treated as a direct substitute for detailed chart-based interpretation.",
        "Surface manifestation, ejecta, lateral spreading, and structure-soil interaction remain outside scope.",
      ],
      equations: [
        "D<sub>r</sub> &asymp; [(N<sub>1</sub>)<sub>60</sub> / 60]<sup>0.5</sup>",
        "&gamma;<sub>lim</sub> = max[1.859(1.1 - D<sub>r</sub>)<sup>3</sup>, 0.05]",
        "F<sub>&alpha;</sub> = 0.032 + 4.7D<sub>r</sub> - 6D<sub>r</sub><sup>2</sup>",
        "&gamma;<sub>max</sub> = 0 for FS &ge; 2; &gamma;<sub>max</sub> = min{&gamma;<sub>lim</sub>, [0.035(2 - FS)(1 - F<sub>&alpha;</sub>)] / [FS - F<sub>&alpha;</sub>]} for F<sub>&alpha;</sub> &lt; FS &lt; 2; &gamma;<sub>max</sub> = &gamma;<sub>lim</sub> for FS &le; F<sub>&alpha;</sub>",
        "&epsilon;<sub>v</sub> = 1.5e<sup>-2.5D<sub>r</sub></sup> min(0.08, &gamma;<sub>max</sub>)",
        "s = &epsilon;<sub>v</sub>&Delta;H",
      ],
      references: [
        "Youd, T.L. and Idriss, I.M. (2001). Liquefaction Resistance of Soils: Summary Report from the 1996 NCEER and 1998 NCEER/NSF Workshops on Evaluation of Liquefaction Resistance of Soils. Journal of Geotechnical and Geoenvironmental Engineering, 127(4), 297-313.",
        "Ishihara, K. and Yoshimine, M. (1992). Evaluation of Settlements in Sand Deposits Following Liquefaction During Earthquakes. Soils and Foundations, 32(1), 173-188.",
      ],
      disclaimer: liquefactionDisclaimer,
    }),
  },
];

const railwayTools: ToolDefinition[] = [
  {
    slug: "track-stiffness",
    status: "archived",
    title: "Track Stiffness",
    category: "Railway Geotechnics",
    shortDescription: "Estimate track stiffness from applied load and measured deflection.",
    tags: ["railway", "stiffness"],
    keywords: ["load-deflection", "track support"],
    featured: true,
    inputs: [
      num("load", "Applied wheel or rail seat load", 85, "kN", { min: 0.1, step: 0.1 }),
      num("deflection", "Measured vertical deflection", 1.8, "mm", { min: 0.001, step: 0.01 }),
    ],
    information: info({
      methodology: "Defines track stiffness directly from the measured load-deflection ratio.",
      assumptions: ["Load and deflection correspond to the same load event and support condition."],
      limitations: [
        "Dynamic effects and load sharing along the track are not resolved.",
        "This is a local support indicator, not a full track model.",
      ],
      equations: ["k<sub>track</sub> = P / &delta;"],
      references: railwayRefs,
    }),
  },
  {
    slug: "subgrade-modulus",
    status: "archived",
    title: "Subgrade Modulus (Deflection-Based)",
    category: "Railway Geotechnics",
    shortDescription: "Estimate modulus of subgrade reaction from contact pressure and measured deflection.",
    tags: ["subgrade reaction", "railway"],
    keywords: ["k", "pressure", "deflection"],
    featured: true,
    inputs: [
      num("pressure", "Applied contact pressure", 120, "kPa", { min: 0.1, step: 0.1 }),
      num("deflection", "Measured deflection", 1.5, "mm", { min: 0.001, step: 0.01 }),
    ],
    information: info({
      methodology: "Uses pressure divided by deflection as a screening-level modulus of subgrade reaction.",
      assumptions: ["Contact pressure is uniform over the loaded area.", "Deflection is small and representative."],
      limitations: [
        "Plate size, stress level, and nonlinearity affect the result strongly.",
        "This is not a resilient modulus or constitutive stiffness parameter.",
      ],
      equations: ["k<sub>s</sub> = q / &delta;"],
      references: railwayRefs,
    }),
  },
  {
    slug: "ballast-settlement",
    status: "archived",
    title: "Ballast Settlement (Power Law)",
    category: "Railway Geotechnics",
    shortDescription: "Estimate cumulative ballast settlement using a simple power-law load cycle model.",
    tags: ["ballast", "track deterioration"],
    keywords: ["power law", "load cycles", "maintenance"],
    featured: false,
    inputs: [
      num("coefficientA", "Coefficient a", 0.18, "mm", { min: 0, step: 0.001 }),
      num("exponentB", "Exponent b", 0.23, undefined, { min: 0, step: 0.001 }),
      num("cycles", "Load cycles, N", 1000000, undefined, { min: 1, step: 1 }),
    ],
    information: info({
      methodology:
        "Uses a generic cumulative settlement power law to compare how ballast settlement grows with repeated loading.",
      assumptions: ["Coefficients are calibrated externally for the ballast, sleeper, and traffic condition."],
      limitations: [
        "The tool is only as good as the chosen a and b values.",
        "Tamping history, moisture, fouling, and geometry defects are ignored.",
      ],
      equations: ["s = aN<sup>b</sup>"],
      references: railwayRefs,
    }),
  },
  {
    slug: "track-modulus",
    status: "archived",
    title: "Track Modulus",
    category: "Railway Geotechnics",
    shortDescription:
      "Estimate distributed track modulus from load, deflection, and sleeper spacing in a Winkler-style screening sense.",
    tags: ["track modulus", "rail support"],
    keywords: ["Winkler", "distributed stiffness", "sleeper spacing"],
    featured: false,
    inputs: [
      num("load", "Applied load", 85, "kN", { min: 0.1, step: 0.1 }),
      num("deflection", "Measured deflection", 1.8, "mm", { min: 0.001, step: 0.01 }),
      num("spacing", "Sleeper spacing", 0.65, "m", { min: 0.01, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Defines an indicative distributed support modulus from a load-deflection ratio normalised by sleeper spacing.",
      assumptions: ["Load share is localised over one sleeper spacing for screening purposes."],
      limitations: [
        "This is not a full beam-on-elastic-foundation back-calculation.",
        "Rail bending stiffness and multi-sleeper load distribution are omitted.",
      ],
      equations: ["u = P / (&delta;s)"],
      references: railwayRefs,
    }),
  },
  {
    slug: "differential-settlement-indicator",
    status: "archived",
    title: "Differential Settlement Indicator",
    category: "Railway Geotechnics",
    shortDescription:
      "Compute a simple differential settlement ratio between two points over a chosen gauge length.",
    tags: ["differential settlement", "track geometry"],
    keywords: ["ratio", "alignment", "maintenance trigger"],
    featured: false,
    inputs: [
      num("settlementA", "Settlement at point A", 6, "mm", { step: 0.1 }),
      num("settlementB", "Settlement at point B", 18, "mm", { step: 0.1 }),
      num("gaugeLength", "Evaluation length", 10, "m", { min: 0.1, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Measures the settlement difference between two locations and divides by the horizontal evaluation length.",
      assumptions: ["Settlements are measured consistently at the same time reference."],
      limitations: [
        "Track quality also depends on curvature, twist, stiffness transitions, and train dynamics.",
        "Thresholds should be set by the operator or project specification.",
      ],
      equations: ["DSI = |s<sub>A</sub> - s<sub>B</sub>| / L"],
      references: railwayRefs,
    }),
  },
];

const fieldAndEmpiricalTools: ToolDefinition[] = [
  {
    slug: "spt-corrections",
    status: "active",
    title: "SPT Corrections (N60 and N1,60)",
    category: "Soil Parameters",
    shortDescription: "Correct field SPT blow count to N60 and overburden-corrected N1,60.",
    tags: ["SPT", "N60"],
    keywords: ["energy correction", "CN", "overburden"],
    featured: true,
    inputs: [
      select("cnMethod", "Overburden correction method, C_N", "peck-1974", [
        { label: "Peck et al. (1974)", value: "peck-1974" },
        { label: "Liao & Whitman (1986)", value: "liao-whitman-1986" },
      ]),
      num("nField", "Recorded SPT N", 18, undefined, { min: 1, step: 1 }),
      num("energyRatio", "Hammer energy ratio, ER", 70, "%", { min: 1, step: 0.1 }),
      num("boreholeFactor", "Borehole diameter factor, Cb", 1.0, undefined, { min: 0.5, step: 0.01 }),
      num("rodFactor", "Rod length factor, Cr", 0.95, undefined, { min: 0.5, step: 0.01 }),
      num("samplerFactor", "Sampler factor, Cs", 1.0, undefined, { min: 0.5, step: 0.01 }),
      num("effectiveStress", "Vertical effective stress, sigma'v0", 100, "kPa", { min: 1, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Applies energy and equipment corrections to produce N60, then applies a selected overburden correction method to obtain (N1)60. The tool supports both a Peck et al. (1974) style overburden correction and the Liao and Whitman (1986) expression.",
      assumptions: [
        "The chosen equipment factors are appropriate for the test setup.",
        "An atmospheric pressure of 100 kPa is used.",
      ],
      limitations: [
        "Fines correction and clean-sand conversion are separate steps.",
        "Local practice may use slightly different correction caps.",
      ],
      equations: [
        "N<sub>60</sub> = N C<sub>E</sub>C<sub>b</sub>C<sub>r</sub>C<sub>s</sub>",
        "C<sub>E</sub> = ER / 60",
        "C<sub>N,Peck</sub> = 0.77 log<sub>10</sub>(2000 / &sigma;'<sub>v0</sub>)",
        "C<sub>N,Liao</sub> = (100 / &sigma;'<sub>v0</sub>)<sup>0.5</sup>",
        "(N<sub>1</sub>)<sub>60</sub> = C<sub>N</sub>N<sub>60</sub> &le; 2N<sub>60</sub>",
      ],
      tables: [
        {
          title: "Common SPT Correction Sequence",
          columns: ["Step", "Expression or factor", "Primary reference"],
          rows: [
            ["Energy correction", "C_E = ER / 60", "ASTM D4633; ASTM D6066"],
            ["Borehole diameter correction", "C_b selected from borehole size", "Skempton (1986)"],
            ["Rod length correction", "C_r selected from rod length", "Skempton (1986)"],
            ["Sampler correction", "C_s selected from sampler configuration", "ASTM D1586/D1586M; Youd et al. (2001)"],
            ["Overburden correction", "C_N selected from Peck (1974) or Liao & Whitman (1986)", "Peck et al. (1974); Liao & Whitman (1986)"],
          ],
          note: "The tool keeps the equipment factors explicit so you can either type project-specific values directly or choose them from the reference tables below.",
        },
        {
          title: "Typical Screening Values For Equipment Factors",
          columns: ["Factor", "Typical selection", "Reference basis"],
          rows: [
            ["C_b", "1.00 for 65-115 mm; 1.05 for 150 mm; 1.15 for 200 mm borehole diameter", "Skempton (1986)"],
            ["C_r", "0.75 for < 3 m; 0.80 for 3-4 m; 0.85 for 4-6 m; 0.95 for 6-10 m; 1.00 for 10-30 m", "Skempton (1986)"],
            ["C_s", "1.00 for standard sampler with liners; higher values may be used for sampler configurations without liners", "ASTM D1586/D1586M; Youd et al. (2001)"],
          ],
          note: "These are common screening values used in practice. Project-specific procedures, hardware, and local standards should govern the final selection.",
        },
        {
          title: "Overburden Correction Method Options",
          columns: ["Method", "Equation used in this tool", "Notes"],
          rows: [
            ["Peck et al. (1974)", "C_N = 0.77 log10(2000 / sigma'v0)", "sigma'v0 in kPa; screening bounds are applied to avoid unrealistic values."],
            ["Liao & Whitman (1986)", "C_N = (100 / sigma'v0)^0.5", "sigma'v0 in kPa; the result is capped in the screening workflow."],
          ],
          note: "After C_N is calculated, the tool enforces (N1)60 <= 2N60 as a practical screening cap.",
        },
      ],
      references: [
        "ASTM D1586/D1586M. Standard Test Method for Standard Penetration Test (SPT) and Split-Barrel Sampling of Soils.",
        "ASTM D4633. Standard Test Methods for Energy Measurement for Dynamic Penetrometers.",
        "ASTM D6066-11. Standard Practice for Determining the Normalized Penetration Resistance of Sands for Evaluation of Liquefaction Potential.",
        "Skempton, A.W. (1986). Standard penetration test procedures and the effects in sands of overburden pressure, relative density, particle size, ageing and overconsolidation. Geotechnique, 36(3), 425-447.",
        "Peck, R.B., Hanson, W.E., and Thornburn, T.H. (1974). Foundation Engineering, 2nd ed. John Wiley & Sons.",
        "Liao, S.S.C. and Whitman, R.V. (1986). Overburden Correction Factors for SPT in Sand. Journal of Geotechnical Engineering, 112(3), 373-377.",
        "Youd, T.L. et al. (2001). Liquefaction resistance of soils: Summary report from the 1996 NCEER and 1998 NCEER/NSF workshops. Journal of Geotechnical and Geoenvironmental Engineering, ASCE, 127(10), 817-833.",
      ],
    }),
  },
  {
    slug: "cpt-parameter-correlation",
    status: "archived",
    title: "CPT Parameter Correlation",
    category: "Field & In-Situ Testing",
    shortDescription: "Use a simplified CPT correlation to estimate undrained shear strength or friction angle.",
    tags: ["CPT", "correlation"],
    keywords: ["qc", "su", "phi"],
    featured: false,
    inputs: [
      select("soilType", "Soil type assumption", "clay", [
        { label: "Clay / fine-grained", value: "clay" },
        { label: "Sand / granular", value: "sand" },
      ]),
      num("qc", "Cone resistance, qc", 8, "MPa", { min: 0.1, step: 0.1 }),
      num("totalStress", "Total vertical stress, sigma_v0", 120, "kPa", { min: 0, step: 0.1 }),
      num("nkt", "Cone factor, Nkt", 15, undefined, { min: 5, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Provides one clay-style correlation to undrained strength and one sand-style correlation to friction angle for quick interpretation.",
      assumptions: ["The chosen soil type is appropriate.", "Cone factor selection and stress normalisation are representative."],
      limitations: [
        "These are broad correlations, not direct measurements.",
        "Use site-specific calibration whenever possible.",
      ],
      equations: [
        "s<sub>u</sub> = (q<sub>c</sub> - &sigma;<sub>v0</sub>) / N<sub>kt</sub>",
        "&phi;' &asymp; 17.6 + 11log<sub>10</sub>(q<sub>c</sub>/P<sub>a</sub>)",
      ],
      references: fieldRefs,
    }),
  },
  {
    slug: "lwd-modulus",
    status: "archived",
    title: "LWD Modulus",
    category: "Field & In-Situ Testing",
    shortDescription:
      "Estimate light weight deflectometer modulus from plate stress, plate radius, and deflection.",
    tags: ["LWD", "modulus"],
    keywords: ["dynamic plate", "Evd", "deflection"],
    featured: false,
    inputs: [
      num("peakStress", "Peak plate stress", 100, "kPa", { min: 0.1, step: 0.1 }),
      num("plateRadius", "Plate radius", 0.15, "m", { min: 0.01, step: 0.001 }),
      num("deflection", "Peak deflection", 0.75, "mm", { min: 0.001, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Uses a common compact LWD relation to convert peak stress and measured settlement into a surface modulus estimate.",
      assumptions: ["Plate contact is good and the reported peak deflection is reliable."],
      limitations: [
        "Different device standards use different scaling factors.",
        "Results are stress-level and moisture sensitive.",
      ],
      equations: ["E<sub>vd</sub> &asymp; 1.5r&sigma; / s"],
      references: fieldRefs,
    }),
  },
  {
    slug: "plate-load-test-modulus",
    status: "archived",
    title: "Plate Load Test Modulus",
    category: "Field & In-Situ Testing",
    shortDescription:
      "Estimate modulus and subgrade reaction from a plate load test pressure-settlement increment.",
    tags: ["plate load test", "modulus"],
    keywords: ["k", "Ev", "reloading"],
    featured: false,
    inputs: [
      num("deltaPressure", "Pressure increment, Delta q", 120, "kPa", { min: 0.1, step: 0.1 }),
      num("deltaSettlement", "Settlement increment, Delta s", 1.2, "mm", { min: 0.001, step: 0.01 }),
      num("plateDiameter", "Plate diameter", 0.3, "m", { min: 0.01, step: 0.001 }),
      num("poissonRatio", "Poisson ratio, nu", 0.3, undefined, { min: 0, max: 0.49, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Forms a secant subgrade reaction and a simplified elastic modulus estimate from a plate load test pressure-settlement increment.",
      assumptions: [
        "The pressure-settlement increment is taken from the relevant loading branch.",
        "Elastic interpretation is acceptable for the selected range.",
      ],
      limitations: [
        "Plate size effects are significant.",
        "Layering and stress nonlinearity may make the elastic modulus interpretation approximate.",
      ],
      equations: ["k = &Delta;q / &Delta;s", "E &asymp; (&pi;a/2)(1 - &nu;<sup>2</sup>)k"],
      references: fieldRefs,
    }),
  },
  {
    slug: "cu-vs-depth",
    status: "active",
    title: "c_u vs Depth",
    category: "Soil Parameters",
    shortDescription: "Estimate undrained shear strength at depth using a linear gradient.",
    tags: ["strength profile", "soft clay"],
    keywords: ["cu", "gradient", "depth"],
    featured: false,
    inputs: [
      num("cuSurface", "Surface undrained strength", 15, "kPa", { min: 0, step: 0.1 }),
      num("gradient", "Strength gradient", 1.5, "kPa/m", { min: 0, step: 0.01 }),
      num("depth", "Depth", 8, "m", { min: 0, step: 0.01 }),
    ],
    information: info({
      methodology:
        "Uses a simple linear increase of undrained strength with depth for profile screening and sanity checks.",
      assumptions: ["A linear profile is appropriate over the depth of interest."],
      limitations: [
        "Real deposits often show layering and nonlinearity.",
        "Do not substitute this for measured strength profiles.",
      ],
      equations: ["c<sub>u</sub>(z) = c<sub>u0</sub> + kz"],
      references: empiricalRefs,
    }),
  },
  {
    slug: "friction-angle-from-spt",
    status: "active",
    title: "Friction Angle from SPT",
    category: "Soil Parameters",
    shortDescription:
      "Estimate effective friction angle from corrected SPT resistance using a simple empirical fit.",
    tags: ["SPT", "friction angle"],
    keywords: ["phi", "N60", "sand correlation"],
    featured: false,
    inputs: [num("n60", "Corrected SPT resistance, N60", 20, undefined, { min: 1, max: 60, step: 0.1 })],
    information: info({
      methodology:
        "Uses a compact empirical curve to convert corrected SPT resistance into a friction-angle estimate for granular soils.",
      assumptions: [
        "Granular soil behaviour is dominant.",
        "The SPT correction process has already been carried out properly.",
      ],
      limitations: [
        "Correlations vary by mineralogy and density range.",
        "Treat the output as an initial estimate only.",
      ],
      equations: ["&phi;' &asymp; 27.1 + 0.3N<sub>60</sub> - 0.00054N<sub>60</sub><sup>2</sup>"],
      references: empiricalRefs,
    }),
  },
  {
    slug: "modulus-from-cu",
    status: "active",
    title: "Elastic Modulus from c_u",
    category: "Soil Parameters",
    shortDescription: "Estimate Young's modulus from undrained shear strength using a soil-type-based E/cu range or an optional manual override.",
    tags: ["modulus correlation", "undrained strength"],
    keywords: ["E/cu", "stiffness", "clay"],
    featured: false,
    inputs: [
      select("soilClass", "Soil class", "stiff-clay", [
        { label: "Soft clay", value: "soft-clay" },
        { label: "Medium clay", value: "medium-clay" },
        { label: "Stiff clay", value: "stiff-clay" },
      ]),
      select("manualRatioMode", "Ratio input mode", "auto", [
        { label: "Use recommended range", value: "auto" },
        { label: "Manual override", value: "manual" },
      ]),
      num("cu", "Undrained shear strength, c_u", 50, "kPa", { min: 0.1, step: 0.1 }),
      num("ratio", "Selected modulus ratio, E/cu", 500, undefined, { min: 10, step: 1 }),
    ],
    information: info({
      methodology:
        "Uses a recommended E/cu ratio range based on clay consistency for quick screening, while still allowing manual override when project-specific experience or testing supports a different value.",
      assumptions: [
        "The chosen soil class is a reasonable reflection of the clay consistency.",
        "If manual override is used, the entered E/cu ratio is appropriate for strain level and soil structure.",
      ],
      limitations: [
        "This ratio spans a wide range in practice.",
        "Strain level and structure can dominate the actual modulus.",
      ],
      equations: ["E = (E/c<sub>u</sub>)c<sub>u</sub>"],
      references: empiricalRefs,
      tables: [
        {
          title: "Recommended E/cu Ranges Used For Auto Selection",
          columns: ["Soil class", "Recommended E/cu", "Auto-filled value"],
          rows: [
            ["Soft clay", "100 - 200", "150"],
            ["Medium clay", "200 - 400", "300"],
            ["Stiff clay", "400 - 800", "600"],
          ],
          note: "These are indicative screening ranges only. Local calibration, laboratory testing, and strain-level judgement remain important.",
        },
      ],
    }),
  },
  {
    slug: "resilient-modulus-from-cbr",
    status: "active",
    title: "Resilient Modulus from CBR",
    category: "Soil Parameters",
    shortDescription: "Estimate resilient modulus from CBR using a common pavement-style correlation.",
    tags: ["CBR", "resilient modulus"],
    keywords: ["Mr", "subgrade", "pavement"],
    featured: false,
    inputs: [num("cbr", "CBR", 8, "%", { min: 0.1, step: 0.1 })],
    information: info({
      methodology: "Applies a widely used first-pass relation between CBR and resilient modulus.",
      assumptions: [
        "The soil and stress range are broadly compatible with the chosen correlation.",
      ],
      limitations: [
        "Pavement design often requires locally calibrated resilient modulus models.",
        "Seasonal moisture variation can strongly affect field stiffness.",
      ],
      equations: ["M<sub>r</sub> &asymp; 10.34CBR"],
      references: empiricalRefs,
    }),
  },
];

export const tools: ToolDefinition[] = [
  ...soilParameterTools,
  ...classificationTools,
  ...bearingTools,
  ...settlementTools,
  ...earthPressureTools,
  ...pileTools,
  ...improvementTools,
  ...liquefactionTools,
  ...railwayTools,
  ...fieldAndEmpiricalTools,
];

