"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { isActiveProjectToolLocked, type SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface FrictionAngleFromPiProfileTabProps {
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

interface FrictionAngleFromPiRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  plasticityIndex: string;
  piSource: "manual" | "auto-project";
}

interface PlotPoint {
  boreholeId: string;
  depth: number;
  pi: number;
  phi: number;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: FrictionAngleFromPiRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "1.5", plasticityIndex: "20", piSource: "manual" },
  { id: 2, boreholeId: "", sampleDepth: "3.0", plasticityIndex: "35", piSource: "manual" },
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

function estimatePhiFromPi(pi: number): number {
  if (pi <= 0) {
    return 0;
  }
  return 45 - 14 * Math.log10(pi);
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
}: {
  points: PlotPoint[];
  depthUnit: string;
}) {
  const width = 560;
  const height = 360;
  const margin = { top: 54, right: 20, bottom: 24, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...points.map((point) => point.depth), 1);
  const maxValue = Math.max(...points.map((point) => point.phi), 1);
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
      <h3 className="text-lg font-semibold text-slate-900">Depth vs φ′</h3>
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
            <g key={`${point.boreholeId}-${point.depth}-${point.phi}-${index}`}>
              <circle cx={xScale(point.phi)} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
              <circle cx={xScale(point.phi)} cy={yScale(point.depth)} r={2.2} fill={colour} />
            </g>
          );
        })}
        <text x={margin.left + innerWidth / 2} y={24} textAnchor="middle" fontSize={12} fill="#1e3a5f" fontWeight={700}>
          φ′ (deg)
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

export function FrictionAngleFromPiProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
}: FrictionAngleFromPiProfileTabProps) {
  const [rows, setRows] = useState<FrictionAngleFromPiRow[]>(initialRows);
  const [isProjectLocked, setIsProjectLocked] = useState(() =>
    typeof window !== "undefined" ? isActiveProjectToolLocked() : false,
  );
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const hasImportedSelection = (importRows?.length ?? 0) > 0;
  const shouldLockImportedFields = isProjectLocked && hasImportedSelection;
  const lockHint = "Locked from Projects and Boreholes. Edit values in Account > Projects.";

  useEffect(() => {
    const syncLockState = () => setIsProjectLocked(isActiveProjectToolLocked());
    window.addEventListener("gih:active-project-changed", syncLockState);
    return () => {
      window.removeEventListener("gih:active-project-changed", syncLockState);
    };
  }, []);

  const piByBoreholeDepth = useMemo(() => {
    const map = new Map<string, number>();
    (projectParameters ?? []).forEach((parameter) => {
      if (parameter.parameterCode.toLowerCase() !== "pi" || !Number.isFinite(parameter.value)) {
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
      })),
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
      return importRows.map((item, index) => ({
        ...template,
        id: index + 1,
        boreholeId: item.boreholeLabel || template.boreholeId,
        sampleDepth:
          item.sampleTopDepth === null
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
        plasticityIndex:
          (() => {
            const key = `${normaliseBoreholeLabelKey(item.boreholeLabel || template.boreholeId)}|${depthKey(item.sampleTopDepth)}`;
            const parameterPi = piByBoreholeDepth.get(key);
            if (typeof parameterPi === "number" && Number.isFinite(parameterPi)) {
              return String(parameterPi);
            }
            if (item.piValue !== null && item.piValue !== undefined && Number.isFinite(item.piValue)) {
              return String(item.piValue);
            }
            return "";
          })(),
        piSource:
          (() => {
            const key = `${normaliseBoreholeLabelKey(item.boreholeLabel || template.boreholeId)}|${depthKey(item.sampleTopDepth)}`;
            const parameterPi = piByBoreholeDepth.get(key);
            if (typeof parameterPi === "number" && Number.isFinite(parameterPi)) {
              return "auto-project" as const;
            }
            if (item.piValue !== null && item.piValue !== undefined && Number.isFinite(item.piValue)) {
              return "auto-project" as const;
            }
            return "manual" as const;
          })(),
      }));
    });
  }, [importRows, piByBoreholeDepth, unitSystem]);

  const updateRow = (id: number, patch: Partial<FrictionAngleFromPiRow>) => {
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
          plasticityIndex: "30",
          piSource: "manual",
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
          if (!Number.isFinite(depthMetric) || depthMetric < 0) {
            return null;
          }
          const pi = Math.max(0.1, parse(row.plasticityIndex));
          const phi = estimatePhiFromPi(pi);
          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            depth: depthDisplay,
            pi,
            phi,
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
          Enter PI by depth. The tool computes effective friction angle with φ′ = 45 − 14 log₁₀(PI).
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          When samples are imported from <span className="font-semibold">Projects and Boreholes</span> with the project
          tool lock enabled, sample depth is read-only here (edit under Account &gt; Projects). If available, PI is
          auto-filled from project data. Manual override is always allowed.
        </p>

        <ProfileTableScroll>
          <table className={profileTableClass("c5")}>
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[24%]" />
              <col className="w-[24%]" />
              <col className="w-[20%]" />
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
                  <ProfileTableHeaderCell title="PI" unit="%" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="φ′" unit="deg" />
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
                const pi = Math.max(0.1, parse(row.plasticityIndex));
                const phi = estimatePhiFromPi(pi);
                const shouldLockPi = shouldLockImportedFields && row.piSource === "auto-project";
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
                            value={row.plasticityIndex}
                            onChange={(event) =>
                              updateRow(row.id, { plasticityIndex: event.target.value, piSource: "manual" })
                            }
                            disabled={shouldLockPi}
                            title={shouldLockPi ? lockHint : undefined}
                            className={cnProfileTableInput(shouldLockPi)}
                          />
                          {row.piSource === "auto-project" ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Auto-filled from Projects and Boreholes
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : phi.toFixed(2)} />
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
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {renderScatterChart({ points: plotPoints, depthUnit })}
          </div>
        ) : null}
      </div>
</section>
  );
}

