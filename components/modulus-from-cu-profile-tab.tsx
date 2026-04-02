"use client";

import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import { EngineeringText } from "@/components/engineering-text";
import type { UnitSystem } from "@/lib/types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface ModulusFromCuProfileTabProps {
  unitSystem: UnitSystem;
}

type RatioBasis = "soft-clay" | "medium-clay" | "stiff-clay";
type RatioMode = "auto" | "manual";

interface ProfileRow {
  id: number;
  topDepth: string;
  boreholeId: string;
  bottomDepth: string;
  ratioBasis: RatioBasis;
  ratioMode: RatioMode;
  manualRatio: string;
  cu: string;
}

const basisOptions: Array<{ value: RatioBasis; label: string; ratio: number; range: string }> = [
  { value: "soft-clay", label: "Soft clay basis", ratio: 150, range: "100 - 200" },
  { value: "medium-clay", label: "Medium clay basis", ratio: 300, range: "200 - 400" },
  { value: "stiff-clay", label: "Stiff clay basis", ratio: 600, range: "400 - 800" },
];

const initialRows: ProfileRow[] = [
  {
    id: 1,
    topDepth: "0",
    boreholeId: "",
    bottomDepth: "2",
    ratioBasis: "soft-clay",
    ratioMode: "auto",
    manualRatio: "150",
    cu: "25",
  },
  {
    id: 2,
    topDepth: "2",
    boreholeId: "",
    bottomDepth: "6",
    ratioBasis: "medium-clay",
    ratioMode: "auto",
    manualRatio: "300",
    cu: "55",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRecommendedRatio(basis: RatioBasis): number {
  return basisOptions.find((item) => item.value === basis)?.ratio ?? 300;
}

function getRangeLabel(basis: RatioBasis): string {
  return basisOptions.find((item) => item.value === basis)?.range ?? "200 - 400";
}

export function ModulusFromCuProfileTab({ unitSystem }: ModulusFromCuProfileTabProps) {
  const [rows, setRows] = useState<ProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
        bottomDepth: convertInputValueBetweenSystems(row.bottomDepth, "m", previousUnitSystem.current, unitSystem),
        cu: convertInputValueBetweenSystems(row.cu, "kPa", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

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
      const lastBottom = current[current.length - 1]?.bottomDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          topDepth: lastBottom,
          boreholeId: "",
          bottomDepth: String(parse(lastBottom) + 2),
          ratioBasis: "medium-clay",
          ratioMode: "auto",
          manualRatio: "300",
          cu: "50",
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
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Enter sample intervals and undrained strengths to build a quick profile-based
              <EngineeringText text=" E_u " />
              screening table. Auto mode still follows the recommended
              <EngineeringText text=" E/c_u " />
              basis, while manual mode lets you override the ratio row by row.
            </p>
          </div>
          <button type="button" className="btn-base btn-md" onClick={addRow}>
            Add Sample
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[12px] lg:text-[13px]">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">Borehole ID</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">Top ({depthUnit})</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">Bottom ({depthUnit})</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">Suggested basis</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">Ratio mode</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">c<sub>u</sub> ({stressUnit})</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">E/c<sub>u</sub></th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">E<sub>u</sub> ({stressUnit})</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topDepth = parse(row.topDepth);
                const bottomDepth = parse(row.bottomDepth);
                const cu = parse(row.cu);
                const ratio = row.ratioMode === "auto" ? getRecommendedRatio(row.ratioBasis) : parse(row.manualRatio);
                const eu = cu * ratio;
                const hasDepthIssue = bottomDepth <= topDepth;

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
                        className="w-full min-w-0 rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.bottomDepth}
                        onChange={(event) => updateRow(row.id, { bottomDepth: event.target.value })}
                        className={`w-full min-w-0 rounded-lg border px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 ${
                          hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Bottom must exceed top depth.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={row.ratioBasis}
                        onChange={(event) => updateRow(row.id, { ratioBasis: event.target.value as RatioBasis })}
                        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
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
                        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.cu}
                        onChange={(event) => updateRow(row.id, { cu: event.target.value })}
                        className="w-full min-w-0 rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="10"
                        value={row.ratioMode === "auto" ? String(getRecommendedRatio(row.ratioBasis)) : row.manualRatio}
                        disabled={row.ratioMode === "auto"}
                        onChange={(event) => updateRow(row.id, { manualRatio: event.target.value })}
                        className={`w-full min-w-0 rounded-lg border px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 ${
                          row.ratioMode === "auto"
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
                            : "border-slate-300 bg-white focus:border-slate-500"
                        }`}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {row.ratioMode === "auto" ? "Auto-filled from suggested basis." : "Manual override."}
                      </p>
                    </td>
                    <td className="px-2 py-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-semibold text-slate-900">
                        {Number.isFinite(eu) ? eu.toFixed(eu >= 100 ? 0 : 1) : "-"}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className="btn-base w-full px-2 py-2 text-sm"
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

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Plot disclaimer</p>
        <p className="mt-1">
          This profile-based view is a Plot workflow for screening only. It does not replace project-specific stiffness
          testing, strain-level selection, or professional engineering judgement.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plot note</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This Plot is intended for cohesive soils only. The suggested <EngineeringText text="E/c_u" /> basis remains
          consistency-based, and manual override should be used only when project-specific stiffness data or back-analysis
          supports a different ratio.
        </p>
      </div>
    </section>
  );
}




