"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { computeLiquefactionScreening, type LiquefactionMethod } from "@/lib/liquefaction-screening";
import type { UnitSystem } from "@/lib/types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface LiquefactionProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  initialMethod?: LiquefactionMethod;
}

interface LiquefactionProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  unitWeight: string;
  finesContent: string;
  n160: string;
}

const initialRows: LiquefactionProfileRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "3", unitWeight: "18", finesContent: "10", n160: "12" },
  { id: 2, boreholeId: "", sampleDepth: "5.5", unitWeight: "18.5", finesContent: "18", n160: "18" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

  const fosPlot = useMemo(() => {
    const gwt = parse(groundwaterDepth);
    const points = rows
      .map((row) => {
        const sampleDepth = parse(row.sampleDepth);
        const hasDepthIssue = !Number.isFinite(sampleDepth) || sampleDepth <= 0;
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
          ? "Invalid sample depth"
          : sampleDepth > 20
            ? "Outside sample depth range"
            : sampleDepth <= gwt
              ? "Above GWT"
              : parse(row.n160) > 30
                ? "(N1)60 > 30"
                : "Analysis";
        const result = checkStatus === "Analysis" ? rawResult : null;
        const fos = result ? result.fos : null;

        return {
          id: row.id,
          boreholeId: (row.boreholeId || "").trim() || "—",
          depth: sampleDepth,
          fos,
        };
      })
      .filter((item) => Number.isFinite(item.depth) && item.depth > 0 && item.fos !== null && Number.isFinite(item.fos));

    const boreholes = Array.from(new Set(points.map((p) => p.boreholeId).filter(Boolean)));
    const maxDepth = Math.max(6, ...points.map((p) => p.depth));
    const maxFoS = Math.max(1.6, ...points.map((p) => p.fos ?? 0));

    return { points, maxDepth, maxFoS, boreholes };
  }, [groundwaterDepth, magnitude, method, peakGroundAcceleration, rows]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      unitSystem,
      method,
      points: fosPlot.points
        .filter((p) => p.boreholeId && p.boreholeId !== "—" && Number.isFinite(p.depth) && Number.isFinite(p.fos ?? NaN))
        .map((p) => {
          const depthMetricRaw = convertInputValueBetweenSystems(String(p.depth), "m", unitSystem, "metric");
          const depthMetric = Number(depthMetricRaw);
          return {
            boreholeId: (p.boreholeId || "").trim(),
            depthM: Number.isFinite(depthMetric) ? Number(depthMetric.toFixed(2)) : null,
            fos: p.fos ?? null,
          };
        })
        .filter((p) => typeof p.depthM === "number" && Number.isFinite(p.depthM) && p.fos !== null && Number.isFinite(p.fos)),
    };
    window.localStorage.setItem("gih:liquefaction:fostable:v1", JSON.stringify(payload));
    window.dispatchEvent(new Event("gih:liquefaction-fos-updated"));
  }, [fosPlot.points, method, unitSystem]);

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
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
        unitWeight: convertInputValueBetweenSystems(row.unitWeight, "kN/m3", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  useEffect(() => {
    if (!importRows || importRows.length === 0) {
      return;
    }

    const importGwt = importRows.find((item) => item.gwtDepth !== null && item.gwtDepth !== undefined)?.gwtDepth ?? null;
    if (typeof importGwt === "number" && Number.isFinite(importGwt)) {
      setGroundwaterDepth(convertInputValueBetweenSystems(String(importGwt), "m", "metric", unitSystem));
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
        unitWeight:
          item.unitWeight === null || item.unitWeight === undefined || !Number.isFinite(item.unitWeight)
            ? template.unitWeight
            : convertInputValueBetweenSystems(String(item.unitWeight), "kN/m3", "metric", unitSystem),
      }));
    });
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<LiquefactionProfileRow>) => {
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
          sampleDepth: String(parse(lastDepth) + 2),
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
              Define the site earthquake inputs once, then screen multiple samples (by borehole and sample depth) with
              the selected liquefaction method.
            </p>
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

        <ProfileTableScroll>
          <table className={profileTableClassXl("cWide")}>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Borehole ID" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Sample depth" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Unit wt." unit={unitWeightUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Fines" unit="%" />
                </th>
                <th className={profileTableThClass}>
                  <span className="block leading-tight">
                    (N<sub>1</sub>)<sub>60</sub>
                  </span>
                </th>
                {method === "tbdy-2018" ? (
                  <>
                    <th className={`${profileTableThClass} text-center`}>
                      <span className="block leading-tight">α</span>
                    </th>
                    <th className={`${profileTableThClass} text-center`}>
                      <span className="block leading-tight">β</span>
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">
                        (N<sub>1</sub>)<sub>60,f</sub>
                      </span>
                    </th>
                  </>
                ) : (
                  <>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">
                        ΔN<sub>(1,60)</sub>
                      </span>
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">(N<sub>1</sub>)<sub>60,cs</sub></span>
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">CRR<sub>7.5</sub></span>
                    </th>
                  </>
                )}
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>σ<sub>v0</sub></span>} unit="kPa" />
                </th>
                <th className={profileTableThClass}>
                  <span className="block leading-tight">
                    Check<sup>1</sup>
                  </span>
                </th>
                {method === "tbdy-2018" ? (
                  <>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">C<sub>M</sub></span>
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">CRR<sub>7.5</sub></span>
                    </th>
                    <th className={profileTableThClass}>
                      <ProfileTableHeaderCell title={<span>σ′<sub>v0</sub></span>} unit="kPa" />
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">r<sub>d</sub></span>
                    </th>
                    <th className={profileTableThClass}>
                      <ProfileTableHeaderCell title={<span>τ<sub>R</sub></span>} unit="kPa" />
                    </th>
                    <th className={profileTableThClass}>
                      <ProfileTableHeaderCell title={<span>τ<sub>eq</sub></span>} unit="kPa" />
                    </th>
                  </>
                ) : (
                  <>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">MSF</span>
                    </th>
                    <th className={profileTableThClass}>
                      <ProfileTableHeaderCell title={<span>σ′<sub>v0</sub></span>} unit="kPa" />
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">r<sub>d</sub></span>
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">CSR</span>
                    </th>
                    <th className={profileTableThClass}>
                      <span className="block leading-tight">CRR<sub>M</sub></span>
                    </th>
                  </>
                )}
                <th className={profileTableThClass}>
                  <span className="block leading-tight">FS</span>
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sampleDepth = parse(row.sampleDepth);
                const hasDepthIssue = !Number.isFinite(sampleDepth) || sampleDepth <= 0;
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
                  ? "Invalid sample depth"
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
                    : checkStatus === "Invalid sample depth"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-amber-200 bg-amber-50 text-amber-800";

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
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
                        className={
                          hasDepthIssue
                            ? "w-full min-w-0 rounded-lg border border-red-300 bg-red-50 px-1.5 py-1 text-xs text-slate-900 outline-none transition-colors duration-200 focus:border-red-400 sm:px-2 sm:py-1.5 sm:text-[13px]"
                            : cnProfileTableInput(false)
                        }
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Enter a positive sample depth.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={row.unitWeight}
                        onChange={(event) => updateRow(row.id, { unitWeight: event.target.value })}
                        className={cnProfileTableInput(false)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={row.finesContent}
                        onChange={(event) => updateRow(row.id, { finesContent: event.target.value })}
                        className={cnProfileTableInput(false)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={row.n160}
                        onChange={(event) => updateRow(row.id, { n160: event.target.value })}
                        className={cnProfileTableInput(false)}
                      />
                    </td>

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
                      <div className={profileTableOutputCellClass}>{result ? result.fos.toFixed(2) : "-"}</div>
                      <p className="mt-1 text-[10px] leading-tight text-slate-500">
                        {rawResult ? `Sample depth: ${sampleDepth.toFixed(2)} ${depthUnit}` : "Enter a valid sample depth."}
                      </p>
                      {result && result.fos < result.minimumRequiredFos ? <p className="mt-1 text-[10px] font-semibold leading-tight text-red-700">Liquefaction Potential!</p> : null}
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
          </table>
        </ProfileTableScroll>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          <sup>1</sup> See the Information tab for the layered screening criteria and method-specific check conditions.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-base btn-md" onClick={addRow}>
            Add Sample
          </button>
          <div className="flex items-center gap-3">
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

      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plot</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Factor of Safety vs Depth</h3>
            <p className="mt-1 text-sm text-slate-600">
              Depth is on the vertical axis; FoS is on the horizontal axis. Points with FoS &lt; 1 are shown in red.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              FoS ≥ 1
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              FoS &lt; 1
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {fosPlot.points.length ? (
            (() => {
              const { points, maxDepth, maxFoS, boreholes } = fosPlot;
              const shapeOrder = ["circle", "square", "triangle", "diamond"] as const;
              const shapeByBorehole = new Map<string, (typeof shapeOrder)[number]>();
              boreholes.forEach((id, idx) => {
                shapeByBorehole.set(id, shapeOrder[idx % shapeOrder.length]);
              });
              const marginLeft = 64;
              const marginRight = 22;
              const marginTop = 44;
              const marginBottom = 46;
              const width = 860;
              const height = 420;
              const plotWidth = width - marginLeft - marginRight;
              const plotHeight = height - marginTop - marginBottom;
              const xMin = 0;
              const xMax = Math.max(1.6, Math.ceil(maxFoS * 10) / 10);
              const yMin = 0;
              const yMax = Math.max(6, Math.ceil(maxDepth));
              const x = (value: number) => marginLeft + ((value - xMin) / (xMax - xMin)) * plotWidth;
              const y = (depth: number) => marginTop + ((depth - yMin) / (yMax - yMin)) * plotHeight;

              const xTicks = Array.from({ length: 6 }, (_, i) => xMin + (i * (xMax - xMin)) / 5).map((tick) =>
                Number(tick.toFixed(2)),
              );
              const yTicks = [0, 2, 4, 6, 8, 10, 15, 20].filter((tick) => tick <= yMax);

              const renderMarker = (
                shape: (typeof shapeOrder)[number],
                cx: number,
                cy: number,
                fill: string,
                stroke: string,
              ) => {
                const r = 6;
                switch (shape) {
                  case "square":
                    return (
                      <rect
                        x={cx - r}
                        y={cy - r}
                        width={r * 2}
                        height={r * 2}
                        rx="3"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="1"
                      />
                    );
                  case "triangle":
                    return (
                      <path
                        d={`M ${cx} ${cy - r} L ${cx + r} ${cy + r} L ${cx - r} ${cy + r} Z`}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="1"
                        strokeLinejoin="round"
                      />
                    );
                  case "diamond":
                    return (
                      <path
                        d={`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="1"
                        strokeLinejoin="round"
                      />
                    );
                  default:
                    return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="1" />;
                }
              };

              const legendItems = boreholes.slice(0, 6);
              const legendItemWidth = 120;
              const legendTotalWidth = legendItems.length * legendItemWidth;
              const legendStartX = marginLeft + Math.max(0, (plotWidth - legendTotalWidth) / 2);
              const legendY = height - 14;

              return (
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="block w-full max-w-[980px] rounded-2xl border border-slate-200 bg-white"
                  role="img"
                  aria-label="Factor of safety versus depth plot"
                >
                  <rect x="0" y="0" width={width} height={height} fill="#ffffff" />

                  {xTicks.map((tick) => (
                    <g key={`xt-${tick.toFixed(3)}`}>
                      <line x1={x(tick)} y1={marginTop} x2={x(tick)} y2={marginTop + plotHeight} stroke="#e2e8f0" strokeWidth="1" />
                      <text
                        x={Math.abs(tick - 1) < 1e-9 ? x(1) : x(tick)}
                        y={marginTop - 16}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="12"
                        fontWeight="700"
                      >
                        {tick.toFixed(2)}
                      </text>
                    </g>
                  ))}
                  {yTicks.map((tick) => (
                    <g key={`yt-${tick}`}>
                      <line x1={marginLeft} y1={y(tick)} x2={marginLeft + plotWidth} y2={y(tick)} stroke="#e2e8f0" strokeWidth="1" />
                      <text x={marginLeft - 12} y={y(tick) + 4} textAnchor="end" fill="#64748b" fontSize="12" fontWeight="700">
                        {tick}
                      </text>
                    </g>
                  ))}

                  <text x={marginLeft + plotWidth / 2} y={22} textAnchor="middle" fill="#334155" fontSize="13" fontWeight="800">
                    FoS (—)
                  </text>
                  <text
                    x={14}
                    y={marginTop + plotHeight / 2}
                    fill="#334155"
                    fontSize="13"
                    fontWeight="800"
                    transform={`rotate(-90 14 ${marginTop + plotHeight / 2})`}
                    textAnchor="middle"
                  >
                    Depth ({depthUnit})
                  </text>

                  <line x1={marginLeft} y1={marginTop} x2={marginLeft} y2={marginTop + plotHeight} stroke="#0f172a" strokeWidth="1.4" />
                  <line x1={marginLeft} y1={marginTop} x2={marginLeft + plotWidth} y2={marginTop} stroke="#0f172a" strokeWidth="1.4" />

                  <line
                    x1={x(1)}
                    y1={marginTop}
                    x2={x(1)}
                    y2={marginTop + plotHeight}
                    stroke="#0ea5e9"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.9"
                  />
                  <text x={x(1) + 6} y={marginTop + 12} fill="#0369a1" fontSize="11" fontWeight="800">
                    FoS = 1.0
                  </text>

                  {points.map((p) => {
                    const value = p.fos ?? 0;
                    const color = value < 1 ? "#ef4444" : "#10b981";
                    const bh = p.boreholeId;
                    const shape = shapeByBorehole.get(bh) ?? "circle";
                    const cx = x(value);
                    const cy = y(p.depth);
                    return (
                      <g key={`p-${p.id}`} opacity="0.95">
                        <title>{`${bh} | z=${p.depth.toFixed(2)} ${depthUnit} | FoS=${value.toFixed(2)}`}</title>
                        {renderMarker(shape, cx, cy, color, "#334155")}
                      </g>
                    );
                  })}

                  {/* borehole legend */}
                  {legendItems.map((bh, idx) => {
                    const lx = legendStartX + idx * legendItemWidth;
                    const ly = legendY;
                    const shape = shapeByBorehole.get(bh) ?? "circle";
                    return (
                      <g key={`leg-${bh}`}>
                        {renderMarker(shape, lx, ly - 2, "#ffffff", "#334155")}
                        <text x={lx + 14} y={ly + 3} fill="#334155" fontSize="11" fontWeight="800">
                          {bh}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No analysed points available yet. Enter valid sample depths below GWT and within range, then review FoS in the table.
            </div>
          )}
        </div>
      </section>

    </section>
  );
}


