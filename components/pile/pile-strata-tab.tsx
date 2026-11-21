"use client";

import { useMemo, useRef, useState } from "react";

import {
  Segmented,
  SoilSwatch,
  UnitNumberInput,
  createDepthScale,
  formatNumber,
  formatQty,
  niceCeil,
} from "@/components/pile/pile-shared";
import { SECTION_VIEW_WIDTH, SoilSection } from "@/components/pile/soil-section";
import { ScriptText } from "@/components/script-text";
import {
  SOIL_TYPES,
  SOIL_TYPE_ORDER,
  STRATA_PRESETS,
  createLayer,
  deriveStrata,
  presetLayers,
  type PileDesignModel,
  type StrataLayer,
  type StrataSoilType,
} from "@/lib/design-tools/pile-strata";
import type { UnitSystem } from "@/lib/types";

interface PileStrataTabProps {
  model: PileDesignModel;
  onChange: (next: PileDesignModel) => void;
  unitSystem: UnitSystem;
  onContinue: () => void;
}

const SECTION_HEIGHT = 560;

export function PileStrataTab({ model, onChange, unitSystem, onContinue }: PileStrataTabProps) {
  const strata = useMemo(() => deriveStrata(model), [model]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverDepth, setHoverDepth] = useState<number | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const maxDepth = niceCeil(Math.max(strata.totalThickness * 1.1, model.groundwaterDepth + 1, 5), 8);
  const scale = createDepthScale(maxDepth, SECTION_HEIGHT, 30, 18);
  const usesStroud = model.layers.some((l) => SOIL_TYPES[l.type].behaviour === "cohesive" && l.source === "spt");

  const updateLayer = (id: string, patch: Partial<StrataLayer>) =>
    onChange({ ...model, layers: model.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  const changeType = (layer: StrataLayer, type: StrataSoilType) => {
    const prev = SOIL_TYPES[layer.type];
    const next = SOIL_TYPES[type];
    const patch: Partial<StrataLayer> = { type };
    if (layer.gamma === prev.defaults.gamma) patch.gamma = next.defaults.gamma;
    if (prev.behaviour !== next.behaviour) {
      patch.cu = next.defaults.cu;
      patch.phi = next.defaults.phi;
    }
    updateLayer(layer.id, patch);
  };

  const moveLayer = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= model.layers.length) return;
    const layers = [...model.layers];
    [layers[index], layers[target]] = [layers[target], layers[index]];
    onChange({ ...model, layers });
  };

  const removeLayer = (id: string) => onChange({ ...model, layers: model.layers.filter((l) => l.id !== id) });

  const addLayer = (type: StrataSoilType) => {
    const layer = createLayer(type, 4, SOIL_TYPES[type].behaviour === "cohesionless" ? "spt" : "direct");
    onChange({ ...model, layers: [...model.layers, layer] });
    requestAnimationFrame(() => cardRefs.current[layer.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const loadPreset = (presetId: string) => {
    const preset = STRATA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({ ...model, layers: presetLayers(preset), groundwaterDepth: preset.groundwaterDepth });
  };

  const selectLayer = (index: number) => {
    const layer = model.layers[index];
    if (layer) cardRefs.current[layer.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      {/* Editor */}
      <div className="min-w-0 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step 1 of 2</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Soil strata</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                Build the profile from the ground surface down. Enter c<sub>u</sub> or φ′ directly, or let them be derived from
                SPT N<sub>60</sub>. The last layer is assumed to continue below the pile toe.
              </p>
            </div>
            <label className="shrink-0 text-xs font-medium text-slate-600">
              <span className="sr-only">Load an example profile</span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 sm:w-56"
                value=""
                onChange={(event) => loadPreset(event.target.value)}
              >
                <option value="" disabled>
                  Load an example profile…
                </option>
                {STRATA_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pile-gwt" className="text-xs font-medium text-slate-600">
                Groundwater depth below surface
              </label>
              <UnitNumberInput
                id="pile-gwt"
                value={model.groundwaterDepth}
                unit="m"
                unitSystem={unitSystem}
                step={0.5}
                min={0}
                invalid={!Number.isFinite(model.groundwaterDepth) || model.groundwaterDepth < 0}
                onChange={(v) => onChange({ ...model, groundwaterDepth: v })}
                className="mt-1"
              />
            </div>
            {usesStroud ? (
              <div>
                <label htmlFor="pile-f1" className="text-xs font-medium text-slate-600">
                  Stroud factor f<sub>1</sub> (c<sub>u</sub> = f<sub>1</sub>·N<sub>60</sub>)
                </label>
                <UnitNumberInput
                  id="pile-f1"
                  value={model.stroudF1}
                  unitSystem={unitSystem}
                  step={0.1}
                  suffix="kPa"
                  invalid={!(model.stroudF1 > 0)}
                  onChange={(v) => onChange({ ...model, stroudF1: v })}
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-slate-500">Typically 4.4–6 kPa; lower for high-plasticity clays.</p>
              </div>
            ) : null}
          </div>
        </div>

        <ol className="space-y-3">
          {strata.layers.map((d, index) => {
            const layer = d.layer;
            const isCohesive = d.meta.behaviour === "cohesive";
            const highlighted = hoverIndex === index;
            return (
              <li
                key={layer.id}
                ref={(el) => {
                  cardRefs.current[layer.id] = el as HTMLDivElement | null;
                }}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${
                  highlighted ? "border-slate-400 ring-2 ring-slate-200" : "border-slate-200"
                }`}
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: d.meta.fill }} />
                <div className="p-4 pl-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SoilSwatch type={layer.type} size={26} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Layer {index + 1} · {d.meta.label}
                      </p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {formatQty(d.top, "m", unitSystem)} – {index === strata.layers.length - 1 ? `${formatQty(d.bottom, "m", unitSystem)} and below` : formatQty(d.bottom, "m", unitSystem)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isCohesive ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-sky-50 text-sky-800 ring-1 ring-sky-200"
                      }`}
                    >
                      {isCohesive ? "Cohesive · undrained (α)" : "Cohesionless · drained (β)"}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <IconButton label="Move layer up" disabled={index === 0} onClick={() => moveLayer(index, -1)}>
                        <path d="M5 12l5-5 5 5" />
                      </IconButton>
                      <IconButton label="Move layer down" disabled={index === strata.layers.length - 1} onClick={() => moveLayer(index, 1)}>
                        <path d="M5 8l5 5 5-5" />
                      </IconButton>
                      <IconButton label="Remove layer" disabled={strata.layers.length === 1} onClick={() => removeLayer(layer.id)} danger>
                        <path d="M6 6l8 8M14 6l-8 8" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Soil type">
                      <select
                        value={layer.type}
                        onChange={(event) => changeType(layer, event.target.value as StrataSoilType)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
                      >
                        {SOIL_TYPE_ORDER.map((type) => (
                          <option key={type} value={type}>
                            {SOIL_TYPES[type].label} ({SOIL_TYPES[type].short})
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Thickness">
                      <UnitNumberInput
                        ariaLabel={`Layer ${index + 1} thickness`}
                        value={layer.thickness}
                        unit="m"
                        unitSystem={unitSystem}
                        step={0.5}
                        invalid={!(layer.thickness > 0)}
                        onChange={(v) => updateLayer(layer.id, { thickness: v })}
                      />
                    </Field>
                    <Field label="Unit weight γ">
                      <UnitNumberInput
                        ariaLabel={`Layer ${index + 1} unit weight`}
                        value={layer.gamma}
                        unit="kN/m3"
                        unitSystem={unitSystem}
                        step={0.5}
                        invalid={!(layer.gamma >= 10 && layer.gamma <= 25)}
                        onChange={(v) => updateLayer(layer.id, { gamma: v })}
                      />
                    </Field>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold text-slate-700">
                        {isCohesive ? "Undrained shear strength" : "Friction angle"}
                      </p>
                      <div className="sm:w-72">
                        <Segmented
                          size="sm"
                          ariaLabel={`Layer ${index + 1} strength source`}
                          value={layer.source}
                          onChange={(source) => updateLayer(layer.id, { source })}
                          options={[
                            { value: "direct", label: isCohesive ? "Enter cᵤ" : "Enter φ′" },
                            { value: "spt", label: "From SPT N₆₀" },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {layer.source === "direct" && isCohesive ? (
                        <Field label="cᵤ">
                          <UnitNumberInput
                            ariaLabel={`Layer ${index + 1} undrained shear strength`}
                            value={layer.cu}
                            unit="kPa"
                            unitSystem={unitSystem}
                            step={5}
                            invalid={!(layer.cu >= 1)}
                            onChange={(v) => updateLayer(layer.id, { cu: v })}
                          />
                        </Field>
                      ) : null}
                      {layer.source === "direct" && !isCohesive ? (
                        <Field label="φ′">
                          <UnitNumberInput
                            ariaLabel={`Layer ${index + 1} friction angle`}
                            value={layer.phi}
                            unitSystem={unitSystem}
                            step={0.5}
                            suffix="°"
                            invalid={!(layer.phi >= 20 && layer.phi <= 45)}
                            onChange={(v) => updateLayer(layer.id, { phi: v })}
                          />
                        </Field>
                      ) : null}
                      {!isCohesive || layer.source === "spt" ? (
                        <Field label={layer.source === "direct" ? "SPT N₆₀ (optional · used only by AASHTO)" : "SPT N₆₀"}>
                          <UnitNumberInput
                            ariaLabel={`Layer ${index + 1} SPT N60`}
                            value={layer.n60}
                            unitSystem={unitSystem}
                            step={1}
                            suffix="blows"
                            invalid={
                              layer.source === "spt"
                                ? !(layer.n60 >= 1 && layer.n60 <= 100)
                                : Number.isFinite(layer.n60) && !(layer.n60 >= 1 && layer.n60 <= 100)
                            }
                            onChange={(v) => updateLayer(layer.id, { n60: v })}
                          />
                        </Field>
                      ) : null}
                      {layer.source === "spt" ? (
                        <div className="flex flex-col justify-end">
                          <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5">
                            <p className="text-sm font-semibold tabular-nums text-slate-900">
                              <ScriptText
                                text={isCohesive ? `cᵤ ≈ ${formatQty(d.cu, "kPa", unitSystem, 0)}` : `φ′ ≈ ${formatNumber(d.phi, 1)}°`}
                              />
                            </p>
                            <p className="text-[11px] text-slate-500">
                              <ScriptText text={d.strengthNote} />
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {d.errors.length ? (
                    <ul className="mt-2 space-y-0.5 text-xs text-red-700">
                      {d.errors.map((message) => (
                        <li key={message}>• {message}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Add a layer below</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SOIL_TYPE_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addLayer(type)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                <SoilSwatch type={type} size={20} />+ {SOIL_TYPES[type].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual */}
      <div className="min-w-0">
        <div className="space-y-3 lg:sticky lg:top-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Strata column</p>
                <p className="text-xs text-slate-600">
                  {strata.layers.length} layer{strata.layers.length === 1 ? "" : "s"} · {formatQty(strata.totalThickness, "m", unitSystem)} defined
                </p>
              </div>
              <p className="hidden text-[11px] text-slate-500 sm:block">Hover or click a layer</p>
            </div>
            <div className="p-2" style={{ maxWidth: SECTION_VIEW_WIDTH * 1.25, margin: "0 auto" }}>
              <SoilSection
                strata={strata}
                groundwaterDepth={model.groundwaterDepth}
                scale={scale}
                unitSystem={unitSystem}
                mode="strata"
                highlightIndex={hoverIndex}
                onHoverLayer={setHoverIndex}
                onSelectLayer={selectLayer}
                hoverDepth={hoverDepth}
                onHoverDepth={setHoverDepth}
                ariaLabel="Soil strata column"
              />
            </div>
          </div>

          {strata.errors.length ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Fix {strata.errors.length} input{strata.errors.length === 1 ? "" : "s"} marked in red before running the pile analysis.
            </p>
          ) : null}

          <button
            type="button"
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            Continue to Pile Capacity
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-slate-600">
        <ScriptText text={label} />
      </p>
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        danger ? "hover:border-red-300 hover:text-red-700" : "hover:border-slate-400 hover:text-slate-900"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
