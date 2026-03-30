"use client";

import { EngineeringText } from "@/components/engineering-text";
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
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";

  const sampleDepth = Number(values.sampleDepth ?? 0);
  const groundwaterDepth = Number(values.groundwaterDepth ?? 0);
  const tauResistance = getNumericResult(result, "τ_R");
  const tauEarthquake = getNumericResult(result, "τ_eq");
  const crrMagnitude = getNumericResult(result, "CRR_M");
  const csr = getNumericResult(result, "CSR");
  const fos = getNumericResult(result, "Factor of safety");
  const minimumFos = getNumericResult(result, "Minimum required FS") ?? (tauResistance !== null || tauEarthquake !== null ? 1.1 : 1);

  const resistanceValue = tauResistance ?? crrMagnitude;
  const demandValue = tauEarthquake ?? csr;
  const isStressView = tauResistance !== null || tauEarthquake !== null;
  const comparisonUnit = isStressView ? stressUnit : "";

  const maxDepth = Math.max(sampleDepth, groundwaterDepth, 1) * 1.25;
  const gwtPosition = clamp((groundwaterDepth / maxDepth) * 100, 6, 92);
  const samplePosition = clamp((sampleDepth / maxDepth) * 100, 8, 94);
  const maxComparison = Math.max(resistanceValue ?? 0, demandValue ?? 0, 1);
  const resistanceWidth = `${((resistanceValue ?? 0) / maxComparison) * 100}%`;
  const demandWidth = `${((demandValue ?? 0) / maxComparison) * 100}%`;
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

      <div className="mt-4 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="relative h-[280px] overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-b from-sky-50 via-sky-100 to-amber-50">
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

            <div className="absolute bottom-[32%] left-1/2 top-6 w-[3px] -translate-x-1/2 rounded-full bg-slate-500/70" />
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
              <span>Liquefaction screening depth sketch</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Demand and Resistance</p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{isStressView ? "τ_R resistance" : "CRR_M resistance"}</span>
                  <span className="font-semibold text-slate-900">
                    {resistanceValue !== null
                      ? `${resistanceValue.toFixed(2)}${comparisonUnit ? ` ${comparisonUnit}` : ""}`
                      : "-"}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: resistanceWidth }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{isStressView ? "τ_eq demand" : "CSR demand"}</span>
                  <span className="font-semibold text-slate-900">
                    {demandValue !== null ? `${demandValue.toFixed(2)}${comparisonUnit ? ` ${comparisonUnit}` : ""}` : "-"}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${hasPotential ? "bg-red-500" : "bg-slate-700"}`}
                    style={{ width: demandWidth }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Interpretation</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                <EngineeringText
                  text={
                    isStressView
                      ? "Liquefaction screening compares τ_R against τ_eq at the selected sample depth."
                      : "Liquefaction screening compares CRR_M against CSR at the selected sample depth."
                  }
                />
              </p>
              <p>
                {fos === null ? (
                  "Run the calculation to compare cyclic resistance and earthquake demand."
                ) : hasPotential ? (
                  <span className="font-semibold text-red-700">
                    Liquefaction Potential! The screening result is below the method-specific FoS requirement.
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-700">
                    The screening result remains above the method-specific FoS requirement for this sample.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
