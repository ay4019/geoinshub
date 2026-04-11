"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { ProfileTableScroll, profileTableScrollableMinClass } from "@/components/profile-table-mobile";
import type { UnitSystem } from "@/lib/types";

interface IntegratedSettlementProfileTabProps {
  unitSystem: UnitSystem;
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

function normalConsolidationSettlement(
  thickness: number,
  sigmaV0Eff: number,
  deltaSigma: number,
  cc: number,
  e0: number,
): number {
  const s0 = Math.max(sigmaV0Eff, 1);
  const sf = Math.max(s0 + deltaSigma, s0 + 0.001);
  const e = Math.max(e0, 0.05);
  return thickness * (cc / (1 + e)) * Math.log10(sf / s0);
}

function tvFromU(targetPercent: number): number {
  const u = Math.min(Math.max(targetPercent, 1), 99.9) / 100;
  if (u <= 0.6) return (Math.PI / 4) * u * u;
  return -0.933 * Math.log10(1 - u) - 0.085;
}

const UNICODE_SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "\u2080",
  "1": "\u2081",
  "2": "\u2082",
  "3": "\u2083",
  "4": "\u2084",
  "5": "\u2085",
  "6": "\u2086",
  "7": "\u2087",
  "8": "\u2088",
  "9": "\u2089",
};

function layerNameForSvg(name: string): string {
  const match = /^L\s*(\d+)$/i.exec(name.trim());
  if (match) {
    const sub = match[1].split("").map((d) => UNICODE_SUBSCRIPT_DIGITS[d] ?? d).join("");
    return `L${sub}`;
  }
  return name.trim() || "?";
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

function getLayerFill(soilType: SoilType, index: number) {
  const clayPalette = ["#d7b78a", "#c89f6f", "#b8845d", "#a9724f"];
  const sandPalette = ["#f2d7a1", "#e8c27f", "#ddb46c", "#d39f52"];
  const palette = soilType === "clay" ? clayPalette : sandPalette;
  return palette[index % palette.length];
}

function FoundationSoilIllustration({
  geometry,
  widthValue,
  lengthValue,
  excavationDepthValue,
  groundwaterDepthM,
}: {
  geometry: LayerGeometry[];
  widthValue: number;
  lengthValue: number;
  excavationDepthValue: number;
  groundwaterDepthM: number;
}) {
  const totalDepth = Math.max(geometry.at(-1)?.bottom ?? 1, 1);
  const referenceGwt = Math.min(Math.max(groundwaterDepthM, 0), totalDepth);
  const sectionTop = 84;
  const sectionLeft = 34;
  const sectionWidth = 566;
  const sectionHeight = 280;
  const footingWidth = 180;
  const footingHeight = 34;
  const footingX = sectionLeft + sectionWidth / 2 - footingWidth / 2;
  const footingY = 68;
  const excavationPx = Math.min(sectionHeight, (Math.max(excavationDepthValue, 0) / totalDepth) * sectionHeight);
  const layerRects = geometry.map((layer, index) => {
    const top = sectionTop + (layer.top / totalDepth) * sectionHeight;
    const height = Math.max(8, (layer.thicknessValue / totalDepth) * sectionHeight);
    return {
      id: layer.id,
      name: layer.name || `L${layer.id}`,
      soilType: layer.soilType,
      thickness: layer.thicknessValue,
      top,
      height,
      fill: getLayerFill(layer.soilType, index),
    };
  });
  const gwtY = sectionTop + (referenceGwt / totalDepth) * sectionHeight;
  const depthAxisX = 18;
  const profileClipId = "integrated-profile-soil-clip";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#ffffff,_#f8fafc_55%,_#eef2f7)] p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Foundation and soil profile</h3>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
          Live section + plan cue
        </div>
      </div>

      <svg
        viewBox="0 0 660 410"
        className="h-[280px] w-full min-h-[260px] sm:h-[320px] md:h-[360px]"
        shapeRendering="geometricPrecision"
        role="img"
        aria-label="Foundation cross-section with soil layers, groundwater, and dimensions"
      >
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fbff" />
            <stop offset="100%" stopColor="#edf4fb" />
          </linearGradient>
          <linearGradient id="footingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="layerAmbientShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#1c1917" stopOpacity="0.1" />
          </linearGradient>
          <pattern id="textureSand" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="6" r="1.15" fill="#ffffff" opacity="0.2" />
            <circle cx="14" cy="4" r="0.9" fill="#ffffff" opacity="0.16" />
            <circle cx="11" cy="14" r="1" fill="#ffffff" opacity="0.18" />
            <circle cx="3" cy="16" r="0.75" fill="#292524" opacity="0.06" />
          </pattern>
          <pattern id="textureClay" width="14" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 3 H14" stroke="#292524" strokeWidth="0.6" opacity="0.12" />
            <path d="M0 5.5 H14" stroke="#ffffff" strokeWidth="0.5" opacity="0.1" />
          </pattern>
          <clipPath id={profileClipId}>
            <rect x={sectionLeft} y={sectionTop} width={sectionWidth} height={sectionHeight} rx="20" />
          </clipPath>
          <marker id="arrowHead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" />
          </marker>
        </defs>

        <rect x="0" y="0" width="660" height="410" rx="24" fill="url(#skyGradient)" />

        <rect
          x={sectionLeft}
          y={sectionTop}
          width={sectionWidth}
          height={sectionHeight}
          rx="20"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="2"
        />
        <line x1={sectionLeft} y1={sectionTop} x2={sectionLeft + sectionWidth} y2={sectionTop} stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />

        <text
          x={sectionLeft + sectionWidth / 2}
          y={sectionTop - 10}
          fill="#334155"
          fontSize="12"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          textAnchor="middle"
        >
          Ground surface
        </text>

        <g clipPath={`url(#${profileClipId})`}>
          {layerRects.map((layer) => (
            <g key={layer.id}>
              <rect x={sectionLeft} y={layer.top} width={sectionWidth} height={layer.height} fill={layer.fill} />
              <rect x={sectionLeft} y={layer.top} width={sectionWidth} height={layer.height} fill="url(#layerAmbientShade)" />
              <rect
                x={sectionLeft}
                y={layer.top}
                width={sectionWidth}
                height={layer.height}
                fill={layer.soilType === "sand" ? "url(#textureSand)" : "url(#textureClay)"}
                opacity={layer.soilType === "sand" ? 0.95 : 0.85}
              />
              <line
                x1={sectionLeft}
                y1={layer.top}
                x2={sectionLeft + sectionWidth}
                y2={layer.top}
                stroke="#fefce8"
                strokeWidth="1.25"
                opacity="0.85"
              />
              <line
                x1={sectionLeft}
                y1={layer.top + layer.height}
                x2={sectionLeft + sectionWidth}
                y2={layer.top + layer.height}
                stroke="#57534e"
                strokeWidth="1.25"
                opacity="0.35"
              />
            </g>
          ))}
        </g>

        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <line
            x1={depthAxisX + 12}
            y1={sectionTop}
            x2={depthAxisX + 12}
            y2={sectionTop + sectionHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <text x={depthAxisX} y={sectionTop - 14} fill="#475569" fontSize="10" fontWeight="700">
            Depth (m)
          </text>
          {layerRects.map((layer) => {
            const yMid = layer.top + layer.height / 2;
            const showLabel = layer.height >= 22;
            if (!showLabel) return null;
            return (
              <g key={`lbl-${layer.id}`}>
                <rect
                  x={sectionLeft + 8}
                  y={yMid - 11}
                  width={Math.min(120, sectionWidth - 160)}
                  height="22"
                  rx="6"
                  fill="#ffffff"
                  opacity="0.92"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text x={sectionLeft + 16} y={yMid + 4} fill="#0f172a" fontSize="12" fontWeight="700">
                  {layerNameForSvg(layer.name)}
                  <tspan fill="#64748b" fontWeight="600" fontSize="11">
                    {" "}
                    ({layer.soilType === "sand" ? "sand" : "clay"})
                  </tspan>
                </text>
              </g>
            );
          })}
          {Array.from(new Set([0, ...geometry.map((l) => l.bottom)]))
            .sort((a, b) => a - b)
            .map((d) => {
              const y = sectionTop + (d / totalDepth) * sectionHeight;
              return (
                <g key={`tick-${d}`}>
                  <line x1={depthAxisX + 12} y1={y} x2={depthAxisX + 22} y2={y} stroke="#64748b" strokeWidth="1.2" />
                  <text x={depthAxisX} y={y + 4} fill="#475569" fontSize="11" fontWeight="600" textAnchor="end">
                    {round(d, 2)}
                  </text>
                </g>
              );
            })}
        </g>

        {excavationDepthValue > 0 ? (
          <>
            <rect
              x={footingX - 34}
              y={sectionTop}
              width={footingWidth + 68}
              height={Math.max(18, excavationPx)}
              fill="#ffffff"
              opacity="0.5"
            />
            <path
              d={`M ${footingX - 34} ${sectionTop} L ${footingX - 34} ${sectionTop + excavationPx} L ${footingX + footingWidth + 34} ${sectionTop + excavationPx} L ${footingX + footingWidth + 34} ${sectionTop}`}
              fill="none"
              stroke="#0f172a"
              strokeDasharray="6 5"
              strokeWidth="2"
              opacity="0.8"
            />
            <text x={footingX + footingWidth + 44} y={sectionTop + Math.max(18, excavationPx / 2)} fill="#0f172a" fontSize="12" fontWeight="700">
              Dexc = {round(excavationDepthValue, 2)} m
            </text>
          </>
        ) : null}

        {referenceGwt < totalDepth ? (
          <>
            <line x1={sectionLeft} y1={gwtY} x2={sectionLeft + sectionWidth} y2={gwtY} stroke="#0369a1" strokeWidth="2.75" strokeDasharray="8 6" strokeLinecap="round" />
            <path
              d={`M ${sectionLeft + 6} ${gwtY + 2} Q ${sectionLeft + 22} ${gwtY - 3} ${sectionLeft + 38} ${gwtY + 2} T ${sectionLeft + 70} ${gwtY + 2}`}
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.4"
              opacity="0.85"
            />
            <path
              d={`M ${sectionLeft + sectionWidth - 70} ${gwtY + 2} Q ${sectionLeft + sectionWidth - 54} ${gwtY - 3} ${sectionLeft + sectionWidth - 38} ${gwtY + 2} T ${sectionLeft + sectionWidth - 6} ${gwtY + 2}`}
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.4"
              opacity="0.85"
            />
            <rect x={sectionLeft + sectionWidth - 102} y={gwtY - 20} width="86" height="24" rx="12" fill="#0369a1" stroke="#e0f2fe" strokeWidth="1" />
            <text
              x={sectionLeft + sectionWidth - 59}
              y={gwtY - 2}
              fill="#ffffff"
              fontSize="12"
              textAnchor="middle"
              fontWeight="700"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              GWT
            </text>
          </>
        ) : null}

        <rect x={footingX} y={footingY} width={footingWidth} height={footingHeight} rx="10" fill="url(#footingGradient)" />
        <rect x={footingX + 18} y={footingY - 18} width={footingWidth - 36} height="18" rx="9" fill="#475569" opacity="0.85" />
        <text
          x={footingX + footingWidth / 2}
          y={footingY + 22}
          fill="#ffffff"
          fontSize="14"
          textAnchor="middle"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          Foundation
        </text>

        <line x1={footingX} y1={footingY + footingHeight + 26} x2={footingX + footingWidth} y2={footingY + footingHeight + 26} stroke="#1e293b" strokeWidth="2" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" />
        <text
          x={footingX + footingWidth / 2}
          y={footingY + footingHeight + 20}
          fill="#0f172a"
          fontSize="13"
          textAnchor="middle"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          B = {round(widthValue, 2)} m
        </text>

        <g transform="translate(516 26)">
          <rect x="0" y="0" width="110" height="86" rx="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <text x="55" y="18" fill="#334155" fontSize="12" textAnchor="middle" fontWeight="700">
            Plan cue
          </text>
          <rect x="28" y="30" width="54" height="34" rx="7" fill="#94a3b8" />
          <line x1="28" y1="72" x2="82" y2="72" stroke="#1e293b" strokeWidth="1.6" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" />
          <text x="55" y="83" fill="#0f172a" fontSize="11" textAnchor="middle" fontWeight="700">
            B = {round(widthValue, 2)} m
          </text>
          <line x1="90" y1="30" x2="90" y2="64" stroke="#1e293b" strokeWidth="1.6" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" />
          <text x="97" y="49" fill="#0f172a" fontSize="11" fontWeight="700">
            L = {round(lengthValue, 2)} m
          </text>
        </g>

        <text x={sectionLeft} y={sectionTop + sectionHeight + 24} fill="#475569" fontSize="12">
          Total interpreted profile depth = {round(totalDepth, 2)} m
        </text>
      </svg>
    </div>
  );
}

export function IntegratedSettlementProfileTab({ unitSystem }: IntegratedSettlementProfileTabProps) {
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

  const loadUnitLabel = unitSystem === "american" ? "ksf" : "kPa";

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

    return geometry.map((layer) => {
      const influence = rectangularElasticStress(1, foundationB, foundationL, layer.midDepth);
      const deltaSigma = influence * qApplied;

      const gamma = Math.max(num(layer.unitWeight, 18), 0);
      const gwtDepth = Math.max(num(groundwaterDepth, 0), 0);
      const sigmaV0 = gamma * layer.midDepth;
      const sigmaV0Eff = Math.max(sigmaV0 - gammaWater * Math.max(layer.midDepth - gwtDepth, 0), 1);

      const es = Math.max(num(layer.es), 1);
      const nu = Math.min(Math.max(num(layer.nu), 0), 0.49);
      const immediate = (deltaSigma * layer.thicknessValue * (1 - nu * nu)) / es;

      const consolidation =
        layer.soilType === "clay"
          ? layer.clayInputMode === "mv"
            ? Math.max(num(layer.mv), 0) * (deltaSigma / 1000) * layer.thicknessValue
            : normalConsolidationSettlement(
                layer.thicknessValue,
                sigmaV0Eff,
                deltaSigma,
                Math.max(num(layer.cc, 0), 0),
                Math.max(num(layer.e0, 0.7), 0.05),
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
  }, [geometry, groundwaterDepth, length, qApplied, width]);

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
      <div
        className={`grid gap-3 ${loadCase === "structure" ? "md:grid-cols-3" : "md:grid-cols-1"}`}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Load case</label>
          <select
            value={loadCase}
            onChange={(event) => setLoadCase(event.target.value as LoadCase)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="structure">Structure</option>
            <option value="embankment">Embankment</option>
          </select>
        </div>
        {loadCase === "structure" ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Surface load q<sub>0</sub> ({loadUnitLabel})
              </label>
              <input
                value={q0}
                onChange={(event) => setQ0(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
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
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">B (m)</label>
              <input
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">L (m)</label>
              <input
                value={length}
                onChange={(event) => setLength(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Excavation depth D<sub>exc</sub> (m)
              </label>
              <input
                value={excavationDepth}
                onChange={(event) => setExcavationDepth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <FoundationSoilIllustration
            geometry={geometry}
            widthValue={Math.max(num(width), 0)}
            lengthValue={Math.max(num(length), 0)}
            excavationDepthValue={Math.max(num(excavationDepth), 0)}
            groundwaterDepthM={num(groundwaterDepth)}
          />

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
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Consolidation</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {round(totals.consolidation * 1000, 2)} mm
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Immediate</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {round(totals.immediate * 1000, 2)} mm
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{round(totals.total * 1000, 2)} mm</p>
            </div>
          </div>

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
