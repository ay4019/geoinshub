"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ScriptText } from "@/components/script-text";
import {
  CHART_INK,
  boreholeStyles,
  cleanData,
  computeDomain,
  formatTick,
  formatValue,
  markerPath,
  plainSubscripts,
  scales,
  seriesByBorehole,
  splitSubscripts,
  type DepthProfileDatum,
  type DepthProfileSpec,
  type MarkerShape,
} from "@/lib/charts/depth-profile";

interface DepthProfilePlotProps extends DepthProfileSpec {
  title: string;
  /** Short muted line under the title, e.g. method or correction note. */
  subtitle?: string;
  /** Label for the value in the hover tooltip (defaults to xLabel without the unit). */
  valueName?: string;
  className?: string;
}

const MARGIN = { top: 50, right: 18, bottom: 14, left: 58 };
const MARKER_R = 4.6;

/** SVG <tspan>s with real subscripts; place inside a <text>. */
function SvgScript({ text }: { text: string }) {
  const segs = splitSubscripts(text);
  return (
    <>
      {segs.map((seg, i) => {
        const prevSub = i > 0 && segs[i - 1].sub;
        const dy = seg.sub ? "0.3em" : prevSub ? "-0.3em" : undefined;
        return (
          <tspan key={i} dy={dy} fontSize={seg.sub ? "72%" : undefined}>
            {seg.text}
          </tspan>
        );
      })}
    </>
  );
}

function MarkerSwatch({ shape, colour }: { shape: MarkerShape; colour: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <path d={markerPath(shape, 7, 7, 4.4)} fill={colour} stroke={CHART_INK.surface} strokeWidth={1} />
    </svg>
  );
}

/**
 * Depth-profile scatter: value axis on top, depth increasing downward, one colour + marker shape per borehole,
 * thin per-borehole trend line, hover tooltip. Shares its geometry with the report PNG (lib/charts/depth-profile-png.ts).
 */
export function DepthProfilePlot({ title, subtitle, valueName, className, ...spec }: DepthProfilePlotProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState<DepthProfileDatum | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => cleanData(spec.data), [spec.data]);
  const styles = useMemo(() => boreholeStyles(data), [data]);
  const domain = useMemo(
    () => computeDomain({ ...spec, data }, width < 420 ? 4 : 6, 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, spec.referenceLines, spec.xMin, spec.xMax, width],
  );

  const height = Math.round(Math.min(Math.max(width * 0.74, 300), 620));
  const frame = {
    left: MARGIN.left,
    top: MARGIN.top,
    width: width - MARGIN.left - MARGIN.right,
    height: height - MARGIN.top - MARGIN.bottom,
  };
  const s = scales(domain, frame);
  const series = useMemo(() => seriesByBorehole(data), [data]);
  const connect = spec.connect ?? true;
  const name = valueName ?? spec.xLabel.replace(/\s*\([^)]*\)\s*$/, "");

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const py = ((event.clientY - rect.top) / rect.height) * height;
    let best: DepthProfileDatum | null = null;
    let bestDist = 26 * 26;
    for (const d of data) {
      const dx = s.x(d.value) - px;
      const dy = s.y(d.depth) - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    setHover(best);
  };

  const hoverStyle = hover ? styles.get(hover.boreholeId) : undefined;
  const hx = hover ? s.x(hover.value) : 0;
  const hy = hover ? s.y(hover.depth) : 0;

  return (
    <figure className={`rounded-lg border border-slate-200 bg-white px-4 pb-4 pt-3.5 sm:px-5 ${className ?? ""}`}>
      <figcaption className="pr-10">
        <h3 className="text-[15px] font-semibold leading-snug text-slate-900">
          <ScriptText text={title} />
        </h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </figcaption>

      <div ref={wrapRef} className="relative mt-2 w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block max-w-full touch-none select-none"
          role="img"
          aria-label={`${plainSubscripts(title)}: ${plainSubscripts(spec.xLabel)} against depth for ${styles.size} borehole${styles.size === 1 ? "" : "s"}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {/* Minor and major grid */}
          {domain.yMinorTicks.map((d) => (
            <line key={`ym-${d}`} x1={frame.left} x2={frame.left + frame.width} y1={s.y(d)} y2={s.y(d)} stroke={CHART_INK.gridMinor} strokeWidth={1} />
          ))}
          {domain.yTicks.map((d) => (
            <line key={`y-${d}`} x1={frame.left} x2={frame.left + frame.width} y1={s.y(d)} y2={s.y(d)} stroke={CHART_INK.grid} strokeWidth={1} />
          ))}
          {domain.xTicks.map((v) => (
            <line key={`x-${v}`} x1={s.x(v)} x2={s.x(v)} y1={frame.top} y2={frame.top + frame.height} stroke={CHART_INK.grid} strokeWidth={1} />
          ))}

          {/* Axes: value axis along the top (ground surface), depth axis on the left */}
          <line x1={frame.left} x2={frame.left + frame.width} y1={frame.top} y2={frame.top} stroke={CHART_INK.axis} strokeWidth={1.25} />
          <line x1={frame.left} x2={frame.left} y1={frame.top} y2={frame.top + frame.height} stroke={CHART_INK.axis} strokeWidth={1.25} />

          {domain.xTicks.map((v) => (
            <g key={`xt-${v}`}>
              <line x1={s.x(v)} x2={s.x(v)} y1={frame.top - 4} y2={frame.top} stroke={CHART_INK.axis} strokeWidth={1} />
              <text x={s.x(v)} y={frame.top - 9} textAnchor="middle" fontSize={11} fill={CHART_INK.tick}>
                {formatTick(v, domain.xStep)}
              </text>
            </g>
          ))}
          {domain.yTicks.map((d) => (
            <g key={`yt-${d}`}>
              <line x1={frame.left - 4} x2={frame.left} y1={s.y(d)} y2={s.y(d)} stroke={CHART_INK.axis} strokeWidth={1} />
              <text x={frame.left - 8} y={s.y(d) + 3.8} textAnchor="end" fontSize={11} fill={CHART_INK.tick}>
                {formatTick(d, domain.yStep)}
              </text>
            </g>
          ))}

          <text x={frame.left + frame.width / 2} y={16} textAnchor="middle" fontSize={12} fontWeight={600} fill={CHART_INK.axisTitle}>
            <SvgScript text={spec.xLabel} />
          </text>
          <text
            x={14}
            y={frame.top + frame.height / 2}
            textAnchor="middle"
            fontSize={12}
            fontWeight={600}
            fill={CHART_INK.axisTitle}
            transform={`rotate(-90 14 ${frame.top + frame.height / 2})`}
          >
            Depth ({spec.depthUnit})
          </text>

          {/* Reference lines */}
          {(spec.referenceLines ?? []).map((ref) => {
            const x = s.x(ref.value);
            const nearRight = x > frame.left + frame.width * 0.7;
            return (
              <g key={`ref-${ref.label}`}>
                <line x1={x} x2={x} y1={frame.top} y2={frame.top + frame.height} stroke={CHART_INK.reference} strokeWidth={1.25} strokeDasharray="5 4" />
                <text
                  x={nearRight ? x - 6 : x + 6}
                  y={frame.top + frame.height - 8}
                  textAnchor={nearRight ? "end" : "start"}
                  fontSize={11}
                  fill={CHART_INK.reference}
                  fontWeight={500}
                  paintOrder="stroke"
                  stroke={CHART_INK.surface}
                  strokeWidth={3}
                >
                  <SvgScript text={ref.label} />
                </text>
              </g>
            );
          })}

          {/* Per-borehole trend lines */}
          {connect
            ? Array.from(series.entries()).map(([id, pts]) =>
                pts.length > 1 ? (
                  <polyline
                    key={`line-${id}`}
                    points={pts.map((d) => `${s.x(d.value).toFixed(1)},${s.y(d.depth).toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke={styles.get(id)?.colour}
                    strokeWidth={1.5}
                    strokeOpacity={hover && hover.boreholeId !== id ? 0.15 : 0.45}
                    strokeLinejoin="round"
                  />
                ) : null,
              )
            : null}

          {/* Hover crosshair (depth) */}
          {hover ? (
            <line x1={frame.left} x2={hx} y1={hy} y2={hy} stroke={CHART_INK.axis} strokeWidth={1} strokeDasharray="2 3" />
          ) : null}

          {/* Markers: colour + shape per borehole, 1.25px surface ring keeps overlaps legible */}
          {data.map((d, i) => {
            const st = styles.get(d.boreholeId);
            if (!st) return null;
            const dim = hover && hover.boreholeId !== d.boreholeId;
            return (
              <path
                key={`${d.boreholeId}-${d.depth}-${i}`}
                d={markerPath(st.shape, s.x(d.value), s.y(d.depth), MARKER_R)}
                fill={st.colour}
                fillOpacity={dim ? 0.35 : 1}
                stroke={CHART_INK.surface}
                strokeWidth={1.25}
              />
            );
          })}
          {hover && hoverStyle ? (
            <path d={markerPath(hoverStyle.shape, hx, hy, MARKER_R + 2)} fill={hoverStyle.colour} stroke={CHART_INK.surface} strokeWidth={2} />
          ) : null}
        </svg>

        {hover && hoverStyle ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[9rem] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(hx + 12, 4), width - 160),
              top: Math.max(hy - 64, 4),
            }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <MarkerSwatch shape={hoverStyle.shape} colour={hoverStyle.colour} />
              {hover.boreholeId}
            </div>
            <div className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 tabular-nums text-slate-600">
              <span>Depth</span>
              <span className="text-right font-medium text-slate-900">
                {formatValue(hover.depth)} {spec.depthUnit}
              </span>
              <span>
                <ScriptText text={name} />
              </span>
              <span className="text-right font-medium text-slate-900">{formatValue(hover.value)}</span>
            </div>
          </div>
        ) : null}
      </div>

      {styles.size > 0 ? (
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-[58px] text-xs text-slate-600" aria-label="Boreholes">
          {Array.from(styles.entries()).map(([id, st]) => (
            <li key={id} className="inline-flex items-center gap-1.5">
              <MarkerSwatch shape={st.shape} colour={st.colour} />
              {id}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
