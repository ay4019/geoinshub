"use client";

import type { UnitSystem } from "@/lib/types";

import { EngineeringText } from "@/components/engineering-text";
import { getDisplayUnit } from "@/lib/tool-units";

interface BearingCapacityVisualProps {
  values: Record<string, string>;
  unitSystem: UnitSystem;
  title?: string;
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatValue(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString();
}

export function BearingCapacityVisual({ values, unitSystem, title }: BearingCapacityVisualProps) {
  const method = values.method || (title?.toLowerCase().includes("eurocode") ? "eurocode 7" : "terzaghi");
  const width = Math.max(0.5, toNumber(values.width, 2));
  const length = Math.max(0.5, toNumber(values.length, 3));
  const embedment = Math.max(0, toNumber(values.embedment, 1.2));
  const cohesion = Math.max(0, toNumber(values.cohesion, 10));
  const frictionAngle = Math.max(0, toNumber(values.frictionAngle, 30));
  const unitWeight = Math.max(0, toNumber(values.unitWeight, 18));
  const factorOfSafety = Math.max(1, toNumber(values.factorOfSafety, 3));

  const widthScale = Math.min(240, Math.max(120, width * 48));
  const footingX = 180 - widthScale / 2;
  const footingY = 172;
  const soilSurfaceY = 146;
  const bulbDepth = Math.min(120, 44 + width * 20);
  const methodLabel = method
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const lengthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const densityUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Interactive Foundation Sketch</p>
          <p className="mt-1 text-sm text-slate-700">
            <EngineeringText text={`Method: ${methodLabel}`} />
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          Rectangular footing
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <svg viewBox="0 0 360 280" className="h-auto w-full" role="img" aria-label="Bearing capacity soil and footing visual">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f8fbff" />
                <stop offset="100%" stopColor="#eef4fb" />
              </linearGradient>
              <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#caa67a" />
                <stop offset="100%" stopColor="#9f764d" />
              </linearGradient>
              <linearGradient id="footing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#dbe7f3" />
                <stop offset="100%" stopColor="#94a9be" />
              </linearGradient>
              <pattern id="soilDots" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="1.1" fill="#8f6642" opacity="0.5" />
                <circle cx="13" cy="10" r="1.4" fill="#7d5738" opacity="0.45" />
                <circle cx="8" cy="15" r="1" fill="#c7a27f" opacity="0.55" />
              </pattern>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#475569" />
              </marker>
            </defs>

            <rect x="0" y="0" width="360" height="280" fill="url(#sky)" />
            <rect x="0" y={soilSurfaceY} width="360" height={280 - soilSurfaceY} fill="url(#soil)" />
            <rect x="0" y={soilSurfaceY} width="360" height={280 - soilSurfaceY} fill="url(#soilDots)" opacity="0.55" />

            <line x1="0" y1={soilSurfaceY} x2="360" y2={soilSurfaceY} stroke="#8b6946" strokeWidth="2" />

            <ellipse
              cx="180"
              cy={footingY + 26 + bulbDepth / 2}
              rx={Math.min(130, widthScale * 0.58)}
              ry={bulbDepth / 2}
              fill="#f6d365"
              opacity="0.16"
            />
            <path
              d={`M ${footingX + 12} ${footingY + 22}
                  C ${footingX + 26} ${footingY + 54}, ${footingX + 32} ${footingY + 78}, 180 ${footingY + 24 + bulbDepth}
                  C ${footingX + widthScale - 32} ${footingY + 78}, ${footingX + widthScale - 26} ${footingY + 54}, ${footingX + widthScale - 12} ${footingY + 22}`}
              fill="none"
              stroke="#f8fafc"
              strokeWidth="2"
              strokeDasharray="5 5"
              opacity="0.75"
            />

            <rect x={footingX - 10} y={footingY - 14} width={widthScale + 20} height="14" rx="4" fill="#71859b" opacity="0.75" />
            <rect x={footingX} y={footingY} width={widthScale} height="26" rx="6" fill="url(#footing)" stroke="#62768b" strokeWidth="1.5" />

            {[0, 1, 2, 3].map((index) => {
              const x = footingX + 22 + index * ((widthScale - 44) / 3);
              return (
                <line
                  key={index}
                  x1={x}
                  y1="74"
                  x2={x}
                  y2={footingY - 2}
                  stroke="#5f7388"
                  strokeWidth="2.6"
                  markerEnd="url(#arrow)"
                  opacity="0.8"
                />
              );
            })}

            <line x1={footingX} y1="228" x2={footingX + widthScale} y2="228" stroke="#475569" strokeWidth="1.6" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
            <text x="180" y="222" textAnchor="middle" fill="#334155" fontSize="13" fontWeight="600">
              {`B = ${formatValue(width)} ${lengthUnit}`}
            </text>

            <line x1="302" y1={soilSurfaceY} x2="302" y2={footingY} stroke="#475569" strokeWidth="1.6" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
            <text x="314" y={(soilSurfaceY + footingY) / 2 + 4} fill="#334155" fontSize="13" fontWeight="600">
              {`D_f = ${formatValue(embedment)} ${lengthUnit}`}
            </text>

            <rect x="18" y="18" width="108" height="68" rx="12" fill="#ffffff" stroke="#d6e2ee" />
            <text x="30" y="38" fill="#334155" fontSize="12" fontWeight="700">
              Plan ratio
            </text>
            <rect x="38" y="50" width="52" height="24" rx="4" fill="#dfe8f2" stroke="#8aa0b5" />
            <text x="64" y="66" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700">
              {`B`}
            </text>
            <line x1="98" y1="50" x2="98" y2="74" stroke="#8aa0b5" strokeWidth="2" />
            <text x="108" y="66" fill="#334155" fontSize="11" fontWeight="700">
              {`L = ${formatValue(length)} ${lengthUnit}`}
            </text>
          </svg>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current Inputs</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>
                  <EngineeringText text={"c'"} />
                </span>
                <span className="font-semibold">{`${formatValue(cohesion)} ${stressUnit}`}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>
                  <EngineeringText text={"phi'"} />
                </span>
                <span className="font-semibold">{`${formatValue(frictionAngle)} deg`}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>
                  <EngineeringText text={"gamma"} />
                </span>
                <span className="font-semibold">{`${formatValue(unitWeight)} ${densityUnit}`}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>
                  <EngineeringText text={"FS"} />
                </span>
                <span className="font-semibold">{formatValue(factorOfSafety)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4fb_100%)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">What Changes Live</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="text-slate-400">-</span>
                <span>Footing width scales with <EngineeringText text={"B"} />.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400">-</span>
                <span>Embedment arrow updates with <EngineeringText text={"D_f"} />.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400">-</span>
                <span>Method badge reflects Terzaghi, Meyerhof, Hansen, or Vesic.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400">-</span>
                <span>Plan inset updates the rectangular footing geometry using <EngineeringText text={"B"} /> and <EngineeringText text={"L"} />.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
