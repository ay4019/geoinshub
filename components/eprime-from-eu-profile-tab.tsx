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

interface EprimeFromEuProfileTabProps {
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

interface EprimeFromEuRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  eModulus: string;
  soilType: "silt-clay" | "stiff-clay" | "soft-clay";
  euSource?: "manual" | "auto-eu-from-spt";
}

interface PlotPoint {
  boreholeId: string;
  depth: number;
  ePrime: number;
  eu: number;
  beta: number;
  soilType: string;
}

const initialRows: EprimeFromEuRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "1.5", eModulus: "12000", soilType: "stiff-clay", euSource: "manual" },
  { id: 2, boreholeId: "", sampleDepth: "3.0", eModulus: "15000", soilType: "silt-clay", euSource: "manual" },
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

function betaFromSoilType(soilType: EprimeFromEuRow["soilType"]): number {
  if (soilType === "soft-clay") {
    return 0.4;
  }
  if (soilType === "stiff-clay") {
    return 0.6;
  }
  return 0.7;
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}



function renderScatterChart({ points, depthUnit, stressUnit }: { points: PlotPoint[]; depthUnit: string; stressUnit: string }) {
  return <DepthProfilePlot title="Depth vs E′" xLabel={`E′ (${stressUnit})`} depthUnit={depthUnit} data={points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.ePrime }))} />;
}

export function EprimeFromEuProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
}: EprimeFromEuProfileTabProps) {
  const [rows, setRows] = useState<EprimeFromEuRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const importedFromBoreholes = Boolean(importRows && importRows.length > 0);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const euBySampleKey = useMemo(() => {
    const map = new Map<string, number>();
    (projectParameters ?? []).forEach((row) => {
      if (row.parameterCode !== "eu") {
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
        eModulus: convertInputValueBetweenSystems(row.eModulus, "kPa", previousUnitSystem.current, unitSystem),
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
        eModulus: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          const eu = euBySampleKey.get(key);
          if (eu === null || eu === undefined) {
            return template.eModulus;
          }
          return convertInputValueBetweenSystems(String(eu), "kPa", "metric", unitSystem);
        })(),
        euSource: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          return euBySampleKey.has(key) ? "auto-eu-from-spt" : "manual";
        })(),
      }));
    });
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, unitSystem, euBySampleKey]);

  const updateRow = (id: number, patch: Partial<EprimeFromEuRow>) => {
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
          eModulus: "14000",
          soilType: "stiff-clay",
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
          const eModulusDisplay = parse(row.eModulus);
          const eModulusMetric = Number(convertInputValueBetweenSystems(String(eModulusDisplay), "kPa", unitSystem, "metric"));
          if (!Number.isFinite(depthMetric) || depthMetric < 0 || !Number.isFinite(eModulusMetric) || eModulusMetric <= 0) {
            return null;
          }

          const beta = betaFromSoilType(row.soilType);
          const ePrimeMetric = beta * eModulusMetric;
          const ePrimeDisplay = Number(convertInputValueBetweenSystems(String(ePrimeMetric), "kPa", "metric", unitSystem));

          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            depth: depthDisplay,
            ePrime: ePrimeDisplay,
            eu: eModulusDisplay,
            beta,
            soilType: row.soilType === "soft-clay" ? "Soft clay" : row.soilType === "stiff-clay" ? "Stiff clay" : "Silt / silty clay",
          };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem],
  );

  useEffect(() => {
    if (!onReportDataChange) return;
    const sorted = [...plotPoints].sort((a, b) => a.boreholeId.localeCompare(b.boreholeId, undefined, { numeric: true }) || a.depth - b.depth);
    const autoFilled = rows.filter((r) => r.euSource === "auto-eu-from-spt").length;
    const excluded = rows.length - plotPoints.length;
    onReportDataChange({
      depthUnit,
      columns: [
        { header: "Borehole", key: "Borehole" },
        { header: `Depth (${depthUnit})`, key: "Depth" },
        { header: `Eᵤ (${stressUnit})`, key: "eu" },
        { header: "Soil type", key: "soilType" },
        { header: "β′", key: "beta" },
        { header: `E′ (${stressUnit})`, key: "ePrime" },
      ],
      rows: sorted.map((p) => ({ Borehole: p.boreholeId, Depth: p.depth.toFixed(2), eu: p.eu.toFixed(0), soilType: p.soilType, beta: p.beta.toFixed(2), ePrime: p.ePrime.toFixed(0) })),
      points: sorted.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, values: { ePrime: p.ePrime } })),
      series: [{ key: "ePrime", label: "E′", unit: stressUnit }],
      methodNotes: [
        `E′ was obtained for each sample as β′ × Eᵤ (Equation 3), with β′ selected from the soil type assigned to the sample. ${
          autoFilled
            ? `${autoFilled} of ${rows.length} Eᵤ values were taken from Eᵤ-from-SPT results saved to the project; the remainder were entered manually.`
            : "All Eᵤ values were entered manually by the user; Equation (2) is shown for reference only."
        }`,
      ],
      exclusions: excluded > 0 ? [`${excluded} sample(s) excluded: classified as cohesionless in the project data, or missing/invalid Eᵤ or depth.`] : undefined,
    });
  }, [depthUnit, onReportDataChange, plotPoints, rows, stressUnit]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter deformation modulus by depth and select cohesive soil type (β′). The profile computes E′ with
          E′ = β′E<sub>u</sub>.
        </p>
        {importedFromBoreholes ? (
          <p className="mt-2 text-xs font-medium text-slate-500">
            Sample depth is imported from the selected boreholes. E<sub>u</sub> is pulled from the saved{" "}
            <span className="font-semibold">Undrained Deformation Modulus (Eu)</span> tool results (when available).
          </p>
        ) : null}

        <ProfileTableScroll>
          <table className={profileTableClass("c7")}>
            <colgroup>
              <col className="w-[19%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
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
                  <ProfileTableHeaderCell title="Eu" unit={stressUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Soil type (β′)" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="β′" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="E′" unit={stressUnit} />
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
                const eModulusDisplay = parse(row.eModulus);
                const eModulusMetric = Number(convertInputValueBetweenSystems(String(eModulusDisplay), "kPa", unitSystem, "metric"));
                const beta = betaFromSoilType(row.soilType);
                const ePrimeMetric = eModulusMetric > 0 ? beta * eModulusMetric : 0;
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
                            min="0"
                            value={row.eModulus}
                            onChange={(event) =>
                              updateRow(row.id, {
                                eModulus: event.target.value,
                                euSource: "manual",
                              })
                            }
                            className={cnProfileTableInput(false)}
                          />
                          {row.euSource === "auto-eu-from-spt" ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Auto-filled from Undrained Deformation Modulus (Eu)
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={row.soilType}
                        onChange={(event) =>
                          updateRow(row.id, {
                            soilType: event.target.value as EprimeFromEuRow["soilType"],
                          })
                        }
                        disabled={soilRestricted}
                        className={`w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500 ${
                          soilRestricted ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""
                        }`}
                      >
                        <option value="silt-clay">Silt / silty clay</option>
                        <option value="stiff-clay">Stiff clay</option>
                        <option value="soft-clay">Soft clay</option>
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : beta.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : ePrimeDisplay.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className={`${profileTableRemoveButtonClass} whitespace-nowrap`}
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
                <td colSpan={5} />
                <td colSpan={1} className="px-2 py-3 text-right align-top">
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
