const equationReferenceOverrides: Record<string, string[][]> = {
  "friction-angle-from-spt": [
    [
      "Peck, R.B., Hanson, W.E., and Thornburn, T.H. (1974). Foundation Engineering, 2nd ed. John Wiley & Sons. Source correlation for friction angle versus corrected SPT resistance.",
      "Kulhawy, F.H. and Mayne, P.W. (1990). Manual on Estimating Soil Properties for Foundation Design. Electric Power Research Institute (EPRI EL-6800). Common summary source for SPT-based property correlations.",
    ],
  ],
  "spt-corrections": [
    [
      "ASTM D1586/D1586M. Standard Test Method for Standard Penetration Test (SPT) and Split-Barrel Sampling of Soils.",
      "ASTM D4633. Standard Test Methods for Energy Measurement for Dynamic Penetrometers.",
    ],
    [
      "ASTM D4633. Standard Test Methods for Energy Measurement for Dynamic Penetrometers.",
      "ASTM D6066-11. Standard Practice for Determining the Normalized Penetration Resistance of Sands for Evaluation of Liquefaction Potential.",
    ],
    [
      "Peck, R.B., Hanson, W.E., and Thornburn, T.H. (1974). Foundation Engineering, 2nd ed. John Wiley & Sons.",
    ],
    [
      "Liao, S.S.C. and Whitman, R.V. (1986). Overburden Correction Factors for SPT in Sand. Journal of Geotechnical Engineering, 112(3), 373-377.",
    ],
    [
      "Peck, R.B., Hanson, W.E., and Thornburn, T.H. (1974). Foundation Engineering, 2nd ed. John Wiley & Sons.",
      "Liao, S.S.C. and Whitman, R.V. (1986). Overburden Correction Factors for SPT in Sand. Journal of Geotechnical Engineering, 112(3), 373-377.",
      "Youd, T.L. et al. (2001). Liquefaction resistance of soils: Summary report from the 1996 NCEER and 1998 NCEER/NSF workshops. Journal of Geotechnical and Geoenvironmental Engineering, ASCE, 127(10), 817-833.",
    ],
  ],
};

export function getEquationReferences(slug: string, equationCount: number, fallbackReferences: string[]): string[][] {
  const overrides = equationReferenceOverrides[slug] ?? [];

  return Array.from({ length: equationCount }, (_, index) => overrides[index] ?? fallbackReferences);
}
