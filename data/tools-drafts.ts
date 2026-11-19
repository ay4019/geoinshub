import type { ToolDefinition, ToolInformation, ToolInput } from "@/lib/types";

/**
 * Draft tool definitions backed by lib/design-tools engines.
 *
 * status "draft" keeps a tool out of listings, routes, and the sitemap (see lib/data-layer.ts).
 * To publish a tool, change its status to "active" — nothing else is required for the generic
 * Calculation tab. Checklist and validation cases: docs/design-tools-roadmap.md.
 */

const disclaimer =
  "Preliminary design aid. Read the general disclaimer below; independent engineering review against the cited manuals is required before design use.";

function info(config: Omit<ToolInformation, "disclaimer">): ToolInformation {
  return { ...config, disclaimer };
}

function num(name: string, label: string, defaultValue: number, unit?: string, extra?: Partial<ToolInput>): ToolInput {
  return { name, label, type: "number", defaultValue, unit, step: 0.1, ...extra };
}

function select(name: string, label: string, defaultValue: string, options: Array<{ label: string; value: string }>): ToolInput {
  return { name, label, type: "select", defaultValue, options };
}

const soilOptions = [
  { label: "Clay (undrained, c_u)", value: "clay" },
  { label: "Sand (drained, φ′ and N60)", value: "sand" },
];

const patternOptions = [
  { label: "Triangular", value: "triangular" },
  { label: "Square", value: "square" },
];

function layerInputs(n: number, defaults: { t: number; soil: string; g: number; cu: number; phi: number; n60: number }): ToolInput[] {
  return [
    num(`layer${n}Thickness`, `Layer ${n} thickness (0 = unused)`, defaults.t, "m", { min: 0, step: 0.1 }),
    select(`layer${n}Soil`, `Layer ${n} soil type`, defaults.soil, soilOptions),
    num(`layer${n}Gamma`, `Layer ${n} unit weight, γ`, defaults.g, "kN/m3", { min: 10, max: 25 }),
    num(`layer${n}Cu`, `Layer ${n} c_u (clay)`, defaults.cu, "kPa", { min: 0 }),
    num(`layer${n}Phi`, `Layer ${n} φ′ (sand)`, defaults.phi, "deg", { min: 0, max: 45 }),
    num(`layer${n}N60`, `Layer ${n} N60 (sand)`, defaults.n60, undefined, { min: 0, max: 100, step: 1 }),
  ];
}

export const draftTools: ToolDefinition[] = [
  // ───────────────────────────── Site characterisation ─────────────────────────────
  {
    slug: "cpt-interpretation-robertson",
    status: "draft",
    title: "CPT / CPTu Interpretation (Robertson SBTn)",
    category: "Field & In-Situ Testing",
    shortDescription:
      "Normalised CPT parameters, soil behaviour type index I_c, and derived s_u, OCR, φ′, D_r, V_s, M, and equivalent N60 from a single cone reading.",
    tags: ["CPT", "CPTu", "SBT", "Robertson"],
    keywords: ["Ic", "Qtn", "Fr", "Nkt", "cone penetration"],
    featured: false,
    inputs: [
      num("qc", "Cone resistance, q_c", 5, "MPa", { min: 0.05, step: 0.01 }),
      num("fs", "Sleeve friction, f_s", 50, "kPa", { min: 0 }),
      num("u2", "Pore pressure behind cone, u_2", 100, "kPa"),
      num("areaRatio", "Net area ratio, a", 0.8, undefined, { min: 0.5, max: 1, step: 0.01 }),
      num("depth", "Depth, z", 8, "m", { min: 0.1 }),
      num("groundwaterDepth", "Groundwater depth", 2, "m", { min: 0 }),
      num("unitWeight", "Unit weight (0 = estimate from CPT)", 0, "kN/m3", { min: 0 }),
      num("nkt", "Cone factor, N_kt", 14, undefined, { min: 8, max: 30 }),
    ],
    information: info({
      methodology:
        "Corrects q_c to q_t, iterates the stress exponent n to obtain Q_tn and I_c (Robertson 2009), assigns the SBTn zone, and applies drained (I_c ≤ 2.6) or undrained (I_c > 2.6) parameter correlations.",
      assumptions: ["Standard 10 cm² or 15 cm² cone with u_2 filter.", "Single reading representative of a homogeneous layer."],
      limitations: ["Thin-layer and transition effects are not corrected.", "Correlations are for uncemented, young, silica-based soils."],
      equations: [
        "q<sub>t</sub> = q<sub>c</sub> + u<sub>2</sub>(1 − a)",
        "Q<sub>tn</sub> = [(q<sub>t</sub> − σ<sub>v0</sub>)/p<sub>a</sub>](p<sub>a</sub>/σ′<sub>v0</sub>)<sup>n</sup>",
        "I<sub>c</sub> = [(3.47 − log Q<sub>tn</sub>)<sup>2</sup> + (log F<sub>r</sub> + 1.22)<sup>2</sup>]<sup>0.5</sup>",
        "s<sub>u</sub> = (q<sub>t</sub> − σ<sub>v0</sub>)/N<sub>kt</sub>",
        "V<sub>s</sub> = [10<sup>(0.55I<sub>c</sub> + 1.68)</sup>(q<sub>t</sub> − σ<sub>v0</sub>)/p<sub>a</sub>]<sup>0.5</sup>",
      ],
      references: [
        "Robertson, P.K. (2009). Interpretation of cone penetration tests — a unified approach. Canadian Geotechnical Journal, 46(11), 1337-1355.",
        "Robertson, P.K. and Cabal, K.L. (2015). Guide to Cone Penetration Testing for Geotechnical Engineering, 6th ed. Gregg Drilling.",
        "Kulhawy, F.H. and Mayne, P.W. (1990). Manual on Estimating Soil Properties for Foundation Design. EPRI EL-6800.",
        "Robertson, P.K. (2012). Interpretation of in-situ tests — some insights. Mitchell Lecture, ISC'4, Recife.",
      ],
    }),
  },
  {
    slug: "shear-wave-velocity-from-spt",
    status: "draft",
    title: "Shear-Wave Velocity (V_s) from SPT",
    category: "Rigidity / Deformation Tools",
    shortDescription: "Compares widely used SPT–V_s correlations, including Imai & Tonouchi (1982) and Iyisan (1996).",
    tags: ["Vs", "SPT", "seismic"],
    keywords: ["shear wave velocity", "Imai", "Ohta", "Iyisan", "Sykora"],
    featured: false,
    inputs: [
      num("n", "SPT N (as defined by the selected correlation)", 20, undefined, { min: 1, max: 100, step: 1 }),
      select("correlation", "Correlation", "imai-tonouchi-1982", [
        { label: "Imai & Tonouchi (1982)", value: "imai-tonouchi-1982" },
        { label: "Ohta & Goto (1978)", value: "ohta-goto-1978" },
        { label: "Sykora & Stokoe (1983)", value: "sykora-stokoe-1983" },
        { label: "Iyisan (1996)", value: "iyisan-1996" },
      ]),
    ],
    information: info({
      methodology: "Evaluates V_s = a N^b for each correlation and reports the selected value with the spread of alternatives.",
      assumptions: ["N is used as defined in each original study (mostly uncorrected field N)."],
      limitations: ["Typical scatter ±30%; not a substitute for measured V_s in site classification."],
      equations: ["V<sub>s</sub> = a N<sup>b</sup>"],
      references: [
        "Imai, T. and Tonouchi, K. (1982). Correlation of N-value with S-wave velocity and shear modulus. Proc. 2nd ESOPT, Amsterdam, 67-72.",
        "Ohta, Y. and Goto, N. (1978). Empirical shear wave velocity equations in terms of characteristic soil indexes. Earthquake Engineering & Structural Dynamics, 6(2), 167-187.",
        "Sykora, D.W. and Stokoe, K.H. (1983). Correlations of in-situ measurements in sands with shear wave velocity. Geotechnical Engineering Report GR83-33, University of Texas at Austin.",
        "Iyisan, R. (1996). Correlations between shear wave velocity and in-situ penetration test results. Teknik Dergi, 7(2), 1187-1199.",
      ],
    }),
  },
  {
    slug: "vs30-site-class",
    status: "draft",
    title: "V_s,30 and Seismic Site Class (TBDY 2018 / EC8)",
    category: "Field & In-Situ Testing",
    shortDescription: "Time-averaged shear-wave velocity of the top 30 m and the corresponding TBDY 2018 and EN 1998-1 classes.",
    tags: ["Vs30", "site class", "TBDY", "Eurocode 8"],
    keywords: ["ZA", "ZB", "ZC", "ZD", "ZE", "ground type"],
    featured: false,
    inputs: [1, 2, 3, 4, 5, 6].flatMap((k) => [
      num(`layer${k}Thickness`, `Layer ${k} thickness (0 = unused)`, [3, 5, 8, 14, 0, 0][k - 1], "m", { min: 0 }),
      num(`layer${k}Vs`, `Layer ${k} V_s`, [160, 220, 300, 450, 0, 0][k - 1], "m/s", { min: 0 }),
    ]),
    information: info({
      methodology: "V_s,30 = 30/Σ(h_i/V_s,i); the last layer is extended to 30 m when the profile is shallower.",
      assumptions: ["Layer velocities are representative measured or estimated values."],
      limitations: ["ZF / S1 / S2 special-site checks are not automated."],
      equations: ["V<sub>s,30</sub> = 30 / Σ(h<sub>i</sub>/V<sub>s,i</sub>)"],
      references: [
        "AFAD (2018). Türkiye Bina Deprem Yönetmeliği (TBDY 2018), Bölüm 16.",
        "EN 1998-1:2004 Eurocode 8: Design of structures for earthquake resistance — Part 1, §3.1.2.",
      ],
    }),
  },
  {
    slug: "relative-density-from-spt",
    status: "draft",
    title: "Relative Density (D_r) from SPT",
    category: "Soil Parameters",
    shortDescription: "Skempton (1986), Kulhawy & Mayne (1990), and Idriss & Boulanger (2008) relative density from (N1)60.",
    tags: ["relative density", "SPT", "sand"],
    keywords: ["Dr", "Skempton", "Kulhawy", "Mayne", "N160"],
    featured: false,
    inputs: [
      num("n160", "(N1)60", 15, undefined, { min: 0.5, max: 100 }),
      num("d50", "Mean grain size, D50", 0.3, "mm", { min: 0.05, max: 10, step: 0.01 }),
      num("ageYears", "Deposit age", 1000, "years", { min: 1, step: 1 }),
      num("ocr", "OCR", 1, undefined, { min: 1, max: 20 }),
      select("method", "Reported method", "kulhawy-mayne", [
        { label: "Kulhawy & Mayne (1990)", value: "kulhawy-mayne" },
        { label: "Skempton (1986)", value: "skempton" },
        { label: "Idriss & Boulanger (2008)", value: "idriss-boulanger" },
      ]),
    ],
    information: info({
      methodology: "D_r = √[(N1)60/C_d] with C_d from each method (grain size, ageing, and OCR terms for Kulhawy & Mayne).",
      assumptions: ["Clean, uncemented quartz sand."],
      limitations: ["Fines, gravel, and cementation bias SPT blow counts."],
      equations: [
        "D<sub>r</sub> = [(N<sub>1</sub>)<sub>60</sub>/(C<sub>p</sub>C<sub>A</sub>C<sub>OCR</sub>)]<sup>0.5</sup>",
        "C<sub>p</sub> = 60 + 25 log D<sub>50</sub>; C<sub>A</sub> = 1.2 + 0.05 log(t/100); C<sub>OCR</sub> = OCR<sup>0.18</sup>",
      ],
      references: [
        "Skempton, A.W. (1986). Standard penetration test procedures and the effects in sands of overburden pressure, relative density, particle size, ageing and overconsolidation. Géotechnique, 36(3), 425-447.",
        "Kulhawy, F.H. and Mayne, P.W. (1990). Manual on Estimating Soil Properties for Foundation Design. EPRI EL-6800.",
        "Idriss, I.M. and Boulanger, R.W. (2008). Soil Liquefaction During Earthquakes. EERI MNO-12.",
      ],
    }),
  },
  {
    slug: "compression-index-correlations",
    status: "draft",
    title: "Compression Index (C_c) Correlations",
    category: "Rigidity / Deformation Tools",
    shortDescription: "C_c from LL, e0, and w_n with derived C_r and C_α ranges for preliminary consolidation settlement.",
    tags: ["Cc", "consolidation", "clay"],
    keywords: ["compression index", "Skempton", "Terzaghi", "Nishida", "Cr", "Calpha"],
    featured: false,
    inputs: [
      num("ll", "Liquid limit, LL", 50, "%", { min: 10, max: 300 }),
      num("e0", "Initial void ratio, e0", 1.1, undefined, { min: 0.3, max: 6, step: 0.01 }),
      num("wn", "Natural water content, w_n", 40, "%", { min: 5, max: 300 }),
    ],
    information: info({
      methodology: "Evaluates five classical correlations and reports the mean and range, with C_r ≈ C_c/10–C_c/5 and C_α ≈ 0.04 C_c.",
      assumptions: ["Inorganic clays and silts."],
      limitations: ["Correlations carry ±30% scatter; oedometer tests govern design values."],
      equations: [
        "C<sub>c</sub> = 0.009(LL − 10)",
        "C<sub>c</sub> = 1.15(e<sub>0</sub> − 0.35)",
        "C<sub>α</sub>/C<sub>c</sub> ≈ 0.04",
      ],
      references: [
        "Skempton, A.W. (1944). Notes on the compressibility of clays. Quarterly Journal of the Geological Society, 100, 119-135.",
        "Terzaghi, K. and Peck, R.B. (1967). Soil Mechanics in Engineering Practice, 2nd ed. Wiley.",
        "Nishida, Y. (1956). A brief note on compression index of soil. Journal of the SMF Division, ASCE, 82(SM3), 1027.",
        "Azzouz, A.S., Krizek, R.J. and Corotis, R.B. (1976). Regression analysis of soil compressibility. Soils and Foundations, 16(2), 19-29.",
        "Mesri, G. and Godlewski, P.M. (1977). Time- and stress-compressibility interrelationship. Journal of the Geotechnical Engineering Division, ASCE, 103(GT5), 417-430.",
      ],
    }),
  },
  {
    slug: "undrained-strength-stress-history",
    status: "draft",
    title: "Undrained Strength from Stress History (SHANSEP)",
    category: "Shear Strength Tools",
    shortDescription: "s_u from σ′_v0 and σ′_p using SHANSEP (Ladd 1991), Mesri (1975), and Skempton (1957).",
    tags: ["su", "SHANSEP", "OCR"],
    keywords: ["undrained shear strength", "Ladd", "Mesri", "strength ratio"],
    featured: false,
    inputs: [
      num("sigmaV", "Vertical effective stress, σ′_v0", 80, "kPa", { min: 1 }),
      num("sigmaP", "Preconsolidation stress, σ′_p", 120, "kPa", { min: 1 }),
      num("pi", "Plasticity index, PI", 25, "%", { min: 0, max: 150 }),
      num("S", "SHANSEP S", 0.22, undefined, { min: 0.1, max: 0.5, step: 0.01 }),
      num("m", "SHANSEP m", 0.8, undefined, { min: 0.5, max: 1, step: 0.01 }),
    ],
    information: info({
      methodology: "Normalised strength approach: s_u/σ′_v0 = S·OCR^m, compared with Mesri's 0.22σ′_p and Skempton's NC ratio.",
      assumptions: ["Mechanically overconsolidated, non-structured clay."],
      limitations: ["Not valid for cemented, fissured, or highly sensitive clays without calibration."],
      equations: ["s<sub>u</sub>/σ′<sub>v0</sub> = S·OCR<sup>m</sup>", "s<sub>u</sub> = 0.22σ′<sub>p</sub>"],
      references: [
        "Ladd, C.C. (1991). Stability evaluation during staged construction. Journal of Geotechnical Engineering, ASCE, 117(4), 540-615.",
        "Mesri, G. (1975). Discussion on new design procedure for stability of soft clays. Journal of the Geotechnical Engineering Division, ASCE, 101(GT4), 409-412.",
        "Skempton, A.W. (1957). Discussion: The planning and design of the new Hong Kong airport. Proc. ICE, 7, 305-307.",
      ],
    }),
  },

  // ───────────────────────────── Geotechnical analysis / design ─────────────────────────────
  {
    slug: "pile-axial-capacity-fhwa",
    status: "draft",
    title: "Pile Axial Capacity — Driven Piles & Drilled Shafts (FHWA)",
    category: "Pile Foundations",
    shortDescription:
      "Layered static capacity of a single pile: GEC-12 α/β and Meyerhof toe for driven piles, GEC-10 α/β and N60 toe for drilled shafts.",
    tags: ["pile", "drilled shaft", "FHWA", "GEC-12", "GEC-10"],
    keywords: ["alpha method", "beta method", "skin friction", "end bearing", "bored pile", "fore kazık"],
    featured: true,
    inputs: [
      select("method", "Pile type / method", "driven", [
        { label: "Driven pile (FHWA GEC-12)", value: "driven" },
        { label: "Drilled shaft / bored pile (FHWA GEC-10)", value: "drilled-shaft" },
      ]),
      num("diameter", "Pile diameter, D", 0.8, "m", { min: 0.1, step: 0.05 }),
      num("length", "Embedded length, L", 20, "m", { min: 1 }),
      num("groundwaterDepth", "Groundwater depth", 2, "m", { min: 0 }),
      select("material", "Pile material (driven, δ/φ′)", "concrete", [
        { label: "Concrete (δ = 0.9φ′)", value: "concrete" },
        { label: "Steel (δ = 0.8φ′)", value: "steel" },
        { label: "Timber (δ = 0.85φ′)", value: "timber" },
      ]),
      num("ksK0", "Lateral stress ratio K_s/K_0 (driven)", 1.5, undefined, { min: 0.5, max: 2.5 }),
      select("sandType", "Sand type for GEC-10 σ′_p", "clean", [
        { label: "Clean quartz sand (m = 0.6)", value: "clean" },
        { label: "Silty sand (m = 0.8)", value: "silty" },
      ]),
      num("factorOfSafety", "Factor of safety (ASD)", 2.5, undefined, { min: 1.5 }),
      ...layerInputs(1, { t: 6, soil: "clay", g: 18, cu: 40, phi: 30, n60: 10 }),
      ...layerInputs(2, { t: 10, soil: "sand", g: 19, cu: 0, phi: 33, n60: 25 }),
      ...layerInputs(3, { t: 10, soil: "sand", g: 20, cu: 0, phi: 36, n60: 40 }),
    ],
    information: info({
      methodology:
        "Side resistance is integrated in 0.1 m increments over the embedded length using the method-specific α (cohesive) or β (cohesionless) coefficient; toe resistance follows GEC-12 (9c_u, Meyerhof 1976 SPT) or GEC-10 (9c_u, 57.5N60 kPa).",
      assumptions: [
        "Single, vertical, axially loaded pile; layers horizontal; hydrostatic pore pressure.",
        "The last layer extends below the pile toe.",
      ],
      limitations: [
        "Group effects, negative skin friction, set-up/relaxation, and settlement-based capacity are not included.",
        "Nordlund's method (GEC-12 preferred for tapered/displacement piles in sand) is approximated by β = K tanδ.",
      ],
      equations: [
        "R<sub>u</sub> = Σ f<sub>s</sub> P Δz + q<sub>t</sub> A<sub>t</sub>",
        "α = 0.5ψ<sup>−0.5</sup> (ψ ≤ 1), 0.5ψ<sup>−0.25</sup> (ψ &gt; 1), ψ = c<sub>u</sub>/σ′<sub>v</sub> (driven)",
        "β = (1 − sinφ′)(K<sub>s</sub>/K<sub>0</sub>)tan δ (driven)",
        "β = (1 − sinφ′)(σ′<sub>p</sub>/σ′<sub>v</sub>)<sup>sinφ′</sup>tanφ′ ≤ K<sub>p</sub>tanφ′ (GEC-10)",
        "q<sub>t</sub> = 40N̄<sub>60</sub>(D<sub>b</sub>/D) ≤ 400N̄<sub>60</sub> kPa (GEC-12, sand)",
        "q<sub>p</sub> = 57.5N<sub>60</sub> ≤ 2870 kPa (GEC-10, sand); q<sub>p</sub> = 9c<sub>u</sub> (clay)",
      ],
      references: [
        "Hannigan, P.J., Rausche, F., Likins, G.E., Robinson, B.R. and Becker, M.L. (2016). Design and Construction of Driven Pile Foundations, Vol. I. FHWA-NHI-16-009 (GEC-12).",
        "Brown, D.A., Turner, J.P., Castelli, R.J. and Loehr, E.J. (2018). Drilled Shafts: Construction Procedures and Design Methods. FHWA-NHI-18-024 (GEC-10).",
        "API RP 2GEO (2011). Geotechnical and Foundation Design Considerations. American Petroleum Institute.",
        "Kulhawy, F.H. (1991). Drilled shaft foundations. Foundation Engineering Handbook, 2nd ed., Van Nostrand Reinhold.",
        "Meyerhof, G.G. (1976). Bearing capacity and settlement of pile foundations. Journal of the Geotechnical Engineering Division, ASCE, 102(GT3), 197-228.",
        "Mayne, P.W. (2007). Cone Penetration Testing — A Synthesis of Highway Practice. NCHRP Synthesis 368.",
      ],
    }),
  },
  {
    slug: "slope-stability-bishop",
    status: "draft",
    title: "Slope Stability — Bishop Circular Search & Infinite Slope",
    category: "Slope Stability",
    shortDescription:
      "Critical-circle search with Bishop's simplified method for a simple slope (two strata, phreatic surface or r_u, surcharge, k_h), plus infinite-slope check.",
    tags: ["slope stability", "Bishop", "limit equilibrium"],
    keywords: ["factor of safety", "slip circle", "pseudo-static", "infinite slope", "şev"],
    featured: true,
    inputs: [
      select("analysisMode", "Analysis", "bishop", [
        { label: "Simplified Bishop — critical circle search", value: "bishop" },
        { label: "Infinite slope", value: "infinite" },
      ]),
      num("height", "Slope height, H", 10, "m", { min: 1 }),
      num("slopeAngle", "Slope angle, β", 26.57, "deg", { min: 1, max: 80, step: 0.01 }),
      select("stratification", "Strata", "one", [
        { label: "Homogeneous", value: "one" },
        { label: "Two horizontal strata", value: "two" },
      ]),
      num("gamma1", "Upper stratum γ", 20, "kN/m3", { min: 10, max: 25 }),
      num("c1", "Upper stratum c′ (or c_u with φ = 0)", 3, "kPa", { min: 0 }),
      num("phi1", "Upper stratum φ′", 19.6, "deg", { min: 0, max: 50 }),
      num("interfaceElevation", "Interface elevation above toe level", 0, "m"),
      num("gamma2", "Lower stratum γ", 19, "kN/m3", { min: 10, max: 25 }),
      num("c2", "Lower stratum c′", 10, "kPa", { min: 0 }),
      num("phi2", "Lower stratum φ′", 25, "deg", { min: 0, max: 50 }),
      select("waterMode", "Pore water pressure", "none", [
        { label: "Dry", value: "none" },
        { label: "Horizontal phreatic surface", value: "phreatic" },
        { label: "Pore pressure ratio r_u", value: "ru" },
      ]),
      num("phreaticElevation", "Phreatic surface elevation above toe level", 0, "m"),
      num("ru", "Pore pressure ratio, r_u", 0, undefined, { min: 0, max: 0.8, step: 0.01 }),
      num("surcharge", "Crest surcharge, q", 0, "kPa", { min: 0 }),
      num("kh", "Horizontal seismic coefficient, k_h", 0, undefined, { min: 0, max: 0.5, step: 0.01 }),
      num("maxDepthBelowToe", "Search depth below toe", 10, "m", { min: 0 }),
      num("slipDepth", "Infinite slope: slip depth, z", 2, "m", { min: 0.1 }),
      num("seepageRatio", "Infinite slope: seepage ratio m = h_w/z", 0, undefined, { min: 0, max: 1, step: 0.05 }),
      num("targetFs", "Target FS", 1.5, undefined, { min: 1, step: 0.05 }),
    ],
    information: info({
      methodology:
        "A 25 × 19 centre grid with 15 tangent depths is evaluated with Bishop's simplified method (40 slices), followed by local refinement around the minimum. Circles with m_α < 0.2 are rejected (Whitman & Bailey 1967).",
      assumptions: [
        "Plane strain; circular slip surfaces; horizontal strata; crest and toe horizontal.",
        "Hydrostatic pore pressure below a horizontal phreatic surface, or u = r_u γh.",
      ],
      limitations: [
        "Non-circular (wedge/translational) mechanisms along weak seams require dedicated software.",
        "Pseudo-static k_h does not give deformations; use Newmark-type analyses where displacements matter.",
      ],
      equations: [
        "FS = Σ{[c′b + (W − ub)tanφ′]/m<sub>α</sub>} / Σ[W sinα + k<sub>h</sub>W(y<sub>c</sub> − y<sub>g</sub>)/R]",
        "m<sub>α</sub> = cosα + sinα tanφ′/FS",
        "FS<sub>∞</sub> = [c′ + (γz cos²β − k<sub>h</sub>γz sinβcosβ − mγ<sub>w</sub>z cos²β)tanφ′] / [γz(sinβcosβ + k<sub>h</sub>cos²β)]",
      ],
      references: [
        "Bishop, A.W. (1955). The use of the slip circle in the stability analysis of slopes. Géotechnique, 5(1), 7-17.",
        "Duncan, J.M., Wright, S.G. and Brandon, T.L. (2014). Soil Strength and Slope Stability, 2nd ed. Wiley.",
        "Whitman, R.V. and Bailey, W.A. (1967). Use of computers for slope stability analysis. Journal of the SMF Division, ASCE, 93(SM4), 475-498.",
        "Donald, I.B. and Giam, P. (1989). Soil Slope Stability Programs Review. ACADS Publication U255 (benchmark slopes).",
        "FHWA (2005). Soil Slope and Embankment Design Reference Manual. FHWA-NHI-05-123.",
      ],
    }),
  },
  {
    slug: "deep-mixing-columns-fhwa",
    status: "draft",
    title: "Deep Mixing Columns — Embankment Support (FHWA)",
    category: "Ground Improvement",
    shortDescription:
      "Area replacement ratio, design column strength with field/lab and variability reductions, composite strength and modulus, stress sharing, and treated-zone settlement.",
    tags: ["deep mixing", "DMM", "FHWA", "ground improvement"],
    keywords: ["soil mixing", "cement columns", "area replacement ratio", "composite strength", "derin karıştırma"],
    featured: true,
    inputs: [
      num("diameter", "Column diameter", 0.8, "m", { min: 0.3, step: 0.05 }),
      num("spacing", "Column spacing (c/c)", 1.6, "m", { min: 0.3, step: 0.05 }),
      select("pattern", "Layout", "square", patternOptions),
      num("quLab", "Laboratory unconfined strength, q_u,lab", 1000, "kPa", { min: 50 }),
      num("fieldLabRatio", "Field/lab strength ratio", 0.5, undefined, { min: 0.2, max: 1, step: 0.05 }),
      num("strengthCov", "Coefficient of variation of field strength", 0.35, undefined, { min: 0, max: 0.8, step: 0.05 }),
      num("kv", "Variability multiplier, k_v", 1, undefined, { min: 0, max: 2, step: 0.1 }),
      num("modulusRatio", "E_col / q_u,field", 150, undefined, { min: 30, max: 1000, step: 10 }),
      num("soilCu", "Soft soil c_u", 15, "kPa", { min: 1 }),
      num("soilModulus", "Soft soil constrained modulus, M", 1500, "kPa", { min: 100 }),
      num("appliedStress", "Applied stress (embankment), q", 100, "kPa", { min: 1 }),
      num("treatedThickness", "Treated thickness, H", 8, "m", { min: 0.5 }),
      num("axialFs", "Factor of safety on column axial stress", 1.5, undefined, { min: 1 }),
      num("requiredCompositeStrength", "Required composite strength (0 = skip)", 0, "kPa", { min: 0 }),
    ],
    information: info({
      methodology:
        "Unit-cell (equal-strain) analysis per FHWA-HRT-13-046: column design strength is reduced for field/lab differences and variability; composite strength and modulus are area-weighted, and stresses are shared in proportion to modulus.",
      assumptions: ["Rigid load transfer platform or sufficiently thick embankment for equal strain.", "Columns fully penetrate the treated thickness."],
      limitations: [
        "Composite shear strength is valid for panels/blocks or interior columns; isolated columns near embankment edges need bending/rotation checks.",
        "Global stability and settlement below the treated zone must be analysed separately.",
      ],
      equations: [
        "a<sub>s</sub> = A<sub>col</sub>/A<sub>trib</sub>",
        "q<sub>u,design</sub> = λ<sub>f</sub>q<sub>u,lab</sub>(1 − k<sub>v</sub>V)",
        "s<sub>comp</sub> = a<sub>s</sub>(0.5q<sub>u,design</sub>) + (1 − a<sub>s</sub>)s<sub>soil</sub>",
        "E<sub>comp</sub> = a<sub>s</sub>E<sub>col</sub> + (1 − a<sub>s</sub>)E<sub>soil</sub>",
        "S = qH/E<sub>comp</sub>",
      ],
      references: [
        "Bruce, M.E.C., Berg, R.R., Collin, J.G., Filz, G.M., Terashi, M. and Yang, D.S. (2013). Federal Highway Administration Design Manual: Deep Mixing for Embankment and Foundation Support. FHWA-HRT-13-046.",
        "Filz, G.M. and Navin, M.P. (2006). Stability of column-supported embankments. VTRC 06-CR13, Virginia Transportation Research Council.",
        "EuroSoilStab (2002). Development of Design and Construction Methods to Stabilise Soft Organic Soils. Design Guide Soft Soil Stabilisation, CT97-0351.",
      ],
    }),
  },
  {
    slug: "stone-columns-fhwa",
    status: "draft",
    title: "Stone Columns — Settlement Improvement (FHWA / Priebe)",
    category: "Ground Improvement",
    shortDescription:
      "Area replacement ratio, Barksdale & Bachus stress concentration, Priebe n_0, improved settlement, and single-column bulging capacity.",
    tags: ["stone columns", "vibro replacement", "FHWA", "Priebe"],
    keywords: ["aggregate piers", "improvement factor", "stress concentration", "taş kolon"],
    featured: false,
    inputs: [
      num("diameter", "Column diameter", 0.8, "m", { min: 0.4, step: 0.05 }),
      num("spacing", "Column spacing (c/c)", 2, "m", { min: 0.8, step: 0.05 }),
      select("pattern", "Layout", "triangular", patternOptions),
      num("columnPhi", "Column friction angle, φ_c", 40, "deg", { min: 30, max: 50 }),
      num("stressConcentration", "Stress concentration ratio, n", 3, undefined, { min: 1, max: 10 }),
      num("soilCu", "Soft soil c_u", 25, "kPa", { min: 1 }),
      num("soilMv", "Soft soil m_v", 0.3, "m2/MN", { min: 0.001, step: 0.01 }),
      num("layerThickness", "Treated thickness", 8, "m", { min: 0.5 }),
      num("appliedStress", "Applied stress, q", 80, "kPa", { min: 1 }),
      num("sigmaR0", "Initial lateral effective stress σ′_r0 at bulging depth", 20, "kPa", { min: 0 }),
      num("bearingFs", "Required column FS", 2, undefined, { min: 1 }),
    ],
    information: info({
      methodology: "Equilibrium (unit-cell) method of Barksdale & Bachus (1983) and Priebe's (1995) basic improvement factor; bulging capacity after Hughes & Withers (1974).",
      assumptions: ["End-bearing or fully penetrating columns.", "Uniform load over a large area (unit-cell conditions)."],
      limitations: ["Priebe depth/compressibility corrections (n_1, n_2) and group settlement of footings are not included."],
      equations: [
        "μ<sub>s</sub> = 1/[1 + (n − 1)a<sub>s</sub>]",
        "n<sub>0</sub> = 1 + a<sub>s</sub>[(5 − a<sub>s</sub>)/(4K<sub>ac</sub>(1 − a<sub>s</sub>)) − 1]",
        "q<sub>ult</sub> = K<sub>pc</sub>(σ′<sub>r0</sub> + 4c<sub>u</sub>)",
      ],
      references: [
        "Barksdale, R.D. and Bachus, R.C. (1983). Design and Construction of Stone Columns, Vol. I. FHWA/RD-83/026.",
        "Priebe, H.J. (1995). The design of vibro replacement. Ground Engineering, 28(10), 31-37.",
        "Hughes, J.M.O. and Withers, N.J. (1974). Reinforcing of soft cohesive soils with stone columns. Ground Engineering, 7(3), 42-49.",
        "Schaefer, V.R., Berg, R.R., Collin, J.G., Christopher, B.R., DiMaggio, J.A., Filz, G.M., Bruce, D.A. and Ayala, D. (2017). Ground Modification Methods Reference Manual. FHWA-NHI-16-027 (GEC-13).",
      ],
    }),
  },
  {
    slug: "prefabricated-vertical-drains",
    status: "draft",
    title: "Prefabricated Vertical Drains (PVD) — Consolidation Time",
    category: "Ground Improvement",
    shortDescription: "Hansbo radial consolidation with smear and well resistance combined with Terzaghi vertical drainage (Carrillo).",
    tags: ["PVD", "wick drains", "consolidation", "FHWA"],
    keywords: ["Hansbo", "Barron", "smear", "radial consolidation", "drain spacing"],
    featured: false,
    inputs: [
      num("spacing", "Drain spacing", 1.5, "m", { min: 0.5, step: 0.05 }),
      select("pattern", "Layout", "triangular", patternOptions),
      num("drainWidth", "Drain width, a", 100, "mm", { min: 50, step: 1 }),
      num("drainThickness", "Drain thickness, b", 4, "mm", { min: 2, step: 0.5 }),
      num("smearRatio", "Smear ratio, d_s/d_w", 2, undefined, { min: 1, max: 6 }),
      num("permeabilityRatio", "Permeability ratio, k_h/k_s", 2, undefined, { min: 1, max: 10 }),
      num("ch", "Horizontal coefficient of consolidation, c_h", 3, "m2/year", { min: 0.01 }),
      num("cv", "Vertical coefficient of consolidation, c_v", 1.5, "m2/year", { min: 0 }),
      num("drainagePath", "Vertical drainage path, H_dr", 5, "m", { min: 0.5 }),
      num("time", "Time after loading, t", 0.5, "years", { min: 0.001, step: 0.05 }),
      num("targetU", "Target average degree of consolidation", 90, "%", { min: 10, max: 99 }),
      num("wellResistance", "Well resistance term F_r (0 = ignore)", 0, undefined, { min: 0 }),
    ],
    information: info({
      methodology: "Equivalent drain diameter after Rixner et al. (1986); Hansbo (1981) F-factor; U_h = 1 − exp(−8T_h/F); combined with U_v (Carrillo 1942).",
      assumptions: ["Instantaneous loading; equal-strain radial consolidation; constant c_h and c_v."],
      limitations: ["Staged construction and secondary compression are not modelled."],
      equations: [
        "d<sub>w</sub> = (a + b)/2; d<sub>e</sub> = 1.05s (triangular), 1.128s (square)",
        "F = ln(n/s) + (k<sub>h</sub>/k<sub>s</sub>)ln s − 0.75 + F<sub>r</sub>",
        "U<sub>h</sub> = 1 − exp(−8T<sub>h</sub>/F), T<sub>h</sub> = c<sub>h</sub>t/d<sub>e</sub><sup>2</sup>",
        "U = 1 − (1 − U<sub>h</sub>)(1 − U<sub>v</sub>)",
      ],
      references: [
        "Hansbo, S. (1981). Consolidation of fine-grained soils by prefabricated drains. Proc. 10th ICSMFE, Stockholm, 3, 677-682.",
        "Rixner, J.J., Kraemer, S.R. and Smith, A.D. (1986). Prefabricated Vertical Drains, Vol. I. FHWA/RD-86/168.",
        "Carrillo, N. (1942). Simple two- and three-dimensional cases in the theory of consolidation of soils. Journal of Mathematics and Physics, 21, 1-5.",
        "Schaefer, V.R. et al. (2017). Ground Modification Methods Reference Manual. FHWA-NHI-16-027 (GEC-13).",
      ],
    }),
  },
  {
    slug: "dynamic-compaction-fhwa",
    status: "draft",
    title: "Dynamic Compaction — Preliminary Design (FHWA)",
    category: "Ground Improvement",
    shortDescription: "Depth of improvement, applied energy, drops per print, and vibration estimate after Lukas (1995).",
    tags: ["dynamic compaction", "FHWA", "ground improvement"],
    keywords: ["heavy tamping", "Lukas", "depth of improvement", "PPV"],
    featured: false,
    inputs: [
      select("soil", "Soil group", "pervious", [
        { label: "Pervious coarse-grained (n = 0.5)", value: "pervious" },
        { label: "Semi-pervious silts, PI < 8 (n = 0.4)", value: "semi-pervious" },
        { label: "Municipal landfill (n = 0.35)", value: "landfill" },
      ]),
      num("tampMass", "Tamper mass, W", 15, "t", { min: 5, max: 40 }),
      num("dropHeight", "Drop height, H", 20, "m", { min: 5, max: 40 }),
      num("gridSpacing", "Print grid spacing", 5, "m", { min: 2, max: 15 }),
      num("nOverride", "Empirical n override (0 = use table)", 0, undefined, { min: 0, max: 1, step: 0.05 }),
      num("distance", "Distance to nearest structure", 30, "m", { min: 1 }),
    ],
    information: info({
      methodology: "Lukas (1995) depth-of-improvement relation and recommended unit energies by soil group; Mayne et al. (1984) upper-trend PPV.",
      assumptions: ["Groundwater at least 2 m below working surface.", "Energy applied in multiple passes."],
      limitations: ["Saturated clays (PI > 8) are not suitable for dynamic compaction."],
      equations: ["D = n(WH)<sup>0.5</sup>", "PPV ≈ 70[(WH)<sup>0.5</sup>/d]<sup>1.4</sup> mm/s"],
      references: [
        "Lukas, R.G. (1995). Geotechnical Engineering Circular No. 1 — Dynamic Compaction. FHWA-SA-95-037.",
        "Mayne, P.W., Jones, J.S. and Dumas, J.C. (1984). Ground response to dynamic compaction. Journal of Geotechnical Engineering, ASCE, 110(6), 757-774.",
        "Schaefer, V.R. et al. (2017). Ground Modification Methods Reference Manual. FHWA-NHI-16-027 (GEC-13).",
      ],
    }),
  },
  {
    slug: "soil-nail-wall-gec7",
    status: "draft",
    title: "Soil Nail Wall — Preliminary Design (FHWA GEC-7)",
    category: "Earth Pressure & Retaining Structures",
    shortDescription:
      "Nail layout, pullout and tensile resistance, simplified service nail force, and a planar-wedge global stability search with nail contribution.",
    tags: ["soil nailing", "GEC-7", "FHWA", "retaining"],
    keywords: ["nail pullout", "bond strength", "excavation support", "zemin çivisi"],
    featured: true,
    inputs: [
      num("height", "Wall height, H", 8, "m", { min: 1 }),
      num("faceBatter", "Face batter from vertical", 0, "deg", { min: 0, max: 30 }),
      num("backslope", "Backslope angle", 0, "deg", { min: 0, max: 40 }),
      num("unitWeight", "Soil unit weight, γ", 19, "kN/m3", { min: 14, max: 23 }),
      num("cohesion", "Effective cohesion, c′", 5, "kPa", { min: 0 }),
      num("phi", "Effective friction angle, φ′", 32, "deg", { min: 20, max: 45 }),
      num("surcharge", "Surcharge behind wall", 10, "kPa", { min: 0 }),
      num("nailLength", "Nail length, L", 7, "m", { min: 1 }),
      num("nailInclination", "Nail inclination below horizontal", 15, "deg", { min: 0, max: 30 }),
      num("sh", "Horizontal spacing, S_h", 1.5, "m", { min: 0.5, max: 3, step: 0.05 }),
      num("sv", "Vertical spacing, S_v", 1.5, "m", { min: 0.5, max: 3, step: 0.05 }),
      num("firstRowDepth", "Depth of first row", 0.75, "m", { min: 0.2, step: 0.05 }),
      num("drillholeDiameter", "Drillhole diameter, D_DH", 0.15, "m", { min: 0.05, step: 0.01 }),
      num("bondStrength", "Ultimate bond strength, q_u", 100, "kPa", { min: 10 }),
      num("barDiameter", "Bar diameter", 25, "mm", { min: 16, max: 50, step: 1 }),
      num("yieldStrength", "Bar yield strength, f_y", 420, "MPa", { min: 250, max: 1000, step: 10 }),
      num("lambda", "Normalised max nail force, λ", 0.75, undefined, { min: 0.4, max: 1.2, step: 0.05 }),
      num("kh", "Horizontal seismic coefficient, k_h", 0, undefined, { min: 0, max: 0.4, step: 0.01 }),
      num("fsPullout", "Required FS — pullout", 2, undefined, { min: 1, step: 0.1 }),
      num("fsTensile", "Required FS — tensile", 1.8, undefined, { min: 1, step: 0.1 }),
    ],
    information: info({
      methodology:
        "Nails are laid out from the first-row depth at S_v; the critical planar wedge through the toe is searched in 0.25° steps with nail forces limited by pullout beyond the wedge and by tensile capacity (ASD factors). Service nail force follows the simplified GEC-7 envelope λK_aγHS_hS_v.",
      assumptions: ["Drained soil, no groundwater behind the wall.", "Homogeneous soil; uniform nail length and spacing."],
      limitations: [
        "Planar wedge only — confirm global and compound stability with limit-equilibrium software (GEC-7 Chapter 5).",
        "Facing design, drainage, and corrosion protection are not included.",
      ],
      equations: [
        "R<sub>P</sub> = πD<sub>DH</sub>q<sub>u</sub>L<sub>p</sub>",
        "R<sub>T</sub> = f<sub>y</sub>A<sub>t</sub>",
        "T<sub>max-s</sub> = λK<sub>a</sub>γHS<sub>h</sub>S<sub>v</sub>",
        "FS<sub>G</sub> = [c′L<sub>f</sub> + (W cosθ − k<sub>h</sub>W sinθ + ΣT sin(θ + i))tanφ′ + ΣT cos(θ + i)] / (W sinθ + k<sub>h</sub>W cosθ)",
      ],
      references: [
        "Lazarte, C.A., Robinson, H., Gómez, J.E., Baxter, A., Cadden, A. and Berg, R. (2015). Soil Nail Walls Reference Manual. FHWA-NHI-14-007 (GEC-7).",
        "Byrne, R.J., Cotton, D., Porterfield, J., Wolschlag, C. and Ueblacker, G. (1998). Manual for Design and Construction Monitoring of Soil Nail Walls. FHWA-SA-96-069R.",
      ],
    }),
  },
];
