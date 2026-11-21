"use client";

import { ExcelExportButton } from "@/components/calculation/excel-export-button";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import { DETAILS_ANCHOR, TierGate, scrollToDetails, type DetailLevel } from "@/components/calculation/result-panels";
import { DepthProfilePlot } from "@/components/charts/depth-profile-plot";
import { EngineeringText } from "@/components/engineering-text";
import { ExpandableProfilePlot } from "@/components/expandable-profile-plot";
import { profilePlotItemClass, profilePlotsSectionClass } from "@/lib/profile-plot-layout";
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
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface LiquefactionProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  initialMethod?: LiquefactionMethod;
  /** Emits data for the standard two-part report (Report tab). */
  onReportDataChange?: (payload: StandardReportPayload) => void;
  /** Membership level for the detailed plots (guest: blurred). */
  detailLevel?: DetailLevel;
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

export type LiquefactionCheckStatus =
  | "Invalid sample depth"
  | "Outside sample depth range"
  | "Above GWT"
  | "(N1)60 > 30"
  | "Analysis";

/**
 * Evaluates one profile row. Inputs are held in display units (ft / pcf in the American system), so depth,
 * groundwater depth, and unit weight are converted to metric before the screening equations are applied.
 */
export function evaluateLiquefactionRow(
  row: Pick<LiquefactionProfileRow, "sampleDepth" | "unitWeight" | "finesContent" | "n160">,
  ctx: { method: LiquefactionMethod; magnitude: string; peakGroundAcceleration: string; groundwaterDepth: string; unitSystem: UnitSystem },
) {
  const toMetric = (value: string, unit: "m" | "kN/m3") =>
    parse(String(convertInputValueBetweenSystems(value, unit, ctx.unitSystem, "metric")));
  const sampleDepth = parse(row.sampleDepth);
  const sampleDepthM = toMetric(row.sampleDepth, "m");
  const groundwaterDepthM = toMetric(ctx.groundwaterDepth, "m");
  const hasDepthIssue = !Number.isFinite(sampleDepthM) || sampleDepthM <= 0;
  const rawResult =
    !hasDepthIssue && parse(ctx.magnitude) > 0
      ? computeLiquefactionScreening({
          method: ctx.method,
          magnitude: parse(ctx.magnitude),
          peakGroundAcceleration: parse(ctx.peakGroundAcceleration),
          groundwaterDepth: groundwaterDepthM,
          unitWeight: toMetric(row.unitWeight, "kN/m3"),
          finesContent: parse(row.finesContent),
          sampleDepth: sampleDepthM,
          n160: parse(row.n160),
        })
      : null;
  const checkStatus: LiquefactionCheckStatus = hasDepthIssue
    ? "Invalid sample depth"
    : sampleDepthM > 20
      ? "Outside sample depth range"
      : sampleDepthM <= groundwaterDepthM
        ? "Above GWT"
        : parse(row.n160) > 30
          ? "(N1)60 > 30"
          : "Analysis";
  return { sampleDepth, hasDepthIssue, rawResult, checkStatus, result: checkStatus === "Analysis" ? rawResult : null };
}

export function LiquefactionProfileTab({
  unitSystem,
  importRows,
  initialMethod = "idriss-boulanger-2008",
  onReportDataChange,
  detailLevel = "guest",
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
    const points = rows
      .map((row) => {
        const { sampleDepth, result } = evaluateLiquefactionRow(row, {
          method,
          magnitude,
          peakGroundAcceleration,
          groundwaterDepth,
          unitSystem,
        });
        const fos = result ? result.fos : null;

        return {
          id: row.id,
          boreholeId: (row.boreholeId || "").trim() || "—",
          depth: sampleDepth,
          fos,
          demand: result ? result.demandValue : null,
          resistance: result ? result.resistanceValue : null,
          minimumRequiredFos: result ? result.minimumRequiredFos : null,
        };
      })
      .filter((item) => Number.isFinite(item.depth) && item.depth > 0 && item.fos !== null && Number.isFinite(item.fos));

    const boreholes = Array.from(new Set(points.map((p) => p.boreholeId).filter(Boolean)));
    const maxDepth = Math.max(6, ...points.map((p) => p.depth));
    const maxFoS = Math.max(1.6, ...points.map((p) => p.fos ?? 0));

    return { points, maxDepth, maxFoS, boreholes };
  }, [groundwaterDepth, magnitude, method, peakGroundAcceleration, rows, unitSystem]);

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
    if (!onReportDataChange) return;
    const ctx = { method, magnitude, peakGroundAcceleration, groundwaterDepth, unitSystem };
    const evaluated = rows.map((row) => ({ row, ...evaluateLiquefactionRow(row, ctx) }));
    const analysed = evaluated.filter((e) => e.result);
    const isTbdy = method === "tbdy-2018";
    const threshold = analysed[0]?.result?.minimumRequiredFos ?? (isTbdy ? 1.1 : 1.0);
    const below = analysed.filter((e) => (e.result?.fos ?? 99) < threshold).length;
    onReportDataChange({
      depthUnit,
      columns: [
        { header: "Borehole", key: "Borehole" },
        { header: `Depth (${depthUnit})`, key: "Depth" },
        { header: "FC (%)", key: "fc" },
        { header: "(N₁)₆₀", key: "n160" },
        { header: isTbdy ? "(N₁)₆₀f" : "(N₁)₆₀cs", key: "ncs" },
        { header: "σ′ᵥ₀ (kPa)", key: "sigma" },
        { header: "r_d", key: "rd" },
        { header: isTbdy ? "τ_eq (kPa)" : "CSR", key: "demand" },
        { header: isTbdy ? "τ_R (kPa)" : "CRR_M,σ", key: "resistance" },
        { header: "FS", key: "fs" },
        { header: "Outcome", key: "outcome" },
      ],
      rows: analysed.map((e) => {
        const r = e.result!;
        return {
          Borehole: (e.row.boreholeId || "").trim() || "—",
          Depth: e.sampleDepth.toFixed(2),
          fc: Number(e.row.finesContent).toFixed(0),
          n160: Number(e.row.n160).toFixed(1),
          ncs: (isTbdy ? r.n160f : r.n160cs)?.toFixed(1) ?? "—",
          sigma: r.sigmaV0Effective.toFixed(1),
          rd: r.rd.toFixed(3),
          demand: r.demandValue.toFixed(isTbdy ? 1 : 3),
          resistance: r.resistanceValue.toFixed(isTbdy ? 1 : 3),
          fs: r.fos.toFixed(2),
          outcome: r.fos < threshold ? "Triggering likely" : "Not triggered",
        };
      }),
      points: analysed.map((e) => ({ boreholeId: (e.row.boreholeId || "").trim() || "—", depth: e.sampleDepth, values: { fs: e.result!.fos } })),
      series: [{ key: "fs", label: "FS", unit: "", referenceLine: { value: threshold, label: `FS = ${threshold.toFixed(2)}` } }],
      inputs: [
        { label: "Procedure", value: isTbdy ? "TBDY 2018 (Section 16)" : "Idriss & Boulanger (2008)" },
        { label: "Earthquake magnitude Mw", value: magnitude },
        { label: isTbdy ? "Design acceleration 0.4 S_DS (g)" : "Peak ground acceleration aₘₐₓ (g)", value: peakGroundAcceleration },
        { label: "Groundwater depth", value: `${groundwaterDepth} ${depthUnit}` },
        { label: "Acceptance criterion", value: `FS >= ${threshold.toFixed(2)}` },
      ],
      methodNotes: [
        `${analysed.length} sample(s) were analysed; ${below} of them give FS below the acceptance criterion of ${threshold.toFixed(2)} under the stated design earthquake.`,
      ],
      exclusions: evaluated
        .filter((e) => !e.result)
        .map((e) => `${(e.row.boreholeId || "").trim() || "—"} at ${e.sampleDepth.toFixed(2)} ${depthUnit}: ${e.checkStatus}`),
    });
  }, [depthUnit, groundwaterDepth, magnitude, method, onReportDataChange, peakGroundAcceleration, rows, unitSystem]);

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
                <th className={profileTableThClass}>
                  <span className="block leading-tight">
                    Check<sup>1</sup>
                  </span>
                </th>
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
                const { hasDepthIssue, checkStatus, result } = evaluateLiquefactionRow(row, {
                  method,
                  magnitude,
                  peakGroundAcceleration,
                  groundwaterDepth,
                  unitSystem,
                });
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

                    <td className="px-2 py-3"><div className={`rounded-lg border px-2 py-1.5 font-semibold leading-tight ${statusTone}`}>{checkStatus}</div></td>


                    <td className="px-2 py-3">
                      <div className={profileTableOutputCellClass}>{result ? result.fos.toFixed(2) : "-"}</div>
                      {result ? (
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${result.fos < result.minimumRequiredFos ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {result.fos < result.minimumRequiredFos ? "✗ Liquefaction potential" : "✓ OK"}
                        </span>
                      ) : null}
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
            <ExcelExportButton
              type="button"
              className="btn-base btn-md"
              onClick={(event) => {
                void exportProfileExcelFromSection(event.currentTarget);
              }}
            >
              Export Excel
            </ExcelExportButton>
          </div>
        </div>

      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plots</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Liquefaction triggering with depth</h3>
        <p className="mt-1 text-sm text-slate-600">
          Factor of safety by borehole with the {method === "tbdy-2018" ? "TBDY 2018" : "Idriss and Boulanger (2008)"} limit,
          and the cyclic demand against the soil&apos;s cyclic resistance. Hover a point for its value.
        </p>
        {fosPlot.points.length ? (
          (() => {
            const isTbdy = method === "tbdy-2018";
            const minFos = fosPlot.points.find((p) => p.minimumRequiredFos !== null)?.minimumRequiredFos ?? (isTbdy ? 1.1 : 1.0);
            const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
            const toDisplay = (v: number) => (isTbdy ? Number(convertInputValueBetweenSystems(String(v), "kPa", "metric", unitSystem)) : v);
            const demandName = isTbdy ? "τ_eq demand" : "CSR demand";
            const resistanceName = isTbdy ? "τ_R resistance" : "CRR resistance";
            const fosData = fosPlot.points.map((p) => ({ boreholeId: p.boreholeId === "—" ? "BH not set" : p.boreholeId, depth: p.depth, value: p.fos ?? 0 }));
            const dvrData = fosPlot.points.flatMap((p) => [
              { boreholeId: demandName, depth: p.depth, value: toDisplay(p.demand ?? 0) },
              { boreholeId: resistanceName, depth: p.depth, value: toDisplay(p.resistance ?? 0) },
            ]);
            const below = fosPlot.points.filter((p) => (p.fos ?? 99) < minFos).length;
            return (
              <>
                <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${below ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
                  {below
                    ? `${below} of ${fosPlot.points.length} analysed samples have FoS below ${minFos.toFixed(2)} — liquefaction potential.`
                    : `All ${fosPlot.points.length} analysed samples have FoS of at least ${minFos.toFixed(2)}.`}
                </div>
                <button type="button" onClick={scrollToDetails} className="mt-2 text-sm font-semibold text-slate-800 underline underline-offset-4">
                  Detailed calculations ↓
                </button>
                <section id={DETAILS_ANCHOR} className="scroll-mt-28">
                <TierGate level={detailLevel} minHeight={300}>
                <LiquefactionStepsTable
                  rows={rows}
                  method={method}
                  ctx={{ method, magnitude, peakGroundAcceleration, groundwaterDepth, unitSystem }}
                  depthUnit={depthUnit}
                  showFormulas={detailLevel === "silver" || detailLevel === "gold"}
                  magnitude={Number(magnitude)}
                  pga={Number(peakGroundAcceleration)}
                />
                <div className={profilePlotsSectionClass(2)}>
                  <ExpandableProfilePlot className={profilePlotItemClass(2)}>
                    <DepthProfilePlot
                      title="Factor of safety vs depth"
                      subtitle={isTbdy ? "FoS = τ_R / τ_eq" : "FoS = CRR / CSR"}
                      xLabel="FoS (—)"
                      valueName="FoS"
                      depthUnit={depthUnit}
                      data={fosData}
                      xMin={0}
                      referenceLines={[
                        { value: 1, label: "FoS = 1.0" },
                        ...(Math.abs(minFos - 1) > 1e-6 ? [{ value: minFos, label: `Required ${minFos.toFixed(1)}` }] : []),
                      ]}
                    />
                  </ExpandableProfilePlot>
                  <ExpandableProfilePlot className={profilePlotItemClass(2)}>
                    <DepthProfilePlot
                      title={isTbdy ? "Cyclic shear stress vs depth" : "Cyclic stress ratio vs depth"}
                      subtitle="Demand from the earthquake against the soil's cyclic resistance"
                      xLabel={isTbdy ? `τ (${stressUnit})` : "CSR, CRR (—)"}
                      depthUnit={depthUnit}
                      data={dvrData}
                      xMin={0}
                    />
                  </ExpandableProfilePlot>
                </div>
                </TierGate>
                </section>
              </>
            );
          })()
        ) : (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No analysed points available yet. Enter valid sample depths below GWT and within range, then review FoS in the table.
          </div>
        )}
      </section>

    </section>
  );
}



/** Per-sample intermediate values (members) and, for Silver/Gold, the formulas for the first analysed sample. */
function LiquefactionStepsTable({
  rows,
  method,
  ctx,
  depthUnit,
  showFormulas,
  magnitude,
  pga,
}: {
  rows: LiquefactionProfileRow[];
  method: LiquefactionMethod;
  ctx: Parameters<typeof evaluateLiquefactionRow>[1];
  depthUnit: string;
  showFormulas: boolean;
  magnitude: number;
  pga: number;
}) {
  const evaluated = rows
    .map((row) => ({ row, ...evaluateLiquefactionRow(row, ctx) }))
    .filter((e) => e.rawResult);
  const tbdy = method === "tbdy-2018";
  const f = (v: number | undefined, d: number) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "–");
  const columns: Array<{ head: ReactNode; cell: (e: (typeof evaluated)[number]) => string }> = tbdy
    ? [
        { head: "α", cell: (e) => f(e.rawResult?.alpha, 2) },
        { head: "β", cell: (e) => f(e.rawResult?.beta, 3) },
        { head: <>(N<sub>1</sub>)<sub>60,f</sub></>, cell: (e) => f(e.rawResult?.n160f, 2) },
        { head: <>CRR<sub>7.5</sub></>, cell: (e) => f(e.rawResult?.crr75, 3) },
        { head: <>C<sub>M</sub></>, cell: (e) => f(e.rawResult?.cm, 3) },
        { head: <>σ<sub>v0</sub> (kPa)</>, cell: (e) => f(e.rawResult?.sigmaV0, 1) },
        { head: <>σ′<sub>v0</sub> (kPa)</>, cell: (e) => f(e.rawResult?.sigmaV0Effective, 1) },
        { head: <>r<sub>d</sub></>, cell: (e) => f(e.rawResult?.rd, 3) },
        { head: <>τ<sub>R</sub> (kPa)</>, cell: (e) => f(e.rawResult?.tauResistance, 2) },
        { head: <>τ<sub>eq</sub> (kPa)</>, cell: (e) => f(e.rawResult?.tauEarthquake, 2) },
        { head: "FS", cell: (e) => f(e.rawResult?.fos, 2) },
      ]
    : [
        { head: <>ΔN<sub>(1,60)</sub></>, cell: (e) => f(e.rawResult?.deltaN, 2) },
        { head: <>(N<sub>1</sub>)<sub>60,cs</sub></>, cell: (e) => f(e.rawResult?.n160cs, 2) },
        { head: <>CRR<sub>7.5</sub></>, cell: (e) => f(e.rawResult?.crr75, 3) },
        { head: <>σ<sub>v0</sub> (kPa)</>, cell: (e) => f(e.rawResult?.sigmaV0, 1) },
        { head: <>σ′<sub>v0</sub> (kPa)</>, cell: (e) => f(e.rawResult?.sigmaV0Effective, 1) },
        { head: <>r<sub>d</sub></>, cell: (e) => f(e.rawResult?.rd, 3) },
        { head: "MSF", cell: (e) => f(e.rawResult?.msf, 3) },
        { head: <>K<sub>σ</sub></>, cell: (e) => f(e.rawResult?.kSigma, 3) },
        { head: "CSR", cell: (e) => f(e.rawResult?.csr, 3) },
        { head: <>CRR<sub>M</sub></>, cell: (e) => f(e.rawResult?.crrMagnitudeCorrected, 3) },
        { head: "FS", cell: (e) => f(e.rawResult?.fos, 2) },
      ];
  const first = evaluated[0]?.rawResult;
  const formulas: Array<[string, string]> = !first
    ? []
    : tbdy
      ? [
          ["(N₁)₆₀,f = α + β(N₁)₆₀", `${f(first.alpha, 2)} + ${f(first.beta, 3)} × ${evaluated[0].row.n160} = ${f(first.n160f, 2)}`],
          ["CRR₇.₅ = 1/(34 − N) + N/135 + 50/(10N + 45)² − 1/200,  N = min((N₁)₆₀,f, 30)", `= ${f(first.crr75, 3)}`],
          ["C_M = 10^2.24 / M_w^2.56", `10^2.24 / ${magnitude}^2.56 = ${f(first.cm, 3)}`],
          ["τ_R = CRR₇.₅ · C_M · σ′_v0", `${f(first.crr75, 3)} × ${f(first.cm, 3)} × ${f(first.sigmaV0Effective, 1)} = ${f(first.tauResistance, 2)} kPa`],
          ["τ_eq = 0.65 · σ_v0 · (S_DS·0.4) · r_d", `0.65 × ${f(first.sigmaV0, 1)} × ${pga} × ${f(first.rd, 3)} = ${f(first.tauEarthquake, 2)} kPa`],
          ["FS = τ_R / τ_eq ≥ 1.1", `${f(first.tauResistance, 2)} / ${f(first.tauEarthquake, 2)} = ${f(first.fos, 2)}`],
        ]
      : [
          ["ΔN₍₁,₆₀₎ = exp(1.63 + 9.7/(FC + 0.01) − (15.7/(FC + 0.01))²)", `FC = ${evaluated[0].row.finesContent}% → ${f(first.deltaN, 2)}`],
          ["(N₁)₆₀,cs = (N₁)₆₀ + ΔN₍₁,₆₀₎", `${evaluated[0].row.n160} + ${f(first.deltaN, 2)} = ${f(first.n160cs, 2)}`],
          ["CRR₇.₅ = exp(N/14.1 + (N/126)² − (N/23.6)³ + (N/25.4)⁴ − 2.8),  N = (N₁)₆₀,cs", `= ${f(first.crr75, 3)}`],
          ["MSF = 6.9 exp(−M_w/4) − 0.058 ≤ 1.8", `6.9·exp(−${magnitude}/4) − 0.058 = ${f(first.msf, 3)}`],
          ["K_σ = 1 − C_σ ln(σ′_v0 / p_a) ≤ 1.1", `σ′_v0 = ${f(first.sigmaV0Effective, 1)} kPa → ${f(first.kSigma, 3)}`],
          ["CSR = 0.65 · a_max · (σ_v0 / σ′_v0) · r_d", `0.65 × ${pga} × (${f(first.sigmaV0, 1)} / ${f(first.sigmaV0Effective, 1)}) × ${f(first.rd, 3)} = ${f(first.csr, 3)}`],
          ["FS = CRR₇.₅ · MSF · K_σ / CSR", `${f(first.crr75, 3)} × ${f(first.msf, 3)} × ${f(first.kSigma, 3)} / ${f(first.csr, 3)} = ${f(first.fos, 2)}`],
        ];

  return (
    <div className="mb-4 space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-2 py-2 font-semibold">Borehole</th>
              <th className="px-2 py-2 font-semibold">Depth ({depthUnit})</th>
              {columns.map((c, i) => (
                <th key={i} className="px-2 py-2 text-right font-semibold">
                  {c.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evaluated.map((e) => (
              <tr key={e.row.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5">{e.row.boreholeId || "—"}</td>
                <td className="px-2 py-1.5 tabular-nums">{e.sampleDepth.toFixed(2)}</td>
                {columns.map((c, i) => (
                  <td key={i} className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-900">
                    {c.cell(e)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showFormulas && formulas.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">
            Formulas — first analysed sample ({evaluated[0].row.boreholeId || "—"}, z = {evaluated[0].sampleDepth.toFixed(2)} {depthUnit})
          </p>
          <div className="mt-2 space-y-1.5">
            {formulas.map(([formula, sub]) => (
              <div key={formula} className="rounded-md bg-slate-50 px-3 py-1.5 font-serif text-[13.5px] text-slate-800">
                <p>
                  <EngineeringText text={formula} />
                </p>
                <p className="text-slate-600">
                  <EngineeringText text={sub} />
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : !showFormulas ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Silver shows the formula behind each column, with the numbers substituted.
        </p>
      ) : null}
    </div>
  );
}
