"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ExpandableProfilePlot } from "@/components/expandable-profile-plot";
import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import {
  ProfileTableHeaderCell,
  ProfileTableScroll,
  cnProfileTableInput,
  profileTableClass,
  profileTableFooterButtonClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";
import { profilePlotItemClass, profilePlotsSectionClass } from "@/lib/profile-plot-layout";
import { exportProfileExcelFromSection } from "@/lib/profile-excel-export";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { matchImportSummaryForProfileRow } from "@/lib/soil-behavior-policy";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface EarthPressureProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  projectParameters?: Array<{
    boreholeLabel: string;
    sampleDepth: number | null;
    parameterCode: string;
    value: number;
    sourceToolSlug: string | null;
  }>;
}

interface EarthPressureProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  frictionAngle: string;
  ocr: string;
  verticalStress: string;
  frictionAngleSource?: "manual" | "auto-project";
  ocrSource?: "manual" | "auto-project";
  verticalStressSource?: "manual" | "auto-project";
}

interface EarthPressurePlotPoint {
  boreholeId: string;
  depth: number;
  k0oc: number;
  sigmaH0: number;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: EarthPressureProfileRow[] = [
  {
    id: 1,
    boreholeId: "",
    sampleDepth: "2",
    frictionAngle: "30",
    ocr: "1.2",
    verticalStress: "75",
  },
  {
    id: 2,
    boreholeId: "",
    sampleDepth: "5",
    frictionAngle: "32",
    ocr: "1.8",
    verticalStress: "130",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitiseBoreholeLabel(value: string | null | undefined): string {
  return (value ?? "").replace(/[▼▾▿▲△]/g, "").replace(/\s+/g, " ").trim() || "BH not set";
}

function normaliseBoreholeLabelKey(value: string | null | undefined): string {
  return sanitiseBoreholeLabel(value).toLowerCase();
}

function depthKey(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "na";
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function computeEarthPressureValues(phiDeg: number, ocr: number, sigmaV: number) {
  const phi = degToRad(Math.max(0, phiDeg));
  const safeOcr = Math.max(1, ocr);
  const safeSigmaV = Math.max(0, sigmaV);

  const k0nc = 1 - Math.sin(phi);
  const k0oc = k0nc * safeOcr ** Math.sin(phi);
  const ka = Math.tan(Math.PI / 4 - phi / 2) ** 2;
  const kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;

  return {
    k0nc,
    k0oc,
    ka,
    kp,
    sigmaH0: k0oc * safeSigmaV,
  };
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}

function getNiceTickStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function renderScatterChart({
  title,
  xLabel,
  points,
  valueKey,
  depthUnit,
  xTickFormatter,
}: {
  title: string;
  xLabel: string;
  points: EarthPressurePlotPoint[];
  valueKey: "k0oc" | "sigmaH0";
  depthUnit: string;
  xTickFormatter?: (value: number) => string;
}) {
  const width = 560;
  const height = 360;
  const margin = { top: 54, right: 20, bottom: 24, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...points.map((point) => point.depth), 1);
  const maxValue = Math.max(...points.map((point) => point[valueKey]), 1);
  const xStep = getNiceTickStep(maxValue / 6);
  const xIntervals = Math.max(Math.floor(maxValue / xStep) + 1, 2);
  const xAxisMax = xStep * xIntervals;
  const yStep = getNiceTickStep(maxDepth / 7);
  const yIntervals = Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const yAxisMax = yStep * yIntervals;
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (value: number) => margin.top + (value / yAxisMax) * innerHeight;

  const boreholeIds = Array.from(new Set(points.map((point) => point.boreholeId)));
  const colourByBorehole = new Map<string, string>();
  boreholeIds.forEach((id, index) => {
    colourByBorehole.set(id, BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length]);
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full">
        <rect x={0} y={0} width={width} height={height} rx={12} fill="#ffffff" />
        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          fill="#ffffff"
          stroke="#c7d4e5"
          strokeWidth={1.2}
        />
        {Array.from({ length: xIntervals + 1 }, (_, index) => {
          const value = xStep * index;
          const x = xScale(value);
          return (
            <g key={`x-${value}`}>
              <line x1={x} y1={margin.top} x2={x} y2={margin.top + innerHeight} stroke="#dbe5f1" strokeWidth={1} />
              <text x={x} y={margin.top - 10} textAnchor="middle" fontSize={11} fill="#36557f" fontWeight={600}>
                {xTickFormatter ? xTickFormatter(value) : Math.round(value)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: yIntervals + 1 }, (_, index) => {
          const depth = yStep * index;
          const y = yScale(depth);
          return (
            <g key={`y-${depth}`}>
              <line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="#dbe5f1" strokeWidth={1} />
              <text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize={11} fill="#36557f" fontWeight={600}>
                {depth.toFixed(1)}
              </text>
            </g>
          );
        })}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke="#7f98ba" strokeWidth={1.5} />
        <line x1={margin.left} y1={margin.top} x2={margin.left + innerWidth} y2={margin.top} stroke="#7f98ba" strokeWidth={1.5} />
        {points.map((point, index) => {
          const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
          return (
            <g key={`${point.boreholeId}-${point.depth}-${point[valueKey]}-${index}`}>
              <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
              <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={2.2} fill={colour} />
            </g>
          );
        })}
        <text x={margin.left + innerWidth / 2} y={24} textAnchor="middle" fontSize={12} fill="#1e3a5f" fontWeight={700}>
          {xLabel}
        </text>
        <text
          x={18}
          y={margin.top + innerHeight / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#1e3a5f"
          fontWeight={700}
          transform={`rotate(-90 18 ${margin.top + innerHeight / 2})`}
        >
          Depth ({depthUnit})
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {boreholeIds.map((boreholeId, index) => {
          const colour = BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length];
          return (
            <span
              key={`legend-${boreholeId}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
              {boreholeId}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function EarthPressureProfileTab({
  unitSystem,
  importRows,
  projectParameters,
}: EarthPressureProfileTabProps) {
  const [rows, setRows] = useState<EarthPressureProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const parameterByKey = useMemo(() => {
    const phi = new Map<string, { value: number; source: string | null }>();
    const ocr = new Map<string, { value: number; source: string | null }>();
    const sigmaV0 = new Map<string, { value: number; source: string | null }>();
    (projectParameters ?? []).forEach((row) => {
      const key = `${normaliseBoreholeLabelKey(row.boreholeLabel)}|${depthKey(row.sampleDepth)}`;
      if (row.parameterCode === "phi_prime") {
        phi.set(key, { value: row.value, source: row.sourceToolSlug });
      }
      if (row.parameterCode === "ocr") {
        ocr.set(key, { value: row.value, source: row.sourceToolSlug });
      }
      if (row.parameterCode === "sigma_v0_eff") {
        sigmaV0.set(key, { value: row.value, source: row.sourceToolSlug });
      }
    });
    return { phi, ocr, sigmaV0 };
  }, [projectParameters]);

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
        verticalStress: convertInputValueBetweenSystems(row.verticalStress, "kPa", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  useEffect(() => {
    if (!importRows || importRows.length === 0) {
      return;
    }
    setRows((current) => {
      const template = current[0] ?? initialRows[0];
      return importRows.map((item, index) => ({
        ...template,
        id: index + 1,
        boreholeId: item.boreholeLabel || template.boreholeId,
        sampleDepth:
          item.sampleTopDepth === null
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
        frictionAngle: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          const found = parameterByKey.phi.get(key);
          return found ? String(found.value) : template.frictionAngle;
        })(),
        frictionAngleSource: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          return parameterByKey.phi.has(key) ? "auto-project" : "manual";
        })(),
        ocr: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          const found = parameterByKey.ocr.get(key);
          return found ? String(found.value) : template.ocr;
        })(),
        ocrSource: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          return parameterByKey.ocr.has(key) ? "auto-project" : "manual";
        })(),
        verticalStress: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          const found = parameterByKey.sigmaV0.get(key);
          if (!found) {
            return template.verticalStress;
          }
          const display = Number(convertInputValueBetweenSystems(String(found.value), "kPa", "metric", unitSystem));
          return String(display);
        })(),
        verticalStressSource: (() => {
          const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleTopDepth)}`;
          return parameterByKey.sigmaV0.has(key) ? "auto-project" : "manual";
        })(),
      }));
    });
  }, [importRows, unitSystem, parameterByKey]);

  const updateRow = (id: number, patch: Partial<EarthPressureProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastDepth = current[current.length - 1]?.sampleDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          boreholeId: "",
          sampleDepth: String(parse(lastDepth) + 2),
          frictionAngle: "30",
          ocr: "1.2",
          verticalStress: "100",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const plotPoints: EarthPressurePlotPoint[] = rows
    .map((row) => {
      const depth = parse(row.sampleDepth);
      const phiDeg = parse(row.frictionAngle);
      const ocr = parse(row.ocr);
      const sigmaV = parse(row.verticalStress);
      const { k0oc, sigmaH0 } = computeEarthPressureValues(phiDeg, ocr, sigmaV);

      if (!Number.isFinite(depth) || depth < 0) {
        return null;
      }

      return {
        boreholeId: row.boreholeId?.trim() || "BH not set",
        depth,
        k0oc,
        sigmaH0,
      };
    })
    .filter((point): point is EarthPressurePlotPoint => point !== null);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter layer-wise friction angle, OCR, and vertical effective stress by depth to compute K<sub>0,NC</sub>,
          K<sub>0,OC</sub>, K<sub>a</sub>, K<sub>p</sub>, and the corresponding lateral effective stress profile.
        </p>

        <ProfileTableScroll>
          <table className={profileTableClass("c11")}>
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Borehole ID" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Sample Depth" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>&phi;&prime;</span>} unit="deg" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="OCR" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>&sigma;&prime;<sub>v</sub></span>} unit={stressUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>K<sub>0,NC</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>K<sub>0,OC</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>K<sub>a</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>K<sub>p</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>&sigma;&prime;<sub>h,0</sub></span>} unit={stressUnit} />
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = computeEarthPressureValues(parse(row.frictionAngle), parse(row.ocr), parse(row.verticalStress));
                const matchedImport = matchImportSummaryForProfileRow(
                  importRows,
                  row.boreholeId,
                  row.sampleDepth,
                  unitSystem,
                  parse,
                );
                const isGranular = matchedImport?.soilBehavior === "granular";

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
                        variant="compact"
                        value={row.boreholeId}
                        availableIds={rows.map((item) => item.boreholeId)}
                        onChange={(value) => updateRow(row.id, { boreholeId: value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.sampleDepth}
                        onChange={(event) => updateRow(row.id, { sampleDepth: event.target.value })}
                        className={cnProfileTableInput(false)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          value={row.frictionAngle}
                          onChange={(event) =>
                            updateRow(row.id, {
                              frictionAngle: event.target.value,
                              frictionAngleSource: "manual",
                            })
                          }
                          className={cnProfileTableInput(false)}
                        />
                        {row.frictionAngleSource === "auto-project" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Auto-filled from friction angle tool
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          value={row.ocr}
                          onChange={(event) =>
                            updateRow(row.id, {
                              ocr: event.target.value,
                              ocrSource: "manual",
                            })
                          }
                          className={cnProfileTableInput(false)}
                        />
                        {row.ocrSource === "auto-project" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Auto-filled from OCR tool
                          </span>
                        ) : isGranular ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Cohesionless sample — OCR not computed in OCR tool
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.verticalStress}
                          onChange={(event) =>
                            updateRow(row.id, {
                              verticalStress: event.target.value,
                              verticalStressSource: "manual",
                            })
                          }
                          className={cnProfileTableInput(false)}
                        />
                        {row.verticalStressSource === "auto-project" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Auto-filled from project σ′v0
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={values.k0nc.toFixed(3)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={values.k0oc.toFixed(3)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={values.ka.toFixed(3)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={values.kp.toFixed(3)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={values.sigmaH0.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className={profileTableRemoveButtonClass}
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-white">
              <tr>
                <td className="px-2 py-3 text-left align-top">
                  <button type="button" className={profileTableFooterButtonClass} onClick={addRow}>
                    Add Layer
                  </button>
                </td>
                <td colSpan={9} />
                <td className="px-2 py-3 text-right align-top">
                  <button
                    type="button"
                    className={profileTableFooterButtonClass}
                    onClick={(event) => {
                      void exportProfileExcelFromSection(event.currentTarget);
                    }}
                  >
                    Export Excel
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </ProfileTableScroll>

        {plotPoints.length ? (
          <div className={profilePlotsSectionClass(2)}>
            <ExpandableProfilePlot className={profilePlotItemClass(2)}>
              {renderScatterChart({
                title: "Depth vs K₀,OC",
                xLabel: "K₀,OC",
                points: plotPoints,
                valueKey: "k0oc",
                depthUnit,
                xTickFormatter: (value) => value.toFixed(2),
              })}
            </ExpandableProfilePlot>
            <ExpandableProfilePlot className={profilePlotItemClass(2)}>
              {renderScatterChart({
                title: "Depth vs σ′ₕ,₀",
                xLabel: `σ′ₕ,₀ (${stressUnit})`,
                points: plotPoints,
                valueKey: "sigmaH0",
                depthUnit,
                xTickFormatter: (value) => Math.round(value).toString(),
              })}
            </ExpandableProfilePlot>
          </div>
        ) : null}
      </div>
</section>
  );
}
