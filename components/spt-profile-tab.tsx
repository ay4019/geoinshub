"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BoreholeIdSelector } from "@/components/borehole-id-selector";
import type { UnitSystem } from "@/lib/types";
import { convertInputValueBetweenSystems, getDisplayUnit } from "@/lib/tool-units";

interface SptProfileTabProps {
  unitSystem: UnitSystem;
}

interface SptProfileRow {
  id: number;
  topDepth: string;
  boreholeId: string;
  nField: string;
}

interface SptPlotPoint {
  boreholeId: string;
  depth: number;
  n60: number;
  n160: number;
}

const BOREHOLE_DIAMETER_OPTIONS = [
  { label: "<115 mm (Cb = 1.00)", value: "lt115" },
  { label: "115-200 mm (Cb = 1.05)", value: "115to200" },
  { label: ">200 mm (Cb = 1.15)", value: "gt200" },
] as const;

const SAMPLER_OPTIONS = [
  { label: "Standard sampler with liner (Cs = 1.00)", value: "1.00" },
  { label: "Sampler without liner (Cs = 1.10)", value: "1.10" },
  { label: "Sampler without liner (Cs = 1.20)", value: "1.20" },
  { label: "Sampler without liner (Cs = 1.30)", value: "1.30" },
] as const;

const HAMMER_TYPE_OPTIONS = [
  { label: "Safety hammer (ER range: 60-117%)", value: "safety" },
  { label: "Donut hammer (ER range: 45-100%)", value: "donut" },
  { label: "Automatic trip hammer (ER range: 90-160%)", value: "automatic" },
] as const;

const ENERGY_RATIO_OPTIONS = [
  { label: "45%", value: "45" },
  { label: "55%", value: "55" },
  { label: "60%", value: "60" },
  { label: "70%", value: "70" },
  { label: "80%", value: "80" },
  { label: "90%", value: "90" },
  { label: "100%", value: "100" },
  { label: "117%", value: "117" },
  { label: "130%", value: "130" },
  { label: "160%", value: "160" },
] as const;

const BOREHOLE_COLOURS = ["#163d6b", "#8c5a2b", "#1f7a5a", "#7a3e8e", "#b45309", "#2563eb"];

const initialRows: SptProfileRow[] = [
  { id: 1, topDepth: "1.5", boreholeId: "", nField: "12" },
  { id: 2, topDepth: "3.0", boreholeId: "", nField: "18" },
];

function parse(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeCnIdrissBoulanger2008(sigmaEffKpa: number): number {
  if (sigmaEffKpa <= 0) {
    return 0.4;
  }
  const raw = 9.78 * Math.sqrt(1 / sigmaEffKpa);
  return Math.max(0.4, Math.min(raw, 1.7));
}

function computeCrFromSampleDepth(sampleDepth: number): number {
  if (sampleDepth < 3) {
    return 0.75;
  }
  if (sampleDepth < 4) {
    return 0.8;
  }
  if (sampleDepth < 6) {
    return 0.85;
  }
  if (sampleDepth < 10) {
    return 0.95;
  }
  if (sampleDepth <= 30) {
    return 1;
  }
  return 0.95;
}

function computeCbFromBoreholeDiameterSelection(selection: string): number {
  if (selection === "lt115") {
    return 1.0;
  }
  if (selection === "115to200") {
    return 1.05;
  }
  if (selection === "gt200") {
    return 1.15;
  }

  const numeric = Number(selection);
  if (Number.isFinite(numeric)) {
    if (numeric > 200) {
      return 1.15;
    }
    if (numeric < 115) {
      return 1.0;
    }
    return 1.05;
  }

  return 1.0;
}

function HeaderCell({ title, unit }: { title: ReactNode; unit?: ReactNode }) {
  return (
    <span className="block leading-tight">
      <span className="block">{title}</span>
      {unit ? <span className="mt-0.5 block text-slate-500">({unit})</span> : null}
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

function buildScatterChartPngDataUri({
  title,
  xLabel,
  points,
  valueKey,
  depthUnit,
}: {
  title: string;
  xLabel: string;
  points: SptPlotPoint[];
  valueKey: "n60" | "n160";
  depthUnit: string;
}): string {
  if (!points.length) {
    return "";
  }

  const width = 1200;
  const height = 820;
  const margin = { top: 108, right: 56, bottom: 120, left: 130 };
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
  context.font = "700 30px Georgia, 'Times New Roman', serif";
  context.fillText(title, margin.left, 52);

  context.fillStyle = "#1e3a5f";
  context.font = "700 23px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(xLabel, margin.left + innerWidth / 2, 84);
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
    context.fillText(String(Math.round(value)), x, margin.top - 14);
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

  points.forEach((point) => {
    const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
    const x = xScale(point[valueKey]);
    const y = yScale(point.depth);
    context.beginPath();
    context.fillStyle = "#ffffff";
    context.arc(x, y, 7.2, 0, 2 * Math.PI);
    context.fill();
    context.beginPath();
    context.strokeStyle = colour;
    context.lineWidth = 3;
    context.arc(x, y, 7.2, 0, 2 * Math.PI);
    context.stroke();
    context.beginPath();
    context.fillStyle = colour;
    context.arc(x, y, 3.2, 0, 2 * Math.PI);
    context.fill();
  });

  context.save();
  context.translate(42, margin.top + innerHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillStyle = "#1e3a5f";
  context.font = "700 23px Inter, Arial, sans-serif";
  context.fillText(`Depth (${depthUnit})`, 0, 0);
  context.restore();

  return canvas.toDataURL("image/png");
}

function renderScatterChart({
  title,
  xLabel,
  points,
  valueKey,
  depthUnit,
}: {
  title: string;
  xLabel: string;
  points: SptPlotPoint[];
  valueKey: "n60" | "n160";
  depthUnit: string;
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

  const xTicks = Array.from({ length: xIntervals + 1 }, (_, index) => {
    const value = xStep * index;
    const x = xScale(value);
    return (
      <g key={`x-${value}`}>
        <line x1={x} y1={margin.top} x2={x} y2={margin.top + innerHeight} stroke="#dbe5f1" strokeWidth={1} />
        <text x={x} y={margin.top - 10} textAnchor="middle" fontSize={11} fill="#36557f" fontWeight={600}>
          {Math.round(value)}
        </text>
      </g>
    );
  });

  const yTicks = Array.from({ length: yIntervals + 1 }, (_, index) => {
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
  });

  const plottedPoints = points.map((point, index) => {
    const colour = colourByBorehole.get(point.boreholeId) ?? BOREHOLE_COLOURS[0];
    return (
      <g key={`${point.boreholeId}-${point.depth}-${point[valueKey]}-${index}`}>
        <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={5.5} fill="#ffffff" stroke={colour} strokeWidth={2.4} />
        <circle cx={xScale(point[valueKey])} cy={yScale(point.depth)} r={2.2} fill={colour} />
      </g>
    );
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
        {xTicks}
        {yTicks}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke="#7f98ba" strokeWidth={1.5} />
        <line x1={margin.left} y1={margin.top} x2={margin.left + innerWidth} y2={margin.top} stroke="#7f98ba" strokeWidth={1.5} />
        {plottedPoints}
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

export function SptProfileTab({ unitSystem }: SptProfileTabProps) {
  const [rows, setRows] = useState<SptProfileRow[]>(initialRows);
  const [globalHammerType, setGlobalHammerType] = useState("safety");
  const [globalBoreholeFactor, setGlobalBoreholeFactor] = useState("lt115");
  const [globalEnergyRatio, setGlobalEnergyRatio] = useState("70");
  const [globalSamplerFactor, setGlobalSamplerFactor] = useState("1.00");
  const [globalGroundwaterDepth, setGlobalGroundwaterDepth] = useState("1.5");
  const [globalUnitWeight, setGlobalUnitWeight] = useState("18.5");
  const previousUnitSystem = useRef(unitSystem);

  const depthUnit = getDisplayUnit("m", unitSystem) ?? "m";
  const stressUnit = getDisplayUnit("kPa", unitSystem) ?? "kPa";
  const unitWeightUnit = getDisplayUnit("kN/m3", unitSystem) ?? "kN/m3";

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setRows((current) =>
      current.map((row) => ({
        ...row,
        topDepth: convertInputValueBetweenSystems(row.topDepth, "m", previousUnitSystem.current, unitSystem),
      })),
    );
    setGlobalGroundwaterDepth((current) =>
      convertInputValueBetweenSystems(current, "m", previousUnitSystem.current, unitSystem),
    );
    setGlobalUnitWeight((current) =>
      convertInputValueBetweenSystems(current, "kN/m3", previousUnitSystem.current, unitSystem),
    );

    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);

  const updateRow = (id: number, patch: Partial<SptProfileRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => {
      const lastDepth = current[current.length - 1]?.topDepth ?? "0";
      const nextId = Math.max(...current.map((row) => row.id), 0) + 1;
      return [
        ...current,
        {
          id: nextId,
          topDepth: String(parse(lastDepth) + 1.5),
          boreholeId: "",
          nField: "15",
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const ce = parse(globalEnergyRatio) / 60;
  const cb = computeCbFromBoreholeDiameterSelection(globalBoreholeFactor);
  const cs = parse(globalSamplerFactor);
  const gwtMetric = Number(convertInputValueBetweenSystems(globalGroundwaterDepth, "m", unitSystem, "metric"));
  const gammaMetric = Number(convertInputValueBetweenSystems(globalUnitWeight, "kN/m3", unitSystem, "metric"));
  const plotPoints: SptPlotPoint[] = rows
    .map((row) => {
      const depthDisplay = parse(row.topDepth);
      const depthMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
      if (!Number.isFinite(depthMetric) || depthMetric < 0) {
        return null;
      }
      const sigmaEffMetric = Math.max(
        gammaMetric * depthMetric - 9.81 * Math.max(depthMetric - Math.max(gwtMetric, 0), 0),
        0.1,
      );
      const cr = computeCrFromSampleDepth(depthMetric);
      const n60 = parse(row.nField) * ce * cb * cr * cs;
      const cn = computeCnIdrissBoulanger2008(sigmaEffMetric);
      const n160 = Math.min(n60 * cn, 2 * n60);
      return {
        boreholeId: row.boreholeId?.trim() || "BH not set",
        depth: depthDisplay,
        n60,
        n160,
      };
    })
    .filter((point): point is SptPlotPoint => point !== null);

  const exportRows = rows.map((row) => {
    const depthDisplay = parse(row.topDepth);
    const depthMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
    const sigmaEffMetric = Math.max(
      gammaMetric * depthMetric - 9.81 * Math.max(depthMetric - Math.max(gwtMetric, 0), 0),
      0.1,
    );
    const sigmaEffDisplay = Number(convertInputValueBetweenSystems(String(sigmaEffMetric), "kPa", "metric", unitSystem));
    const cr = computeCrFromSampleDepth(depthMetric);
    const n60 = parse(row.nField) * ce * cb * cr * cs;
    const cn = computeCnIdrissBoulanger2008(sigmaEffMetric);
    const n160 = Math.min(n60 * cn, 2 * n60);

    return {
      boreholeId: row.boreholeId?.trim() || "BH not set",
      sampleDepth: depthDisplay.toFixed(2),
      nField: parse(row.nField).toFixed(0),
      sigmaV0: sigmaEffDisplay.toFixed(2),
      ce: ce.toFixed(3),
      cb: cb.toFixed(3),
      cr: cr.toFixed(3),
      n60: n60.toFixed(2),
      cn: cn.toFixed(3),
      n160: n160.toFixed(2),
    };
  });

  const buildExportTableHtml = () => {
    const headerCells = [
      "Borehole ID",
      `Sample Depth (${depthUnit})`,
      "N",
      `sigma'_v0 (${stressUnit})`,
      "C_E",
      "C_b",
      "C_r",
      "N60",
      "C_N",
      "(N1)60",
    ]
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join("");

    const bodyRows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.boreholeId)}</td>
            <td>${escapeHtml(row.sampleDepth)}</td>
            <td>${escapeHtml(row.nField)}</td>
            <td>${escapeHtml(row.sigmaV0)}</td>
            <td>${escapeHtml(row.ce)}</td>
            <td>${escapeHtml(row.cb)}</td>
            <td>${escapeHtml(row.cr)}</td>
            <td>${escapeHtml(row.n60)}</td>
            <td>${escapeHtml(row.cn)}</td>
            <td>${escapeHtml(row.n160)}</td>
          </tr>
        `,
      )
      .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const buildExcelMhtmlDocument = () => {
    const tableHtml = buildExportTableHtml();
    const n60Img = buildScatterChartPngDataUri({
      title: "Depth vs N₆₀",
      xLabel: "N₆₀ (blows)",
      points: plotPoints,
      valueKey: "n60",
      depthUnit,
    });
    const n160Img = buildScatterChartPngDataUri({
      title: "Depth vs (N₁)₆₀",
      xLabel: "(N₁)₆₀ (blows)",
      points: plotPoints,
      valueKey: "n160",
      depthUnit,
    });

    const boundary = "----=_NextPart_SptExport";
    const excelHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>SPT Profile Export</title>
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
    <h1>SPT Soil Profile Export</h1>
    <p>SPT correction summary with depth-based C_r assignment and automatic effective stress.</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    <h2>Profile plots</h2>
    <div class="chart-grid">
      <div><img src="file:///spt-n60.png" alt="Depth vs N60 plot" /></div>
      <div><img src="file:///spt-n160.png" alt="Depth vs (N1)60 plot" /></div>
    </div>
  </body>
</html>`;

    const n60Base64 = n60Img.startsWith("data:image/png;base64,") ? n60Img.replace("data:image/png;base64,", "") : "";
    const n160Base64 = n160Img.startsWith("data:image/png;base64,")
      ? n160Img.replace("data:image/png;base64,", "")
      : "";

    if (!n60Base64 || !n160Base64) {
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
      "Content-Location: file:///spt-n60.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(n60Base64),
      "",
      `--${boundary}`,
      "Content-Location: file:///spt-n160.png",
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(n160Base64),
      "",
      `--${boundary}--`,
    ].join("\r\n");
  };

  const handleExportExcel = () => {
    try {
      const payload = buildExcelMhtmlDocument();
      downloadBlob("spt-soil-profile-export.xls", new Blob([payload], { type: "application/vnd.ms-excel;charset=utf-8" }));
    } catch (error) {
      console.error(error);
      window.alert("Excel export failed. Please try again.");
    }
  };
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="max-w-4xl">
            <h2 className="text-lg font-semibold text-slate-900">Soil Profile Plot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Vertical effective stress is computed automatically from sample depth, GWT, and bulk unit weight (BHA).
              C<sub>r</sub> is assigned from sample depth ranges, and overburden correction follows Idriss and
              Boulanger (2008), with 0.40 &le; C<sub>N</sub> &le; 1.70.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <div className="min-w-0">
            <label htmlFor="spt-hammer-type" className="mb-1 block text-xs font-medium text-slate-700">
              Hammer type
            </label>
            <select
              id="spt-hammer-type"
              value={globalHammerType}
              onChange={(event) => setGlobalHammerType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {HAMMER_TYPE_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-energy-ratio" className="mb-1 block text-xs font-medium text-slate-700">
              Hammer efficiency, ER (%)
            </label>
            <select
              id="spt-energy-ratio"
              value={globalEnergyRatio}
              onChange={(event) => setGlobalEnergyRatio(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {ENERGY_RATIO_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-borehole-diameter" className="mb-1 block text-xs font-medium text-slate-700">
              Borehole diameter
            </label>
            <select
              id="spt-borehole-diameter"
              value={globalBoreholeFactor}
              onChange={(event) => setGlobalBoreholeFactor(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {BOREHOLE_DIAMETER_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-sampler-type" className="mb-1 block text-xs font-medium text-slate-700">
              Sampler type
            </label>
            <select
              id="spt-sampler-type"
              value={globalSamplerFactor}
              onChange={(event) => setGlobalSamplerFactor(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              {SAMPLER_OPTIONS.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-gwt" className="mb-1 block text-xs font-medium text-slate-700">
              Groundwater depth, GWT ({depthUnit})
            </label>
            <input
              id="spt-gwt"
              type="number"
              min="0"
              step="0.1"
              value={globalGroundwaterDepth}
              onChange={(event) => setGlobalGroundwaterDepth(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="spt-bha" className="mb-1 block text-xs font-medium text-slate-700">
              Bulk unit weight, BHA ({unitWeightUnit})
            </label>
            <input
              id="spt-bha"
              type="number"
              min="0.1"
              step="0.1"
              value={globalUnitWeight}
              onChange={(event) => setGlobalUnitWeight(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse text-[11px] xl:text-[12px]">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Borehole ID" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="Sample Depth" unit={depthUnit} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title="N" />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span>
                        &sigma;&prime;<sub>v0</sub>
                      </span>
                    }
                    unit={stressUnit}
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>C<sub>E</sub></span>} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>C<sub>b</sub></span>} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>C<sub>r</sub></span>} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>N<sub>60</sub></span>} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell title={<span>C<sub>N</sub></span>} />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <HeaderCell
                    title={
                      <span>
                        (N<sub>1</sub>)<sub>60</sub>
                      </span>
                    }
                  />
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <span className="block leading-tight">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topDepth = parse(row.topDepth);
                const sampleDepthMetric = Number(
                  convertInputValueBetweenSystems(String(topDepth), "m", unitSystem, "metric"),
                );
                const sigmaEffMetric = Math.max(
                  gammaMetric * sampleDepthMetric - 9.81 * Math.max(sampleDepthMetric - Math.max(gwtMetric, 0), 0),
                  0.1,
                );
                const sigmaEffDisplay = Number(
                  convertInputValueBetweenSystems(String(sigmaEffMetric), "kPa", "metric", unitSystem),
                );
                const cr = computeCrFromSampleDepth(sampleDepthMetric);
                const n60 = parse(row.nField) * ce * cb * cr * cs;
                const cn = computeCnIdrissBoulanger2008(sigmaEffMetric);
                const n160 = Math.min(n60 * cn, 2 * n60);

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
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.nField}
                        onChange={(event) => updateRow(row.id, { nField: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={sigmaEffDisplay.toFixed(2)} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(ce) ? ce.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cb) ? cb.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cr) ? cr.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(n60) ? n60.toFixed(2) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(cn) ? cn.toFixed(3) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <OutputCell value={Number.isFinite(n160) ? n160.toFixed(2) : "-"} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className="btn-base w-full px-2 py-1.5 text-sm"
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
                  <button type="button" className="btn-base px-3 py-1.5 text-sm" onClick={addRow}>
                    Add Sample
                  </button>
                </td>
                <td colSpan={10} />
              </tr>
            </tfoot>
          </table>
        </div>

        {plotPoints.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {renderScatterChart({
              title: "Depth vs N₆₀",
              xLabel: "N₆₀ (blows)",
              points: plotPoints,
              valueKey: "n60",
              depthUnit,
            })}
            {renderScatterChart({
              title: "Depth vs (N₁)₆₀",
              xLabel: "(N₁)₆₀ (blows)",
              points: plotPoints,
              valueKey: "n160",
              depthUnit,
            })}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-base btn-md" onClick={handleExportExcel}>
            Export Excel
          </button>
        </div>

      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plot note</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Vertical effective stress is not entered manually in this Plot. It is calculated using the Sample Depth column
          with GWT and bulk unit weight for each row. C<sub>r</sub> is assigned automatically from sample-depth ranges
          (&lt;3: 0.75, 3-4: 0.80, 4-6: 0.85, 6-10: 0.95, 10-30: 1.00, &gt;30 m: 0.95 screening). The scatter plots below
          show BH-based points only (no line interpolation) for N<sub>60</sub> and (N<sub>1</sub>)<sub>60</sub>.
        </p>
      </div>
    </section>
  );
}
