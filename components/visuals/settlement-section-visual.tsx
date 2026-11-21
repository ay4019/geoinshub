"use client";

import { useId, useMemo } from "react";

import { SoilPatternDefs } from "@/components/pile/pile-shared";

const INK = "#0f172a";
const INK_2 = "#475569";
const WATER = "#2563eb";
/** Validated categorical pair (slots 1–2): immediate = blue, consolidation = orange. */
const IMMEDIATE = "#2a78d6";
const CONSOLIDATION = "#eb6834";

export interface SettlementVisualLayer {
  name: string;
  top: number;
  bottom: number;
  soilType: "clay" | "sand";
}

export interface SettlementVisualResult {
  depth: number;
  sigmaV0Eff: number;
  deltaSigma: number;
  immediate: number; // m
  consolidation: number; // m
}

/** Newmark (1935) influence factor below the corner of a uniformly loaded a × b rectangle at depth z. */
function cornerInfluence(a: number, b: number, z: number): number {
  if (z <= 0) return 0.25;
  const m = a / z;
  const n = b / z;
  const v = m * m + n * n + 1;
  const v1 = (m * n) ** 2;
  const t1 = ((2 * m * n * Math.sqrt(v)) / (v + v1)) * ((v + 1) / v);
  const t2 = Math.atan2(2 * m * n * Math.sqrt(v), v - v1);
  return (t1 + t2) / (4 * Math.PI);
}

/** Δσ/q at horizontal offset x (across B) on the centreline of an L-long rectangle, depth z below the base. */
export function influenceAt(x: number, z: number, B: number, L: number): number {
  const f = (a: number) => Math.sign(a) * cornerInfluence(Math.abs(a), L / 2, z);
  return Math.min(2 * (f(B / 2 + x) + f(B / 2 - x)), 1);
}

const LEVELS = [0.8, 0.5, 0.3, 0.2, 0.1];

export function SettlementSectionVisual({
  layers,
  width,
  length,
  excavationDepth,
  groundwaterDepth,
  qApplied,
  results,
}: {
  layers: SettlementVisualLayer[];
  width: number;
  length: number;
  excavationDepth: number;
  groundwaterDepth: number;
  qApplied: number;
  results: SettlementVisualResult[];
}) {
  const uid = useId().replace(/:/g, "");
  const B = Math.max(width, 0.1);
  const Lf = Math.max(length, B);
  const Dexc = Math.max(excavationDepth, 0);
  const totalDepth = Math.max(layers.at(-1)?.bottom ?? 1, Dexc + 0.5);

  const W = 760;
  const top = 72;
  const secL = 40;
  const secR = 420;
  const halfExt = Math.max(1.4 * B, 0.55 * totalDepth);
  const s = Math.min((secR - secL) / (2 * halfExt), 250 / totalDepth);
  const H = Math.max(top + totalDepth * s + 30, 240);
  const cx = (secL + secR) / 2;
  const X = (x: number) => cx + x * s;
  /** Depth from the ground surface → px; the section and both side charts share it, so rows line up. */
  const Y = (z: number) => top + z * s;

  // Isobars (depths below the base).
  const bulbs = useMemo(() => {
    const zMax = totalDepth - Dexc;
    return LEVELS.map((level) => {
      const pts: Array<[number, number]> = [];
      const n = 70;
      for (let i = 1; i <= n; i += 1) {
        const z = (zMax * i) / n;
        if (influenceAt(0, z, B, Lf) < level) {
          pts.push([0, z]);
          break;
        }
        let lo = 0;
        let hi = halfExt * 1.3;
        if (influenceAt(hi, z, B, Lf) >= level) {
          pts.push([hi, z]);
          continue;
        }
        for (let k = 0; k < 28; k += 1) {
          const mid = (lo + hi) / 2;
          if (influenceAt(mid, z, B, Lf) >= level) lo = mid;
          else hi = mid;
        }
        pts.push([lo, z]);
      }
      return { level, pts };
    });
  }, [B, Lf, Dexc, halfExt, totalDepth]);

  const gwtY = Y(groundwaterDepth);
  const showGwt = groundwaterDepth >= 0 && groundwaterDepth < totalDepth;
  const baseY = Y(Dexc);

  // Side charts on the layer depth scale (same as Y because s maps totalDepth to bottom − top or less).
  const chartTop = top;
  const chartBottom = Y(totalDepth);
  const stressL = 450;
  const stressR = 590;
  const barL = 612;
  const barR = W - 16;
  const stressCurve: Array<[number, number]> = [];
  for (let i = 0; i <= 60; i += 1) {
    const z = Dexc + ((totalDepth - Dexc) * i) / 60;
    stressCurve.push([z, qApplied * influenceAt(0, Math.max(z - Dexc, 1e-4), B, Lf)]);
  }
  const stressMax = Math.max(qApplied, ...results.map((r) => r.sigmaV0Eff), 1) * 1.05;
  const sxS = (v: number) => stressL + (v / stressMax) * (stressR - stressL);
  const settleMm = results.map((r) => ({ imm: r.immediate * 1000, con: r.consolidation * 1000 }));
  const maxMm = Math.max(...settleMm.map((r) => r.imm + r.con), 1) * 1.1;
  const sxB = (v: number) => barL + (v / maxMm) * (barR - barL);
  const totalMm = settleMm.reduce((sum, r) => sum + r.imm + r.con, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Foundation, stress bulbs and settlement</p>
          <p className="text-xs text-slate-600">
            Drawn to scale · Δσ/q isobars from Newmark&apos;s rectangle solution · updates as you type
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: IMMEDIATE }} />
            Immediate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CONSOLIDATION }} />
            Consolidation
          </span>
          <span className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold tabular-nums text-white">s ≈ {totalMm.toFixed(1)} mm</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[640px]" role="img" aria-label="Foundation section with stress bulbs, stress profile and settlement by layer">
          <defs>
            <SoilPatternDefs prefix={uid} />
            <clipPath id={`${uid}-sec`}>
              <rect x={secL} y={top} width={secR - secL} height={Y(totalDepth) - top} />
            </clipPath>
            <marker id={`${uid}-dim`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 z" fill={INK_2} />
            </marker>
          </defs>

          {/* layers */}
          <g clipPath={`url(#${uid}-sec)`}>
            {layers.map((l, i) => (
              <rect key={i} x={secL} y={Y(l.top)} width={secR - secL} height={Math.max(Y(l.bottom) - Y(l.top), 0)} fill={`url(#${uid}-${l.soilType === "sand" ? "sand" : "clay"})`} />
            ))}
            {showGwt ? <rect x={secL} y={gwtY} width={secR - secL} height={Y(totalDepth) - gwtY} fill={WATER} opacity="0.07" /> : null}
            {Dexc > 0 ? <rect x={X(-B / 2) - 6} y={top} width={B * s + 12} height={baseY - top} fill="#f8fafc" /> : null}
            {/* isobars */}
            {bulbs.map((b) => {
              if (b.pts.length < 2) return null;
              const right = b.pts.map(([x, z]) => `${X(x).toFixed(1)},${Y(Dexc + z).toFixed(1)}`);
              const left = [...b.pts].reverse().map(([x, z]) => `${X(-x).toFixed(1)},${Y(Dexc + z).toFixed(1)}`);
              const d = `M${X(-B / 2)},${baseY} L${X(B / 2)},${baseY} L${right.join(" L")} L${left.join(" L")} Z`;
              return (
                <path key={b.level} d={d} fill={INK} fillOpacity={0.05} stroke={INK} strokeWidth={b.level === 0.1 ? 1.4 : 1} strokeDasharray={b.level === 0.1 ? undefined : "4 3"} strokeOpacity="0.75" />
              );
            })}
          </g>
          {bulbs.map((b) => {
            const deepest = b.pts.at(-1);
            if (!deepest) return null;
            return (
              <text key={`l-${b.level}`} x={X(0) + 4} y={Y(Dexc + deepest[1]) - 3} fontSize="9.5" fontWeight="600" fill={INK}>
                {b.level}q
              </text>
            );
          })}
          {layers.map((l, i) =>
            i > 0 ? <line key={`b-${i}`} x1={secL} x2={secR} y1={Y(l.top)} y2={Y(l.top)} stroke="#5b4630" strokeWidth="0.9" opacity="0.6" /> : null,
          )}
          {layers.map((l, i) =>
            Y(l.bottom) - Y(l.top) > 16 ? (
              <g key={`n-${i}`}>
                <rect x={secL + 5} y={Y(l.top) + 4} width="74" height="15" rx="7.5" fill="#ffffff" fillOpacity="0.9" stroke="#d6d3d1" />
                <text x={secL + 12} y={Y(l.top) + 14.5} fontSize="9.5" fontWeight="600" fill={INK}>
                  {l.name} · {l.soilType}
                </text>
              </g>
            ) : null,
          )}
          <rect x={secL} y={top} width={secR - secL} height={Y(totalDepth) - top} fill="none" stroke="#a8a29e" />
          <line x1={secL} x2={secR} y1={top} y2={top} stroke="#3f3a33" strokeWidth="2" />

          {/* foundation */}
          <rect x={X(-B / 2)} y={baseY - 14} width={B * s} height="14" rx="2" fill="#94a3b8" stroke={INK} strokeWidth="1.2" />
          {Array.from({ length: 7 }, (_, i) => X(-B / 2) + (B * s * (i + 0.5)) / 7).map((x) => (
            <g key={x}>
              <line x1={x} x2={x} y1={baseY - 40} y2={baseY - 17} stroke={INK} strokeWidth="1.1" />
              <path d={`M${x - 3.5},${baseY - 22} L${x},${baseY - 17} L${x + 3.5},${baseY - 22}`} fill="none" stroke={INK} strokeWidth="1.1" />
            </g>
          ))}
          <text x={cx} y={baseY - 46} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK}>
            q = {qApplied.toFixed(1)} kPa (net) on B × L = {B} × {Lf} m
          </text>
          {showGwt ? (
            <g>
              <line x1={secL} x2={secR} y1={gwtY} y2={gwtY} stroke={WATER} strokeWidth="1.3" strokeDasharray="6 4" />
              <rect x={secR - 74} y={gwtY - 16} width="70" height="14" rx="3" fill="#ffffff" fillOpacity="0.9" />
              <text x={secR - 8} y={gwtY - 5} textAnchor="end" fontSize="10" fontWeight="600" fill={WATER}>
                GWT {groundwaterDepth} m
              </text>
            </g>
          ) : null}

          {/* depth ticks */}
          {Array.from(new Set([0, ...layers.map((l) => l.bottom)])).map((d) => (
            <g key={`t-${d}`}>
              <line x1={secL - 4} x2={secL} y1={Y(d)} y2={Y(d)} stroke={INK_2} />
              <text x={secL - 7} y={Y(d) + 3.5} textAnchor="end" fontSize="10" fill={INK_2}>
                {Number(d.toFixed(2))}
              </text>
            </g>
          ))}

          {/* stress profile */}
          <text x={(stressL + stressR) / 2} y={top - 26} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK}>
            Stress below centre (kPa)
          </text>
          <line x1={stressL} x2={stressL} y1={chartTop} y2={chartBottom} stroke="#94a3b8" />
          {[0, 0.5, 1].map((t) => (
            <text key={t} x={sxS(stressMax * t)} y={top - 8} textAnchor="middle" fontSize="9.5" fill={INK_2}>
              {Math.round(stressMax * t)}
            </text>
          ))}
          <path
            d={stressCurve.map(([z, v], i) => `${i ? "L" : "M"}${sxS(v).toFixed(1)},${Y(z).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={INK}
            strokeWidth="2"
          />
          <path
            d={results.map((r, i) => `${i ? "L" : "M"}${sxS(r.sigmaV0Eff).toFixed(1)},${Y(r.depth).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={IMMEDIATE}
            strokeWidth="1.6"
            strokeDasharray="5 3"
          />
          {results.map((r, i) => (
            <circle key={i} cx={sxS(r.sigmaV0Eff)} cy={Y(r.depth)} r="3" fill={IMMEDIATE} stroke="#ffffff" />
          ))}
          <text x={stressR} y={chartBottom + 14} textAnchor="end" fontSize="9.5" fill={INK_2}>
            — Δσ · - - σ′v0
          </text>

          {/* settlement bars */}
          <text x={(barL + barR) / 2} y={top - 26} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK}>
            Settlement by layer (mm)
          </text>
          <line x1={barL} x2={barL} y1={chartTop} y2={chartBottom} stroke="#94a3b8" />
          {layers.map((l, i) => {
            const r = settleMm[i];
            if (!r) return null;
            const y0 = Y(l.top) + 3;
            const h = Math.max(Y(l.bottom) - Y(l.top) - 6, 4);
            return (
              <g key={i}>
                <rect x={barL} y={y0} width={Math.max(sxB(r.imm) - barL, 0)} height={h} fill={IMMEDIATE} rx="2" />
                <rect x={sxB(r.imm) + (r.imm > 0 ? 2 : 0)} y={y0} width={Math.max(sxB(r.imm + r.con) - sxB(r.imm) - 2, 0)} height={h} fill={CONSOLIDATION} rx="2" />
                {h > 10 ? (
                  <text x={Math.min(sxB(r.imm + r.con) + 4, barR - 2)} y={y0 + h / 2 + 3.5} fontSize="9.5" fontWeight="600" fill={INK} textAnchor={sxB(r.imm + r.con) + 30 > barR ? "end" : "start"}>
                    {(r.imm + r.con).toFixed(1)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
