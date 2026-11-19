/**
 * Shared geometry and styling for depth-profile plots (value on a top axis, depth increasing downward).
 *
 * Both renderers use this module, so the on-screen chart and the report image always agree:
 *  - components/charts/depth-profile-plot.tsx  (interactive SVG)
 *  - lib/charts/depth-profile-png.ts            (canvas PNG for PDF / Excel reports)
 */

export interface DepthProfileDatum {
  boreholeId: string;
  depth: number;
  value: number;
}

export interface DepthProfileReferenceLine {
  value: number;
  label: string;
}

export interface DepthProfileSpec {
  /** Value-axis title, including unit, e.g. "N₆₀ (blows)". */
  xLabel: string;
  depthUnit: string;
  data: DepthProfileDatum[];
  referenceLines?: DepthProfileReferenceLine[];
  /** Join each borehole's points in depth order with a thin line (default true). */
  connect?: boolean;
  /** Force the value axis to start at this value (default: 0 for non-negative data). */
  xMin?: number;
  /** Force the value axis to end at this value (default: nice value above the data). */
  xMax?: number;
}

/**
 * Categorical borehole palette — earth-toned, validated for colour-vision deficiency and contrast on both the
 * paper surface (#fbf9f4) and white. Assigned in fixed order; a 7th+ borehole repeats the hue but gets a
 * different marker shape, so identity never relies on colour alone.
 */
export const DEPTH_PROFILE_COLOURS = ["#1f72a8", "#c05a2b", "#7a5bb5", "#4a8a3c", "#b4458a", "#a07818"] as const;

export type MarkerShape = "circle" | "square" | "diamond" | "triangle" | "triangleDown" | "hexagon";
export const DEPTH_PROFILE_SHAPES: MarkerShape[] = ["circle", "square", "diamond", "triangle", "triangleDown", "hexagon"];

/** Neutral chart ink (text never wears a series colour). */
export const CHART_INK = {
  title: "#1f2328",
  axisTitle: "#3f3f3c",
  tick: "#6e6b64",
  axis: "#969082",
  grid: "#e6e1d5",
  gridMinor: "#efebe2",
  reference: "#55544f",
  surface: "#fbf9f4",
} as const;

export interface BoreholeStyle {
  colour: string;
  shape: MarkerShape;
}

export function boreholeStyles(data: DepthProfileDatum[]): Map<string, BoreholeStyle> {
  const ids = Array.from(new Set(data.map((d) => d.boreholeId)));
  return new Map(
    ids.map((id, i) => [
      id,
      {
        colour: DEPTH_PROFILE_COLOURS[i % DEPTH_PROFILE_COLOURS.length],
        // Shapes advance with the colour cycle so repeated hues still differ.
        shape: DEPTH_PROFILE_SHAPES[(i + Math.floor(i / DEPTH_PROFILE_COLOURS.length)) % DEPTH_PROFILE_SHAPES.length],
      },
    ]),
  );
}

export function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const n = raw / magnitude;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
}

export function formatTick(value: number, step: number): string {
  // As many decimals as the step itself needs (2.5 → 1, 0.25 → 2, 5 → 0).
  let decimals = 0;
  while (decimals < 4 && Math.abs(Math.round(step * 10 ** decimals) - step * 10 ** decimals) > 1e-6) decimals += 1;
  const fixed = value.toFixed(decimals);
  return fixed === "-0" ? "0" : fixed;
}

export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "–";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(1);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export interface DepthProfileDomain {
  xMin: number;
  xMax: number;
  xStep: number;
  yMax: number;
  yStep: number;
  xTicks: number[];
  yTicks: number[];
  /** Half-step depth lines drawn as a fainter minor grid. */
  yMinorTicks: number[];
}

export function cleanData(data: DepthProfileDatum[]): DepthProfileDatum[] {
  return data.filter((d) => Number.isFinite(d.depth) && Number.isFinite(d.value) && d.depth >= 0);
}

export function computeDomain(spec: DepthProfileSpec, targetXTicks = 6, targetYTicks = 7): DepthProfileDomain {
  const data = cleanData(spec.data);
  const refs = (spec.referenceLines ?? []).map((r) => r.value).filter(Number.isFinite);
  const values = [...data.map((d) => d.value), ...refs];
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const lo = spec.xMin ?? (rawMin >= 0 ? 0 : rawMin);
  const span = Math.max(rawMax - lo, Math.abs(rawMax) * 0.1, 1e-6);
  const xStep = niceStep(span / targetXTicks);
  const xMin = spec.xMin ?? Math.floor(lo / xStep) * xStep;
  // Leave a little headroom so markers at the maximum are not clipped by the frame.
  const xMax = spec.xMax ?? Math.max(Math.ceil((rawMax + span * 0.04) / xStep) * xStep, xMin + 2 * xStep);

  const maxDepth = data.length ? Math.max(...data.map((d) => d.depth)) : 1;
  const yStep = niceStep(Math.max(maxDepth, 1) / targetYTicks);
  const yMax = Math.max(Math.ceil((maxDepth + yStep * 0.25) / yStep) * yStep, 2 * yStep);

  const xTicks: number[] = [];
  for (let v = xMin; v <= xMax + xStep * 0.001; v += xStep) xTicks.push(Number(v.toFixed(10)));
  const yTicks: number[] = [];
  const yMinorTicks: number[] = [];
  for (let d = 0; d <= yMax + yStep * 0.001; d += yStep) {
    yTicks.push(Number(d.toFixed(10)));
    if (d + yStep / 2 < yMax) yMinorTicks.push(Number((d + yStep / 2).toFixed(10)));
  }
  return { xMin, xMax, xStep, yMax, yStep, xTicks, yTicks, yMinorTicks };
}

export interface PlotFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function scales(domain: DepthProfileDomain, frame: PlotFrame) {
  return {
    x: (v: number) => frame.left + ((v - domain.xMin) / (domain.xMax - domain.xMin)) * frame.width,
    y: (d: number) => frame.top + (d / domain.yMax) * frame.height,
  };
}

/** Marker outline as an SVG path centred on (cx, cy); r is the visual radius. Also used by the canvas renderer. */
export function markerPath(shape: MarkerShape, cx: number, cy: number, r: number): string {
  const p = (pts: Array<[number, number]>) => `M${pts.map(([x, y]) => `${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`).join("L")}Z`;
  switch (shape) {
    case "square": {
      const s = r * 0.88;
      return p([[-s, -s], [s, -s], [s, s], [-s, s]]);
    }
    case "diamond": {
      const s = r * 1.22;
      return p([[0, -s], [s, 0], [0, s], [-s, 0]]);
    }
    case "triangle": {
      const s = r * 1.25;
      return p([[0, -s], [s * 0.94, s * 0.62], [-s * 0.94, s * 0.62]]);
    }
    case "triangleDown": {
      const s = r * 1.25;
      return p([[0, s], [s * 0.94, -s * 0.62], [-s * 0.94, -s * 0.62]]);
    }
    case "hexagon": {
      const s = r * 1.08;
      return p(Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return [s * Math.cos(a), s * Math.sin(a)] as [number, number];
      }));
    }
    default: {
      const k = r;
      return `M${(cx - k).toFixed(2)},${cy.toFixed(2)}a${k},${k} 0 1,0 ${(2 * k).toFixed(2)},0a${k},${k} 0 1,0 ${(-2 * k).toFixed(2)},0Z`;
    }
  }
}

/**
 * Unicode subscript glyphs (N₆₀, Gₘₐₓ, (N₁)₆₀) are missing from most UI fonts and render as tiny fallback glyphs.
 * Charts split them out and draw real subscripts (smaller, lowered) in the chart font instead.
 */
const SUBSCRIPTS: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "₊": "+", "₋": "−", "₌": "=", "₍": "(", "₎": ")",
  "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x", "ₕ": "h", "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₚ": "p",
  "ₛ": "s", "ₜ": "t", "ᵢ": "i", "ᵣ": "r", "ᵤ": "u", "ᵥ": "v", "ⱼ": "j",
};

export interface ScriptSegment {
  text: string;
  sub: boolean;
}

export function splitSubscripts(text: string): ScriptSegment[] {
  const out: ScriptSegment[] = [];
  for (const ch of text) {
    const mapped = SUBSCRIPTS[ch];
    const sub = mapped !== undefined;
    const value = sub ? mapped : ch;
    const last = out[out.length - 1];
    if (last && last.sub === sub) last.text += value;
    else out.push({ text: value, sub });
  }
  return out;
}

/** Plain-text version (for aria labels / tooltips). */
export function plainSubscripts(text: string): string {
  return splitSubscripts(text).map((s) => s.text).join("");
}

/** Points of one borehole sorted by depth (for the connecting line). */
export function seriesByBorehole(data: DepthProfileDatum[]): Map<string, DepthProfileDatum[]> {
  const map = new Map<string, DepthProfileDatum[]>();
  for (const d of data) {
    const list = map.get(d.boreholeId) ?? [];
    list.push(d);
    map.set(d.boreholeId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.depth - b.depth);
  return map;
}
