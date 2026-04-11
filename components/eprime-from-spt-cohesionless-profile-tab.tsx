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
import { profilePlotItemClass, profilePlotsSectionClass } from "@/lib/profile-plot-layout";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface EprimeFromSptCohesionlessProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  projectParameters?: Array<{
    boreholeLabel: string;
    sampleDepth: number | null;
    parameterCode: string;
    value: number;
  }>;
}

interface ProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  nValue: string;
  nSource?: "manual" | "auto-spt-corrections";
}

interface PlotPoint {
  boreholeId: string;
  depth: number;
  ePrime: number;
}

type CorrelationOption = {
  value: string;
  label: string;
  nType: "N60" | "N55";
};

const correlationOptions: CorrelationOption[] = [
  { value: "km-clean-1000n60", label: "Kulhawy & Mayne - clean sands: E' = 1000N60", nType: "N60" },
  { value: "km-silty-clayey-500n60", label: "Kulhawy & Mayne - silty/clayey sands: E' = 500N60", nType: "N60" },
  { value: "km-oc-clean-1500n60", label: "Kulhawy & Mayne - overconsolidated clean sands: E' = 1500N60", nType: "N60" },
  { value: "bw-nc-500-n55-plus15", label: "Bowles - normal sands: E' = 500(N55 + 15)", nType: "N55" },
  { value: "bw-nc-7000-sqrt-n55", label: "Bowles - normal sands: E' = 7000N55^0.5", nType: "N55" },
  { value: "bw-nc-6000-n55", label: "Bowles - normal sands: E' = 6000N55", nType: "N55" },
  { value: "bw-nc-15000-ln-n55", label: "Bowles - normal sands: E' = 15000ln(N55)", nType: "N55" },
  { value: "bw-nc-22000-ln-n55", label: "Bowles - normal sands: E' = 22000ln(N55)", nType: "N55" },
  { value: "bw-nc-2600-n55", label: "Bowles - normal sands: E' = 2600N55", nType: "N55" },
  { value: "bw-nc-2900-n55", label: "Bowles - normal sands: E' = 2900N55", nType: "N55" },
  { value: "bw-sat-250-n55-plus15", label: "Bowles - saturated sands: E' = 250(N55 + 15)", nType: "N55" },
  { value: "bw-gravel-1200-n55-plus6", label: "Bowles - gravelly sands: E' = 1200(N55 + 6)", nType: "N55" },
  { value: "bw-gravel-conditional", label: "Bowles - gravelly conditional branch", nType: "N55" },
  { value: "bw-clayey-320-n55-plus15", label: "Bowles - clayey sands: E' = 320(N55 + 15)", nType: "N55" },
  { value: "bw-silty-300-n55-plus6", label: "Bowles - silty sands/silts: E' = 300(N55 + 6)", nType: "N55" },
];

const initialRows: ProfileRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "1.5", nValue: "12", nSource: "manual" },
  { id: 2, boreholeId: "", sampleDepth: "3.0", nValue: "18", nSource: "manual" },
];

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitiseBoreholeLabel(value: string | null | undefined): string {
  return (value ?? "").replace(/[▼▾▿▲△]/g, "").replace(/\s+/g, " ").trim() || "BH not set";
}

function normaliseBoreholeLabelKey(value: string | null | undefined): string {
  return sanitiseBoreholeLabel(value).toLowerCase();
}

function depthKey(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "na";
}

function estimateEprimeFromCohesionlessSpt(correlation: string, n: number): number {
  switch (correlation) {
    case "km-silty-clayey-500n60":
      return 500 * n;
    case "km-clean-1000n60":
      return 1000 * n;
    case "km-oc-clean-1500n60":
      return 1500 * n;
    case "bw-nc-500-n55-plus15":
      return 500 * (n + 15);
    case "bw-nc-7000-sqrt-n55":
      return 7000 * Math.sqrt(n);
    case "bw-nc-6000-n55":
      return 6000 * n;
    case "bw-nc-15000-ln-n55":
      return 15000 * Math.log(n);
    case "bw-nc-22000-ln-n55":
      return 22000 * Math.log(n);
    case "bw-nc-2600-n55":
      return 2600 * n;
    case "bw-nc-2900-n55":
      return 2900 * n;
    case "bw-sat-250-n55-plus15":
      return 250 * (n + 15);
    case "bw-gravel-1200-n55-plus6":
      return 1200 * (n + 6);
    case "bw-gravel-conditional":
      return n <= 15 ? 600 * (n + 6) : 2000 + 600 * (n + 6);
    case "bw-clayey-320-n55-plus15":
      return 320 * (n + 15);
    case "bw-silty-300-n55-plus6":
      return 300 * (n + 6);
    default:
      return 1000 * n;
  }
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

function CorrelationPicker({
  value,
  onChange,
  options,
  nType,
}: {
  value: string;
  onChange: (next: string) => void;
  options: CorrelationOption[];
  nType: CorrelationOption["nType"];
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <span className="mb-1 block text-sm font-medium text-slate-700">Correlation option</span>
        <details ref={detailsRef} className="group">
          <summary
            className="list-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-colors duration-200 hover:bg-slate-50 focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-200"
            onClick={(event) => {
              event.preventDefault();
              if (!detailsRef.current) {
                return;
              }
              detailsRef.current.open = !detailsRef.current.open;
            }}
          >
            <span className="flex w-full items-center justify-between gap-3 text-left">
              <span className="min-w-0">
                <span className="block truncate">{selected.label}</span>
              </span>
              <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
            </span>
          </summary>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                  <th>Correlation</th>
                  <th className="w-[96px]">N type</th>
                  <th className="w-[92px]">Select</th>
                </tr>
              </thead>
              <tbody className="bg-white text-slate-800">
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <tr
                      key={option.value}
                      className={`border-t border-slate-200 ${
                        active ? "bg-emerald-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-2 align-top">
                        <span className="block text-[13px] font-semibold">{option.label}</span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {option.nType}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => {
                            onChange(option.value);
                            if (detailsRef.current) {
                              detailsRef.current.open = false;
                            }
                          }}
                          className={`inline-flex w-full items-center justify-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-4 transition-colors ${
                            active
                              ? "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          {active ? "Selected" : "Use"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        N type for this option: {nType}
      </div>
    </div>
  );
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
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
  const maxValue = Math.max(...points.map((point) => point.ePrime), 1);
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
      <h3 className="text-lg font-semibold text-slate-900">Depth vs E'</h3>
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
            <g key={`${point.boreholeId}-${point.depth}-${point.ePrime}-${index}`}>
              <circle cx={xScale(point.ePrime)} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
              <circle cx={xScale(point.ePrime)} cy={yScale(point.depth)} r={2.2} fill={colour} />
            </g>
          );
        })}
        <text x={margin.left + innerWidth / 2} y={24} textAnchor="middle" fontSize={12} fill="#1e3a5f" fontWeight={700}>
          E' ({stressUnit})
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

export function EprimeFromSptCohesionlessProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
}: EprimeFromSptCohesionlessProfileTabProps) {
  const [rows, setRows] = useState<ProfileRow[]>(initialRows);
  const [correlation, setCorrelation] = useState<string>("km-clean-1000n60");
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const selectedOption = correlationOptions.find((option) => option.value === correlation) ?? correlationOptions[0];

  const n60BySampleKey = useMemo(() => {
    const map = new Map<string, number>();
    (projectParameters ?? []).forEach((row) => {
      if (row.parameterCode !== "n60") {
        return;
      }
      const key = `${normaliseBoreholeLabelKey(row.boreholeLabel)}|${depthKey(row.sampleDepth)}`;
      map.set(key, row.value);
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
      })),
    );
    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

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
        sampleDepth:
          item.sampleTopDepth === null
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
        nValue: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          const n60 = n60BySampleKey.get(key);
          const fallback = item.nValue ?? null;
          const picked =
            selectedOption.nType === "N60"
              ? n60 ?? fallback
              : fallback;
          return picked === null || picked === undefined ? template.nValue : String(picked);
        })(),
        nSource: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          return selectedOption.nType === "N60" && n60BySampleKey.has(key) ? "auto-spt-corrections" : "manual";
        })(),
      }));
    });
  }, [importRows, unitSystem, n60BySampleKey, selectedOption.nType]);

  const updateRow = (id: number, patch: Partial<ProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastDepth = current[current.length - 1]?.sampleDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [...current, { id: nextId, boreholeId: "", sampleDepth: String(parse(lastDepth) + 1.5), nValue: "15" }];
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
          const nValue = parse(row.nValue);
          if (!Number.isFinite(depthMetric) || depthMetric < 0 || !Number.isFinite(nValue) || nValue <= 0) {
            return null;
          }
          if ((correlation === "bw-nc-15000-ln-n55" || correlation === "bw-nc-22000-ln-n55") && nValue <= 1) {
            return null;
          }

          const ePrimeMetric = estimateEprimeFromCohesionlessSpt(correlation, nValue);
          const ePrimeDisplay = Number(convertInputValueBetweenSystems(String(ePrimeMetric), "kPa", "metric", unitSystem));

          return { boreholeId: row.boreholeId?.trim() || "BH not set", depth: depthDisplay, ePrime: ePrimeDisplay };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem, correlation],
  );

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Select a cohesionless-soil SPT correlation, then enter depth and corrected SPT N values by sample. E' is computed
          with the selected equation and plotted against depth.
        </p>

        <ProfileTableScroll>
          <table className={profileTableClass("c5")}>
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th colSpan={5} className={profileTableThClass}>
                  <CorrelationPicker
                    value={correlation}
                    onChange={setCorrelation}
                    options={correlationOptions}
                    nType={selectedOption.nType}
                  />
                </th>
              </tr>
              <tr>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Borehole ID" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Sample Depth" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={selectedOption.nType} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="E'" unit={stressUnit} />
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
                const nValue = parse(row.nValue);
                const validLogInput =
                  correlation !== "bw-nc-15000-ln-n55" && correlation !== "bw-nc-22000-ln-n55" ? true : nValue > 1;
                const ePrimeMetric = validLogInput && nValue > 0 ? estimateEprimeFromCohesionlessSpt(correlation, nValue) : 0;
                const ePrimeDisplay = Number(convertInputValueBetweenSystems(String(ePrimeMetric), "kPa", "metric", unitSystem));

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
                        disabled={soilRestricted}
                        className={cnProfileTableInput(soilRestricted)}
                      />
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
                            min="0.1"
                            value={row.nValue}
                            onChange={(event) =>
                              updateRow(row.id, {
                                nValue: event.target.value,
                                nSource: "manual",
                              })
                            }
                            className={cnProfileTableInput(false)}
                          />
                          {selectedOption.nType === "N60" && row.nSource === "auto-spt-corrections" ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Auto-filled from SPT Corrections
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {soilRestricted ? (
                        <OutputCell value="—" />
                      ) : validLogInput ? (
                        <OutputCell value={ePrimeDisplay.toFixed(2)} />
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[12px] font-semibold text-amber-800">
                          N &gt; 1 required
                        </div>
                      )}
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
                <td colSpan={3} />
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
