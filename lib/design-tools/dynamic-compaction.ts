/**
 * Dynamic compaction — FHWA-SA-95-037 "Geotechnical Engineering Circular No. 1: Dynamic Compaction"
 * (Lukas 1995) and FHWA GEC-13.
 *
 *   Depth of improvement   D = n √(W H)        (W in tonnes, H in m, D in m)
 *   Applied energy          AE = E_unit × D     (kJ/m³ × m → kJ/m²)
 *   Drops per print         N = AE × s² / (W g H)
 *   Ground vibration        PPV ≈ 70 (√(W H) / d)^1.4  mm/s   (Mayne, Jones & Dumas 1984 upper trend)
 */
import { readChoice, readNumber, round, screeningWarnings, type DesignCalculator } from "@/lib/design-tools/common";

const SOIL_TABLE = {
  pervious: { n: 0.5, unitEnergy: [200, 250], label: "Pervious coarse-grained (sand, gravel, PI = 0)" },
  "semi-pervious": { n: 0.4, unitEnergy: [250, 350], label: "Semi-pervious (silts, PI < 8)" },
  "landfill": { n: 0.35, unitEnergy: [600, 1100], label: "Municipal landfill" },
} as const;

export type DcSoil = keyof typeof SOIL_TABLE;

export function computeDynamicCompaction(input: {
  soil: DcSoil;
  tampMass: number; // t
  dropHeight: number; // m
  gridSpacing: number; // m
  nOverride: number; // 0 = table value
  distance: number; // m for vibration
}) {
  const row = SOIL_TABLE[input.soil];
  const n = input.nOverride > 0 ? input.nOverride : row.n;
  const depth = n * Math.sqrt(input.tampMass * input.dropHeight);
  const energyPerDrop = input.tampMass * 9.81 * input.dropHeight; // kJ
  const aeLow = row.unitEnergy[0] * depth;
  const aeHigh = row.unitEnergy[1] * depth;
  const dropsLow = (aeLow * input.gridSpacing ** 2) / energyPerDrop;
  const dropsHigh = (aeHigh * input.gridSpacing ** 2) / energyPerDrop;
  const ppv = 70 * (Math.sqrt(input.tampMass * input.dropHeight) / Math.max(input.distance, 1)) ** 1.4;
  return { n, depth, energyPerDrop, aeLow, aeHigh, dropsLow, dropsHigh, ppv, row };
}

export const dynamicCompactionCalculator: DesignCalculator = (values) => {
  const soil = readChoice(values, "soil", ["pervious", "semi-pervious", "landfill"] as const, "pervious");
  const r = computeDynamicCompaction({
    soil,
    tampMass: readNumber(values, "tampMass", "Tamper mass W", { min: 5, max: 40 }),
    dropHeight: readNumber(values, "dropHeight", "Drop height H", { min: 5, max: 40 }),
    gridSpacing: readNumber(values, "gridSpacing", "Grid spacing", { min: 2, max: 15 }),
    nOverride: readNumber(values, "nOverride", "Empirical coefficient n (0 = table)", { min: 0, max: 1, fallback: 0 }),
    distance: readNumber(values, "distance", "Distance to structure", { min: 1, fallback: 30 }),
  });
  return {
    title: "Dynamic Compaction — Preliminary Design (FHWA-SA-95-037)",
    summary: `Estimated depth of improvement ${round(r.depth, 1)} m; ${round(r.dropsLow, 0)}–${round(
      r.dropsHigh,
      0,
    )} drops per print over all passes.`,
    items: [
      { label: "Soil group", value: r.row.label },
      { label: "Empirical coefficient n", value: round(r.n, 2) },
      { label: "Depth of improvement, D = n√(WH)", value: round(r.depth, 2), unit: "m" },
      { label: "Energy per drop, W g H", value: round(r.energyPerDrop, 0), unit: "kJ" },
      { label: "Applied energy (lower)", value: round(r.aeLow, 0), unit: "kJ/m²" },
      { label: "Applied energy (upper)", value: round(r.aeHigh, 0), unit: "kJ/m²" },
      { label: "Drops per print (lower)", value: round(r.dropsLow, 1) },
      { label: "Drops per print (upper)", value: round(r.dropsHigh, 1) },
      { label: "Peak particle velocity at distance (upper trend)", value: round(r.ppv, 1), unit: "mm/s" },
    ],
    notes: [
      `Unit energy range ${r.row.unitEnergy[0]}–${r.row.unitEnergy[1]} kJ/m³ per Lukas (1995) for this soil group.`,
      "Energy is normally delivered in 2–3 high-energy passes plus a low-energy ironing pass; verify with a test section.",
      "Groundwater should be at least about 2 m below the working surface.",
    ],
    warnings: screeningWarnings(
      [
        ...(r.ppv > 25 ? ["Predicted PPV exceeds about 25 mm/s — check vibration limits for nearby structures."] : []),
        ...(soil === "semi-pervious" ? ["Semi-pervious soils need longer rest periods between passes for pore-pressure dissipation."] : []),
      ],
    ),
  };
};
