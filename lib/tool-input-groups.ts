/**
 * Calculation-form input groups for tools whose definitions do not set `group` on each input.
 * The form shows a heading whenever the group changes between consecutive visible inputs.
 */
import type { ToolInput } from "@/lib/types";

const GROUPS: Record<string, Record<string, string>> = {
  "traditional-bearing-capacity-methods": {
    method: "Method",
    designApproach: "Method",
    cohesion: "Soil",
    frictionAngle: "Soil",
    unitWeight: "Soil",
    width: "Foundation and groundwater",
    length: "Foundation and groundwater",
    embedment: "Foundation and groundwater",
    groundwaterDepth: "Foundation and groundwater",
    factorOfSafety: "Safety",
  },
  "subgrade-reaction-foundations": {
    width: "Foundation",
    length: "Foundation",
    es: "From soil modulus (Vesić)",
    nu: "From soil modulus (Vesić)",
    qa: "From allowable bearing pressure (Bowles)",
    fs: "From allowable bearing pressure (Bowles)",
    q: "From a settlement analysis",
    s: "From a settlement analysis",
    plateK: "From a plate-load test (Terzaghi)",
    plateSoil: "From a plate-load test (Terzaghi)",
  },
  "vs30-site-class": {
    ...Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap((k) => [[`layer${k}Thickness`, `Layer ${k}`], [`layer${k}Vs`, `Layer ${k}`]])),
    softClayThickness: "Special site checks",
  },
  "seed-idriss-liquefaction-screening": {
    method: "Method and earthquake",
    magnitude: "Method and earthquake",
    peakGroundAcceleration: "Method and earthquake",
    groundwaterDepth: "Site",
    unitWeight: "Site",
    finesContent: "Sample",
    sampleDepth: "Sample",
    n160: "Sample",
  },
  "eoed-from-mv": {
    eoedInputMode: "Input method",
    mv: "Oedometer test",
    plasticityIndex: "PI-f2 chart and SPT",
    n60: "PI-f2 chart and SPT",
    ll: "Index properties (C_c)",
    e0: "Index properties (C_c)",
    wn: "Index properties (C_c)",
    sigmaV0: "Index properties (C_c)",
    deltaSigma: "Index properties (C_c)",
  },
};

export function inputGroup(slug: string, input: ToolInput): string | undefined {
  return input.group ?? GROUPS[slug]?.[input.name];
}
