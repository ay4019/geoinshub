"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { incrementToolUseAction } from "@/app/actions/analytics";
import { useSubscription } from "@/components/subscription-context";
import { BearingCapacityVisual } from "@/components/bearing-capacity-visual";
import { CprimeFromCuProfileTab } from "@/components/cprime-from-cu-profile-tab";
import { CuProfileReportTab, type CuProfileReportPoint } from "@/components/cu-profile-report-tab";
import { CuFromPressuremeterProfileTab } from "@/components/cu-from-pressuremeter-profile-tab";
import { CuFromSptProfileTab } from "@/components/cu-from-spt-profile-tab";
import { EarthPressureProfileTab } from "@/components/earth-pressure-profile-tab";
import { EprimeFromEuProfileTab } from "@/components/eprime-from-eu-profile-tab";
import { EngineeringText } from "@/components/engineering-text";
import { EoedProfileTab } from "@/components/eoed-profile-tab";
import { EprimeFromSptCohesionlessProfileTab } from "@/components/eprime-from-spt-cohesionless-profile-tab";
import { EuFromSptProfileTab } from "@/components/eu-from-spt-profile-tab";
import { FrictionAngleFromPiProfileTab } from "@/components/friction-angle-from-pi-profile-tab";
import { GmaxProfileTab } from "@/components/gmax-profile-tab";
import { IntegratedSettlementProfileTab } from "@/components/integrated-settlement-profile-tab";
import { FrictionAngleProfileTab } from "@/components/friction-angle-profile-tab";
import { LiquefactionProfileTab } from "@/components/liquefaction-profile-tab";
import { LiquefactionScreeningVisual } from "@/components/liquefaction-screening-visual";
import { ModulusFromCuProfileTab } from "@/components/modulus-from-cu-profile-tab";
import { OcrProfileTab } from "@/components/ocr-profile-tab";
import { PostLiquefactionSettlementProfileTab } from "@/components/post-liquefaction-settlement-profile-tab";
import { SptProfileTab } from "@/components/spt-profile-tab";
import { StressDistributionVisual } from "@/components/stress-distribution-visual";
import { Tabs } from "@/components/tabs";
import { useToolUnitSystem } from "@/components/tool-unit-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { tierAllowsReports } from "@/lib/subscription";
import { calculateBySlug } from "@/lib/tool-calculations";
import { getEquationDescriptions } from "@/lib/tool-equation-descriptions";
import { getEquationParameters } from "@/lib/tool-equation-parameters";
import {
  getActiveImportBoreholes,
  readActiveProjectBorehole,
  type ActiveProjectBorehole,
  type SelectedBoreholeSummary,
} from "@/lib/project-boreholes";
import { syncProjectParametersForResult } from "@/lib/project-parameters";
import type { CalculationResult, ToolDefinition, ToolInformation, UnitSystem } from "@/lib/types";
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

const PROFILE_FIRST_TOOL_SLUGS = new Set([
  "modulus-from-cu",
  "spt-corrections",
  "gmax-from-vs",
  "eoed-from-mv",
  "eu-from-spt-butler-1975",
  "eprime-from-spt-cohesionless",
  "effective-modulus-eprime-cohesive",
  "ocr-calculator",
  "cu-from-pi-and-spt",
  "cprime-from-cu",
  "cu-from-pressuremeter",
  "friction-angle-from-spt",
  "friction-angle-from-pi",
  "k0-earth-pressure",
  "seed-idriss-liquefaction-screening",
  "post-liquefaction-settlement",
  "integrated-settlement-analysis",
]);

const SITE_CHARACTERIZATION_CATEGORIES = new Set([
  "Mechanical Tools",
  "Rigidity / Deformation Tools",
  "Stress Related Tools",
]);

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

const SAVED_ANALYSIS_STORAGE_KEY = "gih:load-saved-analysis";

interface SavedAnalysisEnvelope {
  id?: string;
  toolSlug?: string;
  unitSystem?: UnitSystem | null;
  payload?: unknown;
}

interface ActiveProjectParameter {
  boreholeLabel: string;
  sampleDepth: number | null;
  parameterCode: string;
  value: number;
  createdAt: string | null;
  sourceToolSlug: string | null;
}

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

function depthKey(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "na";
}

function isUnitSystemValue(value: unknown): value is UnitSystem {
  return value === "metric" || value === "american";
}

function isCalculationResultPayload(value: unknown): value is CalculationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CalculationResult>;
  return typeof candidate.title === "string" && Array.isArray(candidate.items);
}

function buildLiquefactionInformation(
  baseInformation: ToolInformation,
  method: "tbdy-2018" | "idriss-boulanger-2008",
): ToolInformation {
  const layeredCriteriaTable = {
    title: "Layered Screening Criteria",
    columns: ["Condition", "Check column output", "Meaning"],
    rows: [
      [
        "Sample depth > 20 m",
        "Outside sample depth range",
        "The simplified layered plot is intentionally limited to the upper 20 m profile interval.",
      ],
      [
        "Sample depth <= groundwater depth",
        "Above GWT",
        "The sample is above the groundwater table, so liquefaction triggering is not advanced in this quick screen.",
      ],
      [
        "(N1)60 > 30",
        "(N1)60 > 30",
        "The sample is screened out of the simplified triggering sequence because the corrected penetration resistance is already high.",
      ],
      [
        "Sample depth is missing, zero, or not a number",
        "Invalid sample depth",
        "Enter a positive sample depth before the tool proceeds with the calculation sequence.",
      ],
      [
        "None of the above",
        "Analysis",
        "The method-specific stress, resistance, and factor-of-safety sequence is carried out for that sample.",
      ],
    ],
    note: "The layered Plot first checks whether the sample should be screened out before it spends effort on the selected liquefaction procedure.",
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
  const { unitSystem, setUnitSystem } = useToolUnitSystem();
  const { tier: subscriptionTier, loading: subscriptionLoading } = useSubscription();
  const reportsAllowed = tierAllowsReports(subscriptionTier);
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const hasProfileTab = PROFILE_FIRST_TOOL_SLUGS.has(tool.slug);
  const hideCalculationTab = tool.category === "Settlement";
  const defaultTab = hideCalculationTab
    ? hasProfileTab
      ? "profile"
      : "information"
    : hasProfileTab
      ? "profile"
      : "calculation";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => toInitialValues(tool));
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cuProfileReportData, setCuProfileReportData] = useState<{
    depthUnit: string;
    stressUnit: string;
    points: CuProfileReportPoint[];
    tableRows: Array<Record<string, string>>;
    plotImageDataUrl: string | null;
  } | null>(null);
  const [genericProfileReportData, setGenericProfileReportData] = useState<{
    columns: Array<{ header: string; key: string }>;
    rows: Array<Record<string, string>>;
    plotImageDataUrl: string | null;
  } | null>(null);
  const previousUnitSystem = useRef(unitSystem);
  const profileContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeProjectBorehole, setActiveProjectBorehole] = useState<ActiveProjectBorehole | null>(null);
  const [activeProjectParameters, setActiveProjectParameters] = useState<ActiveProjectParameter[]>([]);
  const [isSavingProfileSnapshot, setIsSavingProfileSnapshot] = useState(false);
  const [profileSnapshotMessage, setProfileSnapshotMessage] = useState<string | null>(null);
  const [profileSnapshotMessageType, setProfileSnapshotMessageType] = useState<"ok" | "error">("ok");
  const [savedAnalysisMessage, setSavedAnalysisMessage] = useState<string | null>(null);
  const [savedAnalysisMessageType, setSavedAnalysisMessageType] = useState<"ok" | "error">("ok");

  const disclaimer = useMemo(
    () =>
      tool.information.disclaimer ||
      "Results are indicative only and not suitable as stand-alone final engineering design.",
    [tool.information.disclaimer],
  );
  const showBearingVisual =
    tool.slug === "traditional-bearing-capacity-methods" || tool.slug === "eurocode-7-bearing-resistance";
  const showStressDistributionVisual = tool.slug === "stress-distribution-21";
  const activeImportBoreholes = useMemo<SelectedBoreholeSummary[]>(
    () => getActiveImportBoreholes(activeProjectBorehole),
    [activeProjectBorehole],
  );
  /** Remount profile tabs when project selection is cleared so imported row state does not stick. */
  const profileProjectImportKey = activeProjectBorehole?.projectId ?? "no-active-project";
  const isModulusFromCu = tool.slug === "modulus-from-cu";
  const isSptCorrections = tool.slug === "spt-corrections";
  const isGmaxFromVs = tool.slug === "gmax-from-vs";
  const isEoedFromMv = tool.slug === "eoed-from-mv";
  const isEuFromSpt = tool.slug === "eu-from-spt-butler-1975";
  const isEprimeFromSptCohesionless = tool.slug === "eprime-from-spt-cohesionless";
  const isEprimeFromEuCohesive = tool.slug === "effective-modulus-eprime-cohesive";
  const isOcrCalculator = tool.slug === "ocr-calculator";
  const isCuFromPiAndSpt = tool.slug === "cu-from-pi-and-spt";
  const isCprimeFromCu = tool.slug === "cprime-from-cu";
  const isCuFromPressuremeter = tool.slug === "cu-from-pressuremeter";
  const isFrictionAngleFromSpt = tool.slug === "friction-angle-from-spt";
  const isFrictionAngleFromPi = tool.slug === "friction-angle-from-pi";
  const isEarthPressureCoefficients = tool.slug === "k0-earth-pressure";
  const isLiquefactionScreening = tool.slug === "seed-idriss-liquefaction-screening";
  const isPostLiquefactionSettlement = tool.slug === "post-liquefaction-settlement";
  const isIntegratedSettlement = tool.slug === "integrated-settlement-analysis";
  const isSiteCharacterizationTool = SITE_CHARACTERIZATION_CATEGORIES.has(tool.category);
  const isProjectIndependentTool = tool.category === "Bearing Capacity" || tool.category === "Settlement";
  const canUseProjectIntegration = !isProjectIndependentTool;
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
  const visibleWarnings = useMemo(
    () => displayResult?.warnings.filter((warning) => !genericWarningMessages.has(warning)) ?? [],
    [displayResult],
  );
  const selectedModulusFromCuRow =
    modulusFromCuGuidance.find((item) => item.value === (formValues.soilClass ?? "stiff-clay")) ??
    modulusFromCuGuidance[2];
  const isAutoRatioMode = (formValues.manualRatioMode ?? "auto") === "auto";
  const recommendedModulusFromCuRatio = String(selectedModulusFromCuRow.recommendedRatio);

  const getControlValue = (control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
    if (control instanceof HTMLInputElement) {
      if (control.type === "checkbox" || control.type === "radio") {
        return control.checked ? "true" : "false";
      }
      return control.value ?? "";
    }
    return control.value ?? "";
  };

  const getTableControlLabel = (
    control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  ): string => {
    const table = control.closest("table");
    const row = control.closest("tr");
    const cell = control.closest("td,th");
    if (!table || !row || !cell) {
      return "";
    }

    const rowElement = row as HTMLTableRowElement;
    const cellElement = cell as HTMLTableCellElement;
    const cellIndex = Array.from(rowElement.cells).indexOf(cellElement);
    if (cellIndex < 0) {
      return "";
    }

    const headerCell =
      (table.querySelector(`thead tr:last-child th:nth-child(${cellIndex + 1})`) as HTMLElement | null) ??
      (table.querySelector(`thead tr:last-child td:nth-child(${cellIndex + 1})`) as HTMLElement | null);

    const headerText = headerCell?.innerText?.replace(/\s+/g, " ").trim() ?? "";
    const firstCellText = rowElement.cells[0]?.innerText?.replace(/\s+/g, " ").trim() ?? "";
    const rowGroup = firstCellText && firstCellText !== headerText ? firstCellText : "";

    const rowParent = rowElement.parentElement;
    const rowIndex =
      rowParent
        ? Array.from(rowParent.children)
            .filter((child) => child.tagName.toLowerCase() === "tr")
            .indexOf(rowElement) + 1
        : 0;

    if (headerText && rowGroup) {
      return `${headerText} (${rowGroup})`;
    }

    if (headerText && rowIndex > 0) {
      return `${headerText} (row ${rowIndex})`;
    }

    if (rowGroup) {
      return `Profile field (${rowGroup})`;
    }

    if (rowIndex > 0) {
      return `Profile field (row ${rowIndex})`;
    }

    return "";
  };

  const collectProfileInputsSnapshot = () => {
    const root = profileContainerRef.current;
    if (!root) {
      return [];
    }

    const controls = Array.from(
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"),
    ).filter((control) => {
      if (control instanceof HTMLInputElement) {
        return !["button", "submit", "hidden"].includes(control.type);
      }
      return true;
    });

    return controls.map((control, index) => {
      const id = control.id || "";
      const name = control.getAttribute("name") || "";
      const type = control instanceof HTMLInputElement ? control.type : control.tagName.toLowerCase();
      const labelFromFor = id
        ? (root.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`) as HTMLLabelElement | null)?.innerText
        : "";
      const labelFromClosest = control.closest("label")?.innerText ?? "";
      const labelFromTable = getTableControlLabel(control);
      const label =
        labelFromFor?.trim() ||
        labelFromClosest?.trim() ||
        labelFromTable ||
        control.getAttribute("aria-label") ||
        control.getAttribute("placeholder") ||
        name ||
        id ||
        `field-${index + 1}`;

      return {
        label,
        id,
        name,
        type,
        value: getControlValue(control),
      };
    });
  };

  const collectProfileTablesSnapshot = () => {
    const root = profileContainerRef.current;
    if (!root) {
      return [];
    }

    const getTableCellValue = (cell: HTMLTableCellElement) => {
      const control = cell.querySelector("input, select, textarea") as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (control) {
        if (control instanceof HTMLSelectElement) {
          const selectedText = control.selectedOptions?.[0]?.textContent?.replace(/\s+/g, " ").trim() ?? "";
          return selectedText || control.value?.trim() || "";
        }
        if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
          return control.checked ? "1" : "0";
        }
        return (control.value ?? "").replace(/\s+/g, " ").trim();
      }
      return cell.textContent?.replace(/\s+/g, " ").trim() ?? "";
    };

    const tables = Array.from(root.querySelectorAll<HTMLTableElement>("table"));
    return tables
      .map((table, index) => {
        const headerRow = Array.from(table.querySelectorAll("thead tr")).pop() ?? table.querySelector("tr");
        const headers = headerRow
          ? Array.from(headerRow.querySelectorAll("th,td"))
              .map((cell) => getTableCellValue(cell as HTMLTableCellElement))
              .filter(Boolean)
          : [];

        const bodyRows = Array.from(table.querySelectorAll("tbody tr")).map((row) =>
          Array.from(row.querySelectorAll("td,th")).map((cell) => getTableCellValue(cell as HTMLTableCellElement)),
        );

        const rows = bodyRows.filter((row) => row.some((cell) => cell));
        if (!headers.length || !rows.length) {
          return null;
        }

        const wrapper = table.closest("section,article,div");
        const title =
          wrapper?.querySelector("h2,h3,h4")?.textContent?.replace(/\s+/g, " ").trim() || `Profile Table ${index + 1}`;

        return {
          title,
          headers,
          rows,
        };
      })
      .filter((item): item is { title: string; headers: string[]; rows: string[][] } => Boolean(item));
  };

  const svgToPngDataUrl = async (svg: SVGSVGElement): Promise<string | null> => {
    try {
      const rect = svg.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || 900));
      const height = Math.max(1, Math.round(rect.height || 500));
      const scale = 3;
      if (width < 120 || height < 100) {
        return null;
      }

      const serialized = new XMLSerializer().serializeToString(svg);
      const source = serialized.includes("xmlns=")
        ? serialized
        : serialized.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const image = new window.Image();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas context is not available."));
              return;
            }
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL("image/png"));
          } catch (error) {
            reject(error instanceof Error ? error : new Error("Failed to rasterize SVG."));
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load SVG image."));
        };
        image.src = url;
      });

      return dataUrl;
    } catch {
      return null;
    }
  };

  const collectProfilePlotsSnapshot = async () => {
    const root = profileContainerRef.current;
    if (!root) {
      return [];
    }

    const snapshots: Array<{
      kind: "svg" | "canvas";
      title: string;
      width: number;
      height: number;
      dataUrl: string;
    }> = [];

    const svgNodes = Array.from(root.querySelectorAll<SVGSVGElement>("svg"));
    for (const svg of svgNodes) {
      if (snapshots.length >= 12) {
        break;
      }
      const rect = svg.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 100) {
        continue;
      }
      const pngDataUrl = await svgToPngDataUrl(svg);
      if (!pngDataUrl) {
        continue;
      }
      snapshots.push({
        kind: "svg",
        title: svg.getAttribute("aria-label") || svg.getAttribute("data-title") || "Profile plot",
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        dataUrl: pngDataUrl,
      });
    }

    const canvasNodes = Array.from(root.querySelectorAll<HTMLCanvasElement>("canvas"));
    for (const canvas of canvasNodes) {
      if (snapshots.length >= 12) {
        break;
      }
      if (canvas.width < 120 || canvas.height < 100) {
        continue;
      }
      let dataUrl = "";
      try {
        dataUrl = canvas.toDataURL("image/png");
      } catch {
        dataUrl = "";
      }
      if (!dataUrl) {
        continue;
      }
      snapshots.push({
        kind: "canvas",
        title: canvas.getAttribute("aria-label") || canvas.getAttribute("data-title") || "Profile plot",
        width: canvas.width,
        height: canvas.height,
        dataUrl,
      });
    }

    return snapshots;
  };

  const buildGenericReportRowsFromProfileInputs = () => {
    const inputs = collectProfileInputsSnapshot();
    const rows = inputs
      .map((item) => {
        const label = (item.label ?? "").replace(/\s+/g, " ").trim();
        if (!label || /^field-\d+$/i.test(label)) {
          return null;
        }
        const value = String(item.value ?? "").trim();
        return {
          Field: label,
          Value: value || "-",
        };
      })
      .filter((item): item is { Field: string; Value: string } => Boolean(item));

    return rows.length ? rows : [{ Field: "Info", Value: "No profile inputs were available in this snapshot." }];
  };

  const captureGenericProfileReportData = async () => {
    const rows = buildGenericReportRowsFromProfileInputs();
    const plots = await collectProfilePlotsSnapshot();
    const firstPlot = plots.find((plot) => Boolean(plot.dataUrl));

    setGenericProfileReportData({
      columns: [
        { header: "Field", key: "Field" },
        { header: "Value", key: "Value" },
      ],
      rows,
      plotImageDataUrl: firstPlot?.dataUrl ?? null,
    });
  };

  const saveProfileSnapshotToProject = async () => {
    setProfileSnapshotMessage(null);
    if (!supabaseReady) {
      setProfileSnapshotMessage("Supabase is not configured.");
      setProfileSnapshotMessageType("error");
      return;
    }
    if (!isAuthenticated) {
      setProfileSnapshotMessage("Sign in to save profile analyses.");
      setProfileSnapshotMessageType("error");
      return;
    }
    if (subscriptionTier === "none") {
      setProfileSnapshotMessage("Saving analyses to a project requires Bronze or higher membership.");
      setProfileSnapshotMessageType("error");
      return;
    }
    if (!activeProjectBorehole?.projectId) {
      setProfileSnapshotMessage("Select a project from Projects and Boreholes first.");
      setProfileSnapshotMessageType("error");
      return;
    }

    setIsSavingProfileSnapshot(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfileSnapshotMessage("Sign in to save profile analyses.");
        setProfileSnapshotMessageType("error");
        return;
      }

      const profileInputs = collectProfileInputsSnapshot();
      const profileTables = collectProfileTablesSnapshot();
      const profilePlots = await collectProfilePlotsSnapshot();

      const payload = {
        snapshotType: "profile-analysis",
        savedAt: new Date().toISOString(),
        unitSystem,
        calculationInputs: formValues,
        calculationResult: displayResult,
        activeSelection: activeProjectBorehole,
        profileSnapshot: {
          inputs: profileInputs,
          tables: profileTables,
          plots: profilePlots,
        },
      };

      const { data: insertedResult, error } = await supabase
        .from("tool_results")
        .insert({
          user_id: user.id,
          project_id: activeProjectBorehole.projectId,
          borehole_id: activeProjectBorehole.selectedBoreholes?.[0]?.boreholeId ?? activeProjectBorehole.boreholeId,
          tool_slug: tool.slug,
          tool_title: tool.title,
          result_title: `${tool.title} - Profile Snapshot`,
          result_payload: payload,
          unit_system: unitSystem,
        })
        .select("id")
        .single();

      if (error) {
        setProfileSnapshotMessage(error.message);
        setProfileSnapshotMessageType("error");
        return;
      }

      let integratedCount = 0;
      try {
        const integrated = await syncProjectParametersForResult({
          supabase,
          userId: user.id,
          projectId: activeProjectBorehole.projectId,
          sourceResultId: insertedResult.id,
          toolSlug: tool.slug,
          payload,
        });
        integratedCount = integrated.insertedCount;
      } catch (integrationError) {
        const reason =
          integrationError instanceof Error
            ? integrationError.message
            : "Integrated-parameter indexing failed.";
        setProfileSnapshotMessage(`Profile analysis saved, but parameter indexing failed: ${reason}`);
        setProfileSnapshotMessageType("error");
        return;
      }

      setProfileSnapshotMessage(
        `Profile analysis saved. Captured ${profileInputs.length} input fields, ${profileTables.length} tables, and ${profilePlots.length} plot images. Indexed ${integratedCount} parameters.`,
      );
      setProfileSnapshotMessageType("ok");
    } catch {
      setProfileSnapshotMessage("Saving profile analysis failed. Please try again.");
      setProfileSnapshotMessageType("error");
    } finally {
      setIsSavingProfileSnapshot(false);
    }
  };

  const renderProfileSavePanel = () => (
    !canUseProjectIntegration || isLiquefactionScreening || isPostLiquefactionSettlement ? null : (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Save Profile Analysis</p>
      <p className="mt-1 text-sm text-slate-600">
        Save current profile inputs and plot images to the active project folder.
      </p>
      {subscriptionTier === "none" ? (
        <p className="mt-2 text-sm text-amber-800">
          Cloud save is available from Bronze upward. You can still use tools with manual inputs.
        </p>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">
        {activeProjectBorehole
          ? `Target: ${activeProjectBorehole.projectName}${activeProjectBorehole.boreholeLabel ? ` / ${activeProjectBorehole.boreholeLabel}` : ""}`
          : "Select a project/borehole from the top-right dropdown first."}
      </p>
      {activeProjectBorehole ? (
        <p className="mt-1 text-xs text-slate-500">
          Active imported samples: {activeImportBoreholes.length}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void saveProfileSnapshotToProject();
          }}
          className="btn-base px-3 py-1.5 text-sm"
          disabled={
            isSavingProfileSnapshot || subscriptionTier === "none" || subscriptionLoading
          }
        >
          {isSavingProfileSnapshot ? "Saving..." : "Save Analysis to Project"}
        </button>
      </div>
      {profileSnapshotMessage ? (
        <div
          className={`mt-2 rounded-md border px-2.5 py-1.5 text-xs ${
            profileSnapshotMessageType === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p>{profileSnapshotMessage}</p>
          {profileSnapshotMessageType === "ok" ? (
            <div className="mt-2">
              <Link href="/account" className="btn-base px-3 py-1.5 text-sm">
                Go to Projects
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
    )
  );

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, tool.slug]);

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

  useEffect(() => {
    setActiveProjectBorehole(readActiveProjectBorehole());

    function syncActiveProjectBorehole() {
      setActiveProjectBorehole(readActiveProjectBorehole());
    }

    window.addEventListener("storage", syncActiveProjectBorehole);
    window.addEventListener("gih:active-project-changed", syncActiveProjectBorehole);

    return () => {
      window.removeEventListener("storage", syncActiveProjectBorehole);
      window.removeEventListener("gih:active-project-changed", syncActiveProjectBorehole);
    };
  }, []);

  useEffect(() => {
    if (!supabaseReady) {
      setIsAuthenticated(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const syncAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(user));
    };

    void syncAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseReady]);

  useEffect(() => {
    if (!supabaseReady || !isAuthenticated || !activeProjectBorehole?.projectId) {
      setActiveProjectParameters([]);
      return;
    }

    let isCancelled = false;
    const supabase = createSupabaseBrowserClient();

    const loadProjectParameters = async () => {
      const { data, error } = await supabase
        .from("project_parameters")
        .select("borehole_label,sample_depth,parameter_code,value,created_at,source_tool_slug")
        .eq("project_id", activeProjectBorehole.projectId)
        .order("created_at", { ascending: false });

      if (isCancelled) {
        return;
      }

      if (error) {
        setActiveProjectParameters([]);
        return;
      }

      const rows = ((data ?? []) as Array<Record<string, unknown>>)
        .map((row) => {
          const value = typeof row.value === "number" ? row.value : Number(row.value);
          if (!Number.isFinite(value)) {
            return null;
          }

          const sampleDepth =
            typeof row.sample_depth === "number"
              ? row.sample_depth
              : row.sample_depth === null
                ? null
                : Number(row.sample_depth);

          return {
            boreholeLabel: sanitiseBoreholeLabel(
              typeof row.borehole_label === "string" ? row.borehole_label : null,
            ),
            sampleDepth: Number.isFinite(sampleDepth) ? sampleDepth : null,
            parameterCode: String(row.parameter_code ?? "").trim(),
            value,
            createdAt: typeof row.created_at === "string" ? row.created_at : null,
            sourceToolSlug: typeof row.source_tool_slug === "string" ? row.source_tool_slug : null,
          } satisfies ActiveProjectParameter;
        })
        .filter((item): item is ActiveProjectParameter => Boolean(item));

      const deduped = new Map<string, ActiveProjectParameter>();
      rows.forEach((item) => {
        const key = `${normaliseBoreholeLabelKey(item.boreholeLabel)}|${depthKey(item.sampleDepth)}|${item.parameterCode}`;
        if (!deduped.has(key)) {
          deduped.set(key, item);
        }
      });

      setActiveProjectParameters(Array.from(deduped.values()));
    };

    void loadProjectParameters();

    return () => {
      isCancelled = true;
    };
  }, [activeProjectBorehole?.projectId, isAuthenticated, supabaseReady]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(SAVED_ANALYSIS_STORAGE_KEY);
    if (!raw) {
      return;
    }

    let parsed: SavedAnalysisEnvelope | null = null;
    try {
      parsed = JSON.parse(raw) as SavedAnalysisEnvelope;
    } catch {
      window.localStorage.removeItem(SAVED_ANALYSIS_STORAGE_KEY);
      setSavedAnalysisMessage("Saved analysis data could not be read.");
      setSavedAnalysisMessageType("error");
      return;
    }

    if (!parsed || parsed.toolSlug !== tool.slug) {
      return;
    }

    window.localStorage.removeItem(SAVED_ANALYSIS_STORAGE_KEY);
    setSavedAnalysisMessage(null);

    if (isUnitSystemValue(parsed.unitSystem) && parsed.unitSystem !== unitSystem) {
      // Avoid unit-conversion re-mapping while we restore values saved in the target unit system.
      previousUnitSystem.current = parsed.unitSystem;
      setUnitSystem(parsed.unitSystem);
    }

    const payload = parsed.payload;
    const payloadObject = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const calculationInputs =
      payloadObject && payloadObject.calculationInputs && typeof payloadObject.calculationInputs === "object"
        ? (payloadObject.calculationInputs as Record<string, unknown>)
        : null;
    const calculationResult =
      payloadObject && isCalculationResultPayload(payloadObject.calculationResult)
        ? (payloadObject.calculationResult as CalculationResult)
        : isCalculationResultPayload(payload)
          ? (payload as CalculationResult)
          : null;

    let restoredInputCount = 0;
    if (calculationInputs) {
      const restoredValues = tool.inputs.reduce<Record<string, string>>((acc, input) => {
        const value = calculationInputs[input.name];
        if (value === null || value === undefined) {
          acc[input.name] = String(input.defaultValue);
          return acc;
        }
        restoredInputCount += 1;
        acc[input.name] = String(value);
        return acc;
      }, {});

      setFormValues(restoredValues);
      setErrors({});
      setGlobalError(null);
    }

    if (calculationResult) {
      setResult(calculationResult);
    } else if (calculationInputs) {
      setResult(null);
    }

    if (!calculationInputs && !calculationResult) {
      setSavedAnalysisMessage("Saved record loaded, but no reusable calculation snapshot was found.");
      setSavedAnalysisMessageType("error");
      return;
    }

    const messageParts: string[] = [];
    if (restoredInputCount > 0) {
      messageParts.push(`${restoredInputCount} input field${restoredInputCount === 1 ? "" : "s"} restored`);
    }
    if (calculationResult) {
      messageParts.push("saved result restored");
    }

    setSavedAnalysisMessage(
      `Saved analysis applied${messageParts.length ? `: ${messageParts.join(", ")}.` : "."}`,
    );
    setSavedAnalysisMessageType("ok");
  }, [setUnitSystem, tool.inputs, tool.slug, unitSystem]);

  useEffect(() => {
    if (!savedAnalysisMessage) {
      return;
    }
    const id = window.setTimeout(() => {
      setSavedAnalysisMessage(null);
    }, 5000);
    return () => window.clearTimeout(id);
  }, [savedAnalysisMessage]);

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

  const handleTabChange = (nextTab: string) => {
    if (nextTab === "report" && isSiteCharacterizationTool && !isCuFromPiAndSpt && activeTab === "profile") {
      void captureGenericProfileReportData();
    }
    setActiveTab(nextTab);
  };

  useEffect(() => {
    if (activeTab === "report" && isSiteCharacterizationTool && !reportsAllowed) {
      setActiveTab("profile");
    }
  }, [activeTab, isSiteCharacterizationTool, reportsAllowed]);

  return (
    <div className="space-y-5">
      <Tabs
        tabs={[
          ...(hideCalculationTab ? [] : [{ id: "calculation", label: "Calculation" }]),
          ...(isModulusFromCu ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isSptCorrections ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isGmaxFromVs ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isEoedFromMv ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isEuFromSpt ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isEprimeFromSptCohesionless ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isEprimeFromEuCohesive ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isOcrCalculator ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isCuFromPiAndSpt ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isCprimeFromCu ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isCuFromPressuremeter ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isFrictionAngleFromSpt ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isFrictionAngleFromPi ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isEarthPressureCoefficients ? [{ id: "profile", label: "Soil Profile Plot" }] : []),
          ...(isLiquefactionScreening ? [{ id: "profile", label: "Layered Samples Plot" }] : []),
          ...(isPostLiquefactionSettlement ? [{ id: "profile", label: "Layered Samples Plot" }] : []),
          ...(isIntegratedSettlement ? [{ id: "profile", label: "Soil Profile" }] : []),
          ...(isSiteCharacterizationTool && reportsAllowed ? [{ id: "report", label: "Report" }] : []),
          { id: "information", label: "Information" },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {savedAnalysisMessage ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            savedAnalysisMessageType === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {savedAnalysisMessage}
        </div>
      ) : null}

      {activeTab === "calculation" && !hideCalculationTab ? (
        <section className="space-y-5">
          <div
            className={`grid gap-5 ${
              showBearingVisual ? "lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            }`}
          >
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Inputs</h2>
              <p className="mt-1 text-xs text-slate-600 sm:text-sm">Enter values and run the calculator.</p>

              <div
                className={
                  showBearingVisual
                    ? "mt-4 grid gap-4 sm:grid-cols-2"
                    : "mt-4 space-y-4"
                }
              >
                {tool.inputs.map((input) => {
                  const id = `input-${input.name}`;
                  const isAutoRatioField = isModulusFromCu && input.name === "ratio" && isAutoRatioMode;
                  const isInactiveGmaxField =
                    isGmaxFromVs &&
                    ((formValues.densityInputMode === "unit-weight" && input.name === "density") ||
                      (formValues.densityInputMode === "mass-density" && input.name === "unitWeight"));
                  const isBearingFullSpan =
                    showBearingVisual &&
                    (input.name === "method" ||
                      input.name === "factorOfSafety" ||
                      input.name === "cohesion" ||
                      input.name === "frictionAngle" ||
                      input.name === "unitWeight");
                  const displayLabel =
                    isLiquefactionScreening && input.name === "peakGroundAcceleration"
                      ? liquefactionMethod === "tbdy-2018"
                        ? "Peak Ground Acceleration, PGA (0.4SDS)"
                        : "Peak Ground Acceleration, PGA"
                      : input.label;
                  return (
                    <div key={input.name} className={showBearingVisual && isBearingFullSpan ? "sm:col-span-2" : undefined}>
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
                            <option key={`${option.value}-${option.label}`} value={option.value}>
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
                          disabled={isAutoRatioField || isInactiveGmaxField}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              [input.name]: event.target.value,
                            }))
                          }
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 ${
                            isAutoRatioField || isInactiveGmaxField
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
                      {isInactiveGmaxField ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Disabled because the other density input mode is currently selected.
                        </p>
                      ) : null}
                    </div>
                  );
                })}

              </div>
              <button type="button" onClick={handleCalculate} className="btn-base btn-md mt-6" disabled={isPending}>
                {isPending ? "Calculating..." : "Calculate"}
              </button>
              {globalError ? <p className="mt-3 text-sm text-red-700">{globalError}</p> : null}
            </div>

            {showBearingVisual ? (
              <div className="min-w-0 lg:sticky lg:top-32 lg:max-h-[calc(100vh-8rem)] lg:overflow-auto lg:pr-1">
                <div className="min-w-0 space-y-4">
                  <BearingCapacityVisual values={formValues} unitSystem={unitSystem} title={tool.title} />

                  <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Results</h2>
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

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Notes</p>
                          <p className="mt-2 text-sm text-slate-600">
                            Detailed calculation steps are available in the Information tab.
                          </p>
                        </div>

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
              </div>
            ) : (
              <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Results</h2>
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

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Notes</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Detailed calculation steps are available in the Information tab.
                      </p>
                    </div>

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
            )}
          </div>

          {showStressDistributionVisual ? <StressDistributionVisual values={formValues} unitSystem={unitSystem} /> : null}
          {isLiquefactionScreening ? (
            <LiquefactionScreeningVisual values={formValues} result={displayResult} unitSystem={unitSystem} />
          ) : null}
        </section>
      ) : activeTab === "profile" && isModulusFromCu ? (
        <div ref={profileContainerRef} className="space-y-4">
          <ModulusFromCuProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isSptCorrections ? (
        <div ref={profileContainerRef} className="space-y-4">
          <SptProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isGmaxFromVs ? (
        <div ref={profileContainerRef} className="space-y-4">
          <GmaxProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isEoedFromMv ? (
        <div ref={profileContainerRef} className="space-y-4">
          <EoedProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isEuFromSpt ? (
        <div ref={profileContainerRef} className="space-y-4">
          <EuFromSptProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isEprimeFromSptCohesionless ? (
        <div ref={profileContainerRef} className="space-y-4">
          <EprimeFromSptCohesionlessProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isEprimeFromEuCohesive ? (
        <div ref={profileContainerRef} className="space-y-4">
          <EprimeFromEuProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isOcrCalculator ? (
        <div ref={profileContainerRef} className="space-y-4">
          <OcrProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            globalGroundwaterDepth={formValues.groundwaterDepth ?? ""}
            globalUnitWeight={formValues.unitWeight ?? ""}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isCuFromPiAndSpt ? (
        <div ref={profileContainerRef} className="space-y-4">
          <CuFromSptProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
            onReportDataChange={setCuProfileReportData}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isCprimeFromCu ? (
        <div ref={profileContainerRef} className="space-y-4">
          <CprimeFromCuProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isCuFromPressuremeter ? (
        <div ref={profileContainerRef} className="space-y-4">
          <CuFromPressuremeterProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "report" && isSiteCharacterizationTool ? (
        <section className="space-y-4">
          {isCuFromPiAndSpt ? (
            <CuProfileReportTab
              toolSlug={tool.slug}
              toolTitle={tool.title}
              unitSystem={unitSystem}
              projectName={activeProjectBorehole?.projectName ?? null}
              boreholeIds={activeImportBoreholes.map((item) => item.boreholeLabel)}
              depthUnit={cuProfileReportData?.depthUnit}
              stressUnit={cuProfileReportData?.stressUnit}
              points={cuProfileReportData?.points ?? []}
              rows={cuProfileReportData?.tableRows}
              plotImageDataUrl={cuProfileReportData?.plotImageDataUrl ?? null}
            />
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Report</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Reports are coming soon</h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                This section is temporarily disabled while report templates are being prepared. It will be available soon.
              </p>
            </section>
          )}
        </section>
      ) : activeTab === "profile" && isFrictionAngleFromSpt ? (
        <div ref={profileContainerRef} className="space-y-4">
          <FrictionAngleProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isFrictionAngleFromPi ? (
        <div ref={profileContainerRef} className="space-y-4">
          <FrictionAngleFromPiProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isEarthPressureCoefficients ? (
        <div ref={profileContainerRef} className="space-y-4">
          <EarthPressureProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            projectParameters={activeProjectParameters}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isLiquefactionScreening ? (
        <div ref={profileContainerRef} className="space-y-4">
          <LiquefactionProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
            initialMethod={liquefactionMethod}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isPostLiquefactionSettlement ? (
        <div ref={profileContainerRef} className="space-y-4">
          <PostLiquefactionSettlementProfileTab
            key={profileProjectImportKey}
            unitSystem={unitSystem}
            importRows={activeImportBoreholes}
            soilPolicyToolSlug={tool.slug}
          />
          {renderProfileSavePanel()}
        </div>
      ) : activeTab === "profile" && isIntegratedSettlement ? (
        <div ref={profileContainerRef} className="space-y-4">
          <IntegratedSettlementProfileTab unitSystem={unitSystem} />
        </div>
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

          {effectiveInformation.figures?.length ? (
            <div className="mt-5 space-y-4">
              {effectiveInformation.figures.map((figure, index) => (
                <figure key={`${figure.src}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="p-4">
                    <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <Image
                        src={figure.src}
                        alt={figure.alt}
                        width={560}
                        height={420}
                        className="h-auto w-full"
                      />
                    </div>
                    {figure.caption ? (
                      <figcaption className="mt-3 text-sm leading-6 text-slate-600">
                        <EngineeringText text={figure.caption} />
                      </figcaption>
                    ) : null}
                  </div>
                </figure>
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


