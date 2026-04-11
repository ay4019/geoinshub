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
  const footingStroke = "#0f172a";
  const dimStroke = "#334155";
  const soilStroke = "#6b4f33";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Foundation sketch</p>
          <p className="mt-1 text-sm text-slate-700">
            <EngineeringText text={`Method: ${methodLabel}`} />
          </p>
        </div>
      </div>

      <div className="p-3">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-2">
          <svg
            viewBox="0 0 360 280"
            preserveAspectRatio="xMidYMid meet"
            className="h-auto w-full max-h-64"
            role="img"
            aria-label="Bearing capacity soil and footing visual"
          >
            <defs>
              <pattern id="soilHatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
                <line x1="0" y1="0" x2="0" y2="14" stroke="#b08a62" strokeWidth="3" opacity="0.28" />
              </pattern>
              <linearGradient id="stressBulb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.06" />
              </linearGradient>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill={dimStroke} />
              </marker>
            </defs>

            <rect x="0" y="0" width="360" height="280" fill="#ffffff" />
            <rect x="0" y={soilSurfaceY} width="360" height={280 - soilSurfaceY} fill="#d7b48c" />
            <rect x="0" y={soilSurfaceY} width="360" height={280 - soilSurfaceY} fill="url(#soilHatch)" />

            <line x1="0" y1={soilSurfaceY} x2="360" y2={soilSurfaceY} stroke={soilStroke} strokeWidth="2" />

            <ellipse
              cx="180"
              cy={footingY + 26 + bulbDepth / 2}
              rx={Math.min(130, widthScale * 0.58)}
              ry={bulbDepth / 2}
              fill="url(#stressBulb)"
            />
            <path
              d={`M ${footingX + 12} ${footingY + 22}
                  C ${footingX + 26} ${footingY + 54}, ${footingX + 32} ${footingY + 78}, 180 ${footingY + 24 + bulbDepth}
                  C ${footingX + widthScale - 32} ${footingY + 78}, ${footingX + widthScale - 26} ${footingY + 54}, ${footingX + widthScale - 12} ${footingY + 22}`}
              fill="none"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.5"
            />

            <rect x={footingX - 10} y={footingY - 14} width={widthScale + 20} height="14" rx="4" fill="#0f172a" opacity="0.12" />
            <rect x={footingX} y={footingY} width={widthScale} height="26" rx="6" fill="#e2e8f0" stroke={footingStroke} strokeWidth="1.2" />

            {[0, 1, 2, 3].map((index) => {
              const x = footingX + 22 + index * ((widthScale - 44) / 3);
              return (
                <line
                  key={index}
                  x1={x}
                  y1="74"
                  x2={x}
                  y2={footingY - 2}
                  stroke="#64748b"
                  strokeWidth="2.2"
                  markerEnd="url(#arrow)"
                  opacity="0.8"
                />
              );
            })}

            <line
              x1={footingX}
              y1="228"
              x2={footingX + widthScale}
              y2="228"
              stroke={dimStroke}
              strokeWidth="1.6"
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
            />
            <text x="180" y="222" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="600">
              {`B = ${formatValue(width)} ${lengthUnit}`}
            </text>

            <line
              x1="302"
              y1={soilSurfaceY}
              x2="302"
              y2={footingY}
              stroke={dimStroke}
              strokeWidth="1.6"
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
            />
            <text
              x="292"
              y={(soilSurfaceY + footingY) / 2 + 4}
              fill="#0f172a"
              fontSize="12"
              fontWeight="700"
              textAnchor="end"
            >
              <tspan>D</tspan>
              <tspan baselineShift="sub" fontSize="9">
                f
              </tspan>
              <tspan>{` = ${formatValue(embedment)} ${lengthUnit}`}</tspan>
            </text>

            <rect x="18" y="18" width="150" height="86" rx="12" fill="#ffffff" stroke="#cbd5e1" />
            <text x="30" y="38" fill="#0f172a" fontSize="12" fontWeight="700">
              Soil parameters
            </text>
            <text x="30" y="58" fill="#334155" fontSize="11" fontWeight="600">
              <tspan>c</tspan>
              <tspan>′</tspan>
              <tspan>{` = ${formatValue(cohesion, 1)} ${stressUnit}`}</tspan>
            </text>
            <text x="30" y="74" fill="#334155" fontSize="11" fontWeight="600">
              <tspan>ϕ</tspan>
              <tspan>′</tspan>
              <tspan>{` = ${formatValue(frictionAngle, 1)} deg`}</tspan>
            </text>
            <text x="30" y="90" fill="#334155" fontSize="11" fontWeight="600">
              <tspan>γ</tspan>
              <tspan>{` = ${formatValue(unitWeight, 1)} ${densityUnit}`}</tspan>
            </text>

            {/* Plan view inset showing B and L */}
            <g opacity="0.98">
              <rect x="242" y="18" width="100" height="88" rx="12" fill="#ffffff" stroke="#cbd5e1" />
              <text x="254" y="38" fill="#0f172a" fontSize="12" fontWeight="700">
                Plan
              </text>

              {/* Footing rectangle */}
              <rect x="268" y="50" width="48" height="34" rx="4" fill="#e2e8f0" stroke={footingStroke} strokeWidth="1.1" />

              {/* B dimension (horizontal) */}
              <line x1="268" y1="92" x2="316" y2="92" stroke={dimStroke} strokeWidth="1.3" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
              <text x="292" y="104" fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="middle">
                {`B = ${formatValue(width, 2)} ${lengthUnit}`}
              </text>

              {/* L dimension (vertical) */}
              <line x1="256" y1="50" x2="256" y2="84" stroke={dimStroke} strokeWidth="1.3" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
              <text x="252" y="70" fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="end">
                {`L = ${formatValue(length, 2)} ${lengthUnit}`}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
