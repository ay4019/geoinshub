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
import { buildMhtmlMultipartDocument, EXCEL_TABLE_BLOCK_CSS, excelTextCell, excelTextHeader } from "@/lib/excel-mhtml-export";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";
import type { StandardReportPayload } from "@/lib/reports/standard-report-types";

interface GmaxProfileTabProps {
  unitSystem: UnitSystem;
  /** Emits data for the standard two-part report (Report tab). */
  onReportDataChange?: (payload: StandardReportPayload) => void;
  importRows?: SelectedBoreholeSummary[];
  /** Passed from tools; Gmax has no soil-based row lock (all samples used). */
  soilPolicyToolSlug?: string;
}

interface GmaxProfileRow {
  id: number;
  boreholeId: string;
  sampleDepth: string;
  vs: string;
  unitWeight: string;
}

interface ProfilePoint {
  boreholeId: string;
  sampleDepth: number;
  vs: number;
  gmax: number;
}

const GRAVITY = 9.81;
const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: GmaxProfileRow[] = [
  {
    id: 1,
    boreholeId: "",
    sampleDepth: "1",
    vs: "160",
    unitWeight: "17.5",
  },
  {
    id: 2,
    boreholeId: "",
    sampleDepth: "4",
    vs: "240",
    unitWeight: "19.0",
  },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function OutputCell({ value }: { value: string }) {
  return <div className={profileTableOutputCellClass}>{value}</div>;
}

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function getNiceTickStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;

  if (normalised <= 1) {
    return magnitude;
  }
  if (normalised <= 2) {
    return 2 * magnitude;
  }
  if (normalised <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function svgToDataUri(svgMarkup: string): string {
  const encoded = typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(svgMarkup))) : "";
  return `data:image/svg+xml;base64,${encoded}`;
}

function buildChartSvgMarkup({
  title,
  xLabel,
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
  valueKey: "vs" | "gmax";
}) {
  const width = 560;
  const height = 360;
  const margin = { top: 54, right: 20, bottom: 24, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...rows.map((row) => row.sampleDepth), 1);
  const maxDataValue = Math.max(...rows.map((row) => row[valueKey]), 1);
  const xStep = getNiceTickStep(maxDataValue / 5);
  const xIntervals = Math.max(Math.floor(maxDataValue / xStep) + 1, 2);
  const xAxisMax = xStep * xIntervals;
  const yStep = getNiceTickStep(maxDepth / 8);
  const yIntervals = Math.max(Math.floor(maxDepth / yStep) + 1, 2);
  const yAxisMax = yStep * yIntervals;
  const xScale = (value: number) => margin.left + (value / xAxisMax) * innerWidth;
  const yScale = (depth: number) => margin.top + (depth / yAxisMax) * innerHeight;
  const boreholeIds = Array.from(new Set(rows.map((row) => row.boreholeId)));

  const lineSeries = boreholeIds.map((boreholeId, boreholeIndex) => {
    const boreholeRows = rows
      .filter((row) => row.boreholeId === boreholeId)
      .sort((a, b) => a.sampleDepth - b.sampleDepth);
    const colour = BOREHOLE_COLOURS[boreholeIndex % BOREHOLE_COLOURS.length];
    const points = boreholeRows.map((row) => ({
      x: xScale(row[valueKey]),
      y: yScale(row.sampleDepth),
    }));

    return { boreholeId, colour, points };
  });

  const xGrid = Array.from({ length: xIntervals + 1 })
    .map((_, index) => {
      const value = xStep * index;
      const x = xScale(value);
      return `
        <line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + innerHeight}" stroke="#dbe5f1" stroke-width="1" />
        <text x="${x}" y="${margin.top - 10}" text-anchor="middle" font-size="11" fill="#36557f" font-weight="600">${Math.round(value)}</text>
      `;
    })
    .join("");

  const yGrid = Array.from({ length: yIntervals + 1 })
    .map((_, index) => {
      const depth = yStep * index;
      const y = yScale(depth);
      return `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + innerWidth}" y2="${y}" stroke="#dbe5f1" stroke-width="1" />
        <text x="${margin.left - 12}" y="${y + 4}" text-anchor="end" font-size="11" fill="#36557f" font-weight="600">${depth.toFixed(1)}</text>
      `;
    })
    .join("");

  const seriesMarkup = lineSeries
    .map((series) => {
      const line =
        series.points.length > 1
          ? `<polyline fill="none" stroke="${series.colour}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${series.points.map((point) => `${point.x},${point.y}`).join(" ")}" />`
          : "";

      const markers = series.points
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="4.2" fill="#ffffff" stroke="${series.colour}" stroke-width="2.2" />
            <circle cx="${point.x}" cy="${point.y}" r="1.8" fill="${series.colour}" />
          `,
        )
        .join("");

      return line + markers;
    })
    .join("");

  const legend = boreholeIds
    .map((boreholeId, index) => {
      const colour = BOREHOLE_COLOURS[index % BOREHOLE_COLOURS.length];
      return `
        <div style="display:inline-flex;align-items:center;gap:8px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:999px;padding:6px 12px;margin:4px;font-size:12px;font-weight:600;color:#475569;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${colour};box-shadow:0 0 0 3px ${hexToRgba(colour, 0.12)};"></span>
          <span>${escapeHtml(boreholeId)}</span>
        </div>
      `;
    })
    .join("");

  return `
    <div style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;padding:20px;">
      <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(title)}</h3>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;">
        <rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="#ffffff" />
        <rect x="${margin.left}" y="${margin.top}" width="${innerWidth}" height="${innerHeight}" fill="#ffffff" stroke="#c7d4e5" stroke-width="1.25" />
        ${xGrid}
        ${yGrid}
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + innerHeight}" stroke="#7f98ba" stroke-width="1.5" />
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left + innerWidth}" y2="${margin.top}" stroke="#7f98ba" stroke-width="1.5" />
        ${seriesMarkup}
        <text x="${margin.left + innerWidth / 2}" y="24" text-anchor="middle" font-size="12" fill="#1e3a5f" font-weight="700">${escapeHtml(xLabel)} (${escapeHtml(xUnit)})</text>
        <text x="18" y="${margin.top + innerHeight / 2}" text-anchor="middle" font-size="12" fill="#1e3a5f" font-weight="700" transform="rotate(-90 18 ${margin.top + innerHeight / 2})">Depth (${escapeHtml(depthUnit)})</text>
      </svg>
      <div style="margin-top:12px;text-align:center;">${legend}</div>
    </div>
  `;
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
  valueKey: "vs" | "gmax";
}): string {
  const label = valueKey === "vs" ? "Vₛ" : "Gₘₐₓ";
  return buildDepthProfilePng({
    title: `Depth vs ${label}`,
    xLabel: `${label} (${xUnit})`,
    depthUnit,
    data: rows.map((r) => ({ boreholeId: r.boreholeId, depth: r.sampleDepth, value: r[valueKey] })),
  });
}

function ProfileChart({
  xUnit,
  depthUnit,
  rows,
  valueKey,
}: {
  containerId: string;
  keyPrefix: string;
  title: ReactNode;
  xLabel: string;
  xUnit: string;
  depthUnit: string;
  rows: ProfilePoint[];
  valueKey: "vs" | "gmax";
}) {
  const label = valueKey === "vs" ? "Vₛ" : "Gₘₐₓ";
  return (
    <ExpandableProfilePlot>
      <DepthProfilePlot
        title={`Depth vs ${label}`}
        xLabel={`${label} (${xUnit})`}
        depthUnit={depthUnit}
        data={rows.map((r) => ({ boreholeId: r.boreholeId, depth: r.sampleDepth, value: r[valueKey] }))}
        />
    </ExpandableProfilePlot>
  );
}

export function GmaxProfileTab({ unitSystem, importRows, onReportDataChange }: GmaxProfileTabProps) {
  const [rows, setRows] = useState<GmaxProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const exportTableRef = useRef<HTMLDivElement | null>(null);
  const importedFromBoreholes = Boolean(importRows && importRows.length > 0);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const velocityUnit = getDisplayUnit("m/s", unitSystem) ?? "m/s";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";
  const gmaxUnit = getDisplayUnit("MPa", unitSystem) ?? "MPa";
  const syncUnitSystem = useEffectEvent(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        sampleDepth: convertInputValueBetweenSystems(row.sampleDepth, "m", previousUnitSystem.current, unitSystem),
        vs: convertInputValueBetweenSystems(row.vs, "m/s", previousUnitSystem.current, unitSystem),
        unitWeight: convertInputValueBetweenSystems(row.unitWeight, "kN/m3", previousUnitSystem.current, unitSystem),
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
        unitWeight:
          item.unitWeight === null || item.unitWeight === undefined
            ? template.unitWeight
            : convertInputValueBetweenSystems(String(item.unitWeight), "kN/m3", "metric", unitSystem),
      }));
    });
  });

  useEffect(() => {
    syncUnitSystem();
  }, [unitSystem]);

  useEffect(() => {
    syncImportedRows();
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<GmaxProfileRow>) => {
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
          vs: "220",
          unitWeight: "18.5",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const reportPayload = useMemo<StandardReportPayload>(() => {
    const items = rows
      .map((row) => {
        const depth = parse(row.sampleDepth);
        const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
        const gammaMetric = parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
        const rho = (gammaMetric * 1000) / GRAVITY;
        const gmaxMetric = rho > 0 && vsMetric > 0 ? (rho * vsMetric ** 2) / 1_000_000 : Number.NaN;
        return {
          boreholeId: row.boreholeId || "BH not set",
          depth,
          vs: Number(convertInputValueBetweenSystems(String(vsMetric), "m/s", "metric", unitSystem)),
          gamma: Number(convertInputValueBetweenSystems(String(gammaMetric), "kN/m3", "metric", unitSystem)),
          gmax: Number(convertInputValueBetweenSystems(String(gmaxMetric), "MPa", "metric", unitSystem)),
        };
      })
      .filter((p) => Number.isFinite(p.depth) && p.depth >= 0 && Number.isFinite(p.gmax))
      .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId, undefined, { numeric: true }) || a.depth - b.depth);
    return {
      depthUnit,
      columns: [
        { header: "Borehole", key: "Borehole" },
        { header: `Depth (${depthUnit})`, key: "Depth" },
        { header: `γ (${unitWeightUnit})`, key: "gamma" },
        { header: `Vₛ (${velocityUnit})`, key: "vs" },
        { header: `Gₘₐₓ (${gmaxUnit})`, key: "gmax" },
      ],
      rows: items.map((p) => ({ Borehole: p.boreholeId, Depth: p.depth.toFixed(2), gamma: p.gamma.toFixed(2), vs: p.vs.toFixed(0), gmax: p.gmax.toFixed(1) })),
      points: items.map((p) => ({ boreholeId: p.boreholeId, depth: p.depth, values: { vs: p.vs, gmax: p.gmax } })),
      series: [
        { key: "vs", label: "Vₛ", unit: velocityUnit },
        { key: "gmax", label: "Gₘₐₓ", unit: gmaxUnit },
      ],
      methodNotes: [
        "Gₘₐₓ was calculated for each sample from the shear-wave velocity and bulk unit weight entered by the user, using Equations (1) and (2). The source of the Vₛ values (in-situ measurement or correlation) was not recorded by the tool and must be confirmed by the user.",
      ],
      exclusions: rows.length > items.length ? [`${rows.length - items.length} sample(s) excluded because of missing or invalid depth, Vₛ, or unit weight.`] : undefined,
    };
  }, [depthUnit, gmaxUnit, rows, unitSystem, unitWeightUnit, velocityUnit]);

  useEffect(() => {
    onReportDataChange?.(reportPayload);
  }, [onReportDataChange, reportPayload]);
  const exportRows = rows.map((row) => {
    const sampleDepth = parse(row.sampleDepth);
    const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
    const unitWeightMetric = parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
    const densityMetric = (unitWeightMetric * 1000) / GRAVITY;
    const gmaxMetric = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

    return {
      boreholeId: row.boreholeId || "BH not set",
      sampleDepth: format(sampleDepth, 1),
      vs: format(Number(convertInputValueBetweenSystems(String(vsMetric), "m/s", "metric", unitSystem)), 0),
      unitWeight: format(Number(convertInputValueBetweenSystems(String(unitWeightMetric), "kN/m3", "metric", unitSystem)), 3),
      gmax: format(Number(convertInputValueBetweenSystems(String(gmaxMetric), "MPa", "metric", unitSystem)), 3),
    };
  });

  const buildExportTableHtml = () => {
    const headerCells = [
      `Borehole ID`,
      `Sample depth (${depthUnit})`,
      `Unit weight (${unitWeightUnit})`,
      `Vs (${velocityUnit})`,
      `Gmax (${gmaxUnit})`,
    ]
      .map((label) => excelTextHeader(label))
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            ${excelTextCell(row.boreholeId)}
            ${excelTextCell(row.sampleDepth)}
            ${excelTextCell(row.unitWeight)}
            ${excelTextCell(row.vs)}
            ${excelTextCell(row.gmax)}
          </tr>
        `,
      )
      .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const buildChartImageDataUri = async ({
    title,
    xLabel,
    xUnit,
    valueKey,
  }: {
    title: string;
    xLabel: string;
    xUnit: string;
    valueKey: "vs" | "gmax";
  }) => {
    try {
      const pngUri = buildChartPngDataUri({
        title,
        xLabel,
        xUnit,
        depthUnit,
        rows: plotRows,
        valueKey,
      });
      if (pngUri.startsWith("data:image/png;base64,")) {
        return pngUri;
      }
    } catch {
      // Fallback to SVG encoding for environments where canvas export fails.
    }

    const svgMarkup = buildChartSvgMarkup({
      title,
      xLabel,
      xUnit,
      depthUnit,
      rows: plotRows,
      valueKey,
    });
    const svgOnly = svgMarkup.replace(/^.*?<svg/i, "<svg").replace(/<\/svg>.*$/i, "</svg>");
    return svgToDataUri(svgOnly);
  };

  const buildExcelMhtmlDocument = async () => {
    const tableHtml = buildExportTableHtml();
    const [vsChartImgSrc, gmaxChartImgSrc] = await Promise.all([
      buildChartImageDataUri({
        title: "Depth vs Vs",
        xLabel: "Vs",
        xUnit: velocityUnit,
        valueKey: "vs",
      }),
      buildChartImageDataUri({
        title: "Depth vs Gmax",
        xLabel: "Gmax",
        xUnit: gmaxUnit,
        valueKey: "gmax",
      }),
    ]);

    const excelHtml = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <title>Gmax from Vs Profile Export</title>
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
    <h1>Gmax from Vs Soil Profile Export</h1>
    <p>Gmax uses mass density derived from unit weight (ρ = γ / g).</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    <h2>Profile plots</h2>
    <div class="chart-grid">
      <div><img src="file:///gmax-vs.png" alt="Depth vs Vs plot" /></div>
      <div><img src="file:///gmax-gmax.png" alt="Depth vs Gmax plot" /></div>
    </div>
  </body>
</html>`;

    if (!vsChartImgSrc.startsWith("data:image/png;base64,") || !gmaxChartImgSrc.startsWith("data:image/png;base64,")) {
      return excelHtml;
    }

    return buildMhtmlMultipartDocument(excelHtml, [
      { contentLocation: "file:///gmax-vs.png", base64Png: vsChartImgSrc },
      { contentLocation: "file:///gmax-gmax.png", base64Png: gmaxChartImgSrc },
    ]);
  };

  const handleExportExcel = async () => {
    try {
      const excelPayload = await buildExcelMhtmlDocument();
      downloadBlob(
        "gmax-from-vs-profile.xls",
        new Blob([excelPayload], { type: "application/vnd.ms-excel;charset=utf-8" }),
      );
    } catch (error) {
      console.error(error);
      window.alert("Excel export failed. Please try again.");
    }
  };

  const plotRows: ProfilePoint[] = rows
    .map((row) => {
      const sampleDepthMetric = parse(convertInputValueBetweenSystems(row.sampleDepth, "m", unitSystem, "metric"));
      const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
      const unitWeightMetric = parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
      const densityMetric = (unitWeightMetric * 1000) / GRAVITY;
      const gmaxMetric = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

      return {
        boreholeId: row.boreholeId || "BH not set",
        sampleDepth: sampleDepthMetric,
        vs: Number(convertInputValueBetweenSystems(String(vsMetric), "m/s", "metric", unitSystem)),
        gmax: Number(convertInputValueBetweenSystems(String(gmaxMetric), "MPa", "metric", unitSystem)),
      };
    })
    .filter((row) => Number.isFinite(row.sampleDepth) && row.sampleDepth >= 0)
    .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.sampleDepth - b.sampleDepth);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Build a small-strain stiffness profile by borehole and sample depth: enter unit weight and V<sub>s</sub> at
              each depth. Mass density is derived automatically from unit weight (ρ = γ / g).
            </p>
            {importedFromBoreholes ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Sample depth and unit weight are imported from the selected boreholes (Use in Tools) and are locked.
              </p>
            ) : null}
          </div>
        </div>

        <ProfileTableScroll scrollContainerRef={exportTableRef}>
          <table className={profileTableClass("c6")}>
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
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
                  <ProfileTableHeaderCell
                    title={<span className="whitespace-nowrap">Unit weight ({unitWeightUnit})</span>}
                  />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>V<sub>s</sub></span>} unit={velocityUnit} />
                </th>
                <th className={profileTableThClass}>
                  <ProfileTableHeaderCell title={<span>G<sub>max</sub></span>} unit="MPa" />
                </th>
                <th className={profileTableThClass}>
                  <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sampleDepth = parse(row.sampleDepth);
                const hasDepthIssue = !Number.isFinite(sampleDepth) || sampleDepth < 0;
                const vsMetric = parse(convertInputValueBetweenSystems(row.vs, "m/s", unitSystem, "metric"));
                const unitWeightMetric = parse(convertInputValueBetweenSystems(row.unitWeight, "kN/m3", unitSystem, "metric"));
                const densityMetric = (unitWeightMetric * 1000) / GRAVITY;
                const displayUnitWeight = convertInputValueBetweenSystems(String(unitWeightMetric), "kN/m3", "metric", unitSystem);
                const gmaxMpa = densityMetric > 0 && vsMetric > 0 ? (densityMetric * vsMetric ** 2) / 1_000_000 : 0;

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
                        disabled={importedFromBoreholes}
                        className={
                          importedFromBoreholes
                            ? cnProfileTableInput(true)
                            : hasDepthIssue
                              ? "w-full min-w-0 rounded-lg border border-red-300 bg-red-50 px-1.5 py-1 text-xs text-slate-900 outline-none transition-colors duration-200 focus:border-red-400 sm:px-2 sm:py-1.5 sm:text-[13px]"
                              : cnProfileTableInput(false)
                        }
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Enter a valid sample depth.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={row.unitWeight}
                        onChange={(event) => updateRow(row.id, { unitWeight: event.target.value })}
                        disabled={importedFromBoreholes}
                        className={cnProfileTableInput(importedFromBoreholes)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.vs}
                        onChange={(event) => updateRow(row.id, { vs: event.target.value })}
                        className={cnProfileTableInput(false)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={format(gmaxMpa, 3)} />
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
          <div className="flex flex-wrap gap-3">
            <ExcelExportButton type="button" className="btn-base btn-md" onClick={handleExportExcel}>
              Export Excel
            </ExcelExportButton>
          </div>
        </div>

      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileChart
          containerId="gmax-vs-chart"
          keyPrefix="vs-profile"
          title={
            <span>
              Depth vs V<sub>s</sub>
            </span>
          }
          xLabel="Vs"
          xUnit={velocityUnit}
          depthUnit={depthUnit}
          rows={plotRows}
          valueKey="vs"
        />
        <ProfileChart
          containerId="gmax-gmax-chart"
          keyPrefix="gmax-profile"
          title={
            <span>
              Depth vs G<sub>max</sub>
            </span>
          }
          xLabel="Gmax"
          xUnit={gmaxUnit}
          depthUnit={depthUnit}
          rows={plotRows}
          valueKey="gmax"
        />
      </div>
</section>
  );
}



