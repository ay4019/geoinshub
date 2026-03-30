"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { incrementToolUseAction } from "@/app/actions/analytics";
import { BearingCapacityVisual } from "@/components/bearing-capacity-visual";
import { EngineeringText } from "@/components/engineering-text";
import { LiquefactionProfileTab } from "@/components/liquefaction-profile-tab";
import { LiquefactionScreeningVisual } from "@/components/liquefaction-screening-visual";
import { ModulusFromCuProfileTab } from "@/components/modulus-from-cu-profile-tab";
import { PostLiquefactionSettlementProfileTab } from "@/components/post-liquefaction-settlement-profile-tab";
import { SptProfileTab } from "@/components/spt-profile-tab";
import { StressDistributionVisual } from "@/components/stress-distribution-visual";
import { Tabs } from "@/components/tabs";
import { useToolUnitSystem } from "@/components/tool-unit-provider";
import { calculateBySlug } from "@/lib/tool-calculations";
import { getEquationDescriptions } from "@/lib/tool-equation-descriptions";
import { getEquationParameters } from "@/lib/tool-equation-parameters";
import { getEquationReferences } from "@/lib/tool-equation-references";
import type { CalculationResult, ToolDefinition, ToolInformation } from "@/lib/types";
import {
  convertInputToMetric,
  convertInputValueBetweenSystems,
  getDisplayResult,
  getDisplayUnit,
} from "@/lib/tool-units";

interface ToolCalculatorProps {
  tool: ToolDefinition;
}

type FormErrors = Record<string, string>;

const modulusFromCuGuidance = [
  {
    value: "soft-clay",
    label: "Soft clay",
    range: "100 - 200",
    recommendedRatio: 150,
  },
  {
    value: "medium-clay",
    label: "Medium clay",
    range: "200 - 400",
    recommendedRatio: 300,
  },
  {
    value: "stiff-clay",
    label: "Stiff clay",
    range: "400 - 800",
    recommendedRatio: 600,
  },
] as const;

const genericWarningMessages = new Set([
  "Simplified output only. Do not use directly for final design.",
  "Project-specific investigation, engineering judgement, and code checks remain required.",
]);

function buildLiquefactionInformation(
  baseInformation: ToolInformation,
  method: "tbdy-2018" | "idriss-boulanger-2008",
): ToolInformation {
  const layeredCriteriaTable = {
    title: "Layered Screening Criteria",
    columns: ["Condition", "Check column output", "Meaning"],
    rows: [
      [
        "Sample midpoint depth > 20 m",
        "Outside sample depth range",
        "The simplified layered pilot is intentionally limited to the upper 20 m profile interval.",
      ],
      [
        "Sample midpoint depth <= groundwater depth",
        "Above GWT",
        "The sample is above the groundwater table, so liquefaction triggering is not advanced in this quick screen.",
      ],
      [
        "(N1)60 > 30",
        "(N1)60 > 30",
        "The sample is screened out of the simplified triggering sequence because the corrected penetration resistance is already high.",
      ],
      [
        "Bottom depth <= top depth",
        "Invalid depth interval",
        "The sample interval geometry must be corrected before the tool proceeds with the calculation sequence.",
      ],
      [
        "None of the above",
        "Analysis",
        "The method-specific stress, resistance, and factor-of-safety sequence is carried out for that sample.",
      ],
    ],
    note: "The layered pilot first checks whether the sample should be screened out before it spends effort on the selected liquefaction procedure.",
  };

  if (method === "idriss-boulanger-2008") {
    return {
      ...baseInformation,
      methodology:
        "This route follows an Idriss and Boulanger (2008) SPT-based triggering workflow. The tool starts with corrected SPT resistance, applies a fines-correction increment to obtain the clean-sand equivalent resistance (N1)60,cs, forms CSR from Peak Ground Acceleration and overburden stress ratio, evaluates CRR_7.5 from the Idriss-Boulanger base curve, and then applies MSF to reach the final factor of safety.",
      assumptions: [
        "Input (N1)60 already includes the standard field, energy, and overburden corrections before the fines correction increment is added.",
        "The user-supplied Peak Ground Acceleration is treated as the representative seismic demand input at the site surface for this screening calculation.",
        "A single representative unit weight is used to estimate total and effective overburden stress at the selected sample depth.",
      ],
      limitations: [
        "This is a simplified triggering screen and not a substitute for full seismic hazard analysis, site response analysis, or performance-based geotechnical assessment.",
        "The fines correction, depth reduction factor, and magnitude scaling are simplified screening expressions and should be checked against project-specific interpretation.",
        "Settlement, lateral spreading, ejecta, and foundation-structure interaction are outside the scope of this tool.",
      ],
      equations: [
        "&Delta;N<sub>(1,60)</sub> = 0 for FC &le; 5; &Delta;N<sub>(1,60)</sub> = exp(1.63 + 9.7/(FC + 0.01) - (15.7/(FC + 0.01))<sup>2</sup>) for 5 &lt; FC &le; 35; &Delta;N<sub>(1,60)</sub> &le; 5.5",
        "(N<sub>1</sub>)<sub>60,cs</sub> = (N<sub>1</sub>)<sub>60</sub> + &Delta;N<sub>(1,60)</sub>",
        "CSR = 0.65(a<sub>max</sub>/g)(&sigma;<sub>v0</sub> / &sigma;'<sub>v0</sub>)r<sub>d</sub>",
        "CRR<sub>7.5</sub> = exp[N/14.1 + (N/126)<sup>2</sup> - (N/23.6)<sup>3</sup> + (N/25.4)<sup>4</sup> - 2.8]",
        "MSF = 6.9e<sup>-M<sub>w</sub>/4</sup> - 0.058",
        "FS = (CRR<sub>7.5</sub>MSF) / CSR",
      ],
      tables: [
        {
          title: "Idriss & Boulanger Parameter Sequence",
          columns: ["Parameter", "How it is obtained in this tool", "Why it matters"],
          rows: [
            [
              "(N1)60",
              "Entered directly by the user as the corrected SPT resistance before fines adjustment.",
              "It is the starting resistance value for the clean-sand conversion.",
            ],
            [
              "FC",
              "Entered directly by the user as fines content percentage.",
              "It controls the fines-correction increment added to the corrected SPT resistance.",
            ],
            [
              "Delta N_(1,60)",
              "Calculated from the Idriss-Boulanger fines-correction expression.",
              "It shifts the corrected SPT value to the clean-sand equivalent resistance.",
            ],
            [
              "(N1)60,cs",
              "Calculated as (N1)60 plus Delta N_(1,60).",
              "It is the resistance parameter used in the CRR_7.5 base curve.",
            ],
            [
              "CSR",
              "Calculated from PGA, total stress, effective stress, and r_d.",
              "It represents the cyclic shear-stress demand imposed by the earthquake.",
            ],
            [
              "CRR_7.5",
              "Calculated from the Idriss-Boulanger SPT resistance curve using (N1)60,cs.",
              "It is the reference liquefaction resistance for Mw 7.5 shaking.",
            ],
            [
              "MSF",
              "Calculated from earthquake magnitude M_w.",
              "It adjusts the reference resistance for magnitudes other than 7.5.",
            ],
            [
              "FS",
              "Calculated as resistance divided by demand.",
              "It is the final screening measure used to judge liquefaction potential in this route.",
            ],
          ],
          note: "In this method the key transition is from corrected SPT resistance to clean-sand equivalent resistance before the CRR base curve is used.",
        },
        layeredCriteriaTable,
      ],
      references: [
        "Idriss, I.M. and Boulanger, R.W. (2008). Soil Liquefaction During Earthquakes. Earthquake Engineering Research Institute (EERI).",
        "Boulanger, R.W. and Idriss, I.M. (2014). CPT and SPT Based Liquefaction Triggering Procedures. Center for Geotechnical Modeling, UC Davis.",
        "FHWA NHI-11-032 and FHWA NHI-11-033. Geotechnical Earthquake Engineering for Highways Manual.",
      ],
    };
  }

  return {
    ...baseInformation,
    methodology:
      "This route follows the TBDY 2018 SPT-based liquefaction screening procedure, which was published in 2018 and came into force on 1 January 2019. The tool starts with corrected SPT resistance, applies alpha and beta fines-correction factors to obtain (N1)60f, evaluates the simplified CRR_7.5 resistance expression, applies the magnitude factor C_M, and compares resistance stress with earthquake-induced cyclic shear stress.",
    assumptions: [
      "Input (N1)60 is already corrected for field procedure, energy, and overburden before the TBDY fines-adjustment step is applied.",
      "The shared Peak Ground Acceleration input is interpreted in this tool as the simplified PGA demand term noted as 0.4SDS in the label.",
      "A single representative unit weight is used to estimate total and effective vertical stresses at the sample depth.",
    ],
    limitations: [
      "This is a screening implementation of the TBDY procedure rather than a full project-specific seismic geotechnical verification.",
      "The simplified r_d, alpha-beta fines adjustment, and C_M expressions should be checked against the project documentation and engineering judgement before design use.",
      "Ground deformations, post-liquefaction settlement, lateral spreading, and structural consequences are not covered here.",
    ],
    equations: [
      "&alpha; = 0, &beta; = 1 for FC &le; 5; &alpha; = e<sup>(1.76 - 190 / FC<sup>2</sup>)</sup>, &beta; = 0.99 + FC<sup>1.5</sup> / 1000 for 5 &lt; FC &le; 35; &alpha; = 5, &beta; = 1.2 for FC &gt; 35",
      "(N<sub>1</sub>)<sub>60f</sub> = &alpha; + &beta;(N<sub>1</sub>)<sub>60</sub>",
      "CRR<sub>M7.5</sub> = 1 / (34 - N) + N / 135 + 50 / (10N + 45)<sup>2</sup> - 1 / 200",
      "C<sub>M</sub> = 10<sup>2.24</sup> / M<sub>w</sub><sup>2.56</sup>",
      "r<sub>d</sub> = 1 - 0.00765z for z &le; 9.15 m; r<sub>d</sub> = 1.174 - 0.0267z for 9.15 &lt; z &le; 23 m; r<sub>d</sub> = 0.744 - 0.008z for 23 &lt; z &le; 30 m",
      "&tau;<sub>R</sub> = CRR<sub>M7.5</sub>C<sub>M</sub>&sigma;'<sub>v0</sub>",
      "&tau;<sub>eq</sub> = 0.65&sigma;<sub>v0</sub>PGA r<sub>d</sub>",
      "FS = &tau;<sub>R</sub> / &tau;<sub>eq</sub>",
    ],
    tables: [
      {
        title: "TBDY 2018 Parameter Sequence",
        columns: ["Parameter", "How it is obtained in this tool", "Why it matters"],
        rows: [
          [
            "(N1)60",
            "Entered directly by the user as corrected SPT resistance before fines adjustment.",
            "It is the starting resistance value for the TBDY fines-adjustment step.",
          ],
          [
            "FC",
            "Entered directly by the user as fines content percentage.",
            "It controls the alpha and beta values used to calculate (N1)60f.",
          ],
          [
            "alpha and beta",
            "Calculated automatically from the selected fines-content range.",
            "They define how strongly fines content shifts the corrected SPT resistance.",
          ],
          [
            "(N1)60f",
            "Calculated from alpha, beta, and the entered corrected SPT resistance.",
            "It is the resistance parameter used in the simplified CRR_M7.5 expression.",
          ],
          [
            "CRR_M7.5",
            "Calculated from the simplified TBDY-style resistance expression using (N1)60f.",
            "It is the reference resistance at magnitude 7.5.",
          ],
          [
            "C_M",
            "Calculated from earthquake magnitude M_w.",
            "It adjusts the resistance side for magnitudes other than the 7.5 reference condition.",
          ],
          [
            "tau_R and tau_eq",
            "Calculated from corrected resistance, overburden stress, PGA, and r_d.",
            "They provide the resistance-versus-demand stress comparison used in the final screening step.",
          ],
          [
            "FS",
            "Calculated as tau_R divided by tau_eq.",
            "It is the final screening measure used to judge liquefaction potential in this route.",
          ],
        ],
        note: "In this method the key transition is from corrected SPT resistance to fines-adjusted (N1)60f before the CRR expression is used.",
      },
      layeredCriteriaTable,
    ],
    references: [
      "AFAD (2018). Turkiye Bina Deprem Yonetmeligi (TBDY 2018). Official regulation published in 2018 and in force since 1 January 2019.",
      "Youd, T.L. et al. (2001). Liquefaction resistance of soils: Summary report from the 1996 NCEER and 1998 NCEER/NSF workshops. Journal of Geotechnical and Geoenvironmental Engineering, ASCE, 127(10), 817-833.",
      "FHWA NHI-11-032 and FHWA NHI-11-033. Geotechnical Earthquake Engineering for Highways Manual.",
    ],
  };
}

function toInitialValues(tool: ToolDefinition): Record<string, string> {
  return tool.inputs.reduce<Record<string, string>>((acc, input) => {
    acc[input.name] = String(input.defaultValue);
    return acc;
  }, {});
}

function EquationBlock({ html }: { html: string }) {
  return (
    <li
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-serif text-[15px] text-slate-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ToolCalculator({ tool }: ToolCalculatorProps) {
  const { unitSystem } = useToolUnitSystem();
  const [activeTab, setActiveTab] = useState("calculation");
  const [formValues, setFormValues] = useState<Record<string, string>>(() => toInitialValues(tool));
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const previousUnitSystem = useRef(unitSystem);

  const disclaimer = useMemo(
    () =>
      tool.information.disclaimer ||
      "Results are indicative only and not suitable as stand-alone final engineering design.",
    [tool.information.disclaimer],
  );
  const showBearingVisual =
    tool.slug === "traditional-bearing-capacity-methods" || tool.slug === "eurocode-7-bearing-resistance";
  const showStressDistributionVisual = tool.slug === "stress-distribution-21";
  const isModulusFromCu = tool.slug === "modulus-from-cu";
  const isSptCorrections = tool.slug === "spt-corrections";
  const isLiquefactionScreening = tool.slug === "seed-idriss-liquefaction-screening";
  const isPostLiquefactionSettlement = tool.slug === "post-liquefaction-settlement";
  const liquefactionMethod =
    isLiquefactionScreening && formValues.method === "idriss-boulanger-2008"
      ? "idriss-boulanger-2008"
      : "tbdy-2018";
  const effectiveInformation = useMemo(() => {
    if (!isLiquefactionScreening) {
      return tool.information;
    }
    return buildLiquefactionInformation(tool.information, liquefactionMethod);
  }, [isLiquefactionScreening, liquefactionMethod, tool.information]);
  const displayResult = useMemo(() => getDisplayResult(tool, result, unitSystem), [tool, result, unitSystem]);
  const equationDescriptions = useMemo(
    () =>
      getEquationDescriptions(
        isLiquefactionScreening ? `${tool.slug}:${liquefactionMethod}` : tool.slug,
        effectiveInformation.equations.length,
      ),
    [effectiveInformation.equations.length, isLiquefactionScreening, liquefactionMethod, tool.slug],
  );
  const equationReferences = useMemo(
    () =>
      getEquationReferences(
        isLiquefactionScreening ? `${tool.slug}:${liquefactionMethod}` : tool.slug,
        effectiveInformation.equations.length,
        effectiveInformation.references,
      ),
    [effectiveInformation.equations.length, effectiveInformation.references, isLiquefactionScreening, liquefactionMethod, tool.slug],
  );
  const visibleWarnings = useMemo(
    () => displayResult?.warnings.filter((warning) => !genericWarningMessages.has(warning)) ?? [],
    [displayResult],
  );
  const selectedModulusFromCuRow =
    modulusFromCuGuidance.find((item) => item.value === (formValues.soilClass ?? "stiff-clay")) ??
    modulusFromCuGuidance[2];
  const isAutoRatioMode = (formValues.manualRatioMode ?? "auto") === "auto";
  const recommendedModulusFromCuRatio = String(selectedModulusFromCuRow.recommendedRatio);

  useEffect(() => {
    if (previousUnitSystem.current === unitSystem) {
      return;
    }

    setFormValues((current) =>
      tool.inputs.reduce<Record<string, string>>((acc, input) => {
        const rawValue = current[input.name] ?? "";
        acc[input.name] =
          input.type === "number"
            ? convertInputValueBetweenSystems(rawValue, input.unit, previousUnitSystem.current, unitSystem)
            : rawValue;
        return acc;
      }, {}),
    );

    previousUnitSystem.current = unitSystem;
  }, [tool.inputs, unitSystem]);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    for (const input of tool.inputs) {
      const raw =
        isModulusFromCu && input.name === "ratio" && isAutoRatioMode
          ? recommendedModulusFromCuRatio
          : formValues[input.name]?.trim();
      if (!raw) {
        nextErrors[input.name] = "This field is required.";
        continue;
      }

      if (input.type === "number") {
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          nextErrors[input.name] = "Enter a valid number.";
          continue;
        }

        if (typeof input.min === "number" && value < input.min) {
          nextErrors[input.name] = `Value must be at least ${input.min}.`;
          continue;
        }

        if (typeof input.max === "number" && value > input.max) {
          nextErrors[input.name] = `Value must be at most ${input.max}.`;
        }
      }
    }

    return nextErrors;
  };

  const handleCalculate = () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setGlobalError(null);

    if (Object.keys(nextErrors).length > 0) {
      setResult(null);
      return;
    }

    try {
      const metricValues = tool.inputs.reduce<Record<string, string>>((acc, input) => {
        const rawValue =
          isModulusFromCu && input.name === "ratio" && isAutoRatioMode
            ? recommendedModulusFromCuRatio
            : (formValues[input.name] ?? "");

        if (input.type === "number") {
          const numericValue = Number(rawValue);
          acc[input.name] = Number.isFinite(numericValue)
            ? String(convertInputToMetric(numericValue, input.unit, unitSystem))
            : rawValue;
          return acc;
        }

        acc[input.name] = rawValue;
        return acc;
      }, {});

      const calculated = calculateBySlug(tool.slug, metricValues);
      setResult(calculated);

      startTransition(() => {
        void incrementToolUseAction(tool.slug);
      });
    } catch (error) {
      setResult(null);
      setGlobalError(error instanceof Error ? error.message : "Calculation failed. Please check inputs.");
    }
  };

  return (
    <div className="space-y-5">
      <Tabs
        tabs={[
          { id: "calculation", label: "Calculation" },
          ...(isModulusFromCu ? [{ id: "profile", label: "Soil Profile Pilot" }] : []),
          ...(isSptCorrections ? [{ id: "profile", label: "Soil Profile Pilot" }] : []),
          ...(isLiquefactionScreening ? [{ id: "profile", label: "Layered Samples Pilot" }] : []),
          ...(isPostLiquefactionSettlement ? [{ id: "profile", label: "Layered Samples Pilot" }] : []),
          { id: "information", label: "Information" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "calculation" ? (
        <section className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Inputs</h2>
              <p className="mt-1 text-sm text-slate-600">Enter values and run the calculator.</p>
              <div className="mt-4 space-y-4">
                {tool.inputs.map((input) => {
                  const id = `input-${input.name}`;
                  const isAutoRatioField = isModulusFromCu && input.name === "ratio" && isAutoRatioMode;
                  const displayLabel =
                    isLiquefactionScreening && input.name === "peakGroundAcceleration"
                      ? liquefactionMethod === "tbdy-2018"
                        ? "Peak Ground Acceleration, PGA (0.4SDS)"
                        : "Peak Ground Acceleration, PGA"
                      : input.label;
                  return (
                    <div key={input.name}>
                      <label
                        htmlFor={id}
                        className="mb-1 flex max-w-full items-baseline gap-1 overflow-x-auto whitespace-nowrap text-sm font-medium text-slate-700"
                      >
                        <span className="shrink-0">
                          <EngineeringText text={displayLabel} />
                        </span>
                        {input.unit ? (
                          <span className="shrink-0 whitespace-nowrap text-slate-500">
                            ({getDisplayUnit(input.unit, unitSystem)})
                          </span>
                        ) : null}
                      </label>
                      {input.type === "select" ? (
                        <select
                          id={id}
                          value={formValues[input.name] ?? ""}
                          onChange={(event) => {
                            if (isLiquefactionScreening && input.name === "method") {
                              setResult(null);
                              setGlobalError(null);
                            }

                            setFormValues((current) => ({
                              ...current,
                              ...(isModulusFromCu &&
                              input.name === "manualRatioMode" &&
                              event.target.value === "manual" &&
                              current.manualRatioMode !== "manual"
                                ? { ratio: recommendedModulusFromCuRatio }
                                : {}),
                              [input.name]: event.target.value,
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                        >
                          {(input.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={id}
                          type="number"
                          min={input.min}
                          max={input.max}
                          step={input.step ?? "any"}
                          placeholder={input.placeholder}
                          value={isAutoRatioField ? recommendedModulusFromCuRatio : (formValues[input.name] ?? "")}
                          disabled={isAutoRatioField}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              [input.name]: event.target.value,
                            }))
                          }
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 ${
                            isAutoRatioField
                              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
                              : "border-slate-300 bg-white focus:border-slate-500"
                          }`}
                        />
                      )}
                      {errors[input.name] ? <p className="mt-1 text-xs text-red-700">{errors[input.name]}</p> : null}
                      {isAutoRatioField ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Auto-filled from the selected soil class. Switch to manual override to edit.
                        </p>
                      ) : null}
                    </div>
                  );
                })}

                {isModulusFromCu ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Suggested E/c<sub>u</sub> Ratio Table
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Select a soil class to auto-fill a mid-range E/c<sub>u</sub> ratio, or switch to manual
                          override if you already have a project-specific value.
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        Active auto-fill:{" "}
                        <span className="font-semibold text-slate-900">{selectedModulusFromCuRow.recommendedRatio}</span>
                      </p>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Soil class</th>
                            <th className="px-3 py-2 font-semibold">Suggested E/c<sub>u</sub> range</th>
                            <th className="px-3 py-2 font-semibold">Auto-filled value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modulusFromCuGuidance.map((item) => {
                            const isSelected = item.value === selectedModulusFromCuRow.value;
                            return (
                              <tr
                                key={item.value}
                                className={`border-t border-slate-200 ${isSelected ? "bg-blue-50/70" : "bg-white"}`}
                              >
                                <td className="px-3 py-2 font-medium text-slate-800">{item.label}</td>
                                <td className="px-3 py-2 text-slate-600">{item.range}</td>
                                <td className="px-3 py-2 font-semibold text-slate-900">{item.recommendedRatio}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Auto mode uses the mid-point of the selected range as a screening value. Manual mode keeps the
                      table for reference but lets you enter your own ratio.
                    </p>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={handleCalculate} className="btn-base btn-md mt-6" disabled={isPending}>
                {isPending ? "Calculating..." : "Calculate"}
              </button>
              {globalError ? <p className="mt-3 text-sm text-red-700">{globalError}</p> : null}
            </div>

            <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Results</h2>
              {!displayResult ? (
                <p className="mt-3 text-sm text-slate-600">Run the calculation to view results.</p>
              ) : (
                <div className="mt-3 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{displayResult.title}</p>
                    {displayResult.summary ? (
                      <p className="mt-1 text-sm text-slate-600">
                        <EngineeringText text={displayResult.summary} />
                      </p>
                    ) : null}
                  </div>

                  <dl className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {displayResult.items.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                        <dt className="text-slate-700">
                          <EngineeringText text={item.label} />
                        </dt>
                        <dd className="font-semibold text-slate-900">
                          {item.value}
                          {item.unit ? ` ${item.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {displayResult.notes.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Notes</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {displayResult.notes.map((note, index) => (
                          <li key={`${note}-${index}`}>
                            <EngineeringText text={note} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {visibleWarnings.length ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-semibold">Important caveat</p>
                      <ul className="mt-1 space-y-1">
                        {visibleWarnings.map((warning, index) => (
                          <li key={`${warning}-${index}`}>
                            <EngineeringText text={warning} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </aside>
          </div>

          {showBearingVisual ? <BearingCapacityVisual values={formValues} unitSystem={unitSystem} title={tool.title} /> : null}
          {showStressDistributionVisual ? <StressDistributionVisual values={formValues} unitSystem={unitSystem} /> : null}
          {isLiquefactionScreening ? (
            <LiquefactionScreeningVisual values={formValues} result={displayResult} unitSystem={unitSystem} />
          ) : null}
        </section>
      ) : activeTab === "profile" && isModulusFromCu ? (
        <ModulusFromCuProfileTab unitSystem={unitSystem} />
      ) : activeTab === "profile" && isSptCorrections ? (
        <SptProfileTab unitSystem={unitSystem} />
      ) : activeTab === "profile" && isLiquefactionScreening ? (
        <LiquefactionProfileTab unitSystem={unitSystem} initialMethod={liquefactionMethod} />
      ) : activeTab === "profile" && isPostLiquefactionSettlement ? (
        <PostLiquefactionSettlementProfileTab unitSystem={unitSystem} />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {isLiquefactionScreening ? (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Information method</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Select the liquefaction method to view the matching equations, parameter derivation notes, and references.
                  </p>
                </div>
                <div className="w-full sm:w-[340px]">
                  <label htmlFor="liquefaction-information-method" className="mb-1 block text-sm font-medium text-slate-700">
                    Liquefaction method
                  </label>
                  <select
                    id="liquefaction-information-method"
                    value={formValues.method ?? "idriss-boulanger-2008"}
                    onChange={(event) => {
                      setResult(null);
                      setGlobalError(null);
                      setFormValues((current) => ({
                        ...current,
                        method: event.target.value,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  >
                    <option value="idriss-boulanger-2008">Idriss &amp; Boulanger (2008)</option>
                    <option value="tbdy-2018">TBDY 2018 (in force since 1 Jan 2019)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          <h2 className="text-lg font-semibold text-slate-900">Methodology</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            <EngineeringText text={effectiveInformation.methodology} />
          </p>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Assumptions</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {effectiveInformation.assumptions.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2">
                    <span aria-hidden="true" className="text-slate-400">
                      -
                    </span>
                    <EngineeringText text={item} />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Limitations</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {effectiveInformation.limitations.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2">
                    <span aria-hidden="true" className="text-slate-400">
                      -
                    </span>
                    <EngineeringText text={item} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Equations</h3>
            <div className="mt-2 space-y-3">
              {effectiveInformation.equations.map((item, index) => (
                <div key={`${tool.slug}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <ul className="text-sm text-slate-700">
                    <EquationBlock html={item} />
                  </ul>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    <EngineeringText text={equationDescriptions[index]} />
                  </p>
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Where</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {getEquationParameters(item).map((parameter) => (
                        <li key={`${item}-${parameter}`} className="flex gap-2">
                          <span aria-hidden="true" className="text-slate-400">
                            -
                          </span>
                          <EngineeringText text={parameter} />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Source</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {equationReferences[index].map((reference, refIndex) => (
                        <li key={`${tool.slug}-${index}-${refIndex}`} className="flex gap-2">
                          <span aria-hidden="true" className="text-slate-400">
                            -
                          </span>
                          <EngineeringText text={reference} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {effectiveInformation.tables?.length ? (
            <div className="mt-5 space-y-4">
              {effectiveInformation.tables.map((table) => (
                <div key={table.title} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="border-b border-slate-200 bg-white px-4 py-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">{table.title}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100">
                          {table.columns.map((column) => (
                            <th key={column} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                              <EngineeringText text={column} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, rowIndex) => (
                          <tr key={`${table.title}-${rowIndex}`} className="border-b border-slate-200 last:border-b-0">
                            {row.map((cell, cellIndex) => (
                              <td key={`${table.title}-${rowIndex}-${cellIndex}`} className="px-4 py-3 align-top">
                                <EngineeringText text={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {table.note ? (
                    <p className="border-t border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                      <EngineeringText text={table.note} />
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">References</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {effectiveInformation.references.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span aria-hidden="true" className="text-slate-400">
                    -
                  </span>
                  <EngineeringText text={item} />
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Design disclaimer</p>
            <p className="mt-1">
              <EngineeringText text={disclaimer} />
            </p>
          </div>
        </section>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Important disclaimer</p>
        <p className="mt-1">
          These results are simplified and indicative only. Please review the site-wide{" "}
          <Link href="/disclaimer" className="font-semibold underline underline-offset-2 transition-colors hover:text-amber-950">
            Disclaimer
          </Link>{" "}
          before using this tool in any engineering workflow.
        </p>
      </div>
    </div>
  );
}
