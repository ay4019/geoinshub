"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface OcrProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  globalGroundwaterDepth?: string;
  globalUnitWeight?: string;
}

interface OcrProfileRow {
  id: number;
  boreholeId: string;
  topDepth: string;
  bottomDepth: string;
  gwtDepth: string;
  unitWeight: string;
  preconsolidationStress: string;
}

interface DerivedRow {
  row: OcrProfileRow;
  topDepthMetric: number;
  bottomDepthMetric: number;
  sigmaV0EffMetric: number;
  sigmaV0EffDisplay: number;
  ocr: number;
}

interface OcrProfilePoint {
  boreholeId: string;
  topDepth: number;
  bottomDepth: number;
  sigmaV0Eff: number;
  ocr: number;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];
const GAMMA_W_METRIC = 9.81; // kN/m3

const initialRows: OcrProfileRow[] = [
  {
    id: 1,
    boreholeId: "",
    topDepth: "0",
    bottomDepth: "2",
    gwtDepth: "1.5",
    unitWeight: "18.5",
    preconsolidationStress: "140",
  },
  {
    id: 2,
    boreholeId: "",
    topDepth: "2",
    bottomDepth: "5",
    gwtDepth: "1.5",
    unitWeight: "19.0",
    preconsolidationStress: "210",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function formatTick(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (Math.abs(value) >= 100) {
    return String(Math.round(value));
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(1).replace(/\.0$/, "");
  }
  if (Math.abs(value) >= 1) {
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
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

function wrapBase64(base64: string): string {
  return base64.replace(/(.{76})/g, "$1\r\n");
}

function excelFormulaText(value: string): string {
  const safe = value.replaceAll('"', '""');
  return `="${safe}"`;
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
  rows: OcrProfilePoint[];
  valueKey: "sigmaV0Eff" | "ocr";
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
  context.fillText(`${xLabel}${xUnit ? ` (${xUnit})` : ""}`, margin.left + innerWidth / 2, 84);
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
    context.fillText(formatTick(value), x, margin.top - 14);
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
  context.font = "600 18px Inter, Arial, sans-serif";
  const legendBlocks = lineSeries.map((series) => {
    const textWidth = context.measureText(series.boreholeId).width;
    return { series, blockWidth: 44 + textWidth };
  });
  const legendGap = 10;
  const totalLegendWidth =
    legendBlocks.reduce((total, item) => total + item.blockWidth, 0) + Math.max(legendBlocks.length - 1, 0) * legendGap;
  let legendX = totalLegendWidth <= innerWidth ? margin.left + (innerWidth - totalLegendWidth) / 2 : margin.left;

  legendBlocks.forEach((item) => {
    const { series, blockWidth } = item;
    const label = series.boreholeId;

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

    legendX += blockWidth + legendGap;
  });

  return canvas.toDataURL("image/png");
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

function AxisLabel({
  valueKey,
  xUnit,
  x,
  y,
}: {
  valueKey: "sigmaV0Eff" | "ocr";
  xUnit?: string;
  x: number;
  y: number;
}) {
  if (valueKey === "ocr") {
    return (
      <text x={x} y={y} textAnchor="middle" fontSize="12" fill="#1e3a5f" fontWeight="700">
        OCR
      </text>
    );
  }

  return (
    <text x={x} y={y} textAnchor="middle" fontSize="12" fill="#1e3a5f" fontWeight="700">
      <tspan>&sigma;&prime;</tspan>
      <tspan baselineShift="sub" fontSize="9">
        v0
      </tspan>
      <tspan>{xUnit ? ` (${xUnit})` : ""}</tspan>
    </text>
  );
}

function ProfileChart({
  title,
  depthUnit,
  xUnit,
  rows,
  valueKey,
}: {
  title: ReactNode;
  depthUnit: string;
  xUnit?: string;
  rows: OcrProfilePoint[];
  valueKey: "sigmaV0Eff" | "ocr";
}) {
  const width = 560;
  const height = 360;
  const margin = { top: 54, right: 20, bottom: 24, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...rows.map((row) => row.bottomDepth), 1);
  const maxDataValue = Math.max(...rows.map((row) => row[valueKey]), 1);
  const xStep = getNiceTickStep(maxDataValue / 5);
  const xAxisMax = xStep * Math.max(Math.floor(maxDataValue / xStep) + 1, 2);
  const yStep = getNiceTickStep(maxDepth / 8);
  const yAxisMax = yStep * Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (depth: number) => margin.top + (depth / yAxisMax) * innerHeight;
  const boreholeIds = Array.from(new Set(rows.map((row) => row.boreholeId)));

  const lineSeries = boreholeIds.map((boreholeId, index) => {
    const colour = BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length];
    const points = rows
      .filter((row) => row.boreholeId === boreholeId)
      .sort((a, b) => a.topDepth - b.topDepth)
      .map((row) => ({
        x: xScale(row[valueKey]),
        y: yScale((row.topDepth + row.bottomDepth) / 2),
        topY: yScale(row.topDepth),
        bottomY: yScale(row.bottomDepth),
      }));
    return { boreholeId, colour, points };
  });

  const xTickCount = Math.max(Math.floor(xAxisMax / xStep), 2);
  const yTickCount = Math.max(Math.floor(yAxisMax / yStep), 2);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full">
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

        {Array.from({ length: xTickCount + 1 }).map((_, index) => {
          const value = index * xStep;
          const x = xScale(value);
          return (
            <g key={`x-${index}`}>
              <line x1={x} y1={margin.top} x2={x} y2={margin.top + innerHeight} stroke="#dbe5f1" strokeWidth="1" />
              <text x={x} y={margin.top - 10} textAnchor="middle" fontSize="11" fill="#36557f" fontWeight="600">
                {Number(value.toFixed(value < 1 ? 2 : 1))}
              </text>
            </g>
          );
        })}

        {Array.from({ length: yTickCount + 1 }).map((_, index) => {
          const depth = index * yStep;
          const y = yScale(depth);
          return (
            <g key={`y-${index}`}>
              <line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="#dbe5f1" strokeWidth="1" />
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

        {lineSeries.map((series) => (
          <g key={series.boreholeId}>
            {series.points.map((point, index) => (
              <line
                key={`interval-${series.boreholeId}-${index}`}
                x1={point.x}
                y1={point.topY}
                x2={point.x}
                y2={point.bottomY}
                stroke={series.colour}
                strokeOpacity="0.2"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}
            {series.points.length > 1 ? (
              <polyline
                fill="none"
                stroke={series.colour}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={series.points.map((point) => `${point.x},${point.y}`).join(" ")}
              />
            ) : null}
            {series.points.map((point, index) => (
              <g key={`marker-${series.boreholeId}-${index}`}>
                <circle cx={point.x} cy={point.y} r="4.2" fill="#ffffff" stroke={series.colour} strokeWidth="2.2" />
                <circle cx={point.x} cy={point.y} r="1.8" fill={series.colour} />
              </g>
            ))}
          </g>
        ))}

        <AxisLabel valueKey={valueKey} xUnit={xUnit} x={margin.left + innerWidth / 2} y={24} />
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
      <div className="mt-3 text-center">
        {boreholeIds.map((boreholeId, index) => {
          const colour = BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length];
          return (
            <span
              key={boreholeId}
              className="m-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
              {boreholeId}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function OcrProfileTab({
  unitSystem,
  importRows,
  globalGroundwaterDepth = "",
  globalUnitWeight = "",
}: OcrProfileTabProps) {
  const [rows, setRows] = useState<OcrProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
        bottomDepth: convertInputValueBetweenSystems(row.bottomDepth, "m", previousUnitSystem.current, unitSystem),
        gwtDepth: convertInputValueBetweenSystems(row.gwtDepth, "m", previousUnitSystem.current, unitSystem),
        unitWeight: convertInputValueBetweenSystems(
          row.unitWeight,
          "kN/m3",
          previousUnitSystem.current,
          unitSystem,
        ),
        preconsolidationStress: convertInputValueBetweenSystems(
          row.preconsolidationStress,
          "kPa",
          previousUnitSystem.current,
          unitSystem,
        ),
      })),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  useEffect(() => {
    const trimmedGwt = globalGroundwaterDepth.trim();
    const trimmedUnitWeight = globalUnitWeight.trim();

    if (!trimmedGwt && !trimmedUnitWeight) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      setRows((current) =>
        current.map((row) => ({
          ...row,
          gwtDepth: trimmedGwt || row.gwtDepth,
          unitWeight: trimmedUnitWeight || row.unitWeight,
        })),
      );
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [globalGroundwaterDepth, globalUnitWeight]);

  useEffect(() => {
    if (!importRows || importRows.length === 0) {
      return;
    }
    setRows((current) => {
      const template = current[0] ?? initialRows[0];
      return importRows.map((item, index) => ({
        ...template,
        id: index + 1,
        boreholeId: item.boreholeLabel || template.boreholeId,
        topDepth:
          item.sampleTopDepth === null
            ? template.topDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
      }));
    });
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<OcrProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastRow = current[current.length - 1];
      const lastDepth = lastRow?.topDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          boreholeId: "",
          topDepth: String(parse(lastDepth) + 2),
          bottomDepth: "",
          gwtDepth: "1.5",
          unitWeight: "18.5",
          preconsolidationStress: "180",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const derivedRows: DerivedRow[] = useMemo(
    () =>
      rows.map((row) => {
        const topDepthMetric = parse(convertInputValueBetweenSystems(row.topDepth, "m", unitSystem, "metric"));
        const bottomDepthMetric = topDepthMetric;
        const gwtDepthMetric = parse(convertInputValueBetweenSystems(row.gwtDepth, "m", unitSystem, "metric"));
        const unitWeightMetric = parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
        const sigmaPMetric = parse(
          convertInputValueBetweenSystems(row.preconsolidationStress, "kPa", unitSystem, "metric"),
        );

        // Effective stress for OCR is evaluated at sample top depth; bottom depth is only for plot interval.
        const totalStressMetric = Math.max(unitWeightMetric, 0) * Math.max(topDepthMetric, 0);
        const porePressureMetric = GAMMA_W_METRIC * Math.max(topDepthMetric - Math.max(gwtDepthMetric, 0), 0);
        const sigmaV0EffMetric = Math.max(totalStressMetric - porePressureMetric, 0);
        const ocr = sigmaV0EffMetric > 0 ? sigmaPMetric / sigmaV0EffMetric : 0;
        const sigmaV0EffDisplay = Number(
          convertInputValueBetweenSystems(String(sigmaV0EffMetric), "kPa", "metric", unitSystem),
        );

        return {
          row,
          topDepthMetric,
          bottomDepthMetric,
          sigmaV0EffMetric,
          sigmaV0EffDisplay,
          ocr,
        };
      }),
    [rows, unitSystem],
  );

  const chartRows: OcrProfilePoint[] = useMemo(
    () =>
      derivedRows
        .map((item) => ({
          boreholeId: item.row.boreholeId || "BH not set",
          topDepth: Number(convertInputValueBetweenSystems(String(item.topDepthMetric), "m", "metric", unitSystem)),
          bottomDepth: Number(
            convertInputValueBetweenSystems(String(item.bottomDepthMetric), "m", "metric", unitSystem),
          ),
          sigmaV0Eff: item.sigmaV0EffDisplay,
          ocr: item.ocr,
        }))
        .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.topDepth - b.topDepth),
    [derivedRows, unitSystem],
  );

  const sigmaChartImgSrc = useMemo(
    () =>
      buildChartPngDataUri({
        title: "Depth vs σ′v₀",
        xLabel: "σ′v₀",
        xUnit: stressUnit,
        depthUnit,
        rows: chartRows,
        valueKey: "sigmaV0Eff",
      }),
    [chartRows, depthUnit, stressUnit],
  );

  const ocrChartImgSrc = useMemo(
    () =>
      buildChartPngDataUri({
        title: "Depth vs OCR",
        xLabel: "OCR",
        xUnit: "",
        depthUnit,
        rows: chartRows,
        valueKey: "ocr",
      }),
    [chartRows, depthUnit],
  );

  const exportRows = useMemo(
    () =>
      derivedRows.map((item) => ({
        boreholeId: item.row.boreholeId || "BH not set",
        sampleDepth: format(Number(item.row.topDepth), 2),
        gwt: format(Number(item.row.gwtDepth), 2),
        unitWeight: format(Number(item.row.unitWeight), 2),
        sigmaP: format(Number(item.row.preconsolidationStress), 2),
        sigmaV0: format(item.sigmaV0EffDisplay, 2),
        ocr: format(item.ocr, 3),
      })),
    [derivedRows],
  );

  const buildExportTableHtml = () => {
    const headerCells = [
      "Borehole ID",
      `Sample Depth (${depthUnit})`,
      `GWT (${depthUnit})`,
      `Unit weight, gamma (${unitWeightUnit})`,
      `sigma'_p (${stressUnit})`,
      `sigma'_v0 (${stressUnit})`,
      "OCR",
    ]
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.boreholeId)}</td>
            <td class="excel-text">${escapeHtml(excelFormulaText(row.sampleDepth))}</td>
            <td class="excel-text">${escapeHtml(excelFormulaText(row.gwt))}</td>
            <td class="excel-text">${escapeHtml(excelFormulaText(row.unitWeight))}</td>
            <td class="excel-text">${escapeHtml(excelFormulaText(row.sigmaP))}</td>
            <td class="excel-text">${escapeHtml(excelFormulaText(row.sigmaV0))}</td>
            <td class="excel-text">${escapeHtml(excelFormulaText(row.ocr))}</td>
          </tr>
        `,
      )
      .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const buildExcelMhtmlDocument = () => {
    const tableHtml = buildExportTableHtml();
    const boundary = "----=_NextPart_OcrExport";
    const excelHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>OCR Soil Profile Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
      .excel-text { mso-number-format:"\\@"; white-space: nowrap; }
      .chart-stack { width: 100%; margin-top: 12px; }
      .chart-cell { width: 100%; vertical-align: top; border: 1px solid #cbd5e1; padding: 6px; margin-bottom: 12px; }
      .chart-image { width: 100%; max-width: 860px; height: auto; display: block; }
    </style>
  </head>
  <body>
    <h1>OCR Soil Profile Export</h1>
    <p>Layered OCR profile generated from sample depth, groundwater level, bulk unit weight, and preconsolidation stress.</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    <h2>Profile plots</h2>
    <div class="chart-stack">
      <div class="chart-cell"><img class="chart-image" width="860" src="file:///ocr-sigma-v0.png" alt="Depth vs σ′v₀ plot" /></div>
      <div class="chart-cell"><img class="chart-image" width="860" src="file:///ocr-plot.png" alt="Depth vs OCR plot" /></div>
    </div>
  </body>
</html>`;

    const sigmaBase64 = sigmaChartImgSrc.startsWith("data:image/png;base64,")
      ? sigmaChartImgSrc.replace("data:image/png;base64,", "")
      : "";
    const ocrBase64 = ocrChartImgSrc.startsWith("data:image/png;base64,")
      ? ocrChartImgSrc.replace("data:image/png;base64,", "")
      : "";

    if (!sigmaBase64 || !ocrBase64) {
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
      "Content-Location: file:///ocr-sigma-v0.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(sigmaBase64),
      "",
      `--${boundary}`,
      "Content-Location: file:///ocr-plot.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(ocrBase64),
      "",
      `--${boundary}--`,
    ].join("\r\n");
  };

  const handleExportExcel = () => {
    try {
      const excelPayload = buildExcelMhtmlDocument();
      downloadBlob(
        "ocr-soil-profile-export.xls",
        new Blob([excelPayload], { type: "application/vnd.ms-excel;charset=utf-8" }),
      );
    } catch (error) {
      console.error(error);
      window.alert("Excel export failed. Please try again.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter BH sample depth with GWT, unit weight, and oedometer-derived preconsolidation stress. The tool
          calculates vertical effective stress and OCR automatically at Sample Depth.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[12px] lg:text-[13px]">
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Borehole ID" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Sample Depth" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="GWT" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span>
                        Unit weight, &gamma;
                      </span>
                    }
                    unit={unitWeightUnit}
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span>
                        &sigma;&prime;<sub>p</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span>
                        &sigma;&prime;<sub>v0</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="OCR" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {derivedRows.map((item) => {
                return (
                  <tr key={item.row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
                        value={item.row.boreholeId}
                        availableIds={rows.map((row) => row.boreholeId)}
                        onChange={(value) => updateRow(item.row.id, { boreholeId: value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.row.topDepth}
                        onChange={(event) => updateRow(item.row.id, { topDepth: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.row.gwtDepth}
                        onChange={(event) => updateRow(item.row.id, { gwtDepth: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.row.unitWeight}
                        onChange={(event) => updateRow(item.row.id, { unitWeight: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.row.preconsolidationStress}
                        onChange={(event) => updateRow(item.row.id, { preconsolidationStress: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={format(item.sigmaV0EffDisplay, 2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={format(item.ocr, 3)} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className="btn-base w-full px-2 py-2 text-sm"
                        onClick={() => removeRow(item.row.id)}
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
          <button type="button" className="btn-base btn-md" onClick={handleExportExcel}>
            Export Excel
          </button>
        </div>

      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileChart
          title={
            <span>
              Depth vs &sigma;&prime;<sub>v0</sub>
            </span>
          }
          depthUnit={depthUnit}
          xUnit={stressUnit}
          rows={chartRows}
          valueKey="sigmaV0Eff"
        />
        <ProfileChart title={<span>Depth vs OCR</span>} depthUnit={depthUnit} rows={chartRows} valueKey="ocr" />
      </div>
</section>
  );
}
