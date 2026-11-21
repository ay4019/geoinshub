"use client";

import { useRef, useState } from "react";

import { ScriptText } from "@/components/script-text";
import {
  SvgScript,
  displayUnit,
  formatNumber,
  formatQty,
  niceCeil,
  niceStep,
  svgPoint,
  toDisplay,
  type DepthScale,
} from "@/components/pile/pile-shared";
import { SECTION_VIEW_WIDTH, SIDE_COLOUR, TOE_COLOUR } from "@/components/pile/soil-section";
import type { CapacityCurvePoint } from "@/lib/design-tools/pile-design";
import type { DerivedStrata } from "@/lib/design-tools/pile-strata";
import type { UnitSystem } from "@/lib/types";

const INK = "#0f172a";
const INK_2 = "#475569";
const GRID = "#e2e8f0";

export type CapacityValues = { side: number; base: number; ultimate: number; design: number };
type SeriesKey = keyof CapacityValues;

function seriesFor(designShort: string) {
  return [
    { key: "ultimate" as SeriesKey, label: "Rᵤ ultimate", short: "Rᵤ", colour: INK, width: 2.2, dash: undefined as string | undefined },
    { key: "side" as SeriesKey, label: "Rₛ shaft", short: "Rₛ", colour: SIDE_COLOUR, width: 2, dash: undefined },
    { key: "base" as SeriesKey, label: "R_b base", short: "R_b", colour: TOE_COLOUR, width: 2, dash: undefined },
    { key: "design" as SeriesKey, label: `${designShort} design`, short: designShort, colour: INK_2, width: 1.8, dash: "6 4" },
  ];
}

export function CapacityLegend({ designShort }: { designShort: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      {seriesFor(designShort).map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <svg width="16" height="4" aria-hidden="true">
            <line x1="0" x2="16" y1="2" y2="2" stroke={s.colour} strokeWidth="3" strokeDasharray={s.dash ? "4 2.5" : undefined} />
          </svg>
          <span>
            <ScriptText text={s.label} />
          </span>
        </span>
      ))}
    </div>
  );
}

interface CapacityChartProps {
  curve: CapacityCurvePoint[];
  strata: DerivedStrata;
  scale: DepthScale;
  unitSystem: UnitSystem;
  headDepth: number;
  toeDepth: number;
  designShort: string;
  current: CapacityValues | null;
  hoverDepth: number | null;
  onHoverDepth: (depth: number | null) => void;
  /** Exact values for a toe at the given depth (used by the hover tooltip). */
  computeAt: (toeDepth: number) => CapacityValues | null;
  onSelectToe: (toeDepth: number) => void;
}

export function CapacityChart({
  curve,
  strata,
  scale,
  unitSystem,
  headDepth,
  toeDepth,
  designShort,
  current,
  hoverDepth,
  onHoverDepth,
  computeAt,
  onSelectToe,
}: CapacityChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pointer, setPointer] = useState<{ px: number; py: number; width: number } | null>(null);
  const SERIES = seriesFor(designShort);

  const W = SECTION_VIEW_WIDTH;
  const H = scale.height;
  const left = 46;
  const right = W - 18;
  const y0 = scale.y(0);
  const forceUnit = displayUnit("kN", unitSystem);

  const maxSi = Math.max(...curve.map((p) => p.ultimate), current?.ultimate ?? 0, 1);
  const maxDisp = niceCeil(toDisplay(maxSi, "kN", unitSystem), 5);
  const step = niceStep(maxDisp, 5);
  const x = (si: number) => left + (toDisplay(Math.max(si, 0), "kN", unitSystem) / maxDisp) * (right - left);
  const xTicks: number[] = [];
  for (let t = 0; t <= maxDisp + 1e-9; t += step) xTicks.push(t);

  const depthMaxDisp = toDisplay(scale.maxDepth, "m", unitSystem);
  const depthStep = niceStep(depthMaxDisp, 8);
  const dispToM = scale.maxDepth / depthMaxDisp;
  const yTicks: number[] = [];
  for (let t = 0; t <= depthMaxDisp + 1e-9; t += depthStep) yTicks.push(t);

  const path = (key: SeriesKey) =>
    curve.map((p, i) => `${i ? "L" : "M"}${x(p[key]).toFixed(1)},${scale.y(p.toe).toFixed(1)}`).join("");

  const lastPoint = curve[curve.length - 1];
  const endLabels = lastPoint
    ? SERIES.map((s) => ({ ...s, x: x(lastPoint[s.key]) }))
        .sort((a, b) => a.x - b.x)
        .reduce<Array<(typeof SERIES)[number] & { x: number }>>((acc, item) => {
          const prev = acc[acc.length - 1];
          acc.push(prev && item.x - prev.x < 24 ? { ...item, x: prev.x + 24 } : item);
          return acc;
        }, [])
    : [];

  const minToe = headDepth + 1;
  const hoverToe = hoverDepth !== null && hoverDepth >= minToe && hoverDepth <= scale.maxDepth ? hoverDepth : null;
  const hoverValues = hoverToe !== null ? computeAt(hoverToe) : null;

  const hit = (clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const p = svgPoint(svgRef.current, clientX, clientY, W, H);
    if (p.y < y0 || p.y > scale.bottom || p.x < left - 30 || p.x > right + 10) return null;
    return { p, z: Math.max(scale.z(p.y), 0) };
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full cursor-crosshair touch-none select-none"
        role="img"
        aria-label="Axial resistance versus pile toe depth"
        onPointerMove={(event) => {
          const h = hit(event.clientX, event.clientY);
          if (!h) {
            setPointer(null);
            onHoverDepth(null);
            return;
          }
          setPointer({ px: h.p.px, py: h.p.py, width: h.p.width });
          onHoverDepth(h.z);
        }}
        onPointerLeave={() => {
          setPointer(null);
          onHoverDepth(null);
        }}
        onPointerDown={(event) => {
          const h = hit(event.clientX, event.clientY);
          if (h && h.z >= minToe) onSelectToe(Math.round(h.z * 2) / 2);
        }}
      >
        {strata.layers.map((d, i) => {
          const yTop = scale.y(d.top);
          const yBot = i === strata.layers.length - 1 ? scale.bottom : scale.y(Math.min(d.bottom, scale.maxDepth));
          return <rect key={d.layer.id} x={left - 8} y={yTop} width="5" height={Math.max(yBot - yTop - 1, 0)} rx="1.5" fill={d.meta.fill} />;
        })}

        {xTicks.map((t) => {
          const xp = left + (t / maxDisp) * (right - left);
          return (
            <g key={t}>
              <line x1={xp} x2={xp} y1={y0} y2={scale.bottom} stroke={GRID} strokeWidth="1" />
              <text x={xp} y={y0 - 8} textAnchor="middle" fontSize="10.5" fill={INK_2} className="tabular-nums">
                {formatNumber(t, step < 1 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        <text x={(left + right) / 2} y={y0 - 26} textAnchor="middle" fontSize="11" fontWeight="600" fill={INK_2}>
          Axial resistance ({forceUnit}) vs toe depth
        </text>
        {yTicks.map((t) => {
          const yp = scale.y(t * dispToM);
          return (
            <g key={t}>
              <line x1={left} x2={right} y1={yp} y2={yp} stroke={GRID} strokeWidth="0.6" opacity="0.7" />
              <text x={left - 12} y={yp + 3.5} textAnchor="end" fontSize="10.5" fill={INK_2} className="tabular-nums">
                {formatNumber(t, depthStep < 1 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={left} y1={y0} y2={scale.bottom} stroke="#94a3b8" strokeWidth="1" />
        <line x1={left} x2={right} y1={y0} y2={y0} stroke="#94a3b8" strokeWidth="1" />

        {(["design", "base", "side", "ultimate"] as const).map((key) => {
          const s = SERIES.find((item) => item.key === key)!;
          return (
            <path
              key={key}
              d={path(key)}
              fill="none"
              stroke={s.colour}
              strokeWidth={s.width}
              strokeDasharray={s.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {endLabels.map((s) => (
          <text key={s.key} x={s.x} y={scale.bottom + 13} textAnchor="middle" fontSize="10" fontWeight="600" fill={INK}>
            <SvgScript text={s.short} />
          </text>
        ))}

        {current && toeDepth <= scale.maxDepth ? (
          <g pointerEvents="none">
            <line x1={left} x2={right} y1={scale.y(toeDepth)} y2={scale.y(toeDepth)} stroke={INK} strokeWidth="1" strokeDasharray="5 3" />
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(current[s.key])} cy={scale.y(toeDepth)} r="4.5" fill={s.colour} stroke="#ffffff" strokeWidth="2" />
            ))}
            {(() => {
              const xu = x(current.ultimate);
              const text = `Rᵤ = ${formatQty(current.ultimate, "kN", unitSystem, 0)}`;
              const w = text.length * 6.1 + 12;
              const onLeft = xu + 10 + w > right;
              const bx = onLeft ? xu - 10 - w : xu + 10;
              return (
                <g>
                  <rect x={bx} y={scale.y(toeDepth) - 22} width={w} height="17" rx="5" fill={INK} />
                  <text x={bx + w / 2} y={scale.y(toeDepth) - 10} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">
                    <SvgScript text={text} />
                  </text>
                </g>
              );
            })()}
          </g>
        ) : null}

        {hoverToe !== null && hoverValues ? (
          <g pointerEvents="none">
            <line x1={left} x2={right} y1={scale.y(hoverToe)} y2={scale.y(hoverToe)} stroke={INK} strokeWidth="0.8" strokeDasharray="3 3" />
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(hoverValues[s.key])} cy={scale.y(hoverToe)} r="3.5" fill="#ffffff" stroke={s.colour} strokeWidth="2" />
            ))}
          </g>
        ) : null}
      </svg>

      {pointer && hoverToe !== null && hoverValues ? (
        <div
          className="pointer-events-none absolute z-10 w-52 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{
            left: pointer.px + 14 + 208 > pointer.width ? pointer.px - 14 - 208 : pointer.px + 14,
            top: Math.max(pointer.py - 20, 0),
          }}
        >
          <p className="font-semibold text-slate-900">
            Toe at {formatQty(hoverToe, "m", unitSystem, 1)} · L = {formatQty(hoverToe - headDepth, "m", unitSystem, 1)}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="inline-block h-[3px] w-3 rounded-full" style={{ backgroundColor: s.colour }} />
                  <span>
                    <ScriptText text={s.label} />
                  </span>
                </span>
                <span className="font-medium tabular-nums text-slate-900">{formatQty(hoverValues[s.key], "kN", unitSystem, 0)}</span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] text-slate-500">Click to set this toe depth</p>
        </div>
      ) : null}
    </div>
  );
}
