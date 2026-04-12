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

interface EuFromSptProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  projectParameters?: Array<{
    boreholeLabel: string | null;
    sampleDepth: number | null;
    parameterCode: string;
    value: number | null;
  }>;
}

interface EuFromSptRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  n60: string;
  euN60Ratio: string;
  n60Source?: "manual" | "auto-spt-corrections";
}

interface PlotPoint {
  boreholeId: string;
  depth: number;
  eu: number;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: EuFromSptRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "1.5", n60: "12", euN60Ratio: "1100", n60Source: "manual" },
  { id: 2, boreholeId: "", sampleDepth: "3.0", n60: "18", euN60Ratio: "1100", n60Source: "manual" },
];

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function estimateEu(n60: number, euN60RatioMetric: number): number {
  return n60 * euN60RatioMetric;
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
  const maxValue = Math.max(...points.map((point) => point.eu), 1);
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
      <h3 className="text-lg font-semibold text-slate-900">Depth vs Eu</h3>
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
            <g key={`${point.boreholeId}-${point.depth}-${point.eu}-${index}`}>
              <circle cx={xScale(point.eu)} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
              <circle cx={xScale(point.eu)} cy={yScale(point.depth)} r={2.2} fill={colour} />
            </g>
          );
        })}
        <text x={margin.left + innerWidth / 2} y={24} textAnchor="middle" fontSize={12} fill="#1e3a5f" fontWeight={700}>
          Eu ({stressUnit})
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

export function EuFromSptProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
}: EuFromSptProfileTabProps) {
  const [rows, setRows] = useState<EuFromSptRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const importedFromBoreholes = Boolean(importRows && importRows.length > 0);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const n60BySampleKey = useMemo(() => {
    const map = new Map<string, number>();
    (projectParameters ?? []).forEach((row) => {
      if (row.parameterCode !== "n60") {
        return;
      }
      const value = row.value;
      if (value === null || value === undefined || !Number.isFinite(value)) {
        return;
      }
      const key = `${normaliseBoreholeLabelKey(row.boreholeLabel)}|${depthKey(row.sampleDepth)}`;
      map.set(key, value);
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
        euN60Ratio: convertInputValueBetweenSystems(row.euN60Ratio, "kPa", previousUnitSystem.current, unitSystem),
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
      return importRows.map((item, index) => ({
        ...template,
        id: index + 1,
        boreholeId: item.boreholeLabel || template.boreholeId,
        sampleDepth:
          item.sampleTopDepth === null
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
        n60: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          const n60 = n60BySampleKey.get(key);
          return n60 === null || n60 === undefined ? template.n60 : String(n60);
        })(),
        n60Source: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          return n60BySampleKey.has(key) ? "auto-spt-corrections" : "manual";
        })(),
      }));
    });
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, unitSystem, n60BySampleKey]);

  const updateRow = (id: number, patch: Partial<EuFromSptRow>) => {
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
          n60: "15",
          euN60Ratio: "1100",
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
          const n60 = parse(row.n60);
          const ratioDisplay = parse(row.euN60Ratio);
          const ratioMetric = Number(convertInputValueBetweenSystems(String(ratioDisplay), "kPa", unitSystem, "metric"));
          if (!Number.isFinite(depthMetric) || depthMetric < 0 || !Number.isFinite(n60) || n60 <= 0) {
            return null;
          }
          if (!Number.isFinite(ratioMetric) || ratioMetric <= 0) {
            return null;
          }

          const ratioMetricClamped = clamp(ratioMetric, 1000, 1200);
          const euMetric = estimateEu(n60, ratioMetricClamped);
          const euDisplay = Number(convertInputValueBetweenSystems(String(euMetric), "kPa", "metric", unitSystem));

          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            depth: depthDisplay,
            eu: euDisplay,
          };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem],
  );

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter corrected SPT resistance by sample depth. For cohesive soils, this profile uses Butler (1975) with
          E<sub>u</sub>/N<sub>60</sub> within 1000 to 1200 kN/m<sup>2</sup>, then computes E<sub>u</sub> from
          E<sub>u</sub> = (E<sub>u</sub>/N<sub>60</sub>)N<sub>60</sub>.
        </p>
        {importedFromBoreholes ? (
          <p className="mt-2 text-xs font-medium text-slate-500">
            Sample depth is imported from the selected boreholes. N<sub>60</sub> is pulled from the SPT corrections results
            saved to the project (Integrated Parameter Matrix), when available.
          </p>
        ) : null}

        <ProfileTableScroll>
          <table className={profileTableClass("c6")}>
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
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
                  <ProfileTableHeaderCell title="N60" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell
                    title={
                      <span>
                        Selected ratio: E<sub>u</sub>/N<sub>60</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Eu" unit={stressUnit} />
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
                const lockCls = soilRestricted ? "cursor-not-allowed bg-slate-100 text-slate-500" : "";
                const n60 = parse(row.n60);
                const ratioDisplay = parse(row.euN60Ratio);
                const ratioMetric = Number(convertInputValueBetweenSystems(String(ratioDisplay), "kPa", unitSystem, "metric"));
                const ratioMetricClamped = clamp(ratioMetric, 1000, 1200);
                const euMetric = n60 > 0 && ratioMetricClamped > 0 ? estimateEu(n60, ratioMetricClamped) : 0;
                const euDisplay = Number(convertInputValueBetweenSystems(String(euMetric), "kPa", "metric", unitSystem));

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
                        disabled={soilRestricted || importedFromBoreholes}
                        className={cnProfileTableInput(soilRestricted || importedFromBoreholes)}
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
                            min="1"
                            value={row.n60}
                            onChange={(event) =>
                              updateRow(row.id, {
                                n60: event.target.value,
                                n60Source: "manual",
                              })
                            }
                            className={cnProfileTableInput(false)}
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
                      {soilRestricted ? (
                        <span className="text-[13px] text-slate-400">—</span>
                      ) : (
                        <input
                          type="number"
                          step="10"
                          min="1000"
                          max="1200"
                          value={row.euN60Ratio}
                          onChange={(event) => updateRow(row.id, { euN60Ratio: event.target.value })}
                          className={cnProfileTableInput(false)}
                        />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : euDisplay.toFixed(2)} />
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
