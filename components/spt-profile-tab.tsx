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
}

const BOREHOLE_DIAMETER_OPTIONS = [
  { label: "65-115 mm (C_b = 1.00)", value: "1.00" },
  { label: "150 mm (C_b = 1.05)", value: "1.05" },
  { label: "200 mm (C_b = 1.15)", value: "1.15" },
] as const;

const ROD_LENGTH_OPTIONS = [
  { label: "< 3 m (C_r = 0.75)", value: "0.75" },
  { label: "3-4 m (C_r = 0.75)", value: "0.75" },
  { label: "4-6 m (C_r = 0.85)", value: "0.85" },
  { label: "6-10 m (C_r = 0.95)", value: "0.95" },
  { label: "10-30 m (C_r = 1.00)", value: "1.00" },
  { label: "> 30 m (screening C_r = 1.00)", value: "1.00" },
] as const;

const SAMPLER_OPTIONS = [
  { label: "Standard sampler with liner (C_s = 1.00)", value: "1.00" },
  { label: "Sampler without liner (C_s = 1.10)", value: "1.10" },
  { label: "Sampler without liner (C_s = 1.20)", value: "1.20" },
  { label: "Sampler without liner (C_s = 1.30)", value: "1.30" },
] as const;

const HAMMER_TYPE_OPTIONS = [
  { label: "Safety hammer (ER range: 60-117%)", value: "safety" },
  { label: "Donut hammer (ER range: 45-100%)", value: "donut" },
  { label: "Automatic trip hammer (ER range: 90-160%)", value: "automatic" },
] as const;

const ENERGY_RATIO_OPTIONS = [
  { label: "45%", value: "45" },
  { label: "60%", value: "60" },
  { label: "70%", value: "70" },
  { label: "80%", value: "80" },
  { label: "90%", value: "90" },
  { label: "100%", value: "100" },
  { label: "117%", value: "117" },
  { label: "130%", value: "130" },
  { label: "160%", value: "160" },
] as const;

const initialRows: SptProfileRow[] = [
  { id: 1, topDepth: "1.5", boreholeId: "", bottomDepth: "3.0", nField: "12" },
  { id: 2, topDepth: "3.0", boreholeId: "", bottomDepth: "5.0", nField: "18" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeCnIdrissBoulanger2008(sigmaEffKpa: number): number {
  if (sigmaEffKpa <= 0) {
    return 0.4;
  }
  const raw = 9.78 * Math.sqrt(1 / sigmaEffKpa);
  return Math.max(0.4, Math.min(raw, 1.7));
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

function getHammerRange(type: string): [number, number] {
  if (type === "automatic") {
    return [90, 160];
  }
  if (type === "donut") {
    return [45, 100];
  }
  return [60, 117];
}

export function SptProfileTab({ unitSystem }: SptProfileTabProps) {
  const [rows, setRows] = useState<SptProfileRow[]>(initialRows);
  const [globalHammerType, setGlobalHammerType] = useState("safety");
  const [globalBoreholeFactor, setGlobalBoreholeFactor] = useState("1.00");
  const [globalEnergyRatio, setGlobalEnergyRatio] = useState("70");
  const [globalRodFactor, setGlobalRodFactor] = useState("0.95");
  const [globalSamplerFactor, setGlobalSamplerFactor] = useState("1.00");
  const [globalGroundwaterDepth, setGlobalGroundwaterDepth] = useState("1.5");
  const [globalUnitWeight, setGlobalUnitWeight] = useState("18.5");
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";

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
    setGlobalGroundwaterDepth((current) =>
      convertInputValueBetweenSystems(current, "m", previousUnitSystem.current, unitSystem),
    );
    setGlobalUnitWeight((current) =>
      convertInputValueBetweenSystems(current, "kN/m3", previousUnitSystem.current, unitSystem),
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
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const ce = parse(globalEnergyRatio) / 60;
  const cb = parse(globalBoreholeFactor);
  const cr = parse(globalRodFactor);
  const cs = parse(globalSamplerFactor);
  const gwtMetric = Number(convertInputValueBetweenSystems(globalGroundwaterDepth, "m", unitSystem, "metric"));
  const gammaMetric = Number(convertInputValueBetweenSystems(globalUnitWeight, "kN/m3", unitSystem, "metric"));
  const hammerRange = getHammerRange(globalHammerType);
  const erValue = parse(globalEnergyRatio);
  const erOutOfRange = erValue < hammerRange[0] || erValue > hammerRange[1];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Vertical effective stress is computed automatically from sample depth, GWT, and bulk unit weight (BHA).
              Overburden correction follows Idriss and Boulanger (2008), with 0.40 &le; C<sub>N</sub> &le; 1.70.
            </p>
          </div>

          <button type="button" className="btn-base btn-md" onClick={addRow}>
            Add Sample
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="spt-hammer-type" className="mb-1 block text-sm font-medium text-slate-700">
              Hammer type
            </label>
            <select
              id="spt-hammer-type"
              value={globalHammerType}
              onChange={(event) => setGlobalHammerType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {HAMMER_TYPE_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="spt-energy-ratio" className="mb-1 block text-sm font-medium text-slate-700">
              Hammer efficiency, ER (%)
            </label>
            <select
              id="spt-energy-ratio"
              value={globalEnergyRatio}
              onChange={(event) => setGlobalEnergyRatio(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {ENERGY_RATIO_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="spt-borehole-diameter" className="mb-1 block text-sm font-medium text-slate-700">
              Borehole diameter
            </label>
            <select
              id="spt-borehole-diameter"
              value={globalBoreholeFactor}
              onChange={(event) => setGlobalBoreholeFactor(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {BOREHOLE_DIAMETER_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="spt-rod-length" className="mb-1 block text-sm font-medium text-slate-700">
              Rod length
            </label>
            <select
              id="spt-rod-length"
              value={globalRodFactor}
              onChange={(event) => setGlobalRodFactor(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {ROD_LENGTH_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="spt-sampler-type" className="mb-1 block text-sm font-medium text-slate-700">
              Sampler type
            </label>
            <select
              id="spt-sampler-type"
              value={globalSamplerFactor}
              onChange={(event) => setGlobalSamplerFactor(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {SAMPLER_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="spt-gwt" className="mb-1 block text-sm font-medium text-slate-700">
              Groundwater depth, GWT ({depthUnit})
            </label>
            <input
              id="spt-gwt"
              type="number"
              min="0"
              step="0.1"
              value={globalGroundwaterDepth}
              onChange={(event) => setGlobalGroundwaterDepth(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            />
          </div>

          <div>
            <label htmlFor="spt-bha" className="mb-1 block text-sm font-medium text-slate-700">
              Bulk unit weight, BHA ({unitWeightUnit})
            </label>
            <input
              id="spt-bha"
              type="number"
              min="0.1"
              step="0.1"
              value={globalUnitWeight}
              onChange={(event) => setGlobalUnitWeight(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            />
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Active global factors: C<sub>E</sub> = {ce.toFixed(3)}, C<sub>b</sub> = {cb.toFixed(3)}, C<sub>r</sub> ={" "}
          {cr.toFixed(3)}, C<sub>s</sub> = {cs.toFixed(3)}
          {erOutOfRange ? (
            <span className="ml-2 text-red-700">
              ER is outside the typical range for the selected hammer ({hammerRange[0]}-{hammerRange[1]}%).
            </span>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[11px] xl:text-[12px]">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Borehole ID" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Top" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Bottom" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="N" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Sample depth" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span>
                        &sigma;&prime;<sub>v0</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="C_E" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="C_b" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="C_r" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="N60" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="C_N" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span>
                        (N<sub>1</sub>)<sub>60</sub>
                      </span>
                    }
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <span className="block leading-tight">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topDepth = parse(row.topDepth);
                const bottomDepth = parse(row.bottomDepth);
                const hasDepthIssue = bottomDepth <= topDepth;
                const sampleDepthDisplay = hasDepthIssue ? 0 : (topDepth + bottomDepth) / 2;
                const sampleDepthMetric = Number(
                  convertInputValueBetweenSystems(String(sampleDepthDisplay), "m", unitSystem, "metric"),
                );
                const sigmaEffMetric = Math.max(
                  gammaMetric * sampleDepthMetric - 9.81 * Math.max(sampleDepthMetric - Math.max(gwtMetric, 0), 0),
                  0.1,
                );
                const sigmaEffDisplay = Number(
                  convertInputValueBetweenSystems(String(sigmaEffMetric), "kPa", "metric", unitSystem),
                );
                const n60 = parse(row.nField) * ce * cb * cr * cs;
                const cn = computeCnIdrissBoulanger2008(sigmaEffMetric);
                const n160 = Math.min(n60 * cn, 2 * n60);

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
                          hasDepthIssue
                            ? "border-red-300 bg-red-50 focus:border-red-400"
                            : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-[10px] text-red-700">Bottom must exceed top.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.nField}
                        onChange={(event) => updateRow(row.id, { nField: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={hasDepthIssue ? "-" : sampleDepthDisplay.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={hasDepthIssue ? "-" : sigmaEffDisplay.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(ce) ? ce.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cb) ? cb.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cr) ? cr.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(n60) ? n60.toFixed(2) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cn) ? cn.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(n160) ? n160.toFixed(2) : "-"} />
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

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plot note</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Vertical effective stress is not entered manually in this Plot. It is calculated from sample depth, GWT, and
          bulk unit weight for each row. The selected global correction factors are then applied consistently to compute
          N<sub>60</sub>, C<sub>N</sub>, and (N<sub>1</sub>)<sub>60</sub>.
        </p>
      </div>
    </section>
  );
}
