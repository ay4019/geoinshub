/**
 * Shear-wave velocity from SPT and V_s,30 site classification.
 *
 * SPT → V_s correlations (N = field N or N60 as stated by each author):
 *   Imai & Tonouchi (1982), all soils:        V_s = 97.0 N^0.314
 *   Ohta & Goto (1978), all soils:            V_s = 85.35 N^0.348
 *   Sykora & Stokoe (1983), granular:          V_s = 100.5 N^0.29
 *   Iyisan (1996), all soils (Türkiye):        V_s = 51.5 N^0.516
 *
 * V_s,30 = 30 / Σ(h_i / V_s,i) over the top 30 m (TBDY 2018 §16.4, EN 1998-1 §3.1.2).
 *   TBDY 2018: ZA > 1500, ZB 760–1500, ZC 360–760, ZD 180–360, ZE < 180 m/s
 *   EN 1998-1 (2004): A > 800, B 360–800, C 180–360, D < 180 m/s
 */
import { readChoice, readNumber, round, screeningWarnings, type DesignCalculator } from "@/lib/design-tools/common";

export const VS_CORRELATIONS = {
  "imai-tonouchi-1982": { a: 97.0, b: 0.314, label: "Imai & Tonouchi (1982) — all soils" },
  "ohta-goto-1978": { a: 85.35, b: 0.348, label: "Ohta & Goto (1978) — all soils" },
  "sykora-stokoe-1983": { a: 100.5, b: 0.29, label: "Sykora & Stokoe (1983) — granular soils" },
  "iyisan-1996": { a: 51.5, b: 0.516, label: "Iyisan (1996) — all soils" },
} as const;
export type VsCorrelation = keyof typeof VS_CORRELATIONS;

export function vsFromSpt(n: number, correlation: VsCorrelation): number {
  const c = VS_CORRELATIONS[correlation];
  return c.a * Math.max(n, 1) ** c.b;
}

export function computeVs30(layers: Array<{ thickness: number; vs: number }>) {
  let depth = 0;
  let travel = 0;
  const used: Array<{ thickness: number; vs: number }> = [];
  for (let i = 0; i < layers.length && depth < 30; i += 1) {
    const isLast = i === layers.length - 1;
    const h = isLast ? 30 - depth : Math.min(layers[i].thickness, 30 - depth);
    travel += h / layers[i].vs;
    depth += h;
    used.push({ thickness: h, vs: layers[i].vs });
  }
  const vs30 = 30 / travel;
  const tbdy = vs30 > 1500 ? "ZA" : vs30 > 760 ? "ZB" : vs30 > 360 ? "ZC" : vs30 > 180 ? "ZD" : "ZE";
  const ec8 = vs30 > 800 ? "A" : vs30 > 360 ? "B" : vs30 > 180 ? "C" : "D";
  return { vs30, tbdy, ec8, used };
}

export const vsFromSptCalculator: DesignCalculator = (values) => {
  const n = readNumber(values, "n", "SPT N", { min: 1, max: 100 });
  const selected = readChoice(values, "correlation", Object.keys(VS_CORRELATIONS) as VsCorrelation[], "imai-tonouchi-1982");
  const all = (Object.keys(VS_CORRELATIONS) as VsCorrelation[]).map((key) => ({ key, vs: vsFromSpt(n, key) }));
  const mean = all.reduce((s, a) => s + a.vs, 0) / all.length;
  return {
    title: "Shear-Wave Velocity from SPT",
    summary: `${VS_CORRELATIONS[selected].label}: V_s = ${round(vsFromSpt(n, selected), 0)} m/s (mean of all correlations ${round(mean, 0)} m/s).`,
    items: [
      { label: "Selected correlation", value: VS_CORRELATIONS[selected].label },
      { label: "V_s (selected)", value: round(vsFromSpt(n, selected), 1), unit: "m/s" },
      ...all.map((a) => ({ label: VS_CORRELATIONS[a.key].label, value: round(a.vs, 1), unit: "m/s" })),
      { label: "Mean of correlations", value: round(mean, 1), unit: "m/s" },
    ],
    notes: [
      "SPT–V_s correlations scatter by ±30% or more; use measured V_s (MASW, downhole, seismic CPT) for site classification wherever possible.",
    ],
    warnings: screeningWarnings(),
  };
};

export const vs30Calculator: DesignCalculator = (values) => {
  const layers: Array<{ thickness: number; vs: number }> = [];
  for (let k = 1; k <= 6; k += 1) {
    const h = Number(values[`layer${k}Thickness`] ?? 0);
    const vs = Number(values[`layer${k}Vs`] ?? 0);
    if (Number.isFinite(h) && h > 0 && Number.isFinite(vs) && vs > 0) layers.push({ thickness: h, vs });
  }
  if (!layers.length) throw new Error("Enter at least one layer with positive thickness and V_s.");
  const r = computeVs30(layers);
  const total = layers.reduce((s, l) => s + l.thickness, 0);
  return {
    title: "V_s,30 and Site Class",
    summary: `V_s,30 = ${round(r.vs30, 0)} m/s → TBDY 2018 class ${r.tbdy}, EN 1998-1 ground type ${r.ec8}.`,
    items: [
      ...r.used.map((l, i) => ({ label: `Layer ${i + 1} used thickness / V_s`, value: `${round(l.thickness, 2)} m / ${round(l.vs, 0)} m/s` })),
      { label: "V_s,30", value: round(r.vs30, 1), unit: "m/s" },
      { label: "TBDY 2018 local site class", value: r.tbdy },
      { label: "EN 1998-1 ground type", value: r.ec8 },
    ],
    notes: [
      total < 30 ? "Profile shallower than 30 m: the last layer is extended to 30 m." : "Layers below 30 m are ignored.",
      "TBDY 2018 also requires (N1)60 / c_u criteria and special-site checks (class ZF: liquefiable, sensitive, highly organic or very thick soft clay).",
      "EN 1998-1 classes S1/S2 and the revised prEN 1998-1-1 (V_s,H, H_800) are not covered.",
    ],
    warnings: screeningWarnings(),
  };
};
