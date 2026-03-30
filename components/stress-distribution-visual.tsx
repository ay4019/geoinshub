"use client";

import { EngineeringText } from "@/components/engineering-text";
import type { UnitSystem } from "@/lib/types";
import { getDisplayUnit } from "@/lib/tool-units";

interface StressDistributionVisualProps {
  values: Record<string, string>;
  unitSystem: UnitSystem;
}

function parse(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function StressDistributionVisual({ values, unitSystem }: StressDistributionVisualProps) {
  const method =
    values.method === "thirty-degree" || values.method === "boussinesq" || values.method === "two-to-one"
      ? values.method
      : "two-to-one";

  const q = parse(values.appliedPressure, 150);
  const b = Math.max(parse(values.width, 2), 0.1);
  const l = Math.max(parse(values.length, 3), 0.1);
  const z = Math.max(parse(values.depth, 2), 0);

  const lengthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";

  const methodLabel =
    method === "two-to-one" ? "2:1 Method" : method === "thirty-degree" ? "30 Degree Method" : "Boussinesq";

  const slopeSpread = method === "two-to-one" ? 0.5 : Math.tan(Math.PI / 6);
  const spreadText =
    method === "boussinesq"
      ? "Elastic half-space stress bulb"
      : `Spread width at z: ${(b + 2 * slopeSpread * z).toFixed(2)} ${lengthUnit}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Interactive Stress Sketch</p>
          <p className="mt-1 text-sm text-slate-700">Method: {methodLabel}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          Rectangular foundation
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <svg viewBox="0 0 720 430" className="h-full w-full" role="img" aria-label="Stress distribution sketch">
            <defs>
              <linearGradient id="soilFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#d9b17f" />
                <stop offset="100%" stopColor="#be9464" />
              </linearGradient>
              <linearGradient id="footingFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#dbe8f6" />
                <stop offset="100%" stopColor="#a8c2df" />
              </linearGradient>
              <pattern id="soilDots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="7" cy="8" r="2" fill="#a87b4f" opacity="0.35" />
                <circle cx="17" cy="15" r="1.6" fill="#a87b4f" opacity="0.3" />
              </pattern>
              <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#475569" />
              </marker>
            </defs>

            <rect x="0" y="0" width="720" height="430" fill="#f8fafc" />
            <rect x="0" y="205" width="720" height="225" fill="url(#soilFill)" />
            <rect x="0" y="205" width="720" height="225" fill="url(#soilDots)" />
            <line x1="0" y1="205" x2="720" y2="205" stroke="#8e7559" strokeWidth="4" />

            <rect x="238" y="220" width="244" height="48" rx="12" fill="url(#footingFill)" stroke="#6982a0" strokeWidth="3" />
            <rect x="220" y="205" width="280" height="24" rx="8" fill="#8a97a7" />

            <line x1="190" y1="220" x2="190" y2="330" stroke="#475569" strokeWidth="3" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" />
            <text x="212" y="278" fill="#1e3a5f" fontSize="20" fontWeight="700">
              {`z = ${z.toFixed(2)} ${lengthUnit}`}
            </text>

            <line x1="238" y1="330" x2="482" y2="330" stroke="#475569" strokeWidth="3" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" />
            <text x="311" y="319" fill="#1e3a5f" fontSize="20" fontWeight="700">
              {`B = ${b.toFixed(2)} ${lengthUnit}`}
            </text>

            <g stroke="#f8fafc" strokeWidth="4" fill="none" strokeDasharray={method === "boussinesq" ? "0" : "10 8"}>
              {method === "two-to-one" ? (
                <>
                  <line x1="270" y1="268" x2="205" y2="405" />
                  <line x1="450" y1="268" x2="515" y2="405" />
                </>
              ) : null}
              {method === "thirty-degree" ? (
                <>
                  <line x1="270" y1="268" x2="160" y2="405" />
                  <line x1="450" y1="268" x2="560" y2="405" />
                </>
              ) : null}
              {method === "boussinesq" ? (
                <path d="M250 268 C210 300, 175 350, 170 410" />
              ) : null}
              {method === "boussinesq" ? (
                <path d="M470 268 C510 300, 545 350, 550 410" />
              ) : null}
            </g>

            {method === "boussinesq" ? (
              <ellipse cx="360" cy="348" rx="138" ry="74" fill="#d3a95d" opacity="0.28" />
            ) : (
              <path
                d={method === "two-to-one" ? "M270 268 L205 405 L515 405 L450 268 Z" : "M270 268 L160 405 L560 405 L450 268 Z"}
                fill="#d3a95d"
                opacity="0.26"
              />
            )}

            <g>
              <rect x="34" y="34" width="214" height="114" rx="18" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
              <text x="58" y="70" fill="#0f172a" fontSize="18" fontWeight="700">
                Plan ratio
              </text>
              <rect x="72" y="92" width="92" height="46" rx="8" fill="#d7e5f4" stroke="#6b7f97" strokeWidth="2.5" />
              <text x="106" y="121" fill="#1f3f67" fontSize="28" fontWeight="700">
                B
              </text>
              <line x1="182" y1="91" x2="182" y2="138" stroke="#6b7f97" strokeWidth="3" />
              <text x="202" y="121" fill="#1f3f67" fontSize="24" fontWeight="700">
                {`L = ${l.toFixed(2)} ${lengthUnit}`}
              </text>
            </g>

            <text x="34" y="396" fill="#1e293b" fontSize="17" fontWeight="600">
              {spreadText}
            </text>
            <text x="34" y="418" fill="#475569" fontSize="15">
              {`Applied pressure q = ${q.toFixed(1)} ${stressUnit}`}
            </text>
          </svg>
        </div>

        <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current inputs</p>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">q</dt>
                <dd className="font-semibold text-slate-900">{q.toFixed(1)} {stressUnit}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">B</dt>
                <dd className="font-semibold text-slate-900">{b.toFixed(2)} {lengthUnit}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">L</dt>
                <dd className="font-semibold text-slate-900">{l.toFixed(2)} {lengthUnit}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">z</dt>
                <dd className="font-semibold text-slate-900">{z.toFixed(2)} {lengthUnit}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">What updates live</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-slate-400">-</span>
                <EngineeringText text="Switching method redraws the stress spread geometry." />
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-slate-400">-</span>
                <EngineeringText text="Width B, length L, and depth z rescale the foundation and stress bulb." />
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-slate-400">-</span>
                <EngineeringText text="Boussinesq is shown as a centreline elastic stress bulb rather than an area-average spread." />
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
