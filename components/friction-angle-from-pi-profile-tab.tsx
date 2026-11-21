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

export interface FrictionAngleFromPiReportPayload {
  depthUnit: string;
  stressUnit: string;
  tableRows: Array<Record<string, string>>;
  plotImageDataUrl: string | null;
}

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
  onReportDataChange?: (payload: FrictionAngleFromPiReportPayload) => void;
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



function renderScatterChart({ points, depthUnit }: { points: PlotPoint[]; depthUnit: string }) {
  return <DepthProfilePlot title="Depth vs φ′" xLabel="φ′ (deg)" depthUnit={depthUnit} data={points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.phi }))} />;
}

function buildFrictionAngleFromPiPlotPngDataUri({ points, depthUnit }: { points: PlotPoint[]; depthUnit: string }): string | null {
  return buildDepthProfilePng({ title: "Depth vs φ′", xLabel: "φ′ (deg)", depthUnit, data: points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.phi })) }) || null;
}

export function FrictionAngleFromPiProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
}: FrictionAngleFromPiProfileTabProps) {
  const [rows, setRows] = useState<FrictionAngleFromPiRow[]>(initialRows);
  const [isProjectLocked, setIsProjectLocked] = useState(() =>
    typeof window !== "undefined" ? isActiveProjectToolLocked() : false,
  );
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = "deg";
  const hasImportedSelection = (importRows?.length ?? 0) > 0;
  const shouldLockImportedFields = isProjectLocked && hasImportedSelection;
  const lockHint = "Locked from Projects and Boreholes. Edit values on the Projects page.";

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
          const piRaw = parse(row.plasticityIndex);
          if (!Number.isFinite(piRaw) || piRaw <= 0) {
            return null;
          }
          const phi = estimatePhiFromPi(piRaw);
          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            depth: depthDisplay,
            pi: piRaw,
            phi,
          };
        })
        .filter((point): point is PlotPoint => point !== null),
    [rows, soilPolicyToolSlug, importRows, unitSystem],
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
        const phiKey = `φ′ (${stressUnit})`;
        if (soilRestricted) {
          return {
            Borehole: borehole,
            [depthKey]: depthStr,
            "PI (%)": "—",
            [phiKey]: "—",
          };
        }
        const piRaw = parse(row.plasticityIndex);
        if (!Number.isFinite(piRaw) || piRaw <= 0) {
          return {
            Borehole: borehole,
            [depthKey]: depthStr,
            "PI (%)": Number.isFinite(piRaw) ? piRaw.toFixed(2) : "—",
            [phiKey]: "—",
          };
        }
        const phi = estimatePhiFromPi(piRaw);
        return {
          Borehole: borehole,
          [depthKey]: depthStr,
          "PI (%)": piRaw.toFixed(2),
          [phiKey]: phi.toFixed(2),
        };
      }),
    [rows, depthUnit, stressUnit, soilPolicyToolSlug, importRows, unitSystem],
  );

  useEffect(() => {
    if (!onReportDataChange) {
      return;
    }
    onReportDataChange({
      depthUnit,
      stressUnit,
      tableRows: reportTableRows,
      plotImageDataUrl: buildFrictionAngleFromPiPlotPngDataUri({ points: plotPoints, depthUnit }),
    });
  }, [depthUnit, onReportDataChange, plotPoints, reportTableRows, stressUnit]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter PI by depth. The tool computes effective friction angle with φ′ = 45 − 14 log₁₀(PI).
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          When samples are imported from <span className="font-semibold">Projects and Boreholes</span> with the project
          tool lock enabled, sample depth is read-only here (edit under Projects). If available, PI is
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
                const piRaw = parse(row.plasticityIndex);
                const phiOk = Number.isFinite(piRaw) && piRaw > 0;
                const phi = phiOk ? estimatePhiFromPi(piRaw) : null;
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
                      <OutputCell value={soilRestricted ? "—" : phi !== null ? phi.toFixed(2) : "—"} />
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
              {renderScatterChart({ points: plotPoints, depthUnit })}
            </ExpandableProfilePlot>
          </div>
        ) : null}
      </div>
</section>
  );
}

