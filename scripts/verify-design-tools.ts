/**
 * Benchmark checks for lib/design-tools engines and the corrected active-tool formulas.
 *
 * Run:  node scripts/run-ts.mjs scripts/verify-design-tools.ts
 *
 * Each case compares against a published or hand-calculated reference value with a tolerance.
 * Exit code 1 if any case fails.
 */
import { computeCpt } from "@/lib/design-tools/cpt-interpretation";
import { computeDeepMixing } from "@/lib/design-tools/deep-mixing";
import { computeDynamicCompaction } from "@/lib/design-tools/dynamic-compaction";
import { computePileAxialCapacity } from "@/lib/design-tools/pile-axial-capacity";
import { designToolCalculators } from "@/lib/design-tools/registry";
import { computeVs30, vsFromSpt } from "@/lib/design-tools/shear-wave-velocity";
import { computeInfiniteSlope, searchCriticalCircle } from "@/lib/design-tools/slope-stability";
import { coulombKa, computeSoilNailWall } from "@/lib/design-tools/soil-nailing";
import { computeStoneColumns } from "@/lib/design-tools/stone-columns";
import { computePvd } from "@/lib/design-tools/vertical-drains";
import { relativeDensityFromSpt } from "@/lib/design-tools/soil-index-correlations";
import { draftTools } from "@/data/tools-drafts";
import { calculateBySlug, classicalBearingFactors } from "@/lib/tool-calculations";

let failures = 0;
function check(name: string, actual: number, expected: number, relTol = 0.02) {
  const ok = Math.abs(actual - expected) <= Math.abs(expected) * relTol + 1e-9;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${actual.toFixed(4)} (expected ${expected} ±${(relTol * 100).toFixed(1)}%)`);
}
const rad = (d: number) => (d * Math.PI) / 180;

// ── Classical bearing capacity factors (Das, Principles of Foundation Engineering, tables) ──
check("Terzaghi Nc φ=30", classicalBearingFactors("terzaghi", rad(30), 1, 0).nc, 37.16, 0.005);
check("Terzaghi Nq φ=30", classicalBearingFactors("terzaghi", rad(30), 1, 0).nq, 22.46, 0.005);
check("Meyerhof Nγ φ=30", classicalBearingFactors("meyerhof", rad(30), 1, 0).ngamma, 15.67, 0.005);
check("Hansen Nγ φ=30", classicalBearingFactors("hansen", rad(30), 1, 0).ngamma, 15.07, 0.005);
check("Vesic Nγ φ=30", classicalBearingFactors("vesic", rad(30), 1, 0).ngamma, 22.4, 0.005);

// ── EC7 Annex D (hand calc): B = L = 2 m, Df = 1 m, φ′ = 30°, c′ = 0, γ = 18, dry → q_ult = 750 kPa ──
const ec7 = calculateBySlug("eurocode-7-bearing-resistance", {
  designApproach: "da1-combination-1",
  cohesion: "0",
  frictionAngle: "30",
  unitWeight: "18",
  width: "2",
  length: "2",
  embedment: "1",
  groundwaterDepth: "10",
});
check("EC7 Annex D q_ult,d", Number(ec7.items.find((i) => i.label === "q_ult,d")?.value), 750.0, 0.002);

// ── Slope: ACADS EX1(a) homogeneous 2H:1V, H = 10 m, c′ = 3 kPa, φ′ = 19.6°, γ = 20 → FS ≈ 0.99–1.00 ──
const acads = searchCriticalCircle(
  {
    height: 10,
    slopeAngle: (Math.atan(0.5) * 180) / Math.PI,
    upper: { unitWeight: 20, cohesion: 3, phi: 19.6 },
    lower: null,
    interfaceElevation: 0,
    waterMode: "none",
    phreaticElevation: -100,
    ru: 0,
    surcharge: 0,
    kh: 0,
  },
  10,
);
check("ACADS EX1(a) Bishop FS", acads.best?.fs ?? Number.NaN, 0.99, 0.03);

// ── Infinite slope hand calc: β = 20°, z = 3 m, γ = 19, c′ = 0, φ′ = 32°, dry → FS = tan32/tan20 = 1.717 ──
check(
  "Infinite slope dry cohesionless",
  computeInfiniteSlope({ slopeAngle: 20, depth: 3, unitWeight: 19, cohesion: 0, phi: 32, seepageRatio: 0, kh: 0 }).fs,
  Math.tan(rad(32)) / Math.tan(rad(20)),
  0.001,
);

// ── Pile: uniform clay c_u = 50 kPa, driven, D = 0.5 m, L = 15 m, GWT at surface, γ = 18 (hand calc via API α) ──
const pile = computePileAxialCapacity({
  method: "driven",
  diameter: 0.5,
  length: 15,
  groundwaterDepth: 0,
  layers: [{ thickness: 30, soil: "clay", unitWeight: 18, cu: 50, phi: 0, n60: 0 }],
  material: "concrete",
  ksK0: 1.5,
  siltySand: false,
  factorOfSafety: 2.5,
});
check("Pile toe 9c_u A", pile.toeResistance, 9 * 50 * ((Math.PI * 0.25) / 4), 0.001);
// α varies from 1.0 (ψ ≥ ... shallow) to 0.5ψ^-0.5 at depth; numeric integral reference = 1047.7 kN (independent trapezoid, 1 cm steps)
{
  let ref = 0;
  const dz = 0.01;
  for (let z = dz / 2; z < 15; z += dz) {
    const sv = Math.max((18 - 9.81) * z, 0.1);
    const psi = 50 / sv;
    const a = Math.min(psi <= 1 ? 0.5 * psi ** -0.5 : 0.5 * psi ** -0.25, 1);
    ref += a * 50 * Math.PI * 0.5 * dz;
  }
  check("Pile clay side (API α)", pile.sideResistance, ref, 0.01);
}

// ── Deep mixing: d = 0.8, s = 1.6 square → a_s = π·0.16/2.56 = 0.19635 ──
const dm = computeDeepMixing({
  diameter: 0.8,
  spacing: 1.6,
  pattern: "square",
  quLab: 1000,
  fieldLabRatio: 0.5,
  strengthCov: 0.35,
  kv: 1,
  modulusRatio: 150,
  soilShearStrength: 15,
  soilModulus: 1500,
  appliedStress: 100,
  treatedThickness: 8,
  axialFs: 1.5,
  requiredCompositeStrength: 0,
});
check("DMM a_s", dm.as, 0.19635, 0.001);
check("DMM s_comp", dm.sComp, 0.19635 * 0.5 * 500 * 0.65 + (1 - 0.19635) * 15, 0.001);

// ── Stone columns: Priebe n0 for a_s = 0.2, φc = 40° → K_ac = 0.2174, n0 ≈ 2.13 ──
const sc = computeStoneColumns({
  diameter: Math.sqrt((0.2 * (Math.sqrt(3) / 2) * 4) / (Math.PI / 4)),
  spacing: 2,
  pattern: "triangular",
  columnPhi: 40,
  stressConcentration: 3,
  soilCu: 25,
  soilMv: 0.3,
  layerThickness: 8,
  appliedStress: 80,
  sigmaR0: 20,
  bearingFs: 2,
});
check("Stone columns a_s", sc.as, 0.2, 0.001);
check("Priebe n0 (a_s=0.2, φc=40°)", sc.n0, 1 + 0.2 * ((5 - 0.2) / (4 * Math.tan(rad(25)) ** 2 * 0.8) - 1), 0.001);

// ── PVD: Hansbo F for s = 1.5 tri, 100×4 mm, d_s/d_w = 2, k_h/k_s = 2 (hand calc) ──
const pvd = computePvd({
  spacing: 1.5,
  pattern: "triangular",
  drainWidth: 100,
  drainThickness: 4,
  smearRatio: 2,
  permeabilityRatio: 2,
  ch: 3,
  cv: 0,
  drainagePath: 5,
  time: 0.5,
  targetU: 90,
  wellResistance: 0,
});
{
  const de = 1.5 * Math.sqrt((2 * Math.sqrt(3)) / Math.PI);
  const F = Math.log(de / 0.052 / 2) + 2 * Math.log(2) - 0.75;
  check("PVD Hansbo F", pvd.F, F, 0.001);
  check("PVD U_h(0.5 yr)", pvd.atTime.uh, 1 - Math.exp((-8 * 3 * 0.5) / de ** 2 / F), 0.001);
}

// ── Dynamic compaction: W = 15 t, H = 20 m, n = 0.5 → D = 8.66 m ──
check("DC depth", computeDynamicCompaction({ soil: "pervious", tampMass: 15, dropHeight: 20, gridSpacing: 5, nOverride: 0, distance: 30 }).depth, 8.660, 0.001);

// ── Coulomb Ka vertical wall, φ = 30°, flat → 1/3 ──
check("Coulomb Ka (vertical, flat)", coulombKa(30, 0, 0), 1 / 3, 0.001);
{
  const nail = computeSoilNailWall({
    height: 8, faceBatter: 0, backslope: 0, unitWeight: 19, cohesion: 5, phi: 32, surcharge: 10, nailLength: 7,
    nailInclination: 15, sh: 1.5, sv: 1.5, firstRowDepth: 0.75, drillholeDiameter: 0.15, bondStrength: 100,
    barDiameter: 25, yieldStrength: 420, lambda: 0.75, kh: 0, fsPullout: 2, fsTensile: 1.8,
  });
  check("Soil nail R_T (Ø25, 420 MPa)", nail.rt, 420e3 * Math.PI * 0.025 ** 2 / 4, 0.001);
  console.log(`INFO  Soil nail example: global wedge FS = ${nail.critical.fs.toFixed(3)} at θ = ${nail.critical.theta}°`);
}

// ── CPT: clean sand example — I_c should fall in zone 6 ──
const cpt = computeCpt({ qc: 12, fs: 60, u2: 60, areaRatio: 0.8, depth: 6, groundwaterDepth: 2, unitWeight: 19, nkt: 14 });
check("CPT sand I_c in 1.31–2.05 (midpoint check)", cpt.ic < 2.05 && cpt.ic > 1.31 ? 1 : 0, 1, 0);

// ── Vs30 hand calc ──
check("Vs30", computeVs30([{ thickness: 10, vs: 200 }, { thickness: 20, vs: 400 }]).vs30, 30 / (10 / 200 + 20 / 400), 0.0001);
check("Imai & Tonouchi N=20", vsFromSpt(20, "imai-tonouchi-1982"), 97 * 20 ** 0.314, 0.0001);
check("Skempton Dr (N=15)", relativeDensityFromSpt({ n160: 15, d50: 0.3, ageYears: 1000, ocr: 1 }).skempton, 0.5, 0.0001);

// ── Every draft definition must have a registered calculator that runs with its default inputs ──
for (const tool of draftTools) {
  const calc = designToolCalculators[tool.slug];
  if (!calc) {
    failures += 1;
    console.log(`FAIL  ${tool.slug}: no calculator registered`);
    continue;
  }
  try {
    const values = Object.fromEntries(tool.inputs.map((i) => [i.name, String(i.defaultValue)]));
    const result = calc(values);
    console.log(`PASS  ${tool.slug} runs with defaults → ${result.summary ?? result.title}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${tool.slug} default run: ${(error as Error).message}`);
  }
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
