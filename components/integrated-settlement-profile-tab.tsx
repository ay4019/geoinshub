"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ProfileTableScroll, profileTableScrollableMinClass } from "@/components/profile-table-mobile";
import { DETAILS_ANCHOR, TierGate, scrollToDetails, type DetailLevel } from "@/components/calculation/result-panels";
import { EngineeringText } from "@/components/engineering-text";
import { SettlementSectionVisual } from "@/components/visuals/settlement-section-visual";
import type { UnitSystem } from "@/lib/types";
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";

interface IntegratedSettlementProfileTabProps {
  unitSystem: UnitSystem;
  /** Emits data for the standard two-part report (Report tab). */
  onReportDataChange?: (payload: StandardReportPayload) => void;
  /** Membership level for the detailed calculations (guest: blurred). */
  detailLevel?: DetailLevel;
}

type LoadCase = "embankment" | "structure";
type SoilType = "clay" | "sand";
type ClayInputMode = "mv" | "cc-cr";
type DrainageMode = "single" | "double";

interface LayerRow {
  id: number;
  name: string;
  thickness: string;
  unitWeight: string;
  soilType: SoilType;
  clayInputMode: ClayInputMode;
  mv: string;
  cc: string;
  cr: string;
  /** Overconsolidation ratio σ′p/σ′v0 at layer mid-depth (1 = normally consolidated). */
  ocr: string;
  e0: string;
  es: string;
  nu: string;
}

interface LayerGeometry extends LayerRow {
  top: number;
  bottom: number;
  midDepth: number;
  thicknessValue: number;
}

interface LayerResult {
  id: number;
  influence: number;
  depth: number;
  sigmaV0Eff: number;
  deltaSigma: number;
  consolidation: number;
  immediate: number;
  total: number;
}

const initialRows: LayerRow[] = [
  {
    id: 1,
    name: "L1",
    thickness: "2.0",
    unitWeight: "18.5",
    soilType: "clay",
    clayInputMode: "mv",
    mv: "0.35",
    cc: "0.32",
    cr: "0.06",
    ocr: "1.0",
    e0: "1.0",
    es: "14000",
    nu: "0.30",
  },
  {
    id: 2,
    name: "L2",
    thickness: "3.0",
    unitWeight: "18.5",
    soilType: "sand",
    clayInputMode: "mv",
    mv: "0.15",
    cc: "0.18",
    cr: "0.03",
    ocr: "1.0",
    e0: "0.80",
    es: "28000",
    nu: "0.30",
  },
];

const gammaWater = 9.81;

function num(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rectangularElasticStress(q: number, width: number, length: number, z: number): number {
  if (z <= 0) return q;

  const nx = 30;
  const ny = 30;
  const dx = width / nx;
  const dy = length / ny;
  let sigma = 0;

  for (let ix = 0; ix < nx; ix += 1) {
    const x = -width / 2 + dx * (ix + 0.5);
    for (let iy = 0; iy < ny; iy += 1) {
      const y = -length / 2 + dy * (iy + 0.5);
      const r2 = x * x + y * y + z * z;
      const r = Math.sqrt(r2);
      sigma += (3 * q * dx * dy * z ** 3) / (2 * Math.PI * r ** 5);
    }
  }

  return Math.max(sigma, 0);
}

/**
 * One-dimensional primary consolidation with stress history:
 *   σ′f <= σ′p : s = H C_r/(1+e0) log(σ′f/σ′0)
 *   σ′0 <  σ′p < σ′f : s = H/(1+e0) [C_r log(σ′p/σ′0) + C_c log(σ′f/σ′p)]
 *   σ′p = σ′0 (OCR = 1): s = H C_c/(1+e0) log(σ′f/σ′0)
 */
export function consolidationSettlement(
  thickness: number,
  sigmaV0Eff: number,
  deltaSigma: number,
  cc: number,
  cr: number,
  e0: number,
  ocr: number,
): number {
  const s0 = Math.max(sigmaV0Eff, 1);
  const sf = Math.max(s0 + deltaSigma, s0 + 0.001);
  const sp = s0 * Math.max(ocr, 1);
  const factor = thickness / (1 + Math.max(e0, 0.05));
  if (sf <= sp) {
    return factor * cr * Math.log10(sf / s0);
  }
  return factor * (cr * Math.log10(sp / s0) + cc * Math.log10(sf / sp));
}

function tvFromU(targetPercent: number): number {
  const u = Math.min(Math.max(targetPercent, 1), 99.9) / 100;
  if (u <= 0.6) return (Math.PI / 4) * u * u;
  return -0.933 * Math.log10(1 - u) - 0.085;
}

function LayerLabel({ name }: { name: string }): ReactNode {
  const match = /^L\s*(\d+)$/i.exec(name.trim());
  if (match) {
    return (
      <>
        L<sub>{match[1]}</sub>
      </>
    );
  }
  return name.trim() || "—";
}

function paramLabelClassName() {
  return "mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500";
}

function paramInputClassName() {
  return "w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs";
}

export function IntegratedSettlementProfileTab({ unitSystem, onReportDataChange, detailLevel = "guest" }: IntegratedSettlementProfileTabProps) {
  const [loadCase, setLoadCase] = useState<LoadCase>("structure");
  const [q0, setQ0] = useState("120");
  const [excavationDepth, setExcavationDepth] = useState("0");
  const [width, setWidth] = useState("3");
  const [length, setLength] = useState("4");
  const [targetU, setTargetU] = useState("90");
  const [cvInput, setCvInput] = useState("1.2");
  const [drainageMode, setDrainageMode] = useState<DrainageMode>("double");
  const [rows, setRows] = useState<LayerRow[]>(initialRows);
  const [groundwaterDepth, setGroundwaterDepth] = useState("1.5");

  // This tab computes in SI units throughout (layer inputs and B, L, depths are in m and kPa), so the load label
  // must stay in kPa; showing "ksf" while computing in kPa would silently mis-scale the load.
  const loadUnitLabel = "kPa";
  void unitSystem;

  const geometry = useMemo<LayerGeometry[]>(
    () =>
      rows.map((row, index) => {
        const top = rows
          .slice(0, index)
          .reduce((sum, current) => sum + Math.max(num(current.thickness, 1), 0.1), 0);
        const thicknessValue = Math.max(num(row.thickness, 1), 0.1);
        const bottom = top + thicknessValue;
        return { ...row, top, bottom, midDepth: (top + bottom) / 2, thicknessValue };
      }),
    [rows],
  );

  const totalProfileDepth = geometry.at(-1)?.bottom ?? 1;

  const excavationRelief = useMemo(() => {
    const dExc = Math.max(num(excavationDepth), 0);
    if (dExc <= 0) return 0;

    let relief = 0;
    for (const layer of geometry) {
      const overlap = Math.max(0, Math.min(layer.bottom, dExc) - layer.top);
      if (overlap > 0) {
        relief += Math.max(num(layer.unitWeight), 0) * overlap;
      }
    }

    if (dExc > totalProfileDepth && geometry.length > 0) {
      const lastGamma = Math.max(num(geometry[geometry.length - 1].unitWeight), 0);
      relief += lastGamma * (dExc - totalProfileDepth);
    }

    return relief;
  }, [excavationDepth, geometry, totalProfileDepth]);

  const qApplied = useMemo(
    () => Math.max(Math.max(num(q0), 0) - excavationRelief, 0),
    [excavationRelief, q0],
  );

  const results = useMemo<LayerResult[]>(() => {
    const foundationB = Math.max(num(width), 0.1);
    const foundationL = Math.max(num(length), 0.1);

    const foundationLevel = Math.max(num(excavationDepth), 0);
    const gwtDepth = Math.max(num(groundwaterDepth, 0), 0);

    return geometry.map((layer, index) => {
      // Boussinesq depth is measured below the foundation base; material above the base is excavated and carries no Δσ.
      const zBelowBase = layer.midDepth - foundationLevel;
      const influence = zBelowBase > 0 ? rectangularElasticStress(1, foundationB, foundationL, zBelowBase) : 0;
      const deltaSigma = influence * qApplied;

      // Total overburden accumulates the unit weights of all overlying layers.
      const gamma = Math.max(num(layer.unitWeight, 18), 0);
      const sigmaAbove = geometry
        .slice(0, index)
        .reduce((sum, upper) => sum + Math.max(num(upper.unitWeight, 18), 0) * upper.thicknessValue, 0);
      const sigmaV0 = sigmaAbove + gamma * (layer.midDepth - layer.top);
      const sigmaV0Eff = Math.max(sigmaV0 - gammaWater * Math.max(layer.midDepth - gwtDepth, 0), 1);

      const es = Math.max(num(layer.es), 1);
      const nu = Math.min(Math.max(num(layer.nu), 0), 0.49);
      const immediate = (deltaSigma * layer.thicknessValue * (1 - nu * nu)) / es;

      const consolidation =
        layer.soilType === "clay"
          ? layer.clayInputMode === "mv"
            ? Math.max(num(layer.mv), 0) * (deltaSigma / 1000) * layer.thicknessValue
            : consolidationSettlement(
                layer.thicknessValue,
                sigmaV0Eff,
                deltaSigma,
                Math.max(num(layer.cc, 0), 0),
                Math.max(num(layer.cr, 0), 0),
                Math.max(num(layer.e0, 0.7), 0.05),
                Math.max(num(layer.ocr, 1), 1),
              )
          : 0;

      return {
        id: layer.id,
        influence,
        depth: layer.midDepth,
        sigmaV0Eff,
        deltaSigma,
        immediate,
        consolidation,
        total: immediate + consolidation,
      };
    });
  }, [excavationDepth, geometry, groundwaterDepth, length, qApplied, width]);

  const totals = useMemo(() => {
    const immediate = results.reduce((sum, layer) => sum + layer.immediate, 0);
    const consolidation = results.reduce((sum, layer) => sum + layer.consolidation, 0);
    return { immediate, consolidation, total: immediate + consolidation };
  }, [results]);

  const consolidationTime = useMemo(() => {
    const uTarget = Math.min(Math.max(num(targetU, 90), 1), 99.9);
    const tv = tvFromU(uTarget);
    const clayLayers = geometry.filter((layer) => layer.soilType === "clay");
    const totalClayThickness = clayLayers.reduce((sum, layer) => sum + layer.thicknessValue, 0);
    const hdr = drainageMode === "double" ? totalClayThickness / 2 : totalClayThickness;
    const cv = Math.max(num(cvInput, 1.2), 0.0001);
    const years = hdr > 0 ? (tv * hdr * hdr) / cv : 0;
    return {
      uTarget,
      tv,
      totalClayThickness,
      hdr,
      cv,
      years,
      days: years * 365,
      clayLayers,
    };
  }, [cvInput, drainageMode, geometry, targetU]);

  useEffect(() => {
    if (!onReportDataChange) return;
    if (loadCase !== "structure") {
      onReportDataChange({ depthUnit: "m", columns: [], rows: [], points: [], series: [] });
      return;
    }
    const mm = (m: number) => (m * 1000).toFixed(1);
    onReportDataChange({
      depthUnit: "m",
      columns: [
        { header: "Layer", key: "Borehole" },
        { header: "Soil", key: "soil" },
        { header: "Mid-depth (m)", key: "Depth" },
        { header: "Thickness (m)", key: "h" },
        { header: "σ′ᵥ₀ (kPa)", key: "sigmaV0" },
        { header: "I_z", key: "iz" },
        { header: "Δσ_z (kPa)", key: "deltaSigma" },
        { header: "sᵢ (mm)", key: "immediate" },
        { header: "s_c (mm)", key: "consolidation" },
        { header: "s_total (mm)", key: "total" },
      ],
      rows: results.map((r, i) => {
        const g = geometry[i];
        return {
          Borehole: g?.name || `L${i + 1}`,
          soil: g?.soilType === "clay" ? (g.clayInputMode === "mv" ? "Clay (mᵥ)" : "Clay (C_c/C_r)") : "Sand",
          Depth: r.depth.toFixed(2),
          h: (g?.thicknessValue ?? 0).toFixed(2),
          sigmaV0: r.sigmaV0Eff.toFixed(1),
          iz: r.influence.toFixed(3),
          deltaSigma: r.deltaSigma.toFixed(1),
          immediate: mm(r.immediate),
          consolidation: mm(r.consolidation),
          total: mm(r.total),
        };
      }),
      points: results.map((r, i) => ({
        boreholeId: "Foundation centre",
        depth: r.depth,
        values: { total: r.total * 1000, deltaSigma: r.deltaSigma, layer: i },
      })),
      series: [
        { key: "deltaSigma", label: "Δσ_z", unit: "kPa" },
        { key: "total", label: "Layer settlement", unit: "mm" },
      ],
      inputs: [
        { label: "Load case", value: "Structure (rectangular foundation)" },
        { label: "Applied pressure q₀", value: `${num(q0).toFixed(1)} kPa` },
        { label: "Foundation B × L", value: `${num(width).toFixed(2)} m × ${num(length).toFixed(2)} m` },
        { label: "Excavation depth D_exc", value: `${Math.max(num(excavationDepth), 0).toFixed(2)} m` },
        { label: "Net pressure q_net", value: `${qApplied.toFixed(1)} kPa` },
        { label: "Groundwater depth", value: `${Math.max(num(groundwaterDepth, 0), 0).toFixed(2)} m` },
        { label: "c_v / drainage / target U", value: `${consolidationTime.cv} m²/year / ${drainageMode} / ${consolidationTime.uTarget}%` },
      ],
      keyResults: [
        { label: "Immediate settlement", value: `${mm(totals.immediate)} mm` },
        { label: "Primary consolidation settlement", value: `${mm(totals.consolidation)} mm` },
        { label: "Total settlement", value: `${mm(totals.total)} mm` },
        {
          label: `Time to U = ${consolidationTime.uTarget}%`,
          value: consolidationTime.hdr > 0 ? `${consolidationTime.years.toFixed(2)} years (H_dr = ${consolidationTime.hdr.toFixed(2)} m)` : "No clay layers",
        },
      ],
      methodNotes: [
        "Stresses are evaluated at the mid-depth of each layer below the centre of the foundation; layers above the foundation base receive no stress increase. Clay layers entered with C_c/C_r use the layer OCR to separate recompression and virgin compression.",
        "The consolidation time treats all clay layers as one layer with a single c_v and the selected drainage condition; it is indicative only.",
      ],
    });
  }, [consolidationTime, drainageMode, excavationDepth, geometry, groundwaterDepth, length, loadCase, onReportDataChange, q0, qApplied, results, totals, width]);

  const updateRow = (id: number, patch: Partial<LayerRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const nextId = (current.at(-1)?.id ?? 0) + 1;
      return [...current, { ...initialRows[0], id: nextId, name: `L${nextId}`, thickness: "1.5" }];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Foundation and load</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Load case</label>
            <select
              value={loadCase}
              onChange={(event) => setLoadCase(event.target.value as LoadCase)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="structure">Structure</option>
              <option value="embankment">Embankment</option>
            </select>
          </div>
          {loadCase === "structure" ? (
            <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Surface load q<sub>0</sub> ({loadUnitLabel})</label>
              <input
                value={q0}
                onChange={(event) => setQ0(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="integrated-gwt-depth" className="mb-1 block text-sm font-medium text-slate-700">
                GWT depth z<sub>w</sub> (m)
              </label>
              <input
                id="integrated-gwt-depth"
                type="number"
                min="0"
                step="0.1"
                value={groundwaterDepth}
                onChange={(event) => setGroundwaterDepth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">B (m)</label>
              <input
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">L (m)</label>
              <input
                value={length}
                onChange={(event) => setLength(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Excavation depth D<sub>exc</sub> (m)</label>
              <input
                value={excavationDepth}
                onChange={(event) => setExcavationDepth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            </>
          ) : null}
        </div>

        {loadCase === "embankment" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="mx-auto flex min-h-[220px] max-w-2xl flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Coming Soon</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Embankment mode is under construction.</h3>
            </div>
          </div>
        ) : (
          <SettlementSectionVisual
            layers={geometry.map((layer) => ({ name: layer.name || `L${layer.id}`, top: layer.top, bottom: layer.bottom, soilType: layer.soilType }))}
            width={Math.max(num(width), 0.1)}
            length={Math.max(num(length), 0.1)}
            excavationDepth={Math.max(num(excavationDepth), 0)}
            groundwaterDepth={num(groundwaterDepth)}
            qApplied={qApplied}
            results={results}
          />
        )}
      </div>

      {loadCase === "embankment" ? null : (
        <>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Layer inputs</h3>
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Add Layer
              </button>
            </div>

            <ProfileTableScroll showHint>
              <table
                className={`w-full ${profileTableScrollableMinClass("c7")} table-fixed divide-y divide-slate-200 text-xs`}
              >
                <colgroup>
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                  <col className="w-[34%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-1 py-2 text-left font-semibold">Layer ID</th>
                    <th className="px-1 py-2 text-left font-semibold">
                      <span className="block">
                        H<sub>i</sub> (m)
                      </span>
                    </th>
                    <th className="px-1 py-2 text-left font-semibold">
                      γ (kN/m<sup>3</sup>)
                    </th>
                    <th className="px-1 py-2 text-left font-semibold">Soil type</th>
                    <th className="px-1 py-2 text-left font-semibold">Compression input</th>
                    <th className="px-1 py-2 text-left font-semibold">Parameters</th>
                    <th className="px-1 py-2 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-1 py-2">
                        <input
                          value={row.name}
                          onChange={(event) => updateRow(row.id, { name: event.target.value })}
                          className={paramInputClassName()}
                        />
                    </td>
                    <td className="px-1 py-2">
                      <input
                        value={row.thickness}
                        onChange={(event) => updateRow(row.id, { thickness: event.target.value })}
                        className={paramInputClassName()}
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input
                        value={row.unitWeight}
                        onChange={(event) => updateRow(row.id, { unitWeight: event.target.value })}
                        className={paramInputClassName()}
                      />
                    </td>
                    <td className="px-1 py-2">
                      <select
                        value={row.soilType}
                        onChange={(event) => updateRow(row.id, { soilType: event.target.value as SoilType })}
                        className={paramInputClassName()}
                      >
                        <option value="clay">Clay</option>
                        <option value="sand">Sand</option>
                      </select>
                    </td>
                    <td className="px-1 py-2">
                      <select
                        value={row.clayInputMode}
                        onChange={(event) =>
                          updateRow(row.id, { clayInputMode: event.target.value as ClayInputMode })
                        }
                        disabled={row.soilType !== "clay"}
                        className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100"
                      >
                        <option value="mv">mv</option>
                        <option value="cc-cr">Cc / Cr</option>
                      </select>
                    </td>
                    <td className="px-1 py-2 align-top">
                      {row.soilType === "clay" ? (
                        row.clayInputMode === "mv" ? (
                          <div className="grid w-full min-w-0 grid-cols-3 gap-2">
                            <label className="flex min-w-0 flex-col gap-0.5">
                              <span className={paramLabelClassName()}>
                                m<sub>v</sub>
                              </span>
                              <input
                                value={row.mv}
                                onChange={(event) => updateRow(row.id, { mv: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                            <label className="flex min-w-0 flex-col gap-0.5">
                              <span className={paramLabelClassName()}>
                                E<sub>s</sub> (kPa)
                              </span>
                              <input
                                value={row.es}
                                onChange={(event) => updateRow(row.id, { es: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                            <label className="flex min-w-0 flex-col gap-0.5" title="Poisson ratio ν">
                              <span className={paramLabelClassName()}>ν</span>
                              <input
                                value={row.nu}
                                onChange={(event) => updateRow(row.id, { nu: event.target.value })}
                                className={paramInputClassName()}
                                title="Poisson ratio ν"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="grid gap-1.5">
                            <label>
                              <span className={paramLabelClassName()}>
                                C<sub>c</sub>
                              </span>
                              <input
                                value={row.cc}
                                onChange={(event) => updateRow(row.id, { cc: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                            <label>
                              <span className={paramLabelClassName()}>
                                C<sub>r</sub>
                              </span>
                              <input
                                value={row.cr}
                                onChange={(event) => updateRow(row.id, { cr: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                            <label>
                              <span className={paramLabelClassName()} title="σ′p / σ′v0 at layer mid-depth; 1.0 = normally consolidated">
                                OCR
                              </span>
                              <input
                                value={row.ocr ?? "1.0"}
                                onChange={(event) => updateRow(row.id, { ocr: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                            <label>
                              <span className={paramLabelClassName()}>
                                e<sub>0</sub>
                              </span>
                              <input
                                value={row.e0}
                                onChange={(event) => updateRow(row.id, { e0: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                            <label>
                              <span className={paramLabelClassName()}>
                                E<sub>s</sub> (kPa)
                              </span>
                              <input
                                value={row.es}
                                onChange={(event) => updateRow(row.id, { es: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                            <label>
                              <span className={paramLabelClassName()}>Poisson ratio ν</span>
                              <input
                                value={row.nu}
                                onChange={(event) => updateRow(row.id, { nu: event.target.value })}
                                className={paramInputClassName()}
                              />
                            </label>
                          </div>
                        )
                      ) : (
                        <div className="grid w-full min-w-0 grid-cols-2 gap-2">
                          <label className="flex min-w-0 flex-col gap-0.5">
                            <span className={paramLabelClassName()}>
                              E<sub>s</sub> (kPa)
                            </span>
                            <input
                              value={row.es}
                              onChange={(event) => updateRow(row.id, { es: event.target.value })}
                              className={paramInputClassName()}
                            />
                          </label>
                          <label className="flex min-w-0 flex-col gap-0.5" title="Poisson ratio ν">
                            <span className={paramLabelClassName()}>ν</span>
                            <input
                              value={row.nu}
                              onChange={(event) => updateRow(row.id, { nu: event.target.value })}
                              className={paramInputClassName()}
                              title="Poisson ratio ν"
                            />
                          </label>
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </ProfileTableScroll>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-900 bg-slate-900 p-3 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Total settlement</p>
                <p className="mt-1 text-2xl font-semibold">{round(totals.total * 1000, 2)} mm</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Immediate</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{round(totals.immediate * 1000, 2)} mm</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Consolidation</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{round(totals.consolidation * 1000, 2)} mm</p>
              </div>
            </div>
            <button type="button" onClick={scrollToDetails} className="mt-2 text-sm font-semibold text-slate-800 underline underline-offset-4">
              Detailed calculations ↓
            </button>
          </div>

          <section id={DETAILS_ANCHOR} className="scroll-mt-28">
            <TierGate level={detailLevel} minHeight={220}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Layer calculations</h3>
            <ProfileTableScroll showHint={false}>
              <table
                className={`w-full ${profileTableScrollableMinClass("c9")} table-fixed divide-y divide-slate-200 text-xs`}
              >
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-1 py-2 text-left font-semibold">Layer ID</th>
                  <th className="px-1 py-2 text-left font-semibold">
                    z<sub>mid</sub> (m)
                  </th>
                  <th className="px-1 py-2 text-left font-semibold">
                    Influence I<sub>z</sub>
                  </th>
                  <th className="px-1 py-2 text-left font-semibold">
                    σ′<sub>v0</sub> (kPa)
                  </th>
                  <th className="px-1 py-2 text-left font-semibold">
                    Δσ<sub>z</sub> (kPa)
                  </th>
                  <th className="px-1 py-2 text-left font-semibold">Immediate settlement (mm)</th>
                  <th className="px-1 py-2 text-left font-semibold">Consolidation settlement (mm)</th>
                  <th className="px-1 py-2 text-left font-semibold">Total settlement (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => {
                  const result = results.find((entry) => entry.id === row.id);
                  return (
                    <tr key={`calc-${row.id}`}>
                      <td className="px-1 py-2">
                        <LayerLabel name={row.name || `L${row.id}`} />
                      </td>
                      <td className="px-1 py-2">{round(result?.depth ?? 0, 3).toFixed(3)}</td>
                      <td className="px-1 py-2">{round(result?.influence ?? 0, 4).toFixed(4)}</td>
                      <td className="px-1 py-2">{round(result?.sigmaV0Eff ?? 0, 2).toFixed(2)}</td>
                      <td className="px-1 py-2">{round(result?.deltaSigma ?? 0, 2).toFixed(2)}</td>
                      <td className="px-1 py-2">{round((result?.immediate ?? 0) * 1000, 2).toFixed(2)}</td>
                      <td className="px-1 py-2">{round((result?.consolidation ?? 0) * 1000, 2).toFixed(2)}</td>
                      <td className="px-1 py-2">{round((result?.total ?? 0) * 1000, 2).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </ProfileTableScroll>
                {detailLevel === "silver" || detailLevel === "gold" ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">Formulas by layer</p>
                    <p className="font-serif text-[14px] text-slate-800">
                      <EngineeringText text="Δσ_z = q · I_z,  I_z from Boussinesq integration over the B × L footing; s_i = Δσ_z H (1 − ν²) / E_s" />
                    </p>
                    {geometry.map((layer) => {
                      const r = results.find((x) => x.id === layer.id);
                      if (!r) return null;
                      const nu = Math.min(Math.max(num(layer.nu), 0), 0.49);
                      const cons =
                        layer.soilType !== "clay"
                          ? "s_c = 0 (granular)"
                          : layer.clayInputMode === "mv"
                            ? `s_c = m_v Δσ H = ${num(layer.mv)} × ${round(r.deltaSigma, 2)}/1000 × ${round(layer.thicknessValue, 2)} = ${round(r.consolidation * 1000, 2)} mm`
                            : `s_c = H/(1 + e_0)[C_r log(σ′_p/σ′_0) + C_c log(σ′_f/σ′_p)],  σ′_0 = ${round(r.sigmaV0Eff, 1)} kPa, OCR = ${num(layer.ocr, 1)} → ${round(r.consolidation * 1000, 2)} mm`;
                      return (
                        <div key={layer.id} className="rounded-md bg-slate-50 px-3 py-1.5 font-serif text-[13.5px] text-slate-800">
                          <p className="font-sans text-xs font-semibold text-slate-600">{layer.name || `L${layer.id}`}</p>
                          <p>
                            <EngineeringText text={`Δσ_z = ${round(qApplied, 1)} × ${round(r.influence, 4)} = ${round(r.deltaSigma, 2)} kPa;  s_i = ${round(r.deltaSigma, 2)} × ${round(layer.thicknessValue, 2)} × (1 − ${nu}²) / ${num(layer.es)} = ${round(r.immediate * 1000, 2)} mm`} />
                          </p>
                          <p>
                            <EngineeringText text={cons} />
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : detailLevel === "bronze" ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Silver shows the formula behind every layer value, with your numbers substituted.
                  </p>
                ) : null}
          </div>
            </TierGate>
          </section>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-lg font-semibold text-slate-900">Consolidation time</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-800">How C<sub>v</sub> relates to the profile.</span> The time
              estimate uses Terzaghi one-dimensional consolidation,{" "}
              <span className="whitespace-nowrap">
                t = T<sub>v</sub> H<sub>dr</sub>
                <sup>2</sup> / C<sub>v</sub>
              </span>
              . <strong>H<sub>dr</sub></strong> is taken from the{" "}
              <strong>sum of every layer marked as clay</strong> ({round(consolidationTime.totalClayThickness, 2)} m
              {consolidationTime.clayLayers.length > 0 ? (
                <>
                  :{" "}
                  {consolidationTime.clayLayers.map((layer, index) => (
                    <span key={layer.id}>
                      {index > 0 ? "; " : ""}
                      <LayerLabel name={layer.name || `L${layer.id}`} /> ({round(layer.thicknessValue, 2)} m)
                    </span>
                  ))}
                </>
              ) : null}
              ). The <strong>C<sub>v</sub> you enter is a single representative value</strong> for that lumped
              compressible thickness—it is not read automatically from layer rows. With{" "}
              <strong>several clay layers of different properties</strong>, this is only a coarse screen: choose a
              thickness-weighted average C<sub>v</sub>, a conservative (slow) C<sub>v</sub>, or use layered /
              numerical consolidation analysis for design.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Target degree of consolidation U (%)
                </label>
                <input
                  value={targetU}
                  onChange={(event) => setTargetU(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  C<sub>v</sub> (m²/year)
                </label>
                <input
                  value={cvInput}
                  onChange={(event) => setCvInput(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Drainage path</label>
                <select
                  value={drainageMode}
                  onChange={(event) => setDrainageMode(event.target.value as DrainageMode)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="double">Double drainage</option>
                  <option value="single">Single drainage</option>
                </select>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Target U = {round(consolidationTime.uTarget, 2)}%, T<sub>v</sub> ={" "}
              {round(consolidationTime.tv, 4).toFixed(4)}, H<sub>dr</sub> ={" "}
              {round(consolidationTime.hdr, 3).toFixed(3)} m, C<sub>v</sub> ={" "}
              {round(consolidationTime.cv, 4).toFixed(4)} m²/year.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Estimated completion time = {round(consolidationTime.years, 3).toFixed(3)} years (
              {round(consolidationTime.days, 1).toFixed(1)} days)
            </p>
          </div>
        </>
      )}
    </section>
  );
}
