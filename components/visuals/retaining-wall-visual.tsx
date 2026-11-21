"use client";

import { useId } from "react";

import { SoilPatternDefs, SvgScript } from "@/components/pile/pile-shared";
import { computeRetainingWall, readRetainingWall, type RetainingWallResult } from "@/lib/design-tools/retaining-wall";
import { convertInputToMetric, convertMetricToDisplay, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

const INK = "#0f172a";
const INK_2 = "#475569";
/** Validated categorical slots: earth = blue, surcharge = aqua-ish, seismic = orange. */
const EARTH = "#2a78d6";
const SURCH = "#1baf7a";
const SEISMIC = "#eb6834";
const BASE_P = "#7c3aed";

const LENGTH_KEYS = ["height", "stemTop", "stemBottom", "baseWidth", "toeLength", "baseThickness", "frontDepth"];
const STRESS_KEYS = ["surcharge", "cF", "qAllow"];
const WEIGHT_KEYS = ["gammaConcrete", "gamma", "gammaF"];

/** Form values (display units) → SI strings for the engine. */
function toMetric(values: Record<string, string>, unitSystem: UnitSystem): Record<string, string> {
  if (unitSystem === "metric") return values;
  const out = { ...values };
  for (const k of LENGTH_KEYS) out[k] = String(convertInputToMetric(Number(values[k]), "m", unitSystem));
  for (const k of STRESS_KEYS) out[k] = String(convertInputToMetric(Number(values[k]), "kPa", unitSystem));
  for (const k of WEIGHT_KEYS) out[k] = String(convertInputToMetric(Number(values[k]), "kN/m3", unitSystem));
  return out;
}

export function RetainingWallVisual({ values, unitSystem }: { values: Record<string, string>; unitSystem: UnitSystem }) {
  const uid = useId().replace(/:/g, "");
  const lu = getDisplayUnit("m", unitSystem) ?? "m";
  const su = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const L = (m: number) => Number(convertMetricToDisplay(m, "m", unitSystem).toFixed(2));
  const S = (k: number) => Math.round(convertMetricToDisplay(k, "kPa", unitSystem));

  let r: RetainingWallResult | null = null;
  let error: string | null = null;
  try {
    r = computeRetainingWall(readRetainingWall(toMetric(values, unitSystem)));
  } catch (err) {
    error = err instanceof Error ? err.message : "Check the inputs.";
  }

  if (!r) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        The wall cannot be drawn yet: {error}
      </div>
    );
  }

  const i = r.input;
  const tanB = Math.tan((i.slope * Math.PI) / 180);
  // World bounds (m): x from the toe, y up from the base underside.
  const xMin = -Math.max(0.55 * i.H, 1.2);
  const xMax = i.B + Math.max(0.9 * i.H, 2);
  const pressMax = i.gamma * r.Hv * r.Ka + i.surcharge * r.Ka + (r.Kae ? i.gamma * r.Hv * Math.max((1 - i.kv) * r.Kae - r.Ka, 0) * 1.2 : 0);
  const yMin = -Math.max(0.42 * i.H, 1.4);
  const yMax = Math.max(r.Hv, i.H + (xMax - r.xs) * tanB) + Math.max(0.28 * i.H, 1);
  const W = 640;
  const s = Math.min((W - 40) / (xMax - xMin), 470 / (yMax - yMin));
  const H = (yMax - yMin) * s + 20;
  const X = (x: number) => 20 + (x - xMin) * s;
  const Y = (y: number) => 10 + (yMax - y) * s;
  const pScale = (Math.max(0.55 * i.H, 1.4) * s) / Math.max(pressMax, 1); // px per kPa for the pressure diagram
  const qScale = (Math.max(0.36 * i.H, 1.2) * s) / Math.max(r.qMax, 1);

  const backfillTop = (x: number) => (x <= r!.xs ? i.H : i.H + (x - r!.xs) * tanB);
  const wall =
    i.wallType === "cantilever"
      ? `M${X(i.toe)},${Y(i.tBase)} L${X(r.xs - i.tTop)},${Y(i.H)} L${X(r.xs)},${Y(i.H)} L${X(r.xs)},${Y(i.tBase)} Z`
      : `M${X(i.toe)},${Y(i.tBase)} L${X(i.toe)},${Y(i.H)} L${X(i.toe + i.tTop)},${Y(i.H)} L${X(r.xs)},${Y(i.tBase)} Z`;
  const backfill = `M${X(i.wallType === "cantilever" ? r.xs : i.toe + i.tTop)},${Y(i.H)} ${
    i.wallType === "gravity" ? `L${X(r.xs)},${Y(i.tBase)}` : `L${X(r.xs)},${Y(i.tBase)}`
  } L${X(i.B)},${Y(i.tBase)} L${X(i.B)},${Y(0)} L${X(xMax)},${Y(0)} L${X(xMax)},${Y(backfillTop(xMax))} L${X(r.xs)},${Y(i.H)} Z`;
  const front = `M${X(xMin)},${Y(Math.max(i.D, 0))} L${X(i.toe)},${Y(Math.max(i.D, 0))} L${X(i.toe)},${Y(i.tBase)} L${X(0)},${Y(i.tBase)} L${X(0)},${Y(0)} L${X(xMin)},${Y(0)} Z`;

  // Pressure diagram on the virtual back (x = B), drawn outward to the right.
  const xb = X(i.B);
  const pa = i.gamma * r.Hv * r.Ka;
  const pq = i.surcharge * r.Ka;
  const pe = r.Kae ? i.gamma * r.Hv * Math.max((1 - i.kv) * r.Kae - r.Ka, 0) : 0;
  const yTop = Y(r.Hv);
  const yBot = Y(0);

  // Base pressure (toe → heel when e ≥ 0).
  const toeSide = r.e >= 0;
  const contact = r.qMin > 0 ? i.B : 3 * (i.B / 2 - Math.abs(r.e));
  const qToe = toeSide ? r.qMax : r.qMin;
  const qHeel = toeSide ? r.qMin : r.qMax;
  const basePoly =
    r.qMin > 0
      ? `M${X(0)},${Y(0)} L${X(0)},${Y(0) + qToe * qScale} L${X(i.B)},${Y(0) + qHeel * qScale} L${X(i.B)},${Y(0)} Z`
      : toeSide
        ? `M${X(0)},${Y(0)} L${X(0)},${Y(0) + r.qMax * qScale} L${X(contact)},${Y(0)} Z`
        : `M${X(i.B)},${Y(0)} L${X(i.B)},${Y(0) + r.qMax * qScale} L${X(i.B - contact)},${Y(0)} Z`;
  const xRes = i.B / 2 - r.e;
  const band = r.criteria.eLimitRatio;
  const okAll = r.checks.every((c) => c.ok);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Retaining wall</p>
          <p className="text-xs text-slate-600">Drawn to scale · checks update as you type · per metre run</p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-sm font-semibold text-white ${okAll ? "bg-emerald-700" : "bg-red-700"}`}>
          {okAll ? "All checks OK" : `${r.checks.filter((c) => !c.ok).length} check(s) fail`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
        {r.checks.map((c) => (
          <span
            key={c.name}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              c.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span aria-hidden="true">{c.ok ? "✓" : "✗"}</span>
            {c.name.replace(" = q_ult / q_max", "")} {c.value.toFixed(2)} {c.sense === "min" ? "≥" : "≤"} {c.required.toFixed(2)}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Retaining wall section with earth pressure and base pressure">
        <defs>
          <SoilPatternDefs prefix={uid} />
          <marker id={`${uid}-a`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill={INK} />
          </marker>
          <marker id={`${uid}-d`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill={INK_2} />
          </marker>
          <pattern id={`${uid}-seis`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={SEISMIC} strokeWidth="2" opacity="0.6" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="#f8fafc" />
        {/* foundation soil */}
        <rect x={X(xMin)} y={Y(0)} width={X(xMax) - X(xMin)} height={Y(yMin) - Y(0)} fill={`url(#${uid}-${i.phiF >= 15 ? "sand" : "clay"})`} />
        {/* backfill and front soil */}
        <path d={backfill} fill={`url(#${uid}-silty-sand)`} />
        {i.D > 0 ? <path d={front} fill={`url(#${uid}-silty-sand)`} /> : null}
        <path d={`M${X(r.xs)},${Y(i.H)} L${X(xMax)},${Y(backfillTop(xMax))}`} stroke="#3f3a33" strokeWidth="1.8" fill="none" />
        {i.D > 0 ? <line x1={X(xMin)} x2={X(i.toe)} y1={Y(i.D)} y2={Y(i.D)} stroke="#3f3a33" strokeWidth="1.8" /> : null}

        {/* wall */}
        <rect x={X(0)} y={Y(i.tBase)} width={i.B * s} height={i.tBase * s} fill="#cbd5e1" stroke={INK} strokeWidth="1.3" />
        <path d={wall} fill="#cbd5e1" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />

        {/* surcharge */}
        {i.surcharge > 0
          ? Array.from({ length: 7 }, (_, k) => r!.xs + 0.25 + ((xMax - r!.xs - 0.5) * k) / 6).map((x) => (
              <line key={x} x1={X(x)} x2={X(x)} y1={Y(backfillTop(x)) - 24} y2={Y(backfillTop(x)) - 3} stroke={SURCH} strokeWidth="1.6" markerEnd={`url(#${uid}-a)`} />
            ))
          : null}
        {i.surcharge > 0 ? (
          <text x={X((r.xs + xMax) / 2)} y={Y(backfillTop((r.xs + xMax) / 2)) - 29} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
            q = {S(i.surcharge)} {su}
          </text>
        ) : null}

        {/* virtual back and pressure diagrams */}
        <line x1={xb} x2={xb} y1={yTop} y2={yBot} stroke={INK_2} strokeDasharray="4 3" />
        <path d={`M${xb},${yTop} L${xb + pa * pScale},${yBot} L${xb},${yBot} Z`} fill={EARTH} fillOpacity="0.28" stroke={EARTH} strokeWidth="1.3" />
        {pq > 0 ? (
          <path d={`M${xb + pa * pScale},${yBot} L${xb},${yTop} L${xb + pq * pScale},${yTop} L${xb + (pa + pq) * pScale},${yBot} Z`} fill={SURCH} fillOpacity="0.25" stroke={SURCH} strokeWidth="1.1" />
        ) : null}
        {pe > 0 ? (
          <path d={`M${xb + (pa + pq) * pScale},${yBot} L${xb + pq * pScale},${yTop} L${xb + (pq + pe) * pScale},${yTop} L${xb + (pa + pq) * pScale},${yBot} Z`} fill={`url(#${uid}-seis)`} stroke={SEISMIC} strokeWidth="1.1" />
        ) : null}
        <text x={xb + (pa + pq) * pScale + 6} y={yBot - 4} fontSize="10.5" fontWeight="700" fill={INK}>
          {S(pa + pq)} {su}
        </text>
        <line x1={xb + 46} x2={xb + 3} y1={Y(r.Hv / 3)} y2={Y(r.Hv / 3)} stroke={EARTH} strokeWidth="2.2" markerEnd={`url(#${uid}-a)`} />
        <text x={xb + 50} y={Y(r.Hv / 3) + 4} fontSize="10.5" fontWeight="700" fill={INK}>
          <SvgScript text={`P_a ${Math.round(r.forces.find((f) => f.kind === "earth")?.h ?? 0)} kN/m`} />
        </text>

        {/* passive at the toe */}
        {i.passive && i.D > 0 ? (
          <path d={`M${X(0)},${Y(i.D)} L${X(0) - Math.min(i.gammaF * i.D * r.Kp * pScale * 0.5, 60)},${Y(0)} L${X(0)},${Y(0)} Z`} fill="#10b981" fillOpacity="0.25" stroke="#059669" />
        ) : null}

        {/* base pressure */}
        <path d={basePoly} fill={BASE_P} fillOpacity="0.18" stroke={BASE_P} strokeWidth="1.2" />
        <text x={X(toeSide ? 0 : i.B) + (toeSide ? -4 : 4)} y={Y(0) + r.qMax * qScale + 12} textAnchor={toeSide ? "end" : "start"} fontSize="10.5" fontWeight="700" fill={INK}>
          <SvgScript text={`q_max ${S(r.qMax)} ${su}`} />
        </text>
        {r.qMin > 0 ? (
          <text x={X(toeSide ? i.B : 0) + (toeSide ? 4 : -4)} y={Y(0) + r.qMin * qScale + 12} textAnchor={toeSide ? "start" : "end"} fontSize="10" fill={INK_2}>
            <SvgScript text={`q_min ${S(r.qMin)}`} />
          </text>
        ) : null}
        {/* middle-third band and resultant */}
        <rect x={X(i.B / 2 - band * i.B)} y={Y(0) - 3} width={2 * band * i.B * s} height="6" fill={r.checks[2].ok ? "#10b981" : "#ef4444"} opacity="0.55" />
        <line x1={X(xRes)} x2={X(xRes)} y1={Y(i.tBase) - 26} y2={Y(0) - 2} stroke={INK} strokeWidth="2" markerEnd={`url(#${uid}-a)`} />
        <text x={X(xRes) + 6} y={Y(i.tBase) - 16} fontSize="10.5" fontWeight="700" fill={INK}>
          R · e = {L(r.e)} {lu}
        </text>

        {/* dimensions */}
        <line x1={X(xMin) + 14} x2={X(xMin) + 14} y1={Y(0)} y2={Y(i.H)} stroke={INK_2} markerStart={`url(#${uid}-d)`} markerEnd={`url(#${uid}-d)`} />
        <text x={X(xMin) + 18} y={Y(i.H / 2)} fontSize="10.5" fontWeight="700" fill={INK}>
          H = {L(i.H)} {lu}
        </text>
        <line x1={X(0)} x2={X(i.B)} y1={Y(yMin) - 10} y2={Y(yMin) - 10} stroke={INK_2} markerStart={`url(#${uid}-d)`} markerEnd={`url(#${uid}-d)`} />
        <text x={X(i.B / 2)} y={Y(yMin) - 14} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK}>
          B = {L(i.B)} {lu} (toe {L(i.toe)} · heel {L(r.heel)})
        </text>
        <text x={X(r.xs - i.tTop / 2)} y={Y(i.H) - 6} textAnchor="middle" fontSize="10" fill={INK_2}>
          {L(i.tTop)}
        </text>
        <text x={X(r.xs + r.heel / 2)} y={Y(i.tBase) + i.tBase * s * 0.5 + 4} textAnchor="middle" fontSize="10" fill={INK}>
          base {L(i.tBase)}
        </text>
        {i.slope > 0 ? (
          <text x={X(xMax) - 6} y={Y(backfillTop(xMax)) + 14} textAnchor="end" fontSize="10.5" fontWeight="600" fill={INK}>
            β = {i.slope}°
          </text>
        ) : null}
        {i.seismic ? (
          <g>
            <line x1={X(xMin) + 50} x2={X(xMin) + 18} y1={Y(yMax) + 18} y2={Y(yMax) + 18} stroke={SEISMIC} strokeWidth="2.2" markerEnd={`url(#${uid}-a)`} />
            <text x={X(xMin) + 56} y={Y(yMax) + 22} fontSize="10.5" fontWeight="700" fill={SEISMIC}>
              <SvgScript text={`k_h = ${i.kh}, k_v = ${i.kv} · K_AE ${r.Kae?.toFixed(3)}`} />
            </text>
          </g>
        ) : null}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EARTH, opacity: 0.6 }} /> Active earth pressure (K_a {r.Ka.toFixed(3)})</span>
        {pq > 0 ? <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SURCH, opacity: 0.6 }} /> Surcharge</span> : null}
        {pe > 0 ? <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SEISMIC, opacity: 0.6 }} /> Seismic increment</span> : null}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BASE_P, opacity: 0.5 }} /> Base pressure</span>
        <span>Band under the base: allowed zone for the resultant (|e| ≤ B/{band === 0.25 ? 4 : 6})</span>
      </div>
    </div>
  );
}
