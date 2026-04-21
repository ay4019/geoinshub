"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ExpandableProfilePlot } from "@/components/expandable-profile-plot";
import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import {
  ProfileTableHeaderCell,
  ProfileTableScroll,
  cnProfileTableInput,
  profileTableClass,
  profileTableFooterButtonClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";
import { getHiDpiCanvas2D } from "@/lib/chart-canvas-hidpi";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import { isActiveProjectToolLocked, type SelectedBoreholeSummary } from "@/lib/project-boreholes";
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { profilePlotItemClass, profilePlotsSectionClass } from "@/lib/profile-plot-layout";
import { stroudF1FromPi } from "@/lib/tool-calculations";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface CprimeFromCuRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  soilType: "nc-clay" | "sand-gravel";
  cu: string;
  cuSource: "manual" | "auto";
  cuSourceLabel: string | null;
}

interface PlotPoint {
  boreholeId: string;
  depth: number;
  cprime: number;
}

export interface CprimeFromCuReportPayload {
  depthUnit: string;
  stressUnit: string;
  methodNarrative: string;
  points: PlotPoint[];
  tableRows: Array<Record<string, string>>;
  plotImageDataUrl: string | null;
}

interface CprimeFromCuProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  projectParameters?: Array<{
    boreholeLabel: string;
    sampleDepth: number | null;
    parameterCode: string;
    value: number;
    sourceToolSlug?: string | null;
  }>;
  onReportDataChange?: (payload: CprimeFromCuReportPayload) => void;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];
const DEFAULT_NC_CLAY_CPRIME_KPA = 5;

const initialRows: CprimeFromCuRow[] = [
  {
    id: 1,
    boreholeId: "",
    sampleDepth: "1.5",
    soilType: "nc-clay",
    cu: "80",
    cuSource: "manual",
    cuSourceLabel: null,
  },
  {
    id: 2,
    boreholeId: "",
    sampleDepth: "3.0",
    soilType: "nc-clay",
    cu: "140",
    cuSource: "manual",
    cuSourceLabel: null,
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

function sourceToolLabel(sourceToolSlug: string | null | undefined): string {
  const slug = (sourceToolSlug ?? "").trim();
  if (!slug) {
    return "Saved project parameter";
  }
  if (slug === "cu-from-pi-and-spt") {
    return "Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI)";
  }
  return slug;
}

const CU_FROM_PI_SPT_LABEL = "Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI)";

function clampNcClayCprime(valueMetric: number): number {
  if (!Number.isFinite(valueMetric)) {
    return DEFAULT_NC_CLAY_CPRIME_KPA;
  }
  return Math.min(Math.max(valueMetric, 0), 5);
}

function estimateCprime({
  cuMetric,
  soilType,
  useCuFactor,
  ncClayCprimeMetric,
}: {
  cuMetric: number;
  soilType: CprimeFromCuRow["soilType"];
  useCuFactor: boolean;
  ncClayCprimeMetric: number;
}): number | null {
  if (useCuFactor) {
    return Number.isFinite(cuMetric) && cuMetric > 0 ? 0.1 * cuMetric : null;
  }
  if (soilType === "sand-gravel") {
    return 0;
  }
  return clampNcClayCprime(ncClayCprimeMetric);
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

function renderScatterChart({
  points,
  depthUnit,
  stressUnit,
}: {
  points: PlotPoint[];
  depthUnit: string;
  stressUnit: string;
}) {
  const width = 560;
  const height = 360;
  const margin = { top: 54, right: 20, bottom: 24, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...points.map((point) => point.depth), 1);
  const maxValue = Math.max(...points.map((point) => point.cprime), 1);
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
      <h3 className="text-lg font-semibold text-slate-900">Depth vs c′</h3>
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
            <g key={`${point.boreholeId}-${point.depth}-${point.cprime}-${index}`}>
              <circle cx={xScale(point.cprime)} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
              <circle cx={xScale(point.cprime)} cy={yScale(point.depth)} r={2.2} fill={colour} />
            </g>
          );
        })}
        <text x={margin.left + innerWidth / 2} y={24} textAnchor="middle" fontSize={12} fill="#1e3a5f" fontWeight={700}>
          c′ ({stressUnit})
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

function drawCanvasTitleDepthVsCprime(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const mainPx = 38;
  ctx.font = `700 ${mainPx}px Georgia, "Times New Roman", serif`;
  ctx.fillText("Depth vs c′", x, y);
}

function drawCanvasAxisLabelCprimeStress(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  stressUnit: string,
) {
  ctx.fillStyle = "#1e3a5f";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const mainPx = 28;
  ctx.font = `700 ${mainPx}px Inter, Arial, sans-serif`;
  const label = `c′ (${stressUnit})`;
  const w = ctx.measureText(label).width;
  ctx.fillText(label, centerX - w / 2, y);
}

function buildCprimePlotPngDataUri({
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
  const maxValue = Math.max(...points.map((point) => point.cprime), 1);
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
  drawCanvasTitleDepthVsCprime(context, margin.left, 58);

  drawCanvasAxisLabelCprimeStress(context, margin.left + innerWidth / 2, 92, stressUnit);

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
    const x = xScale(point.cprime);
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

export function CprimeFromCuProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
}: CprimeFromCuProfileTabProps) {
  const [rows, setRows] = useState<CprimeFromCuRow[]>(initialRows);
  const [useCuFactor, setUseCuFactor] = useState(false);
  const [ncClayCprime, setNcClayCprime] = useState(String(DEFAULT_NC_CLAY_CPRIME_KPA));
  const [isProjectLocked, setIsProjectLocked] = useState(() =>
    typeof window !== "undefined" ? isActiveProjectToolLocked() : false,
  );
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const hasImportedSelection = (importRows?.length ?? 0) > 0;
  const shouldLockImportedFields = isProjectLocked && hasImportedSelection;
  const lockHint = "Locked from Projects and Boreholes. Edit values in Account > Projects.";
  const ncClayCprimeDisplay = parse(ncClayCprime);
  const ncClayCprimeMetric = clampNcClayCprime(
    Number(convertInputValueBetweenSystems(String(ncClayCprimeDisplay), "kPa", unitSystem, "metric")),
  );
  const ncClayCprimeMaxDisplay = convertInputValueBetweenSystems(
    String(DEFAULT_NC_CLAY_CPRIME_KPA),
    "kPa",
    "metric",
    unitSystem,
  );
  const ncClayCprimeReportDisplay = convertInputValueBetweenSystems(
    String(ncClayCprimeMetric),
    "kPa",
    "metric",
    unitSystem,
  );

  useEffect(() => {
    const syncLockState = () => setIsProjectLocked(isActiveProjectToolLocked());
    window.addEventListener("gih:active-project-changed", syncLockState);
    return () => {
      window.removeEventListener("gih:active-project-changed", syncLockState);
    };
  }, []);

  const cuByBoreholeDepth = useMemo(() => {
    const map = new Map<string, { value: number; sourceToolSlug: string | null }>();
    (projectParameters ?? []).forEach((parameter) => {
      if (parameter.parameterCode.toLowerCase() !== "cu" || !Number.isFinite(parameter.value)) {
        return;
      }
      const key = `${normaliseBoreholeLabelKey(parameter.boreholeLabel)}|${depthKey(parameter.sampleDepth)}`;
      if (!map.has(key)) {
        map.set(key, {
          value: parameter.value,
          sourceToolSlug: parameter.sourceToolSlug ?? null,
        });
      }
    });
    return map;
  }, [projectParameters]);

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

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
        cu: convertInputValueBetweenSystems(row.cu, "kPa", previousUnitSystem.current, unitSystem),
      })),
    );
    setNcClayCprime((current) =>
      convertInputValueBetweenSystems(current, "kPa", previousUnitSystem.current, unitSystem),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  useEffect(() => {
    if (!importRows || importRows.length === 0) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- rows mirror imported project samples when selection changes
    setRows((current) => {
      const template = current[0] ?? initialRows[0];
      return importRows.map((item, index) => {
        const boreholeId = item.boreholeLabel || template.boreholeId;
        const sampleDepthMetric = item.sampleTopDepth;
        const key = `${normaliseBoreholeLabelKey(boreholeId)}|${depthKey(sampleDepthMetric)}`;
        const cuEntry = cuByBoreholeDepth.get(key);
        const n60Metric = n60ByBoreholeDepth.get(key);
        const hasImportedPi =
          item.piValue !== null && item.piValue !== undefined && Number.isFinite(item.piValue);

        let cuMetric: number | undefined;
        let cuSourceLabel: string | null = null;

        if (cuEntry && typeof cuEntry.value === "number" && Number.isFinite(cuEntry.value)) {
          cuMetric = cuEntry.value;
          cuSourceLabel = sourceToolLabel(cuEntry.sourceToolSlug);
        } else if (
          hasImportedPi &&
          typeof n60Metric === "number" &&
          Number.isFinite(n60Metric) &&
          n60Metric > 0
        ) {
          const f1 = stroudF1FromPi(item.piValue as number);
          cuMetric = f1 * n60Metric;
          cuSourceLabel = CU_FROM_PI_SPT_LABEL;
        }

        return {
          ...template,
          id: index + 1,
          boreholeId,
          soilType: item.soilBehavior === "granular" ? "sand-gravel" : "nc-clay",
          sampleDepth:
            sampleDepthMetric === null
              ? template.sampleDepth
              : convertInputValueBetweenSystems(String(sampleDepthMetric), "m", "metric", unitSystem),
          cu:
            typeof cuMetric === "number" && Number.isFinite(cuMetric)
              ? convertInputValueBetweenSystems(String(cuMetric), "kPa", "metric", unitSystem)
              : template.cu,
          cuSource: typeof cuMetric === "number" && Number.isFinite(cuMetric) ? "auto" : "manual",
          cuSourceLabel: typeof cuMetric === "number" && Number.isFinite(cuMetric) ? cuSourceLabel : null,
        };
      });
    });
  }, [cuByBoreholeDepth, importRows, n60ByBoreholeDepth, unitSystem]);

  const updateRow = (id: number, patch: Partial<CprimeFromCuRow>) => {
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
          soilType: current[current.length - 1]?.soilType ?? "nc-clay",
          cu: "100",
          cuSource: "manual",
          cuSourceLabel: null,
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const plotPoints: PlotPoint[] = useMemo(
    () =>
      rows
        .map((row) => {
          if (profileRowSoilRestricted(soilPolicyToolSlug, importRows, row.boreholeId, row.sampleDepth, unitSystem, parse)) {
            return null;
          }
          const depthDisplay = parse(row.sampleDepth);
          const depthMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
          const cuDisplay = parse(row.cu);
          const cuMetric = Number(convertInputValueBetweenSystems(String(cuDisplay), "kPa", unitSystem, "metric"));
          if (!Number.isFinite(depthMetric) || depthMetric < 0) {
            return null;
          }

          const cprimeMetric = estimateCprime({
            cuMetric,
            soilType: row.soilType,
            useCuFactor,
            ncClayCprimeMetric,
          });
          if (cprimeMetric === null) {
            return null;
          }
          const cprimeDisplay = Number(
            convertInputValueBetweenSystems(String(cprimeMetric), "kPa", "metric", unitSystem),
          );

          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            depth: depthDisplay,
            cprime: cprimeDisplay,
          };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem, useCuFactor, ncClayCprimeMetric],
  );

  const reportTableRows: Array<Record<string, string>> = useMemo(
    () =>
      rows.map((row) => {
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
        const depthKey = `Depth (${depthUnit})`;
        const soilKey = "Soil type";
        const methodKey = "c′ method";
        const cuKey = `cu (${stressUnit})`;
        const cpKey = `c′ (${stressUnit})`;
        if (soilRestricted) {
          return {
            Borehole: borehole,
            [depthKey]: depthStr,
            [soilKey]: row.soilType === "sand-gravel" ? "Sand / gravel" : "NC clay",
            [methodKey]: useCuFactor ? "0.1cu" : "Soil-type default",
            [cuKey]: "—",
            [cpKey]: "—",
          };
        }
        const cuDisplay = parse(row.cu);
        const cuMetric = Number(convertInputValueBetweenSystems(String(cuDisplay), "kPa", unitSystem, "metric"));
        const cprimeMetric = estimateCprime({
          cuMetric,
          soilType: row.soilType,
          useCuFactor,
          ncClayCprimeMetric,
        });
        const cprimeDisplay = Number(
          convertInputValueBetweenSystems(String(cprimeMetric ?? 0), "kPa", "metric", unitSystem),
        );
        return {
          Borehole: borehole,
          [depthKey]: depthStr,
          [soilKey]: row.soilType === "sand-gravel" ? "Sand / gravel" : "NC clay",
          [methodKey]: useCuFactor ? "0.1cu" : "Soil-type default",
          [cuKey]: Number.isFinite(cuDisplay) ? cuDisplay.toFixed(2) : "—",
          [cpKey]: cprimeMetric !== null && Number.isFinite(cprimeDisplay) ? cprimeDisplay.toFixed(2) : "—",
        };
      }),
    [rows, depthUnit, stressUnit, unitSystem, soilPolicyToolSlug, importRows, useCuFactor, ncClayCprimeMetric],
  );

  useEffect(() => {
    if (!onReportDataChange) {
      return;
    }
    onReportDataChange({
      depthUnit,
      stressUnit,
      methodNarrative: useCuFactor
        ? "In this report, the optional empirical relationship c′ = 0.1 × c_u was selected; therefore, the reported c′ values are derived directly from the entered or imported c_u values."
        : `In this report, the soil-type default option was selected; NC clay rows use c′ = ${ncClayCprimeReportDisplay} ${stressUnit} within the low default range, and sand / gravel rows use c′ = 0 ${stressUnit}.`,
      points: plotPoints,
      tableRows: reportTableRows,
      plotImageDataUrl: buildCprimePlotPngDataUri({ points: plotPoints, depthUnit, stressUnit }),
    });
  }, [
    depthUnit,
    ncClayCprimeReportDisplay,
    onReportDataChange,
    plotPoints,
    reportTableRows,
    stressUnit,
    useCuFactor,
  ]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          By default, normally consolidated clay uses a selected low c′ value within 0-{ncClayCprimeMaxDisplay}{" "}
          {stressUnit}, while sand / gravel uses c′ = 0. Use the optional c′ = 0.1c<sub>u</sub> path only when that
          empirical interpretation is intended.
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          When samples are imported from <span className="font-semibold">Projects and Boreholes</span> with the project
          tool lock enabled, sample depth is read-only here (edit under Account &gt; Projects). c<sub>u</sub> is filled from
          saved project parameters when present; otherwise, when the sample has PI and N<sub>60</sub> exists for that
          depth (e.g. from SPT corrections saved to the project), c<sub>u</sub> is computed as f<sub>1</sub> × N
          <sub>60</sub> like <span className="font-semibold">{CU_FROM_PI_SPT_LABEL}</span>. You can still override{" "}
          c<sub>u</sub> manually.
        </p>

        <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(150px,220px)] sm:items-end">
          <label className="flex items-start gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={useCuFactor}
              onChange={(event) => setUseCuFactor(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <span>
              Use c′ = 0.1c<sub>u</sub> empirical alternative for all rows
            </span>
          </label>
          <label className="text-sm font-medium text-slate-700">
            <span className="mb-1 block">NC clay c′ default ({stressUnit})</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max={ncClayCprimeMaxDisplay}
              value={ncClayCprime}
              onChange={(event) => setNcClayCprime(event.target.value)}
              disabled={useCuFactor}
              className={cnProfileTableInput(useCuFactor)}
            />
          </label>
        </div>

        <ProfileTableScroll>
          <table className={profileTableClass("c6")}>
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[20%]" />
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
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
                  <ProfileTableHeaderCell title="Soil type" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>c<sub>u</sub></span>} unit={stressUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell
                    title={useCuFactor ? <span>c′ = 0.1c<sub>u</sub></span> : <span>c′ default</span>}
                    unit={stressUnit}
                  />
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
                const rowLocked = shouldLockImportedFields || soilRestricted;
                const cuDisplay = parse(row.cu);
                const cuMetric = Number(convertInputValueBetweenSystems(String(cuDisplay), "kPa", unitSystem, "metric"));
                const cprimeMetric = estimateCprime({
                  cuMetric,
                  soilType: row.soilType,
                  useCuFactor,
                  ncClayCprimeMetric,
                });
                const cprimeRowDisplay = Number(
                  convertInputValueBetweenSystems(String(cprimeMetric ?? 0), "kPa", "metric", unitSystem),
                );

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
                        disabled={rowLocked}
                        title={rowLocked ? (soilRestricted ? "Soil type is not used with this tool." : lockHint) : undefined}
                        className={cnProfileTableInput(rowLocked)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={row.soilType}
                        onChange={(event) =>
                          updateRow(row.id, { soilType: event.target.value === "sand-gravel" ? "sand-gravel" : "nc-clay" })
                        }
                        disabled={shouldLockImportedFields}
                        title={shouldLockImportedFields ? lockHint : undefined}
                        className={cnProfileTableInput(shouldLockImportedFields)}
                      >
                        <option value="nc-clay">NC clay (0-5)</option>
                        <option value="sand-gravel">Sand / gravel (0)</option>
                      </select>
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
                            value={row.cu}
                            onChange={(event) =>
                              updateRow(row.id, {
                                cu: event.target.value,
                                cuSource: "manual",
                                cuSourceLabel: null,
                              })
                            }
                            className={cnProfileTableInput(false)}
                          />
                          {row.cuSource === "auto" && row.cuSourceLabel ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Auto-filled from {row.cuSourceLabel}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted || cprimeMetric === null ? "—" : cprimeRowDisplay.toFixed(2)} />
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
                <td colSpan={4} />
                <td className="px-2 py-3 text-right align-top">
                  <button
                    type="button"
                    className={profileTableFooterButtonClass}
                    onClick={(event) => {
                      void exportProfileExcelFromSection(event.currentTarget);
                    }}
                  >
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
              {renderScatterChart({ points: plotPoints, depthUnit, stressUnit })}
            </ExpandableProfilePlot>
          </div>
        ) : null}
      </div>
</section>
  );
}
