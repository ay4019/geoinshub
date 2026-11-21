/**
 * Builds the standard-report payload for the pile tool (slug "pile-axial-capacity-fhwa"): inputs, layer table,
 * figures and a step-by-step "Calculation Steps" narrative with the code-specific formulae and the project's
 * numbers. Values are reported in SI.
 */
import { round } from "@/lib/design-tools/common";
import {
  AASHTO_PHI,
  CODE_LABEL,
  DEFAULT_CRITICAL_FACTOR,
  DEFAULT_DELTA,
  DEFAULT_K,
  EC7_R_FACTORS,
  MATERIAL_DELTA,
  MATERIAL_LABEL,
  NQ_METHOD_LABEL,
  PILE_TYPE_LABEL,
  analysePile,
  capacityCurve,
  type PileAnalysis,
} from "@/lib/design-tools/pile-design";
import { deriveStrata, type DerivedStrata, type PileDesignModel } from "@/lib/design-tools/pile-strata";
import type { StandardReportPayload, StandardReportStep } from "@/lib/reports/standard-report-types";

const f = (v: number, d = 1) => (Number.isFinite(v) ? round(v, d).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—");
const kN = (v: number) => `${f(v, 0)} kN`;
const kPa = (v: number, d = 1) => `${f(v, d)} kPa`;
const m = (v: number, d = 2) => `${f(v, d)} m`;

const PILE_TYPE_TEXT = {
  driven:
    "A driven pile is a prefabricated displacement pile installed by hammering or vibrating. Installation displaces and densifies the surrounding soil, so the horizontal stress on the shaft and the base resistance are higher than for replacement piles.",
  bored:
    "A bored pile (fore kazık) is a replacement pile: the soil is excavated, the bore stays open for a while and is then filled with reinforcement and concrete. Stress relief around the open bore lowers the horizontal stress on the shaft, so a smaller K and δ/φ′ are used and EN 1997-1 applies larger partial factors to the base.",
  cfa: "A continuous flight auger (CFA) pile is formed by screwing a hollow auger into the ground and pumping concrete through its stem as it is withdrawn. The bore is never left open, so stress relief is smaller than for a bored pile and its parameters lie between those of bored and driven piles.",
} as const;

export function buildPileReportPayload(model: PileDesignModel): StandardReportPayload | null {
  const strata = deriveStrata(model);
  const { analysis } = analysePile(model, strata);
  if (!analysis) return null;
  const a = analysis;

  const rows = a.layers
    .filter((l) => l.length > 0)
    .map((l) => {
      const d = strata.layers[l.index];
      return {
        layer: `${l.index + 1}`,
        soil: d.meta.label,
        range: `${f(l.top, 2)} – ${f(l.bottom, 2)}`,
        sigma: f(l.meanSigmaV, 1),
        coef: `${l.behaviour === "cohesive" ? "α" : "β"} = ${f(l.meanCoefficient, 3)}`,
        fs: f(l.unitSide, 1),
        rs: f(l.resistance, 0),
      };
    });

  // Figures: f_s along the pile and R_u versus toe depth.
  const stride = Math.max(1, Math.round(a.profile.length / 80));
  const fsPoints = a.profile
    .filter((_, i) => i % stride === 0)
    .map((p) => ({ boreholeId: "Pile", depth: round(p.z, 2), values: { fs: round(p.unitSide, 2), ru: null } }));
  const maxToe = Math.max(strata.totalThickness, a.toe + 3);
  const ruPoints = capacityCurve(model, strata, maxToe, 40).map((p) => ({
    boreholeId: "Pile",
    depth: round(p.toe, 2),
    values: { fs: null, ru: round(p.ultimate, 1) },
  }));

  const inputs = [
    { label: "Design code", value: CODE_LABEL[model.code] },
    { label: "Pile type", value: PILE_TYPE_LABEL[model.pileType] },
    { label: "Pile material", value: model.pileType === "driven" ? MATERIAL_LABEL[model.material] : "Cast-in-place concrete" },
    { label: "Diameter D", value: m(model.diameter) },
    { label: "Embedded length L", value: m(model.length) },
    { label: "Pile head depth D_f", value: m(model.headDepth) },
    { label: "Toe depth", value: m(a.toe) },
    { label: "Groundwater depth", value: m(model.groundwaterDepth) },
    { label: "Pile unit weight", value: `${f(model.pileUnitWeight, 1)} kN/m³` },
    {
      label: "Critical depth",
      value: a.criticalDepth !== null ? `z_c = D_f + ${f(a.params.criticalFactor, 0)}D = ${m(a.criticalDepth)}` : "Not applied",
    },
    ...(model.code !== "aashto" ? [{ label: "N_q method", value: NQ_METHOD_LABEL[model.nqMethod] }] : []),
    ...(model.code === "ec7" ? [{ label: "Design approach / γ_Rd", value: `${model.ec7Approach} / ${f(model.ec7ModelFactor, 2)}` }] : []),
  ];

  const keyResults = [
    { label: "Shaft resistance Rₛ", value: kN(a.shaft) },
    { label: "Base resistance R_b", value: kN(a.base.resistance) },
    { label: "Ultimate resistance Rᵤ", value: kN(a.ultimate) },
    { label: "Net pile weight W′", value: `${kN(a.weight)}${model.deductWeight ? " (deducted)" : " (not deducted)"}` },
    ...designKeyResults(a),
  ];

  return {
    depthUnit: "m",
    columns: [
      { header: "Layer", key: "layer" },
      { header: "Soil", key: "soil" },
      { header: "Depth along pile (m)", key: "range" },
      { header: "σ′ᵥ,avg (kPa)", key: "sigma" },
      { header: "Coefficient", key: "coef" },
      { header: "fₛ,avg (kPa)", key: "fs" },
      { header: "Rₛ (kN)", key: "rs" },
    ],
    rows,
    points: [...fsPoints, ...ruPoints],
    series: [
      { key: "fs", label: "fₛ", unit: "kPa" },
      { key: "ru", label: "Rᵤ", unit: "kN" },
    ],
    inputs,
    keyResults,
    steps: buildSteps(model, strata, a),
    dataSentence: `The assessment is for a single ${PILE_TYPE_LABEL[model.pileType].toLowerCase()} of diameter ${m(model.diameter)} and embedded length ${m(model.length)} in the ${strata.layers.length}-layer ground model below, designed to ${CODE_LABEL[model.code]}.`,
    skipSeriesSummary: true,
  };
}

function designKeyResults(a: PileAnalysis) {
  const d = a.design;
  if (d.code === "ec7") {
    return [
      ...d.combos.map((c) => ({ label: `R_c,d ${c.id}`, value: kN(c.design) })),
      { label: "Design resistance R_c,d (governing)", value: `${kN(d.value)} (${d.governing.id})` },
    ];
  }
  if (d.code === "aashto") return [{ label: "Factored resistance R_R", value: kN(d.value) }];
  return [
    { label: "Allowable resistance, static", value: kN(d.staticValue) },
    { label: "Allowable resistance, seismic", value: kN(d.seismicValue) },
  ];
}

function buildSteps(model: PileDesignModel, strata: DerivedStrata, a: PileAnalysis): StandardReportStep[] {
  const steps: StandardReportStep[] = [];
  const code = model.code;
  const p = a.params;
  const gec10 = code === "aashto" && model.pileType !== "driven";
  const aashtoDriven = code === "aashto" && model.pileType === "driven";
  const along = a.layers.filter((l) => l.length > 0);
  const cohesive = along.filter((l) => l.behaviour === "cohesive");
  const granular = along.filter((l) => l.behaviour === "cohesionless");
  const lname = (i: number) => `Layer ${i + 1} (${strata.layers[i].meta.label})`;

  // 1. Pile type
  steps.push({
    title: "Pile type and installation method",
    paragraphs: [
      PILE_TYPE_TEXT[model.pileType],
      code === "aashto"
        ? model.pileType === "driven"
          ? "For AASHTO the static analysis of driven piles follows FHWA GEC-12: the α method in cohesive soil, the β method in cohesionless soil and Meyerhof's SPT method for the base."
          : `For AASHTO the ${model.pileType === "cfa" ? "CFA pile is treated as a drilled shaft (FHWA GEC-8), and the" : ""} drilled-shaft methods of FHWA GEC-10 are used: the α method in cohesive soil, an OCR-dependent β method in cohesionless soil and SPT-based base resistance.`
        : `For ${code === "ec7" ? "EC7" : "TBDY"} the pile type sets the lateral earth pressure coefficient K, the interface friction ratio δ/φ′ and the default critical depth${code === "ec7" ? ", and selects the resistance factors of EN 1997-1 Annex A" : ""}.`,
    ],
  });

  // 2. Material
  const matText =
    model.pileType === "driven"
      ? `The pile material is ${MATERIAL_LABEL[model.material].toLowerCase()} with a unit weight of ${f(model.pileUnitWeight, 1)} kN/m³.${
          aashtoDriven ? ` For GEC-12 the material sets the interface friction angle, δ = ${f(p.deltaRatio ?? MATERIAL_DELTA[model.material], 2)} φ′ (concrete 0.9, steel 0.8, timber 0.85).` : ""
        }`
      : `The pile is cast-in-place concrete with a unit weight of ${f(model.pileUnitWeight, 1)} kN/m³.`;
  steps.push({
    title: "Pile material and self-weight",
    paragraphs: [
      matText,
      "The net weight of the pile is its own weight less the weight of the soil it replaces. Groundwater cancels out because it acts on both terms.",
    ],
    equations: [{ text: "W′ = A_b · Σ (γ_pile − γᵢ) hᵢ", where: "γᵢ, hᵢ unit weight and length of each soil layer along the pile" }],
    after: [
      `W′ = ${f(a.area, 3)} m² × Σ(…) = ${kN(a.weight)}, which is ${model.deductWeight ? "deducted from" : "not deducted from"} the design resistance.`,
    ],
  });

  // 3. Ground model and stresses
  steps.push({
    title: "Ground model and vertical effective stress",
    paragraphs: [
      `The ground model has ${strata.layers.length} layers with the groundwater table at ${m(model.groundwaterDepth)} below ground. The pile head is at D_f = ${m(model.headDepth)} and the toe at ${m(a.toe)}. Below the last defined layer, that layer is assumed to continue.`,
      "Cohesive layers are analysed in total stress with the undrained shear strength cᵤ; cohesionless layers in effective stress with the friction angle φ′.",
    ],
    bullets: strata.layers.map((d) => {
      const strength =
        d.meta.behaviour === "cohesive" ? `cᵤ = ${kPa(d.cu, 0)}` : `φ′ = ${f(d.phi, 1)}°`;
      const n = Number.isFinite(d.n60) ? `, N₆₀ = ${f(d.n60, 0)}` : "";
      return `${lname(d.index)}: ${m(d.top)} – ${m(d.bottom)}, γ = ${f(d.layer.gamma, 1)} kN/m³, ${strength}${n} (${d.strengthNote}).`;
    }),
    equations: [
      { text: "σ′ᵥ(z) = Σ γᵢ hᵢ − γ_w · max(z − z_w, 0)", where: "z_w groundwater depth, γ_w = 9.81 kN/m³" },
      ...(strata.layers.some((d) => d.meta.behaviour === "cohesive" && d.layer.source === "spt")
        ? [{ text: "cᵤ = f₁ · N₆₀", where: `Stroud (1974), f₁ = ${f(model.stroudF1, 2)} kPa` }]
        : []),
      ...(strata.layers.some((d) => d.meta.behaviour === "cohesionless" && d.layer.source === "spt")
        ? [
            {
              text: "φ′ = 27.1 + 0.3 (N₁)₆₀ − 0.00054 (N₁)₆₀²,   (N₁)₆₀ = N₆₀ · min(√(pₐ/σ′ᵥ), 1.7)",
              where: "Wolff (1989) after Peck, Hanson and Thornburn (1974); σ′ᵥ at mid-layer",
            },
          ]
        : []),
    ],
  });

  // 4. Critical depth
  steps.push(
    a.criticalDepth !== null
      ? {
          title: "Critical depth",
          paragraphs: [
            "Field and model tests (Meyerhof 1976; Vesić 1977; Poulos and Davis 1980) show that unit shaft and base resistance in sand do not keep increasing in proportion to overburden stress, but level off below a critical depth of roughly 10–20 pile diameters. To reflect this, σ′ᵥ used in the β method and in the base resistance is held constant below z_c.",
            `The default factor for ${PILE_TYPE_LABEL[model.pileType].toLowerCase()}s is ${DEFAULT_CRITICAL_FACTOR[model.pileType]}D (driven 25D, CFA 20D, bored 15D)${
              model.criticalDepthFactor !== null ? `; ${f(p.criticalFactor, 0)}D was entered for this analysis` : ""
            }.`,
          ],
          equations: [{ text: "z_c = D_f + n · D,   σ′ᵥ,used(z) = σ′ᵥ(min(z, z_c))" }],
          after: [
            `z_c = ${m(model.headDepth)} + ${f(p.criticalFactor, 0)} × ${m(model.diameter)} = ${m(a.criticalDepth)}, giving σ′ᵥ,c = ${kPa(a.criticalSigmaV ?? 0)}.${
              a.criticalDepth >= a.toe ? " The pile toe is above z_c, so the limit does not affect this pile." : ""
            }`,
          ],
        }
      : {
          title: "Critical depth",
          paragraphs: [
            "The critical depth limit is switched off: σ′ᵥ increases with depth along the whole pile. This can overestimate shaft and base resistance of long piles in sand, so the result should be compared with a run that applies the limit.",
          ],
        },
  );

  // 5. Lateral earth pressure / interface friction
  if (code === "ec7" || code === "tbdy") {
    const k = DEFAULT_K[code];
    const dl = DEFAULT_DELTA[code];
    steps.push({
      title: "Lateral earth pressure coefficient and interface friction",
      paragraphs: [
        "The horizontal effective stress on the shaft is K σ′ᵥ, and the shaft–soil friction angle is δ. Both depend mainly on the installation method: displacement raises K, while excavation and an open bore reduce it.",
        `${model.kOverride !== null || model.deltaRatioOverride !== null ? "Values entered by the user override the defaults. " : ""}Used in this analysis: K = ${f(p.k ?? 0, 2)} and δ = ${f(p.deltaRatio ?? 0, 2)} φ′.`,
      ],
      table: {
        title: `Default K and δ/φ′ for ${code === "ec7" ? "EC7" : "TBDY"}`,
        columns: [
          { header: "Pile type", key: "type" },
          { header: "K", key: "k" },
          { header: "δ/φ′", key: "d" },
        ],
        rows: (["driven", "bored", "cfa"] as const).map((t) => ({ type: PILE_TYPE_LABEL[t], k: f(k[t], 2), d: f(dl[t], 2) })),
      },
    });
  } else if (aashtoDriven) {
    steps.push({
      title: "Lateral stress ratio",
      paragraphs: [
        "GEC-12 expresses the horizontal stress on a driven pile as a multiple of the at-rest coefficient K₀. The lateral stress ratio Kₛ/K₀ reflects densification during driving (about 1.0–2.0 for displacement piles).",
      ],
      equations: [{ text: "K = K₀ (Kₛ/K₀),   K₀ = 1 − sin φ′,   δ = (δ/φ′) φ′" }],
      after: [`Kₛ/K₀ = ${f(model.ksK0, 2)} and δ = ${f(p.deltaRatio ?? 0, 2)} φ′ are used.`],
    });
  } else {
    steps.push({
      title: "Lateral stress from stress history (GEC-10)",
      paragraphs: [
        "For drilled shafts GEC-10 links the horizontal stress to the stress history of the sand: K = K₀ is taken from the overconsolidation ratio, which is estimated from SPT N₆₀ through the preconsolidation stress σ′ₚ (Mayne 2007). K is limited to the passive coefficient K_p.",
      ],
      equations: [
        { text: "σ′ₚ / pₐ = 0.47 N₆₀^m   (m = 0.6 clean sand, 0.8 silty sand);   σ′ₚ / pₐ = 0.15 N₆₀ (gravel)" },
        { text: "K = (1 − sin φ′) (σ′ₚ / σ′ᵥ)^(sin φ′) ≤ K_p = tan²(45° + φ′/2)" },
      ],
    });
  }

  // 6. Shaft in cohesive soils
  if (cohesive.length) {
    const eq =
      code === "ec7"
        ? { text: "fₛ = α · cᵤ", where: `α = ${f(p.alpha ?? 0.5, 2)}${model.alphaOverride !== null ? " (entered)" : " (author's workbook default)"}` }
        : code === "tbdy" || gec10
          ? {
              text: "fₛ = α · cᵤ,   α = 0.55 for cᵤ/pₐ ≤ 1.5;   α = 0.55 − 0.1 (cᵤ/pₐ − 1.5) for 1.5 < cᵤ/pₐ ≤ 2.5",
              where: "FHWA GEC-10; pₐ = 101.3 kPa",
            }
          : {
              text: "fₛ = α · cᵤ,   α = 0.5 ψ^−0.5 (ψ ≤ 1),  0.5 ψ^−0.25 (ψ > 1),  ψ = cᵤ/σ′ᵥ,  α ≤ 1",
              where: "API RP 2GEO, as adopted in FHWA GEC-12",
            };
    steps.push({
      title: "Shaft resistance in cohesive soils (α method)",
      paragraphs: [
        "In clays the shaft resistance is taken as a fraction α of the undrained shear strength (total-stress or α method). α allows for remoulding and softening of the clay at the shaft interface.",
        ...(gec10 ? ["GEC-10 ignores the top 1.5 m of the shaft and the bottom one diameter in cohesive soil (seasonal moisture change and base-induced tension cracking)."] : []),
        ...(code === "tbdy" && model.alphaOverride !== null ? [`α = ${f(model.alphaOverride, 2)} was entered and replaces the GEC-10 rule.`] : []),
      ],
      equations: [eq],
      bullets: cohesive.map(
        (l) =>
          `${lname(l.index)}, ${m(l.top)} – ${m(l.bottom)}: α = ${f(l.meanCoefficient, 3)}, fₛ = ${kPa(l.unitSide)}, Rₛ = π × ${f(model.diameter, 2)} × ${f(l.length, 2)} × ${f(l.unitSide, 1)} = ${kN(l.resistance)}`,
      ),
    });
  }

  // 7. Shaft in cohesionless soils
  if (granular.length) {
    const eq =
      code === "ec7" || code === "tbdy"
        ? { text: "fₛ = K · tan δ · σ′ᵥ = β σ′ᵥ" }
        : aashtoDriven
          ? { text: "fₛ = β σ′ᵥ,   β = (1 − sin φ′)(Kₛ/K₀) tan δ" }
          : { text: "fₛ = β σ′ᵥ,   β = (1 − sin φ′)(σ′ₚ/σ′ᵥ)^(sin φ′) tan φ′ ≤ K_p tan φ′" };
    steps.push({
      title: "Shaft resistance in cohesionless soils (β method)",
      paragraphs: [
        "In sands and gravels the shaft resistance is frictional: the horizontal effective stress times the friction coefficient at the pile–soil interface (effective-stress or β method). σ′ᵥ is averaged along each layer, with the critical-depth limit where it applies.",
      ],
      equations: [eq],
      bullets: granular.map(
        (l) =>
          `${lname(l.index)}, ${m(l.top)} – ${m(l.bottom)}: σ′ᵥ,avg = ${kPa(l.meanSigmaV)}, β = ${f(l.meanCoefficient, 3)}, fₛ = ${kPa(l.unitSide)}, Rₛ = ${kN(l.resistance)}`,
      ),
    });
  }
  steps.push({
    title: "Total shaft resistance",
    paragraphs: ["The shaft resistance is the sum over all layers along the pile, from the pile head to the toe."],
    equations: [{ text: "Rₛ = Σ fₛ,ᵢ · π D · Δzᵢ" }],
    after: [`Rₛ = ${kN(a.shaft)}.`],
  });

  // 8. Base resistance
  const b = a.base;
  const tl = strata.layers[b.layerIndex];
  const baseParas: string[] = [
    `The toe is in ${lname(b.layerIndex)}, with an embedment of ${m(b.embedment)} into this layer.`,
  ];
  const baseEq: Array<{ text: string; where?: string }> = [];
  if (b.behaviour === "cohesive") {
    baseParas.push(
      code === "aashto" && model.pileType !== "driven"
        ? "In clay the base resistance is the undrained bearing capacity of a deep foundation. GEC-10 reduces N_c for shallow embedment in the bearing layer and limits q_b to 3830 kPa."
        : "In clay the base resistance is the undrained bearing capacity of a deep foundation, N_c cᵤ. N_c = 9 applies once the pile is embedded at least 3D in the bearing layer; 6 is used for shallower embedment (author's workbook).",
    );
    baseEq.push({ text: b.formula });
  } else if (code === "aashto") {
    baseParas.push(
      model.pileType === "driven"
        ? "For driven piles in sand GEC-12 uses Meyerhof's (1976) SPT method, which increases with embedment in the bearing stratum up to a limit."
        : "For drilled shafts in sand GEC-10 relates the base resistance directly to N₆₀, for a base displacement of about 5% of the diameter, with an upper limit of 2870 kPa.",
    );
    baseEq.push({ text: b.formula });
  } else {
    baseParas.push(
      `In sand the base resistance is N_q σ′ᵥ at the toe. N_q is taken from ${NQ_METHOD_LABEL[model.nqMethod]}${
        model.nqMethod === "navfac" || model.nqMethod === "cgs" ? ` (${model.pileType === "driven" ? "driven" : "bored"}-pile values)` : ""
      } for φ′ = ${f(tl.phi, 1)}°, interpolated linearly between tabulated values.`,
    );
    baseEq.push({ text: "q_b = N_q · σ′ᵥ,b", where: "σ′ᵥ,b at the toe, limited at the critical depth where applied" });
  }
  baseEq.push({ text: "R_b = q_b · A_b" });
  steps.push({
    title: "Base resistance",
    paragraphs: baseParas,
    equations: baseEq,
    after: [
      `${b.factorSymbol} = ${f(b.factorValue, 2)}, σ′ᵥ,b = ${kPa(b.sigmaVUsed)}, q_b = ${kPa(b.unitResistance, 0)}${b.limited ? " (limit applied)" : ""}, A_b = ${f(a.area, 3)} m², R_b = ${kN(b.resistance)}.`,
      ...(b.note ? [b.note] : []),
    ],
  });

  // 9. Ultimate
  steps.push({
    title: "Ultimate (calculated) resistance",
    paragraphs: ["The calculated resistance is the sum of the shaft and base contributions."],
    equations: [{ text: "Rᵤ = Rₛ + R_b" }],
    after: [
      `Rᵤ = ${kN(a.shaft)} + ${kN(a.base.resistance)} = ${kN(a.ultimate)}; the shaft carries ${f((a.shaft / Math.max(a.ultimate, 1e-9)) * 100, 0)}%.`,
    ],
  });

  // 10. Design resistance
  const d = a.design;
  const w = model.deductWeight ? " − W′" : "";
  if (d.code === "ec7") {
    const r = EC7_R_FACTORS[model.pileType];
    steps.push({
      title: "Design resistance to Eurocode 7",
      paragraphs: [
        "EN 1997-1 (7.6.2.3) derives the characteristic resistance from ground test results by dividing the calculated resistance by a model factor γ_Rd, and the design resistance by applying the partial resistance factors of Annex A to the shaft and base separately. For pile resistances the material factor set is M1 (γ = 1.0) in all combinations used here; M2 applies only to unfavourable actions such as downdrag.",
        `Design Approach ${model.ec7Approach} is selected${model.ec7Approach === "DA1" ? "; the smaller of Combinations 1 and 2 governs" : ""}. γ_Rd = ${f(model.ec7ModelFactor, 2)} (the value is set by the National Annex; 1.4 is typical without static load tests).`,
      ],
      equations: [{ text: `R_c,d = Rₛ / (γ_s γ_Rd) + R_b / (γ_b γ_Rd)${w}` }],
      table: {
        title: `Partial factors for ${PILE_TYPE_LABEL[model.pileType].toLowerCase()}s (Annex A) and design resistance`,
        columns: [
          { header: "Combination", key: "c" },
          { header: "Sets", key: "s" },
          { header: "γ_s", key: "gs" },
          { header: "γ_b", key: "gb" },
          { header: "R_c,d (kN)", key: "rd" },
        ],
        rows: d.combos.map((c) => ({ c: c.label, s: c.sets, gs: f(c.gammaS, 2), gb: f(c.gammaB, 2), rd: f(c.design, 0) })),
      },
      after: [
        `R_c,d = ${kN(d.value)} (${d.governing.id}). Resistance factors for this pile type: base R1/R2/R4 = ${f(r.base.R1, 2)}/${f(r.base.R2, 2)}/${f(r.base.R4, 2)}, shaft ${f(r.shaft.R1, 2)}/${f(r.shaft.R2, 2)}/${f(r.shaft.R4, 2)}. The design action F_c,d must not exceed R_c,d.`,
      ],
    });
  } else if (d.code === "aashto") {
    const t = model.pileType === "driven" ? AASHTO_PHI.driven : AASHTO_PHI.drilled;
    steps.push({
      title: "Factored resistance to AASHTO LRFD",
      paragraphs: [
        `AASHTO LRFD multiplies each nominal resistance by a resistance factor φ that depends on the method and soil type (${model.pileType === "driven" ? "Table 10.5.5.2.3-1, driven piles" : "Table 10.5.5.2.4-1, drilled shafts"}).`,
      ],
      equations: [{ text: `R_R = Σ φ_s,ᵢ Rₛ,ᵢ + φ_b R_b${w}` }],
      table: {
        title: "Resistance factors φ",
        columns: [
          { header: "Component", key: "c" },
          { header: "φ", key: "p" },
        ],
        rows: [
          { c: "Shaft, cohesive (α method)", p: f(t.sideCohesive, 2) },
          { c: "Shaft, cohesionless (β method)", p: f(t.sideGranular, 2) },
          { c: "Base, cohesive", p: f(t.tipCohesive, 2) },
          { c: model.pileType === "driven" ? "Base, cohesionless (SPT method)" : "Base, cohesionless", p: f(t.tipGranular, 2) },
        ],
      },
      after: [`Σφ Rₛ = ${kN(d.sideFactored)}, φ_b R_b = ${kN(d.tipFactored)}, R_R = ${kN(d.value)}. The factored load must not exceed R_R.`],
    });
  } else {
    steps.push({
      title: "Allowable resistance to TBDY 2018",
      paragraphs: [
        "The allowable compression resistance is found by applying separate safety factors to the shaft and base resistance, with lower factors for the seismic load case.",
      ],
      equations: [
        { text: `R_a,static = Rₛ / ${f(d.factors.fsShaftStatic, 1)} + R_b / ${f(d.factors.fsBaseStatic, 1)}${w}` },
        { text: `R_a,seismic = Rₛ / ${f(d.factors.fsShaftSeismic, 1)} + R_b / ${f(d.factors.fsBaseSeismic, 1)}${w}` },
      ],
      after: [
        `R_a,static = ${kN(d.staticValue)} and R_a,seismic = ${kN(d.seismicValue)}. The service and seismic pile loads must not exceed these values.`,
      ],
    });
  }

  return steps;
}
