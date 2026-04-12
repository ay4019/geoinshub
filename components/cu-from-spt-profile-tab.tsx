"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { ExpandableProfilePlot } from "@/components/expandable-profile-plot";
import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import {
  cnProfileTableInput,
  ProfileTableHeaderCell,
  ProfileTableScroll,
  profileTableClass,
  profileTableFooterButtonClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";
import { isActiveProjectToolLocked, type SelectedBoreholeSummary } from "@/lib/project-boreholes";
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { profilePlotItemClass, profilePlotsSectionClass } from "@/lib/profile-plot-layout";
import { getHiDpiCanvas2D } from "@/lib/chart-canvas-hidpi";
import { buildMhtmlMultipartDocument, EXCEL_TABLE_BLOCK_CSS, excelTextCell, excelTextHeader } from "@/lib/excel-mhtml-export";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface CuFromSptProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  /** When set, rows that do not match this tool’s soil rules are greyed and excluded from plots/exports. */
  soilPolicyToolSlug?: string;
  projectParameters?: Array<{
    boreholeLabel: string;
    sampleDepth: number | null;
    parameterCode: string;
    value: number;
    sourceToolSlug?: string | null;
  }>;
  onReportDataChange?: (payload: CuFromSptReportPayload) => void;
}

interface CuFromSptRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  plasticityIndex: string;
  piSource: "manual" | "auto-project";
  n60: string;
  n60Source: "manual" | "auto-spt-corrections";
}

interface PlotPoint {
  boreholeId: string;
  depth: number;
  pi: number;
  n60: number;
  f1: number;
  cu: number;
}

export interface CuFromSptReportPayload {
  depthUnit: string;
  stressUnit: string;
  /** Layers used on the profile plot (soil-restricted / invalid-depth rows omitted). */
  points: PlotPoint[];
  /** Every row shown in the profile grid, same order — used for Table 1 in the PDF. */
  tableRows: Array<Record<string, string>>;
  plotImageDataUrl: string | null;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: CuFromSptRow[] = [
  {
    id: 1,
    boreholeId: "",
    sampleDepth: "1.5",
    plasticityIndex: "20",
    piSource: "manual",
    n60: "12",
    n60Source: "manual",
  },
  {
    id: 2,
    boreholeId: "",
    sampleDepth: "3.0",
    plasticityIndex: "28",
    piSource: "manual",
    n60: "18",
    n60Source: "manual",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitiseBoreholeLabel(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .replace(/[▼▾▿▲△]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "BH not set";
}

function normaliseBoreholeLabelKey(value: string | null | undefined): string {
  return sanitiseBoreholeLabel(value).toLowerCase();
}

function depthKey(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "na";
}

function interpolateStroudF1(pi: number): number {
  if (pi <= 15) {
    return 6.5;
  }
  if (pi <= 20) {
    return 6.5 + ((5.5 - 6.5) * (pi - 15)) / 5;
  }
  if (pi <= 25) {
    return 5.5 + ((5.0 - 5.5) * (pi - 20)) / 5;
  }
  if (pi <= 30) {
    return 5.0 + ((4.8 - 5.0) * (pi - 25)) / 5;
  }
  if (pi <= 35) {
    return 4.8 + ((4.5 - 4.8) * (pi - 30)) / 5;
  }
  if (pi <= 40) {
    return 4.5 + ((4.4 - 4.5) * (pi - 35)) / 5;
  }
  return 4.4;
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}

function getNiceTickStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
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

function renderScatterChart({
  title,
  xLabel,
  points,
  valueKey,
  depthUnit,
}: {
  title: string;
  xLabel: string;
  points: PlotPoint[];
  valueKey: "f1" | "cu";
  depthUnit: string;
}) {
  const width = 560;
  const height = 360;
  const margin = { top: 54, right: 20, bottom: 24, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...points.map((point) => point.depth), 1);
  const maxValue = Math.max(...points.map((point) => point[valueKey]), 1);
  const xStep = getNiceTickStep(maxValue / 6);
  const xIntervals = Math.max(Math.floor(maxValue / xStep) + 1, 2);
  const xAxisMax = xStep * xIntervals;
  const yStep = getNiceTickStep(maxDepth / 7);
  const yIntervals = Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const yAxisMax = yStep * yIntervals;
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (value: number) => margin.top + (value / yAxisMax) * innerHeight;

  const boreholeIds = Array.from(new Set(points.map((point) => point.boreholeId)));
  const colourByBorehole = new Map<string, string>();
  boreholeIds.forEach((id, index) => {
    colourByBorehole.set(id, BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length]);
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full">
        <rect x={0} y={0} width={width} height={height} rx={12} fill="#ffffff" />
        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          fill="#ffffff"
          stroke="#c7d4e5"
          strokeWidth={1.2}
        />
        {Array.from({ length: xIntervals + 1 }, (_, index) => {
          const value = xStep * index;
          const x = xScale(value);
          return (
            <g key={`x-${value}`}>
              <line x1={x} y1={margin.top} x2={x} y2={margin.top + innerHeight} stroke="#dbe5f1" strokeWidth={1} />
              <text x={x} y={margin.top - 10} textAnchor="middle" fontSize={11} fill="#36557f" fontWeight={600}>
                {Math.round(value)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: yIntervals + 1 }, (_, index) => {
          const depth = yStep * index;
          const y = yScale(depth);
          return (
            <g key={`y-${depth}`}>
              <line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="#dbe5f1" strokeWidth={1} />
              <text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize={11} fill="#36557f" fontWeight={600}>
                {depth.toFixed(1)}
              </text>
            </g>
          );
        })}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke="#7f98ba" strokeWidth={1.5} />
        <line x1={margin.left} y1={margin.top} x2={margin.left + innerWidth} y2={margin.top} stroke="#7f98ba" strokeWidth={1.5} />

        {points.map((point, index) => {
          const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
          return (
            <g key={`${point.boreholeId}-${point.depth}-${point[valueKey]}-${index}`}>
              <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
              <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={2.2} fill={colour} />
            </g>
          );
        })}

        <text x={margin.left + innerWidth / 2} y={24} textAnchor="middle" fontSize={12} fill="#1e3a5f" fontWeight={700}>
          {xLabel}
        </text>
        <text
          x={18}
          y={margin.top + innerHeight / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#1e3a5f"
          fontWeight={700}
          transform={`rotate(-90 18 ${margin.top + innerHeight / 2})`}
        >
          Depth ({depthUnit})
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {boreholeIds.map((boreholeId, index) => {
          const colour = BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length];
          return (
            <span
              key={`legend-${boreholeId}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
              {boreholeId}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function drawCanvasTitleDepthVsCu(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const mainPx = 38;
  const subPx = 24;
  ctx.font = `700 ${mainPx}px Georgia, "Times New Roman", serif`;
  const prefix = "Depth vs ";
  ctx.fillText(prefix, x, y);
  let cursorX = x + ctx.measureText(prefix).width;
  ctx.fillText("c", cursorX, y);
  cursorX += ctx.measureText("c").width;
  ctx.font = `700 ${subPx}px Georgia, "Times New Roman", serif`;
  ctx.fillText("u", cursorX, y + mainPx * 0.12);
}

function drawCanvasAxisLabelCuStress(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  stressUnit: string,
) {
  ctx.fillStyle = "#1e3a5f";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const mainPx = 28;
  const subPx = 18;
  ctx.font = `700 ${mainPx}px Inter, Arial, sans-serif`;
  const wC = ctx.measureText("c").width;
  ctx.font = `700 ${subPx}px Inter, Arial, sans-serif`;
  const wU = ctx.measureText("u").width;
  ctx.font = `700 ${mainPx}px Inter, Arial, sans-serif`;
  const suffix = ` (${stressUnit})`;
  const wSuf = ctx.measureText(suffix).width;
  const total = wC + wU + wSuf;
  let cursorX = centerX - total / 2;
  ctx.font = `700 ${mainPx}px Inter, Arial, sans-serif`;
  ctx.fillText("c", cursorX, y);
  cursorX += wC;
  ctx.font = `700 ${subPx}px Inter, Arial, sans-serif`;
  ctx.fillText("u", cursorX, y + mainPx * 0.12);
  cursorX += wU;
  ctx.font = `700 ${mainPx}px Inter, Arial, sans-serif`;
  ctx.fillText(suffix, cursorX, y);
}

function buildCuPlotPngDataUri({
  points,
  depthUnit,
  stressUnit,
}: {
  points: PlotPoint[];
  depthUnit: string;
  stressUnit: string;
}): string | null {
  if (!points.length || typeof document === "undefined") {
    return null;
  }

  const width = 1680;
  const height = 1080;
  const margin = { top: 120, right: 64, bottom: 132, left: 152 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...points.map((point) => point.depth), 1);
  const maxValue = Math.max(...points.map((point) => point.cu), 1);
  const xStep = getNiceTickStep(maxValue / 6);
  const xIntervals = Math.max(Math.floor(maxValue / xStep) + 1, 2);
  const xAxisMax = xStep * xIntervals;
  const yStep = getNiceTickStep(maxDepth / 7);
  const yIntervals = Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const yAxisMax = yStep * yIntervals;
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (value: number) => margin.top + (value / yAxisMax) * innerHeight;
  const boreholeIds = Array.from(new Set(points.map((point) => point.boreholeId)));
  const colourByBorehole = new Map<string, string>();
  boreholeIds.forEach((id, index) => {
    colourByBorehole.set(id, BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length]);
  });

  const hi = getHiDpiCanvas2D(width, height);
  if (!hi) {
    return null;
  }
  const { canvas, context } = hi;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  drawCanvasTitleDepthVsCu(context, margin.left, 58);

  drawCanvasAxisLabelCuStress(context, margin.left + innerWidth / 2, 92, stressUnit);

  context.strokeStyle = "#dbe5f1";
  context.lineWidth = 2;
  context.font = "600 24px Inter, Arial, sans-serif";
  context.fillStyle = "#36557f";
  for (let index = 0; index <= xIntervals; index += 1) {
    const value = xStep * index;
    const x = xScale(value);
    context.beginPath();
    context.moveTo(x, margin.top);
    context.lineTo(x, margin.top + innerHeight);
    context.stroke();
    context.textAlign = "center";
    context.fillText(String(Math.round(value)), x, margin.top - 16);
  }

  for (let index = 0; index <= yIntervals; index += 1) {
    const depth = yStep * index;
    const y = yScale(depth);
    context.beginPath();
    context.moveTo(margin.left, y);
    context.lineTo(margin.left + innerWidth, y);
    context.stroke();
    context.textAlign = "right";
    context.fillText(depth.toFixed(1), margin.left - 22, y + 8);
  }

  context.strokeStyle = "#7f98ba";
  context.lineWidth = 3.5;
  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left, margin.top + innerHeight);
  context.stroke();
  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left + innerWidth, margin.top);
  context.stroke();

  points.forEach((point) => {
    const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
    const x = xScale(point.cu);
    const y = yScale(point.depth);
    context.beginPath();
    context.fillStyle = "#ffffff";
    context.arc(x, y, 9.2, 0, 2 * Math.PI);
    context.fill();

    context.beginPath();
    context.strokeStyle = colour;
    context.lineWidth = 3;
    context.arc(x, y, 9.2, 0, 2 * Math.PI);
    context.stroke();

    context.beginPath();
    context.fillStyle = colour;
    context.arc(x, y, 4.2, 0, 2 * Math.PI);
    context.fill();
  });

  context.save();
  context.translate(42, margin.top + innerHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillStyle = "#1e3a5f";
  context.font = "700 28px Inter, Arial, sans-serif";
  context.fillText(`Depth (${depthUnit})`, 0, 0);
  context.restore();

  return canvas.toDataURL("image/png");
}

export function CuFromSptProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
}: CuFromSptProfileTabProps) {
  const [rows, setRows] = useState<CuFromSptRow[]>(initialRows);
  const [isProjectLocked, setIsProjectLocked] = useState(false);
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const hasImportedSelection = (importRows?.length ?? 0) > 0;
  const shouldLockImportedFields = isProjectLocked && hasImportedSelection;
  const lockHint = "Locked from Projects and Boreholes. Edit values in Account > Projects.";

  useEffect(() => {
    const syncLockState = () => setIsProjectLocked(isActiveProjectToolLocked());
    syncLockState();
    window.addEventListener("gih:active-project-changed", syncLockState);
    return () => {
      window.removeEventListener("gih:active-project-changed", syncLockState);
    };
  }, []);

  const n60ByBoreholeDepth = useMemo(() => {
    const map = new Map<string, number>();
    (projectParameters ?? []).forEach((parameter) => {
      if (parameter.parameterCode.toLowerCase() !== "n60" || !Number.isFinite(parameter.value)) {
        return;
      }
      const key = `${normaliseBoreholeLabelKey(parameter.boreholeLabel)}|${depthKey(parameter.sampleDepth)}`;
      if (!map.has(key)) {
        map.set(key, parameter.value);
      }
    });
    return map;
  }, [projectParameters]);
  const syncUnitSystem = useEffectEvent(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  });
  const syncImportedRows = useEffectEvent(() => {
    if (!importRows || importRows.length === 0) {
      return;
    }

    setRows((current) => {
      const template = current[0] ?? initialRows[0];
      return importRows.map((item, index) => {
        const boreholeId = item.boreholeLabel || template.boreholeId;
        const sampleDepthMetric = item.sampleTopDepth;
        const key = `${normaliseBoreholeLabelKey(boreholeId)}|${depthKey(sampleDepthMetric)}`;
        const n60Metric = n60ByBoreholeDepth.get(key);
        const hasImportedPi =
          item.piValue !== null && item.piValue !== undefined && Number.isFinite(item.piValue);

        return {
          ...template,
          id: index + 1,
          boreholeId,
          sampleDepth:
            sampleDepthMetric === null
              ? template.sampleDepth
              : convertInputValueBetweenSystems(String(sampleDepthMetric), "m", "metric", unitSystem),
          plasticityIndex: hasImportedPi ? String(item.piValue) : "",
          piSource: hasImportedPi ? "auto-project" : "manual",
          n60:
            typeof n60Metric === "number" && Number.isFinite(n60Metric)
              ? String(n60Metric)
              : template.n60,
          n60Source:
            typeof n60Metric === "number" && Number.isFinite(n60Metric)
              ? "auto-spt-corrections"
              : "manual",
        };
      });
    });
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, n60ByBoreholeDepth, unitSystem]);

  const updateRow = (id: number, patch: Partial<CuFromSptRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastDepth = current[current.length - 1]?.sampleDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          boreholeId: "",
          sampleDepth: String(parse(lastDepth) + 1.5),
          plasticityIndex: "25",
          piSource: "manual",
          n60: "15",
          n60Source: "manual",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const handleExportExcel = async () => {
    try {
      const exportRows = rows
        .filter(
          (row) =>
            !profileRowSoilRestricted(soilPolicyToolSlug, importRows, row.boreholeId, row.sampleDepth, unitSystem, parse),
        )
        .map((row) => {
          const sampleDepth = parse(row.sampleDepth);
          const pi = Math.max(0, parse(row.plasticityIndex));
          const n60 = Math.max(0, parse(row.n60));
          const f1 = interpolateStroudF1(pi);
          const cuMetric = f1 * n60;
          const cuDisplay = Number(convertInputValueBetweenSystems(String(cuMetric), "kPa", "metric", unitSystem));
          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            sampleDepth,
            pi,
            n60,
            f1,
            cuDisplay,
          };
        });

      const headerRow = [
        "Borehole ID",
        `Sample Depth (${depthUnit})`,
        "PI (%)",
        "N60",
        "f1",
        `c_u (${stressUnit})`,
      ]
        .map((label) => excelTextHeader(label))
        .join("");

      const tableRowsHtml = exportRows
        .map((row) => {
          const sd = Number.isFinite(row.sampleDepth) ? row.sampleDepth.toFixed(2) : "";
          const pi = Number.isFinite(row.pi) ? row.pi.toFixed(2) : "";
          const n60 = Number.isFinite(row.n60) ? row.n60.toFixed(2) : "";
          const f1 = Number.isFinite(row.f1) ? row.f1.toFixed(2) : "";
          const cu = Number.isFinite(row.cuDisplay) ? row.cuDisplay.toFixed(2) : "";
          return `<tr>
            ${excelTextCell(row.boreholeId)}
            ${excelTextCell(sd)}
            ${excelTextCell(pi)}
            ${excelTextCell(n60)}
            ${excelTextCell(f1)}
            ${excelTextCell(cu)}
          </tr>`;
        })
        .join("");

      const tableHtml = `<table><thead><tr>${headerRow}</tr></thead><tbody>${tableRowsHtml}</tbody></table>`;

      const plotPng = buildCuPlotPngDataUri({ points: plotPoints, depthUnit, stressUnit });
      const excelHtml = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <title>c_u from SPT and PI — Profile Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      ${EXCEL_TABLE_BLOCK_CSS}
      .chart-wrap { margin-top: 16px; }
      .chart-wrap img { width: 100%; max-width: 1200px; height: auto; display: block; border: 1px solid #cbd5e1; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>Undrained shear strength (c_u) from SPT and PI</h1>
    <p>Units: sample depth (${depthUnit}), c_u (${stressUnit}). Rows excluded by soil rules in Projects are omitted.</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    ${
      plotPng
        ? `<h2>Profile plot</h2><div class="chart-wrap"><img src="file:///cu-from-spt-plot.png" alt="Depth vs c_u" /></div>`
        : ""
    }
  </body>
</html>`;

      const payload =
        plotPng && plotPng.startsWith("data:image/png;base64,")
          ? buildMhtmlMultipartDocument(excelHtml, [{ contentLocation: "file:///cu-from-spt-plot.png", base64Png: plotPng }])
          : excelHtml;

      downloadBlob("cu-from-spt-profile-export.xls", new Blob([payload], { type: "application/vnd.ms-excel;charset=utf-8" }));
    } catch (e) {
      console.error(e);
      window.alert("Excel export failed. Please try again.");
    }
  };

  const plotPoints: PlotPoint[] = rows
    .map((row) => {
      if (profileRowSoilRestricted(soilPolicyToolSlug, importRows, row.boreholeId, row.sampleDepth, unitSystem, parse)) {
        return null;
      }
      const depthDisplay = parse(row.sampleDepth);
      const depthMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
      if (!Number.isFinite(depthMetric) || depthMetric < 0) {
        return null;
      }
      const pi = Math.max(0, parse(row.plasticityIndex));
      const n60 = Math.max(0, parse(row.n60));
      const f1 = interpolateStroudF1(pi);
      const cuMetric = f1 * n60;
      const cuDisplay = Number(convertInputValueBetweenSystems(String(cuMetric), "kPa", "metric", unitSystem));
      return {
        boreholeId: row.boreholeId?.trim() || "BH not set",
        depth: depthDisplay,
        pi,
        n60,
        f1,
        cu: cuDisplay,
      };
    })
    .filter((point): point is PlotPoint => point !== null);

  const reportTableRows: Array<Record<string, string>> = rows.map((row) => {
        const soilRestricted = profileRowSoilRestricted(
          soilPolicyToolSlug,
          importRows,
          row.boreholeId,
          row.sampleDepth,
          unitSystem,
          parse,
        );
        const borehole = row.boreholeId?.trim() || "BH not set";
        const depthDisplay = parse(row.sampleDepth);
        const depthStr = Number.isFinite(depthDisplay) ? depthDisplay.toFixed(2) : String(row.sampleDepth ?? "").trim() || "—";
        const pi = Math.max(0, parse(row.plasticityIndex));
        const depthKey = `Depth (${depthUnit})`;
        const cuKey = `cu (${stressUnit})`;
        if (soilRestricted) {
          return {
            Borehole: borehole,
            [depthKey]: depthStr,
            "PI (%)": pi.toFixed(2),
            N60: "—",
            f1: "—",
            [cuKey]: "—",
          };
        }
        const n60 = Math.max(0, parse(row.n60));
        const f1 = interpolateStroudF1(pi);
        const cuMetric = f1 * n60;
        const cuDisplay = Number(convertInputValueBetweenSystems(String(cuMetric), "kPa", "metric", unitSystem));
        return {
          Borehole: borehole,
          [depthKey]: depthStr,
          "PI (%)": pi.toFixed(2),
          N60: n60.toFixed(2),
          f1: f1.toFixed(2),
          [cuKey]: Number.isFinite(cuDisplay) ? cuDisplay.toFixed(2) : "—",
        };
      });

  useEffect(() => {
    if (!onReportDataChange) {
      return;
    }

    onReportDataChange({
      depthUnit,
      stressUnit,
      points: plotPoints,
      tableRows: reportTableRows,
      plotImageDataUrl: buildCuPlotPngDataUri({ points: plotPoints, depthUnit, stressUnit }),
    });
  }, [depthUnit, onReportDataChange, plotPoints, reportTableRows, stressUnit]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Layer Profile</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter PI and corrected N<sub>60</sub> by layer. The tool derives f<sub>1</sub> from Stroud (1974) PI anchors
          and computes c<sub>u</sub> = f<sub>1</sub>N<sub>60</sub> for each layer.
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          If available, N<sub>60</sub> is auto-filled from{" "}
          <span className="font-semibold">Standard Penetration Test (SPT) Corrections for N₆₀ and (N₁)₆₀</span>.
          Manual override is always allowed.
        </p>

        <ProfileTableScroll>
          <table className={profileTableClass("c7")}>
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Borehole ID" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Sample Depth" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="PI" unit="%" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>N<sub>60</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>f<sub>1</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>c<sub>u</sub></span>} unit={stressUnit} />
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const soilRestricted = profileRowSoilRestricted(
                  soilPolicyToolSlug,
                  importRows,
                  row.boreholeId,
                  row.sampleDepth,
                  unitSystem,
                  parse,
                );
                const matchedSoil = matchImportSummaryForProfileRow(
                  importRows,
                  row.boreholeId,
                  row.sampleDepth,
                  unitSystem,
                  parse,
                );
                const restrictionHint = soilRestrictionUserHint(soilPolicyToolSlug, matchedSoil?.soilBehavior ?? null);
                const shouldLockPi = shouldLockImportedFields && row.piSource === "auto-project";
                const depthLocked = shouldLockImportedFields || soilRestricted;
                const piLocked = shouldLockPi || soilRestricted;
                const n60Locked = soilRestricted;
                const pi = Math.max(0, parse(row.plasticityIndex));
                const n60 = Math.max(0, parse(row.n60));
                const f1 = interpolateStroudF1(pi);
                const cuMetric = f1 * n60;
                const cuDisplay = Number(convertInputValueBetweenSystems(String(cuMetric), "kPa", "metric", unitSystem));

                return (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-200 align-top ${soilRestricted ? "bg-slate-50/90 opacity-[0.85]" : "bg-white"}`}
                    title={soilRestricted ? "Soil type is not used with this tool (set under Projects)." : undefined}
                  >
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
                        variant="compact"
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
                        value={row.sampleDepth}
                        onChange={(event) => updateRow(row.id, { sampleDepth: event.target.value })}
                        disabled={depthLocked}
                        title={depthLocked ? (soilRestricted ? "Soil type is not used with this tool." : lockHint) : undefined}
                        className={cnProfileTableInput(depthLocked)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.plasticityIndex}
                          onChange={(event) =>
                            updateRow(row.id, {
                              plasticityIndex: event.target.value,
                              piSource: "manual",
                            })
                          }
                          disabled={piLocked}
                          title={piLocked ? (soilRestricted ? "Soil type is not used with this tool." : lockHint) : undefined}
                          className={cnProfileTableInput(piLocked)}
                        />
                        {row.piSource === "auto-project" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Auto-filled from Projects and Boreholes
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      {soilRestricted ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-2 py-1.5 text-[11px] leading-snug text-amber-950">
                          {restrictionHint ?? "Not used with this tool (soil type in Projects)."}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={row.n60}
                            onChange={(event) =>
                              updateRow(row.id, {
                                n60: event.target.value,
                                n60Source: "manual",
                              })
                            }
                            disabled={n60Locked}
                            title={n60Locked ? "Soil type is not used with this tool." : undefined}
                            className={cnProfileTableInput(n60Locked)}
                          />
                          {row.n60Source === "auto-spt-corrections" ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Auto-filled from SPT Corrections
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : f1.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : cuDisplay.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className={profileTableRemoveButtonClass}
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
            <tfoot className="border-t border-slate-200 bg-white">
              <tr>
                <td className="px-2 py-3 text-left align-top">
                  <button type="button" className={profileTableFooterButtonClass} onClick={addRow}>
                    Add Layer
                  </button>
                </td>
                <td colSpan={5} />
                <td className="px-2 py-3 text-right align-top">
                  <button type="button" className={profileTableFooterButtonClass} onClick={handleExportExcel}>
                    Export Excel
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </ProfileTableScroll>

        {plotPoints.length ? (
          <div className={profilePlotsSectionClass(1)}>
            <ExpandableProfilePlot className={profilePlotItemClass(1)}>
              {renderScatterChart({
                title: "Depth vs c\u1d64",
                xLabel: `c\u1d64 (${stressUnit})`,
                points: plotPoints,
                valueKey: "cu",
                depthUnit,
              })}
            </ExpandableProfilePlot>
          </div>
        ) : null}
      </div>
</section>
  );
}
