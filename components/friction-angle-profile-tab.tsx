"use client";

import { ExcelExportButton } from "@/components/calculation/excel-export-button";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { isActiveProjectToolLocked, type SelectedBoreholeSummary } from "@/lib/project-boreholes";
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";

interface FrictionAngleProfileTabProps {
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
    sourceToolSlug?: string | null;
  }>;
}

interface FrictionAngleRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  n60: string;
  n60Source: "manual" | "auto-spt-corrections";
}

interface PlotPoint {
  boreholeId: string;
  depth: number;
  n60: number;
  phi: number;
}


const initialRows: FrictionAngleRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "1.5", n60: "12", n60Source: "manual" },
  { id: 2, boreholeId: "", sampleDepth: "3.0", n60: "18", n60Source: "manual" },
];

const SPT_CORRECTIONS_TOOL_LABEL = "Standard Penetration Test (SPT) Corrections for N₆₀ and (N₁)₆₀";

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

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimatePhiFromN60(n60: number): number {
  return 27.1 + 0.3 * n60 - 0.00054 * n60 ** 2;
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}



function renderScatterChart({ title, xLabel, points, depthUnit }: { title: string; xLabel: string; points: PlotPoint[]; depthUnit: string }) {
  return <DepthProfilePlot title={title} xLabel={xLabel} depthUnit={depthUnit} data={points.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, value: p.phi }))} />;
}

export function FrictionAngleProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
}: FrictionAngleProfileTabProps) {
  const [rows, setRows] = useState<FrictionAngleRow[]>(initialRows);
  const [isProjectLocked, setIsProjectLocked] = useState(() =>
    typeof window !== "undefined" ? isActiveProjectToolLocked() : false,
  );
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const hasImportedSelection = (importRows?.length ?? 0) > 0;
  const shouldLockImportedFields = isProjectLocked && hasImportedSelection;
  const lockHint = "Locked from Projects and Boreholes. Edit values in Account > Projects.";

  const n60ByBoreholeDepth = useMemo(() => {
    const map = new Map<string, number>();
    (projectParameters ?? []).forEach((parameter) => {
      if (parameter.parameterCode.toLowerCase() !== "n160" || !Number.isFinite(parameter.value)) {
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
    const syncLockState = () => setIsProjectLocked(isActiveProjectToolLocked());
    window.addEventListener("gih:active-project-changed", syncLockState);
    return () => {
      window.removeEventListener("gih:active-project-changed", syncLockState);
    };
  }, []);

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
      return importRows.map((item, index) => {
        const boreholeId = item.boreholeLabel || template.boreholeId;
        const sampleDepthMetric = item.sampleTopDepth;
        const key = `${normaliseBoreholeLabelKey(boreholeId)}|${depthKey(sampleDepthMetric)}`;
        const n60Metric = n60ByBoreholeDepth.get(key);

        return {
          ...template,
          id: index + 1,
          boreholeId,
          sampleDepth:
            sampleDepthMetric === null
              ? template.sampleDepth
              : convertInputValueBetweenSystems(String(sampleDepthMetric), "m", "metric", unitSystem),
          n60:
            typeof n60Metric === "number" && Number.isFinite(n60Metric)
              ? String(n60Metric)
              : template.n60,
          n60Source:
            typeof n60Metric === "number" && Number.isFinite(n60Metric)
              ? "auto-spt-corrections"
              : "manual",
        };
      });
    });
  }, [importRows, n60ByBoreholeDepth, unitSystem]);

  const updateRow = (id: number, patch: Partial<FrictionAngleRow>) => {
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
          n60Source: "manual",
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
          const n60 = Math.max(0, parse(row.n60));
          const phi = estimatePhiFromN60(n60);
          return {
            boreholeId: row.boreholeId?.trim() || "BH not set",
            depth: depthDisplay,
            n60,
            phi,
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
        { header: "(N₁)₆₀", key: "n160" },
        { header: "φ′ (deg)", key: "phi" },
      ],
      rows: sorted.map((p) => ({ Borehole: p.boreholeId, Depth: p.depth.toFixed(2), n160: p.n60.toFixed(1), phi: p.phi.toFixed(1) })),
      points: sorted.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, values: { phi: p.phi, n160: p.n60 } })),
      series: [
        { key: "n160", label: "(N₁)₆₀", unit: "blows/0.3 m" },
        { key: "phi", label: "φ′", unit: "deg" },
      ],
      methodNotes: [
        `φ′ was calculated for each sample from the overburden-corrected blow count with Equation (1). ${
          autoFilled
            ? `${autoFilled} of ${rows.length} (N₁)₆₀ values were taken from SPT Corrections results saved to the project; the remainder were entered manually.`
            : "All (N₁)₆₀ values were entered manually by the user."
        }`,
      ],
      exclusions: excluded > 0 ? [`${excluded} sample(s) excluded: classified as cohesive in the project data, or invalid depth.`] : undefined,
    });
  }, [depthUnit, onReportDataChange, plotPoints, rows]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Layer Profile</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter corrected SPT resistance by depth. Effective friction angle uses φ′ ≈ 27.1 + 0.3(N₁)₆₀ − 0.00054(N₁)₆₀²
          (Wolff, 1989, fit to Peck, Hanson, and Thornburn, 1974).
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          When samples are imported from <span className="font-semibold">Projects and Boreholes</span> with the project
          tool lock enabled, sample depth is read-only here (edit under Account &gt; Projects). If available, (N₁)₆₀ is
          auto-filled from{" "}
          <span className="font-semibold">{SPT_CORRECTIONS_TOOL_LABEL}</span> results saved to the project. Manual
          override is always allowed.
        </p>

        <ProfileTableScroll>
          <table className={profileTableClass("c5")}>
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
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
                  <ProfileTableHeaderCell title={<span>(N₁)₆₀</span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>φ′</span>} unit="deg" />
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
                const n60 = Math.max(0, parse(row.n60));
                const phi = estimatePhiFromN60(n60);

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
                            min="0"
                            value={row.n60}
                            onChange={(event) =>
                              updateRow(row.id, { n60: event.target.value, n60Source: "manual" })
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
              {renderScatterChart({
                title: "Depth vs φ′",
                xLabel: "φ′ (deg)",
                points: plotPoints,
                depthUnit,
              })}
            </ExpandableProfilePlot>
          </div>
        ) : null}
      </div>
</section>
  );
}
