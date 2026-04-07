"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import { computePostLiquefactionSettlement } from "@/lib/post-liquefaction-settlement";
import type { UnitSystem } from "@/lib/types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface PostLiquefactionSettlementProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
}

interface SettlementProfileRow {
  id: number;
  topDepth: string;
  boreholeId: string;
  bottomDepth: string;
  correctedSptResistance: string;
  factorOfSafety: string;
}

const initialRows: SettlementProfileRow[] = [
  { id: 1, topDepth: "2", boreholeId: "", bottomDepth: "4", correctedSptResistance: "12", factorOfSafety: "0.85" },
  { id: 2, topDepth: "4", boreholeId: "", bottomDepth: "7", correctedSptResistance: "18", factorOfSafety: "1.10" },
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

function HeaderCell({ title, unit }: { title: ReactNode; unit?: ReactNode }) {
  return (
    <span className="block leading-tight">
      <span className="block">{title}</span>
      {unit ? <span className="mt-0.5 block text-slate-500">({unit})</span> : null}
    </span>
  );
}

function OutputCell({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] font-semibold text-slate-900">
      {value}
    </div>
  );
}

export function PostLiquefactionSettlementProfileTab({
  unitSystem,
  importRows,
}: PostLiquefactionSettlementProfileTabProps) {
  const [rows, setRows] = useState<SettlementProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const settlementUnit = getDisplayUnit("mm", unitSystem) ?? "mm";

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
        bottomDepth: convertInputValueBetweenSystems(row.bottomDepth, "m", previousUnitSystem.current, unitSystem),
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
      return importRows.map((item, index) => ({
        ...template,
        id: index + 1,
        boreholeId: item.boreholeLabel || template.boreholeId,
        topDepth:
          item.sampleTopDepth === null
            ? template.topDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
      }));
    });
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<SettlementProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastBottom = current[current.length - 1]?.bottomDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
          {
            id: nextId,
            topDepth: lastBottom,
            boreholeId: "",
            bottomDepth: String(parse(lastBottom) + 2),
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

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[11px] xl:text-[12px]">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Borehole ID" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Top" unit={depthUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Bottom" unit={depthUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>ΔH</span>} unit={depthUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>(N<sub>1</sub>)<sub>60</sub></span>} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="FS" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>γ<sub>lim</sub></span>} unit="%" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>D<sub>r</sub></span>} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>F<sub>α</sub></span>} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>γ<sub>max</sub></span>} unit="%" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>ε<sub>v</sub></span>} unit="%" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Settlement" unit={settlementUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topDepth = parse(row.topDepth);
                const bottomDepth = parse(row.bottomDepth);
                const layerThickness = bottomDepth - topDepth;
                const hasDepthIssue = layerThickness <= 0;
                const result =
                  !hasDepthIssue && parse(row.correctedSptResistance) > 0 && parse(row.factorOfSafety) > 0
                    ? computePostLiquefactionSettlement({
                        correctedSptResistance: parse(row.correctedSptResistance),
                        factorOfSafety: parse(row.factorOfSafety),
                        layerThickness,
                      })
                    : null;

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
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
                        value={row.topDepth}
                        onChange={(event) => updateRow(row.id, { topDepth: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.bottomDepth}
                        onChange={(event) => updateRow(row.id, { bottomDepth: event.target.value })}
                        className={`w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 ${
                          hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Bottom must exceed top.</p> : null}
                    </td>
                    <td className="px-2 py-3 font-semibold text-slate-900">
                      {hasDepthIssue ? "-" : formatForDisplay(layerThickness, "m", unitSystem, 2)}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={row.correctedSptResistance}
                        onChange={(event) => updateRow(row.id, { correctedSptResistance: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={row.factorOfSafety}
                        onChange={(event) => updateRow(row.id, { factorOfSafety: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
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
                        className="btn-base w-full px-2 py-1.5 text-sm"
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
        </div>

      </div>
</section>
  );
}


