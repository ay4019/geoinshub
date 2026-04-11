import { convertInputValueBetweenSystems } from "@/lib/tool-units";
import type { UnitSystem } from "@/lib/types";

import type { SelectedBoreholeSummary } from "./project-boreholes";

/** Optional per-sample soil behaviour for tool gating (stored in browser extras, optional DB column). */
export type SoilBehavior = "cohesive" | "granular" | null;

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

function depthKeyMetric(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "na";
}

/**
 * Match a profile table row to the corresponding project import row (label + depth).
 */
export function matchImportSummaryForProfileRow(
  importRows: SelectedBoreholeSummary[] | undefined,
  boreholeId: string,
  sampleDepthDisplayString: string,
  unitSystem: UnitSystem,
  parseDepthDisplay: (s: string) => number,
): SelectedBoreholeSummary | undefined {
  if (!importRows?.length) {
    return undefined;
  }
  const depthDisplay = parseDepthDisplay(sampleDepthDisplayString);
  const rowMetric = Number(convertInputValueBetweenSystems(String(depthDisplay), "m", unitSystem, "metric"));
  if (!Number.isFinite(rowMetric)) {
    return undefined;
  }
  const labelKey = normaliseBoreholeLabelKey(boreholeId);
  const dk = depthKeyMetric(rowMetric);

  return importRows.find((item) => {
    if (normaliseBoreholeLabelKey(item.boreholeLabel) !== labelKey) {
      return false;
    }
    const sm = item.sampleTopDepth;
    return typeof sm === "number" && Number.isFinite(sm) ? depthKeyMetric(sm) === dk : false;
  });
}

/**
 * Convenience: true when this profile row is restricted (grey / no processing) for the tool.
 */
export function profileRowSoilRestricted(
  toolSlug: string | undefined,
  importRows: SelectedBoreholeSummary[] | undefined,
  boreholeId: string,
  sampleDepthDisplayString: string,
  unitSystem: UnitSystem,
  parseDepthDisplay: (s: string) => number,
): boolean {
  if (!toolSlug) {
    return false;
  }
  const matched = matchImportSummaryForProfileRow(
    importRows,
    boreholeId,
    sampleDepthDisplayString,
    unitSystem,
    parseDepthDisplay,
  );
  return isSampleSoilRestrictedForTool(toolSlug, matched?.soilBehavior ?? null);
}

/**
 * When true, the sample row should be non-editable (grey) for this tool’s profile tab.
 * Unknown / unset behaviour applies no restriction.
 */
export function isSampleSoilRestrictedForTool(toolSlug: string, behavior: SoilBehavior | undefined | null): boolean {
  if (behavior == null) {
    return false;
  }

  switch (toolSlug) {
    case "spt-corrections":
    case "gmax-from-vs":
    case "k0-earth-pressure":
    case "rankine-earth-pressure":
    case "coulomb-earth-pressure":
      return false;

    case "cu-from-pi-and-spt":
    case "cprime-from-cu":
    case "friction-angle-from-pi":
    case "modulus-from-cu":
    case "eu-from-spt-butler-1975":
    case "effective-modulus-eprime-cohesive":
    case "eoed-from-mv":
    case "ocr-calculator":
      return behavior === "granular";

    case "friction-angle-from-spt":
    case "eprime-from-spt-cohesionless":
      return behavior === "cohesive";

    default:
      return false;
  }
}

/**
 * Short UI copy when a row is greyed out for this tool (soil marking vs tool assumptions).
 * Returns null when the row is not restricted or behaviour is unset.
 */
export function soilRestrictionUserHint(
  toolSlug: string | undefined,
  behavior: SoilBehavior | null | undefined,
): string | null {
  if (!toolSlug || behavior == null) {
    return null;
  }
  if (!isSampleSoilRestrictedForTool(toolSlug, behavior)) {
    return null;
  }
  if (behavior === "granular") {
    return "Granular — not used with this tool (cohesive / PI–based paths). Inputs and N₆₀ are not shown.";
  }
  if (behavior === "cohesive") {
    return "Cohesive — not used with this tool (cohesionless / SPT–based paths). Inputs are not shown.";
  }
  return null;
}
