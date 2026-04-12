"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { ExpandableProfilePlot } from "@/components/expandable-profile-plot";
import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import {
  cnProfileTableInput,
  ProfileTableHeaderCell,
  ProfileTableScroll,
  profileTableClassXl,
  profileTableFooterButtonClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";
import { isActiveProjectToolLocked, type SelectedBoreholeSummary } from "@/lib/project-boreholes";
import type { UnitSystem } from "@/lib/types";
import { profilePlotItemClass, profilePlotsSectionClass } from "@/lib/profile-plot-layout";
import { getHiDpiCanvas2D } from "@/lib/chart-canvas-hidpi";
import { buildMhtmlMultipartDocument, EXCEL_TABLE_BLOCK_CSS, excelTextCell, excelTextHeader } from "@/lib/excel-mhtml-export";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

export interface SptCorrectionsReportPayload {
  depthUnit: string;
  stressUnit: string;
  tableRows: Array<Record<string, string>>;
  plotImageDataUrlN60: string | null;
  plotImageDataUrlN160: string | null;
  /** Labels for Soil Profile Plot selections, embedded in the report narrative. */
  sptEquipment: {
    hammerTypeLabel: string;
    energyRatioLabel: string;
    boreholeDiameterLabel: string;
    samplerLabel: string;
  };
}

interface SptProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  onReportDataChange?: (payload: SptCorrectionsReportPayload) => void;
}

interface SptProfileRow {
  id: number;
  sampleDepth: string;
  boreholeId: string;
  nField: string;
}

interface SptPlotPoint {
  boreholeId: string;
  depth: number;
  n60: number;
  n160: number;
}

const BOREHOLE_DIAMETER_OPTIONS = [
  { label: "<115 mm (Cb = 1.00)", value: "lt115" },
  { label: "115-200 mm (Cb = 1.05)", value: "115to200" },
  { label: ">200 mm (Cb = 1.15)", value: "gt200" },
] as const;

const SAMPLER_OPTIONS = [
  { label: "Standard sampler with liner (Cs = 1.00)", value: "1.00" },
  { label: "Sampler without liner (Cs = 1.10)", value: "1.10" },
  { label: "Sampler without liner (Cs = 1.20)", value: "1.20" },
  { label: "Sampler without liner (Cs = 1.30)", value: "1.30" },
] as const;

const HAMMER_TYPE_OPTIONS = [
  { label: "Safety hammer (ER range: 60-117%)", value: "safety" },
  { label: "Donut hammer (ER range: 45-100%)", value: "donut" },
  { label: "Automatic trip hammer (ER range: 90-160%)", value: "automatic" },
] as const;

const ENERGY_RATIO_OPTIONS = [
  { label: "45%", value: "45" },
  { label: "55%", value: "55" },
  { label: "60%", value: "60" },
  { label: "70%", value: "70" },
  { label: "80%", value: "80" },
  { label: "90%", value: "90" },
  { label: "100%", value: "100" },
  { label: "117%", value: "117" },
  { label: "130%", value: "130" },
  { label: "160%", value: "160" },
] as const;

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: SptProfileRow[] = [
  { id: 1, sampleDepth: "1.5", boreholeId: "", nField: "12" },
  { id: 2, sampleDepth: "3.0", boreholeId: "", nField: "18" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Field N = 50 conventionally indicates SPT refusal (Refü); N60 and (N1)60 use 50 for screening. */
const SPT_FIELD_N_REFUSAL = 50;

const DEPTH_MATCH_EPS_M = 0.005;

function normaliseBoreholeKey(value: string): string {
  return (value ?? "").trim().toLowerCase();
}

/** When project samples are locked, GWT and γ use each import row matched by borehole label + sample depth (metric). */
function resolveGwtAndGammaMetricForRow(
  row: SptProfileRow,
  unitSystem: UnitSystem,
  importRows: SelectedBoreholeSummary[] | undefined,
  useProjectPerSample: boolean,
  fallbackGwtMetric: number,
  fallbackGammaMetric: number,
): { gwtMetric: number; gammaMetric: number } {
  if (!useProjectPerSample || !importRows?.length) {
    return { gwtMetric: fallbackGwtMetric, gammaMetric: fallbackGammaMetric };
  }

  const key = normaliseBoreholeKey(row.boreholeId);
  const depthDisplay = parse(row.sampleDepth);
  const depthMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
  if (!Number.isFinite(depthMetric) || depthMetric < 0) {
    return { gwtMetric: fallbackGwtMetric, gammaMetric: fallbackGammaMetric };
  }

  const sameLabel = importRows.filter((r) => normaliseBoreholeKey(r.boreholeLabel) === key);

  const byBhDepth = sameLabel.find(
    (r) =>
      r.sampleTopDepth !== null &&
      r.sampleTopDepth !== undefined &&
      Number.isFinite(r.sampleTopDepth) &&
      Math.abs(r.sampleTopDepth - depthMetric) < DEPTH_MATCH_EPS_M,
  );

  const resolved = byBhDepth ?? sameLabel[0] ?? null;

  if (!resolved) {
    return { gwtMetric: fallbackGwtMetric, gammaMetric: fallbackGammaMetric };
  }

  let gwtM = fallbackGwtMetric;
  let gamM = fallbackGammaMetric;

  if (typeof resolved.gwtDepth === "number" && Number.isFinite(resolved.gwtDepth)) {
    gwtM = resolved.gwtDepth;
  }
  if (typeof resolved.unitWeight === "number" && Number.isFinite(resolved.unitWeight)) {
    gamM = resolved.unitWeight;
  }

  return { gwtMetric: gwtM, gammaMetric: gamM };
}

function computeCnIdrissBoulanger2008(sigmaEffKpa: number): number {
  if (sigmaEffKpa <= 0) {
    return 0.4;
  }
  const raw = 9.78 * Math.sqrt(1 / sigmaEffKpa);
  return Math.max(0.4, Math.min(raw, 1.7));
}

function computeCrFromSampleDepth(sampleDepth: number): number {
  if (sampleDepth < 3) {
    return 0.75;
  }
  if (sampleDepth < 4) {
    return 0.8;
  }
  if (sampleDepth < 6) {
    return 0.85;
  }
  if (sampleDepth < 10) {
    return 0.95;
  }
  if (sampleDepth <= 30) {
    return 1;
  }
  return 0.95;
}

function computeCbFromBoreholeDiameterSelection(selection: string): number {
  if (selection === "lt115") {
    return 1.0;
  }
  if (selection === "115to200") {
    return 1.05;
  }
  if (selection === "gt200") {
    return 1.15;
  }

  const numeric = Number(selection);
  if (Number.isFinite(numeric)) {
    if (numeric > 200) {
      return 1.15;
    }
    if (numeric < 115) {
      return 1.0;
    }
    return 1.05;
  }

  return 1.0;
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

function buildScatterChartPngDataUri({
  title,
  xLabel,
  points,
  valueKey,
  depthUnit,
}: {
  title: string;
  xLabel: string;
  points: SptPlotPoint[];
  valueKey: "n60" | "n160";
  depthUnit: string;
}): string {
  if (!points.length) {
    return "";
  }

  const width = 1200;
  const height = 820;
  const margin = { top: 108, right: 56, bottom: 120, left: 130 };
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

  const hi = getHiDpiCanvas2D(width, height);
  if (!hi) {
    return "";
  }
  const { canvas, context } = hi;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#0f172a";
  context.font = "700 30px Georgia, 'Times New Roman', serif";
  context.fillText(title, margin.left, 52);

  context.fillStyle = "#1e3a5f";
  context.font = "700 23px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(xLabel, margin.left + innerWidth / 2, 84);
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

  points.forEach((point) => {
    const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
    const x = xScale(point[valueKey]);
    const y = yScale(point.depth);
    context.beginPath();
    context.fillStyle = "#ffffff";
    context.arc(x, y, 7.2, 0, 2 * Math.PI);
    context.fill();
    context.beginPath();
    context.strokeStyle = colour;
    context.lineWidth = 3;
    context.arc(x, y, 7.2, 0, 2 * Math.PI);
    context.stroke();
    context.beginPath();
    context.fillStyle = colour;
    context.arc(x, y, 3.2, 0, 2 * Math.PI);
    context.fill();
  });

  context.save();
  context.translate(42, margin.top + innerHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillStyle = "#1e3a5f";
  context.font = "700 23px Inter, Arial, sans-serif";
  context.fillText(`Depth (${depthUnit})`, 0, 0);
  context.restore();

  return canvas.toDataURL("image/png");
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
  points: SptPlotPoint[];
  valueKey: "n60" | "n160";
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

  const xTicks = Array.from({ length: xIntervals + 1 }, (_, index) => {
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
  });

  const yTicks = Array.from({ length: yIntervals + 1 }, (_, index) => {
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
  });

  const plottedPoints = points.map((point, index) => {
    const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
    return (
      <g key={`${point.boreholeId}-${point.depth}-${point[valueKey]}-${index}`}>
        <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
        <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={2.2} fill={colour} />
      </g>
    );
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
        {xTicks}
        {yTicks}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke="#7f98ba" strokeWidth={1.5} />
        <line x1={margin.left} y1={margin.top} x2={margin.left + innerWidth} y2={margin.top} stroke="#7f98ba" strokeWidth={1.5} />
        {plottedPoints}
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

export function SptProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug: _soilPolicyToolSlug,
  onReportDataChange,
}: SptProfileTabProps) {
  const [rows, setRows] = useState<SptProfileRow[]>(initialRows);
  const [globalHammerType, setGlobalHammerType] = useState("safety");
  const [globalBoreholeFactor, setGlobalBoreholeFactor] = useState("lt115");
  const [globalEnergyRatio, setGlobalEnergyRatio] = useState("70");
  const [globalSamplerFactor, setGlobalSamplerFactor] = useState("1.00");
  const [globalGroundwaterDepth, setGlobalGroundwaterDepth] = useState("1.5");
  const [globalUnitWeight, setGlobalUnitWeight] = useState("18.5");
  const [isProjectLocked, setIsProjectLocked] = useState(false);
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";
  const hasImportedSelection = (importRows?.length ?? 0) > 0;
  const shouldLockImportedFields = isProjectLocked && hasImportedSelection;
  const useProjectPerSampleGwtGamma = shouldLockImportedFields;
  const lockHint = "Locked from Projects and Boreholes. Edit values in Account > Projects.";
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
    setGlobalGroundwaterDepth((current) =>
      convertInputValueBetweenSystems(current, "m", previousUnitSystem.current, unitSystem),
    );
    setGlobalUnitWeight((current) =>
      convertInputValueBetweenSystems(current, "kN/m3", previousUnitSystem.current, unitSystem),
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
        const depth =
          item.sampleTopDepth === null
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem);
        const nField = item.nValue === null ? template.nField : String(item.nValue);

        return {
          ...template,
          id: index + 1,
          boreholeId: item.boreholeLabel || template.boreholeId,
          sampleDepth: depth,
          nField,
        };
      });
    });
  });

  useEffect(() => {
    const syncLockState = () => setIsProjectLocked(isActiveProjectToolLocked());
    syncLockState();
    window.addEventListener("gih:active-project-changed", syncLockState);
    return () => {
      window.removeEventListener("gih:active-project-changed", syncLockState);
    };
  }, []);

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<SptProfileRow>) => {
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
          sampleDepth: String(parse(lastDepth) + 1.5),
          boreholeId: "",
          nField: "15",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const ce = parse(globalEnergyRatio) / 60;
  const cb = computeCbFromBoreholeDiameterSelection(globalBoreholeFactor);
  const cs = parse(globalSamplerFactor);
  const fallbackGwtMetric = Number(convertInputValueBetweenSystems(globalGroundwaterDepth, "m", unitSystem, "metric"));
  const fallbackGammaMetric = Number(
    convertInputValueBetweenSystems(globalUnitWeight, "kN/m3", unitSystem, "metric"),
  );
  const plotPoints: SptPlotPoint[] = useMemo(
    () =>
      rows
        .map((row) => {
          const depthDisplay = parse(row.sampleDepth);
          const depthMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
          if (!Number.isFinite(depthMetric) || depthMetric < 0) {
            return null;
          }
          const { gwtMetric, gammaMetric } = resolveGwtAndGammaMetricForRow(
            row,
            unitSystem,
            importRows,
            useProjectPerSampleGwtGamma,
            fallbackGwtMetric,
            fallbackGammaMetric,
          );
          const sigmaEffMetric = Math.max(
            gammaMetric * depthMetric - 9.81 * Math.max(depthMetric - Math.max(gwtMetric, 0), 0),
            0.1,
          );
          const cr = computeCrFromSampleDepth(depthMetric);
          const fieldN = parse(row.nField);
          let n60Float = fieldN * ce * cb * cr * cs;
          const cn = computeCnIdrissBoulanger2008(sigmaEffMetric);
          let n160Float = Math.min(n60Float * cn, 2 * n60Float);
          if (fieldN === SPT_FIELD_N_REFUSAL) {
            n60Float = SPT_FIELD_N_REFUSAL;
            n160Float = SPT_FIELD_N_REFUSAL;
          }
          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            depth: depthDisplay,
            n60: Math.round(n60Float),
            n160: Math.round(n160Float),
          };
        })
        .filter((point): point is SptPlotPoint => point !== null),
    [
      rows,
      ce,
      cb,
      cs,
      unitSystem,
      importRows,
      useProjectPerSampleGwtGamma,
      fallbackGwtMetric,
      fallbackGammaMetric,
    ],
  );

  const exportRows = useMemo(
    () =>
      rows.map((row) => {
        const depthDisplay = parse(row.sampleDepth);
        const depthMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
        const { gwtMetric, gammaMetric } = resolveGwtAndGammaMetricForRow(
          row,
          unitSystem,
          importRows,
          useProjectPerSampleGwtGamma,
          fallbackGwtMetric,
          fallbackGammaMetric,
        );
        const sigmaEffMetric = Math.max(
          gammaMetric * depthMetric - 9.81 * Math.max(depthMetric - Math.max(gwtMetric, 0), 0),
          0.1,
        );
        const sigmaEffDisplay = Number(
          convertInputValueBetweenSystems(String(sigmaEffMetric), "kPa", "metric", unitSystem),
        );
        const cr = computeCrFromSampleDepth(depthMetric);
        const fieldN = parse(row.nField);
        let n60Float = fieldN * ce * cb * cr * cs;
        const cn = computeCnIdrissBoulanger2008(sigmaEffMetric);
        let n160Float = Math.min(n60Float * cn, 2 * n60Float);
        if (fieldN === SPT_FIELD_N_REFUSAL) {
          n60Float = SPT_FIELD_N_REFUSAL;
          n160Float = SPT_FIELD_N_REFUSAL;
        }

        return {
          boreholeId: row.boreholeId?.trim() || "BH not set",
          sampleDepth: depthDisplay.toFixed(2),
          nField: fieldN.toFixed(0),
          sigmaV0: sigmaEffDisplay.toFixed(2),
          ce: ce.toFixed(3),
          cb: cb.toFixed(3),
          cr: cr.toFixed(3),
          n60: String(Math.round(n60Float)),
          cn: cn.toFixed(3),
          n160: String(Math.round(n160Float)),
        };
      }),
    [
      rows,
      ce,
      cb,
      cs,
      unitSystem,
      importRows,
      useProjectPerSampleGwtGamma,
      fallbackGwtMetric,
      fallbackGammaMetric,
    ],
  );

  const sptEquipment = useMemo(() => {
    const hammerTypeLabel =
      HAMMER_TYPE_OPTIONS.find((o) => o.value === globalHammerType)?.label ?? `Hammer: ${globalHammerType}`;
    const energyRatioLabel = `${globalEnergyRatio}%`;
    const boreholeDiameterLabel =
      BOREHOLE_DIAMETER_OPTIONS.find((o) => o.value === globalBoreholeFactor)?.label ??
      `Borehole diameter class: ${globalBoreholeFactor}`;
    const samplerLabel =
      SAMPLER_OPTIONS.find((o) => o.value === globalSamplerFactor)?.label ?? `Sampler: ${globalSamplerFactor}`;
    return { hammerTypeLabel, energyRatioLabel, boreholeDiameterLabel, samplerLabel };
  }, [globalHammerType, globalEnergyRatio, globalBoreholeFactor, globalSamplerFactor]);

  useEffect(() => {
    if (!onReportDataChange) {
      return;
    }
    const n60Img =
      plotPoints.length > 0
        ? buildScatterChartPngDataUri({
            title: "Depth vs N₆₀",
            xLabel: "N₆₀ (blows)",
            points: plotPoints,
            valueKey: "n60",
            depthUnit,
          })
        : "";
    const n160Img =
      plotPoints.length > 0
        ? buildScatterChartPngDataUri({
            title: "Depth vs (N₁)₆₀",
            xLabel: "(N₁)₆₀ (blows)",
            points: plotPoints,
            valueKey: "n160",
            depthUnit,
          })
        : "";
    onReportDataChange({
      depthUnit,
      stressUnit,
      tableRows: exportRows.map((row) => ({
        boreholeId: row.boreholeId,
        sampleDepth: row.sampleDepth,
        nField: row.nField,
        sigmaV0: row.sigmaV0,
        ce: row.ce,
        cb: row.cb,
        cr: row.cr,
        n60: row.n60,
        cn: row.cn,
        n160: row.n160,
      })),
      plotImageDataUrlN60: n60Img ? n60Img : null,
      plotImageDataUrlN160: n160Img ? n160Img : null,
      sptEquipment,
    });
  }, [onReportDataChange, plotPoints, exportRows, depthUnit, stressUnit, sptEquipment]);

  const buildExportTableHtml = () => {
    const headerCells = [
      "Borehole ID",
      `Sample Depth (${depthUnit})`,
      "N",
      `sigma'_v0 (${stressUnit})`,
      "C_E",
      "C_b",
      "C_r",
      "N60",
      "C_N",
      "(N1)60",
    ]
      .map((label) => excelTextHeader(label))
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            ${excelTextCell(row.boreholeId)}
            ${excelTextCell(row.sampleDepth)}
            ${excelTextCell(row.nField)}
            ${excelTextCell(row.sigmaV0)}
            ${excelTextCell(row.ce)}
            ${excelTextCell(row.cb)}
            ${excelTextCell(row.cr)}
            ${excelTextCell(row.n60)}
            ${excelTextCell(row.cn)}
            ${excelTextCell(row.n160)}
          </tr>
        `,
      )
      .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const buildExcelMhtmlDocument = () => {
    const tableHtml = buildExportTableHtml();
    const n60Img = buildScatterChartPngDataUri({
      title: "Depth vs N₆₀",
      xLabel: "N₆₀ (blows)",
      points: plotPoints,
      valueKey: "n60",
      depthUnit,
    });
    const n160Img = buildScatterChartPngDataUri({
      title: "Depth vs (N₁)₆₀",
      xLabel: "(N₁)₆₀ (blows)",
      points: plotPoints,
      valueKey: "n160",
      depthUnit,
    });

    const excelHtml = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <title>SPT Profile Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      ${EXCEL_TABLE_BLOCK_CSS}
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
      .chart-grid img { width: 100%; max-width: 1200px; height: auto; display: block; border: 1px solid #cbd5e1; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>SPT Soil Profile Export</h1>
    <p>SPT correction summary with depth-based C_r assignment and automatic effective stress.</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    <h2>Profile plots</h2>
    <div class="chart-grid">
      <div><img src="file:///spt-n60.png" alt="Depth vs N60 plot" /></div>
      <div><img src="file:///spt-n160.png" alt="Depth vs (N1)60 plot" /></div>
    </div>
  </body>
</html>`;

    if (!n60Img.startsWith("data:image/png;base64,") || !n160Img.startsWith("data:image/png;base64,")) {
      return excelHtml;
    }

    return buildMhtmlMultipartDocument(excelHtml, [
      { contentLocation: "file:///spt-n60.png", base64Png: n60Img },
      { contentLocation: "file:///spt-n160.png", base64Png: n160Img },
    ]);
  };

  const handleExportExcel = () => {
    try {
      const payload = buildExcelMhtmlDocument();
      downloadBlob("spt-soil-profile-export.xls", new Blob([payload], { type: "application/vnd.ms-excel;charset=utf-8" }));
    } catch (error) {
      console.error(error);
      window.alert("Excel export failed. Please try again.");
    }
  };
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="max-w-4xl">
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {shouldLockImportedFields ? (
                <>
                  GWT and bulk unit weight (BHA) come from Account → Projects for each row (matched by Borehole ID and
                  sample depth). Vertical effective stress uses those values with sample depth. C<sub>r</sub> is assigned
                  from sample depth ranges, and overburden correction follows Idriss and Boulanger (2008), with 0.40 &le;{" "}
                  C<sub>N</sub> &le; 1.70.
                </>
              ) : (
                <>
                  Vertical effective stress is computed automatically from sample depth, GWT, and bulk unit weight
                  (BHA). C<sub>r</sub> is assigned from sample depth ranges, and overburden correction follows Idriss and
                  Boulanger (2008), with 0.40 &le; C<sub>N</sub> &le; 1.70.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <div className="min-w-0">
            <label htmlFor="spt-hammer-type" className="mb-1 block text-xs font-medium text-slate-700">
              Hammer type
            </label>
            <select
              id="spt-hammer-type"
              value={globalHammerType}
              onChange={(event) => setGlobalHammerType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {HAMMER_TYPE_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-energy-ratio" className="mb-1 block text-xs font-medium text-slate-700">
              Hammer efficiency, ER (%)
            </label>
            <select
              id="spt-energy-ratio"
              value={globalEnergyRatio}
              onChange={(event) => setGlobalEnergyRatio(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {ENERGY_RATIO_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-borehole-diameter" className="mb-1 block text-xs font-medium text-slate-700">
              Borehole diameter
            </label>
            <select
              id="spt-borehole-diameter"
              value={globalBoreholeFactor}
              onChange={(event) => setGlobalBoreholeFactor(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {BOREHOLE_DIAMETER_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-sampler-type" className="mb-1 block text-xs font-medium text-slate-700">
              Sampler type
            </label>
            <select
              id="spt-sampler-type"
              value={globalSamplerFactor}
              onChange={(event) => setGlobalSamplerFactor(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {SAMPLER_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {shouldLockImportedFields ? (
            <div className="min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2 2xl:col-span-2">
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
                <span className="font-semibold">GWT &amp; BHA (per sample)</span>
                <span className="block mt-1 text-sky-900/90">
                  Values are taken from Account → Projects for each borehole and sample depth. Edit them there if needed.
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <label htmlFor="spt-gwt" className="mb-1 block text-xs font-medium text-slate-700">
                  Groundwater depth, GWT ({depthUnit})
                </label>
                <input
                  id="spt-gwt"
                  type="number"
                  min="0"
                  step="0.1"
                  value={globalGroundwaterDepth}
                  onChange={(event) => setGlobalGroundwaterDepth(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="spt-bha" className="mb-1 block text-xs font-medium text-slate-700">
                  Bulk unit weight, BHA ({unitWeightUnit})
                </label>
                <input
                  id="spt-bha"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={globalUnitWeight}
                  onChange={(event) => setGlobalUnitWeight(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                />
              </div>
            </>
          )}
        </div>

        <ProfileTableScroll>
          <table className={profileTableClassXl("c11")}>
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
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
                  <ProfileTableHeaderCell title="N" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell
                    title={
                      <span>
                        &sigma;&prime;<sub>v0</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>C<sub>E</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>C<sub>b</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>C<sub>r</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>N<sub>60</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>C<sub>N</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell
                    title={
                      <span>
                        (N<sub>1</sub>)<sub>60</sub>
                      </span>
                    }
                  />
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sampleDepthParsed = parse(row.sampleDepth);
                const sampleDepthMetric = Number(
                  convertInputValueBetweenSystems(String(sampleDepthParsed), "m", unitSystem, "metric"),
                );
                const { gwtMetric, gammaMetric } = resolveGwtAndGammaMetricForRow(
                  row,
                  unitSystem,
                  importRows,
                  useProjectPerSampleGwtGamma,
                  fallbackGwtMetric,
                  fallbackGammaMetric,
                );
                const sigmaEffMetric = Math.max(
                  gammaMetric * sampleDepthMetric - 9.81 * Math.max(sampleDepthMetric - Math.max(gwtMetric, 0), 0),
                  0.1,
                );
                const sigmaEffDisplay = Number(
                  convertInputValueBetweenSystems(String(sigmaEffMetric), "kPa", "metric", unitSystem),
                );
                const cr = computeCrFromSampleDepth(sampleDepthMetric);
                const fieldN = parse(row.nField);
                let n60Float = fieldN * ce * cb * cr * cs;
                const cn = computeCnIdrissBoulanger2008(sigmaEffMetric);
                let n160Float = Math.min(n60Float * cn, 2 * n60Float);
                if (fieldN === SPT_FIELD_N_REFUSAL) {
                  n60Float = SPT_FIELD_N_REFUSAL;
                  n160Float = SPT_FIELD_N_REFUSAL;
                }
                const n60 = Math.round(n60Float);
                const n160 = Math.round(n160Float);

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
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
                        disabled={shouldLockImportedFields}
                        title={shouldLockImportedFields ? lockHint : undefined}
                        className={cnProfileTableInput(shouldLockImportedFields)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.nField}
                        onChange={(event) => updateRow(row.id, { nField: event.target.value })}
                        disabled={shouldLockImportedFields}
                        title={shouldLockImportedFields ? lockHint : undefined}
                        className={cnProfileTableInput(shouldLockImportedFields)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={sigmaEffDisplay.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(ce) ? ce.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cb) ? cb.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cr) ? cr.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(n60Float) ? String(n60) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cn) ? cn.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(n160Float) ? String(n160) : "-"} />
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
                    Add Sample
                  </button>
                </td>
                <td colSpan={9} />
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
          <div className={profilePlotsSectionClass(2)}>
            <ExpandableProfilePlot className={profilePlotItemClass(2)}>
              {renderScatterChart({
                title: "Depth vs N₆₀",
                xLabel: "N₆₀ (blows)",
                points: plotPoints,
                valueKey: "n60",
                depthUnit,
              })}
            </ExpandableProfilePlot>
            <ExpandableProfilePlot className={profilePlotItemClass(2)}>
              {renderScatterChart({
                title: "Depth vs (N₁)₆₀",
                xLabel: "(N₁)₆₀ (blows)",
                points: plotPoints,
                valueKey: "n160",
                depthUnit,
              })}
            </ExpandableProfilePlot>
          </div>
        ) : null}

      </div>
</section>
  );
}
