"use client";

import { ExcelExportButton } from "@/components/calculation/excel-export-button";
import { useEffect, useMemo, useRef, useState } from "react";

import { DepthProfilePlot } from "@/components/charts/depth-profile-plot";
import { buildDepthProfilePng } from "@/lib/charts/depth-profile-png";
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



function renderScatterChart({ points, depthUnit, stressUnit }: { points: PlotPoint[]; depthUnit: string; stressUnit: string }) {
  return <DepthProfilePlot title="Depth vs c′" xLabel={`c′ (${stressUnit})`} depthUnit={depthUnit} data={points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.cprime }))} />;
}

function buildCprimePlotPngDataUri({ points, depthUnit, stressUnit }: { points: PlotPoint[]; depthUnit: string; stressUnit: string }): string | null {
  return buildDepthProfilePng({ title: "Depth vs c′", xLabel: `c′ (${stressUnit})`, depthUnit, data: points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.cprime })) }) || null;
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
                  <ExcelExportButton
                    type="button"
                    className={profileTableFooterButtonClass}
                    onClick={(event) => {
                      void exportProfileExcelFromSection(event.currentTarget);
                    }}
                  >
                    Export Excel
                  </ExcelExportButton>
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
