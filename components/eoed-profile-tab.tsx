"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import type { SelectedBoreholeSummary } from "@/lib/project-boreholes";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

interface EoedProfileTabProps {
  unitSystem: UnitSystem;
  importRows?: SelectedBoreholeSummary[];
}

interface EoedProfileRow {
  id: number;
  topDepth: string;
  boreholeId: string;
  bottomDepth: string;
  mv: string;
}

interface ProfilePoint {
  boreholeId: string;
  topDepth: number;
  bottomDepth: number;
  mv: number;
  eoed: number;
}

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];
const MV_SYMBOL = "m_v";
const EOED_SYMBOL = "E_oed";

const initialRows: EoedProfileRow[] = [
  { id: 1, topDepth: "0", boreholeId: "", bottomDepth: "2", mv: "0.40" },
  { id: 2, topDepth: "2", boreholeId: "", bottomDepth: "6", mv: "0.25" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (Math.abs(value) >= 100) {
    return String(Math.round(value));
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(1).replace(/\.0$/, "");
  }
  if (Math.abs(value) >= 1) {
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
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

function wrapBase64(base64: string) {
  return base64.replace(/(.{76})/g, "$1\r\n");
}

function splitSubscript(symbol: string): { main: string; sub: string } {
  const dividerIndex = symbol.indexOf("_");
  if (dividerIndex < 0) {
    return { main: symbol, sub: "" };
  }
  return {
    main: symbol.slice(0, dividerIndex),
    sub: symbol.slice(dividerIndex + 1),
  };
}

function measureSymbolWidth(
  context: CanvasRenderingContext2D,
  symbol: string,
  mainFont: string,
  subFont: string,
): number {
  const { main, sub } = splitSubscript(symbol);
  context.font = mainFont;
  const mainWidth = context.measureText(main).width;
  if (!sub) {
    return mainWidth;
  }
  context.font = subFont;
  const subWidth = context.measureText(sub).width;
  return mainWidth + subWidth;
}

function drawSymbol(
  context: CanvasRenderingContext2D,
  symbol: string,
  startX: number,
  baselineY: number,
  mainFont: string,
  subFont: string,
  subscriptOffsetY = 6,
) {
  const { main, sub } = splitSubscript(symbol);
  context.font = mainFont;
  context.fillText(main, startX, baselineY);
  if (!sub) {
    return;
  }
  const mainWidth = context.measureText(main).width;
  context.font = subFont;
  context.fillText(sub, startX + mainWidth, baselineY + subscriptOffsetY);
}

function buildChartPngDataUri({
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
  valueKey: "mv" | "eoed";
}): string {
  const width = 1200;
  const height = 820;
  const margin = { top: 108, right: 56, bottom: 120, left: 130 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDepth = Math.max(...rows.map((row) => row.bottomDepth), 1);
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
      .sort((a, b) => a.topDepth - b.topDepth);
    const colour = BOREHOLE_COLOURS[boreholeIndex % BOREHOLE_COLOURS.length];
    const points = boreholeRows.map((row) => ({
      topY: yScale(row.topDepth),
      bottomY: yScale(row.bottomDepth),
      x: xScale(row[valueKey]),
      y: yScale((row.topDepth + row.bottomDepth) / 2),
    }));

    return { boreholeId, colour, points };
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#0f172a";
  const titleMainFont = "700 30px Georgia, 'Times New Roman', serif";
  const titleSubFont = "700 21px Georgia, 'Times New Roman', serif";
  if (title.includes(" vs ")) {
    const [titlePrefix, titleSymbol] = title.split(" vs ");
    const prefixText = `${titlePrefix} vs `;
    context.font = titleMainFont;
    context.fillText(prefixText, margin.left, 52);
    const prefixWidth = context.measureText(prefixText).width;
    drawSymbol(context, titleSymbol, margin.left + prefixWidth, 52, titleMainFont, titleSubFont, 7);
  } else {
    context.font = titleMainFont;
    context.fillText(title, margin.left, 52);
  }

  context.fillStyle = "#1e3a5f";
  const axisMainFont = "700 23px Inter, Arial, sans-serif";
  const axisSubFont = "700 16px Inter, Arial, sans-serif";
  context.textAlign = "start";
  const unitText = ` (${xUnit})`;
  const symbolWidth = measureSymbolWidth(context, xLabel, axisMainFont, axisSubFont);
  context.font = axisMainFont;
  const unitWidth = context.measureText(unitText).width;
  const axisTotalWidth = symbolWidth + unitWidth;
  const axisStartX = margin.left + innerWidth / 2 - axisTotalWidth / 2;
  drawSymbol(context, xLabel, axisStartX, 60, axisMainFont, axisSubFont, 5);
  context.font = axisMainFont;
  context.fillText(unitText, axisStartX + symbolWidth, 60);
  context.textAlign = "start";

  context.strokeStyle = "#dbe5f1";
  context.lineWidth = 2;
  context.font = "600 21px Inter, Arial, sans-serif";
  context.fillStyle = "#36557f";
  for (let index = 0; index <= xIntervals; index += 1) {
    const value = xStep * index;
    const x = xScale(value);
    context.beginPath();
    context.moveTo(x, margin.top);
    context.lineTo(x, margin.top + innerHeight);
    context.stroke();
    context.textAlign = "center";
    context.fillText(formatTick(value), x, margin.top - 14);
  }

  for (let index = 0; index <= yIntervals; index += 1) {
    const depth = yStep * index;
    const y = yScale(depth);
    context.beginPath();
    context.moveTo(margin.left, y);
    context.lineTo(margin.left + innerWidth, y);
    context.stroke();
    context.textAlign = "right";
    context.fillText(depth.toFixed(1), margin.left - 18, y + 7);
  }

  context.strokeStyle = "#7f98ba";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left, margin.top + innerHeight);
  context.stroke();
  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left + innerWidth, margin.top);
  context.stroke();

  lineSeries.forEach((series) => {
    series.points.forEach((point) => {
      context.beginPath();
      context.strokeStyle = hexToRgba(series.colour, 0.22);
      context.lineWidth = 7;
      context.lineCap = "round";
      context.moveTo(point.x, point.topY);
      context.lineTo(point.x, point.bottomY);
      context.stroke();
    });

    if (series.points.length > 1) {
      context.beginPath();
      context.strokeStyle = series.colour;
      context.lineWidth = 4;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.moveTo(series.points[0].x, series.points[0].y);
      for (let index = 1; index < series.points.length; index += 1) {
        context.lineTo(series.points[index].x, series.points[index].y);
      }
      context.stroke();
    }

    series.points.forEach((point) => {
      context.beginPath();
      context.fillStyle = "#ffffff";
      context.arc(point.x, point.y, 7.4, 0, 2 * Math.PI);
      context.fill();

      context.beginPath();
      context.strokeStyle = series.colour;
      context.lineWidth = 3;
      context.arc(point.x, point.y, 7.4, 0, 2 * Math.PI);
      context.stroke();

      context.beginPath();
      context.fillStyle = series.colour;
      context.arc(point.x, point.y, 3.3, 0, 2 * Math.PI);
      context.fill();
    });
  });

  context.save();
  context.translate(42, margin.top + innerHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillStyle = "#1e3a5f";
  context.font = "700 23px Inter, Arial, sans-serif";
  context.fillText(`Depth (${depthUnit})`, 0, 0);
  context.restore();

  const legendY = margin.top + innerHeight + 52;
  context.font = "600 18px Inter, Arial, sans-serif";

  const legendBlocks = lineSeries.map((series) => {
    const textWidth = context.measureText(series.boreholeId).width;
    return { series, blockWidth: 44 + textWidth };
  });
  const legendGap = 10;
  const totalLegendWidth =
    legendBlocks.reduce((total, item) => total + item.blockWidth, 0) + Math.max(legendBlocks.length - 1, 0) * legendGap;
  let legendX = totalLegendWidth <= innerWidth ? margin.left + (innerWidth - totalLegendWidth) / 2 : margin.left;

  legendBlocks.forEach((item) => {
    const { series, blockWidth } = item;
    const label = series.boreholeId;

    context.beginPath();
    context.fillStyle = hexToRgba(series.colour, 0.12);
    context.roundRect(legendX, legendY - 18, blockWidth, 34, 14);
    context.fill();

    context.beginPath();
    context.strokeStyle = "#d5e0ef";
    context.lineWidth = 1.5;
    context.roundRect(legendX, legendY - 18, blockWidth, 34, 14);
    context.stroke();

    context.beginPath();
    context.fillStyle = series.colour;
    context.arc(legendX + 16, legendY - 1, 5, 0, 2 * Math.PI);
    context.fill();

    context.fillStyle = "#334155";
    context.textAlign = "start";
    context.fillText(label, legendX + 28, legendY + 5);

    legendX += blockWidth + legendGap;
  });

  return canvas.toDataURL("image/png");
}

function HeaderCell({ title, unit }: { title: ReactNode; unit?: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1 leading-tight">
      <span>{title}</span>
      {unit ? <span className="text-slate-500">({unit})</span> : null}
    </span>
  );
}

function OutputCell({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] font-semibold text-slate-900">
      {value}
    </div>
  );
}

function ProfileImageCard({ title, imageSrc }: { title: ReactNode; imageSrc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {imageSrc ? <img src={imageSrc} alt="Profile plot" className="w-full" /> : null}
      </div>
    </div>
  );
}

export function EoedProfileTab({ unitSystem, importRows }: EoedProfileTabProps) {
  const [rows, setRows] = useState<EoedProfileRow[]>(initialRows);
  const previousUnitSystem = useRef(unitSystem);
  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const eoedUnit = getDisplayUnit("MPa", unitSystem) ?? "MPa";
  const mvUnit = getDisplayUnit("m2/MN", unitSystem) ?? "m2/MN";

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
        bottomDepth: convertInputValueBetweenSystems(row.bottomDepth, "m", previousUnitSystem.current, unitSystem),
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
        topDepth:
          item.sampleTopDepth === null
            ? template.topDepth
            : convertInputValueBetweenSystems(String(item.sampleTopDepth), "m", "metric", unitSystem),
      }));
    });
  }, [importRows, unitSystem]);

  const updateRow = (id: number, patch: Partial<EoedProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastBottom = current[current.length - 1]?.bottomDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [...current, { id: nextId, topDepth: lastBottom, boreholeId: "", bottomDepth: String(parse(lastBottom) + 2), mv: "0.30" }];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const plotRows: ProfilePoint[] = useMemo(
    () =>
      rows
        .map((row) => {
          const topDepthMetric = parse(convertInputValueBetweenSystems(row.topDepth, "m", unitSystem, "metric"));
          const bottomDepthMetric = parse(convertInputValueBetweenSystems(row.bottomDepth, "m", unitSystem, "metric"));
          const mv = Math.max(parse(row.mv), 0);
          const eoedMetric = mv > 0 ? 1 / mv : 0;

          return {
            boreholeId: row.boreholeId || "BH not set",
            topDepth: topDepthMetric,
            bottomDepth: bottomDepthMetric,
            mv,
            eoed: Number(convertInputValueBetweenSystems(String(eoedMetric), "MPa", "metric", unitSystem)),
          };
        })
        .filter((row) => row.bottomDepth > row.topDepth)
        .sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.topDepth - b.topDepth),
    [rows, unitSystem],
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

  const exportRows = rows.map((row) => {
    const topDepthMetric = parse(convertInputValueBetweenSystems(row.topDepth, "m", unitSystem, "metric"));
    const bottomDepthMetric = parse(convertInputValueBetweenSystems(row.bottomDepth, "m", unitSystem, "metric"));
    const mv = Math.max(parse(row.mv), 0);
    const eoedMetric = mv > 0 ? 1 / mv : 0;

    return {
      boreholeId: row.boreholeId || "BH not set",
      topDepth: format(Number(convertInputValueBetweenSystems(String(topDepthMetric), "m", "metric", unitSystem)), 2),
      bottomDepth: format(
        Number(convertInputValueBetweenSystems(String(bottomDepthMetric), "m", "metric", unitSystem)),
        2,
      ),
      mv: format(mv, 4),
      eoed: format(Number(convertInputValueBetweenSystems(String(eoedMetric), "MPa", "metric", unitSystem)), 3),
    };
  });

  const buildExportTableHtml = () => {
    const headerCells = [
      "Borehole ID",
      `Top (${depthUnit})`,
      `Bottom (${depthUnit})`,
      `${MV_SYMBOL} (${mvUnit})`,
      `${EOED_SYMBOL} (${eoedUnit})`,
    ]
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.boreholeId)}</td>
            <td>${escapeHtml(row.topDepth)}</td>
            <td>${escapeHtml(row.bottomDepth)}</td>
            <td>${escapeHtml(row.mv)}</td>
            <td>${escapeHtml(row.eoed)}</td>
          </tr>
        `,
      )
      .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const buildExcelMhtmlDocument = () => {
    const tableHtml = buildExportTableHtml();
    const boundary = "----=_NextPart_EoedExport";
    const excelHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Eoed from ${MV_SYMBOL} Profile Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
      .chart-grid img { width: 100%; height: auto; display: block; }
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

    const mvBase64 = mvChartImgSrc.startsWith("data:image/png;base64,")
      ? mvChartImgSrc.replace("data:image/png;base64,", "")
      : "";
    const eoedBase64 = eoedChartImgSrc.startsWith("data:image/png;base64,")
      ? eoedChartImgSrc.replace("data:image/png;base64,", "")
      : "";

    if (!mvBase64 || !eoedBase64) {
      return excelHtml;
    }

    return [
      "MIME-Version: 1.0",
      `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=\"utf-8\"",
      "Content-Transfer-Encoding: 8bit",
      "Content-Location: file:///report.htm",
      "",
      excelHtml,
      "",
      `--${boundary}`,
      "Content-Location: file:///eoed-mv.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(mvBase64),
      "",
      `--${boundary}`,
      "Content-Location: file:///eoed-eoed.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(eoedBase64),
      "",
      `--${boundary}--`,
    ].join("\r\n");
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
            Build a layered compressibility profile with Borehole IDs, depth intervals, and coefficient of volume
            compressibility values. The tool computes constrained modulus per layer and plots both profiles by depth.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[12px] lg:text-[13px]">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Borehole ID" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Top" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Bottom" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>m<sub>v</sub></span>} unit={mvUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>E<sub>oed</sub></span>} unit={eoedUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <span className="block leading-tight">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topDepth = parse(row.topDepth);
                const bottomDepth = parse(row.bottomDepth);
                const hasDepthIssue = bottomDepth <= topDepth;
                const mv = Math.max(parse(row.mv), 0);
                const eoedMetric = mv > 0 ? 1 / mv : 0;
                const eoedDisplay = Number(convertInputValueBetweenSystems(String(eoedMetric), "MPa", "metric", unitSystem));

                return (
                  <tr key={row.id} className="border-t border-slate-200 bg-white align-top">
                    <td className="px-2 py-3">
                      <BoreholeIdSelector
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
                        value={row.topDepth}
                        onChange={(event) => updateRow(row.id, { topDepth: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.bottomDepth}
                        onChange={(event) => updateRow(row.id, { bottomDepth: event.target.value })}
                        className={`w-full rounded-lg border px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 ${
                          hasDepthIssue ? "border-red-300 bg-red-50 focus:border-red-400" : "border-slate-300 focus:border-slate-500"
                        }`}
                      />
                      {hasDepthIssue ? <p className="mt-1 text-xs text-red-700">Bottom must exceed top.</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={row.mv}
                        onChange={(event) => updateRow(row.id, { mv: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={format(eoedDisplay, 3)} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className="btn-base w-full px-2 py-2 text-sm"
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
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-base btn-md" onClick={addRow}>
            Add Layer
          </button>
          <button type="button" className="btn-base btn-md" onClick={handleExportExcel}>
            Export Excel
          </button>
        </div>

      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileImageCard
          title={
            <span>
              Depth vs m<sub>v</sub>
            </span>
          }
          imageSrc={mvChartImgSrc}
        />
        <ProfileImageCard
          title={
            <span>
              Depth vs E<sub>oed</sub>
            </span>
          }
          imageSrc={eoedChartImgSrc}
        />
      </div>
</section>
  );
}


