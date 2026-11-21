"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { CapacityChart, CapacityLegend, type CapacityValues } from "@/components/pile/capacity-chart";
import {
  Segmented,
  UnitNumberInput,
  createDepthScale,
  formatNumber,
  formatQty,
  niceCeil,
} from "@/components/pile/pile-shared";
import { SIDE_COLOUR, SoilSection, TOE_COLOUR } from "@/components/pile/soil-section";
import { DETAILS_ANCHOR, TierGate, scrollToDetails, type DetailLevel } from "@/components/calculation/result-panels";
import { EngineeringText } from "@/components/engineering-text";
import { ScriptText } from "@/components/script-text";
import { buildPileReportPayload } from "@/lib/reports/pile-report";
import {
  CODE_LABEL,
  MATERIAL_UNIT_WEIGHT,
  NQ_METHOD_LABEL,
  analysePile,
  capacityCurve,
  resolveParameters,
  type PileAnalysis,
} from "@/lib/design-tools/pile-design";
import {
  DEFAULT_TBDY_FACTORS,
  deriveStrata,
  type DesignCode,
  type NqMethod,
  type PileDesignModel,
  type PileMaterial,
  type PileType,
} from "@/lib/design-tools/pile-strata";
import type { UnitSystem } from "@/lib/types";

interface PileCapacityTabProps {
  model: PileDesignModel;
  onChange: (next: PileDesignModel) => void;
  unitSystem: UnitSystem;
  onEditStrata: () => void;
  /** AASHTO and TBDY need a signed-in Gold member. */
  premiumCodesUnlocked: boolean;
  membershipLoading: boolean;
  isSignedIn: boolean;
  detailLevel: DetailLevel;
}

const VIEW_HEIGHT = 600;

export const DESIGN_SHORT: Record<DesignCode, string> = { ec7: "R_c,d", aashto: "R_R", tbdy: "R_a" };

const DEFAULT_NQ: Record<"ec7" | "tbdy", NqMethod> = { ec7: "berezantsev", tbdy: "navfac" };

export function PileCapacityTab({
  model,
  onChange,
  unitSystem,
  onEditStrata,
  premiumCodesUnlocked,
  membershipLoading,
  isSignedIn,
  detailLevel,
}: PileCapacityTabProps) {
  const [lockedCode, setLockedCode] = useState<DesignCode | null>(null);
  const strata = useMemo(() => deriveStrata(model), [model]);
  const outcome = useMemo(() => analysePile(model, strata), [model, strata]);
  const analysis = outcome.analysis;
  const params = resolveParameters(model);
  const [hoverDepth, setHoverDepth] = useState<number | null>(null);

  const D = Number.isFinite(model.diameter) ? model.diameter : 0.8;
  const L = Number.isFinite(model.length) ? model.length : 10;
  const head = Number.isFinite(model.headDepth) ? model.headDepth : 0;
  const toe = head + L;
  const lengthSliderMax = Math.min(Math.max(Math.ceil(strata.totalThickness + 10 - head), 30), 100);
  const maxDepth = niceCeil(Math.max(strata.totalThickness, toe + Math.max(3, 4 * D), 6) * 1.04, 8);
  const scale = createDepthScale(maxDepth, VIEW_HEIGHT, 62, 22);

  const curve = useMemo(() => (analysis ? capacityCurve(model, strata, maxDepth, 64) : []), [analysis, model, strata, maxDepth]);
  const computeAt = useCallback(
    (toeDepth: number): CapacityValues | null => {
      const r = analysePile(model, strata, toeDepth - model.headDepth).analysis;
      return r ? { side: r.shaft, base: r.base.resistance, ultimate: r.ultimate, design: r.design.value } : null;
    },
    [model, strata],
  );

  const set = (patch: Partial<PileDesignModel>) => onChange({ ...model, ...patch });
  const setCode = (code: DesignCode) =>
    set({
      code,
      deductWeight: code === "ec7",
      kOverride: null,
      deltaRatioOverride: null,
      alphaOverride: null,
      nqMethod: code === "aashto" ? model.nqMethod : DEFAULT_NQ[code],
    });
  const setPileType = (pileType: PileType) =>
    set({
      pileType,
      kOverride: null,
      deltaRatioOverride: null,
      criticalDepthFactor: null,
      material: pileType === "driven" ? model.material : "concrete",
      pileUnitWeight: pileType === "driven" ? MATERIAL_UNIT_WEIGHT[model.material] : MATERIAL_UNIT_WEIGHT.concrete,
    });

  const designShort = DESIGN_SHORT[model.code];
  const sideShare = analysis ? analysis.shaft / Math.max(analysis.ultimate, 1e-9) : 0;
  const errors = outcome.errors;
  /** AASHTO / TBDY picked without Gold: the results are shown blurred behind a Gold call to action. */
  const codeLocked = !premiumCodesUnlocked && !membershipLoading && model.code !== "ec7";
  const codeName = CODE_LABEL[model.code];

  return (
    <section className="space-y-5">
      <StrataSummary model={model} strata={strata} unitSystem={unitSystem} onEditStrata={onEditStrata} />

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Controls */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step 2 of 2</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Pile & design code</h2>
          </div>

          <ControlBlock label={`Design code · ${CODE_LABEL[model.code]}`}>
            <Segmented<DesignCode>
              ariaLabel="Design code"
              value={model.code}
              onChange={(code) => {
                setLockedCode(null);
                setCode(code);
              }}
              onLocked={(code) => {
                setLockedCode(code);
                setCode(code);
              }}
              options={[
                { value: "ec7", label: "EC7" },
                { value: "aashto", label: "AASHTO", locked: !premiumCodesUnlocked },
                { value: "tbdy", label: "TBDY", locked: !premiumCodesUnlocked },
              ]}
            />
            {!premiumCodesUnlocked && !membershipLoading ? (
              <div
                className={`mt-2 rounded-lg border px-3 py-2 text-[11.5px] leading-5 ${
                  lockedCode ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {lockedCode ? `${lockedCode === "aashto" ? "AASHTO" : "TBDY"} design is available to Gold members. ` : "AASHTO and TBDY design are available to Gold members. "}
                {isSignedIn ? (
                  <a href="/account" className="font-semibold underline">
                    See your membership
                  </a>
                ) : (
                  <>
                    <a href="/account?mode=signup" className="font-semibold underline">
                      Sign up
                    </a>{" "}
                    or{" "}
                    <a href="/login" className="font-semibold underline">
                      sign in
                    </a>{" "}
                    to use them.
                  </>
                )}
              </div>
            ) : null}
          </ControlBlock>

          {/* The pile inputs stay visible but blurred while a Gold-only code is picked; the code selector above stays usable. */}
          <div aria-hidden={codeLocked || undefined} className={`space-y-4 ${codeLocked ? "pointer-events-none select-none blur-[5px]" : ""}`}>
          <ControlBlock label="Pile type">
            <Segmented<PileType>
              ariaLabel="Pile type"
              value={model.pileType}
              onChange={setPileType}
              options={[
                { value: "driven", label: "Driven" },
                { value: "bored", label: "Bored" },
                { value: "cfa", label: "CFA" },
              ]}
            />
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              {model.pileType === "driven"
                ? "Displacement pile — soil is densified around the shaft."
                : model.pileType === "bored"
                  ? "Fore kazık — soil removed, bore open before concreting; lower K and δ."
                  : "Continuous flight auger — concrete pumped as the auger is withdrawn."}
            </p>
          </ControlBlock>

          {model.pileType === "driven" ? (
            <ControlBlock label="Pile material">
              <select
                value={model.material}
                onChange={(event) => {
                  const material = event.target.value as PileMaterial;
                  set({ material, pileUnitWeight: MATERIAL_UNIT_WEIGHT[material], deltaRatioOverride: null });
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="concrete">Precast concrete</option>
                <option value="steel">Steel pipe / H-pile</option>
                <option value="timber">Timber</option>
              </select>
            </ControlBlock>
          ) : null}

          <SliderField
            label="Diameter, D"
            value={model.diameter}
            min={0.2}
            max={3}
            step={0.05}
            unit="m"
            unitSystem={unitSystem}
            onChange={(diameter) => set({ diameter })}
          />
          <PlanView diameter={D} unitSystem={unitSystem} pileType={model.pileType} material={model.material} />
          <SliderField
            label="Embedded length, L"
            value={model.length}
            min={1}
            max={lengthSliderMax}
            step={0.5}
            unit="m"
            unitSystem={unitSystem}
            onChange={(length) => set({ length })}
          />
          <InlineNumber
            label="Pile head depth, D_f"
            hint="Cap underside / excavation level below ground. Shaft resistance starts here."
            value={model.headDepth}
            unit="m"
            unitSystem={unitSystem}
            step={0.5}
            onChange={(headDepth) => set({ headDepth })}
          />

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">Critical depth limit</p>
                <p className="text-[11px] text-slate-500">
                  <ScriptText text={`Hold σ′ᵥ constant below z_c = D_f + n·D`} />
                </p>
              </div>
              <Toggle
                checked={model.criticalDepthEnabled}
                onChange={(criticalDepthEnabled) => set({ criticalDepthEnabled })}
                label="Critical depth limit"
              />
            </div>
            {model.criticalDepthEnabled ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-600">n =</span>
                <UnitNumberInput
                  ariaLabel="Critical depth factor n"
                  value={params.criticalFactor}
                  unitSystem={unitSystem}
                  step={1}
                  suffix="× D"
                  onChange={(v) => set({ criticalDepthFactor: v })}
                  className="w-28"
                />
                {model.criticalDepthFactor !== null ? (
                  <button type="button" onClick={() => set({ criticalDepthFactor: null })} className="text-[11px] font-medium text-slate-600 underline">
                    reset to {params.criticalFactorDefault}D
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">default for {model.pileType} piles</span>
                )}
              </div>
            ) : null}
          </div>

          {model.code !== "aashto" ? (
            <ControlBlock label="Base resistance N_q (granular toe)">
              <select
                value={model.nqMethod}
                onChange={(event) => set({ nqMethod: event.target.value as NqMethod })}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                {(Object.keys(NQ_METHOD_LABEL) as NqMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {NQ_METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </ControlBlock>
          ) : null}

          {model.code === "ec7" ? (
            <div className="grid grid-cols-2 gap-3">
              <ControlBlock label="Design approach">
                <Segmented
                  size="sm"
                  ariaLabel="EC7 design approach"
                  value={model.ec7Approach}
                  onChange={(ec7Approach) => set({ ec7Approach })}
                  options={[
                    { value: "DA1", label: "DA1" },
                    { value: "DA2", label: "DA2" },
                  ]}
                />
              </ControlBlock>
              <ControlBlock label="Model factor γ_Rd">
                <UnitNumberInput
                  ariaLabel="Model factor"
                  value={model.ec7ModelFactor}
                  unitSystem={unitSystem}
                  step={0.05}
                  onChange={(ec7ModelFactor) => set({ ec7ModelFactor })}
                />
              </ControlBlock>
            </div>
          ) : null}

          {model.code === "aashto" && model.pileType === "driven" ? (
            <SliderField
              label="Lateral stress ratio Kₛ/K₀"
              value={model.ksK0}
              min={0.5}
              max={2.5}
              step={0.05}
              unitSystem={unitSystem}
              onChange={(ksK0) => set({ ksK0 })}
              hint="≈1.0–2.0 for displacement piles."
            />
          ) : null}

          {model.code === "tbdy" ? (
            <ControlBlock label="Safety factors (shaft / base)">
              <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-xs text-slate-600">
                <span>Static</span>
                <UnitNumberInput ariaLabel="Static shaft FS" value={model.tbdy.fsShaftStatic} unitSystem={unitSystem} step={0.1} onChange={(v) => set({ tbdy: { ...model.tbdy, fsShaftStatic: v } })} />
                <UnitNumberInput ariaLabel="Static base FS" value={model.tbdy.fsBaseStatic} unitSystem={unitSystem} step={0.1} onChange={(v) => set({ tbdy: { ...model.tbdy, fsBaseStatic: v } })} />
                <span>Seismic</span>
                <UnitNumberInput ariaLabel="Seismic shaft FS" value={model.tbdy.fsShaftSeismic} unitSystem={unitSystem} step={0.1} onChange={(v) => set({ tbdy: { ...model.tbdy, fsShaftSeismic: v } })} />
                <UnitNumberInput ariaLabel="Seismic base FS" value={model.tbdy.fsBaseSeismic} unitSystem={unitSystem} step={0.1} onChange={(v) => set({ tbdy: { ...model.tbdy, fsBaseSeismic: v } })} />
              </div>
              {JSON.stringify(model.tbdy) !== JSON.stringify(DEFAULT_TBDY_FACTORS) ? (
                <button type="button" onClick={() => set({ tbdy: { ...DEFAULT_TBDY_FACTORS } })} className="mt-1 text-[11px] font-medium text-slate-600 underline">
                  reset to 2.0 / 3.0 and 1.5 / 2.0
                </button>
              ) : null}
            </ControlBlock>
          ) : null}

          <details className="group rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer list-none text-xs font-semibold text-slate-800">
              <span className="inline-block transition-transform group-open:rotate-90">›</span> Advanced parameters
            </summary>
            <div className="mt-3 space-y-3">
              {params.kSymbol === "K" ? (
                <OverrideField
                  label="Lateral earth pressure coefficient K"
                  value={params.k ?? 0}
                  defaultValue={params.kDefault}
                  overridden={model.kOverride !== null}
                  step={0.05}
                  unitSystem={unitSystem}
                  onChange={(kOverride) => set({ kOverride })}
                />
              ) : null}
              {params.deltaRatio !== null ? (
                <OverrideField
                  label="Interface friction δ/φ′"
                  value={params.deltaRatio}
                  defaultValue={params.deltaDefault}
                  overridden={model.deltaRatioOverride !== null}
                  step={0.05}
                  unitSystem={unitSystem}
                  onChange={(deltaRatioOverride) => set({ deltaRatioOverride })}
                />
              ) : null}
              {model.code !== "aashto" ? (
                <OverrideField
                  label={model.code === "ec7" ? "Adhesion factor α (cohesive)" : "Adhesion factor α (blank = GEC-10 rule)"}
                  value={model.alphaOverride ?? params.alphaDefault ?? Number.NaN}
                  defaultValue={params.alphaDefault}
                  overridden={model.alphaOverride !== null}
                  step={0.05}
                  unitSystem={unitSystem}
                  onChange={(alphaOverride) => set({ alphaOverride })}
                />
              ) : null}
              <InlineNumber
                label="Pile unit weight γ_pile"
                value={model.pileUnitWeight}
                unit="kN/m3"
                unitSystem={unitSystem}
                step={0.5}
                onChange={(pileUnitWeight) => set({ pileUnitWeight })}
              />
              <label className="flex items-center justify-between gap-3 text-xs text-slate-700">
                <span>
                  <ScriptText text="Deduct net pile weight W′ from the design resistance" />
                </span>
                <Toggle checked={model.deductWeight} onChange={(deductWeight) => set({ deductWeight })} label="Deduct pile weight" />
              </label>
            </div>
          </details>
          </div>
        </div>

        {/* Visuals */}
        <GoldCodeGate locked={codeLocked} codeName={codeName} isSignedIn={isSignedIn}>
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Section & capacity</p>
              <p className="text-xs text-slate-600">Hover to read values at a depth · click the chart to set the toe</p>
            </div>
            <CapacityLegend designShort={designShort} />
          </div>
          {analysis ? (
            <div className="grid gap-2 p-2 sm:grid-cols-2">
              <SoilSection
                strata={strata}
                groundwaterDepth={model.groundwaterDepth}
                scale={scale}
                unitSystem={unitSystem}
                mode="pile"
                pile={{ diameter: D, length: L, head, pileType: model.pileType, material: model.material }}
                result={analysis}
                hoverDepth={hoverDepth}
                onHoverDepth={setHoverDepth}
                ariaLabel="Pile in the soil section with shaft and base resistance"
              />
              <CapacityChart
                curve={curve}
                strata={strata}
                scale={scale}
                unitSystem={unitSystem}
                headDepth={head}
                toeDepth={toe}
                designShort={designShort}
                current={{ side: analysis.shaft, base: analysis.base.resistance, ultimate: analysis.ultimate, design: analysis.design.value }}
                hoverDepth={hoverDepth}
                onHoverDepth={setHoverDepth}
                computeAt={computeAt}
                onSelectToe={(toeDepth) => set({ length: Math.max(toeDepth - head, 1) })}
              />
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm font-semibold text-slate-900">Inputs need attention</p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {errors.map((message) => (
                  <li key={message}>
                    • <ScriptText text={message} />
                  </li>
                ))}
              </ul>
              {strata.errors.length || errors.some((e) => e.includes("N₆₀")) ? (
                <button type="button" onClick={onEditStrata} className="mt-4 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
                  Go to Soil Strata
                </button>
              ) : null}
            </div>
          )}
        </div>
        </GoldCodeGate>
      </div>

      {analysis ? (
        <GoldCodeGate locked={codeLocked} codeName={codeName} isSignedIn={isSignedIn} compact>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Ultimate resistance, Rᵤ" value={formatQty(analysis.ultimate, "kN", unitSystem, 0)} note="Rₛ + R_b (calculated)" />
            <StatTile
              label="Shaft resistance, Rₛ"
              value={formatQty(analysis.shaft, "kN", unitSystem, 0)}
              note={`${formatNumber(sideShare * 100, 0)}% of Rᵤ`}
              colour={SIDE_COLOUR}
            />
            <StatTile
              label="Base resistance, R_b"
              value={formatQty(analysis.base.resistance, "kN", unitSystem, 0)}
              note={`${formatNumber((1 - sideShare) * 100, 0)}% of Rᵤ · q_b ${formatQty(analysis.base.unitResistance, "kPa", unitSystem, 0)}`}
              colour={TOE_COLOUR}
            />
            <StatTile
              label={`Design, ${analysis.design.label}`}
              value={formatQty(analysis.design.value, "kN", unitSystem, 0)}
              note={model.deductWeight ? `W′ = ${formatQty(analysis.weight, "kN", unitSystem, 0)} deducted` : "W′ not deducted"}
              emphasis
            />
          </div>
          <button type="button" onClick={scrollToDetails} className="-mt-2 text-sm font-semibold text-slate-800 underline underline-offset-4">
            Detailed calculations ↓
          </button>

          <section id={DETAILS_ANCHOR} className="scroll-mt-28 space-y-5">
          <TierGate level={detailLevel} minHeight={300}>
          <div className="space-y-5">
          <DesignPanel analysis={analysis} model={model} unitSystem={unitSystem} />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Load share</span>
              <span className="tabular-nums">
                <ScriptText text={`Rₛ ${formatNumber(sideShare * 100, 0)}% · R_b ${formatNumber((1 - sideShare) * 100, 0)}%`} />
              </span>
            </div>
            <div className="mt-2 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-l-full transition-all duration-300" style={{ width: `${sideShare * 100}%`, backgroundColor: SIDE_COLOUR }} />
              <div className="h-full flex-1 rounded-r-full transition-all duration-300" style={{ backgroundColor: TOE_COLOUR }} />
            </div>
          </div>

          <LayerTable analysis={analysis} model={model} strata={strata} unitSystem={unitSystem} />

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
            {analysis.shaft / Math.max(analysis.ultimate, 1) < 0.2 ? (
              <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                ⚠ Capacity is dominated by base resistance — confirm the bearing stratum continues well below the pile toe.
              </p>
            ) : null}
            {toe > strata.totalThickness ? (
              <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                ⚠ The pile toe is below the defined strata; the last layer is assumed to continue.
              </p>
            ) : null}
            <ul className="list-disc space-y-1 pl-5">
              {analysis.notes.map((note) => (
                <li key={note}>
                  <ScriptText text={note} />
                </li>
              ))}
              <li>Downdrag, group effects, set-up/relaxation and settlement are not included.</li>
            </ul>
          </div>
          {detailLevel === "silver" || detailLevel === "gold" ? (
            <PileFormulaSteps model={model} />
          ) : detailLevel === "bronze" ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Silver shows every calculation step — α and β methods, base resistance and the code factors — with the formulas
              and your numbers substituted.
            </p>
          ) : null}
          </div>
          </TierGate>
          </section>
        </GoldCodeGate>
      ) : null}
    </section>
  );
}

/** Blurs AASHTO / TBDY results for members below Gold and offers the upgrade on top. */
function GoldCodeGate({
  locked,
  codeName,
  isSignedIn,
  compact = false,
  children,
}: {
  locked: boolean;
  codeName: string;
  isSignedIn: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  if (!locked) return <div className="min-w-0 space-y-5">{children}</div>;
  return (
    <div className="relative min-w-0">
      <div aria-hidden="true" className="pointer-events-none max-h-[640px] select-none space-y-5 overflow-hidden blur-[7px]">
        {children}
      </div>
      <div className={`absolute inset-0 flex justify-center ${compact ? "items-start pt-6" : "items-center"}`}>
        <div className="max-w-sm rounded-xl border border-amber-300 bg-white/95 px-5 py-4 text-center shadow-lg backdrop-blur">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">Gold feature</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{codeName} pile design is for Gold members</p>
          <p className="mt-1 text-sm text-slate-600">EC7 design stays open to everyone. Switch back to EC7 or upgrade to see these results.</p>
          <div className="mt-3 flex justify-center gap-2">
            {isSignedIn ? (
              <a href="/account" className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400">
                See membership
              </a>
            ) : (
              <>
                <a href="/account?mode=signup" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
                  Sign up
                </a>
                <a href="/login" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-slate-500">
                  Sign in
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── panels ───────────────────────────── */

function StrataSummary({
  model,
  strata,
  unitSystem,
  onEditStrata,
}: {
  model: PileDesignModel;
  strata: ReturnType<typeof deriveStrata>;
  unitSystem: UnitSystem;
  onEditStrata: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Soil strata in use</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {strata.layers.length} layer{strata.layers.length === 1 ? "" : "s"} · GWT at {formatQty(model.groundwaterDepth, "m", unitSystem)}
          </p>
        </div>
        <button
          type="button"
          onClick={onEditStrata}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M13.5 3.5l3 3L7 16H4v-3z" />
          </svg>
          Edit soil strata
        </button>
      </div>
      <div className="mt-3 flex h-11 w-full gap-[2px] overflow-hidden rounded-lg">
        {strata.layers.map((d) => {
          const isCohesive = d.meta.behaviour === "cohesive";
          const strength = isCohesive
            ? `cᵤ ${formatQty(d.cu, "kPa", unitSystem, 0)}`
            : `φ′ ${formatNumber(d.phi, 1)}°${Number.isFinite(d.n60) ? ` · N₆₀ ${formatNumber(d.n60, 0)}` : ""}`;
          return (
            <button
              key={d.layer.id}
              type="button"
              onClick={onEditStrata}
              title={`Edit ${d.meta.label}`}
              className="flex min-w-0 flex-col justify-center px-2 text-left transition-opacity hover:opacity-90"
              style={{ flexGrow: Math.max(d.bottom - d.top, 0.1), flexBasis: 0, backgroundColor: d.meta.fill }}
            >
              <span className="truncate text-[11px] font-semibold text-slate-900">
                {d.index + 1} · {d.meta.label} · {formatQty(d.bottom - d.top, "m", unitSystem)}
              </span>
              <span className="truncate text-[10.5px] text-slate-800/80">
                <ScriptText text={strength} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesignPanel({ analysis, model, unitSystem }: { analysis: PileAnalysis; model: PileDesignModel; unitSystem: UnitSystem }) {
  const d = analysis.design;
  const kN = (v: number) => formatQty(v, "kN", unitSystem, 0);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Design resistance · {CODE_LABEL[model.code]}</p>
      </div>
      <div className="overflow-x-auto">
        {d.code === "ec7" ? (
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-2">Combination</th>
                <th className="px-3 py-2">Sets</th>
                <th className="px-3 py-2 text-right"><ScriptText text="γ_s" /></th>
                <th className="px-3 py-2 text-right"><ScriptText text="γ_b" /></th>
                <th className="px-3 py-2 text-right"><ScriptText text="γ_Rd" /></th>
                <th className="px-4 py-2 text-right"><ScriptText text="R_c,d" /></th>
              </tr>
            </thead>
            <tbody>
              {d.combos.map((c) => {
                const active = c.id === d.governing.id;
                const inApproach = model.ec7Approach === "DA1" ? c.id.startsWith("DA1") : c.id === "DA2";
                return (
                  <tr key={c.id} className={`border-b border-slate-100 ${active ? "bg-slate-900/[0.04] font-semibold" : inApproach ? "" : "text-slate-400"}`}>
                    <td className="px-4 py-2">
                      {c.label}
                      {active ? <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">governs</span> : null}
                    </td>
                    <td className="px-3 py-2 text-xs">{c.sets}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(c.gammaS, 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(c.gammaB, 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(c.gammaRd, 2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900">{kN(c.design)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : d.code === "aashto" ? (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-2">Component</th>
                <th className="px-3 py-2 text-right"><ScriptText text="R_n" /></th>
                <th className="px-3 py-2 text-right">φ</th>
                <th className="px-4 py-2 text-right"><ScriptText text="φ R_n" /></th>
              </tr>
            </thead>
            <tbody>
              {(["cohesive", "cohesionless"] as const).map((b) => {
                const rows = analysis.layers.filter((l) => l.behaviour === b && l.length > 0);
                if (!rows.length) return null;
                const rn = rows.reduce((s, l) => s + l.resistance, 0);
                const phi = rows[0].phi ?? 0;
                return (
                  <tr key={b} className="border-b border-slate-100">
                    <td className="px-4 py-2">Shaft in {b} soil ({b === "cohesive" ? "α" : "β"} method)</td>
                    <td className="px-3 py-2 text-right tabular-nums">{kN(rn)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(phi, 2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{kN(phi * rn)}</td>
                  </tr>
                );
              })}
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2">Base ({analysis.base.behaviour === "cohesive" ? "cohesive" : "granular"})</td>
                <td className="px-3 py-2 text-right tabular-nums">{kN(analysis.base.resistance)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.phiTip, 2)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{kN(d.tipFactored)}</td>
              </tr>
              <tr className="bg-slate-900/[0.04] font-semibold">
                <td className="px-4 py-2" colSpan={3}>
                  <ScriptText text={`Factored resistance R_R${model.deductWeight ? " − W′" : ""}`} />
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-900">{kN(d.value)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-2">Case</th>
                <th className="px-3 py-2 text-right"><ScriptText text="FS_shaft" /></th>
                <th className="px-3 py-2 text-right"><ScriptText text="FS_base" /></th>
                <th className="px-4 py-2 text-right"><ScriptText text="R_a" /></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 bg-slate-900/[0.04] font-semibold">
                <td className="px-4 py-2">Static (service)</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.factors.fsShaftStatic, 2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.factors.fsBaseStatic, 2)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-900">{kN(d.staticValue)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Seismic</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.factors.fsShaftSeismic, 2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.factors.fsBaseSeismic, 2)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-900">{kN(d.seismicValue)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LayerTable({
  analysis,
  model,
  strata,
  unitSystem,
}: {
  analysis: PileAnalysis;
  model: PileDesignModel;
  strata: ReturnType<typeof deriveStrata>;
  unitSystem: UnitSystem;
}) {
  const showPhi = model.code === "aashto";
  const toeLayer = strata.layers[analysis.base.layerIndex];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Breakdown by layer</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
              <th className="px-4 py-2">Layer</th>
              <th className="px-3 py-2">Along pile</th>
              <th className="px-3 py-2 text-right"><ScriptText text="σ′ᵥ avg" /></th>
              <th className="px-3 py-2 text-right">α / β</th>
              <th className="px-3 py-2 text-right"><ScriptText text="fₛ avg" /></th>
              <th className="px-3 py-2 text-right"><ScriptText text="Rₛ" /></th>
              {showPhi ? <th className="px-3 py-2 text-right">φ</th> : null}
              <th className="px-4 py-2"><ScriptText text="Share of Rₛ" /></th>
            </tr>
          </thead>
          <tbody>
            {analysis.layers.map((lr) => {
              const d = strata.layers[lr.index];
              if (!d) return null;
              const share = lr.resistance / Math.max(analysis.shaft, 1e-9);
              const embedded = lr.length > 0;
              return (
                <tr key={d.layer.id} className={`border-b border-slate-100 ${embedded ? "" : "text-slate-400"}`}>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: d.meta.fill }} />
                      <span className="font-medium">
                        {lr.index + 1} · {d.meta.label}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {embedded ? `${formatQty(lr.top, "m", unitSystem)} – ${formatQty(lr.bottom, "m", unitSystem)}` : "not along pile"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{embedded ? formatQty(lr.meanSigmaV, "kPa", unitSystem) : "–"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {embedded ? `${lr.behaviour === "cohesive" ? "α" : "β"} ${formatNumber(lr.meanCoefficient, 3)}` : "–"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{embedded ? formatQty(lr.unitSide, "kPa", unitSystem) : "–"}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{embedded ? formatQty(lr.resistance, "kN", unitSystem, 0) : "–"}</td>
                  {showPhi ? <td className="px-3 py-2 text-right tabular-nums">{embedded ? formatNumber(lr.phi ?? 0, 2) : "–"}</td> : null}
                  <td className="px-4 py-2">
                    {embedded ? (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, backgroundColor: SIDE_COLOUR }} />
                        </span>
                        <span className="text-xs tabular-nums text-slate-600">{formatNumber(share * 100, 0)}%</span>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-orange-50/40">
              <td className="px-4 py-2 font-medium" colSpan={2}>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: TOE_COLOUR }} />
                  Base in layer {analysis.base.layerIndex + 1} · {toeLayer?.meta.label}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatQty(analysis.base.sigmaVUsed, "kPa", unitSystem)}</td>
              <td className="px-3 py-2 text-right text-xs text-slate-600">
                <ScriptText text={`${analysis.base.factorSymbol} = ${formatNumber(analysis.base.factorValue, 1)}`} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                <ScriptText text={`q_b ${formatQty(analysis.base.unitResistance, "kPa", unitSystem, 0)}`} />
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatQty(analysis.base.resistance, "kN", unitSystem, 0)}</td>
              {showPhi ? <td className="px-3 py-2" /> : null}
              <td className="px-4 py-2 text-xs text-slate-500">
                <ScriptText text={analysis.base.formula} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────────── controls ───────────────────────────── */

function ControlBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-600">
        <ScriptText text={label} />
      </p>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-slate-900" : "bg-slate-300"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function InlineNumber({
  label,
  hint,
  value,
  unit,
  unitSystem,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  unit?: string;
  unitSystem: UnitSystem;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600">
          <ScriptText text={label} />
        </span>
        <UnitNumberInput ariaLabel={label} value={value} unit={unit} unitSystem={unitSystem} step={step} onChange={onChange} className="w-28" />
      </div>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function OverrideField({
  label,
  value,
  defaultValue,
  overridden,
  step,
  unitSystem,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number | null;
  overridden: boolean;
  step: number;
  unitSystem: UnitSystem;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600">
          <ScriptText text={label} />
        </span>
        <UnitNumberInput ariaLabel={label} value={value} unitSystem={unitSystem} step={step} onChange={(v) => onChange(Number.isFinite(v) ? v : null)} className="w-24" />
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {overridden ? (
          <button type="button" onClick={() => onChange(null)} className="font-medium underline">
            {defaultValue !== null ? `reset to default (${formatNumber(defaultValue, 2)})` : "reset to default rule"}
          </button>
        ) : (
          "default for this code and pile type"
        )}
      </p>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  unitSystem,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  unitSystem: UnitSystem;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const safe = Number.isFinite(value) ? value : min;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600">
          <ScriptText text={label} />
        </span>
        <UnitNumberInput ariaLabel={label} value={value} unit={unit} unitSystem={unitSystem} step={step} onChange={onChange} className="w-28" />
      </div>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(safe, min), max)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-slate-900"
      />
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function PlanView({
  diameter,
  unitSystem,
  pileType,
  material,
}: {
  diameter: number;
  unitSystem: UnitSystem;
  pileType: PileType;
  material: PileMaterial;
}) {
  const r = 6 + (Math.min(diameter, 3) / 3) * 30;
  const area = (Math.PI * diameter ** 2) / 4;
  const perimeter = Math.PI * diameter;
  const fill = pileType !== "driven" ? "#d2cfc7" : material === "steel" ? "#a3aebb" : material === "timber" ? "#bf9264" : "#d9d6cf";
  const areaText = unitSystem === "american" ? `${formatNumber(area * 10.7639, 2)} ft²` : `${formatNumber(area, 3)} m²`;
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-label="Pile plan view" role="img" className="shrink-0">
        <rect x="1" y="1" width="78" height="78" rx="8" fill="#f8f6f1" stroke="#e2e8f0" />
        <line x1="40" y1="4" x2="40" y2="76" stroke="#cbd5e1" strokeDasharray="2 3" />
        <line x1="4" y1="40" x2="76" y2="40" stroke="#cbd5e1" strokeDasharray="2 3" />
        <circle cx="40" cy="40" r={r} fill={fill} stroke="#0f172a" strokeWidth="1.3" style={{ transition: "r 200ms ease" }} />
        {pileType !== "driven" && r > 12 ? <circle cx="40" cy="40" r={r - 4} fill="none" stroke="#57534e" strokeWidth="0.8" strokeDasharray="3 2" /> : null}
        {pileType === "driven" && material === "steel" && r > 10 ? <circle cx="40" cy="40" r={r - 3} fill="#f8f6f1" stroke="#0f172a" strokeWidth="0.8" /> : null}
      </svg>
      <div className="space-y-0.5 text-xs text-slate-600">
        <p className="font-semibold text-slate-900">Plan · D = {formatQty(diameter, "m", unitSystem, 2)}</p>
        <p className="tabular-nums">
          <ScriptText text={`Base area A_b = ${areaText}`} />
        </p>
        <p className="tabular-nums">Perimeter = {formatQty(perimeter, "m", unitSystem, 2)}</p>
      </div>
    </div>
  );
}

function StatTile({ label, value, note, colour, emphasis }: { label: string; value: string; note?: string; colour?: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${emphasis ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}>
      <p className={`flex items-center gap-1.5 text-xs font-medium ${emphasis ? "text-slate-300" : "text-slate-500"}`}>
        {colour ? <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colour }} /> : null}
        <span>
          <ScriptText text={label} />
        </span>
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${emphasis ? "text-white" : "text-slate-900"}`}>{value}</p>
      {note ? (
        <p className={`mt-0.5 text-xs ${emphasis ? "text-slate-300" : "text-slate-500"}`}>
          <ScriptText text={note} />
        </p>
      ) : null}
    </div>
  );
}


/** Silver/Gold: the report's calculation steps (formulas with this project's numbers) shown on the page. */
function PileFormulaSteps({ model }: { model: PileDesignModel }) {
  const steps = useMemo(() => buildPileReportPayload(model)?.steps ?? [], [model]);
  if (!steps.length) return null;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Calculation steps</p>
      {steps.map((step, i) => (
        <div key={step.title} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-sm font-semibold text-slate-900">
            {i + 1}. <ScriptText text={step.title} />
          </p>
          {step.equations?.map((eq) => (
            <p key={eq.text} className="mt-1 font-serif text-[14px] text-slate-800">
              <EngineeringText text={eq.text} />
            </p>
          ))}
          {step.bullets?.map((b) => (
            <p key={b} className="mt-1 text-[13px] text-slate-700">
              <EngineeringText text={b} />
            </p>
          ))}
          {step.after?.map((a) => (
            <p key={a} className="mt-1 text-[13px] font-medium text-slate-800">
              <EngineeringText text={a} />
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
