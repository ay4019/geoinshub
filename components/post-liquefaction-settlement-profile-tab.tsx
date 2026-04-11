"use client";

import { Fragment } from "react";
import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import {
  ProfileTableHeaderCell,
  ProfileTableScroll,
  cnProfileTableInput,
  profileTableClassXl,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import { computePostLiquefactionSettlement } from "@/lib/post-liquefaction-settlement";
import type { UnitSystem } from "@/lib/types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface PostLiquefactionSettlementProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
}

interface SettlementProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  /** Layer thickness for settlement (m); kept separate from sample depth for the strain model. */
  layerThickness: string;
  correctedSptResistance: string;
  factorOfSafety: string;
  factorOfSafetySource?: "liquefaction" | null;
  correctedSptResistanceSource?: "liquefaction" | null;
}

const initialRows: SettlementProfileRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "3", layerThickness: "2", correctedSptResistance: "12", factorOfSafety: "0.85" },
  { id: 2, boreholeId: "", sampleDepth: "5.5", layerThickness: "2.5", correctedSptResistance: "18", factorOfSafety: "1.10" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatForDisplay(value: number, unit: string | undefined, unitSystem: UnitSystem, digits: number): string {
  const converted = unit ? convertInputValueBetweenSystems(String(value), unit, "metric", unitSystem) : String(value);
  const numeric = Number(converted);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : converted;
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}

export function PostLiquefactionSettlementProfileTab({
  unitSystem,
  importRows,
}: PostLiquefactionSettlementProfileTabProps) {
  const [rows, setRows] = useState<SettlementProfileRow[]>(initialRows);
  const [liquefactionFosByKey, setLiquefactionFosByKey] = useState<Map<string, number> | null>(null);
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const settlementUnit = getDisplayUnit("mm", unitSystem) ?? "mm";

  const applyHandoffIfPresent = () => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem("gih:handoff:post-liquefaction-settlement:v1");
    if (!raw) {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      return;
    }
    const payload = parsed as {
      version?: number;
      rows?: Array<{ boreholeId?: string; sampleDepthM?: number; correctedSptResistance?: number; factorOfSafety?: number }>;
    };
    const incoming = Array.isArray(payload.rows) ? payload.rows : [];
    if (!incoming.length) {
      return;
    }
    setRows((current) => {
      const template = current[0] ?? initialRows[0];
      const next: SettlementProfileRow[] = [];
      for (let index = 0; index < incoming.length; index += 1) {
        const item = incoming[index];
        const boreholeId = (item.boreholeId ?? "").trim();
        const depthM = item.sampleDepthM;
        const n160 = item.correctedSptResistance;
        const fos = item.factorOfSafety;
        if (
          !boreholeId ||
          typeof depthM !== "number" ||
          !Number.isFinite(depthM) ||
          typeof fos !== "number" ||
          !Number.isFinite(fos)
        ) {
          continue;
        }
        const sampleDepth = convertInputValueBetweenSystems(String(depthM), "m", "metric", unitSystem);
        next.push({
          ...template,
          id: next.length + 1,
          boreholeId,
          sampleDepth,
          correctedSptResistance:
            typeof n160 === "number" && Number.isFinite(n160)
              ? Number(n160.toFixed(2)).toString()
              : template.correctedSptResistance,
          correctedSptResistanceSource:
            typeof n160 === "number" && Number.isFinite(n160) ? "liquefaction" : (template.correctedSptResistanceSource ?? null),
          factorOfSafety: Number(fos.toFixed(2)).toString(),
          factorOfSafetySource: "liquefaction",
        });
      }

      return next.length ? next : current;
    });
  };

  const loadLiquefactionFos = () => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      setLiquefactionFosByKey(null);
      return;
    }
    const raw = window.localStorage.getItem("gih:liquefaction:fostable:v1");
    if (!raw) {
      setLiquefactionFosByKey(null);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setLiquefactionFosByKey(null);
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      setLiquefactionFosByKey(null);
      return;
    }
    const payload = parsed as {
      version?: number;
      points?: Array<{ boreholeId?: string; depthM?: number; fos?: number }>;
    };
    const points = Array.isArray(payload.points) ? payload.points : [];
    const next = new Map<string, number>();
    for (const p of points) {
      const boreholeId = (p.boreholeId ?? "").trim();
      const depthM = p.depthM;
      const fos = p.fos;
      if (
        !boreholeId ||
        typeof depthM !== "number" ||
        !Number.isFinite(depthM) ||
        typeof fos !== "number" ||
        !Number.isFinite(fos)
      ) {
        continue;
      }
      next.set(`${boreholeId.toLowerCase()}|${depthM.toFixed(2)}`, fos);
    }
    setLiquefactionFosByKey(next.size ? next : null);
  };

  useEffect(() => {
    loadLiquefactionFos();
    applyHandoffIfPresent();
    if (typeof window === "undefined") {
      return;
    }
    const onUpdated = () => loadLiquefactionFos();
    const onHandoff = () => applyHandoffIfPresent();
    window.addEventListener("gih:liquefaction-fos-updated", onUpdated);
    window.addEventListener("storage", onUpdated);
    window.addEventListener("gih:post-liquefaction-handoff", onHandoff);
    return () => {
      window.removeEventListener("gih:liquefaction-fos-updated", onUpdated);
      window.removeEventListener("storage", onUpdated);
      window.removeEventListener("gih:post-liquefaction-handoff", onHandoff);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitSystem]);

  useEffect(() => {
    if (!liquefactionFosByKey || !liquefactionFosByKey.size) {
      return;
    }
    setRows((current) =>
      current.map((row) => {
        const boreholeId = (row.boreholeId || "").trim();
        if (!boreholeId) {
          return row;
        }
        const depthMetricRaw = convertInputValueBetweenSystems(row.sampleDepth, "m", unitSystem, "metric");
        const depthMetric = Number(depthMetricRaw);
        if (!Number.isFinite(depthMetric)) {
          return row;
        }
        const key = `${boreholeId.toLowerCase()}|${depthMetric.toFixed(2)}`;
        const fos = liquefactionFosByKey.get(key);
        if (fos === undefined) {
          // If the row used to be auto-filled but no longer matches, clear source (keep user's value).
          return row.factorOfSafetySource === "liquefaction" ? { ...row, factorOfSafetySource: null } : row;
        }
        // Auto-fill only when empty or previously auto-filled.
        if (row.factorOfSafetySource === "liquefaction" || !(row.factorOfSafety ?? "").trim()) {
          return {
            ...row,
            factorOfSafety: Number(fos.toFixed(2)).toString(),
            factorOfSafetySource: "liquefaction",
          };
        }
        return row;
      }),
    );
  }, [liquefactionFosByKey, unitSystem]);

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
        layerThickness: convertInputValueBetweenSystems(row.layerThickness, "m", previousUnitSystem.current, unitSystem),
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
      return importRows.map((item, index) => {
        const topM = item.sampleTopDepth;
        const botM = item.sampleBottomDepth;
        let sampleDepth =
          topM === null || topM === undefined
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(topM), "m", "metric", unitSystem);
        let layerThickness = template.layerThickness;
        if (typeof topM === "number" && Number.isFinite(topM) && typeof botM === "number" && Number.isFinite(botM) && botM > topM) {
          const topD = convertInputValueBetweenSystems(String(topM), "m", "metric", unitSystem);
          const botD = convertInputValueBetweenSystems(String(botM), "m", "metric", unitSystem);
          sampleDepth = topD;
          layerThickness = String(parse(botD) - parse(topD));
        }
        return {
          ...template,
          id: index + 1,
          boreholeId: item.boreholeLabel || template.boreholeId,
          sampleDepth,
          layerThickness,
        };
      });
    });
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<SettlementProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const last = current[current.length - 1];
      const lastDepth = last?.sampleDepth ?? "0";
      const lastH = parse(last?.layerThickness ?? "2");
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          boreholeId: "",
          sampleDepth: String(parse(lastDepth) + (Number.isFinite(lastH) && lastH > 0 ? lastH : 2)),
          layerThickness: "2",
          correctedSptResistance: "15",
          factorOfSafety: "1.00",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Layered Samples Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Build a layer-by-layer post-liquefaction settlement sheet using corrected SPT resistance and triggering
              factor of safety as the main screening inputs.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              If available, <span className="font-semibold text-slate-700">FS</span> is auto-filled from the Liquefaction Screening tool by matching{" "}
              <span className="font-semibold text-slate-700">Borehole ID</span> + <span className="font-semibold text-slate-700">sample depth</span>.
              Editing FS will override the auto-filled value.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-base btn-md" onClick={addRow}>
              Add Layer
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
          <table className={profileTableClassXl("c12")}>
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Borehole ID" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Sample depth" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>ΔH</span>} unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>(N<sub>1</sub>)<sub>60</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="FS" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>γ<sub>lim</sub></span>} unit="%" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>D<sub>r</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>F<sub>α</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>γ<sub>max</sub></span>} unit="%" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>ε<sub>v</sub></span>} unit="%" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Settlement" unit={settlementUnit} />
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sampleDepth = parse(row.sampleDepth);
                const layerThickness = parse(row.layerThickness);
                const hasDepthIssue = !Number.isFinite(sampleDepth) || sampleDepth < 0 || !Number.isFinite(layerThickness) || layerThickness <= 0;
                const result =
                  !hasDepthIssue && parse(row.correctedSptResistance) > 0 && parse(row.factorOfSafety) > 0
                    ? computePostLiquefactionSettlement({
                        correctedSptResistance: parse(row.correctedSptResistance),
                        factorOfSafety: parse(row.factorOfSafety),
                        layerThickness,
                      })
                    : null;

                const showAutoFilledBanner =
                  row.correctedSptResistanceSource === "liquefaction" || row.factorOfSafetySource === "liquefaction";

                return (
                  <Fragment key={row.id}>
                  <tr className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
                        value={row.boreholeId}
                        availableIds={rows.map((item) => item.boreholeId)}
                        onChange={(value) => updateRow(row.id, { boreholeId: value })}
                        variant="compact"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.sampleDepth}
                        onChange={(event) => updateRow(row.id, { sampleDepth: event.target.value })}
                        className={`w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 ${
                          hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.01"
                        value={row.layerThickness}
                        onChange={(event) => updateRow(row.id, { layerThickness: event.target.value })}
                        className={`w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 ${
                          hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Valid depth and positive ΔH required.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={row.correctedSptResistance}
                        onChange={(event) =>
                          updateRow(row.id, { correctedSptResistance: event.target.value, correctedSptResistanceSource: null })
                        }
                        className={cnProfileTableInput(false)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={row.factorOfSafety}
                        onChange={(event) =>
                          updateRow(row.id, { factorOfSafety: event.target.value, factorOfSafetySource: null })
                        }
                        className={cnProfileTableInput(false)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={result ? result.limitingShearStrain.toFixed(2) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={result ? result.relativeDensity.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={result ? result.thresholdParameter.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={result ? result.maxShearStrain.toFixed(2) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={result ? result.volumetricStrain.toFixed(2) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={result ? formatForDisplay(result.settlementM * 1000, "mm", unitSystem, 1) : "-"} />
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
                  {showAutoFilledBanner ? (
                    <tr className="bg-white">
                      <td colSpan={3} className="px-2 py-0" />
                      <td colSpan={2} className="px-2 pb-2 pt-0">
                        <div className="inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Auto-filled from Liquefaction Screening
                        </div>
                      </td>
                      <td colSpan={7} className="px-2 py-0" />
                    </tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </ProfileTableScroll>

      </div>
</section>
  );
}


