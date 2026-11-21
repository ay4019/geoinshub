"use client";

import { ExcelExportButton } from "@/components/calculation/excel-export-button";
import type { ReactNode } from "react";
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
import {
  matchImportSummaryForProfileRow,
  profileRowSoilRestricted,
  soilRestrictionUserHint,
} from "@/lib/soil-behavior-policy";
import { buildMhtmlMultipartDocument, EXCEL_TABLE_BLOCK_CSS, excelTextCell, excelTextHeader } from "@/lib/excel-mhtml-export";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";

interface OcrProfileTabProps {
  unitSystem: UnitSystem;
  /** Emits data for the standard two-part report (Report tab). */
  onReportDataChange?: (payload: StandardReportPayload) => void;
  importRows?: SelectedBoreholeSummary[];
  soilPolicyToolSlug?: string;
  globalGroundwaterDepth?: string;
  globalUnitWeight?: string;
}

interface OcrProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  gwtDepth: string;
  unitWeight: string;
  preconsolidationStress: string;
}

interface DerivedRow {
  row: OcrProfileRow;
  sampleDepthMetric: number;
  sigmaV0EffMetric: number;
  sigmaV0EffDisplay: number;
  ocr: number | null;
}

interface OcrProfilePoint {
  boreholeId: string;
  sampleDepth: number;
  sigmaV0Eff: number;
  ocr: number;
}

const GAMMA_W_METRIC = 9.81; // kN/m3

const initialRows: OcrProfileRow[] = [
  {
    id: 1,
    boreholeId: "",
    sampleDepth: "1",
    gwtDepth: "1.5",
    unitWeight: "18.5",
    preconsolidationStress: "140",
  },
  {
    id: 2,
    boreholeId: "",
    sampleDepth: "3.5",
    gwtDepth: "1.5",
    unitWeight: "19.0",
    preconsolidationStress: "210",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
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
  rows: OcrProfilePoint[];
  valueKey: "sigmaV0Eff" | "ocr";
}): string {
  const isOcr = valueKey === "ocr";
  const label = isOcr ? "OCR" : "σ′ᵥ₀";
  const xLabel = isOcr ? "OCR (–)" : `σ′ᵥ₀ (${xUnit ?? ""})`;
  const referenceLines = isOcr ? [{ value: 1, label: "OCR = 1" }] : undefined;
  const data = rows.map((r) => ({ boreholeId: r.boreholeId, depth: r.sampleDepth, value: r[valueKey] }));
  return buildDepthProfilePng({ title: `Depth vs ${label}`, xLabel, depthUnit, data, referenceLines });
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}

function ProfileChart({
  depthUnit,
  xUnit,
  rows,
  valueKey,
}: {
  title: ReactNode;
  depthUnit: string;
  xUnit?: string;
  rows: OcrProfilePoint[];
  valueKey: "sigmaV0Eff" | "ocr";
}) {
  const isOcr = valueKey === "ocr";
  const label = isOcr ? "OCR" : "σ′ᵥ₀";
  const xLabel = isOcr ? "OCR (–)" : `σ′ᵥ₀ (${xUnit ?? ""})`;
  const referenceLines = isOcr ? [{ value: 1, label: "OCR = 1" }] : undefined;
  const data = rows.map((r) => ({ boreholeId: r.boreholeId, depth: r.sampleDepth, value: r[valueKey] }));
  return (
    <ExpandableProfilePlot>
      <DepthProfilePlot title={`Depth vs ${label}`} xLabel={xLabel} depthUnit={depthUnit} data={data} referenceLines={referenceLines} />
    </ExpandableProfilePlot>
  );
}

export function OcrProfileTab({
  unitSystem,
  importRows,
  soilPolicyToolSlug,
  globalGroundwaterDepth = "",
  globalUnitWeight = "",
  onReportDataChange,
}: OcrProfileTabProps) {
  const [rows, setRows] = useState<OcrProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const importedFromBoreholes = Boolean(importRows && importRows.length > 0);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const syncUnitSystem = useEffectEvent(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
        gwtDepth: convertInputValueBetweenSystems(row.gwtDepth, "m", previousUnitSystem.current, unitSystem),
        unitWeight: convertInputValueBetweenSystems(
          row.unitWeight,
          "kN/m3",
          previousUnitSystem.current,
          unitSystem,
        ),
        preconsolidationStress: convertInputValueBetweenSystems(
          row.preconsolidationStress,
          "kPa",
          previousUnitSystem.current,
          unitSystem,
        ),
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
      return importRows.map((item, index) => ({
        ...template,
        id: index + 1,
        boreholeId: item.boreholeLabel || template.boreholeId,
        sampleDepth:
          item.sampleTopDepth === null
            ? template.sampleDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
        gwtDepth:
          item.gwtDepth === null || item.gwtDepth === undefined || !Number.isFinite(item.gwtDepth)
            ? template.gwtDepth
            : convertInputValueBetweenSystems(String(item.gwtDepth), "m", "metric", unitSystem),
        unitWeight:
          item.unitWeight === null || item.unitWeight === undefined || !Number.isFinite(item.unitWeight)
            ? template.unitWeight
            : convertInputValueBetweenSystems(String(item.unitWeight), "kN/m3", "metric", unitSystem),
      }));
    });
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    if (importedFromBoreholes) {
      return;
    }
    const trimmedGwt = globalGroundwaterDepth.trim();
    const trimmedUnitWeight = globalUnitWeight.trim();

    if (!trimmedGwt && !trimmedUnitWeight) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      setRows((current) =>
        current.map((row) => ({
          ...row,
          gwtDepth: trimmedGwt || row.gwtDepth,
          unitWeight: trimmedUnitWeight || row.unitWeight,
        })),
      );
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [globalGroundwaterDepth, globalUnitWeight, importedFromBoreholes]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<OcrProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastRow = current[current.length - 1];
      const lastDepth = lastRow?.sampleDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          boreholeId: "",
          sampleDepth: String(parse(lastDepth) + 2),
          gwtDepth: "1.5",
          unitWeight: "18.5",
          preconsolidationStress: "180",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const derivedRows: DerivedRow[] = useMemo(
    () =>
      rows.map((row) => {
        const sampleDepthMetric = parse(convertInputValueBetweenSystems(row.sampleDepth, "m", unitSystem, "metric"));
        const gwtDepthMetric = parse(convertInputValueBetweenSystems(row.gwtDepth, "m", unitSystem, "metric"));
        const unitWeightMetric = parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
        const hasSigmaP = row.preconsolidationStress.trim().length > 0;
        const sigmaPMetric = hasSigmaP
          ? parse(convertInputValueBetweenSystems(row.preconsolidationStress, "kPa", unitSystem, "metric"))
          : Number.NaN;

        const totalStressMetric = Math.max(unitWeightMetric, 0) * Math.max(sampleDepthMetric, 0);
        const porePressureMetric = GAMMA_W_METRIC * Math.max(sampleDepthMetric - Math.max(gwtDepthMetric, 0), 0);
        const sigmaV0EffMetric = Math.max(totalStressMetric - porePressureMetric, 0);
        const ocr =
          hasSigmaP && Number.isFinite(sigmaPMetric) && sigmaPMetric > 0 && sigmaV0EffMetric > 0
            ? sigmaPMetric / sigmaV0EffMetric
            : null;
        const sigmaV0EffDisplay = Number(
          convertInputValueBetweenSystems(String(sigmaV0EffMetric), "kPa", "metric", unitSystem),
        );

        return {
          row,
          sampleDepthMetric,
          sigmaV0EffMetric,
          sigmaV0EffDisplay,
          ocr,
        };
      }),
    [rows, unitSystem],
  );

  const sigmaChartRows: OcrProfilePoint[] = useMemo(
    () =>
      derivedRows
        .filter(
          (item) =>
            !profileRowSoilRestricted(
              soilPolicyToolSlug,
              importRows,
              item.row.boreholeId,
              item.row.sampleDepth,
              unitSystem,
              parse,
            ),
        )
        .map((item) => ({
          boreholeId: item.row.boreholeId || "BH not set",
          sampleDepth: Number(
            convertInputValueBetweenSystems(String(item.sampleDepthMetric), "m", "metric", unitSystem),
          ),
          sigmaV0Eff: item.sigmaV0EffDisplay,
          ocr: item.ocr ?? 0,
        }))
        .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.sampleDepth - b.sampleDepth),
    [derivedRows, unitSystem, soilPolicyToolSlug, importRows],
  );

  const ocrChartRows: OcrProfilePoint[] = useMemo(
    () =>
      derivedRows
        .filter((item) => item.ocr !== null)
        .filter(
          (item) =>
            !profileRowSoilRestricted(
              soilPolicyToolSlug,
              importRows,
              item.row.boreholeId,
              item.row.sampleDepth,
              unitSystem,
              parse,
            ),
        )
        .map((item) => ({
          boreholeId: item.row.boreholeId || "BH not set",
          sampleDepth: Number(
            convertInputValueBetweenSystems(String(item.sampleDepthMetric), "m", "metric", unitSystem),
          ),
          sigmaV0Eff: item.sigmaV0EffDisplay,
          ocr: item.ocr ?? 0,
        }))
        .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.sampleDepth - b.sampleDepth),
    [derivedRows, unitSystem, soilPolicyToolSlug, importRows],
  );

  useEffect(() => {
    if (!onReportDataChange) return;
    const items = derivedRows
      .filter((item) => !profileRowSoilRestricted(soilPolicyToolSlug, importRows, item.row.boreholeId, item.row.sampleDepth, unitSystem, parse))
      .map((item) => ({
        boreholeId: item.row.boreholeId || "BH not set",
        depth: parse(item.row.sampleDepth),
        gwt: item.row.gwtDepth,
        gamma: item.row.unitWeight,
        sigmaP: item.row.preconsolidationStress,
        sigmaV0: item.sigmaV0EffDisplay,
        ocr: item.ocr,
      }))
      .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId, undefined, { numeric: true }) || a.depth - b.depth);
    const below1 = items.filter((p) => p.ocr !== null && p.ocr < 1).length;
    onReportDataChange({
      depthUnit,
      columns: [
        { header: "Borehole", key: "Borehole" },
        { header: `Depth (${depthUnit})`, key: "Depth" },
        { header: `GWT (${depthUnit})`, key: "gwt" },
        { header: `γ (${unitWeightUnit})`, key: "gamma" },
        { header: `σ′ᵥ₀ (${stressUnit})`, key: "sigmaV0" },
        { header: `σ′ₚ (${stressUnit})`, key: "sigmaP" },
        { header: "OCR", key: "ocr" },
      ],
      rows: items.map((p) => ({
        Borehole: p.boreholeId,
        Depth: p.depth.toFixed(2),
        gwt: p.gwt,
        gamma: p.gamma,
        sigmaV0: p.sigmaV0.toFixed(1),
        sigmaP: p.sigmaP.trim() ? Number(p.sigmaP).toFixed(1) : "—",
        ocr: p.ocr === null ? "—" : p.ocr.toFixed(2),
      })),
      points: items.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, values: { sigmaV0: p.sigmaV0, ocr: p.ocr } })),
      series: [
        { key: "sigmaV0", label: "σ′ᵥ₀", unit: stressUnit },
        { key: "ocr", label: "OCR", unit: "", referenceLine: { value: 1, label: "OCR = 1" } },
      ],
      methodNotes: [
        "σ′ᵥ₀ was calculated at each sample depth from the bulk unit weight and groundwater depth entered for that sample (Equation 1), and OCR from the preconsolidation stress entered by the user (Equation 2). The origin of σ′ₚ (oedometer interpretation method or in-situ correlation) is not recorded by the tool.",
        ...(below1 ? [`${below1} sample(s) give OCR < 1, which is physically implausible for a stable deposit and should be checked (sample disturbance, groundwater level, or unit weight).`] : []),
      ],
      exclusions:
        derivedRows.length > items.length
          ? [`${derivedRows.length - items.length} sample(s) excluded by the project soil classification.`]
          : undefined,
    });
  }, [depthUnit, derivedRows, importRows, onReportDataChange, soilPolicyToolSlug, stressUnit, unitSystem, unitWeightUnit]);

  const sigmaChartImgSrc = useMemo(
    () =>
      buildChartPngDataUri({
        title: "Depth vs σ′v₀",
        xLabel: "σ′v₀",
        xUnit: stressUnit,
        depthUnit,
        rows: sigmaChartRows,
        valueKey: "sigmaV0Eff",
      }),
    [sigmaChartRows, depthUnit, stressUnit],
  );

  const ocrChartImgSrc = useMemo(
    () =>
      buildChartPngDataUri({
        title: "Depth vs OCR",
        xLabel: "OCR",
        xUnit: "",
        depthUnit,
        rows: ocrChartRows,
        valueKey: "ocr",
      }),
    [ocrChartRows, depthUnit],
  );

  const exportRows = useMemo(
    () =>
      derivedRows
        .filter(
          (item) =>
            !profileRowSoilRestricted(
              soilPolicyToolSlug,
              importRows,
              item.row.boreholeId,
              item.row.sampleDepth,
              unitSystem,
              parse,
            ),
        )
        .map((item) => ({
          boreholeId: item.row.boreholeId || "BH not set",
          sampleDepth: format(Number(item.row.sampleDepth), 2),
          gwt: format(Number(item.row.gwtDepth), 2),
          unitWeight: format(Number(item.row.unitWeight), 2),
          sigmaP: format(Number(item.row.preconsolidationStress), 2),
          sigmaV0: format(item.sigmaV0EffDisplay, 2),
          ocr: item.ocr === null ? "-" : format(item.ocr, 3),
        })),
    [derivedRows, soilPolicyToolSlug, importRows, unitSystem],
  );

  const buildExportTableHtml = () => {
    const headerCells = [
      "Borehole ID",
      `Sample Depth (${depthUnit})`,
      `GWT (${depthUnit})`,
      `Unit weight, gamma (${unitWeightUnit})`,
      `sigma'_p (${stressUnit})`,
      `sigma'_v0 (${stressUnit})`,
      "OCR",
    ]
      .map((label) => excelTextHeader(label))
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            ${excelTextCell(row.boreholeId)}
            ${excelTextCell(row.sampleDepth)}
            ${excelTextCell(row.gwt)}
            ${excelTextCell(row.unitWeight)}
            ${excelTextCell(row.sigmaP)}
            ${excelTextCell(row.sigmaV0)}
            ${excelTextCell(row.ocr)}
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
    <title>OCR Soil Profile Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      ${EXCEL_TABLE_BLOCK_CSS}
      .chart-stack { width: 100%; margin-top: 12px; }
      .chart-cell { width: 100%; vertical-align: top; border: 1px solid #cbd5e1; padding: 6px; margin-bottom: 12px; border-radius: 6px; }
      .chart-image { width: 100%; max-width: 1200px; height: auto; display: block; }
    </style>
  </head>
  <body>
    <h1>OCR Soil Profile Export</h1>
    <p>Layered OCR profile generated from sample depth, groundwater level, bulk unit weight, and preconsolidation stress.</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    <h2>Profile plots</h2>
    <div class="chart-stack">
      <div class="chart-cell"><img class="chart-image" src="file:///ocr-sigma-v0.png" alt="Depth vs effective stress plot" /></div>
      <div class="chart-cell"><img class="chart-image" src="file:///ocr-plot.png" alt="Depth vs OCR plot" /></div>
    </div>
  </body>
</html>`;

    if (!sigmaChartImgSrc.startsWith("data:image/png;base64,") || !ocrChartImgSrc.startsWith("data:image/png;base64,")) {
      return excelHtml;
    }

    return buildMhtmlMultipartDocument(excelHtml, [
      { contentLocation: "file:///ocr-sigma-v0.png", base64Png: sigmaChartImgSrc },
      { contentLocation: "file:///ocr-plot.png", base64Png: ocrChartImgSrc },
    ]);
  };

  const handleExportExcel = () => {
    try {
      const excelPayload = buildExcelMhtmlDocument();
      downloadBlob(
        "ocr-soil-profile-export.xls",
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
        <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Enter BH sample depth with GWT, unit weight, and oedometer-derived preconsolidation stress. The tool
          calculates vertical effective stress and OCR automatically at Sample Depth.
        </p>

        <ProfileTableScroll>
          <table className={profileTableClass("c8")}>
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[9%]" />
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
                  <ProfileTableHeaderCell title="GWT" unit={depthUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell
                    title={
                      <span>
                        Unit weight, &gamma;
                      </span>
                    }
                    unit={unitWeightUnit}
                  />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell
                    title={
                      <span>
                        &sigma;&prime;<sub>p</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell
                    title={
                      <span>
                        &sigma;&prime;<sub>v0</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title="OCR" />
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {derivedRows.map((item) => {
                const soilRestricted = profileRowSoilRestricted(
                  soilPolicyToolSlug,
                  importRows,
                  item.row.boreholeId,
                  item.row.sampleDepth,
                  unitSystem,
                  parse,
                );
                const matchedSoil = matchImportSummaryForProfileRow(
                  importRows,
                  item.row.boreholeId,
                  item.row.sampleDepth,
                  unitSystem,
                  parse,
                );
                const restrictionHint = soilRestrictionUserHint(soilPolicyToolSlug, matchedSoil?.soilBehavior ?? null);
                return (
                  <tr
                    key={item.row.id}
                    className={`border-t border-slate-200 align-top ${soilRestricted ? "bg-slate-50/90 opacity-[0.85]" : "bg-white"}`}
                    title={soilRestricted ? "Soil type is not used with this tool (set under Projects)." : undefined}
                  >
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
                        variant="compact"
                        value={item.row.boreholeId}
                        availableIds={rows.map((row) => row.boreholeId)}
                        onChange={(value) => updateRow(item.row.id, { boreholeId: value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      {soilRestricted ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-2 text-[11px] leading-snug text-amber-950">
                          {restrictionHint ?? "Not used with this tool (soil type in Projects)."}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.row.sampleDepth}
                          onChange={(event) => updateRow(item.row.id, { sampleDepth: event.target.value })}
                          disabled={importedFromBoreholes}
                          className={cnProfileTableInput(importedFromBoreholes)}
                        />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.row.gwtDepth}
                        onChange={(event) => updateRow(item.row.id, { gwtDepth: event.target.value })}
                        disabled={soilRestricted || importedFromBoreholes}
                        className={cnProfileTableInput(soilRestricted || importedFromBoreholes)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.row.unitWeight}
                        onChange={(event) => updateRow(item.row.id, { unitWeight: event.target.value })}
                        disabled={soilRestricted || importedFromBoreholes}
                        className={cnProfileTableInput(soilRestricted || importedFromBoreholes)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.row.preconsolidationStress}
                        onChange={(event) => updateRow(item.row.id, { preconsolidationStress: event.target.value })}
                        disabled={soilRestricted}
                        className={cnProfileTableInput(soilRestricted)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : format(item.sigmaV0EffDisplay, 2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={soilRestricted ? "—" : item.ocr === null ? "-" : format(item.ocr, 3)} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className={profileTableRemoveButtonClass}
                        onClick={() => removeRow(item.row.id)}
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
        <ProfileChart
          title={
            <span>
              Depth vs &sigma;&prime;<sub>v0</sub>
            </span>
          }
          depthUnit={depthUnit}
          xUnit={stressUnit}
          rows={sigmaChartRows}
          valueKey="sigmaV0Eff"
        />
        <ProfileChart title={<span>Depth vs OCR</span>} depthUnit={depthUnit} rows={ocrChartRows} valueKey="ocr" />
      </div>
</section>
  );
}
