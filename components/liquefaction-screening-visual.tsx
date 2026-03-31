"use client";

import type { CalculationResult, UnitSystem } from "@/lib/types";
import { getDisplayUnit } from "@/lib/tool-units";

interface LiquefactionScreeningVisualProps {
  values: Record<string, string>;
  result: CalculationResult | null;
  unitSystem: UnitSystem;
}

function getNumericResult(result: CalculationResult | null, label: string): number | null {
  const item = result?.items.find((entry) => entry.label === label);
  if (!item || typeof item.value !== "number") {
    return null;
  }

  return item.value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function LiquefactionScreeningVisual({
  values,
  result,
  unitSystem,
}: LiquefactionScreeningVisualProps) {
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const sampleDepth = Number(values.sampleDepth ?? 0);
  const groundwaterDepth = Number(values.groundwaterDepth ?? 0);
  const tauResistance = getNumericResult(result, "?_R");
  const tauEarthquake = getNumericResult(result, "?_eq");
  const fos = getNumericResult(result, "Factor of safety");
  const minimumFos = getNumericResult(result, "Minimum required FS") ?? (tauResistance !== null || tauEarthquake !== null ? 1.1 : 1);

  const surfacePosition = 32;
  const profileBottomPosition = 92;
  const maxDepth = Math.max(sampleDepth, groundwaterDepth, 1) * 1.35;
  const gwtPosition = clamp(
    surfacePosition + (groundwaterDepth / maxDepth) * (profileBottomPosition - surfacePosition),
    surfacePosition + 4,
    profileBottomPosition - 4,
  );
  const samplePosition = clamp(
    surfacePosition + (sampleDepth / maxDepth) * (profileBottomPosition - surfacePosition),
    surfacePosition + 6,
    profileBottomPosition - 4,
  );
  const hasPotential = fos !== null && fos < minimumFos;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Liquefaction Screening Sketch
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Resistance vs Demand</h2>
        </div>
        {hasPotential ? (
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
            Liquefaction Potential!
          </span>
        ) : fos !== null ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            Screening FoS OK
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="relative h-[300px] overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-b from-sky-50 via-sky-100 to-amber-50">
          <div className="absolute inset-x-0 bottom-0 h-[68%] bg-[radial-gradient(circle_at_12%_15%,rgba(148,163,184,0.18)_0,rgba(148,163,184,0.18)_2px,transparent_2px),radial-gradient(circle_at_65%_30%,rgba(120,113,108,0.14)_0,rgba(120,113,108,0.14)_2px,transparent_2px),linear-gradient(180deg,#d7b180_0%,#c89d6b_100%)] bg-[length:30px_30px,36px_36px,100%_100%]" />
          <div className="absolute inset-x-0 top-[32%] border-t-2 border-slate-300" />

          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-sky-500"
            style={{ top: `${gwtPosition}%` }}
          />
          <div
            className="absolute left-4 rounded-full border border-sky-200 bg-white/90 px-2 py-1 text-xs font-semibold text-sky-700"
            style={{ top: `calc(${gwtPosition}% - 14px)` }}
          >
            GWT = {groundwaterDepth.toFixed(2)} {depthUnit}
          </div>

          <div className="absolute left-1/2 top-6 bottom-[8%] w-[3px] -translate-x-1/2 rounded-full bg-slate-500/70" />
          <div
            className="absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-slate-700 bg-white shadow-sm"
            style={{ top: `calc(${samplePosition}% - 10px)` }}
          />
          <div
            className="absolute left-1/2 h-10 w-[2px] -translate-x-1/2 border-l-2 border-dashed border-slate-500/70"
            style={{ top: `calc(${samplePosition}% - 5px)` }}
          />
          <div
            className="absolute left-[calc(50%+42px)] rounded-full border border-slate-300 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-700"
            style={{ top: `calc(${samplePosition}% - 12px)` }}
          >
            z = {sampleDepth.toFixed(2)} {depthUnit}
          </div>

          <div className="absolute inset-x-0 bottom-3 flex justify-between px-4 text-xs font-medium text-slate-600">
            <span>Ground surface</span>
            <span>
              {fos === null ? (
                "Run the calculation to compare resistance and demand."
              ) : hasPotential ? (
                <span className="font-semibold text-red-700">
                  Liquefaction Potential!
                </span>
              ) : (
                <span className="font-semibold text-emerald-700">
                  Screening FoS OK
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}


