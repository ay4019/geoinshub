/**
 * Converts the report data that older profile tabs emit (string table rows) into the StandardReportPayload
 * used by the standard report. The tabs themselves are unchanged — their payloads also feed Excel export
 * and project saving — so the conversion lives here.
 */
import type { StandardReportPayload, StandardReportSeries } from "@/lib/reports/standard-report-types";

interface ColumnSpec {
  /** Key in the source table row. */
  key: string;
  /** Header shown in the report (Unicode subscripts allowed). */
  header: string;
}

interface AdapterSpec {
  depthUnit: string;
  rows: Array<Record<string, string>> | undefined;
  boreholeKey: string;
  depthKey: string;
  columns: ColumnSpec[];
  /** Plotted quantities: `key` is the source row key. */
  series: StandardReportSeries[];
  methodNotes?: string[];
  inputs?: Array<{ label: string; value: string }>;
  /** Noun for the exclusion sentence, e.g. "classified as cohesionless in the project data". */
  exclusionReason: string;
}

function num(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) && String(value).trim() !== "" ? n : null;
}

function adapt(spec: AdapterSpec): StandardReportPayload | null {
  const source = spec.rows ?? [];
  if (!source.length) return null;
  const valid = source.filter((row) => spec.series.every((s) => num(row[s.key]) !== null) && num(row[spec.depthKey]) !== null);
  const excluded = source.length - valid.length;
  return {
    depthUnit: spec.depthUnit,
    columns: spec.columns.map((c) => ({ header: c.header, key: c.key })),
    rows: valid,
    points: valid.map((row) => ({
      boreholeId: row[spec.boreholeKey]?.trim() || "BH not set",
      depth: num(row[spec.depthKey]) ?? 0,
      values: Object.fromEntries(spec.series.map((s) => [s.key, num(row[s.key])])),
    })),
    series: spec.series,
    methodNotes: spec.methodNotes,
    inputs: spec.inputs,
    exclusions: excluded > 0 ? [`${excluded} sample${excluded === 1 ? "" : "s"} ${spec.exclusionReason}.`] : undefined,
  };
}

export function sptCorrectionsToStandard(
  data: {
    depthUnit: string;
    stressUnit: string;
    tableRows: Array<Record<string, string>>;
    sptEquipment: { hammerTypeLabel: string; energyRatioLabel: string; boreholeDiameterLabel: string; samplerLabel: string };
  } | null,
): StandardReportPayload | null {
  if (!data) return null;
  const e = data.sptEquipment;
  return adapt({
    depthUnit: data.depthUnit,
    rows: data.tableRows,
    boreholeKey: "boreholeId",
    depthKey: "sampleDepth",
    columns: [
      { key: "boreholeId", header: "Borehole" },
      { key: "sampleDepth", header: `Depth (${data.depthUnit})` },
      { key: "nField", header: "N" },
      { key: "sigmaV0", header: `σ′ᵥ₀ (${data.stressUnit})` },
      { key: "ce", header: "C_E" },
      { key: "cb", header: "C_B" },
      { key: "cr", header: "C_R" },
      { key: "cs", header: "C_S" },
      { key: "n60", header: "N₆₀" },
      { key: "cn", header: "C_N" },
      { key: "n160", header: "(N₁)₆₀" },
    ],
    series: [
      { key: "n60", label: "N₆₀", unit: "blows" },
      { key: "n160", label: "(N₁)₆₀", unit: "blows" },
    ],
    inputs: e
      ? [
          { label: "Hammer type", value: e.hammerTypeLabel },
          { label: "Energy ratio", value: e.energyRatioLabel },
          { label: "Borehole diameter", value: e.boreholeDiameterLabel },
          { label: "Sampler", value: e.samplerLabel },
        ]
      : undefined,
    methodNotes: [
      "The correction factors were applied to every sample with Equations (1) to (3). A field blow count of 50 is treated as refusal and reported without correction.",
    ],
    exclusionReason: "had a missing depth or blow count",
  });
}

export function cuFromPiSptToStandard(
  data: { depthUnit: string; stressUnit: string; tableRows: Array<Record<string, string>> } | null,
): StandardReportPayload | null {
  if (!data) return null;
  const depthKey = `Depth (${data.depthUnit})`;
  const cuKey = `cu (${data.stressUnit})`;
  return adapt({
    depthUnit: data.depthUnit,
    rows: data.tableRows,
    boreholeKey: "Borehole",
    depthKey,
    columns: [
      { key: "Borehole", header: "Borehole" },
      { key: depthKey, header: `Depth (${data.depthUnit})` },
      { key: "PI (%)", header: "PI (%)" },
      { key: "N60", header: "N₆₀" },
      { key: "f1", header: "f₁" },
      { key: cuKey, header: `cᵤ (${data.stressUnit})` },
    ],
    series: [{ key: cuKey, label: "cᵤ", unit: data.stressUnit }],
    methodNotes: ["For each sample, f₁ was read from the Stroud (1974) relationship at the sample's PI and multiplied by N₆₀ (Equation 1)."],
    exclusionReason: "classified as cohesionless in the project data, or with missing values",
  });
}

export function cprimeFromCuToStandard(
  data: { depthUnit: string; stressUnit: string; methodNarrative: string; tableRows: Array<Record<string, string>> } | null,
): StandardReportPayload | null {
  if (!data) return null;
  const depthKey = `Depth (${data.depthUnit})`;
  const cuKey = `cu (${data.stressUnit})`;
  const cpKey = `c′ (${data.stressUnit})`;
  const rows = data.tableRows;
  return adapt({
    depthUnit: data.depthUnit,
    rows,
    boreholeKey: "Borehole",
    depthKey,
    columns: [
      { key: "Borehole", header: "Borehole" },
      { key: depthKey, header: `Depth (${data.depthUnit})` },
      { key: "Soil type", header: "Soil type" },
      { key: "c′ method", header: "Method" },
      { key: cuKey, header: `cᵤ (${data.stressUnit})` },
      { key: cpKey, header: `c′ (${data.stressUnit})` },
    ],
    series: [{ key: cpKey, label: "c′", unit: data.stressUnit }],
    methodNotes: [data.methodNarrative.replace(/^In this report, /, "").replace(/^./, (c) => c.toUpperCase()).replace(/c_u/g, "cᵤ")],
    exclusionReason: "had missing values",
  });
}

export function frictionAngleFromPiToStandard(
  data: { depthUnit: string; stressUnit: string; tableRows: Array<Record<string, string>> } | null,
): StandardReportPayload | null {
  if (!data) return null;
  const depthKey = `Depth (${data.depthUnit})`;
  const phiKey = `φ′ (${data.stressUnit})`;
  return adapt({
    depthUnit: data.depthUnit,
    rows: data.tableRows,
    boreholeKey: "Borehole",
    depthKey,
    columns: [
      { key: "Borehole", header: "Borehole" },
      { key: depthKey, header: `Depth (${data.depthUnit})` },
      { key: "PI (%)", header: "PI (%)" },
      { key: phiKey, header: "φ′ (deg)" },
    ],
    series: [{ key: phiKey, label: "φ′", unit: "deg" }],
    methodNotes: ["φ′ was calculated for each sample from its plasticity index with Equation (1)."],
    exclusionReason: "classified as cohesionless in the project data, or with missing values",
  });
}

export function eoedToStandard(
  data: { depthUnit: string; mvUnit: string; eoedUnit: string; methodNarrative: string; tableRows: Array<Record<string, string>> } | null,
): StandardReportPayload | null {
  if (!data) return null;
  const depthKey = `Depth (${data.depthUnit})`;
  const mvKey = `mv (${data.mvUnit})`;
  const eoedKey = `Eoed (${data.eoedUnit})`;
  return adapt({
    depthUnit: data.depthUnit,
    rows: data.tableRows,
    boreholeKey: "Borehole",
    depthKey,
    columns: [
      { key: "Borehole", header: "Borehole" },
      { key: depthKey, header: `Depth (${data.depthUnit})` },
      { key: "Input method", header: "Input" },
      { key: mvKey, header: `mᵥ (${data.mvUnit})` },
      { key: "PI (%)", header: "PI (%)" },
      { key: "N60", header: "N₆₀" },
      { key: "f2 (kN/m2)", header: "f₂ (kN/m²)" },
      { key: eoedKey, header: `E_oed (${data.eoedUnit})` },
    ],
    series: [{ key: eoedKey, label: "E_oed", unit: data.eoedUnit }],
    methodNotes: [
      data.methodNarrative
        .replace(/^In this report, /, "")
        .replace(/^./, (c) => c.toUpperCase())
        .replace(/\bEoed\b/g, "E_oed")
        .replace(/\bmv\b/g, "mᵥ")
        .replace(/\bf2\b/g, "f₂")
        .replace(/\bN60\b/g, "N₆₀"),
    ],
    exclusionReason: "had missing values",
  });
}
