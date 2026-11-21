"use client";

import { ExcelExportButton } from "@/components/calculation/excel-export-button";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { DepthProfilePlot } from "@/components/charts/depth-profile-plot";
import { buildDepthProfilePng } from "@/lib/charts/depth-profile-png";
import { ExpandableProfilePlot } from "@/components/expandable-profile-plot";
import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import {
  ProfileTableHeaderCell,
  ProfileTableScroll,
  cnProfileTableInput,
  profileTableClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { buildMhtmlMultipartDocument, EXCEL_TABLE_BLOCK_CSS, excelTextCell, excelTextHeader } from "@/lib/excel-mhtml-export";
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { stroudF2FromPi } from "@/lib/tool-calculations";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface EoedProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  projectParameters?: Array<{
    boreholeLabel: string;
    sampleDepth: number | null;
    parameterCode: string;
    value: number;
    sourceToolSlug?: string | null;
  }>;
  onReportDataChange?: (payload: EoedProfileReportPayload) => void;
}

interface EoedProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  mv: string;
  pi: string;
  n60: string;
  piSource: "manual" | "auto";
  n60Source: "manual" | "auto";
}

interface ProfilePoint {
  boreholeId: string;
  sampleDepth: number;
  mv: number;
  pi: number;
  n60: number;
  f2: number;
  eoed: number;
}

export interface EoedProfileReportPayload {
  depthUnit: string;
  mvUnit: string;
  eoedUnit: string;
  inputMode: "mv" | "pi-f2";
  methodNarrative: string;
  tableRows: Array<Record<string, string>>;
  plotImageDataUrl: string | null;
  plotImageDataUrl2: string | null;
}

const MV_SYMBOL = "m_v";
const EOED_SYMBOL = "E_oed";

const initialRows: EoedProfileRow[] = [
  { id: 1, boreholeId: "", sampleDepth: "1", mv: "0.40", pi: "30", n60: "15", piSource: "manual", n60Source: "manual" },
  { id: 2, boreholeId: "", sampleDepth: "4", mv: "0.25", pi: "40", n60: "18", piSource: "manual", n60Source: "manual" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function sanitiseBoreholeLabel(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .replace(/[▼▾▿▲△]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "BH not set";
}

function normaliseBoreholeLabelKey(value: string | null | undefined): string {
  return sanitiseBoreholeLabel(value).toLowerCase();
}

function depthKey(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "na";
}


function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildChartPngDataUri({
  xUnit,
  depthUnit,
  rows,
  valueKey,
}: {
  title: string;
  xLabel: string;
  xUnit: string;
  depthUnit: string;
  rows: ProfilePoint[];
  valueKey: "mv" | "eoed";
}): string {
  const label = valueKey === "mv" ? "mᵥ" : "E_oed";
  return buildDepthProfilePng({
    title: `Depth vs ${label}`,
    xLabel: `${label} (${xUnit})`,
    depthUnit,
    data: rows.map((r) => ({ boreholeId: r.boreholeId, depth: r.sampleDepth, value: r[valueKey] })),
  });
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}


function computeEoedRowValues({
  row,
  inputMode,
  unitSystem,
}: {
  row: EoedProfileRow;
  inputMode: "mv" | "pi-f2";
  unitSystem: UnitSystem;
}) {
  const sampleDepthMetric = parse(convertInputValueBetweenSystems(row.sampleDepth, "m", unitSystem, "metric"));
  const pi = Math.max(parse(row.pi), 0);
  const n60 = Math.max(parse(row.n60), 0);
  const f2 = stroudF2FromPi(pi);

  if (inputMode === "pi-f2") {
    const eoedMetric = n60 > 0 ? (f2 * n60) / 1000 : 0;
    const mv = eoedMetric > 0 ? 1 / eoedMetric : 0;
    return { sampleDepthMetric, mv, pi, n60, f2, eoedMetric };
  }

  const mv = Math.max(parse(row.mv), 0);
  const eoedMetric = mv > 0 ? 1 / mv : 0;
  return { sampleDepthMetric, mv, pi, n60, f2, eoedMetric };
}

export function EoedProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  projectParameters,
  onReportDataChange,
}: EoedProfileTabProps) {
  const [rows, setRows] = useState<EoedProfileRow[]>(initialRows);
  const [inputMode, setInputMode] = useState<"mv" | "pi-f2">("mv");
  const previousUnitSystem = useRef(unitSystem);
  const importedFromBoreholes = Boolean(importRows && importRows.length > 0);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const eoedUnit = getDisplayUnit("MPa", unitSystem) ?? "MPa";
  const mvUnit = getDisplayUnit("m2/MN", unitSystem) ?? "m2/MN";
  const n60ByBoreholeDepth = useMemo(() => {
    const map = new Map<string, number>();
    (projectParameters ?? []).forEach((parameter) => {
      if (parameter.parameterCode.toLowerCase() !== "n60" || !Number.isFinite(parameter.value)) {
        return;
      }
      const key = `${normaliseBoreholeLabelKey(parameter.boreholeLabel)}|${depthKey(parameter.sampleDepth)}`;
      if (!map.has(key)) {
        map.set(key, parameter.value);
      }
    });
    return map;
  }, [projectParameters]);
  const syncUnitSystem = useEffectEvent(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
        mv: convertInputValueBetweenSystems(row.mv, "m2/MN", previousUnitSystem.current, unitSystem),
      })),
    );

    previousUnitSystem.current = unitSystem;
  });
  const syncImportedRows = useEffectEvent(() => {
    if (!importRows || importRows.length === 0) {
      return;
    }
    setRows((current) => {
      const template = current[0] ?? initialRows[0];
      return importRows.map((item, index) => {
        const boreholeId = item.boreholeLabel || template.boreholeId;
        const key = `${normaliseBoreholeLabelKey(boreholeId)}|${depthKey(item.sampleTopDepth)}`;
        const n60Metric = n60ByBoreholeDepth.get(key);
        const hasPi = typeof item.piValue === "number" && Number.isFinite(item.piValue);
        const hasN60 = typeof n60Metric === "number" && Number.isFinite(n60Metric);

        return {
          ...template,
          id: index + 1,
          boreholeId,
          sampleDepth:
            item.sampleTopDepth === null
              ? template.sampleDepth
              : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
          pi: hasPi ? String(item.piValue) : template.pi,
          n60: hasN60 ? String(n60Metric) : template.n60,
          piSource: hasPi ? "auto" : "manual",
          n60Source: hasN60 ? "auto" : "manual",
        };
      });
    });
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, unitSystem, n60ByBoreholeDepth]);

  const updateRow = (id: number, patch: Partial<EoedProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastBottom = current[current.length - 1]?.sampleDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          boreholeId: "",
          sampleDepth: String(parse(lastBottom) + 2),
          mv: "0.30",
          pi: "30",
          n60: "15",
          piSource: "manual",
          n60Source: "manual",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const plotRows: ProfilePoint[] = useMemo(
    () =>
      rows
        .map((row) => {
          if (profileRowSoilRestricted(soilPolicyToolSlug, importRows, row.boreholeId, row.sampleDepth, unitSystem, parse)) {
            return null;
          }
          const { sampleDepthMetric, mv, pi, n60, f2, eoedMetric } = computeEoedRowValues({
            row,
            inputMode,
            unitSystem,
          });

          return {
            boreholeId: row.boreholeId || "BH not set",
            sampleDepth: sampleDepthMetric,
            mv,
            pi,
            n60,
            f2,
            eoed: Number(convertInputValueBetweenSystems(String(eoedMetric), "MPa", "metric", unitSystem)),
          };
        })
        .filter((row): row is ProfilePoint => row !== null)
        .filter((row) => Number.isFinite(row.sampleDepth) && row.sampleDepth >= 0)
        .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.sampleDepth - b.sampleDepth),
    [rows, unitSystem, soilPolicyToolSlug, importRows, inputMode],
  );

  const mvChartImgSrc = useMemo(
    () =>
      buildChartPngDataUri({
        title: `Depth vs ${MV_SYMBOL}`,
        xLabel: MV_SYMBOL,
        xUnit: mvUnit,
        depthUnit,
        rows: plotRows,
        valueKey: "mv",
      }),
    [depthUnit, mvUnit, plotRows],
  );

  const eoedChartImgSrc = useMemo(
    () =>
      buildChartPngDataUri({
        title: `Depth vs ${EOED_SYMBOL}`,
        xLabel: EOED_SYMBOL,
        xUnit: eoedUnit,
        depthUnit,
        rows: plotRows,
        valueKey: "eoed",
      }),
    [depthUnit, eoedUnit, plotRows],
  );

  const exportRows = useMemo(
    () =>
      rows.map((row) => {
        const { sampleDepthMetric, mv, pi, n60, f2, eoedMetric } = computeEoedRowValues({
          row,
          inputMode,
          unitSystem,
        });

        return {
          boreholeId: row.boreholeId || "BH not set",
          inputMethod: inputMode === "pi-f2" ? "PI-f2 chart" : "Manual mv",
          sampleDepth: format(Number(convertInputValueBetweenSystems(String(sampleDepthMetric), "m", "metric", unitSystem)), 2),
          mv: format(mv, 4),
          pi: format(pi, 1),
          n60: format(n60, 2),
          f2: format(f2, 1),
          eoed: format(Number(convertInputValueBetweenSystems(String(eoedMetric), "MPa", "metric", unitSystem)), 3),
        };
      }),
    [inputMode, rows, unitSystem],
  );

  const reportTableRows = useMemo(
    () =>
      exportRows.map((row) => ({
        Borehole: row.boreholeId,
        [`Depth (${depthUnit})`]: row.sampleDepth,
        "Input method": row.inputMethod,
        [`mv (${mvUnit})`]: row.mv,
        "PI (%)": row.pi,
        N60: row.n60,
        "f2 (kN/m2)": row.f2,
        [`Eoed (${eoedUnit})`]: row.eoed,
      })),
    [depthUnit, eoedUnit, exportRows, mvUnit],
  );

  useEffect(() => {
    if (!onReportDataChange) {
      return;
    }

    onReportDataChange({
      depthUnit,
      mvUnit,
      eoedUnit,
      inputMode,
      methodNarrative:
        inputMode === "pi-f2"
          ? "In this report, the PI-f2 chart alternative was selected. PI values are read from the selected borehole samples where available, f2 is obtained from the digitised PI-f2 chart, and Eoed is calculated as f2 × N60."
          : "In this report, the direct mv method was selected. Eoed is calculated as the reciprocal of the entered coefficient of volume compressibility, mv.",
      tableRows: reportTableRows,
      plotImageDataUrl: mvChartImgSrc,
      plotImageDataUrl2: eoedChartImgSrc,
    });
  }, [depthUnit, eoedChartImgSrc, eoedUnit, inputMode, mvChartImgSrc, mvUnit, onReportDataChange, reportTableRows]);

  const buildExportTableHtml = () => {
    const headerCells = [
      "Borehole ID",
      `Sample depth (${depthUnit})`,
      "Input method",
      `${MV_SYMBOL} (${mvUnit})`,
      "PI (%)",
      "N60",
      "f2 (kN/m2)",
      `${EOED_SYMBOL} (${eoedUnit})`,
    ]
      .map((label) => excelTextHeader(label))
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            ${excelTextCell(row.boreholeId)}
            ${excelTextCell(row.sampleDepth)}
            ${excelTextCell(row.inputMethod)}
            ${excelTextCell(row.mv)}
            ${excelTextCell(row.pi)}
            ${excelTextCell(row.n60)}
            ${excelTextCell(row.f2)}
            ${excelTextCell(row.eoed)}
          </tr>
        `,
      )
      .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const buildExcelMhtmlDocument = () => {
    const tableHtml = buildExportTableHtml();
    const excelHtml = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <title>Eoed from ${MV_SYMBOL} Profile Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      ${EXCEL_TABLE_BLOCK_CSS}
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
      .chart-grid img { width: 100%; max-width: 1200px; height: auto; display: block; border: 1px solid #cbd5e1; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>Eoed from ${MV_SYMBOL} Soil Profile Export</h1>
    <p>Layered oedometer profile generated from entered ${MV_SYMBOL} values.</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    <h2>Profile plots</h2>
    <div class="chart-grid">
      <div><img src="file:///eoed-mv.png" alt="Depth vs ${MV_SYMBOL} plot" /></div>
      <div><img src="file:///eoed-eoed.png" alt="Depth vs Eoed plot" /></div>
    </div>
  </body>
</html>`;

    if (!mvChartImgSrc.startsWith("data:image/png;base64,") || !eoedChartImgSrc.startsWith("data:image/png;base64,")) {
      return excelHtml;
    }

    return buildMhtmlMultipartDocument(excelHtml, [
      { contentLocation: "file:///eoed-mv.png", base64Png: mvChartImgSrc },
      { contentLocation: "file:///eoed-eoed.png", base64Png: eoedChartImgSrc },
    ]);
  };

  const handleExportExcel = () => {
    try {
      const excelPayload = buildExcelMhtmlDocument();
      downloadBlob(
        "eoed-from-mv-profile.xls",
        new Blob([excelPayload], { type: "application/vnd.ms-excel;charset=utf-8" }),
      );
    } catch (error) {
      console.error(error);
      window.alert("Excel export failed. Please try again.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Build a compressibility profile by borehole and sample depth. Use m<sub>v</sub> directly when oedometer
            data are available, or estimate E<sub>oed</sub> from the PI-f<sub>2</sub> chart and N<sub>60</sub> as a
            screening alternative.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            m<sub>v</sub> should be taken at the oedometer stress level corresponding to the relevant sample stress.
          </p>
          {importedFromBoreholes ? (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Sample depth is imported from the selected boreholes (Use in Tools) and is locked.
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,300px)] sm:items-end">
          <p className="text-sm leading-6 text-slate-600">
            PI is auto-filled from selected borehole samples when available. N<sub>60</sub> is auto-filled from saved
            project parameters when an SPT correction result exists at the same depth.
          </p>
          <label className="text-sm font-medium text-slate-700">
            <span className="mb-1 block">Eoed input method</span>
            <select
              value={inputMode}
              onChange={(event) => setInputMode(event.target.value === "pi-f2" ? "pi-f2" : "mv")}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              <option value="mv">Use mv directly</option>
              <option value="pi-f2">Estimate from PI-f2 chart and N60</option>
            </select>
          </label>
        </div>

        <ProfileTableScroll>
          <table className={profileTableClass("c8")}>
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Borehole ID" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="Sample depth" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>m<sub>v</sub></span>} unit={mvUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="PI" unit="%" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>N<sub>60</sub></span>} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>f<sub>2</sub></span>} unit="kN/m²" />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>E<sub>oed</sub></span>} unit={eoedUnit} />
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const soilRestricted = profileRowSoilRestricted(
                  soilPolicyToolSlug,
                  importRows,
                  row.boreholeId,
                  row.sampleDepth,
                  unitSystem,
                  parse,
                );
                const matchedSoil = matchImportSummaryForProfileRow(
                  importRows,
                  row.boreholeId,
                  row.sampleDepth,
                  unitSystem,
                  parse,
                );
                const restrictionHint = soilRestrictionUserHint(soilPolicyToolSlug, matchedSoil?.soilBehavior ?? null);
                const sampleDepth = parse(row.sampleDepth);
                const hasDepthIssue = !Number.isFinite(sampleDepth) || sampleDepth < 0;
                const { mv, f2, eoedMetric } = computeEoedRowValues({ row, inputMode, unitSystem });
                const eoedDisplay = Number(convertInputValueBetweenSystems(String(eoedMetric), "MPa", "metric", unitSystem));
                const mvDisplay = inputMode === "pi-f2" ? format(mv, 4) : row.mv;

                return (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-200 align-top ${soilRestricted ? "bg-slate-50/90 opacity-[0.85]" : "bg-white"}`}
                    title={soilRestricted ? "Soil type is not used with this tool (set under Projects)." : undefined}
                  >
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
                        disabled={importedFromBoreholes || soilRestricted}
                        className={
                          importedFromBoreholes || soilRestricted
                            ? cnProfileTableInput(true)
                            : hasDepthIssue
                              ? "w-full min-w-0 rounded-lg border border-red-300 bg-red-50 px-1.5 py-1 text-xs text-slate-900 outline-none transition-colors duration-200 focus:border-red-400 sm:px-2 sm:py-1.5 sm:text-[13px]"
                              : cnProfileTableInput(false)
                        }
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Enter a valid sample depth.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      {soilRestricted ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-2 text-[11px] leading-snug text-amber-950">
                          {restrictionHint ?? "Not used with this tool (soil type in Projects)."}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={mvDisplay}
                          onChange={(event) => updateRow(row.id, { mv: event.target.value })}
                          disabled={inputMode === "pi-f2"}
                          className={cnProfileTableInput(inputMode === "pi-f2")}
                        />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.pi}
                          onChange={(event) => updateRow(row.id, { pi: event.target.value, piSource: "manual" })}
                          disabled={soilRestricted || inputMode === "mv"}
                          className={cnProfileTableInput(soilRestricted || inputMode === "mv")}
                        />
                        {row.piSource === "auto" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Auto PI
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
                          value={row.n60}
                          onChange={(event) => updateRow(row.id, { n60: event.target.value, n60Source: "manual" })}
                          disabled={soilRestricted || inputMode === "mv"}
                          className={cnProfileTableInput(soilRestricted || inputMode === "mv")}
                        />
                        {row.n60Source === "auto" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Auto N60
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted || inputMode === "mv" ? "—" : format(f2, 1)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : format(eoedDisplay, 3)} />
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
          </table>
        </ProfileTableScroll>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-base btn-md" onClick={addRow}>
            Add Layer
          </button>
          <ExcelExportButton type="button" className="btn-base btn-md" onClick={handleExportExcel}>
            Export Excel
          </ExcelExportButton>
        </div>

      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ExpandableProfilePlot>
          <DepthProfilePlot title="Depth vs mᵥ" xLabel={`mᵥ (${mvUnit})`} depthUnit={depthUnit} data={plotRows.map((r) => ({ boreholeId: r.boreholeId, depth: r.sampleDepth, value: r.mv }))} />
        </ExpandableProfilePlot>
        <ExpandableProfilePlot>
          <DepthProfilePlot title="Depth vs E_oed" xLabel={`E_oed (${eoedUnit})`} depthUnit={depthUnit} data={plotRows.map((r) => ({ boreholeId: r.boreholeId, depth: r.sampleDepth, value: r.eoed }))} />
        </ExpandableProfilePlot>
      </div>
</section>
  );
}


