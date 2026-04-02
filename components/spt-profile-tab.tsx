"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import type { UnitSystem } from "@/lib/types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface SptProfileTabProps {
  unitSystem: UnitSystem;
}

interface SptProfileRow {
  id: number;
  topDepth: string;
  boreholeId: string;
  bottomDepth: string;
  nField: string;
  energyRatio: string;
  boreholeFactor: string;
  rodFactor: string;
  samplerFactor: string;
  effectiveStress: string;
}

const initialRows: SptProfileRow[] = [
  {
      id: 1,
      topDepth: "1.5",
      boreholeId: "",
      bottomDepth: "3.0",
    nField: "12",
    energyRatio: "70",
    boreholeFactor: "1.00",
    rodFactor: "0.85",
    samplerFactor: "1.00",
    effectiveStress: "45",
  },
  {
      id: 2,
      topDepth: "3.0",
      boreholeId: "",
      bottomDepth: "5.0",
    nField: "18",
    energyRatio: "70",
    boreholeFactor: "1.00",
    rodFactor: "0.95",
    samplerFactor: "1.00",
    effectiveStress: "75",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeCn(method: "peck-1974" | "liao-whitman-1986", sigmaEff: number): number {
  if (sigmaEff <= 0) {
    return 0;
  }

  const raw =
    method === "peck-1974"
      ? 0.77 * (Math.log(2000 / sigmaEff) / Math.LN10)
      : Math.sqrt(100 / sigmaEff);

  return Math.min(Math.max(raw, 0.2), 2.0);
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

export function SptProfileTab({ unitSystem }: SptProfileTabProps) {
  const [cnMethod, setCnMethod] = useState<"peck-1974" | "liao-whitman-1986">("peck-1974");
  const [rows, setRows] = useState<SptProfileRow[]>(initialRows);
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
        effectiveStress: convertInputValueBetweenSystems(row.effectiveStress, "kPa", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  const updateRow = (id: number, patch: Partial<SptProfileRow>) => {
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
            bottomDepth: String(parse(lastBottom) + 1.5),
          nField: "15",
          energyRatio: "70",
          boreholeFactor: "1.00",
          rodFactor: "1.00",
          samplerFactor: "1.00",
          effectiveStress: "100",
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Apply the same SPT correction workflow to multiple sample intervals using one selected overburden correction method.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_auto] sm:items-end">
            <div>
              <label htmlFor="spt-cn-method" className="mb-1 block text-sm font-medium text-slate-700">
                Overburden correction method, C<sub>N</sub>
              </label>
              <select
                id="spt-cn-method"
                value={cnMethod}
                onChange={(event) => setCnMethod(event.target.value as "peck-1974" | "liao-whitman-1986")}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
              >
                <option value="peck-1974">Peck et al. (1974)</option>
                <option value="liao-whitman-1986">Liao &amp; Whitman (1986)</option>
              </select>
            </div>
            <button type="button" className="btn-base btn-md" onClick={addRow}>
              Add Sample
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[11px] xl:text-[12px]">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Borehole ID" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Top" unit={depthUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Bottom" unit={depthUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="N" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="ER" unit="%" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="C_b" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="C_r" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="C_s" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="C_E" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>Ïƒâ€²<sub>v0</sub></span>} unit={stressUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="N60" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="C_N" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>(N<sub>1</sub>)<sub>60</sub></span>} /></th>
                <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sigmaEffMetric = Number(convertInputValueBetweenSystems(row.effectiveStress, "kPa", unitSystem, "metric"));
                const ce = parse(row.energyRatio) / 60;
                const n60 = parse(row.nField) * ce * parse(row.boreholeFactor) * parse(row.rodFactor) * parse(row.samplerFactor);
                const cn = computeCn(cnMethod, sigmaEffMetric);
                const n160 = Math.min(n60 * cn, 2 * n60);
                const hasDepthIssue = parse(row.bottomDepth) <= parse(row.topDepth);

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <BoreholeIdSelector value={row.boreholeId} availableIds={rows.map((item) => item.boreholeId)} onChange={(value) => updateRow(row.id, { boreholeId: value })} />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.1" min="0" value={row.topDepth} onChange={(event) => updateRow(row.id, { topDepth: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.1" min="0" value={row.bottomDepth} onChange={(event) => updateRow(row.id, { bottomDepth: event.target.value })} className={`w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 ${hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"}`} />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="1" min="1" value={row.nField} onChange={(event) => updateRow(row.id, { nField: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.1" min="1" value={row.energyRatio} onChange={(event) => updateRow(row.id, { energyRatio: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.01" min="0.5" value={row.boreholeFactor} onChange={(event) => updateRow(row.id, { boreholeFactor: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.01" min="0.5" value={row.rodFactor} onChange={(event) => updateRow(row.id, { rodFactor: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.01" min="0.5" value={row.samplerFactor} onChange={(event) => updateRow(row.id, { samplerFactor: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
                    </td>
                    <td className="px-2 py-3"><OutputCell value={Number.isFinite(ce) ? ce.toFixed(3) : "-"} /></td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.1" min="1" value={row.effectiveStress} onChange={(event) => updateRow(row.id, { effectiveStress: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
                    </td>
                    <td className="px-2 py-3"><OutputCell value={Number.isFinite(n60) ? n60.toFixed(2) : "-"} /></td>
                    <td className="px-2 py-3"><OutputCell value={Number.isFinite(cn) ? cn.toFixed(3) : "-"} /></td>
                    <td className="px-2 py-3"><OutputCell value={Number.isFinite(n160) ? n160.toFixed(2) : "-"} /></td>
                    <td className="px-2 py-3">
                      <button type="button" className="btn-base w-full px-2 py-1.5 text-sm" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plot note</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This profile sheet applies one selected overburden correction method across all samples, while keeping the
            energy and equipment factors explicit for each interval. Use it as a rapid profile-level normalisation tool,
            then continue to fines correction separately if liquefaction triggering work is needed.
          </p>
        </div>
      </div>
    </section>
  );
}


