import type { SupabaseClient } from "@supabase/supabase-js";

type ParameterCode =
  | "n"
  | "n60"
  | "n160"
  | "pi"
  | "f1"
  | "pln"
  | "cu"
  | "c_prime"
  | "phi_prime"
  | "eu"
  | "e_prime"
  | "ocr"
  | "sigma_v0_eff"
  | "gmax"
  | "vs"
  | "eoed"
  | "mv"
  | "k0_nc"
  | "k0_oc"
  | "ka"
  | "kp"
  | "sigma_h0_eff";

export interface ProjectParameterRecord {
  id: string;
  user_id: string;
  project_id: string;
  borehole_label: string | null;
  sample_depth: number | null;
  parameter_code: string;
  parameter_label: string;
  value: number;
  unit: string | null;
  source_tool_slug: string;
  source_result_id: string;
  created_at?: string;
}

interface ProfileTableSnapshot {
  title?: string;
  headers?: string[];
  rows?: string[][];
}

interface ActiveSelectionSnapshot {
  boreholeLabel?: string | null;
  sampleTopDepth?: number | null;
  selectedBoreholes?: Array<{
    boreholeLabel?: string | null;
    sampleTopDepth?: number | null;
  }>;
}

interface ToolResultPayloadSnapshot {
  items?: Array<{ label?: string; value?: string | number; unit?: string }>;
  calculationResult?: {
    items?: Array<{ label?: string; value?: string | number; unit?: string }>;
  };
  activeSelection?: ActiveSelectionSnapshot;
  profileSnapshot?: {
    tables?: ProfileTableSnapshot[];
  };
}

interface ExtractedParameter {
  boreholeLabel: string | null;
  sampleDepth: number | null;
  parameterCode: ParameterCode;
  parameterLabel: string;
  value: number;
  unit: string | null;
}

interface SyncProjectParametersArgs {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  sourceResultId: string;
  toolSlug: string;
  payload: unknown;
}

interface SyncProjectParametersResult {
  extractedCount: number;
  insertedCount: number;
}

const TOOL_EXPORT_POLICY: Partial<Record<string, ParameterCode[]>> = {
  "spt-corrections": ["n60", "n160", "sigma_v0_eff"],
  "cu-from-pi-and-spt": ["cu", "f1"],
  "cu-from-pressuremeter": ["cu", "pln"],
  "cprime-from-cu": ["c_prime"],
  "friction-angle-from-pi": ["phi_prime"],
  "friction-angle-from-spt": ["phi_prime"],
  "modulus-from-cu": ["eu"],
  "eu-from-spt-butler-1975": ["eu"],
  "effective-modulus-eprime-cohesive": ["e_prime"],
  "eprime-from-spt-cohesionless": ["e_prime"],
  "gmax-from-vs": ["gmax", "vs"],
  "eoed-from-mv": ["eoed", "mv"],
  "ocr-calculator": ["ocr", "sigma_v0_eff"],
  "k0-earth-pressure": ["k0_nc", "k0_oc", "ka", "kp", "sigma_h0_eff"],
};

const PARAMETER_METADATA: Record<
  ParameterCode,
  {
    label: string;
    defaultUnit: string | null;
  }
> = {
  n: { label: "N", defaultUnit: "blows" },
  n60: { label: "N60", defaultUnit: "blows" },
  n160: { label: "(N1)60", defaultUnit: "blows" },
  pi: { label: "PI", defaultUnit: "%" },
  f1: { label: "f1", defaultUnit: "kN/m2" },
  pln: { label: "PLN", defaultUnit: "kPa" },
  cu: { label: "cu", defaultUnit: "kPa" },
  c_prime: { label: "c'", defaultUnit: "kPa" },
  phi_prime: { label: "φ′", defaultUnit: "deg" },
  eu: { label: "Eu", defaultUnit: "kPa" },
  e_prime: { label: "E'", defaultUnit: "kPa" },
  ocr: { label: "OCR", defaultUnit: null },
  sigma_v0_eff: { label: "sigma'v0", defaultUnit: "kPa" },
  gmax: { label: "Gmax", defaultUnit: "MPa" },
  vs: { label: "Vs", defaultUnit: "m/s" },
  eoed: { label: "Eoed", defaultUnit: "MPa" },
  mv: { label: "mv", defaultUnit: "m2/MN" },
  k0_nc: { label: "K0,NC", defaultUnit: null },
  k0_oc: { label: "K0,OC", defaultUnit: null },
  ka: { label: "Ka", defaultUnit: null },
  kp: { label: "Kp", defaultUnit: null },
  sigma_h0_eff: { label: "sigma'h,0", defaultUnit: "kPa" },
};

const SUPPORTED_HEADERS: Array<{ code: ParameterCode; test: (header: string, token: string) => boolean }> = [
  {
    code: "n160",
    test: (header, token) => header.includes("(n1)60") || header.includes("(n₁)60") || token.startsWith("n160"),
  },
  { code: "n60", test: (header, token) => token === "n60" || token.startsWith("n60") || header.startsWith("n60") },
  {
    code: "n",
    test: (header, token) =>
      token === "n" || token === "nvalue" || header === "n value" || header.includes("recorded spt n"),
  },
  { code: "pi", test: (header, token) => token === "pi" || token.startsWith("pi") || header.includes("plasticity index") },
  { code: "f1", test: (_header, token) => token === "f1" || token.startsWith("f1") },
  { code: "pln", test: (header, token) => token === "pln" || token.startsWith("pln") || header.includes("net limit pressure") },
  {
    code: "cu",
    test: (header, token) =>
      (token === "cu" || token.startsWith("cu") || header.startsWith("cu") || header.includes(" c_u") || header.includes("c u")) &&
      !header.includes("e/cu") &&
      !header.includes("eu/cu"),
  },
  { code: "c_prime", test: (header, token) => header.includes("c'") || token === "cprime" || token === "ceff" },
  { code: "phi_prime", test: (header, token) => header.includes("phi") || token === "phiprime" },
  {
    code: "eu",
    test: (header, token) =>
      (token === "eu" || token.startsWith("eu") || header.includes("e_u") || header.startsWith("eu")) &&
      !header.includes("eu/n60") &&
      !header.includes("e/cu"),
  },
  {
    code: "e_prime",
    test: (header, token) =>
      header.includes("e'") ||
      header.includes("effective modulus") ||
      token === "eprime" ||
      token === "es" ||
      token === "effectivemodulus",
  },
  { code: "ocr", test: (_header, token) => token === "ocr" },
  {
    code: "sigma_v0_eff",
    test: (header, token) => (header.includes("sigma") && header.includes("v0")) || token === "sigmav0",
  },
  { code: "gmax", test: (header, token) => token === "gmax" || token.startsWith("gmax") || header.startsWith("gmax") },
  { code: "vs", test: (header, token) => token === "vs" || token.startsWith("vs") || header.includes("v_s") || header.startsWith("vs") },
  { code: "eoed", test: (header, token) => token === "eoed" || token.startsWith("eoed") || header.startsWith("eoed") },
  { code: "mv", test: (header, token) => token === "mv" || token.startsWith("mv") || header.startsWith("mv") },
  { code: "k0_nc", test: (_header, token) => token === "k0nc" },
  { code: "k0_oc", test: (_header, token) => token === "k0oc" || token === "k0" },
  { code: "ka", test: (_header, token) => token === "ka" },
  { code: "kp", test: (_header, token) => token === "kp" },
  { code: "sigma_h0_eff", test: (header, token) => (header.includes("sigma") && header.includes("h,0")) || token === "sigmah0" },
];

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/φ|ϕ/gi, "phi"],
  [/σ/gi, "sigma"],
  [/τ/gi, "tau"],
  [/γ/gi, "gamma"],
  [/₀/g, "0"],
  [/₁/g, "1"],
  [/₂/g, "2"],
  [/₃/g, "3"],
  [/₄/g, "4"],
  [/₅/g, "5"],
  [/₆/g, "6"],
  [/₇/g, "7"],
  [/₈/g, "8"],
  [/₉/g, "9"],
  [/′|’/g, "'"],
];

function normaliseHeader(raw: string): { header: string; token: string } {
  let next = raw ?? "";
  REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  next = next.toLowerCase().replace(/\s+/g, " ").trim();
  return {
    header: next,
    token: next.replace(/[^a-z0-9]+/g, ""),
  };
}

function parsePossibleNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/\s+/g, "");
  if (/^-?\d+,\d+$/.test(compact)) {
    const parsed = Number(compact.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const normalized = compact.replace(/,/g, "");
  const strict = Number(normalized);
  if (Number.isFinite(strict)) {
    return strict;
  }

  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitiseBoreholeLabel(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .replace(/[▼▾▿▲△]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "BH not set";
}

function extractUnitFromHeader(header: string): string | null {
  const match = header.match(/\(([^)]+)\)/);
  if (!match) {
    return null;
  }
  const unit = match[1]?.trim();
  return unit || null;
}

function resolveUnitForCode(code: ParameterCode, rawUnit: string | null): string | null {
  if (!rawUnit) {
    return PARAMETER_METADATA[code].defaultUnit;
  }

  const normalized = rawUnit.trim().toLowerCase();
  if (code === "n160" && (normalized === "n1" || normalized === "(n1)" || normalized === "n160")) {
    return PARAMETER_METADATA[code].defaultUnit;
  }
  if ((code === "n60" || code === "n") && (normalized === "n" || normalized === "n60")) {
    return PARAMETER_METADATA[code].defaultUnit;
  }

  return rawUnit;
}

function resolveParameterCode(header: string): ParameterCode | null {
  const normalized = normaliseHeader(header);
  if (!normalized.header || normalized.header === "action") {
    return null;
  }
  const found = SUPPORTED_HEADERS.find((entry) => entry.test(normalized.header, normalized.token));
  return found?.code ?? null;
}

function resolveBoreholeIndex(headers: string[]): number {
  return headers.findIndex((header) => normaliseHeader(header).header.includes("borehole id"));
}

function resolveDepthIndex(headers: string[]): number {
  const preferred = headers.findIndex((header) => {
    const value = normaliseHeader(header).header;
    return value.includes("sample depth");
  });
  if (preferred >= 0) {
    return preferred;
  }

  const topBased = headers.findIndex((header) => {
    const value = normaliseHeader(header).header;
    return value.startsWith("sample top") || value.startsWith("top");
  });
  return topBased;
}

function extractFromProfileTable(
  table: ProfileTableSnapshot,
  fallbackSelection: ActiveSelectionSnapshot | undefined,
): ExtractedParameter[] {
  const headers = Array.isArray(table.headers) ? table.headers.map((item) => String(item ?? "").trim()) : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  if (!headers.length || !rows.length) {
    return [];
  }

  const boreholeIndex = resolveBoreholeIndex(headers);
  const depthIndex = resolveDepthIndex(headers);
  const fallbackBorehole = fallbackSelection?.boreholeLabel?.trim() || null;
  const fallbackDepth =
    typeof fallbackSelection?.sampleTopDepth === "number" && Number.isFinite(fallbackSelection.sampleTopDepth)
      ? fallbackSelection.sampleTopDepth
      : null;

  const parameterColumns = headers
    .map((header, index) => ({
      index,
      header,
      code: resolveParameterCode(header),
      unit: extractUnitFromHeader(header),
    }))
    .filter((column) => column.code !== null)
    .filter((column) => column.index !== boreholeIndex && column.index !== depthIndex) as Array<{
    index: number;
    header: string;
    code: ParameterCode;
    unit: string | null;
  }>;

  const extracted: ExtractedParameter[] = [];
  rows.forEach((row) => {
    const rowCells = Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : [];
    const boreholeLabel = sanitiseBoreholeLabel(
      (boreholeIndex >= 0 ? rowCells[boreholeIndex]?.trim() : "") || fallbackBorehole || "BH not set",
    );
    const sampleDepth =
      (depthIndex >= 0 ? parsePossibleNumber(rowCells[depthIndex]) : null) ??
      fallbackDepth ??
      null;

    parameterColumns.forEach((column) => {
      const value = parsePossibleNumber(rowCells[column.index]);
      if (value === null) {
        return;
      }
      const metadata = PARAMETER_METADATA[column.code];
      extracted.push({
        boreholeLabel,
        sampleDepth,
        parameterCode: column.code,
        parameterLabel: metadata.label,
        value,
        unit: resolveUnitForCode(column.code, column.unit),
      });
    });
  });

  return extracted;
}

function extractFromCalculationItems(
  payload: ToolResultPayloadSnapshot,
  fallbackSelection: ActiveSelectionSnapshot | undefined,
): ExtractedParameter[] {
  const itemSet =
    (Array.isArray(payload.calculationResult?.items) && payload.calculationResult?.items) ||
    (Array.isArray(payload.items) && payload.items) ||
    [];
  if (!itemSet.length) {
    return [];
  }

  const fallbackBorehole = sanitiseBoreholeLabel(fallbackSelection?.boreholeLabel?.trim() || "BH not set");
  const fallbackDepth =
    typeof fallbackSelection?.sampleTopDepth === "number" && Number.isFinite(fallbackSelection.sampleTopDepth)
      ? fallbackSelection.sampleTopDepth
      : null;

  return itemSet.reduce<ExtractedParameter[]>((acc, item) => {
      const label = String(item.label ?? "").trim();
      const code = resolveParameterCode(label);
      if (!code) {
        return acc;
      }
      const value = parsePossibleNumber(item.value ?? null);
      if (value === null) {
        return acc;
      }
      const metadata = PARAMETER_METADATA[code];
      acc.push({
        boreholeLabel: fallbackBorehole,
        sampleDepth: fallbackDepth,
        parameterCode: code,
        parameterLabel: metadata.label,
        value,
        unit: item.unit || metadata.defaultUnit,
      });
      return acc;
    }, []);
}

function dedupeExtractedParameters(rows: ExtractedParameter[]): ExtractedParameter[] {
  const map = new Map<string, ExtractedParameter>();
  rows.forEach((row) => {
    const depthKey =
      row.sampleDepth === null || !Number.isFinite(row.sampleDepth)
        ? "na"
        : row.sampleDepth.toFixed(4);
    const valueKey = Number.isFinite(row.value) ? row.value.toFixed(6) : String(row.value);
    const key = `${row.boreholeLabel ?? "na"}|${depthKey}|${row.parameterCode}|${valueKey}`;
    map.set(key, row);
  });
  return Array.from(map.values());
}

function applyToolExportPolicy(toolSlug: string, rows: ExtractedParameter[]): ExtractedParameter[] {
  const allowedCodes = TOOL_EXPORT_POLICY[toolSlug];
  if (!allowedCodes || allowedCodes.length === 0) {
    return rows;
  }

  const allowed = new Set<ParameterCode>(allowedCodes);
  return rows.filter((row) => allowed.has(row.parameterCode));
}

export function extractProjectParametersFromToolPayload(toolSlug: string, payload: unknown): ExtractedParameter[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const snapshot = payload as ToolResultPayloadSnapshot;
  const fallbackSelection = snapshot.activeSelection;
  const profileTables = Array.isArray(snapshot.profileSnapshot?.tables) ? snapshot.profileSnapshot?.tables : [];

  const fromTables = profileTables.flatMap((table) => extractFromProfileTable(table, fallbackSelection));
  const fromCalculation = fromTables.length === 0 ? extractFromCalculationItems(snapshot, fallbackSelection) : [];

  const merged = dedupeExtractedParameters([...fromTables, ...fromCalculation]).filter((row) =>
    Number.isFinite(row.value),
  );

  return applyToolExportPolicy(toolSlug, merged);
}

export async function syncProjectParametersForResult({
  supabase,
  userId,
  projectId,
  sourceResultId,
  toolSlug,
  payload,
}: SyncProjectParametersArgs): Promise<SyncProjectParametersResult> {
  const extracted = extractProjectParametersFromToolPayload(toolSlug, payload);

  const { error: clearError } = await supabase
    .from("project_parameters")
    .delete()
    .eq("user_id", userId)
    .eq("source_result_id", sourceResultId);

  if (clearError) {
    throw new Error(clearError.message);
  }

  if (extracted.length === 0) {
    return {
      extractedCount: 0,
      insertedCount: 0,
    };
  }

  const rows = extracted.map((row) => ({
    user_id: userId,
    project_id: projectId,
    borehole_label: row.boreholeLabel,
    sample_depth: row.sampleDepth,
    parameter_code: row.parameterCode,
    parameter_label: row.parameterLabel,
    value: row.value,
    unit: row.unit,
    source_tool_slug: toolSlug,
    source_result_id: sourceResultId,
  }));

  const { error: insertError } = await supabase.from("project_parameters").insert(rows);
  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    extractedCount: extracted.length,
    insertedCount: rows.length,
  };
}

