"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { ExpandableProfilePlot } from "@/components/expandable-profile-plot";
import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import {
  ProfileTableHeaderCell,
  ProfileTableScroll,
  profileTableClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";
import { EngineeringText } from "@/components/engineering-text";
import { isActiveProjectToolLocked, type SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { profilePlotItemClass, profilePlotsSectionClass } from "@/lib/profile-plot-layout";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface ModulusFromCuProfileTabProps {
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
}

type RatioBasis = "soft-clay" | "medium-clay" | "stiff-clay";
type RatioMode = "auto" | "manual";

interface ProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  ratioBasis: RatioBasis;
  ratioMode: RatioMode;
  manualRatio: string;
  cu: string;
  cuSource: "manual" | "auto-cu-tool";
}

interface PlotPoint {
  boreholeId: string;
  sampleDepth: number;
  cu: number;
  eu: number;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const basisOptions: Array<{ value: RatioBasis; label: string; ratio: number; range: string }> = [
  { value: "soft-clay", label: "Soft clay basis", ratio: 150, range: "100 - 200" },
  { value: "medium-clay", label: "Medium clay basis", ratio: 300, range: "200 - 400" },
  { value: "stiff-clay", label: "Stiff clay basis", ratio: 600, range: "400 - 800" },
];

const initialRows: ProfileRow[] = [
  {
    id: 1,
    boreholeId: "",
    sampleDepth: "1",
    ratioBasis: "soft-clay",
    ratioMode: "auto",
    manualRatio: "150",
    cu: "25",
    cuSource: "manual",
  },
  {
    id: 2,
    boreholeId: "",
    sampleDepth: "4",
    ratioBasis: "medium-clay",
    ratioMode: "auto",
    manualRatio: "300",
    cu: "55",
    cuSource: "manual",
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

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function getRecommendedRatio(basis: RatioBasis): number {
  return basisOptions.find((item) => item.value === basis)?.ratio ?? 300;
}

function getRangeLabel(basis: RatioBasis): string {
  return basisOptions.find((item) => item.value === basis)?.range ?? "200 - 400";
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

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}

function renderProfileChart({
  title,
  xLabel,
  points,
  valueKey,
  depthUnit,
}: {
  title: string;
  xLabel: string;
  points: PlotPoint[];
  valueKey: "cu" | "eu";
  depthUnit: string;
}) {
  const width = 560;
  const height = 360;
  const margin = { top: 54, right: 20, bottom: 24, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...points.map((point) => point.sampleDepth), 1);
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

  const pointsByBorehole = boreholeIds.map((boreholeId) => ({
    boreholeId,
    points: points.filter((point) => point.boreholeId === boreholeId).sort((a, b) => a.sampleDepth - b.sampleDepth),
  }));

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
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + innerHeight}
          stroke="#7f98ba"
          strokeWidth={1.5}
        />
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left + innerWidth}
          y2={margin.top}
          stroke="#7f98ba"
          strokeWidth={1.5}
        />

        {pointsByBorehole.map(({ boreholeId, points: group }) => {
          const colour = colourByBorehole.get(boreholeId) ?? BOREHOLE_COLOURS[0];
          const polyline = group.map((point) => `${xScale(point[valueKey])},${yScale(point.sampleDepth)}`).join(" ");
          if (group.length < 2) {
            return null;
          }
          return (
            <polyline
              key={`line-${boreholeId}`}
              fill="none"
              stroke={colour}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polyline}
            />
          );
        })}

        {points.map((point, index) => {
          const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
          return (
            <g key={`${point.boreholeId}-${point.sampleDepth}-${point[valueKey]}-${index}`}>
              <circle cx={xScale(point[valueKey])} cy={yScale(point.sampleDepth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
              <circle cx={xScale(point[valueKey])} cy={yScale(point.sampleDepth)} r={2.2} fill={colour} />
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

export function ModulusFromCuProfileTab({ unitSystem, importRows, soilPolicyToolSlug }: ModulusFromCuProfileTabProps) {
  const [rows, setRows] = useState<ProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const syncUnitSystem = useEffectEvent(() => {
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

    previousUnitSystem.current = unitSystem;
  });
  const syncImportedRows = useEffectEvent(() => {
    if (!importRows || importRows.length === 0) {
      return;
    }
    setRows((current) => {
      const template = current[0] ?? initialRows[0];
      return importRows.map((item, index) => {
        const topM = item.sampleTopDepth;
        const botM = item.sampleBottomDepth;
        let sampleDepth =
          topM === null || topM === undefined
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(topM), "m", "metric", unitSystem);
        if (typeof topM === "number" && Number.isFinite(topM) && typeof botM === "number" && Number.isFinite(botM) && botM > topM) {
          sampleDepth = convertInputValueBetweenSystems(String((topM + botM) / 2), "m", "metric", unitSystem);
        }
        return {
          ...template,
          id: index + 1,
          boreholeId: item.boreholeLabel || template.boreholeId,
          sampleDepth,
        };
      });
    });
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<ProfileRow>) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const next = { ...row, ...patch };
        if (patch.ratioBasis && next.ratioMode === "auto") {
          next.manualRatio = String(getRecommendedRatio(patch.ratioBasis));
        }
        if (patch.ratioMode === "auto") {
          next.manualRatio = String(getRecommendedRatio(next.ratioBasis));
        }
        return next;
      }),
    );
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
          sampleDepth: String(parse(lastDepth) + 2),
          ratioBasis: "medium-clay",
          ratioMode: "auto",
          manualRatio: "300",
          cu: "50",
          cuSource: "manual",
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
          const sampleDepth = parse(row.sampleDepth);
          if (!Number.isFinite(sampleDepth) || sampleDepth < 0) {
            return null;
          }

          const ratio = row.ratioMode === "auto" ? getRecommendedRatio(row.ratioBasis) : parse(row.manualRatio);
          const cu = Math.max(0, parse(row.cu));
          const eu = cu * ratio;

          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            sampleDepth,
            cu,
            eu,
          };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem],
  );

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Soil Layer Profile</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Enter borehole, sample depth, and undrained strength to build a layered
              <EngineeringText text=" E_u " />
              profile using the selected
              <EngineeringText text=" E/c_u " />
              ratio workflow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-base btn-md" onClick={addRow}>
              Add Sample
            </button>
            <button
              type="button"
              className="btn-base btn-md"
              onClick={(event) => {
                void exportProfileExcelFromSection(event.currentTarget);
              }}
            >
              Export Excel
            </button>
          </div>
        </div>

        <ProfileTableScroll>
          <table className={profileTableClass("c8")}>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Borehole ID" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Sample depth" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Suggested basis" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Ratio mode" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>c<sub>u</sub></span>} unit={stressUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>E/c<sub>u</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>E<sub>u</sub></span>} unit={stressUnit} />
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
                const sampleDepth = parse(row.sampleDepth);
                const cu = parse(row.cu);
                const ratio = row.ratioMode === "auto" ? getRecommendedRatio(row.ratioBasis) : parse(row.manualRatio);
                const eu = cu * ratio;
                const hasDepthIssue = !Number.isFinite(sampleDepth) || sampleDepth < 0;
                const lockCls = soilRestricted ? "cursor-not-allowed bg-slate-100 text-slate-500" : "";

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
                        className={`w-full min-w-0 rounded-lg border px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 ${
                          soilRestricted
                            ? `${lockCls} border-slate-300`
                            : hasDepthIssue
                              ? "border-red-300 bg-red-50 focus:border-red-400"
                              : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Enter a valid sample depth.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={row.ratioBasis}
                        onChange={(event) => updateRow(row.id, { ratioBasis: event.target.value as RatioBasis })}
                        disabled={soilRestricted}
                        className={`w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500 ${lockCls}`}
                      >
                        {basisOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500">{getRangeLabel(row.ratioBasis)}</p>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={row.ratioMode}
                        onChange={(event) => updateRow(row.id, { ratioMode: event.target.value as RatioMode })}
                        disabled={soilRestricted}
                        className={`w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500 ${lockCls}`}
                      >
                        <option value="auto">Auto</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      {soilRestricted ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-2 py-1.5 text-[11px] leading-snug text-amber-950">
                          {restrictionHint ?? "Not used with this tool (soil type in Projects)."}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.cu}
                          onChange={(event) => updateRow(row.id, { cu: event.target.value })}
                          className="w-full min-w-0 rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                        />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="10"
                        value={row.ratioMode === "auto" ? String(getRecommendedRatio(row.ratioBasis)) : row.manualRatio}
                        disabled={row.ratioMode === "auto" || soilRestricted}
                        onChange={(event) => updateRow(row.id, { manualRatio: event.target.value })}
                        className={`w-full min-w-0 rounded-lg border px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 ${
                          soilRestricted
                            ? lockCls
                            : row.ratioMode === "auto"
                              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
                              : "border-slate-300 bg-white focus:border-slate-500"
                        }`}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {row.ratioMode === "auto" ? "Auto-filled from suggested basis." : "Manual override."}
                      </p>
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : Number.isFinite(eu) ? format(eu, eu >= 100 ? 0 : 1) : "-"} />
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
          </table>
        </ProfileTableScroll>

        {plotPoints.length ? (
          <div className={profilePlotsSectionClass(2)}>
            <ExpandableProfilePlot className={profilePlotItemClass(2)}>
              {renderProfileChart({
                title: "Depth vs cᵤ",
                xLabel: `cᵤ (${stressUnit})`,
                points: plotPoints,
                valueKey: "cu",
                depthUnit,
              })}
            </ExpandableProfilePlot>
            <ExpandableProfilePlot className={profilePlotItemClass(2)}>
              {renderProfileChart({
                title: "Depth vs Eᵤ",
                xLabel: `Eᵤ (${stressUnit})`,
                points: plotPoints,
                valueKey: "eu",
                depthUnit,
              })}
            </ExpandableProfilePlot>
          </div>
        ) : null}
      </div>
</section>
  );
}
