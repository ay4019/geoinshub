"use client";

import { computeSubgradeModulus, type SubgradeInput } from "@/lib/design-tools/subgrade-reaction";
import { convertInputToMetric, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

const INK = "#0f172a";
const INK_2 = "#475569";
const BAR = "#2a78d6";

/** Bowles (1996) indicative ranges, MN/m³. */
const TYPICAL = [
  { label: "Loose sand", from: 4.8, to: 16 },
  { label: "Medium dense sand", from: 9.6, to: 80 },
  { label: "Dense sand", from: 64, to: 128 },
  { label: "Clay, q_a ≤ 200 kPa", from: 12, to: 24 },
  { label: "Clay, 200–800 kPa", from: 24, to: 48 },
];

function n(v: string | undefined, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export function SubgradeVisual({ values, unitSystem }: { values: Record<string, string>; unitSystem: UnitSystem }) {
  const lenUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const input: SubgradeInput = {
    width: Math.max(convertInputToMetric(n(values.width, 2), "m", unitSystem), 0.3),
    length: Math.max(convertInputToMetric(n(values.length, 10), "m", unitSystem), 0.3),
    es: Math.max(convertInputToMetric(n(values.es), "kPa", unitSystem), 0),
    nu: Math.min(Math.max(n(values.nu, 0.3), 0), 0.49),
    qa: Math.max(convertInputToMetric(n(values.qa), "kPa", unitSystem), 0),
    fs: Math.max(n(values.fs, 3), 1),
    q: Math.max(convertInputToMetric(n(values.q), "kPa", unitSystem), 0),
    s: Math.max(n(values.s), 0),
    plateK: Math.max(n(values.plateK), 0),
    plateSoil: values.plateSoil === "clay" ? "clay" : "sand",
  };
  const list = computeSubgradeModulus(input).map((e) => ({ ...e, mn: e.ks / 1000 }));
  const sorted = [...list].map((e) => e.mn).sort((a, b) => a - b);
  const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : 0;

  // Section: footing on Winkler springs; spring spacing tightens and coils shorten as k_s grows.
  const W = 640;
  const H = 230;
  const footW = Math.min(Math.max(140 + input.width * 22, 160), 420);
  const fx = (W - footW) / 2;
  const springs = Math.max(5, Math.min(13, Math.round(5 + median / 10)));
  const springH = Math.max(34, 70 - median * 0.4);
  const fy = 70;

  const chartMax = Math.max(...list.map((e) => e.mn), 20) * 1.15;
  const bx = (v: number) => 170 + (v / chartMax) * (W - 200);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Winkler foundation model</p>
          <p className="text-xs text-slate-600">
            Soil replaced by independent springs of stiffness k<sub>s</sub> per unit area · updates as you type
          </p>
        </div>
        {list.length ? (
          <span className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold tabular-nums text-white">
            median k<sub>s</sub> ≈ {median.toFixed(1)} MN/m³ · {Math.round((median * 1000) / 9.81).toLocaleString("en-US")} t/m³
          </span>
        ) : null}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Footing on Winkler springs">
        <rect x="0" y={fy + 22 + springH} width={W} height={H - fy - 22 - springH} fill="#e7d3ad" />
        <line x1="0" x2={W} y1={fy + 22 + springH} y2={fy + 22 + springH} stroke="#7a5b34" strokeWidth="2" />
        {Array.from({ length: 34 }, (_, i) => i * 20).map((x) => (
          <line key={x} x1={x} y1={fy + 22 + springH + 6} x2={x + 10} y2={fy + 22 + springH + 16} stroke="#a8875a" strokeWidth="1" />
        ))}
        {/* load */}
        {Array.from({ length: 9 }, (_, i) => fx + (footW * (i + 0.5)) / 9).map((x) => (
          <g key={x}>
            <line x1={x} x2={x} y1={fy - 34} y2={fy - 4} stroke={INK} strokeWidth="1.3" />
            <path d={`M${x - 4},${fy - 9} L${x},${fy - 3} L${x + 4},${fy - 9}`} fill="none" stroke={INK} strokeWidth="1.3" />
          </g>
        ))}
        <text x={W / 2} y={fy - 40} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
          q
        </text>
        <rect x={fx} y={fy} width={footW} height="22" rx="3" fill="#94a3b8" stroke={INK} strokeWidth="1.3" />
        <text x={W / 2} y={fy + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">
          B = {n(values.width, 2)} {lenUnit} · L = {n(values.length, 10)} {lenUnit}
        </text>
        {Array.from({ length: springs }, (_, i) => fx + 14 + ((footW - 28) * i) / (springs - 1)).map((x) => {
          const y0 = fy + 22;
          const coils = 6;
          const seg = springH / (coils * 2 + 2);
          const pts = [`M${x},${y0}`, `L${x},${y0 + seg}`];
          for (let c = 0; c < coils * 2; c += 1) pts.push(`L${x + (c % 2 ? -6 : 6)},${y0 + seg * (c + 1.5)}`);
          pts.push(`L${x},${y0 + springH - seg}`, `L${x},${y0 + springH}`);
          return <path key={x} d={pts.join(" ")} fill="none" stroke="#2563eb" strokeWidth="1.4" strokeLinejoin="round" />;
        })}
        <text x={fx + footW + 10} y={fy + 22 + springH / 2 + 4} fontSize="10.5" fontWeight="600" fill={INK}>
          k<tspan fontSize="8" dy="2">s</tspan>
          <tspan dy="-2"> = q / s</tspan>
        </text>
      </svg>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">Estimates by method (MN/m³)</p>
        {list.length ? (
          <svg viewBox={`0 0 ${W} ${list.length * 30 + 34}`} className="mt-1 h-auto w-full max-w-3xl" role="img" aria-label="Subgrade modulus by method">
            {list.map((e, i) => (
              <g key={e.key}>
                <text x="164" y={i * 30 + 22} textAnchor="end" fontSize="11" fill={INK}>
                  {e.label.split(":")[0]}
                </text>
                <rect x="170" y={i * 30 + 10} width={Math.max(bx(e.mn) - 170, 2)} height="16" rx="4" fill={BAR} />
                <text x={bx(e.mn) + 6} y={i * 30 + 22} fontSize="11" fontWeight="700" fill={INK}>
                  {e.mn.toFixed(1)}
                </text>
              </g>
            ))}
            <line x1={bx(median)} x2={bx(median)} y1="4" y2={list.length * 30 + 10} stroke={INK} strokeDasharray="4 3" />
            <text x={bx(median)} y={list.length * 30 + 26} textAnchor="middle" fontSize="10" fontWeight="600" fill={INK_2}>
              median {median.toFixed(1)}
            </text>
          </svg>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Enter E_s, q_a, a settlement or a plate-load k₁ to compare methods.</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
          {TYPICAL.map((t) => {
            const inRange = median >= t.from && median <= t.to;
            return (
              <span key={t.label} className={`rounded-full border px-2 py-0.5 ${inRange ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50"}`}>
                {t.label}: {t.from}–{t.to}
              </span>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Typical ranges after Bowles (1996), highlighted where the median falls.</p>
      </div>
    </div>
  );
}
