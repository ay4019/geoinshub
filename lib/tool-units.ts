import type { CalculationResult, CalculationResultItem, ToolDefinition, UnitSystem } from "@/lib/types";

const conversionMap = {
  "kN/m3": { americanUnit: "pcf", toAmerican: 6.36588, toMetric: 1 / 6.36588 },
  m: { americanUnit: "ft", toAmerican: 3.28084, toMetric: 1 / 3.28084 },
  mm: { americanUnit: "in", toAmerican: 0.0393701, toMetric: 1 / 0.0393701 },
  kPa: { americanUnit: "ksf", toAmerican: 0.0208854, toMetric: 1 / 0.0208854 },
  MPa: { americanUnit: "ksi", toAmerican: 0.145038, toMetric: 1 / 0.145038 },
  kN: { americanUnit: "kip", toAmerican: 0.224809, toMetric: 1 / 0.224809 },
  "kN-m": { americanUnit: "kip-ft", toAmerican: 0.737562, toMetric: 1 / 0.737562 },
  "kN/m": { americanUnit: "kip/ft", toAmerican: 0.0685218, toMetric: 1 / 0.0685218 },
  "kN/mm": { americanUnit: "kip/in", toAmerican: 5.71015, toMetric: 1 / 5.71015 },
  "m/s": { americanUnit: "ft/s", toAmerican: 3.28084, toMetric: 1 / 3.28084 },
  "kg/m3": { americanUnit: "pcf", toAmerican: 0.062428, toMetric: 1 / 0.062428 },
} as const;

type ConvertibleUnit = keyof typeof conversionMap;

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (Math.abs(value) >= 100) {
    return String(round(value, 2));
  }

  if (Math.abs(value) >= 10) {
    return String(round(value, 3));
  }

  return String(round(value, 4));
}

function isConvertibleUnit(unit: string | undefined): unit is ConvertibleUnit {
  return Boolean(unit && unit in conversionMap);
}

export function getDisplayUnit(unit: string | undefined, unitSystem: UnitSystem): string | undefined {
  if (!unit || unitSystem === "metric" || !isConvertibleUnit(unit)) {
    return unit;
  }

  return conversionMap[unit].americanUnit;
}

export function convertInputToMetric(value: number, unit: string | undefined, unitSystem: UnitSystem): number {
  if (!unit || unitSystem === "metric" || !isConvertibleUnit(unit)) {
    return value;
  }

  return value * conversionMap[unit].toMetric;
}

export function convertMetricToDisplay(value: number, unit: string | undefined, unitSystem: UnitSystem): number {
  if (!unit || unitSystem === "metric" || !isConvertibleUnit(unit)) {
    return value;
  }

  return value * conversionMap[unit].toAmerican;
}

export function convertInputValueBetweenSystems(
  rawValue: string,
  unit: string | undefined,
  from: UnitSystem,
  to: UnitSystem,
): string {
  if (!rawValue || !unit || from === to) {
    return rawValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return rawValue;
  }

  const metricValue = convertInputToMetric(parsed, unit, from);
  const nextValue = convertMetricToDisplay(metricValue, unit, to);
  return formatNumber(nextValue);
}

function convertResultItem(item: CalculationResultItem, unitSystem: UnitSystem): CalculationResultItem {
  if (typeof item.value !== "number") {
    return item;
  }

  return {
    ...item,
    value: round(convertMetricToDisplay(item.value, item.unit, unitSystem), item.unit === "mm" ? 2 : 3),
    unit: getDisplayUnit(item.unit, unitSystem),
  };
}

export function getDisplayResult(
  tool: ToolDefinition,
  result: CalculationResult | null,
  unitSystem: UnitSystem,
): CalculationResult | null {
  if (!result || unitSystem === "metric") {
    return result;
  }

  return {
    ...result,
    items: result.items.map((item) => convertResultItem(item, unitSystem)),
  };
}
