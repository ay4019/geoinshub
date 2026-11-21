"use client";

import { useId } from "react";

import { SoilPatternDefs, SvgScript } from "@/components/pile/pile-shared";
import { getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface BearingCapacityVisualProps {
  values: Record<string, string>;
  unitSystem: UnitSystem;
  title?: string;
}

const INK = "#0f172a";
const INK_2 = "#475569";
const WATER = "#2563eb";
const ZONE = {
  active: { fill: "#f59e0b", label: "I", name: "Active wedge" },
  radial: { fill: "#3b82f6", label: "II", name: "Radial shear (log-spiral)" },
  passive: { fill: "#10b981", label: "III", name: "Passive Rankine zone" },
};

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fmt(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString();
}

/**
 * General shear failure mechanism (Prandtl–Reissner, as used by Terzaghi/Meyerhof/Hansen/Vesić and EC7 Annex D),
 * drawn to scale from B, D_f and φ′:
 *   zone I  — active wedge under the base, sides at 45° + φ′/2 to the horizontal
 *   zone II — radial shear, bounded by the log-spiral r = r₀·exp(θ tan φ′) over 90°
 *   zone III — passive Rankine wedge, sides at 45° − φ′/2, emerging at base level
 * The soil above base level is replaced by the surcharge q = γ D_f. Updates live with the inputs.
 */
export function BearingCapacityVisual({ values, unitSystem, title }: BearingCapacityVisualProps) {
  const uid = useId().replace(/:/g, "");
  const method = values.method || (title?.toLowerCase().includes("eurocode") ? "eurocode 7" : "terzaghi");
  const methodLabel = method.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const B = Math.max(0.3, toNumber(values.width, 2));
  const L = Math.max(B, toNumber(values.length, 3));
  const Df = Math.max(0, toNumber(values.embedment, 1.2));
  const phi = Math.min(Math.max(toNumber(values.frictionAngle, 30), 0), 50);
  const c = Math.max(0, toNumber(values.cohesion, 10));
  const gamma = Math.max(0, toNumber(values.unitWeight, 18));
  const gwtRaw = toNumber(values.groundwaterDepth, 99);
  const lengthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";

  // Mechanism geometry in length units, x from the footing centre, z downward from base level.
  const rad = Math.PI / 180;
  const b = B / 2;
  const alpha = (45 + phi / 2) * rad;
  const beta = (45 - phi / 2) * rad;
  const tanPhi = Math.tan(phi * rad);
  const r0 = b / Math.cos(alpha);
  const r1 = r0 * Math.exp((Math.PI / 2) * tanPhi);
  const apexZ = b * Math.tan(alpha);
  const spiral: Array<{ x: number; z: number }> = [];
  const startAng = Math.PI - alpha; // direction from the footing edge to the apex
  for (let i = 0; i <= 48; i += 1) {
    const turn = (Math.PI / 2) * (i / 48);
    const ang = startAng - turn;
    const r = r0 * Math.exp(turn * tanPhi);
    spiral.push({ x: b + r * Math.cos(ang), z: r * Math.sin(ang) });
  }
  const C = spiral[spiral.length - 1];
  const dX = b + 2 * r1 * Math.cos(beta);
  const zMax = Math.max(apexZ, ...spiral.map((p) => p.z));
  const q = gamma * Df;

  // Scene scale.
  const W = 640;
  const H = 380;
  const pad = 28;
  const topY = 92; // ground surface
  const s = Math.min((W - 2 * pad) / (2 * dX * 1.06), (H - topY - 40) / (Df + zMax * 1.08 + 0.001));
  const cx = W / 2;
  const yBase = topY + Df * s;
  const X = (x: number) => cx + x * s;
  const Y = (z: number) => yBase + z * s;
  const gwtY = topY + gwtRaw * s;
  const showGwt = gwtRaw >= 0 && gwtY < H - 12;
  const gwtInZone = gwtRaw < Df + B;

  const spiralRight = spiral.map((p) => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(" L");
  const spiralLeft = spiral.map((p) => `${X(-p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(" L");
  const zoneI = `M${X(-b)},${Y(0)} L${X(b)},${Y(0)} L${X(0)},${Y(apexZ)} Z`;
  const zoneIIr = `M${X(b)},${Y(0)} L${spiralRight} Z`;
  const zoneIIl = `M${X(-b)},${Y(0)} L${spiralLeft} Z`;
  const zoneIIIr = `M${X(b)},${Y(0)} L${X(C.x)},${Y(C.z)} L${X(dX)},${Y(0)} Z`;
  const zoneIIIl = `M${X(-b)},${Y(0)} L${X(-C.x)},${Y(C.z)} L${X(-dX)},${Y(0)} Z`;
  const slipLine = `M${X(-dX)},${Y(0)} L${X(-C.x)},${Y(C.z)} L${[...spiral].reverse().map((p) => `${X(-p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(" L")} L${spiralRight} L${X(dX)},${Y(0)}`;

  const soilType = phi >= 20 || c < 5 ? "sand" : "clay";
  const footT = Math.min(Math.max(B * s * 0.18, 10), 26);
  const colW = Math.max(B * s * 0.28, 10);
  const arrowsX = Array.from({ length: 6 }, (_, i) => b + ((dX - b) * (i + 0.5)) / 6);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Failure mechanism</p>
          <p className="text-xs text-slate-600">General shear · {methodLabel} · drawn to scale, updates as you type</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-700">
          {Object.values(ZONE).map((z) => (
            <span key={z.label} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: z.fill, opacity: 0.55 }} />
              {z.label} {z.name}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Bearing capacity failure mechanism below the footing">
        <defs>
          <SoilPatternDefs prefix={uid} />
          <marker id={`${uid}-arr`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill={INK} />
          </marker>
          <marker id={`${uid}-dim`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill={INK_2} />
          </marker>
          <linearGradient id={`${uid}-sky`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f8fafc" />
            <stop offset="1" stopColor="#eef2f7" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={W} height={topY} fill={`url(#${uid}-sky)`} />
        <rect x="0" y={topY} width={W} height={H - topY} fill={`url(#${uid}-${soilType})`} />
        {showGwt ? <rect x="0" y={gwtY} width={W} height={H - gwtY} fill={WATER} opacity="0.07" /> : null}

        {/* mechanism */}
        <path d={zoneIIIl} fill={ZONE.passive.fill} fillOpacity="0.28" stroke={INK} strokeWidth="0.8" strokeOpacity="0.5" />
        <path d={zoneIIIr} fill={ZONE.passive.fill} fillOpacity="0.28" stroke={INK} strokeWidth="0.8" strokeOpacity="0.5" />
        <path d={zoneIIl} fill={ZONE.radial.fill} fillOpacity="0.22" stroke={INK} strokeWidth="0.8" strokeOpacity="0.5" />
        <path d={zoneIIr} fill={ZONE.radial.fill} fillOpacity="0.22" stroke={INK} strokeWidth="0.8" strokeOpacity="0.5" />
        <path d={zoneI} fill={ZONE.active.fill} fillOpacity="0.38" stroke={INK} strokeWidth="0.8" strokeOpacity="0.5" />
        <path d={slipLine} fill="none" stroke="#b91c1c" strokeWidth="2.2" strokeLinejoin="round" strokeDasharray="7 3" />

        {/* zone tags */}
        {[
          { x: 0, z: apexZ * 0.42, z0: ZONE.active },
          { x: (b + C.x) / 2 + r1 * 0.12, z: C.z * 0.62, z0: ZONE.radial },
          { x: -((b + C.x) / 2 + r1 * 0.12), z: C.z * 0.62, z0: ZONE.radial },
          { x: (C.x + dX) / 2, z: C.z * 0.32, z0: ZONE.passive },
          { x: -(C.x + dX) / 2, z: C.z * 0.32, z0: ZONE.passive },
        ].map((t, i) => (
          <g key={i}>
            <circle cx={X(t.x)} cy={Y(t.z)} r="9" fill="#ffffff" stroke={INK} strokeWidth="0.8" />
            <text x={X(t.x)} y={Y(t.z) + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={INK}>
              {t.z0.label}
            </text>
          </g>
        ))}

        {/* angle labels */}
        <text x={X(0) + 6} y={Y(apexZ) + 14} fontSize="10" fill={INK} fontWeight="600">
          <SvgScript text={`apex ${fmt(apexZ, 2)} ${lengthUnit} below base`} />
        </text>
        <text x={X(b) + 4} y={Y(0) + 13} fontSize="9.5" fill={INK_2}>
          {fmt(45 + phi / 2, 1)}°
        </text>
        <text x={X(dX) - 4} y={Y(0) + 13} fontSize="9.5" fill={INK_2} textAnchor="end">
          {fmt(45 - phi / 2, 1)}°
        </text>

        {/* base level and surcharge */}
        <line x1={X(-dX) - 10} x2={X(dX) + 10} y1={yBase} y2={yBase} stroke={INK_2} strokeWidth="0.8" strokeDasharray="3 3" />
        {Df > 0
          ? [...arrowsX, ...arrowsX.map((x) => -x)].map((x, i) => (
              <line key={i} x1={X(x)} x2={X(x)} y1={yBase - 16} y2={yBase - 2} stroke={INK_2} strokeWidth="1.1" markerEnd={`url(#${uid}-arr)`} />
            ))
          : null}
        {Df > 0 ? (
          <text x={X((b + dX) / 2)} y={yBase - 20} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={INK}>
            <SvgScript text={`q = γD_f = ${fmt(q, 1)} ${stressUnit}`} />
          </text>
        ) : null}

        {/* ground surface */}
        <line x1="0" x2={W} y1={topY} y2={topY} stroke="#3f3a33" strokeWidth="2" />
        {Array.from({ length: 40 }, (_, i) => i * 16 + 4).map((x) => (
          <path key={x} d={`M${x},${topY} l3,-5 M${x + 4},${topY} l2,-4`} stroke="#6b8f3a" strokeWidth="1.1" fill="none" opacity="0.75" />
        ))}

        {/* footing + column */}
        {Df > 0 ? <rect x={X(-b) - 4} y={topY} width={B * s + 8} height={yBase - topY} fill="#f8fafc" opacity="0.65" /> : null}
        <rect x={cx - colW / 2} y={Math.min(topY - 24, yBase - footT - 24)} width={colW} height={yBase - footT - Math.min(topY - 24, yBase - footT - 24)} fill="#cbd5e1" stroke={INK} strokeWidth="1.1" />
        <rect x={X(-b)} y={yBase - footT} width={B * s} height={footT} rx="2" fill="#94a3b8" stroke={INK} strokeWidth="1.3" />
        <line x1={cx} x2={cx} y1={Math.min(topY - 24, yBase - footT - 24) - 34} y2={Math.min(topY - 24, yBase - footT - 24) - 2} stroke={INK} strokeWidth="2.2" markerEnd={`url(#${uid}-arr)`} />
        <text x={cx + 8} y={Math.min(topY - 24, yBase - footT - 24) - 18} fontSize="11" fontWeight="700" fill={INK}>
          <SvgScript text="Q_ult" />
        </text>

        {/* dimensions */}
        {(() => {
          const yDim = Math.min(Y(zMax) + 18, H - 10);
          return (
            <g>
              <line x1={X(-b)} x2={X(-b)} y1={yBase + 2} y2={yDim + 4} stroke={INK_2} strokeWidth="0.7" strokeDasharray="2 3" />
              <line x1={X(b)} x2={X(b)} y1={yBase + 2} y2={yDim + 4} stroke={INK_2} strokeWidth="0.7" strokeDasharray="2 3" />
              <line x1={X(-b)} x2={X(b)} y1={yDim} y2={yDim} stroke={INK} strokeWidth="1" markerStart={`url(#${uid}-dim)`} markerEnd={`url(#${uid}-dim)`} />
              <rect x={cx - 36} y={yDim - 8} width="72" height="16" rx="4" fill="#ffffff" />
              <text x={cx} y={yDim + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK}>
                B = {fmt(B)} {lengthUnit}
              </text>
            </g>
          );
        })()}
        {Df > 0 ? (
          <g>
            <line x1={X(-b) - 8} x2={X(-b) - 8} y1={topY + 1} y2={yBase - 1} stroke={INK_2} strokeWidth="1" markerStart={`url(#${uid}-dim)`} markerEnd={`url(#${uid}-dim)`} />
            <text x={X(-b) - 12} y={topY - 7} textAnchor="end" fontSize="10.5" fontWeight="700" fill={INK}>
              <SvgScript text={`D_f = ${fmt(Df)} ${lengthUnit}`} />
            </text>
          </g>
        ) : null}
        <line x1={X(dX) + 14} x2={X(dX) + 14} y1={yBase + 1} y2={Y(zMax) - 1} stroke={INK_2} strokeWidth="1" markerStart={`url(#${uid}-dim)`} markerEnd={`url(#${uid}-dim)`} />
        <text x={Math.min(X(dX) + 19, W - 4)} y={(yBase + Y(zMax)) / 2 + 3.5} textAnchor={X(dX) + 70 > W ? "end" : "start"} fontSize="10" fontWeight="600" fill={INK}>
          {fmt(zMax, 1)} {lengthUnit}
        </text>

        {/* groundwater */}
        {showGwt ? (
          <g>
            <line x1="0" x2={W} y1={gwtY} y2={gwtY} stroke={WATER} strokeWidth="1.4" strokeDasharray="6 4" />
            <rect x="6" y={gwtY - 17} width="86" height="14" rx="3" fill="#ffffff" fillOpacity="0.9" />
            <path d={`M10,${gwtY - 14} l10,0 l-5,8 z`} fill="#ffffff" stroke={WATER} strokeWidth="1.3" />
            <text x="24" y={gwtY - 6} fontSize="10" fontWeight="600" fill={WATER}>
              GWT {fmt(gwtRaw)} {lengthUnit}
            </text>
          </g>
        ) : null}

        {/* plan inset */}
        <g transform={`translate(${W - 118} 10)`}>
          <rect width="108" height="70" rx="10" fill="#ffffff" stroke="#cbd5e1" />
          <text x="54" y="15" textAnchor="middle" fontSize="10" fontWeight="700" fill={INK_2}>
            Plan
          </text>
          {(() => {
            const k = Math.min(70 / L, 34 / B);
            return <rect x={54 - (L * k) / 2} y={40 - (B * k) / 2} width={L * k} height={B * k} rx="2" fill="#94a3b8" stroke={INK} strokeWidth="1" />;
          })()}
          <text x="54" y="64" textAnchor="middle" fontSize="9.5" fontWeight="600" fill={INK}>
            {fmt(B)} × {fmt(L)} {lengthUnit}
          </text>
        </g>

        {/* parameter chips */}
        <g transform="translate(10 10)">
          <rect width="150" height="58" rx="10" fill="#ffffff" stroke="#cbd5e1" />
          <text x="10" y="18" fontSize="10.5" fontWeight="700" fill={INK}>
            φ′ = {fmt(phi, 1)}° · c′ = {fmt(c, 1)} {stressUnit}
          </text>
          <text x="10" y="34" fontSize="10" fill={INK_2}>
            <SvgScript text={`r₀ = ${fmt(r0, 2)}, r₁ = ${fmt(r1, 2)} ${lengthUnit}`} />
          </text>
          <text x="10" y="49" fontSize="10" fill={INK_2}>
            reach {fmt(dX, 1)} {lengthUnit} each side
          </text>
        </g>
      </svg>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs leading-5 text-slate-600">
        {showGwt && gwtInZone ? (
          <span className="font-semibold text-blue-800">
            Groundwater lies within about B below the base — the submerged unit weight γ′ governs the N<sub>γ</sub> term.{" "}
          </span>
        ) : null}
        The slip surface (red dashed) reaches {fmt(zMax, 2)} {lengthUnit} below the base and emerges {fmt(dX - b, 2)} {lengthUnit} beyond
        each edge; larger φ′ makes it deeper and wider through the log-spiral term e<sup>θ tanφ′</sup>.
      </div>
    </div>
  );
}
