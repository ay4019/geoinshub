"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { ScriptText } from "@/components/script-text";
import {
  SoilPatternDefs,
  SvgScript,
  formatNumber,
  formatQty,
  niceCeil,
  niceStep,
  svgPoint,
  toDisplay,
  displayUnit,
  type DepthScale,
} from "@/components/pile/pile-shared";
import type { PileAnalysis } from "@/lib/design-tools/pile-design";
import type { PileMaterial, PileType } from "@/lib/design-tools/pile-strata";
import type { DerivedStrata } from "@/lib/design-tools/pile-strata";
import type { UnitSystem } from "@/lib/types";

export const SECTION_VIEW_WIDTH = 400;

/** Series colours (validated reference palette, slots 1–2): side = blue, toe = orange. */
export const SIDE_COLOUR = "#2a78d6";
export const TOE_COLOUR = "#eb6834";
const WATER = "#2563eb";
const INK = "#0f172a";
const INK_2 = "#475569";

const PILE_FILL: Record<PileMaterial | "shaft", string> = {
  concrete: "#d9d6cf",
  steel: "#a3aebb",
  timber: "#bf9264",
  shaft: "#d2cfc7",
};

interface SoilSectionProps {
  strata: DerivedStrata;
  groundwaterDepth: number;
  scale: DepthScale;
  unitSystem: UnitSystem;
  mode: "strata" | "pile";
  pile?: { diameter: number; length: number; head: number; pileType: PileType; material: PileMaterial };
  result?: PileAnalysis | null;
  highlightIndex?: number | null;
  onHoverLayer?: (index: number | null) => void;
  onSelectLayer?: (index: number) => void;
  hoverDepth?: number | null;
  onHoverDepth?: (depth: number | null) => void;
  ariaLabel: string;
}

export function pileWidthPx(diameter: number): number {
  return Math.min(Math.max(8 + diameter * 26, 10), 112);
}

function layerIndexAt(strata: DerivedStrata, z: number): number {
  const layers = strata.layers;
  for (let i = 0; i < layers.length; i += 1) {
    if (z < layers[i].bottom || i === layers.length - 1) return i;
  }
  return layers.length - 1;
}

export function SoilSection({
  strata,
  groundwaterDepth,
  scale,
  unitSystem,
  mode,
  pile,
  result,
  highlightIndex,
  onHoverLayer,
  onSelectLayer,
  hoverDepth,
  onHoverDepth,
  ariaLabel,
}: SoilSectionProps) {
  const uid = useId().replace(/[:]/g, "");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pointer, setPointer] = useState<{ px: number; py: number; width: number } | null>(null);

  const W = SECTION_VIEW_WIDTH;
  const H = scale.height;
  const colLeft = 50;
  const colRight = W - 8;
  const colW = colRight - colLeft;
  const cx = colLeft + colW / 2;
  const y0 = scale.y(0);
  const layers = strata.layers;

  // Depth axis ticks in display units.
  const maxDisp = toDisplay(scale.maxDepth, "m", unitSystem);
  const tickStep = niceStep(maxDisp, 8);
  const ticks: number[] = [];
  for (let t = 0; t <= maxDisp + 1e-9; t += tickStep) ticks.push(t);
  const dispToM = scale.maxDepth / maxDisp;
  const lengthUnit = displayUnit("m", unitSystem);

  const gwt = groundwaterDepth;
  const showGwt = Number.isFinite(gwt) && gwt >= 0 && gwt < scale.maxDepth;
  // Keep the GWT symbol clear of the thickness dimensions drawn at the right edge in strata mode.
  const gx = colRight - (mode === "strata" ? 52 : 24);

  // Pile geometry.
  const pw = pile ? pileWidthPx(pile.diameter) : 0;
  const headDepth = pile?.head ?? 0;
  const toeDepth = pile ? pile.head + pile.length : 0;
  const pileBottom = pile ? scale.y(Math.min(toeDepth, scale.maxDepth)) : 0;
  const yHead = scale.y(headDepth);
  const pileHead = yHead - 12;
  const maxW = Math.max(Math.min(colW / 2 - pw / 2 - 60, 95), 24);
  const tipH = Math.min(pw * 0.45, 12);
  const drivenOutline = `M${cx - pw / 2},${pileHead} L${cx + pw / 2},${pileHead} L${cx + pw / 2},${pileBottom - tipH} L${cx + pw * 0.18},${pileBottom} L${cx - pw * 0.18},${pileBottom} L${cx - pw / 2},${pileBottom - tipH} Z`;

  let sidePathRight = "";
  let sidePathLeft = "";
  let fsMax = 0;
  let fsPeak: { z: number; fs: number } | null = null;
  if (mode === "pile" && pile && result && result.profile.length) {
    const pts = result.profile;
    const peak = pts.reduce((best, p) => (p.unitSide > best.unitSide ? p : best), pts[0]);
    fsMax = niceCeil(Math.max(peak.unitSide, 1), 4);
    fsPeak = { z: peak.z, fs: peak.unitSide };
    const stride = Math.max(1, Math.ceil(pts.length / 180));
    const thin = pts.filter((_, i) => i % stride === 0);
    const xr = (fs: number) => cx + pw / 2 + (fs / fsMax) * maxW;
    const xl = (fs: number) => cx - pw / 2 - (fs / fsMax) * maxW;
    const r = [`M${cx + pw / 2},${yHead}`];
    const l = [`M${cx - pw / 2},${yHead}`];
    thin.forEach((p) => {
      r.push(`L${xr(p.unitSide).toFixed(1)},${scale.y(p.z).toFixed(1)}`);
      l.push(`L${xl(p.unitSide).toFixed(1)},${scale.y(p.z).toFixed(1)}`);
    });
    const last = pts[pts.length - 1];
    r.push(`L${xr(last.unitSide).toFixed(1)},${pileBottom}`, `L${cx + pw / 2},${pileBottom}Z`);
    l.push(`L${xl(last.unitSide).toFixed(1)},${pileBottom}`, `L${cx - pw / 2},${pileBottom}Z`);
    sidePathRight = r.join("");
    sidePathLeft = l.join("");
  }

  const qt = result?.base.unitResistance ?? 0;
  const toeArrowLen = 10 + 40 * Math.min(Math.sqrt(qt / 12000), 1);
  const toeArrowCount = Math.max(3, Math.min(7, Math.round(pw / 14) + 2));

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const p = svgPoint(svgRef.current, event.clientX, event.clientY, W, H);
    if (p.y < y0 || p.y > scale.bottom || p.x < colLeft || p.x > colRight) {
      setPointer(null);
      onHoverLayer?.(null);
      onHoverDepth?.(null);
      return;
    }
    const z = Math.max(scale.z(p.y), 0);
    setPointer({ px: p.px, py: p.py, width: p.width });
    onHoverLayer?.(layers.length ? layerIndexAt(strata, z) : null);
    onHoverDepth?.(z);
  };

  const handleLeave = () => {
    setPointer(null);
    onHoverLayer?.(null);
    onHoverDepth?.(null);
  };

  const activeDepth = hoverDepth ?? null;

  // Tooltip content.
  let tooltip: ReactNode = null;
  if (pointer && activeDepth !== null && layers.length) {
    const li = layerIndexAt(strata, activeDepth);
    const d = layers[li];
    const isCohesive = d.meta.behaviour === "cohesive";
    let pileLine: ReactNode = null;
    if (mode === "pile" && pile && result) {
      if (activeDepth < headDepth) {
        pileLine = <p className="mt-1 text-[11px] text-slate-500">Above the pile head</p>;
      } else if (activeDepth <= toeDepth) {
        const pt = result.profile.reduce(
          (best, p) => (Math.abs(p.z - activeDepth) < Math.abs(best.z - activeDepth) ? p : best),
          result.profile[0],
        );
        if (pt) {
          pileLine = (
            <>
              <Row
                label={pt.sigmaVUsed < pt.sigmaV - 0.05 ? "σ′ᵥ (capped)" : "σ′ᵥ"}
                value={formatQty(pt.sigmaVUsed, "kPa", unitSystem)}
              />
              <Row label={isCohesive ? "α" : "β"} value={pt.excluded ? "excluded" : formatNumber(pt.coefficient, 3)} />
              <Row label="fₛ" value={formatQty(pt.unitSide, "kPa", unitSystem)} swatch={SIDE_COLOUR} />
            </>
          );
        }
      } else {
        pileLine = <p className="mt-1 text-[11px] text-slate-500">Below the pile toe</p>;
      }
    }
    tooltip = (
      <div
        className="pointer-events-none absolute z-10 w-48 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
        style={{
          left: pointer.px + 14 + 192 > pointer.width ? pointer.px - 14 - 192 : pointer.px + 14,
          top: Math.max(pointer.py - 20, 0),
        }}
      >
        <p className="font-semibold text-slate-900">
          z = {formatQty(activeDepth, "m", unitSystem, 2)}
        </p>
        <p className="mt-0.5 text-slate-600">
          Layer {li + 1} · {d.meta.label}
        </p>
        <div className="mt-1.5 space-y-0.5">
          {mode === "strata" ? (
            <>
              <Row label="γ" value={formatQty(d.layer.gamma, "kN/m3", unitSystem)} />
              {isCohesive ? (
                <Row label="cᵤ" value={formatQty(d.cu, "kPa", unitSystem)} />
              ) : (
                <Row label="φ′" value={`${formatNumber(d.phi, 1)}°`} />
              )}
              {Number.isFinite(d.n60) ? <Row label="N₆₀" value={formatNumber(d.n60, 0)} /> : null}
            </>
          ) : (
            pileLine
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onPointerDown={(event) => {
          handleMove(event);
          if (onSelectLayer && svgRef.current && layers.length) {
            const p = svgPoint(svgRef.current, event.clientX, event.clientY, W, H);
            if (p.y >= y0 && p.y <= scale.bottom) onSelectLayer(layerIndexAt(strata, Math.max(scale.z(p.y), 0)));
          }
        }}
      >
        <defs>
          <SoilPatternDefs prefix={uid} />
          <clipPath id={`${uid}-col`}>
            <rect x={colLeft} y={y0} width={colW} height={scale.bottom - y0} />
          </clipPath>
          <marker id={`${uid}-up`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill={TOE_COLOUR} />
          </marker>
          <marker id={`${uid}-dim`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill={INK_2} />
          </marker>
          <linearGradient id={`${uid}-shaft`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.16" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Layers */}
        <g clipPath={`url(#${uid}-col)`}>
          {layers.map((d, i) => {
            const yTop = scale.y(d.top);
            const yBot = i === layers.length - 1 ? scale.bottom : scale.y(Math.min(d.bottom, scale.maxDepth));
            return (
              <rect
                key={d.layer.id}
                x={colLeft}
                y={yTop}
                width={colW}
                height={Math.max(yBot - yTop, 0)}
                fill={`url(#${uid}-${d.layer.type})`}
              />
            );
          })}
          {layers.map((d, i) =>
            i < layers.length - 1 && d.bottom < scale.maxDepth ? (
              <line
                key={`b-${d.layer.id}`}
                x1={colLeft}
                x2={colRight}
                y1={scale.y(d.bottom)}
                y2={scale.y(d.bottom)}
                stroke="#5b4630"
                strokeWidth="1"
                opacity="0.55"
              />
            ) : null,
          )}
          {showGwt ? (
            <rect x={colLeft} y={scale.y(gwt)} width={colW} height={scale.bottom - scale.y(gwt)} fill={WATER} opacity="0.07" />
          ) : null}
          {highlightIndex !== null && highlightIndex !== undefined && layers[highlightIndex] ? (
            <rect
              x={colLeft + 1}
              y={scale.y(layers[highlightIndex].top) + 1}
              width={colW - 2}
              height={Math.max(
                (highlightIndex === layers.length - 1 ? scale.bottom : scale.y(Math.min(layers[highlightIndex].bottom, scale.maxDepth))) -
                  scale.y(layers[highlightIndex].top) -
                  2,
                0,
              )}
              fill="#ffffff"
              fillOpacity="0.18"
              stroke={INK}
              strokeWidth="1.6"
              rx="2"
            />
          ) : null}
        </g>

        {/* Column frame & ground surface */}
        <rect x={colLeft} y={y0} width={colW} height={scale.bottom - y0} fill="none" stroke="#a8a29e" strokeWidth="1" />
        <line x1={colLeft - 4} x2={colRight} y1={y0} y2={y0} stroke="#3f3a33" strokeWidth="2" />
        {Array.from({ length: Math.floor(colW / 16) }, (_, i) => colLeft + 6 + i * 16).map((x) => (
          <path key={x} d={`M${x},${y0} l3,-5 M${x + 4},${y0} l2,-4`} stroke="#6b8f3a" strokeWidth="1.1" fill="none" opacity="0.8" />
        ))}

        {/* Depth axis */}
        {ticks.map((t) => {
          const y = scale.y(t * dispToM);
          return (
            <g key={t}>
              <line x1={colLeft - 4} x2={colLeft} y1={y} y2={y} stroke={INK_2} strokeWidth="1" />
              <text x={colLeft - 7} y={y + 3.5} textAnchor="end" fontSize="10.5" fill={INK_2} className="tabular-nums">
                {formatNumber(t, tickStep < 1 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        <text
          x="12"
          y={(y0 + scale.bottom) / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={INK_2}
          transform={`rotate(-90 12 ${(y0 + scale.bottom) / 2})`}
        >
          Depth ({lengthUnit})
        </text>

        {/* Groundwater */}
        {showGwt ? (
          <g>
            <line
              x1={colLeft}
              x2={colRight}
              y1={scale.y(gwt)}
              y2={scale.y(gwt)}
              stroke={WATER}
              strokeWidth="1.4"
              strokeDasharray="6 4"
            />
            <path
              d={`M${gx - 5},${scale.y(gwt) - 11} l10,0 l-5,8 z`}
              fill="#ffffff"
              stroke={WATER}
              strokeWidth="1.3"
            />
            <line x1={gx - 3} x2={gx + 3} y1={scale.y(gwt) + 3} y2={scale.y(gwt) + 3} stroke={WATER} strokeWidth="1" />
            <line x1={gx - 2} x2={gx + 2} y1={scale.y(gwt) + 6} y2={scale.y(gwt) + 6} stroke={WATER} strokeWidth="1" />
            <rect x={gx - 9 - 74} y={scale.y(gwt) - 15} width="72" height="13" rx="3" fill="#ffffff" fillOpacity="0.85" />
            <text x={gx - 9} y={scale.y(gwt) - 5} textAnchor="end" fontSize="10" fontWeight="600" fill={WATER}>
              GWT {formatQty(gwt, "m", unitSystem)}
            </text>
          </g>
        ) : null}

        {/* Strata-mode labels */}
        {mode === "strata"
          ? layers.map((d, i) => {
              const yTop = scale.y(d.top);
              const yBot = i === layers.length - 1 ? scale.bottom : scale.y(Math.min(d.bottom, scale.maxDepth));
              const h = yBot - yTop;
              if (h < 16) return null;
              const mid = (yTop + yBot) / 2;
              const isCohesive = d.meta.behaviour === "cohesive";
              const strength = isCohesive
                ? `cᵤ ${formatQty(d.cu, "kPa", unitSystem, 0)}`
                : `φ′ ${formatNumber(d.phi, 1)}°${Number.isFinite(d.n60) ? ` · N₆₀ ${formatNumber(d.n60, 0)}` : ""}`;
              const twoLines = h >= 38;
              const boxW = 168;
              return (
                <g key={`lab-${d.layer.id}`} pointerEvents="none">
                  <rect
                    x={cx - boxW / 2}
                    y={mid - (twoLines ? 17 : 9)}
                    width={boxW}
                    height={twoLines ? 34 : 18}
                    rx="6"
                    fill="#ffffff"
                    fillOpacity="0.9"
                    stroke="#d6d3d1"
                  />
                  <text x={cx} y={mid + (twoLines ? -4 : 4)} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
                    {i + 1} · {d.meta.label}
                    {!twoLines ? <SvgScript text={`  ·  ${strength}`} /> : null}
                  </text>
                  {twoLines ? (
                    <text x={cx} y={mid + 10} textAnchor="middle" fontSize="10" fill={INK_2}>
                      <SvgScript text={strength} />
                    </text>
                  ) : null}
                  {/* thickness dimension */}
                  {i < layers.length - 1 || d.bottom <= scale.maxDepth ? (
                    <g>
                      <line x1={colRight - 12} x2={colRight - 12} y1={yTop + 3} y2={yBot - 3} stroke={INK_2} strokeWidth="0.9" markerStart={`url(#${uid}-dim)`} markerEnd={`url(#${uid}-dim)`} />
                      {h >= 30 ? (
                        <text
                          x={colRight - 17}
                          y={mid + 3}
                          textAnchor="end"
                          fontSize="9.5"
                          fill={INK}
                          fontWeight="600"
                        >
                          {formatQty(d.bottom - d.top, "m", unitSystem)}
                        </text>
                      ) : null}
                    </g>
                  ) : null}
                </g>
              );
            })
          : null}

        {mode === "strata" && layers.length ? (
          <text x={cx} y={scale.bottom - 6} textAnchor="middle" fontSize="9.5" fill={INK_2} fontStyle="italic">
            last layer continues below ↓
          </text>
        ) : null}

        {/* Pile-mode layer badges */}
        {mode === "pile"
          ? layers.map((d, i) => {
              const yTop = scale.y(d.top);
              const yBot = i === layers.length - 1 ? scale.bottom : scale.y(Math.min(d.bottom, scale.maxDepth));
              if (yBot - yTop < 15 || yTop >= scale.bottom) return null;
              const label = `${i + 1} ${d.meta.label}`;
              const w = label.length * 5.6 + 12;
              return (
                <g key={`badge-${d.layer.id}`} pointerEvents="none">
                  <rect x={colLeft + 5} y={yTop + 4} width={w} height="15" rx="7.5" fill="#ffffff" fillOpacity="0.88" stroke="#d6d3d1" />
                  <text x={colLeft + 11} y={yTop + 14.5} fontSize="9.5" fontWeight="600" fill={INK}>
                    {label}
                  </text>
                </g>
              );
            })
          : null}

        {/* Pile */}
        {mode === "pile" && pile ? (
          <g>
            {sidePathRight ? (
              <g>
                <path d={sidePathRight} fill={SIDE_COLOUR} fillOpacity="0.16" stroke={SIDE_COLOUR} strokeWidth="1.5" strokeLinejoin="round" />
                <path d={sidePathLeft} fill={SIDE_COLOUR} fillOpacity="0.16" stroke={SIDE_COLOUR} strokeWidth="1.5" strokeLinejoin="round" />
              </g>
            ) : null}

            {/* shaft */}
            {pile.pileType === "driven" ? (
              <path
                d={drivenOutline}
                fill={PILE_FILL[pile.material]}
                stroke={INK}
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            ) : (
              <g>
                <rect x={cx - pw / 2} y={pileHead} width={pw} height={pileBottom - pileHead} fill={PILE_FILL.shaft} stroke={INK} strokeWidth="1.3" />
                {pw > 18 ? (
                  <g stroke="#57534e" strokeWidth="0.9" strokeDasharray="4 3" opacity="0.7">
                    <line x1={cx - pw / 2 + 5} x2={cx - pw / 2 + 5} y1={pileHead + 4} y2={pileBottom - 6} />
                    <line x1={cx + pw / 2 - 5} x2={cx + pw / 2 - 5} y1={pileHead + 4} y2={pileBottom - 6} />
                  </g>
                ) : null}
              </g>
            )}
            <path
              d={pile.pileType === "driven" ? drivenOutline : `M${cx - pw / 2},${pileHead}h${pw}V${pileBottom}h${-pw}Z`}
              fill={`url(#${uid}-shaft)`}
              pointerEvents="none"
              opacity={pile.pileType === "driven" ? 0.9 : 0.7}
            />
            {/* pile cap */}
            <rect x={cx - pw / 2 - 6} y={pileHead - 8} width={pw + 12} height="8" rx="2" fill="#64748b" stroke={INK} strokeWidth="1" />

            {/* diameter dimension */}
            <g>
              <line x1={cx - pw / 2} x2={cx + pw / 2} y1={pileHead - 18} y2={pileHead - 18} stroke={INK_2} strokeWidth="1" markerStart={`url(#${uid}-dim)`} markerEnd={`url(#${uid}-dim)`} />
              <line x1={cx - pw / 2} x2={cx - pw / 2} y1={pileHead - 23} y2={pileHead - 12} stroke={INK_2} strokeWidth="0.8" />
              <line x1={cx + pw / 2} x2={cx + pw / 2} y1={pileHead - 23} y2={pileHead - 12} stroke={INK_2} strokeWidth="0.8" />
              <text x={cx} y={pileHead - 25} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
                D = {formatQty(pile.diameter, "m", unitSystem, 2)}
              </text>
            </g>

            {/* length dimension */}
            {(() => {
              const x = Math.max(cx - pw / 2 - maxW - 12, colLeft + 14);
              const mid = (yHead + pileBottom) / 2;
              return (
                <g>
                  <line x1={x} x2={x} y1={yHead + 1} y2={pileBottom - 1} stroke={INK_2} strokeWidth="1" markerStart={`url(#${uid}-dim)`} markerEnd={`url(#${uid}-dim)`} />
                  <rect x={x - 8} y={mid - 34} width="16" height="68" rx="4" fill="#ffffff" fillOpacity="0.9" />
                  <text x={x} y={mid} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK} transform={`rotate(-90 ${x} ${mid})`} dy="3.5">
                    L = {formatQty(pile.length, "m", unitSystem)}
                  </text>
                </g>
              );
            })()}

            {/* toe arrows */}
            {result && toeDepth <= scale.maxDepth ? (
              <g>
                {Array.from({ length: toeArrowCount }, (_, i) => {
                  const span = Math.max(pw * 0.8, 14);
                  const x = cx - span / 2 + (span * i) / Math.max(toeArrowCount - 1, 1);
                  return (
                    <line
                      key={i}
                      x1={x}
                      x2={x}
                      y1={pileBottom + toeArrowLen + 3}
                      y2={pileBottom + 5}
                      stroke={TOE_COLOUR}
                      strokeWidth="2"
                      markerEnd={`url(#${uid}-up)`}
                    />
                  );
                })}
                <rect
                  x={cx + Math.max(pw * 0.4, 7) + 8}
                  y={pileBottom + 4}
                  width="8"
                  height="8"
                  rx="2"
                  fill={TOE_COLOUR}
                />
                <text x={cx + Math.max(pw * 0.4, 7) + 20} y={pileBottom + 12} fontSize="10.5" fontWeight="600" fill={INK}>
                  q<tspan fontSize="8" dy="2">t</tspan>
                  <tspan dy="-2"> = {formatQty(qt, "kPa", unitSystem, 0)}</tspan>
                </text>
              </g>
            ) : null}

            {/* side distribution label */}
            {fsPeak && sidePathRight ? (
              <g pointerEvents="none">
                <text
                  x={Math.min(cx + pw / 2 + (fsPeak.fs / fsMax) * maxW + 6, colRight - 70)}
                  y={Math.min(scale.y(fsPeak.z) + 4, pileBottom - 4)}
                  fontSize="10"
                  fontWeight="600"
                  fill={INK}
                >
                  f<tspan fontSize="8" dy="2">s,max</tspan>
                  <tspan dy="-2"> {formatQty(fsPeak.fs, "kPa", unitSystem, 0)}</tspan>
                </text>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* Critical depth */}
        {mode === "pile" && result?.criticalDepth != null && result.criticalDepth < scale.maxDepth ? (
          <g pointerEvents="none">
            <line
              x1={colLeft}
              x2={colRight}
              y1={scale.y(result.criticalDepth)}
              y2={scale.y(result.criticalDepth)}
              stroke="#7c3aed"
              strokeWidth="1.3"
              strokeDasharray="8 3 2 3"
            />
            <rect x={colRight - 128} y={scale.y(result.criticalDepth) + 3} width="124" height="15" rx="4" fill="#ffffff" fillOpacity="0.9" />
            <text x={colRight - 8} y={scale.y(result.criticalDepth) + 14} textAnchor="end" fontSize="10" fontWeight="600" fill="#5b21b6">
              <SvgScript text={`z_c = ${formatQty(result.criticalDepth, "m", unitSystem)} (${formatNumber(result.params.criticalFactor, 0)}D)`} />
            </text>
          </g>
        ) : null}

        {/* Pile head depth D_f */}
        {mode === "pile" && pile && headDepth > 0 ? (
          <g pointerEvents="none">
            <line x1={colRight - 16} x2={colRight - 16} y1={y0 + 1} y2={yHead - 1} stroke={INK_2} strokeWidth="1" markerStart={`url(#${uid}-dim)`} markerEnd={`url(#${uid}-dim)`} />
            <text x={colRight - 21} y={(y0 + yHead) / 2 + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill={INK}>
              <SvgScript text={`D_f = ${formatQty(headDepth, "m", unitSystem)}`} />
            </text>
          </g>
        ) : null}

        {/* Hover crosshair */}
        {activeDepth !== null && activeDepth <= scale.maxDepth ? (
          <line
            x1={colLeft}
            x2={colRight}
            y1={scale.y(activeDepth)}
            y2={scale.y(activeDepth)}
            stroke={INK}
            strokeWidth="0.8"
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        ) : null}
      </svg>
      {tooltip}
    </div>
  );
}

function Row({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-slate-500">
        {swatch ? <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: swatch }} /> : null}
        <span><ScriptText text={label} /></span>
      </span>
      <span className="font-medium tabular-nums text-slate-900">{value}</span>
    </div>
  );
}
