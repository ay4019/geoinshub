"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface EprimeFromSptCohesionlessProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
}

interface ProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  nValue: string;
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
  { id: 1, boreholeId: "", sampleDepth: "1.5", nValue: "12" },
  { id: 2, boreholeId: "", sampleDepth: "3.0", nValue: "18" },
];

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function HeaderCell({ title, unit }: { title: ReactNode; unit?: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap leading-tight">
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
}: EprimeFromSptCohesionlessProfileTabProps) {
  const [rows, setRows] = useState<ProfileRow[]>(initialRows);
  const [correlation, setCorrelation] = useState<string>("km-clean-1000n60");
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const selectedOption = correlationOptions.find((option) => option.value === correlation) ?? correlationOptions[0];

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
      }));
    });
  }, [importRows, unitSystem]);

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

  const plotPoints: PlotPoint[] = rows
    .map((row) => {
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
    .filter((point): point is PlotPoint => point !== null);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Select a cohesionless-soil SPT correlation, then enter depth and corrected SPT N values by sample. E' is computed
          with the selected equation and plotted against depth.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Correlation option</label>
            <select
              value={correlation}
              onChange={(event) => setCorrelation(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {correlationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            N type for this option: {selectedOption.nType}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[12px] lg:text-[13px]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
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
                  <HeaderCell title={selectedOption.nType} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="E'" unit={stressUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const nValue = parse(row.nValue);
                const validLogInput =
                  correlation !== "bw-nc-15000-ln-n55" && correlation !== "bw-nc-22000-ln-n55" ? true : nValue > 1;
                const ePrimeMetric = validLogInput && nValue > 0 ? estimateEprimeFromCohesionlessSpt(correlation, nValue) : 0;
                const ePrimeDisplay = Number(convertInputValueBetweenSystems(String(ePrimeMetric), "kPa", "metric", unitSystem));

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
                        value={row.sampleDepth}
                        onChange={(event) => updateRow(row.id, { sampleDepth: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={row.nValue}
                        onChange={(event) => updateRow(row.id, { nValue: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      {validLogInput ? (
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
                        className="btn-base w-full px-2 py-1.5 text-sm"
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
                  <button type="button" className="btn-base px-3 py-1.5 text-sm" onClick={addRow}>
                    Add Layer
                  </button>
                </td>
                <td colSpan={3} />
                <td className="px-2 py-3 text-right align-top">
                  <button
                    type="button"
                    className="btn-base px-3 py-1.5 text-sm"
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
        </div>

        {plotPoints.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {renderScatterChart({ points: plotPoints, depthUnit, stressUnit })}
          </div>
        ) : null}
      </div>
</section>
  );
}
