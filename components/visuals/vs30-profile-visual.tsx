"use client";

import { useId } from "react";

import { SvgScript } from "@/components/pile/pile-shared";
import { computeVs30 } from "@/lib/design-tools/shear-wave-velocity";
import { convertInputToMetric, convertMetricToDisplay, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

const INK = "#0f172a";
const INK_2 = "#475569";

/** TBDY 2018 Table 16.1 classes by V_s,30 (m/s). */
const CLASSES = [
  { id: "ZE", from: 0, to: 180, fill: "#ef4444" },
  { id: "ZD", from: 180, to: 360, fill: "#f59e0b" },
  { id: "ZC", from: 360, to: 760, fill: "#22c55e" },
  { id: "ZB", from: 760, to: 1500, fill: "#3b82f6" },
  { id: "ZA", from: 1500, to: Infinity, fill: "#64748b" },
];

/** Sequential single-hue ramp for V_s (light = soft, dark = stiff). */
function vsFill(vs: number): string {
  const t = Math.min(Math.max(Math.log(Math.max(vs, 80) / 80) / Math.log(1600 / 80), 0), 1);
  const from = [224, 236, 249];
  const to = [30, 64, 120];
  const mix = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${mix.join(",")})`;
}

function fmt(v: number, d = 0): string {
  return Number(v.toFixed(d)).toLocaleString("en-US");
}

export function Vs30ProfileVisual({ values, unitSystem }: { values: Record<string, string>; unitSystem: UnitSystem }) {
  const uid = useId().replace(/:/g, "");
  const lenUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const velUnit = getDisplayUnit("m/s", unitSystem) ?? "m/s";

  const layers: Array<{ thickness: number; vs: number; k: number }> = [];
  for (let k = 1; k <= 6; k += 1) {
    const h = convertInputToMetric(Number(values[`layer${k}Thickness`] ?? 0), "m", unitSystem);
    const vs = convertInputToMetric(Number(values[`layer${k}Vs`] ?? 0), "m/s", unitSystem);
    if (Number.isFinite(h) && h > 0 && Number.isFinite(vs) && vs > 0) layers.push({ thickness: h, vs, k });
  }
  const softClay = convertInputToMetric(Number(values.softClayThickness ?? 0), "m", unitSystem);

  if (!layers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Enter at least one layer with a thickness and V<sub>s</sub> to draw the profile.
      </div>
    );
  }

  const r = computeVs30(layers);
  const tbdy = softClay > 3 ? "ZE" : r.tbdy;
  const total = layers.reduce((s, l) => s + l.thickness, 0);
  const maxDepth = Math.max(30, total) * 1.04;
  const travel = r.used.map((u) => u.thickness / u.vs);
  const travelTotal = travel.reduce((s, t) => s + t, 0);

  const W = 680;
  const H = 420;
  const top = 46;
  const bottom = H - 22;
  const y = (z: number) => top + (z / maxDepth) * (bottom - top);
  const colL = 56;
  const colR = 236;
  const plotL = 300;
  const plotR = W - 18;
  const maxVs = Math.max(800, ...layers.map((l) => l.vs)) * 1.12;
  const vsMax = Math.ceil(maxVs / 200) * 200;
  const x = (vs: number) => plotL + (Math.min(vs, vsMax) / vsMax) * (plotR - plotL);

  // Layer stack (as entered), last layer extended to 30 m when the profile is shallower.
  let cursor = 0;
  const stack = layers.map((l, i) => {
    const t = cursor;
    cursor += l.thickness;
    return { ...l, top: t, bottom: i === layers.length - 1 ? Math.max(cursor, 30) : cursor, extended: i === layers.length - 1 && cursor < 30 ? cursor : null };
  });
  const step = stack
    .map((l, i) => `${i === 0 ? "M" : "L"}${x(l.vs).toFixed(1)},${y(l.top).toFixed(1)} L${x(l.vs).toFixed(1)},${y(Math.min(l.bottom, maxDepth)).toFixed(1)}`)
    .join(" ");

  const depthTicks: number[] = [];
  for (let d = 0; d <= maxDepth; d += 5) depthTicks.push(d);
  const vsTicks: number[] = [];
  for (let v = 0; v <= vsMax; v += vsMax > 1200 ? 400 : 200) vsTicks.push(v);
  const dispLen = (m: number) => convertMetricToDisplay(m, "m", unitSystem);
  const dispVel = (v: number) => convertMetricToDisplay(v, "m/s", unitSystem);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Shear-wave velocity profile</p>
          <p className="text-xs text-slate-600">Updates as you type · top 30 m used for V<sub>s,30</sub></p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold tabular-nums text-white">
            V<sub>s,30</sub> = {fmt(dispVel(r.vs30))} {velUnit}
          </span>
          <span className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900">
            TBDY {tbdy} · EC8 {r.ec8}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[560px]" role="img" aria-label="Shear-wave velocity profile and site class">
          <defs>
            <pattern id={`${uid}-ext`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#ffffff" strokeWidth="2.5" opacity="0.55" />
            </pattern>
          </defs>

          {/* depth axis */}
          {depthTicks.map((d) => (
            <g key={d}>
              <line x1={colL - 4} x2={plotR} y1={y(d)} y2={y(d)} stroke="#e2e8f0" strokeWidth="0.7" />
              <text x={colL - 8} y={y(d) + 3.5} textAnchor="end" fontSize="10.5" fill={INK_2}>
                {fmt(dispLen(d))}
              </text>
            </g>
          ))}
          <text x="14" y={(top + bottom) / 2} textAnchor="middle" fontSize="11" fontWeight="600" fill={INK_2} transform={`rotate(-90 14 ${(top + bottom) / 2})`}>
            Depth ({lenUnit})
          </text>

          {/* layer column */}
          {stack.map((l) => (
            <g key={l.k}>
              <rect x={colL} y={y(l.top)} width={colR - colL} height={Math.max(y(Math.min(l.bottom, maxDepth)) - y(l.top), 0)} fill={vsFill(l.vs)} stroke="#ffffff" strokeWidth="1.5" />
              {l.extended !== null ? (
                <rect x={colL} y={y(l.extended)} width={colR - colL} height={y(30) - y(l.extended)} fill={`url(#${uid}-ext)`} />
              ) : null}
              {y(Math.min(l.bottom, maxDepth)) - y(l.top) > 22 ? (
                <text
                  x={(colL + colR) / 2}
                  y={(y(l.top) + y(Math.min(l.bottom, 30))) / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={l.vs > 420 ? "#ffffff" : INK}
                >
                  <SvgScript text={`L${l.k} · V_s ${fmt(dispVel(l.vs))}`} />
                </text>
              ) : null}
            </g>
          ))}
          {stack.at(-1)?.extended != null ? (
            <text x={(colL + colR) / 2} y={y(30) - 6} textAnchor="middle" fontSize="9.5" fill={INK} fontStyle="italic">
              extended to 30 m
            </text>
          ) : null}
          {total > 30 ? <rect x={colL} y={y(30)} width={colR - colL} height={y(Math.min(total, maxDepth)) - y(30)} fill="#ffffff" opacity="0.6" /> : null}
          <line x1={colL - 4} x2={plotR} y1={y(30)} y2={y(30)} stroke={INK} strokeWidth="1.4" strokeDasharray="6 3" />
          <text x={colR + 6} y={y(30) - 4} fontSize="10" fontWeight="700" fill={INK}>
            30 m
          </text>
          {softClay > 3 ? (
            <text x={colL} y={top - 10} fontSize="10" fontWeight="600" fill="#b91c1c">
              Soft clay {fmt(softClay, 1)} m &gt; 3 m → ZE
            </text>
          ) : null}

          {/* class bands */}
          {CLASSES.map((cl) => {
            const x1 = x(cl.from);
            const x2 = x(Math.min(cl.to, vsMax));
            if (x2 <= x1) return null;
            return (
              <g key={cl.id}>
                <rect x={x1} y={top} width={x2 - x1} height={bottom - top} fill={cl.fill} opacity={cl.id === tbdy ? 0.16 : 0.07} />
                <text x={(x1 + x2) / 2} y={top - 8} textAnchor="middle" fontSize="10.5" fontWeight={cl.id === tbdy ? 800 : 600} fill={cl.id === tbdy ? INK : INK_2}>
                  {cl.id}
                </text>
              </g>
            );
          })}
          {vsTicks.map((v) => (
            <text key={v} x={x(v)} y={bottom + 14} textAnchor="middle" fontSize="10" fill={INK_2}>
              {fmt(dispVel(v))}
            </text>
          ))}
          <line x1={plotL} x2={plotL} y1={top} y2={bottom} stroke="#94a3b8" />
          <line x1={plotL} x2={plotR} y1={bottom} y2={bottom} stroke="#94a3b8" />

          {/* V_s step profile and V_s,30 */}
          <path d={step} fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <line x1={x(r.vs30)} x2={x(r.vs30)} y1={top} y2={y(30)} stroke="#b91c1c" strokeWidth="1.8" strokeDasharray="6 4" />
          <rect x={x(r.vs30) + 5} y={y(30) - 40} width="104" height="18" rx="5" fill="#b91c1c" />
          <text x={x(r.vs30) + 57} y={y(30) - 27} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">
            <SvgScript text={`V_s,30 ${fmt(dispVel(r.vs30))} ${velUnit}`} />
          </text>
        </svg>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">Share of the 30 m travel time</p>
        <div className="mt-2 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
          {r.used.map((u, i) => (
            <div key={i} className="h-full" style={{ width: `${(travel[i] / travelTotal) * 100}%`, backgroundColor: vsFill(u.vs) }} title={`L${i + 1}: ${fmt((travel[i] / travelTotal) * 100)}%`} />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
          {r.used.map((u, i) => (
            <span key={i} className="tabular-nums">
              L{i + 1}: {fmt(dispLen(u.thickness), 1)} {lenUnit} → {fmt((travel[i] / travelTotal) * 100)}%
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">
          V<sub>s,30</sub> = 30 / Σ(h<sub>i</sub>/V<sub>s,i</sub>) is a harmonic average: slow layers dominate, so a thin soft layer near
          the surface can lower the class more than a thick stiff layer raises it.
        </p>
      </div>
    </div>
  );
}
