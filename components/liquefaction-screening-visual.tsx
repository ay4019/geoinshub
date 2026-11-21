"use client";

import { useId } from "react";

import { SoilPatternDefs, SvgScript } from "@/components/pile/pile-shared";
import { ScriptText } from "@/components/script-text";
import { getDisplayUnit } from "@/lib/tool-units";
import type { CalculationResult, UnitSystem } from "@/lib/types";

interface LiquefactionScreeningVisualProps {
  values: Record<string, string>;
  result: CalculationResult | null;
  unitSystem: UnitSystem;
}

const INK = "#0f172a";
const INK_2 = "#475569";
const WATER = "#2563eb";
/** Validated categorical pair: demand = orange, resistance = blue. */
const DEMAND = "#eb6834";
const RESIST = "#2a78d6";

function numeric(result: CalculationResult | null, label: string): number | null {
  const it = result?.items.find((entry) => entry.label === label);
  return it && typeof it.value === "number" ? it.value : null;
}

function fmt(v: number, d = 2) {
  return Number(v.toFixed(d)).toString();
}

/**
 * Single-sample liquefaction screening: soil column with groundwater and the sample, the earthquake demand set
 * against the soil's cyclic resistance, and the factor of safety on a gauge with the required minimum.
 */
export function LiquefactionScreeningVisual({ values, result, unitSystem }: LiquefactionScreeningVisualProps) {
  const uid = useId().replace(/:/g, "");
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const z = Math.max(Number(values.sampleDepth ?? 0), 0);
  const gwt = Math.max(Number(values.groundwaterDepth ?? 0), 0);
  const isTbdy = values.method !== "idriss-boulanger-2008";

  const demand = isTbdy ? numeric(result, "τ_eq") : numeric(result, "CSR");
  const resistance = isTbdy ? numeric(result, "τ_R") : numeric(result, "CRR_M,σ = CRR_7.5 · MSF · K_σ");
  const fos = numeric(result, "Factor of safety");
  const required = numeric(result, "Minimum required FS") ?? (isTbdy ? 1.1 : 1);
  const sigmaV = numeric(result, "σ_v0");
  const sigmaVe = numeric(result, "σ'_v0");
  const hasResult = demand !== null && resistance !== null && fos !== null;
  const liquefies = hasResult && fos! < required;

  // Soil column.
  const W = 640;
  const H = 300;
  const colL = 40;
  const colR = 230;
  const top = 40;
  const bottom = H - 20;
  const maxDepth = Math.max(z, gwt, 2) * 1.35;
  const y = (d: number) => top + (d / maxDepth) * (bottom - top);

  // Bars.
  const barL = 300;
  const barR = W - 30;
  const barMax = Math.max(demand ?? 0, resistance ?? 0, 0.01) * 1.15;
  const bx = (v: number) => barL + (v / barMax) * (barR - barL);
  const gaugeMax = Math.max(2, (fos ?? 0) * 1.1);
  const gx = (v: number) => barL + (Math.min(v, gaugeMax) / gaugeMax) * (barR - barL);
  const unitText = isTbdy ? ` ${stressUnit}` : "";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Liquefaction screening</p>
          <p className="text-xs text-slate-600">
            <ScriptText text={`${isTbdy ? "TBDY 2018: τ_R against τ_eq" : "Idriss & Boulanger (2008): CRR against CSR"} for the sample at z = ${fmt(z)} ${depthUnit}`} />
          </p>
        </div>
        {hasResult ? (
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-semibold text-white ${liquefies ? "bg-red-700" : "bg-emerald-700"}`}>
            <span aria-hidden="true">{liquefies ? "▲" : "●"}</span>
            {liquefies ? "Liquefaction potential" : "No triggering"} · FoS {fmt(fos!)}
          </span>
        ) : null}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Liquefaction demand, resistance and factor of safety">
        <defs>
          <SoilPatternDefs prefix={uid} />
        </defs>
        {/* soil column */}
        <rect x={colL} y={top} width={colR - colL} height={bottom - top} fill={`url(#${uid}-silty-sand)`} stroke="#a8a29e" />
        {gwt < maxDepth ? <rect x={colL} y={y(gwt)} width={colR - colL} height={bottom - y(gwt)} fill={WATER} opacity="0.1" /> : null}
        <line x1={colL - 4} x2={colR} y1={top} y2={top} stroke="#3f3a33" strokeWidth="2" />
        {gwt < maxDepth ? (
          <g>
            <line x1={colL} x2={colR} y1={y(gwt)} y2={y(gwt)} stroke={WATER} strokeWidth="1.4" strokeDasharray="6 4" />
            <text x={colL + 6} y={y(gwt) - 5} fontSize="10" fontWeight="600" fill={WATER}>
              GWT {fmt(gwt)} {depthUnit}
            </text>
          </g>
        ) : null}
        <circle cx={(colL + colR) / 2} cy={y(z)} r="7" fill={liquefies ? "#dc2626" : hasResult ? "#059669" : INK} stroke="#ffffff" strokeWidth="2" />
        <line x1={(colL + colR) / 2 + 9} x2={colR + 10} y1={y(z)} y2={y(z)} stroke={INK_2} strokeDasharray="2 3" />
        <text x={colR + 14} y={y(z) - 4} fontSize="10.5" fontWeight="700" fill={INK}>
          z = {fmt(z)} {depthUnit}
        </text>
        {sigmaV !== null && sigmaVe !== null ? (
          <text x={colR + 14} y={y(z) + 10} fontSize="10" fill={INK_2}>
            <SvgScript text={`σ_v0 ${fmt(sigmaV, 0)} · σ′_v0 ${fmt(sigmaVe, 0)} ${stressUnit}`} />
          </text>
        ) : null}
        {[0, maxDepth / 2, maxDepth].map((d) => (
          <text key={d} x={colL - 6} y={y(d) + 3.5} textAnchor="end" fontSize="10" fill={INK_2}>
            {fmt(d, 1)}
          </text>
        ))}

        {/* demand vs resistance */}
        {hasResult ? (
          <g>
            <text x={barL} y={top + 4} fontSize="11" fontWeight="700" fill={INK}>
              {isTbdy ? "Cyclic shear stress" : "Cyclic stress ratio"}
            </text>
            {[
              { label: isTbdy ? "τ_eq demand" : "CSR demand", v: demand!, c: DEMAND, yy: top + 18 },
              { label: isTbdy ? "τ_R resistance" : "CRR resistance", v: resistance!, c: RESIST, yy: top + 52 },
            ].map((b) => (
              <g key={b.label}>
                <rect x={barL} y={b.yy} width={Math.max(bx(b.v) - barL, 2)} height="22" rx="4" fill={b.c} />
                <text x={bx(b.v) + 6} y={b.yy + 15} fontSize="11" fontWeight="700" fill={INK}>
                  {fmt(b.v, isTbdy ? 1 : 3)}
                  {unitText}
                </text>
                <text x={barL + 6} y={b.yy + 15} fontSize="10.5" fontWeight="600" fill="#ffffff">
                  <SvgScript text={b.label} />
                </text>
              </g>
            ))}

            <text x={barL} y={top + 96} fontSize="11" fontWeight="700" fill={INK}>
              Factor of safety = resistance / demand
            </text>
            <rect x={barL} y={top + 128} width={gx(required) - barL} height="14" rx="3" fill="#fee2e2" />
            <rect x={gx(required)} y={top + 128} width={barR - gx(required)} height="14" rx="3" fill="#dcfce7" />
            <line x1={gx(required)} x2={gx(required)} y1={top + 122} y2={top + 148} stroke={INK} strokeWidth="1.4" />
            <text x={gx(required)} y={top + 162} textAnchor="middle" fontSize="10" fontWeight="600" fill={INK}>
              required {fmt(required, 2)}
            </text>
            <path d={`M${gx(fos!)},${top + 126} l-6,-10 h12 z`} fill={liquefies ? "#dc2626" : "#059669"} />
            <text x={gx(fos!)} y={top + 113} textAnchor="middle" fontSize="11" fontWeight="800" fill={INK}>
              {fmt(fos!)}
            </text>
            {[0, 0.5, 1, 1.5, 2].filter((t) => t <= gaugeMax).map((t) => (
              <text key={t} x={gx(t)} y={top + 178} textAnchor="middle" fontSize="9.5" fill={INK_2}>
                {t}
              </text>
            ))}
            <text x={barL} y={top + 206} fontSize="10.5" fill={INK_2}>
              {liquefies
                ? `Resistance is ${fmt((1 - fos!) * 100, 0)}% below the demand — triggering is likely.`
                : `Resistance exceeds the demand by ${fmt((fos! - 1) * 100, 0)}%.`}
            </text>
          </g>
        ) : (
          <text x={barL} y={top + 40} fontSize="12" fill={INK_2}>
            Run the calculation to compare demand and resistance.
          </text>
        )}
      </svg>
    </section>
  );
}
