"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface GmaxProfileTabProps {
  unitSystem: UnitSystem;
}

type DensityInputMode = "unit-weight" | "mass-density";

interface GmaxProfileRow {
  id: number;
  topDepth: string;
  boreholeId: string;
  bottomDepth: string;
  vs: string;
  unitWeight: string;
  density: string;
}

interface ProfilePoint {
  boreholeId: string;
  topDepth: number;
  bottomDepth: number;
  vs: number;
  gmax: number;
}

const GRAVITY = 9.81;
const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: GmaxProfileRow[] = [
  {
    id: 1,
    topDepth: "0",
    boreholeId: "",
    bottomDepth: "2",
    vs: "160",
    unitWeight: "17.5",
    density: "1784",
  },
  {
    id: 2,
    topDepth: "2",
    boreholeId: "",
    bottomDepth: "6",
    vs: "240",
    unitWeight: "19.0",
    density: "1937",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function HeaderCell({ title, unit }: { title: ReactNode; unit?: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1 leading-tight">
      <span>{title}</span>
      {unit ? <span className="text-slate-500">({unit})</span> : null}
    </span>
  );
}

function OutputCell({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] font-semibold text-slate-900">
      {value}
    </div>
  );
}

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function getNiceTickStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;

  if (normalised <= 1) {
    return magnitude;
  }
  if (normalised <= 2) {
    return 2 * magnitude;
  }
  if (normalised <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function svgToDataUri(svgMarkup: string): string {
  const encoded = typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(svgMarkup))) : "";
  return `data:image/svg+xml;base64,${encoded}`;
}

function buildChartSvgMarkup({
  title,
  xLabel,
  xUnit,
  depthUnit,
  rows,
  valueKey,
}: {
  title: string;
  xLabel: string;
  xUnit: string;
  depthUnit: string;
  rows: ProfilePoint[];
  valueKey: "vs" | "gmax";
}) {
  const width = 520;
  const height = 340;
  const margin = { top: 54, right: 24, bottom: 22, left: 78 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...rows.map((row) => row.bottomDepth), 1);
  const maxDataValue = Math.max(...rows.map((row) => row[valueKey]), 1);
  const xStep = getNiceTickStep(maxDataValue / 5);
  const xIntervals = Math.max(Math.floor(maxDataValue / xStep) + 1, 2);
  const xAxisMax = xStep * xIntervals;
  const yStep = getNiceTickStep(maxDepth / 8);
  const yIntervals = Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const yAxisMax = yStep * yIntervals;
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (depth: number) => margin.top + (depth / yAxisMax) * innerHeight;
  const boreholeIds = Array.from(new Set(rows.map((row) => row.boreholeId)));

  const lineSeries = boreholeIds.map((boreholeId, boreholeIndex) => {
    const boreholeRows = rows
      .filter((row) => row.boreholeId === boreholeId)
      .sort((a, b) => a.topDepth - b.topDepth);
    const colour = BOREHOLE_COLOURS[boreholeIndex % BOREHOLE_COLOURS.length];
    const points = boreholeRows.map((row) => ({
      topY: yScale(row.topDepth),
      bottomY: yScale(row.bottomDepth),
      x: xScale(row[valueKey]),
      y: yScale((row.topDepth + row.bottomDepth) / 2),
    }));

    return { boreholeId, colour, points };
  });

  const xGrid = Array.from({ length: xIntervals + 1 })
    .map((_, index) => {
      const value = xStep * index;
      const x = xScale(value);
      return `
        <line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + innerHeight}" stroke="#dbe5f1" stroke-width="1" />
        <text x="${x}" y="${margin.top - 10}" text-anchor="middle" font-size="11" fill="#36557f" font-weight="600">${Math.round(value)}</text>
      `;
    })
    .join("");

  const yGrid = Array.from({ length: yIntervals + 1 })
    .map((_, index) => {
      const depth = yStep * index;
      const y = yScale(depth);
      return `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + innerWidth}" y2="${y}" stroke="#dbe5f1" stroke-width="1" />
        <text x="${margin.left - 12}" y="${y + 4}" text-anchor="end" font-size="11" fill="#36557f" font-weight="600">${depth.toFixed(1)}</text>
      `;
    })
    .join("");

  const seriesMarkup = lineSeries
    .map((series) => {
      const intervalLines = series.points
        .map(
          (point) =>
            `<line x1="${point.x}" y1="${point.topY}" x2="${point.x}" y2="${point.bottomY}" stroke="${hexToRgba(series.colour, 0.22)}" stroke-width="4" stroke-linecap="round" />`,
        )
        .join("");

      const line =
        series.points.length > 1
          ? `<polyline fill="none" stroke="${series.colour}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${series.points.map((point) => `${point.x},${point.y}`).join(" ")}" />`
          : "";

      const markers = series.points
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="4.2" fill="#ffffff" stroke="${series.colour}" stroke-width="2.2" />
            <circle cx="${point.x}" cy="${point.y}" r="1.8" fill="${series.colour}" />
          `,
        )
        .join("");

      return intervalLines + line + markers;
    })
    .join("");

  const legend = boreholeIds
    .map((boreholeId, index) => {
      const colour = BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length];
      return `
        <div style="display:inline-flex;align-items:center;gap:8px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:999px;padding:6px 12px;margin:4px;font-size:12px;font-weight:600;color:#475569;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${colour};box-shadow:0 0 0 3px ${hexToRgba(colour, 0.12)};"></span>
          <span>${escapeHtml(boreholeId)}</span>
        </div>
      `;
    })
    .join("");

  return `
    <div style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;padding:20px;">
      <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(title)}</h3>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;">
        <rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="#ffffff" />
        <rect x="${margin.left}" y="${margin.top}" width="${innerWidth}" height="${innerHeight}" fill="#ffffff" stroke="#c7d4e5" stroke-width="1.25" />
        ${xGrid}
        ${yGrid}
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + innerHeight}" stroke="#7f98ba" stroke-width="1.5" />
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left + innerWidth}" y2="${margin.top}" stroke="#7f98ba" stroke-width="1.5" />
        ${seriesMarkup}
        <text x="${margin.left + innerWidth / 2}" y="24" text-anchor="middle" font-size="12" fill="#1e3a5f" font-weight="700">${escapeHtml(xLabel)} (${escapeHtml(xUnit)})</text>
        <text x="18" y="${margin.top + innerHeight / 2}" text-anchor="middle" font-size="12" fill="#1e3a5f" font-weight="700" transform="rotate(-90 18 ${margin.top + innerHeight / 2})">Depth (${escapeHtml(depthUnit)})</text>
      </svg>
      <div style="margin-top:12px;text-align:center;">${legend}</div>
    </div>
  `;
}

function buildChartPngDataUri({
  title,
  xLabel,
  xUnit,
  depthUnit,
  rows,
  valueKey,
}: {
  title: string;
  xLabel: string;
  xUnit: string;
  depthUnit: string;
  rows: ProfilePoint[];
  valueKey: "vs" | "gmax";
}): string {
  const width = 1200;
  const height = 820;
  const margin = { top: 108, right: 56, bottom: 120, left: 130 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...rows.map((row) => row.bottomDepth), 1);
  const maxDataValue = Math.max(...rows.map((row) => row[valueKey]), 1);
  const xStep = getNiceTickStep(maxDataValue / 5);
  const xIntervals = Math.max(Math.floor(maxDataValue / xStep) + 1, 2);
  const xAxisMax = xStep * xIntervals;
  const yStep = getNiceTickStep(maxDepth / 8);
  const yIntervals = Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const yAxisMax = yStep * yIntervals;
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (depth: number) => margin.top + (depth / yAxisMax) * innerHeight;
  const boreholeIds = Array.from(new Set(rows.map((row) => row.boreholeId)));
  const lineSeries = boreholeIds.map((boreholeId, boreholeIndex) => {
    const boreholeRows = rows
      .filter((row) => row.boreholeId === boreholeId)
      .sort((a, b) => a.topDepth - b.topDepth);
    const colour = BOREHOLE_COLOURS[boreholeIndex % BOREHOLE_COLOURS.length];
    const points = boreholeRows.map((row) => ({
      topY: yScale(row.topDepth),
      bottomY: yScale(row.bottomDepth),
      x: xScale(row[valueKey]),
      y: yScale((row.topDepth + row.bottomDepth) / 2),
    }));

    return { boreholeId, colour, points };
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#0f172a";
  context.font = "700 30px Georgia, 'Times New Roman', serif";
  context.fillText(title, margin.left, 52);

  context.fillStyle = "#1e3a5f";
  context.font = "700 23px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(`${xLabel} (${xUnit})`, margin.left + innerWidth / 2, 84);
  context.textAlign = "start";

  context.strokeStyle = "#dbe5f1";
  context.lineWidth = 2;
  context.font = "600 21px Inter, Arial, sans-serif";
  context.fillStyle = "#36557f";
  for (let index = 0; index <= xIntervals; index += 1) {
    const value = xStep * index;
    const x = xScale(value);
    context.beginPath();
    context.moveTo(x, margin.top);
    context.lineTo(x, margin.top + innerHeight);
    context.stroke();
    context.textAlign = "center";
    context.fillText(String(Math.round(value)), x, margin.top - 14);
  }

  for (let index = 0; index <= yIntervals; index += 1) {
    const depth = yStep * index;
    const y = yScale(depth);
    context.beginPath();
    context.moveTo(margin.left, y);
    context.lineTo(margin.left + innerWidth, y);
    context.stroke();
    context.textAlign = "right";
    context.fillText(depth.toFixed(1), margin.left - 18, y + 7);
  }

  context.strokeStyle = "#7f98ba";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left, margin.top + innerHeight);
  context.stroke();
  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left + innerWidth, margin.top);
  context.stroke();

  lineSeries.forEach((series) => {
    series.points.forEach((point) => {
      context.beginPath();
      context.strokeStyle = hexToRgba(series.colour, 0.22);
      context.lineWidth = 7;
      context.lineCap = "round";
      context.moveTo(point.x, point.topY);
      context.lineTo(point.x, point.bottomY);
      context.stroke();
    });

    if (series.points.length > 1) {
      context.beginPath();
      context.strokeStyle = series.colour;
      context.lineWidth = 4;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.moveTo(series.points[0].x, series.points[0].y);
      for (let index = 1; index < series.points.length; index += 1) {
        context.lineTo(series.points[index].x, series.points[index].y);
      }
      context.stroke();
    }

    series.points.forEach((point) => {
      context.beginPath();
      context.fillStyle = "#ffffff";
      context.arc(point.x, point.y, 7.4, 0, 2 * Math.PI);
      context.fill();

      context.beginPath();
      context.strokeStyle = series.colour;
      context.lineWidth = 3;
      context.arc(point.x, point.y, 7.4, 0, 2 * Math.PI);
      context.stroke();

      context.beginPath();
      context.fillStyle = series.colour;
      context.arc(point.x, point.y, 3.3, 0, 2 * Math.PI);
      context.fill();
    });
  });

  context.save();
  context.translate(42, margin.top + innerHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillStyle = "#1e3a5f";
  context.font = "700 23px Inter, Arial, sans-serif";
  context.fillText(`Depth (${depthUnit})`, 0, 0);
  context.restore();

  const legendY = margin.top + innerHeight + 52;
  let legendX = margin.left;
  context.font = "600 18px Inter, Arial, sans-serif";

  lineSeries.forEach((series, index) => {
    const label = series.boreholeId;
    const textWidth = context.measureText(label).width;
    const blockWidth = 44 + textWidth;

    if (index > 0 && legendX + blockWidth > width - margin.right) {
      legendX = margin.left;
    }

    context.beginPath();
    context.fillStyle = hexToRgba(series.colour, 0.12);
    context.roundRect(legendX, legendY - 18, blockWidth, 34, 14);
    context.fill();

    context.beginPath();
    context.strokeStyle = "#d5e0ef";
    context.lineWidth = 1.5;
    context.roundRect(legendX, legendY - 18, blockWidth, 34, 14);
    context.stroke();

    context.beginPath();
    context.fillStyle = series.colour;
    context.arc(legendX + 16, legendY - 1, 5, 0, 2 * Math.PI);
    context.fill();

    context.fillStyle = "#334155";
    context.textAlign = "start";
    context.fillText(label, legendX + 28, legendY + 5);

    legendX += blockWidth + 10;
  });

  return canvas.toDataURL("image/png");
}

function ProfileChart({
  containerId,
  keyPrefix,
  title,
  xLabel,
  xUnit,
  depthUnit,
  rows,
  valueKey,
}: {
  containerId: string;
  keyPrefix: string;
  title: ReactNode;
  xLabel: string;
  xUnit: string;
  depthUnit: string;
  rows: ProfilePoint[];
  valueKey: "vs" | "gmax";
}) {
  const width = 520;
  const height = 340;
  const margin = { top: 54, right: 24, bottom: 22, left: 78 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...rows.map((row) => row.bottomDepth), 1);
  const maxDataValue = Math.max(...rows.map((row) => row[valueKey]), 1);
  const xStep = getNiceTickStep(maxDataValue / 5);
  const xIntervals = Math.max(Math.floor(maxDataValue / xStep) + 1, 2);
  const xAxisMax = xStep * xIntervals;
  const yStep = getNiceTickStep(maxDepth / 8);
  const yIntervals = Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const yAxisMax = yStep * yIntervals;
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (depth: number) => margin.top + (depth / yAxisMax) * innerHeight;
  const boreholeIds = Array.from(new Set(rows.map((row) => row.boreholeId)));

  const lineSeries = boreholeIds.map((boreholeId, boreholeIndex) => {
    const boreholeRows = rows
      .filter((row) => row.boreholeId === boreholeId)
      .sort((a, b) => a.topDepth - b.topDepth);
    const colour = BOREHOLE_COLOURS[boreholeIndex % BOREHOLE_COLOURS.length];
    const points = boreholeRows.map((row) => ({
      topY: yScale(row.topDepth),
      bottomY: yScale(row.bottomDepth),
      x: xScale(row[valueKey]),
      y: yScale((row.topDepth + row.bottomDepth) / 2),
    }));

    return { boreholeId, colour, points };
  });

  return (
    <div id={containerId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full">
        <defs>
          <clipPath id={`${keyPrefix}-clip`}>
            <rect x={margin.left} y={margin.top} width={innerWidth} height={innerHeight} rx="10" />
          </clipPath>
          <filter id={`${keyPrefix}-marker-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect x="0" y="0" width={width} height={height} rx="14" fill="#ffffff" />
        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          fill="#ffffff"
          stroke="#c7d4e5"
          strokeWidth="1.25"
        />

        {Array.from({ length: xIntervals + 1 }).map((_, index) => {
          const value = xStep * index;
          const x = xScale(value);
          return (
            <g key={`${keyPrefix}-x-grid-${index}`}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + innerHeight}
                stroke="#dbe5f1"
                strokeWidth="1"
              />
              <text x={x} y={margin.top - 10} textAnchor="middle" fontSize="11" fill="#36557f" fontWeight="600">
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {Array.from({ length: yIntervals + 1 }).map((_, index) => {
          const depth = yStep * index;
          const y = yScale(depth);
          return (
            <g key={`${keyPrefix}-y-grid-${index}`}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + innerWidth}
                y2={y}
                stroke="#dbe5f1"
                strokeWidth="1"
              />
              <text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#36557f" fontWeight="600">
                {depth.toFixed(1)}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + innerHeight}
          stroke="#7f98ba"
          strokeWidth="1.5"
        />
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left + innerWidth}
          y2={margin.top}
          stroke="#7f98ba"
          strokeWidth="1.5"
        />

        <g clipPath={`url(#${keyPrefix}-clip)`}>
          {lineSeries.flatMap((series) =>
            series.points.map((point, index) => (
              <line
                key={`${keyPrefix}-${series.boreholeId}-interval-${index}`}
                x1={point.x}
                y1={point.topY}
                x2={point.x}
                y2={point.bottomY}
                stroke={hexToRgba(series.colour, 0.22)}
                strokeWidth="4"
                strokeLinecap="round"
              />
            )),
          )}

          {lineSeries.map((series) =>
            series.points.length > 1 ? (
              <polyline
                key={`${keyPrefix}-${series.boreholeId}-line`}
                fill="none"
                stroke={series.colour}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={series.points.map((point) => `${point.x},${point.y}`).join(" ")}
              />
            ) : null,
          )}

          {lineSeries.flatMap((series) =>
            series.points.map((point, index) => (
              <g key={`${keyPrefix}-${series.boreholeId}-point-${index}`} filter={`url(#${keyPrefix}-marker-shadow)`}>
                <circle cx={point.x} cy={point.y} r="4.2" fill="#ffffff" stroke={series.colour} strokeWidth="2.2" />
                <circle cx={point.x} cy={point.y} r="1.8" fill={series.colour} />
              </g>
            )),
          )}
        </g>

        <text
          x={margin.left + innerWidth / 2}
          y={24}
          textAnchor="middle"
          fontSize="12"
          fill="#1e3a5f"
          fontWeight="700"
        >
          {xLabel} ({xUnit})
        </text>
        <text
          x="18"
          y={margin.top + innerHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#1e3a5f"
          fontWeight="700"
          transform={`rotate(-90 18 ${margin.top + innerHeight / 2})`}
        >
          Depth ({depthUnit})
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-2">
        {boreholeIds.map((boreholeId, index) => (
          <div
            key={`${keyPrefix}-legend-${boreholeId}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length], boxShadow: `0 0 0 3px ${hexToRgba(BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length], 0.12)}` }}
            />
            <span>{boreholeId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GmaxProfileTab({ unitSystem }: GmaxProfileTabProps) {
  const [densityInputMode, setDensityInputMode] = useState<DensityInputMode>("unit-weight");
  const [rows, setRows] = useState<GmaxProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const exportTableRef = useRef<HTMLDivElement | null>(null);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const velocityUnit = getDisplayUnit("m/s", unitSystem) ?? "m/s";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";
  const densityUnit = getDisplayUnit("kg/m3", unitSystem) ?? "kg/m3";
  const gmaxUnit = getDisplayUnit("MPa", unitSystem) ?? "MPa";

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
        bottomDepth: convertInputValueBetweenSystems(row.bottomDepth, "m", previousUnitSystem.current, unitSystem),
        vs: convertInputValueBetweenSystems(row.vs, "m/s", previousUnitSystem.current, unitSystem),
        unitWeight: convertInputValueBetweenSystems(row.unitWeight, "kN/m3", previousUnitSystem.current, unitSystem),
        density: convertInputValueBetweenSystems(row.density, "kg/m3", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  const updateRow = (id: number, patch: Partial<GmaxProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastBottom = current[current.length - 1]?.bottomDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
          {
            id: nextId,
            topDepth: lastBottom,
            boreholeId: "",
            bottomDepth: String(parse(lastBottom) + 2),
            vs: "220",
            unitWeight: "18.5",
          density: "1886",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };
  const exportRows = rows.map((row) => {
    const topDepth = parse(row.topDepth);
    const bottomDepth = parse(row.bottomDepth);
    const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
    const densityMetric =
      densityInputMode === "mass-density"
        ? parse(convertInputValueBetweenSystems(row.density, "kg/m3", unitSystem, "metric"))
        : (parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric")) * 1000) / GRAVITY;
    const unitWeightMetric =
      densityInputMode === "mass-density"
        ? (densityMetric * GRAVITY) / 1000
        : parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
    const gmaxMetric = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

    return {
      boreholeId: row.boreholeId || "BH not set",
      topDepth: format(topDepth, 1),
      bottomDepth: format(bottomDepth, 1),
      vs: format(Number(convertInputValueBetweenSystems(String(vsMetric), "m/s", "metric", unitSystem)), 0),
      unitWeight: format(Number(convertInputValueBetweenSystems(String(unitWeightMetric), "kN/m3", "metric", unitSystem)), 3),
      density: format(Number(convertInputValueBetweenSystems(String(densityMetric), "kg/m3", "metric", unitSystem)), 1),
      gmax: format(Number(convertInputValueBetweenSystems(String(gmaxMetric), "MPa", "metric", unitSystem)), 3),
    };
  });

  const buildExportTableHtml = () => {
    const headerCells = [
      `Borehole ID`,
      `Top (${depthUnit})`,
      `Bottom (${depthUnit})`,
      `V? (${velocityUnit})`,
      `Unit weight, ? (${unitWeightUnit})`,
      `Mass density, ? (${densityUnit})`,
      `Gmax (${gmaxUnit})`,
    ]
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.boreholeId)}</td>
            <td>${escapeHtml(row.topDepth)}</td>
            <td>${escapeHtml(row.bottomDepth)}</td>
            <td>${escapeHtml(row.vs)}</td>
            <td>${escapeHtml(row.unitWeight)}</td>
            <td>${escapeHtml(row.density)}</td>
            <td>${escapeHtml(row.gmax)}</td>
          </tr>
        `,
      )
      .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const buildChartImageDataUri = async ({
    title,
    xLabel,
    xUnit,
    valueKey,
  }: {
    title: string;
    xLabel: string;
    xUnit: string;
    valueKey: "vs" | "gmax";
  }) => {
    try {
      const pngUri = buildChartPngDataUri({
        title,
        xLabel,
        xUnit,
        depthUnit,
        rows: plotRows,
        valueKey,
      });
      if (pngUri.startsWith("data:image/png;base64,")) {
        return pngUri;
      }
    } catch {
      // Fallback to SVG encoding for environments where canvas export fails.
    }

    const svgMarkup = buildChartSvgMarkup({
      title,
      xLabel,
      xUnit,
      depthUnit,
      rows: plotRows,
      valueKey,
    });
    const svgOnly = svgMarkup.replace(/^.*?<svg/i, "<svg").replace(/<\/svg>.*$/i, "</svg>");
    return svgToDataUri(svgOnly);
  };

  const wrapBase64 = (base64: string) => base64.replace(/(.{76})/g, "$1\r\n");

  const buildExcelMhtmlDocument = async () => {
    const tableHtml = buildExportTableHtml();
    const [vsChartImgSrc, gmaxChartImgSrc] = await Promise.all([
      buildChartImageDataUri({
        title: "Depth vs V?",
        xLabel: "V?",
        xUnit: velocityUnit,
        valueKey: "vs",
      }),
      buildChartImageDataUri({
        title: "Depth vs Gmax",
        xLabel: "Gmax",
        xUnit: gmaxUnit,
        valueKey: "gmax",
      }),
    ]);

    const boundary = "----=_NextPart_GmaxExport";
    const excelHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Gmax from Vs Profile Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
      .chart-grid img { width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    <h1>Gmax from Vs Soil Profile Export</h1>
    <p>Density input mode: ${densityInputMode === "unit-weight" ? "Use unit weight, ?" : "Use mass density, ?"}</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    <h2>Profile plots</h2>
    <div class="chart-grid">
      <div><img src="file:///gmax-vs.png" alt="Depth vs Vs plot" /></div>
      <div><img src="file:///gmax-gmax.png" alt="Depth vs Gmax plot" /></div>
    </div>
  </body>
</html>`;

    const vsBase64 = vsChartImgSrc.startsWith("data:image/png;base64,")
      ? vsChartImgSrc.replace("data:image/png;base64,", "")
      : "";
    const gmaxBase64 = gmaxChartImgSrc.startsWith("data:image/png;base64,")
      ? gmaxChartImgSrc.replace("data:image/png;base64,", "")
      : "";

    if (!vsBase64 || !gmaxBase64) {
      return excelHtml;
    }

    return [
      "MIME-Version: 1.0",
      `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=\"utf-8\"",
      "Content-Transfer-Encoding: 8bit",
      "Content-Location: file:///report.htm",
      "",
      excelHtml,
      "",
      `--${boundary}`,
      "Content-Location: file:///gmax-vs.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(vsBase64),
      "",
      `--${boundary}`,
      "Content-Location: file:///gmax-gmax.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(gmaxBase64),
      "",
      `--${boundary}--`,
    ].join("\r\n");
  };

  const handleExportExcel = async () => {
    try {
      const excelPayload = await buildExcelMhtmlDocument();
      downloadBlob(
        "gmax-from-vs-profile.xls",
        new Blob([excelPayload], { type: "application/vnd.ms-excel;charset=utf-8" }),
      );
    } catch (error) {
      console.error(error);
      window.alert("Excel export failed. Please try again.");
    }
  };

  const plotRows: ProfilePoint[] = rows
    .map((row) => {
      const topDepth = parse(convertInputValueBetweenSystems(row.topDepth, "m", unitSystem, "metric"));
      const bottomDepth = parse(convertInputValueBetweenSystems(row.bottomDepth, "m", unitSystem, "metric"));
      const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
      const densityMetric =
        densityInputMode === "mass-density"
          ? parse(convertInputValueBetweenSystems(row.density, "kg/m3", unitSystem, "metric"))
          : (parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric")) * 1000) / GRAVITY;
      const gmaxMetric = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

      return {
        boreholeId: row.boreholeId || "BH not set",
        topDepth,
        bottomDepth,
        vs: Number(convertInputValueBetweenSystems(String(vsMetric), "m/s", "metric", unitSystem)),
        gmax: Number(convertInputValueBetweenSystems(String(gmaxMetric), "MPa", "metric", unitSystem)),
      };
    })
    .filter((row) => row.bottomDepth > row.topDepth)
    .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.topDepth - b.topDepth);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Build a layered small-strain stiffness profile by entering shear wave velocity with either unit weight or
              mass density for each layer.
            </p>
          </div>
          <div className="w-full max-w-[250px]">
            <label htmlFor="gmax-density-mode" className="mb-1 block text-sm font-medium text-slate-700">
              Density input mode
            </label>
            <select
              id="gmax-density-mode"
              value={densityInputMode}
              onChange={(event) => setDensityInputMode(event.target.value as DensityInputMode)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              <option value="unit-weight">Use unit weight, ?</option>
              <option value="mass-density">Use mass density, ?</option>
            </select>
          </div>
        </div>

        <div ref={exportTableRef} className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[12px] lg:text-[13px]">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Borehole ID" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Top" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Bottom" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>V<sub>s</sub></span>} unit={velocityUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span className="whitespace-nowrap">
                        Unit weight, ? ({unitWeightUnit})
                      </span>
                    }
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>Mass density, ?</span>} unit={densityUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>G<sub>max</sub></span>} unit="MPa" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <span className="block leading-tight">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topDepth = parse(row.topDepth);
                const bottomDepth = parse(row.bottomDepth);
                const hasDepthIssue = bottomDepth <= topDepth;
                const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
                const densityMetric =
                  densityInputMode === "mass-density"
                    ? parse(convertInputValueBetweenSystems(row.density, "kg/m3", unitSystem, "metric"))
                    : (parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric")) * 1000) / GRAVITY;
                const unitWeightMetric =
                  densityInputMode === "mass-density"
                    ? (densityMetric * GRAVITY) / 1000
                    : parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
                const displayDensity = convertInputValueBetweenSystems(
                  String(densityMetric),
                  "kg/m3",
                  "metric",
                  unitSystem,
                );
                const displayUnitWeight = convertInputValueBetweenSystems(
                  String(unitWeightMetric),
                  "kN/m3",
                  "metric",
                  unitSystem,
                );
                const gmaxMpa = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
                        value={row.boreholeId}
                        availableIds={rows.map((item) => item.boreholeId)}
                        onChange={(value) => updateRow(row.id, { boreholeId: value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.topDepth}
                        onChange={(event) => updateRow(row.id, { topDepth: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.bottomDepth}
                        onChange={(event) => updateRow(row.id, { bottomDepth: event.target.value })}
                        className={`w-full rounded-lg border px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 ${
                          hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Bottom must exceed top.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.vs}
                        onChange={(event) => updateRow(row.id, { vs: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      {densityInputMode === "unit-weight" ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={row.unitWeight}
                          onChange={(event) => updateRow(row.id, { unitWeight: event.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                        />
                      ) : (
                        <OutputCell value={format(Number(displayUnitWeight), 3)} />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {densityInputMode === "mass-density" ? (
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={row.density}
                          onChange={(event) => updateRow(row.id, { density: event.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                        />
                      ) : (
                        <OutputCell value={format(Number(displayDensity), 1)} />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={format(gmaxMpa, 3)} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className="btn-base w-full px-2 py-2 text-sm"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-base btn-md" onClick={addRow}>
            Add Layer
          </button>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-base btn-md" onClick={handleExportExcel}>
              Export Excel
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plot note</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The selected density mode applies to the full profile. When unit weight, ? is the active input, mass
            density, ? is calculated automatically for each layer; when mass density, ? is active, unit weight, ? is
            back-calculated before <span className="font-medium text-slate-700">G<sub>max</sub></span> is formed from
            <span className="font-medium text-slate-700"> ?V<sub>s</sub><sup>2</sup></span>.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileChart
          containerId="gmax-vs-chart"
          keyPrefix="vs-profile"
          title={
            <span>
              Depth vs V<sub>s</sub>
            </span>
          }
          xLabel="V?"
          xUnit={velocityUnit}
          depthUnit={depthUnit}
          rows={plotRows}
          valueKey="vs"
        />
        <ProfileChart
          containerId="gmax-gmax-chart"
          keyPrefix="gmax-profile"
          title={
            <span>
              Depth vs G<sub>max</sub>
            </span>
          }
          xLabel="G???"
          xUnit={gmaxUnit}
          depthUnit={depthUnit}
          rows={plotRows}
          valueKey="gmax"
        />
      </div>
    </section>
  );
}




