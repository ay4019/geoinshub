export interface PostLiquefactionSettlementInput {
  correctedSptResistance: number;
  factorOfSafety: number;
  layerThickness: number;
}

export interface PostLiquefactionSettlementResult {
  relativeDensity: number;
  limitingShearStrain: number;
  thresholdParameter: number;
  maxShearStrain: number;
  volumetricStrain: number;
  settlementM: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computePostLiquefactionSettlement(
  input: PostLiquefactionSettlementInput,
): PostLiquefactionSettlementResult {
  const relativeDensity = clamp(Math.sqrt(input.correctedSptResistance / 60), 0, 1);
  const limitingShearStrainDecimal = Math.max(1.859 * (1.1 - relativeDensity) ** 3, 0.05);
  const thresholdParameter = 0.032 + 4.7 * relativeDensity - 6 * relativeDensity ** 2;

  let maxShearStrainDecimal = 0;

  if (input.factorOfSafety < 2) {
    if (input.factorOfSafety <= thresholdParameter) {
      maxShearStrainDecimal = limitingShearStrainDecimal;
    } else {
      maxShearStrainDecimal = Math.min(
        limitingShearStrainDecimal,
        (0.035 * (2 - input.factorOfSafety) * (1 - thresholdParameter)) /
          (input.factorOfSafety - thresholdParameter),
      );
    }
  }

  maxShearStrainDecimal = Math.max(0, maxShearStrainDecimal);
  const volumetricStrainDecimal =
    1.5 * Math.exp(-2.5 * relativeDensity) * Math.min(0.08, maxShearStrainDecimal);
  const settlementM = volumetricStrainDecimal * input.layerThickness;

  return {
    relativeDensity,
    limitingShearStrain: limitingShearStrainDecimal * 100,
    thresholdParameter,
    maxShearStrain: maxShearStrainDecimal * 100,
    volumetricStrain: volumetricStrainDecimal * 100,
    settlementM,
  };
}
