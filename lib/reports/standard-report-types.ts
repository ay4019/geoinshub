/**
 * Data contract between a tool's Soil Profile / Calculation tab and the standard report engine.
 *
 * A report always has two parts:
 *   Part 1 — General information (method, equations, assumptions, limitations, references): fixed per tool,
 *            defined in lib/reports/standard-report-content.ts.
 *   Part 2 — Project-specific assessment: built from this payload (inputs, results table, profile figures,
 *            deterministic statistics, optional AI interpretation).
 */

export interface StandardReportColumn {
  header: string;
  key: string;
}

/** One plotted quantity → one "value versus depth" figure in the report. */
export interface StandardReportSeries {
  key: string;
  /** Axis / legend label, Unicode allowed (e.g. "Gₘₐₓ"). */
  label: string;
  unit: string;
  /** Optional vertical reference line (e.g. FS = 1.0). */
  referenceLine?: { value: number; label: string };
}

export interface StandardReportPoint {
  boreholeId: string;
  depth: number;
  values: Record<string, number | null>;
}

export interface StandardReportPayload {
  depthUnit: string;
  columns: StandardReportColumn[];
  rows: Array<Record<string, string>>;
  points: StandardReportPoint[];
  series: StandardReportSeries[];
  /** Project-level inputs shown in the "Input data and assumptions" table (e.g. Mw, PGA, GWT, correlation). */
  inputs?: Array<{ label: string; value: string }>;
  /** Project-specific method sentences (selected correlation, β′, energy ratio, …). */
  methodNotes?: string[];
  /** Key results for calculation-type tools (bearing capacity, settlement totals). */
  keyResults?: Array<{ label: string; value: string }>;
  /** Rows excluded from the analysis and why (e.g. above GWT, (N1)60 > 30). */
  exclusions?: string[];
  /** Step-by-step calculation narrative for design tools, rendered as a "Calculation Steps" section. */
  steps?: StandardReportStep[];
  /** Replaces the generated data-source sentence of the Input Data section. */
  dataSentence?: string;
  /** Skip the automatic statistical summary of plotted series (not meaningful for design curves). */
  skipSeriesSummary?: boolean;
}

export interface StandardReportStep {
  title: string;
  paragraphs: string[];
  equations?: StandardReportEquation[];
  bullets?: string[];
  table?: { title: string; columns: StandardReportColumn[]; rows: Array<Record<string, string>> };
  /** Closing sentences after equations/table (e.g. the numerical result). */
  after?: string[];
}

export interface StandardReportEquation {
  /** Unicode text, e.g. "Gₘₐₓ = ρ Vₛ²". */
  text: string;
  /** Optional symbol legend shown under the equation. */
  where?: string;
}

export interface StandardReportContent {
  /** Short name of the assessment, used in headings ("Small-Strain Shear Modulus"). */
  subject: string;
  /** "Introduction": what the parameter is and why it matters — one or two short paragraphs. */
  introduction: string[];
  /** "Method": how it is obtained, in plain words, before the equations — one short paragraph. */
  method: string;
  equations: StandardReportEquation[];
  /** "Notes on use": how to read and apply the result — one short paragraph. */
  guidance?: string[];
  references: string[];
  tableTitle: string;
  figureCaption: (series: StandardReportSeries) => string;
  /** Hint passed to the AI interpretation. */
  aiHint: string;
}

export interface StandardReportContext {
  toolSlug: string;
  toolTitle: string;
  projectName: string | null;
  boreholeIds: string[];
  unitSystem: string;
  assumptions: string[];
  limitations: string[];
}
