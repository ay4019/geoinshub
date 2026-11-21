"use client";

import { ExcelExportButton } from "@/components/calculation/excel-export-button";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { DepthProfilePlot } from "@/components/charts/depth-profile-plot";
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
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";

interface EprimeFromSptCohesionlessProfileTabProps {
  unitSystem: UnitSystem;
  /** Emits data for the standard two-part report (Report tab). */
  onReportDataChange?: (payload: StandardReportPayload) => void;
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
  n: number;
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

function renderScatterChart({ points, depthUnit, stressUnit }: { points: PlotPoint[]; depthUnit: string; stressUnit: string }) {
  return <DepthProfilePlot title="Depth vs E′" xLabel={`E′ (${stressUnit})`} depthUnit={depthUnit} data={points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.ePrime }))} />;
}

export function EprimeFromSptCohesionlessProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
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
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
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

          return { boreholeId: row.boreholeId?.trim() || "BH not set", depth: depthDisplay, ePrime: ePrimeDisplay, n: nValue };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem, correlation],
  );

  useEffect(() => {
    if (!onReportDataChange) return;
    const sorted = [...plotPoints].sort((a, b) => a.boreholeId.localeCompare(b.boreholeId, undefined, { numeric: true }) || a.depth - b.depth);
    const autoFilled = rows.filter((r) => r.nSource === "auto-spt-corrections").length;
    const excluded = rows.length - plotPoints.length;
    const nLabel = selectedOption.nType === "N55" ? "N₅₅" : "N₆₀";
    onReportDataChange({
      depthUnit,
      columns: [
        { header: "Borehole", key: "Borehole" },
        { header: `Depth (${depthUnit})`, key: "Depth" },
        { header: nLabel, key: "n" },
        { header: `E′ (${stressUnit})`, key: "ePrime" },
      ],
      rows: sorted.map((p) => ({ Borehole: p.boreholeId, Depth: p.depth.toFixed(2), n: p.n.toFixed(1), ePrime: p.ePrime.toFixed(0) })),
      points: sorted.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, values: { ePrime: p.ePrime } })),
      series: [{ key: "ePrime", label: "E′", unit: stressUnit }],
      inputs: [{ label: "Selected correlation", value: selectedOption.label }],
      methodNotes: [
        `E′ was calculated for every sample with the selected correlation (${selectedOption.label}), which is defined in terms of ${nLabel}. ${
          autoFilled
            ? `${autoFilled} of ${rows.length} blow counts were taken from SPT Corrections results saved to the project (N₆₀); where the selected correlation uses N₅₅, the user is responsible for the energy conversion.`
            : "All blow counts were entered manually by the user."
        }`,
      ],
      exclusions: excluded > 0 ? [`${excluded} sample(s) excluded: classified as cohesive in the project data, or missing/invalid blow count or depth.`] : undefined,
    });
  }, [depthUnit, onReportDataChange, plotPoints, rows, selectedOption, stressUnit]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Select a cohesionless-soil SPT correlation, then enter depth and corrected SPT N values by sample. E&apos; is computed
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
