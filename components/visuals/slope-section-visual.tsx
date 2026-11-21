"use client";

import { useId } from "react";

import { SoilPatternDefs, SvgScript } from "@/components/pile/pile-shared";
import { getDisplayUnit } from "@/lib/tool-units";
import type { CalculationResult, UnitSystem } from "@/lib/types";

const INK = "#0f172a";
const INK_2 = "#475569";
const WATER = "#2563eb";

function n(v: string | undefined, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function item(result: CalculationResult | null, prefix: string): number | null {
  const it = result?.items.find((i) => i.label.startsWith(prefix));
  const v = it ? Number(it.value) : Number.NaN;
  return Number.isFinite(v) ? v : null;
}

/**
 * Slope cross-section drawn from the inputs (geometry, strata, water, surcharge) with the critical Bishop circle,
 * sliding mass and slices once a calculation has run. Coordinates follow the engine: crest edge at x = 0 (y = H),
 * toe at x = H / tan β (y = 0).
 */
export function SlopeSectionVisual({
  values,
  unitSystem,
  result,
}: {
  values: Record<string, string>;
  unitSystem: UnitSystem;
  result: CalculationResult | null;
}) {
  const uid = useId().replace(/:/g, "");
  const lenUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const mode = values.analysisMode === "infinite" ? "infinite" : "bishop";
  const H = Math.max(n(values.height, 10), 1);
  const betaDeg = Math.min(Math.max(n(values.slopeAngle, 26.57), 5), 80);
  const L = H / Math.tan((betaDeg * Math.PI) / 180);
  const twoLayers = values.stratification === "two";
  const yi = n(values.interfaceElevation, 0);
  const water = values.waterMode ?? "none";
  const yw = n(values.phreaticElevation, 0);
  const surcharge = n(values.surcharge, 0);
  const target = n(values.targetFs, 1.5);
  const searchDepth = Math.max(n(values.maxDepthBelowToe, 10), 0);

  const xc = mode === "bishop" ? item(result, "Critical centre x_c") : null;
  const yc = mode === "bishop" ? item(result, "Critical centre y_c") : null;
  const R = mode === "bishop" ? item(result, "Radius R") : null;
  const fs = mode === "bishop" ? item(result, "Minimum factor of safety") : item(result, "Factor of safety");
  const hasCircle = xc !== null && yc !== null && R !== null;

  // World bounds (m or ft as entered).
  const xMin = Math.min(-0.9 * H, hasCircle ? xc! - R! * 0.15 : 0);
  const xMax = Math.max(L + 0.9 * H, hasCircle ? xc! + R! * 0.15 : 0);
  const yMin = -Math.max(searchDepth, 0.25 * H);
  const yMax = hasCircle ? Math.max(H * 1.25, yc! + H * 0.12) : H * 1.35;
  const W = 680;
  const sx = (W - 60) / (xMax - xMin);
  const Hpx = Math.min(Math.max((yMax - yMin) * sx + 30, 260), 520);
  const s = Math.min(sx, (Hpx - 30) / (yMax - yMin));
  const ox = 40 + ((W - 60) - (xMax - xMin) * s) / 2;
  const X = (x: number) => ox + (x - xMin) * s;
  const Y = (y: number) => 14 + (yMax - y) * s;

  const ground = `M${X(xMin)},${Y(H)} L${X(0)},${Y(H)} L${X(L)},${Y(0)} L${X(xMax)},${Y(0)} L${X(xMax)},${Y(yMin)} L${X(xMin)},${Y(yMin)} Z`;
  const groundY = (x: number) => (x <= 0 ? H : x >= L ? 0 : H * (1 - x / L));

  // Sliding mass outline and slices.
  let massPath = "";
  const slices: Array<{ x: number; yb: number; yt: number }> = [];
  if (hasCircle) {
    const pts: Array<[number, number]> = [];
    const steps = 80;
    let xEntry: number | null = null;
    let xExit: number | null = null;
    for (let i = 0; i <= steps; i += 1) {
      const x = xc! - R! + (2 * R! * i) / steps;
      const yb = yc! - Math.sqrt(Math.max(R! ** 2 - (x - xc!) ** 2, 0));
      if (yb < groundY(x)) {
        if (xEntry === null) xEntry = x;
        xExit = x;
        pts.push([x, yb]);
      }
    }
    if (xEntry !== null && xExit !== null) {
      const top: Array<[number, number]> = [];
      for (let i = 0; i <= 40; i += 1) {
        const x = xExit - ((xExit - xEntry) * i) / 40;
        top.push([x, groundY(x)]);
      }
      massPath = `M${[...pts, ...top].map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" L")} Z`;
      for (let k = 1; k < 12; k += 1) {
        const x = xEntry + ((xExit - xEntry) * k) / 12;
        slices.push({ x, yb: yc! - Math.sqrt(Math.max(R! ** 2 - (x - xc!) ** 2, 0)), yt: groundY(x) });
      }
    }
  }
  const ok = fs !== null && fs >= target;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Slope section</p>
          <p className="text-xs text-slate-600">
            {mode === "bishop"
              ? hasCircle
                ? "Critical circle from the last calculation; geometry updates as you type"
                : "Geometry updates as you type · run the calculation to draw the critical circle"
              : "Infinite slope: slip plane parallel to the surface"}
          </p>
        </div>
        {fs !== null ? (
          <span className={`rounded-lg px-3 py-1 text-sm font-semibold tabular-nums text-white ${ok ? "bg-emerald-700" : "bg-red-700"}`}>
            FS = {fs.toFixed(3)} {ok ? "≥" : "<"} {target}
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${Hpx}`} className="h-auto w-full min-w-[560px]" role="img" aria-label="Slope cross-section with critical slip surface">
          <defs>
            <SoilPatternDefs prefix={uid} />
            <clipPath id={`${uid}-soil`}>
              <path d={ground} />
            </clipPath>
            <marker id={`${uid}-arr`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill={INK} />
            </marker>
          </defs>
          <rect x="0" y="0" width={W} height={Hpx} fill="#f8fafc" />

          <g clipPath={`url(#${uid}-soil)`}>
            <rect x="0" y="0" width={W} height={Hpx} fill={`url(#${uid}-${n(values.phi1, 20) >= 15 ? "silty-sand" : "clay"})`} />
            {twoLayers ? <rect x="0" y={Y(yi)} width={W} height={Hpx} fill={`url(#${uid}-${n(values.phi2, 25) >= 15 ? "sand" : "silty-clay"})`} /> : null}
            {water === "phreatic" ? <rect x="0" y={Y(yw)} width={W} height={Hpx} fill={WATER} opacity="0.1" /> : null}
            {massPath ? <path d={massPath} fill="#dc2626" fillOpacity="0.16" /> : null}
            {slices.map((sl, i) => (
              <line key={i} x1={X(sl.x)} x2={X(sl.x)} y1={Y(sl.yb)} y2={Y(sl.yt)} stroke="#b91c1c" strokeWidth="0.8" opacity="0.6" />
            ))}
          </g>
          <path d={ground} fill="none" stroke="#3f3a33" strokeWidth="1.8" />
          {twoLayers ? (
            <g>
              <line x1={X(xMin)} x2={X(xMax)} y1={Y(yi)} y2={Y(yi)} stroke="#5b4630" strokeWidth="1" strokeDasharray="5 3" />
              <text x={X(xMax) - 6} y={Y(yi) + 13} textAnchor="end" fontSize="10" fill={INK}>
                lower stratum
              </text>
            </g>
          ) : null}
          {water === "phreatic" ? (
            <g>
              <line x1={X(xMin)} x2={X(xMax)} y1={Y(yw)} y2={Y(yw)} stroke={WATER} strokeWidth="1.4" strokeDasharray="6 4" />
              <text x={X(xMin) + 6} y={Y(yw) - 5} fontSize="10" fontWeight="600" fill={WATER}>
                phreatic surface
              </text>
            </g>
          ) : null}

          {/* surcharge */}
          {surcharge > 0
            ? Array.from({ length: 7 }, (_, i) => xMin + ((0 - xMin) * (i + 0.5)) / 7).map((x) => (
                <line key={x} x1={X(x)} x2={X(x)} y1={Y(H) - 20} y2={Y(H) - 3} stroke={INK} strokeWidth="1.2" markerEnd={`url(#${uid}-arr)`} />
              ))
            : null}
          {surcharge > 0 ? (
            <text x={X(xMin / 2)} y={Y(H) - 24} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={INK}>
              q = {surcharge} kPa
            </text>
          ) : null}

          {/* geometry labels */}
          <line x1={X(L) + 18} x2={X(L) + 18} y1={Y(H)} y2={Y(0)} stroke={INK_2} strokeDasharray="2 3" />
          <text x={X(L) + 23} y={(Y(H) + Y(0)) / 2} fontSize="10.5" fontWeight="700" fill={INK}>
            H = {H} {lenUnit}
          </text>
          <text x={X(L) + 8} y={Y(0) + 15} fontSize="10.5" fontWeight="700" fill={INK}>
            β = {betaDeg}°
          </text>

          {/* infinite slope */}
          {mode === "infinite" ? (
            (() => {
              const z = Math.max(n(values.slipDepth, 2), 0.1);
              const dz = z / Math.cos((betaDeg * Math.PI) / 180);
              return (
                <g>
                  <line x1={X(0)} y1={Y(H - dz)} x2={X(L)} y2={Y(-dz)} stroke="#b91c1c" strokeWidth="2.2" strokeDasharray="7 3" />
                  <text x={X(L / 2) + 8} y={Y(H / 2 - dz) + 16} fontSize="10.5" fontWeight="600" fill="#b91c1c">
                    slip plane at z = {z} {lenUnit}
                  </text>
                </g>
              );
            })()
          ) : null}

          {/* critical circle */}
          {hasCircle ? (
            <g>
              <circle cx={X(xc!)} cy={Y(yc!)} r={R! * s} fill="none" stroke="#b91c1c" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.45" />
              <g clipPath={`url(#${uid}-soil)`}>
                <circle cx={X(xc!)} cy={Y(yc!)} r={R! * s} fill="none" stroke="#b91c1c" strokeWidth="2.4" />
              </g>
              <circle cx={X(xc!)} cy={Y(yc!)} r="4" fill="#b91c1c" />
              <text x={X(xc!) + 8} y={Y(yc!) - 6} fontSize="10.5" fontWeight="700" fill={INK}>
                <SvgScript text={`centre (${xc}, ${yc}) · R = ${R} ${lenUnit}`} />
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
