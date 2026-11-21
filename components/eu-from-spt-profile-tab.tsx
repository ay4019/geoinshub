"use client";

import { ExcelExportButton } from "@/components/calculation/excel-export-button";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { DepthProfilePlot } from "@/components/charts/depth-profile-plot";
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
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";

interface EuFromSptProfileTabProps {
  unitSystem: UnitSystem;
  /** Emits data for the standard two-part report (Report tab). */
  onReportDataChange?: (payload: StandardReportPayload) => void;
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
  n60: number;
  ratio: number;
}


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



function renderScatterChart({ points, depthUnit, stressUnit }: { points: PlotPoint[]; depthUnit: string; stressUnit: string }) {
  return <DepthProfilePlot title="Depth vs Eᵤ" xLabel={`Eᵤ (${stressUnit})`} depthUnit={depthUnit} data={points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.eu }))} />;
}

export function EuFromSptProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
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
            n60,
            ratio: Number(convertInputValueBetweenSystems(String(ratioMetricClamped), "kPa", "metric", unitSystem)),
          };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem],
  );

  useEffect(() => {
    if (!onReportDataChange) return;
    const sorted = [...plotPoints].sort((a, b) => a.boreholeId.localeCompare(b.boreholeId, undefined, { numeric: true }) || a.depth - b.depth);
    const autoFilled = rows.filter((r) => r.n60Source === "auto-spt-corrections").length;
    const excluded = rows.length - plotPoints.length;
    onReportDataChange({
      depthUnit,
      columns: [
        { header: "Borehole", key: "Borehole" },
        { header: `Depth (${depthUnit})`, key: "Depth" },
        { header: "N₆₀", key: "n60" },
        { header: `Eᵤ/N₆₀ (${stressUnit})`, key: "ratio" },
        { header: `Eᵤ (${stressUnit})`, key: "eu" },
      ],
      rows: sorted.map((p) => ({ Borehole: p.boreholeId, Depth: p.depth.toFixed(2), n60: p.n60.toFixed(1), ratio: p.ratio.toFixed(0), eu: p.eu.toFixed(0) })),
      points: sorted.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, values: { eu: p.eu } })),
      series: [{ key: "eu", label: "Eᵤ", unit: stressUnit }],
      methodNotes: [
        `Eᵤ was calculated for each sample with Equation (1), using the Eᵤ/N₆₀ ratio entered for that sample (limited to the 1000–1200 kPa range of Butler, 1975). ${
          autoFilled
            ? `${autoFilled} of ${rows.length} N₆₀ values were taken from SPT Corrections results saved to the project.`
            : "All N₆₀ values were entered manually by the user."
        }`,
      ],
      exclusions: excluded > 0 ? [`${excluded} sample(s) excluded: classified as cohesionless in the project data, or missing/invalid N₆₀ or depth.`] : undefined,
    });
  }, [depthUnit, onReportDataChange, plotPoints, rows, stressUnit]);

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
