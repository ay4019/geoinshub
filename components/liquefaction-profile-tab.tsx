"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import { computeLiquefactionScreening, type LiquefactionMethod } from "@/lib/liquefaction-screening";
import type { UnitSystem } from "@/lib/types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface LiquefactionProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  initialMethod?: LiquefactionMethod;
}

interface LiquefactionProfileRow {
  id: number;
  topDepth: string;
  boreholeId: string;
  bottomDepth: string;
  unitWeight: string;
  finesContent: string;
  n160: string;
}

const initialRows: LiquefactionProfileRow[] = [
  { id: 1, topDepth: "2", boreholeId: "", bottomDepth: "4", unitWeight: "18", finesContent: "10", n160: "12" },
  { id: 2, topDepth: "4", boreholeId: "", bottomDepth: "7", unitWeight: "18.5", finesContent: "18", n160: "18" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function HeaderCell({ title, unit }: { title: ReactNode; unit?: ReactNode }) {
  return (
    <span className="block leading-tight">
      <span className="block">{title}</span>
      {unit ? <span className="mt-0.5 block text-slate-500">({unit})</span> : null}
    </span>
  );
}

export function LiquefactionProfileTab({
  unitSystem,
  importRows,
  initialMethod = "idriss-boulanger-2008",
}: LiquefactionProfileTabProps) {
  const [method, setMethod] = useState<LiquefactionMethod>(initialMethod);
  const [magnitude, setMagnitude] = useState("7.5");
  const [peakGroundAcceleration, setPeakGroundAcceleration] = useState("0.30");
  const [groundwaterDepth, setGroundwaterDepth] = useState("1.5");
  const [rows, setRows] = useState<LiquefactionProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";

  useEffect(() => {
    setMethod(initialMethod);
  }, [initialMethod]);

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setGroundwaterDepth((current) =>
      convertInputValueBetweenSystems(current, "m", previousUnitSystem.current, unitSystem),
    );

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
        bottomDepth: convertInputValueBetweenSystems(row.bottomDepth, "m", previousUnitSystem.current, unitSystem),
        unitWeight: convertInputValueBetweenSystems(row.unitWeight, "kN/m3", previousUnitSystem.current, unitSystem),
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

  const updateRow = (id: number, patch: Partial<LiquefactionProfileRow>) => {
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
          unitWeight: "18",
          finesContent: "15",
          n160: "15",
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
              Define the site earthquake inputs once, then screen multiple sample intervals with the selected
              liquefaction method.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-base btn-md" onClick={addRow}>
              Add Sample
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

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700">Method</label>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as LiquefactionMethod)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              <option value="idriss-boulanger-2008">Idriss &amp; Boulanger (2008)</option>
              <option value="tbdy-2018">TBDY 2018 (in force since 1 Jan 2019)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700">Earthquake magnitude, M_w</label>
            <input type="number" min="5" step="0.1" value={magnitude} onChange={(event) => setMagnitude(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
          </div>
          <div>
            <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700">
              {method === "tbdy-2018"
                ? "Peak Ground Acceleration, PGA (0.4SDS) (g)"
                : "Peak Ground Acceleration, PGA (g)"}
            </label>
            <input type="number" min="0" step="0.01" value={peakGroundAcceleration} onChange={(event) => setPeakGroundAcceleration(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
          </div>
          <div>
            <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700">Groundwater depth, GWT ({depthUnit})</label>
            <input type="number" min="0" step="0.1" value={groundwaterDepth} onChange={(event) => setGroundwaterDepth(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[11px] xl:text-[12px]">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Borehole ID" /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Top" unit={depthUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Bottom" unit={depthUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Unit wt." unit={unitWeightUnit} /></th>
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title="Fines" unit="%" /></th>
                <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">(N<sub>1</sub>)<sub>60</sub></span></th>
                {method === "tbdy-2018" ? (
                  <>
                    <th className="px-2 py-3 text-center font-semibold"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white font-serif text-base text-slate-800">?</span></th>
                    <th className="px-2 py-3 text-center font-semibold"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white font-serif text-base text-slate-800">�</span></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">(N<sub>1</sub>)<sub>60f</sub></span></th>
                  </>
                ) : (
                  <>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">?N<sub>(1,60)</sub></span></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">(N<sub>1</sub>)<sub>60,cs</sub></span></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">CRR<sub>7.5</sub></span></th>
                  </>
                )}
                <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>?<sub>v0</sub></span>} unit="kPa" /></th>
                <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">Check<sup>1</sup></span></th>
                {method === "tbdy-2018" ? (
                  <>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">C<sub>M</sub></span></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">CRR<sub>7.5</sub></span></th>
                    <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>?'<sub>v0</sub></span>} unit="kPa" /></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">r<sub>d</sub></span></th>
                    <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>?<sub>R</sub></span>} unit="kPa" /></th>
                    <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>?<sub>eq</sub></span>} unit="kPa" /></th>
                  </>
                ) : (
                  <>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">MSF</span></th>
                    <th className="px-2 py-3 text-left font-semibold"><HeaderCell title={<span>?'<sub>v0</sub></span>} unit="kPa" /></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">r<sub>d</sub></span></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">CSR</span></th>
                    <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">CRR<sub>M</sub></span></th>
                  </>
                )}
                <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">FS</span></th>
                <th className="px-2 py-3 text-left font-semibold"><span className="block leading-tight">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topDepth = parse(row.topDepth);
                const bottomDepth = parse(row.bottomDepth);
                const sampleDepth = (topDepth + bottomDepth) / 2;
                const hasDepthIssue = bottomDepth <= topDepth;
                const rawResult =
                  !hasDepthIssue && parse(magnitude) > 0
                    ? computeLiquefactionScreening({
                        method,
                        magnitude: parse(magnitude),
                        peakGroundAcceleration: parse(peakGroundAcceleration),
                        groundwaterDepth: parse(groundwaterDepth),
                        unitWeight: parse(row.unitWeight),
                        finesContent: parse(row.finesContent),
                        sampleDepth,
                        n160: parse(row.n160),
                      })
                    : null;

                const checkStatus = hasDepthIssue
                  ? "Invalid depth interval"
                  : sampleDepth > 20
                    ? "Outside sample depth range"
                    : sampleDepth <= parse(groundwaterDepth)
                      ? "Above GWT"
                      : parse(row.n160) > 30
                        ? "(N1)60 > 30"
                        : "Analysis";

                const result = checkStatus === "Analysis" ? rawResult : null;
                const statusTone =
                  checkStatus === "Analysis"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : checkStatus === "Invalid depth interval"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-amber-200 bg-amber-50 text-amber-800";

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3"><BoreholeIdSelector value={row.boreholeId} availableIds={rows.map((item) => item.boreholeId)} onChange={(value) => updateRow(row.id, { boreholeId: value })} /></td>
                    <td className="px-2 py-3"><input type="number" step="0.1" min="0" value={row.topDepth} onChange={(event) => updateRow(row.id, { topDepth: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" /></td>
                    <td className="px-2 py-3">
                      <input type="number" step="0.1" min="0" value={row.bottomDepth} onChange={(event) => updateRow(row.id, { bottomDepth: event.target.value })} className={`w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 ${hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"}`} />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Bottom must exceed top.</p> : null}
                    </td>
                    <td className="px-2 py-3"><input type="number" step="0.1" min="1" value={row.unitWeight} onChange={(event) => updateRow(row.id, { unitWeight: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" /></td>
                    <td className="px-2 py-3"><input type="number" step="0.1" min="0" max="100" value={row.finesContent} onChange={(event) => updateRow(row.id, { finesContent: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" /></td>
                    <td className="px-2 py-3"><input type="number" step="0.1" min="1" value={row.n160} onChange={(event) => updateRow(row.id, { n160: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500" /></td>

                    {method === "tbdy-2018" ? (
                      <>
                        <td className="px-2 py-3 text-center font-semibold text-slate-900">{rawResult ? rawResult.alpha?.toFixed(2) : "-"}</td>
                        <td className="px-2 py-3 text-center font-semibold text-slate-900">{rawResult ? rawResult.beta?.toFixed(3) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{rawResult ? rawResult.n160f?.toFixed(2) : "-"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-3 font-semibold text-slate-900">{rawResult ? rawResult.deltaN?.toFixed(2) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{rawResult ? rawResult.n160cs?.toFixed(2) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{rawResult ? rawResult.crr75.toFixed(3) : "-"}</td>
                      </>
                    )}

                    <td className="px-2 py-3 font-semibold text-slate-900">{rawResult ? rawResult.sigmaV0.toFixed(1) : "-"}</td>
                    <td className="px-2 py-3"><div className={`rounded-lg border px-2 py-1.5 font-semibold leading-tight ${statusTone}`}>{checkStatus}</div></td>

                    {method === "tbdy-2018" ? (
                      <>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.cm?.toFixed(3) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.crr75.toFixed(3) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.sigmaV0Effective.toFixed(1) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.rd.toFixed(3) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.tauResistance?.toFixed(2) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.tauEarthquake?.toFixed(2) : "-"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.msf?.toFixed(3) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.sigmaV0Effective.toFixed(1) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.rd.toFixed(3) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.csr?.toFixed(3) : "-"}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">{result ? result.crrMagnitudeCorrected?.toFixed(3) : "-"}</td>
                      </>
                    )}

                    <td className="px-2 py-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-semibold text-slate-900">{result ? result.fos.toFixed(2) : "-"}</div>
                      <p className="mt-1 text-[10px] leading-tight text-slate-500">{rawResult ? `Mid-depth: ${sampleDepth.toFixed(2)} ${depthUnit}` : "Enter valid layer depths."}</p>
                      {result && result.fos < result.minimumRequiredFos ? <p className="mt-1 text-[10px] font-semibold leading-tight text-red-700">Liquefaction Potential!</p> : null}
                    </td>
                    <td className="px-2 py-3"><button type="button" className="btn-base w-full px-2 py-1.5 text-sm" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          <sup>1</sup> See the Information tab for the layered screening criteria and method-specific check conditions.
        </p>

      </div>
</section>
  );
}


