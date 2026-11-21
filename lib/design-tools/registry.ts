/**
 * Slug → calculator map for the design-tool engines. calculateBySlug() in lib/tool-calculations.ts falls
 * back to this registry, so a tool runs as soon as its definition in data/tools-drafts.ts is set to
 * status "active". See docs/design-tools-roadmap.md for the activation checklist.
 */
import type { DesignCalculator } from "@/lib/design-tools/common";
import { cptInterpretationCalculator } from "@/lib/design-tools/cpt-interpretation";
import { deepMixingCalculator } from "@/lib/design-tools/deep-mixing";
import { dynamicCompactionCalculator } from "@/lib/design-tools/dynamic-compaction";
import { pileAxialCapacityCalculator } from "@/lib/design-tools/pile-axial-capacity";
import { vs30Calculator, vsFromSptCalculator } from "@/lib/design-tools/shear-wave-velocity";
import { retainingWallCalculator } from "@/lib/design-tools/retaining-wall";
import { slopeStabilityCalculator } from "@/lib/design-tools/slope-stability";
import {
  compressionIndexCalculator,
  relativeDensityCalculator,
  undrainedStrengthRatioCalculator,
} from "@/lib/design-tools/soil-index-correlations";
import { soilNailingCalculator } from "@/lib/design-tools/soil-nailing";
import { stoneColumnsCalculator } from "@/lib/design-tools/stone-columns";
import { subgradeReactionCalculator } from "@/lib/design-tools/subgrade-reaction";
import { verticalDrainsCalculator } from "@/lib/design-tools/vertical-drains";

export const designToolCalculators: Record<string, DesignCalculator> = {
  // Site characterisation
  "cpt-interpretation-robertson": cptInterpretationCalculator,
  "shear-wave-velocity-from-spt": vsFromSptCalculator,
  "vs30-site-class": vs30Calculator,
  "relative-density-from-spt": relativeDensityCalculator,
  "compression-index-correlations": compressionIndexCalculator,
  "undrained-strength-stress-history": undrainedStrengthRatioCalculator,
  // Geotechnical analysis / design
  "pile-axial-capacity-fhwa": pileAxialCapacityCalculator,
  "subgrade-reaction-foundations": subgradeReactionCalculator,
  "slope-stability-bishop": slopeStabilityCalculator,
  "retaining-wall-stability": retainingWallCalculator,
  "deep-mixing-columns-fhwa": deepMixingCalculator,
  "stone-columns-fhwa": stoneColumnsCalculator,
  "prefabricated-vertical-drains": verticalDrainsCalculator,
  "dynamic-compaction-fhwa": dynamicCompactionCalculator,
  "soil-nail-wall-gec7": soilNailingCalculator,
};
