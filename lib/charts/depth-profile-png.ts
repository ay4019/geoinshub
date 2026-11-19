"use client";

import { getHiDpiCanvas2D } from "@/lib/chart-canvas-hidpi";
import {
  CHART_INK,
  boreholeStyles,
  cleanData,
  computeDomain,
  formatTick,
  markerPath,
  scales,
  seriesByBorehole,
  splitSubscripts,
  type DepthProfileSpec,
} from "@/lib/charts/depth-profile";

/** Logical size of report figures (rendered at 3× for print). Aspect matches the previous report images. */
const WIDTH = 900;
const HEIGHT = 640;
const PIXEL_RATIO = 3;

function siteFontFamily(): string {
  if (typeof document === "undefined") return "Arial, Helvetica, sans-serif";
  // next/font exposes the hashed family name through the --font-sans variable on <body>.
  const v = getComputedStyle(document.body).getPropertyValue("--font-sans").trim();
  return v ? `${v}, Arial, Helvetica, sans-serif` : "Arial, Helvetica, sans-serif";
}

/** Draws text with real subscripts (see splitSubscripts). `align` is honoured across the whole string. */
function drawScript(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size: number; weight: number; font: string; align?: "left" | "center" | "right"; halo?: string },
) {
  const segs = splitSubscripts(text);
  const subSize = Math.round(opts.size * 0.72);
  const fontFor = (sub: boolean) => `${opts.weight} ${sub ? subSize : opts.size}px ${opts.font}`;
  const widths = segs.map((seg) => {
    c.font = fontFor(seg.sub);
    return c.measureText(seg.text).width;
  });
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = opts.align === "center" ? x - total / 2 : opts.align === "right" ? x - total : x;
  const savedAlign = c.textAlign;
  c.textAlign = "left";
  segs.forEach((seg, i) => {
    c.font = fontFor(seg.sub);
    const cy = seg.sub ? y + opts.size * 0.28 : y;
    if (opts.halo) {
      const fill = c.fillStyle;
      c.lineWidth = 4;
      c.strokeStyle = opts.halo;
      c.strokeText(seg.text, cx, cy);
      c.fillStyle = fill;
    }
    c.fillText(seg.text, cx, cy);
    cx += widths[i];
  });
  c.textAlign = savedAlign;
}

/**
 * Report-quality PNG of a depth profile. Same geometry, palette and marker shapes as <DepthProfilePlot />,
 * on a white page background. Returns "" when there is nothing to plot.
 */
export function buildDepthProfilePng(spec: DepthProfileSpec & { title: string }): string {
  const data = cleanData(spec.data);
  if (!data.length) return "";
  const hi = getHiDpiCanvas2D(WIDTH, HEIGHT, PIXEL_RATIO);
  if (!hi) return "";
  const { canvas, context: c } = hi;
  const font = siteFontFamily();
  const styles = boreholeStyles(data);
  const domain = computeDomain({ ...spec, data }, 7, 8);

  const legendIds = Array.from(styles.keys());
  const perRow = 5;
  const legendRows = Math.ceil(legendIds.length / perRow);
  const margin = { top: 104, right: 30, bottom: 26 + legendRows * 26, left: 84 };
  const frame = { left: margin.left, top: margin.top, width: WIDTH - margin.left - margin.right, height: HEIGHT - margin.top - margin.bottom };
  const s = scales(domain, frame);

  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, WIDTH, HEIGHT);

  // Title
  c.fillStyle = CHART_INK.title;
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  drawScript(c, spec.title, margin.left, 34, { size: 21, weight: 600, font });

  // Grid
  const hLine = (y: number, colour: string) => {
    c.strokeStyle = colour;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(frame.left, Math.round(y) + 0.5);
    c.lineTo(frame.left + frame.width, Math.round(y) + 0.5);
    c.stroke();
  };
  domain.yMinorTicks.forEach((d) => hLine(s.y(d), CHART_INK.gridMinor));
  domain.yTicks.forEach((d) => hLine(s.y(d), CHART_INK.grid));
  domain.xTicks.forEach((v) => {
    c.strokeStyle = CHART_INK.grid;
    c.beginPath();
    c.moveTo(Math.round(s.x(v)) + 0.5, frame.top);
    c.lineTo(Math.round(s.x(v)) + 0.5, frame.top + frame.height);
    c.stroke();
  });

  // Axes + ticks
  c.strokeStyle = CHART_INK.axis;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(frame.left, frame.top);
  c.lineTo(frame.left + frame.width, frame.top);
  c.moveTo(frame.left, frame.top);
  c.lineTo(frame.left, frame.top + frame.height);
  c.stroke();

  c.fillStyle = CHART_INK.tick;
  c.font = `400 14px ${font}`;
  c.lineWidth = 1;
  c.textAlign = "center";
  domain.xTicks.forEach((v) => {
    const x = s.x(v);
    c.beginPath();
    c.moveTo(x, frame.top - 5);
    c.lineTo(x, frame.top);
    c.stroke();
    c.fillText(formatTick(v, domain.xStep), x, frame.top - 11);
  });
  c.textAlign = "right";
  domain.yTicks.forEach((d) => {
    const y = s.y(d);
    c.beginPath();
    c.moveTo(frame.left - 5, y);
    c.lineTo(frame.left, y);
    c.stroke();
    c.fillText(formatTick(d, domain.yStep), frame.left - 10, y + 5);
  });

  // Axis titles
  c.fillStyle = CHART_INK.axisTitle;
  drawScript(c, spec.xLabel, frame.left + frame.width / 2, 68, { size: 15, weight: 600, font, align: "center" });
  c.font = `600 15px ${font}`;
  c.textAlign = "center";
  c.save();
  c.translate(24, frame.top + frame.height / 2);
  c.rotate(-Math.PI / 2);
  c.fillText(`Depth (${spec.depthUnit})`, 0, 0);
  c.restore();

  // Reference lines
  for (const ref of spec.referenceLines ?? []) {
    const x = s.x(ref.value);
    c.save();
    c.strokeStyle = CHART_INK.reference;
    c.lineWidth = 1.5;
    c.setLineDash([7, 5]);
    c.beginPath();
    c.moveTo(x, frame.top);
    c.lineTo(x, frame.top + frame.height);
    c.stroke();
    c.restore();
    const nearRight = x > frame.left + frame.width * 0.7;
    c.fillStyle = CHART_INK.reference;
    drawScript(c, ref.label, nearRight ? x - 7 : x + 7, frame.top + frame.height - 10, {
      size: 13,
      weight: 500,
      font,
      align: nearRight ? "right" : "left",
      halo: "#ffffff",
    });
  }

  // Trend lines
  if (spec.connect ?? true) {
    for (const [id, pts] of seriesByBorehole(data)) {
      if (pts.length < 2) continue;
      c.save();
      c.globalAlpha = 0.45;
      c.strokeStyle = styles.get(id)?.colour ?? CHART_INK.axis;
      c.lineWidth = 1.75;
      c.lineJoin = "round";
      c.beginPath();
      pts.forEach((d, i) => (i ? c.lineTo(s.x(d.value), s.y(d.depth)) : c.moveTo(s.x(d.value), s.y(d.depth))));
      c.stroke();
      c.restore();
    }
  }

  // Markers
  for (const d of data) {
    const st = styles.get(d.boreholeId);
    if (!st) continue;
    const path = new Path2D(markerPath(st.shape, s.x(d.value), s.y(d.depth), 5.6));
    c.fillStyle = st.colour;
    c.fill(path);
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.5;
    c.stroke(path);
  }

  // Legend
  c.font = `500 14px ${font}`;
  c.textAlign = "left";
  const colW = frame.width / perRow;
  legendIds.forEach((id, i) => {
    const st = styles.get(id);
    if (!st) return;
    const x = frame.left + (i % perRow) * colW;
    const y = frame.top + frame.height + 30 + Math.floor(i / perRow) * 26;
    const path = new Path2D(markerPath(st.shape, x + 7, y - 5, 5.6));
    c.fillStyle = st.colour;
    c.fill(path);
    c.fillStyle = CHART_INK.axisTitle;
    c.fillText(id, x + 20, y);
  });

  return canvas.toDataURL("image/png");
}
