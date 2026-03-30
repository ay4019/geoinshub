"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface GmaxProfileTabProps {
  unitSystem: UnitSystem;
}

type DensityInputMode = "unit-weight" | "mass-density";

interface GmaxProfileRow {
  id: number;
  topDepth: string;
  bottomDepth: string;
  vs: string;
  unitWeight: string;
  density: string;
}

interface ProfilePoint {
  topDepth: number;
  bottomDepth: number;
  vs: number;
  gmax: number;
}

const GRAVITY = 9.81;

const initialRows: GmaxProfileRow[] = [
  {
    id: 1,
    topDepth: "0",
    bottomDepth: "2",
    vs: "160",
    unitWeight: "17.5",
    density: "1784",
  },
  {
    id: 2,
    topDepth: "2",
    bottomDepth: "6",
    vs: "240",
    unitWeight: "19.0",
    density: "1937",
  },
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

function OutputCell({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] font-semibold text-slate-900">
      {value}
    </div>
  );
}

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function ProfileChart({
  title,
  xLabel,
  xUnit,
  rows,
  valueKey,
  digits,
}: {
  title: string;
  xLabel: string;
  xUnit: string;
  rows: ProfilePoint[];
  valueKey: "vs" | "gmax";
  digits: number;
}) {
  const width = 520;
  const height = 320;
  const margin = { top: 20, right: 22, bottom: 44, left: 66 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...rows.map((row) => row.bottomDepth), 1);
  const maxValue = Math.max(...rows.map((row) => row[valueKey]), 1);

  const xTicks = 5;
  const yTicks = 5;
  const xScale = (value: number) => margin.left + (value / maxValue) * innerWidth;
  const yScale = (depth: number) => margin.top + (depth / maxDepth) * innerHeight;

  const segments = rows.flatMap((row, index) => {
    const value = row[valueKey];
    const topY = yScale(row.topDepth);
    const bottomY = yScale(row.bottomDepth);
    const x = xScale(value);
    const next = rows[index + 1];
    const nextX = next ? xScale(next[valueKey]) : null;
    const boundaryY = next ? yScale(row.bottomDepth) : null;

    return [
      <line
        key={`${title}-vertical-${index}`}
        x1={x}
        y1={topY}
        x2={x}
        y2={bottomY}
        stroke="#1e3a5f"
        strokeWidth="3"
        strokeLinecap="round"
      />,
      next && nextX !== null && boundaryY !== null ? (
        <line
          key={`${title}-step-${index}`}
          x1={x}
          y1={boundaryY}
          x2={nextX}
          y2={boundaryY}
          stroke="#4f6f95"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 4"
        />
      ) : null,
    ];
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full">
        <rect x="0" y="0" width={width} height={height} rx="14" fill="#f8fbff" />

        {Array.from({ length: xTicks + 1 }).map((_, index) => {
          const value = (maxValue / xTicks) * index;
          const x = xScale(value);
          return (
            <g key={`${title}-x-grid-${index}`}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + innerHeight}
                stroke="#d6e1ee"
                strokeWidth="1"
              />
              <text x={x} y={height - 18} textAnchor="middle" fontSize="11" fill="#516b8a">
                {value.toFixed(digits)}
              </text>
            </g>
          );
        })}

        {Array.from({ length: yTicks + 1 }).map((_, index) => {
          const depth = (maxDepth / yTicks) * index;
          const y = yScale(depth);
          return (
            <g key={`${title}-y-grid-${index}`}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + innerWidth}
                y2={y}
                stroke="#d6e1ee"
                strokeWidth="1"
              />
              <text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#516b8a">
                {depth.toFixed(1)}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + innerHeight}
          stroke="#8098b5"
          strokeWidth="1.5"
        />
        <line
          x1={margin.left}
          y1={margin.top + innerHeight}
          x2={margin.left + innerWidth}
          y2={margin.top + innerHeight}
          stroke="#8098b5"
          strokeWidth="1.5"
        />

        {segments}

        <text
          x={margin.left + innerWidth / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize="12"
          fill="#1e3a5f"
          fontWeight="600"
        >
          {xLabel} ({xUnit})
        </text>
        <text
          x="18"
          y={margin.top + innerHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#1e3a5f"
          fontWeight="600"
          transform={`rotate(-90 18 ${margin.top + innerHeight / 2})`}
        >
          Depth
        </text>
      </svg>
    </div>
  );
}

export function GmaxProfileTab({ unitSystem }: GmaxProfileTabProps) {
  const [densityInputMode, setDensityInputMode] = useState<DensityInputMode>("unit-weight");
  const [rows, setRows] = useState<GmaxProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const velocityUnit = getDisplayUnit("m/s", unitSystem) ?? "m/s";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";
  const densityUnit = getDisplayUnit("kg/m3", unitSystem) ?? "kg/m3";
  const gmaxUnit = getDisplayUnit("MPa", unitSystem) ?? "MPa";

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
        bottomDepth: convertInputValueBetweenSystems(row.bottomDepth, "m", previousUnitSystem.current, unitSystem),
        vs: convertInputValueBetweenSystems(row.vs, "m/s", previousUnitSystem.current, unitSystem),
        unitWeight: convertInputValueBetweenSystems(row.unitWeight, "kN/m3", previousUnitSystem.current, unitSystem),
        density: convertInputValueBetweenSystems(row.density, "kg/m3", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  const updateRow = (id: number, patch: Partial<GmaxProfileRow>) => {
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
          bottomDepth: String(parse(lastBottom) + 2),
          vs: "220",
          unitWeight: "18.5",
          density: "1886",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const plotRows: ProfilePoint[] = rows
    .map((row) => {
      const topDepth = parse(convertInputValueBetweenSystems(row.topDepth, "m", unitSystem, "metric"));
      const bottomDepth = parse(convertInputValueBetweenSystems(row.bottomDepth, "m", unitSystem, "metric"));
      const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
      const densityMetric =
        densityInputMode === "mass-density"
          ? parse(convertInputValueBetweenSystems(row.density, "kg/m3", unitSystem, "metric"))
          : (parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric")) * 1000) / GRAVITY;
      const gmaxMetric = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

      return {
        topDepth,
        bottomDepth,
        vs: Number(convertInputValueBetweenSystems(String(vsMetric), "m/s", "metric", unitSystem)),
        gmax: Number(convertInputValueBetweenSystems(String(gmaxMetric), "MPa", "metric", unitSystem)),
      };
    })
    .filter((row) => row.bottomDepth > row.topDepth)
    .sort((a, b) => a.topDepth - b.topDepth);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Pilot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Build a layered small-strain stiffness profile by entering shear wave velocity with either unit weight or
              mass density for each layer.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,250px)_auto] sm:items-end">
            <div>
              <label htmlFor="gmax-density-mode" className="mb-1 block text-sm font-medium text-slate-700">
                Density input mode
              </label>
              <select
                id="gmax-density-mode"
                value={densityInputMode}
                onChange={(event) => setDensityInputMode(event.target.value as DensityInputMode)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
              >
                <option value="unit-weight">Use unit weight, γ</option>
                <option value="mass-density">Use mass density, ρ</option>
              </select>
            </div>
            <button type="button" className="btn-base btn-md" onClick={addRow}>
              Add Layer
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full table-fixed border-collapse text-[12px] lg:text-[13px]">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Top" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Bottom" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="V_s" unit={velocityUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Unit wt." unit={unitWeightUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Mass density" unit={densityUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="G_max" unit="MPa" />
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
                const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
                const densityMetric =
                  densityInputMode === "mass-density"
                    ? parse(convertInputValueBetweenSystems(row.density, "kg/m3", unitSystem, "metric"))
                    : (parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric")) * 1000) / GRAVITY;
                const unitWeightMetric =
                  densityInputMode === "mass-density"
                    ? (densityMetric * GRAVITY) / 1000
                    : parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
                const displayDensity = convertInputValueBetweenSystems(
                  String(densityMetric),
                  "kg/m3",
                  "metric",
                  unitSystem,
                );
                const displayUnitWeight = convertInputValueBetweenSystems(
                  String(unitWeightMetric),
                  "kN/m3",
                  "metric",
                  unitSystem,
                );
                const gmaxMpa = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.topDepth}
                        onChange={(event) => updateRow(row.id, { topDepth: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.bottomDepth}
                        onChange={(event) => updateRow(row.id, { bottomDepth: event.target.value })}
                        className={`w-full rounded-lg border px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 ${
                          hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Bottom must exceed top.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.vs}
                        onChange={(event) => updateRow(row.id, { vs: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      {densityInputMode === "unit-weight" ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={row.unitWeight}
                          onChange={(event) => updateRow(row.id, { unitWeight: event.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                        />
                      ) : (
                        <OutputCell value={format(Number(displayUnitWeight), 3)} />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {densityInputMode === "mass-density" ? (
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={row.density}
                          onChange={(event) => updateRow(row.id, { density: event.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                        />
                      ) : (
                        <OutputCell value={format(Number(displayDensity), 1)} />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={format(gmaxMpa, 3)} />
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

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pilot note</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The selected density mode applies to the full profile. When unit weight, γ is the active input, mass
            density, ρ is calculated automatically for each layer; when mass density, ρ is active, unit weight, γ is
            back-calculated before <span className="font-medium text-slate-700">G<sub>max</sub></span> is formed from
            <span className="font-medium text-slate-700"> ρV<sub>s</sub><sup>2</sup></span>.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileChart
          title="Depth vs V_s"
          xLabel="V_s"
          xUnit={velocityUnit}
          rows={plotRows}
          valueKey="vs"
          digits={0}
        />
        <ProfileChart
          title="Depth vs G_max"
          xLabel="G_max"
          xUnit={gmaxUnit}
          rows={plotRows}
          valueKey="gmax"
          digits={2}
        />
      </div>
    </section>
  );
}
