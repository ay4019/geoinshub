"use client";

import { useState } from "react";

import { ScriptText } from "@/components/script-text";
import { splitSubscripts } from "@/lib/charts/depth-profile";

import { SOIL_TYPES, SOIL_TYPE_ORDER, type StrataSoilType } from "@/lib/design-tools/pile-strata";
import { convertInputToMetric, convertMetricToDisplay, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

/* ───────────────────────────── units ───────────────────────────── */

export function displayUnit(unit: string, unitSystem: UnitSystem): string {
  const shown = getDisplayUnit(unit, unitSystem) ?? unit;
  return shown === "kN/m3" ? "kN/m³" : shown;
}

export function toDisplay(value: number, unit: string, unitSystem: UnitSystem): number {
  return convertMetricToDisplay(value, unit, unitSystem);
}

export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "–";
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "12.5 m" / "41.0 ft" from an SI value. */
export function formatQty(value: number, unit: string, unitSystem: UnitSystem, digits = 1): string {
  const shown = displayUnit(unit, unitSystem);
  const v = toDisplay(value, unit, unitSystem);
  const d = unitSystem === "american" && (unit === "kPa" || unit === "kN") && Math.abs(v) < 100 ? Math.max(digits, 2) : digits;
  return `${formatNumber(v, d)} ${shown}`;
}

/* ───────────────────────────── inputs ───────────────────────────── */

interface UnitNumberInputProps {
  id?: string;
  value: number;
  /** Metric unit of `value` (m, kPa, kN/m3…); undefined for dimensionless values. */
  unit?: string;
  unitSystem: UnitSystem;
  onChange: (siValue: number) => void;
  step?: number;
  min?: number;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
  suffix?: string;
}

function trimNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(Math.abs(value) >= 100 ? 1 : 3)));
}

/** Number field that shows the value in the active unit system and reports SI values back. */
export function UnitNumberInput({
  id,
  value,
  unit,
  unitSystem,
  onChange,
  step,
  min,
  invalid,
  className,
  ariaLabel,
  suffix,
}: UnitNumberInputProps) {
  const shown = unit ? toDisplay(value, unit, unitSystem) : value;
  // While the field is being edited, show the raw draft; otherwise follow the (possibly slider-driven) value.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? trimNumber(shown);

  const unitLabel = suffix ?? (unit ? displayUnit(unit, unitSystem) : "");

  return (
    <div
      className={`flex items-center overflow-hidden rounded-md border bg-white transition-colors focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200 ${
        invalid ? "border-red-400 bg-red-50/40" : "border-slate-300"
      } ${className ?? ""}`}
    >
      <input
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        type="number"
        inputMode="decimal"
        step={step ?? "any"}
        min={min}
        value={text}
        onFocus={() => setDraft(trimNumber(shown))}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = Number(event.target.value);
          if (event.target.value.trim() === "" || !Number.isFinite(parsed)) {
            onChange(Number.NaN);
            return;
          }
          onChange(unit ? convertInputToMetric(parsed, unit, unitSystem) : parsed);
        }}
        className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm tabular-nums text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {unitLabel ? <span className="shrink-0 pr-2 text-xs text-slate-500">{unitLabel}</span> : null}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  /** `locked` options show a padlock and call onLocked instead of onChange (the caller decides what a locked pick does). */
  options: Array<{ value: T; label: string; locked?: boolean }>;
  onChange: (value: T) => void;
  onLocked?: (value: T) => void;
  size?: "sm" | "md";
  ariaLabel: string;
}

export function Segmented<T extends string>({ value, options, onChange, onLocked, size = "md", ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.locked ? "Gold membership required" : undefined}
            onClick={() => (option.locked ? onLocked?.(option.value) : onChange(option.value))}
            className={`inline-flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md font-medium transition-all ${size === "sm" ? "px-2 py-1 text-xs" : "px-2 py-1.5 text-[13px]"} ${
              active ? "bg-white text-slate-900 shadow-sm" : option.locked ? "text-slate-400 hover:text-slate-600" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {option.locked ? (
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="4" y="9" width="12" height="9" rx="2" />
                <path d="M7 9V6a3 3 0 0 1 6 0v3" />
              </svg>
            ) : null}
            <span>
              <ScriptText text={option.label} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * SVG counterpart of ScriptText: Unicode subscript glyphs (Rᵤ, N₆₀) become lowered, smaller <tspan>s in the
 * page font instead of falling back to a tiny glyph font.
 */
export function SvgScript({ text }: { text: string }) {
  const segs = splitSubscripts(text);
  return (
    <>
      {segs.map((seg, i) => {
        const lowered = segs[i - 1]?.sub ?? false;
        const dy = seg.sub && !lowered ? "0.28em" : !seg.sub && lowered ? "-0.28em" : undefined;
        return (
          <tspan key={i} dy={dy} fontSize={seg.sub ? "0.74em" : undefined}>
            {seg.text}
          </tspan>
        );
      })}
    </>
  );
}

/* ───────────────────────────── soil patterns ───────────────────────────── */

/** SVG <pattern> fills, one per soil type: id = `${prefix}-${type}`. */
export function SoilPatternDefs({ prefix }: { prefix: string }) {
  return (
    <>
      {SOIL_TYPE_ORDER.map((type) => {
        const { fill, ink } = SOIL_TYPES[type];
        const id = `${prefix}-${type}`;
        switch (type) {
          case "clay":
            return (
              <pattern key={type} id={id} width="18" height="10" patternUnits="userSpaceOnUse">
                <rect width="18" height="10" fill={fill} />
                <line x1="2" y1="3" x2="10" y2="3" stroke={ink} strokeWidth="1.1" opacity="0.55" />
                <line x1="11" y1="8" x2="17" y2="8" stroke={ink} strokeWidth="1.1" opacity="0.55" />
              </pattern>
            );
          case "silty-clay":
            return (
              <pattern key={type} id={id} width="18" height="12" patternUnits="userSpaceOnUse">
                <rect width="18" height="12" fill={fill} />
                <line x1="2" y1="3" x2="10" y2="3" stroke={ink} strokeWidth="1.1" opacity="0.5" />
                <circle cx="14" cy="3" r="0.9" fill={ink} opacity="0.6" />
                <circle cx="5" cy="9" r="0.9" fill={ink} opacity="0.6" />
                <line x1="9" y1="9" x2="16" y2="9" stroke={ink} strokeWidth="1.1" opacity="0.5" />
              </pattern>
            );
          case "silt":
            return (
              <pattern key={type} id={id} width="12" height="9" patternUnits="userSpaceOnUse">
                <rect width="12" height="9" fill={fill} />
                <line x1="1" y1="2.5" x2="5" y2="2.5" stroke={ink} strokeWidth="0.9" strokeDasharray="1 1.4" opacity="0.65" />
                <line x1="7" y1="7" x2="11" y2="7" stroke={ink} strokeWidth="0.9" strokeDasharray="1 1.4" opacity="0.65" />
              </pattern>
            );
          case "sand":
            return (
              <pattern key={type} id={id} width="11" height="11" patternUnits="userSpaceOnUse">
                <rect width="11" height="11" fill={fill} />
                <circle cx="2" cy="2" r="0.9" fill={ink} opacity="0.65" />
                <circle cx="7.5" cy="4" r="0.7" fill={ink} opacity="0.55" />
                <circle cx="4" cy="8" r="0.8" fill={ink} opacity="0.6" />
                <circle cx="9.5" cy="9.5" r="0.6" fill={ink} opacity="0.5" />
              </pattern>
            );
          case "silty-sand":
            return (
              <pattern key={type} id={id} width="14" height="12" patternUnits="userSpaceOnUse">
                <rect width="14" height="12" fill={fill} />
                <circle cx="2.5" cy="2.5" r="0.85" fill={ink} opacity="0.6" />
                <circle cx="10" cy="5" r="0.75" fill={ink} opacity="0.55" />
                <line x1="3" y1="9" x2="8" y2="9" stroke={ink} strokeWidth="0.9" opacity="0.5" />
              </pattern>
            );
          case "gravel":
          default:
            return (
              <pattern key={type} id={id} width="20" height="16" patternUnits="userSpaceOnUse">
                <rect width="20" height="16" fill={fill} />
                <ellipse cx="5" cy="4.5" rx="2.6" ry="1.9" fill="none" stroke={ink} strokeWidth="0.9" opacity="0.7" />
                <ellipse cx="14.5" cy="7" rx="2" ry="1.5" fill="none" stroke={ink} strokeWidth="0.9" opacity="0.6" />
                <ellipse cx="8" cy="12.5" rx="2.2" ry="1.6" fill="none" stroke={ink} strokeWidth="0.9" opacity="0.65" />
                <circle cx="17" cy="14" r="0.8" fill={ink} opacity="0.55" />
              </pattern>
            );
        }
      })}
    </>
  );
}

/** Small swatch of a soil type's fill, used in lists and selects. */
export function SoilSwatch({ type, size = 22 }: { type: StrataSoilType; size?: number }) {
  const prefix = `sw-${type}`;
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="shrink-0 rounded">
      <defs>
        <SoilPatternDefs prefix={prefix} />
      </defs>
      <rect x="0.5" y="0.5" width="21" height="21" rx="4" fill={`url(#${prefix}-${type})`} stroke="#94a3b8" strokeWidth="0.8" />
    </svg>
  );
}

/* ───────────────────────────── axes ───────────────────────────── */

/** "Nice" tick step for a span covered by about `target` ticks. */
export function niceStep(span: number, target = 6): number {
  if (!(span > 0)) return 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

export function niceCeil(value: number, target = 6): number {
  const step = niceStep(value, target);
  return Math.max(step, Math.ceil(value / step) * step);
}

/** Depth scale shared by the section and the capacity chart so their rows line up. */
export interface DepthScale {
  maxDepth: number;
  top: number;
  bottom: number;
  height: number;
  y: (z: number) => number;
  z: (y: number) => number;
}

export function createDepthScale(maxDepth: number, height: number, top: number, bottomPad: number): DepthScale {
  const bottom = height - bottomPad;
  const span = bottom - top;
  return {
    maxDepth,
    top,
    bottom,
    height,
    y: (z: number) => top + (z / maxDepth) * span,
    z: (y: number) => ((y - top) / span) * maxDepth,
  };
}

/** Pointer position in SVG viewBox coordinates. */
export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number, viewWidth: number, viewHeight: number) {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * viewWidth,
    y: ((clientY - rect.top) / rect.height) * viewHeight,
    px: clientX - rect.left,
    py: clientY - rect.top,
    width: rect.width,
    height: rect.height,
  };
}
