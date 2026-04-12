"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { interpretIntegratedMatrixReportAction } from "@/app/actions/integrated-matrix-ai";
import { getMatrixAiWeeklyQuotaAction } from "@/app/actions/subscription";
import { IntegratedMatrixAiReportBody } from "@/components/integrated-matrix-ai-report-body";
import { tools as TOOL_DEFINITIONS } from "@/data/tools";
import { useSubscription } from "@/components/subscription-context";
import { EXCEL_TABLE_BLOCK_CSS, buildMhtmlMultipartDocument, excelTextCell, excelTextHeader } from "@/lib/excel-mhtml-export";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  clearActiveProjectBorehole,
  mergeBoreholeExtrasIntoRows,
  removeBoreholeExtras,
  readActiveProjectBorehole,
  upsertBoreholeExtras,
  type ActiveProjectBorehole,
  type BoreholeRecord,
  type ProjectRecord,
  writeActiveProjectBorehole,
} from "@/lib/project-boreholes";
import { countDistinctBoreholeLabels, validateBoreholeSampleAdd } from "@/lib/project-limits";
import { AI_ANALYZE_BUTTON_CLASS } from "@/lib/report-button-styles";
import {
  fingerprintIntegratedMatrixRows,
  matrixAiReportStorageKey,
  type MatrixAiReportCachePayload,
} from "@/lib/matrix-ai-report-cache";
import { getTierLimits, MATRIX_AI_REPORTS_PER_WEEK, tierAllowsAiAnalysis, tierAllowsReports } from "@/lib/subscription";
import { isToolReportSnapshotPayload } from "@/lib/tool-report-snapshot";
import type { SoilBehavior } from "@/lib/soil-behavior-policy";

interface SavedToolResultRecord {
  id: string;
  created_at: string;
  tool_slug: string | null;
  tool_title: string | null;
  result_title: string | null;
  borehole_id: string | null;
  unit_system: string | null;
}

interface SavedToolResultDetails extends SavedToolResultRecord {
  result_payload: unknown;
}

interface ProjectParameterRecord {
  id: string;
  project_id: string;
  borehole_label: string | null;
  sample_depth: number | null;
  parameter_code: string;
  parameter_label: string;
  value: number;
  unit: string | null;
  source_tool_slug: string;
  source_result_id: string;
  created_at?: string;
}

function formatSoilBehaviorLabel(value: SoilBehavior | null | undefined): string {
  if (value === "cohesive") {
    return "Cohesive";
  }
  if (value === "granular") {
    return "Granular";
  }
  return "-";
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const PARAMETER_COLUMN_ORDER = [
  "pi",
  "n",
  "n60",
  "n160",
  "cu",
  "c_prime",
  "phi_prime",
  "eu",
  "e_prime",
  "ocr",
  "sigma_v0_eff",
  "gmax",
  "vs",
  "eoed",
  "mv",
  "ka",
  "kp",
];

const PARAMETER_META: Record<
  string,
  {
    label: React.ReactNode;
    tooltip: string;
    tools: Array<{ slug: string; label: string }>;
  }
> = {
  n: {
    label: "N",
    tooltip: "Recorded SPT blow count (N).",
    tools: [{ slug: "spt-corrections", label: "SPT corrections" }],
  },
  n60: {
    label: (
      <>
        N<sub>60</sub>
      </>
    ),
    tooltip: "Energy-corrected SPT resistance (N60).",
    tools: [{ slug: "spt-corrections", label: "SPT corrections" }],
  },
  n160: {
    label: (
      <>
        (N<sub>1</sub>)<sub>60</sub>
      </>
    ),
    tooltip: "Overburden-corrected SPT resistance ((N1)60).",
    tools: [{ slug: "spt-corrections", label: "SPT corrections" }],
  },
  pi: {
    label: <>PI (%)</>,
    tooltip: "Plasticity index from borehole samples (project data), or from saved tool outputs when stored as PI.",
    tools: [
      { slug: "cu-from-pi-and-spt", label: "cu from PI & SPT" },
      { slug: "friction-angle-from-pi", label: "φ′ from PI" },
    ],
  },
  cu: {
    label: (
      <>
        c<sub>u</sub> (kPa)
      </>
    ),
    tooltip: "Undrained shear strength.",
    tools: [
      { slug: "cu-from-pi-and-spt", label: "cu from PI & SPT" },
      { slug: "cu-from-pressuremeter", label: "cu from pressuremeter" },
      { slug: "cu-vs-depth", label: "cu vs depth" },
    ],
  },
  c_prime: {
    label: (
      <>
        c&apos; (kPa)
      </>
    ),
    tooltip: "Effective cohesion (c').",
    tools: [{ slug: "cprime-from-cu", label: "c' from cu" }],
  },
  phi_prime: {
    label: <>φ′ (deg)</>,
    tooltip: "Effective friction angle (φ′).",
    tools: [
      { slug: "friction-angle-from-spt", label: "φ′ from SPT" },
      { slug: "friction-angle-from-pi", label: "φ′ from PI" },
    ],
  },
  eu: {
    label: (
      <>
        E<sub>u</sub> (kPa)
      </>
    ),
    tooltip: "Undrained Young's modulus (Eu).",
    tools: [{ slug: "eu-from-spt-butler-1975", label: "Eu from SPT (Butler 1975)" }],
  },
  e_prime: {
    label: (
      <>
        E&apos; (kPa)
      </>
    ),
    tooltip: "Effective modulus (E').",
    tools: [
      { slug: "effective-modulus-eprime-cohesive", label: "E' (cohesive)" },
      { slug: "eprime-from-spt-cohesionless", label: "E' from SPT (cohesionless)" },
    ],
  },
  ocr: {
    label: "OCR",
    tooltip: "Overconsolidation ratio (OCR).",
    tools: [{ slug: "ocr-calculator", label: "OCR calculator" }],
  },
  sigma_v0_eff: {
    label: (
      <>
        &sigma;&apos;<sub>v0</sub> (kPa)
      </>
    ),
    tooltip: "Vertical effective stress at depth (sigma'v0).",
    tools: [{ slug: "spt-corrections", label: "SPT corrections" }],
  },
  gmax: {
    label: (
      <>
        G<sub>max</sub> (MPa)
      </>
    ),
    tooltip: "Small-strain shear modulus (Gmax).",
    tools: [{ slug: "gmax-from-vs", label: "Gmax from Vs" }],
  },
  vs: {
    label: (
      <>
        V<sub>s</sub> (m/s)
      </>
    ),
    tooltip: "Shear-wave velocity (Vs).",
    tools: [{ slug: "gmax-from-vs", label: "Gmax from Vs" }],
  },
  eoed: {
    label: (
      <>
        E<sub>oed</sub> (MPa)
      </>
    ),
    tooltip: "Oedometric modulus (Eoed).",
    tools: [{ slug: "eoed-from-mv", label: "Eoed from mv" }],
  },
  mv: {
    label: (
      <>
        m<sub>v</sub> (m²/MN)
      </>
    ),
    tooltip: "Coefficient of volume compressibility (mv).",
    tools: [{ slug: "eoed-from-mv", label: "Eoed from mv" }],
  },
  ka: {
    label: (
      <>
        K<sub>a</sub>
      </>
    ),
    tooltip: "Active earth pressure coefficient (Ka).",
    tools: [
      { slug: "rankine-earth-pressure", label: "Rankine earth pressure" },
      { slug: "coulomb-earth-pressure", label: "Coulomb earth pressure" },
    ],
  },
  kp: {
    label: (
      <>
        K<sub>p</sub>
      </>
    ),
    tooltip: "Passive earth pressure coefficient (Kp).",
    tools: [
      { slug: "rankine-earth-pressure", label: "Rankine earth pressure" },
      { slug: "coulomb-earth-pressure", label: "Coulomb earth pressure" },
    ],
  },
};

/** Plain-text column title for Excel export and PDF matrix (codes otherwise stay as stored). */
function spreadsheetHeaderForParameterCode(code: string): string {
  if (code === "pi") {
    return "PI (%)";
  }
  return code;
}

const ACTIVE_TOOL_SLUGS = new Set(
  (TOOL_DEFINITIONS ?? [])
    .filter((tool) => (tool.status ?? "active") === "active")
    .map((tool) => tool.slug),
);

function compareBoreholeIds(a: string, b: string): number {
  return a.trim().localeCompare(b.trim(), undefined, { numeric: true, sensitivity: "base" });
}

function ParameterHeader({ code }: { code: string }) {
  const meta = PARAMETER_META[code] ?? null;
  const label = meta?.label ?? code;
  const tooltip = meta?.tooltip ?? code;
  const tools = (meta?.tools ?? []).filter((tool) => ACTIVE_TOOL_SLUGS.has(tool.slug));

  return (
    <div className="group inline-flex items-center gap-1">
      <span title={tooltip} className="whitespace-nowrap">
        {label}
      </span>
      {tools.length > 0 ? (
        <span className="ml-1 inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {tools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-600 hover:border-slate-300 hover:text-slate-900"
              title={`Open ${tool.label}`}
              aria-label={`Open ${tool.label}`}
            >
              ↗
            </Link>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function boreholeSampleComparator(a: BoreholeRecord, b: BoreholeRecord): number {
  const byBorehole = compareBoreholeIds(a.borehole_id, b.borehole_id);
  if (byBorehole !== 0) {
    return byBorehole;
  }

  const aTop = a.sample_top_depth ?? Number.POSITIVE_INFINITY;
  const bTop = b.sample_top_depth ?? Number.POSITIVE_INFINITY;
  if (aTop !== bTop) {
    return aTop - bTop;
  }

  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatBoreholeNumericInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return String(value);
}

/** Uses the first matching sample (sorted by depth) that has GWT or unit weight, else first sample. */
function getFieldDefaultsForBoreholeId(samples: BoreholeRecord[], boreholeId: string): { gwt: string; unitWeight: string } {
  const trimmed = boreholeId.trim();
  if (!trimmed) {
    return { gwt: "", unitWeight: "" };
  }
  const matches = samples.filter((s) => s.borehole_id.trim() === trimmed);
  if (!matches.length) {
    return { gwt: "", unitWeight: "" };
  }
  const sorted = [...matches].sort(boreholeSampleComparator);
  const withData =
    sorted.find(
      (s) =>
        (s.gwt_depth !== null && s.gwt_depth !== undefined && Number.isFinite(s.gwt_depth)) ||
        (s.unit_weight !== null && s.unit_weight !== undefined && Number.isFinite(s.unit_weight)),
    ) ?? sorted[0];
  return {
    gwt: formatBoreholeNumericInput(withData.gwt_depth),
    unitWeight: formatBoreholeNumericInput(withData.unit_weight),
  };
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

/** PostgREST errors when geotech columns are missing from schema cache or DB. */
function isExtendedBoreholeColumnError(message: string): boolean {
  return /pi_value|gwt_depth|unit_weight|soil_behavior|column/i.test(message);
}

function isMissingBoreholesTableError(message: string): boolean {
  return (
    /relation .*boreholes.* does not exist/i.test(message) ||
    /Could not find the table 'public\.boreholes'/i.test(message) ||
    /table.*boreholes.*schema cache/i.test(message)
  );
}

export function AccountProjectsPanel() {
  const router = useRouter();
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeSelection, setActiveSelection] = useState<ActiveProjectBorehole | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [confirmRemoveProjectId, setConfirmRemoveProjectId] = useState<string | null>(null);
  const [boreholeEntryMode, setBoreholeEntryMode] = useState<"new" | "existing">("new");
  const [existingBoreholeId, setExistingBoreholeId] = useState("");
  const [newBoreholeId, setNewBoreholeId] = useState("");
  const [newSampleTopDepth, setNewSampleTopDepth] = useState("");
  const [newNValue, setNewNValue] = useState("");
  const [newPiValue, setNewPiValue] = useState("");
  const [newSoilBehavior, setNewSoilBehavior] = useState<"" | Exclude<SoilBehavior, null>>("");
  const [newGwtDepth, setNewGwtDepth] = useState("");
  const [newUnitWeight, setNewUnitWeight] = useState("");
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
  const [editBoreholeId, setEditBoreholeId] = useState("");
  const [editSampleTopDepth, setEditSampleTopDepth] = useState("");
  const [editNValue, setEditNValue] = useState("");
  const [editPiValue, setEditPiValue] = useState("");
  const [editSoilBehavior, setEditSoilBehavior] = useState<"" | Exclude<SoilBehavior, null>>("");
  const [editGwtDepth, setEditGwtDepth] = useState("");
  const [editUnitWeight, setEditUnitWeight] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string>("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSavingBorehole, setIsSavingBorehole] = useState(false);
  const [isUpdatingSample, setIsUpdatingSample] = useState(false);
  const [deletingSampleId, setDeletingSampleId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [isUpdatingProjectName, setIsUpdatingProjectName] = useState(false);
  const [savedResults, setSavedResults] = useState<SavedToolResultRecord[]>([]);
  const [projectParameters, setProjectParameters] = useState<ProjectParameterRecord[]>([]);
  const [isLoadingSavedResults, setIsLoadingSavedResults] = useState(false);
  const [isLoadingProjectParameters, setIsLoadingProjectParameters] = useState(false);
  const [deletingSavedResultId, setDeletingSavedResultId] = useState<string | null>(null);
  const [isLoadingSavedResultDetails, setIsLoadingSavedResultDetails] = useState(false);
  const [savedResultDetails, setSavedResultDetails] = useState<SavedToolResultDetails | null>(null);
  const [savedResultPlotIndex, setSavedResultPlotIndex] = useState(0);
  const [isGeneratingMatrixAiReport, setIsGeneratingMatrixAiReport] = useState(false);
  const [integratedMatrixAiReport, setIntegratedMatrixAiReport] = useState<string | null>(null);
  const [matrixAiReportTruncated, setMatrixAiReportTruncated] = useState(false);
  const [matrixReportDataStale, setMatrixReportDataStale] = useState(false);
  const [matrixAiWeeklyQuota, setMatrixAiWeeklyQuota] = useState<{
    loaded: boolean;
    remaining: number;
    isAdmin: boolean;
  }>({ loaded: false, remaining: 0, isAdmin: false });
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"ok" | "error">("ok");
  const [activeProjectsView, setActiveProjectsView] = useState<"boreholes" | "saved" | "matrix">("boreholes");
  const boreholesSectionRef = useRef<HTMLDivElement | null>(null);
  const addSampleFormRef = useRef<HTMLDetailsElement | null>(null);
  const analysesSectionRef = useRef<HTMLDivElement | null>(null);
  const matrixSectionRef = useRef<HTMLDivElement | null>(null);

  const { effectiveTier, loading: subscriptionLoading } = useSubscription();
  const tierLimits = useMemo(() => getTierLimits(effectiveTier), [effectiveTier]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const distinctBoreholeCount = useMemo(
    () => countDistinctBoreholeLabels(selectedProject?.boreholes ?? []),
    [selectedProject?.boreholes],
  );
  const existingBoreholeIds = useMemo(
    () =>
      Array.from(new Set((selectedProject?.boreholes ?? []).map((item) => item.borehole_id).filter(Boolean))).sort(
        compareBoreholeIds,
      ),
    [selectedProject],
  );

  useEffect(() => {
    const maxBh = tierLimits.maxBoreholesPerProject;
    if (
      boreholeEntryMode === "new" &&
      Number.isFinite(maxBh) &&
      distinctBoreholeCount >= maxBh &&
      existingBoreholeIds.length > 0
    ) {
      setBoreholeEntryMode("existing");
      setExistingBoreholeId((prev) => prev || existingBoreholeIds[0] || "");
    }
  }, [boreholeEntryMode, distinctBoreholeCount, existingBoreholeIds, tierLimits.maxBoreholesPerProject]);

  const visibleBoreholes = useMemo(() => selectedProject?.boreholes ?? [], [selectedProject]);
  const integratedMatrixRows = useMemo(() => {
    const rowMap = new Map<
      string,
      {
        boreholeLabel: string;
        soilBehavior: SoilBehavior | null;
        sampleDepth: number | null;
        values: Record<string, string>;
      }
    >();

    const formatMatrixNumber = (value: number) =>
      Math.abs(value) < 1000
        ? value.toFixed(3).replace(/\.?0+$/, "")
        : Number(value).toLocaleString("en-GB");

    const toDepthKey = (value: number | null | undefined) =>
      typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "na";
    const toRowKey = (boreholeLabel: string, sampleDepth: number | null | undefined) =>
      `${normaliseBoreholeLabelKey(boreholeLabel)}|${toDepthKey(sampleDepth)}`;

    const seedFromProjectBoreholes = selectedProject?.boreholes ?? [];
    seedFromProjectBoreholes.forEach((sample) => {
      const boreholeLabel = sanitiseBoreholeLabel(sample.borehole_id);
      const sampleDepth =
        typeof sample.sample_top_depth === "number" && Number.isFinite(sample.sample_top_depth)
          ? sample.sample_top_depth
          : null;
      const key = toRowKey(boreholeLabel, sampleDepth);
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          boreholeLabel,
          soilBehavior: sample.soil_behavior ?? null,
          sampleDepth,
          values: {},
        });
      }
      const target = rowMap.get(key);
      if (!target) {
        return;
      }
      if (sample.n_value !== null && sample.n_value !== undefined && Number.isFinite(sample.n_value)) {
        target.values.n = formatMatrixNumber(sample.n_value);
      }
      if (sample.pi_value !== null && sample.pi_value !== undefined && Number.isFinite(sample.pi_value)) {
        target.values.pi = formatMatrixNumber(sample.pi_value);
      }
    });

    projectParameters.forEach((record) => {
      const boreholeLabel = sanitiseBoreholeLabel(record.borehole_label);
      const sampleDepth =
        typeof record.sample_depth === "number" && Number.isFinite(record.sample_depth) ? record.sample_depth : null;
      const key = toRowKey(boreholeLabel, sampleDepth);

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          boreholeLabel,
          soilBehavior: null,
          sampleDepth,
          values: {},
        });
      }

      const target = rowMap.get(key);
      if (!target) {
        return;
      }
      if (!target.soilBehavior) {
        const matchingBorehole = seedFromProjectBoreholes.find((sample) => {
          const sampleLabel = sanitiseBoreholeLabel(sample.borehole_id);
          const sampleTopDepth =
            typeof sample.sample_top_depth === "number" && Number.isFinite(sample.sample_top_depth)
              ? sample.sample_top_depth
              : null;
          return toRowKey(sampleLabel, sampleTopDepth) === key;
        });
        target.soilBehavior = matchingBorehole?.soil_behavior ?? null;
      }
      if (target.values[record.parameter_code] !== undefined) {
        return;
      }

      const formatted =
        Number.isFinite(record.value) && Math.abs(record.value) < 1000
          ? record.value.toFixed(3).replace(/\.?0+$/, "")
          : Number(record.value).toLocaleString("en-GB");
      target.values[record.parameter_code] = formatted;
    });

    rowMap.forEach((target) => {
      if (target.values.pi !== undefined) {
        return;
      }
      const match = seedFromProjectBoreholes.find((sample) => {
        const sampleLabel = sanitiseBoreholeLabel(sample.borehole_id);
        const sampleTopDepth =
          typeof sample.sample_top_depth === "number" && Number.isFinite(sample.sample_top_depth)
            ? sample.sample_top_depth
            : null;
        return toRowKey(sampleLabel, sampleTopDepth) === toRowKey(target.boreholeLabel, target.sampleDepth);
      });
      if (match?.pi_value != null && Number.isFinite(match.pi_value)) {
        target.values.pi = formatMatrixNumber(match.pi_value);
      }
    });

    return Array.from(rowMap.values()).sort((a, b) => {
      const boreholeSort = compareBoreholeIds(a.boreholeLabel, b.boreholeLabel);
      if (boreholeSort !== 0) {
        return boreholeSort;
      }
      const aDepth = a.sampleDepth ?? Number.POSITIVE_INFINITY;
      const bDepth = b.sampleDepth ?? Number.POSITIVE_INFINITY;
      return aDepth - bDepth;
    });
  }, [projectParameters, selectedProject]);

  useEffect(() => {
    if (!selectedProjectId || !authUserId || typeof window === "undefined") {
      return;
    }
    try {
      const raw = localStorage.getItem(matrixAiReportStorageKey(authUserId, selectedProjectId));
      if (!raw) {
        setIntegratedMatrixAiReport(null);
        setMatrixAiReportTruncated(false);
        setMatrixReportDataStale(false);
        return;
      }
      const parsed = JSON.parse(raw) as MatrixAiReportCachePayload;
      setIntegratedMatrixAiReport(parsed.text);
      setMatrixAiReportTruncated(parsed.truncated);
    } catch {
      setIntegratedMatrixAiReport(null);
      setMatrixAiReportTruncated(false);
      setMatrixReportDataStale(false);
    }
  }, [selectedProjectId, authUserId]);

  useEffect(() => {
    if (!selectedProjectId || !authUserId) {
      return;
    }
    if (integratedMatrixRows.length === 0) {
      setMatrixReportDataStale(false);
      return;
    }
    try {
      const raw = localStorage.getItem(matrixAiReportStorageKey(authUserId, selectedProjectId));
      if (!raw) {
        setMatrixReportDataStale(false);
        return;
      }
      const parsed = JSON.parse(raw) as MatrixAiReportCachePayload;
      const fp = fingerprintIntegratedMatrixRows(integratedMatrixRows);
      setMatrixReportDataStale(parsed.fingerprint !== fp);
    } catch {
      setMatrixReportDataStale(false);
    }
  }, [selectedProjectId, authUserId, integratedMatrixRows]);

  useEffect(() => {
    if (!tierAllowsAiAnalysis(effectiveTier) || subscriptionLoading) {
      return;
    }
    void (async () => {
      const r = await getMatrixAiWeeklyQuotaAction();
      if (r.ok) {
        setMatrixAiWeeklyQuota({
          loaded: true,
          remaining: r.data.remaining,
          isAdmin: r.data.isAdmin,
        });
      } else {
        setMatrixAiWeeklyQuota({ loaded: true, remaining: 0, isAdmin: false });
      }
    })();
  }, [effectiveTier, subscriptionLoading]);

  const reportReady = useMemo(() => {
    if (!selectedProject) {
      return false;
    }
    if (integratedMatrixRows.length === 0) {
      return false;
    }
    const hasAnyToolOutputs = projectParameters.some((row) => (row.source_tool_slug ?? "").trim().length > 0);
    const hasNonN = integratedMatrixRows.some((row) => Object.keys(row.values).some((code) => code !== "n"));
    return hasAnyToolOutputs && hasNonN;
  }, [integratedMatrixRows, projectParameters, selectedProject]);

  const matrixGenerationsExhausted = useMemo(
    () =>
      tierAllowsAiAnalysis(effectiveTier) &&
      matrixAiWeeklyQuota.loaded &&
      !matrixAiWeeklyQuota.isAdmin &&
      matrixAiWeeklyQuota.remaining <= 0,
    [effectiveTier, matrixAiWeeklyQuota.isAdmin, matrixAiWeeklyQuota.loaded, matrixAiWeeklyQuota.remaining],
  );

  const generateIntegratedMatrixAiReport = async () => {
    if (!selectedProject || !supabaseReady) {
      return;
    }
    if (!tierAllowsAiAnalysis(effectiveTier)) {
      setMessage("AI engineering reports from the integrated matrix require Gold membership.");
      setMessageType("error");
      return;
    }
    if (!reportReady) {
      setMessage("Save analyses and build the matrix before generating an AI report.");
      setMessageType("error");
      return;
    }
    if (integratedMatrixAiReport) {
      const ok = window.confirm(
        "A report already exists for this project. Generate it again?",
      );
      if (!ok) {
        return;
      }
    }
    if (matrixGenerationsExhausted) {
      setMessage(
        `Weekly generation limit reached (${MATRIX_AI_REPORTS_PER_WEEK} matrix AI reports per week on Gold). The limit resets on Monday (Europe/Istanbul).`,
      );
      setMessageType("error");
      return;
    }
    setIsGeneratingMatrixAiReport(true);
    try {
      const columnHeaders = PARAMETER_COLUMN_ORDER.map(spreadsheetHeaderForParameterCode);
      const rows = integratedMatrixRows.map((row) => ({
        boreholeLabel: row.boreholeLabel,
        soilBehaviorLabel: formatSoilBehaviorLabel(row.soilBehavior),
        sampleDepth: row.sampleDepth,
        values: row.values,
      }));
      const result = await interpretIntegratedMatrixReportAction({
        projectName: selectedProject.name,
        columnOrder: [...PARAMETER_COLUMN_ORDER],
        columnHeaders,
        rows,
      });
      if (!result.ok) {
        setMessage(result.message);
        setMessageType("error");
        return;
      }
      setIntegratedMatrixAiReport(result.text);
      setMatrixAiReportTruncated(result.truncated);
      setMatrixReportDataStale(false);
      const fp = fingerprintIntegratedMatrixRows(integratedMatrixRows);
      if (authUserId) {
        try {
          const payload: MatrixAiReportCachePayload = {
            text: result.text,
            truncated: result.truncated,
            fingerprint: fp,
            savedAt: Date.now(),
          };
          localStorage.setItem(matrixAiReportStorageKey(authUserId, selectedProject.id), JSON.stringify(payload));
        } catch {
          /* ignore storage errors */
        }
      }
      void (async () => {
        const r = await getMatrixAiWeeklyQuotaAction();
        if (r.ok) {
          setMatrixAiWeeklyQuota({
            loaded: true,
            remaining: r.data.remaining,
            isAdmin: r.data.isAdmin,
          });
        }
      })();
      setMessage(
        result.truncated
          ? "Report generated; output may be cut at the model limit — scroll the panel below or generate again."
          : "AI engineering report generated.",
      );
      setMessageType("ok");
    } finally {
      setIsGeneratingMatrixAiReport(false);
    }
  };

  const exportIntegratedMatrixExcel = () => {
    if (!selectedProject) {
      return;
    }

    const headers = [
      "#",
      "Borehole ID",
      "Soil behaviour",
      "Sample depth",
      ...PARAMETER_COLUMN_ORDER.map(spreadsheetHeaderForParameterCode),
    ];
    const headerCells = headers.map((label) => excelTextHeader(label)).join("");

    const bodyRows = integratedMatrixRows
      .map((row, index) => {
        const cells = [
          String(index + 1),
          row.boreholeLabel,
          formatSoilBehaviorLabel(row.soilBehavior),
          row.sampleDepth === null ? "-" : String(row.sampleDepth),
          ...PARAMETER_COLUMN_ORDER.map((code) => row.values[code] ?? "-"),
        ];
        return `<tr>${cells.map((value) => excelTextCell(String(value ?? ""))).join("")}</tr>`;
      })
      .join("");

    const tableHtml = `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    const doc = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <title>Integrated Parameter Matrix Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 18px; margin: 0 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      ${EXCEL_TABLE_BLOCK_CSS}
    </style>
  </head>
  <body>
    <h1>Integrated Parameter Matrix</h1>
    <p>Project: ${selectedProject.name}</p>
    ${tableHtml}
  </body>
</html>`;

    const payload = buildMhtmlMultipartDocument(doc, []);
    downloadBlob(
      `integrated-parameter-matrix-${selectedProject.name.replaceAll(/[^a-z0-9-_]+/gi, "-")}.xls`,
      new Blob([payload], { type: "application/vnd.ms-excel;charset=utf-8" }),
    );
  };

  useEffect(() => {
    if (!existingBoreholeIds.length) {
      setBoreholeEntryMode("new");
      setExistingBoreholeId("");
      return;
    }

    setExistingBoreholeId((current) => current || existingBoreholeIds[0]);
  }, [existingBoreholeIds]);

  useEffect(() => {
    if (boreholeEntryMode !== "existing") {
      return;
    }
    const id = existingBoreholeId.trim();
    if (!id) {
      return;
    }
    const samples = selectedProject?.boreholes ?? [];
    const { gwt, unitWeight } = getFieldDefaultsForBoreholeId(samples, id);
    setNewGwtDepth(gwt);
    setNewUnitWeight(unitWeight);
  }, [boreholeEntryMode, existingBoreholeId, selectedProject?.boreholes]);

  useEffect(() => {
    setEditingSampleId(null);
    setEditBoreholeId("");
    setEditSampleTopDepth("");
    setEditNValue("");
    setEditPiValue("");
    setEditGwtDepth("");
    setEditUnitWeight("");
    setNewPiValue("");
    setNewGwtDepth("");
    setNewUnitWeight("");
    setSelectedSampleIds([]);
    setIsEditingProjectName(false);
    setEditProjectName("");
    setIsNewProjectOpen(false);
    setConfirmRemoveProjectId(null);
  }, [selectedProjectId]);

  useEffect(() => {
    setActiveProjectsView("boreholes");
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }
    setEditProjectName(selectedProject.name);
  }, [selectedProject]);

  const refreshProjects = async () => {
    if (!supabaseReady) {
      setProjects([]);
      setAuthUserId("");
      setIsLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProjects([]);
      setAuthUserId("");
      setIsLoading(false);
      return;
    }
    setAuthUserId(user.id);

    const projectsQuery = await supabase
      .from("projects")
      .select("id,name,created_at")
      .order("created_at", { ascending: false });

    if (projectsQuery.error) {
      setMessage(projectsQuery.error.message);
      setMessageType("error");
      setProjects([]);
      setIsLoading(false);
      return;
    }

    const baseProjects = ((projectsQuery.data ?? []) as unknown as ProjectRecord[]).map((project) => ({
      ...project,
      boreholes: [],
    }));

    let boreholeRows: BoreholeRecord[] = [];
    let boreholesError: string | null = null;

    const extendedBoreholesQuery = await supabase
      .from("boreholes")
      .select(
        "id,project_id,borehole_id,sample_top_depth,sample_bottom_depth,n_value,pi_value,gwt_depth,unit_weight,soil_behavior,created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (extendedBoreholesQuery.error) {
      if (isExtendedBoreholeColumnError(extendedBoreholesQuery.error.message)) {
        const legacyBoreholesQuery = await supabase
          .from("boreholes")
          .select("id,project_id,borehole_id,sample_top_depth,sample_bottom_depth,n_value,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (legacyBoreholesQuery.error) {
          if (!isMissingBoreholesTableError(legacyBoreholesQuery.error.message)) {
            boreholesError = legacyBoreholesQuery.error.message;
          }
        } else {
          boreholeRows = ((legacyBoreholesQuery.data ?? []) as unknown as BoreholeRecord[]).map((row) => ({
            ...row,
            pi_value: null,
            gwt_depth: null,
            unit_weight: null,
            soil_behavior: null,
          }));
        }
      } else if (!isMissingBoreholesTableError(extendedBoreholesQuery.error.message)) {
        boreholesError = extendedBoreholesQuery.error.message;
      }
    } else {
      boreholeRows = (extendedBoreholesQuery.data ?? []) as unknown as BoreholeRecord[];
    }

    const mergedRows = mergeBoreholeExtrasIntoRows(user.id, boreholeRows);

    const boreholesByProject = mergedRows.reduce<Map<string, BoreholeRecord[]>>((acc, row) => {
      const current = acc.get(row.project_id) ?? [];
      current.push({
        ...row,
        pi_value: row.pi_value ?? null,
        gwt_depth: row.gwt_depth ?? null,
        unit_weight: row.unit_weight ?? null,
      });
      acc.set(row.project_id, current);
      return acc;
    }, new Map());

    const mappedProjects = baseProjects.map((project) => ({
      ...project,
      boreholes: [...(boreholesByProject.get(project.id) ?? [])].sort(boreholeSampleComparator),
    }));

    setProjects(mappedProjects);
    setSelectedProjectId((current) => {
      if (current && mappedProjects.some((project) => project.id === current)) {
        return current;
      }
      return mappedProjects[0]?.id ?? "";
    });
    if (boreholesError) {
      setMessage(boreholesError);
      setMessageType("error");
    } else if (message && messageType === "error") {
      setMessage(null);
    }
    setIsLoading(false);
  };

  const refreshSavedResults = async (projectId: string) => {
    if (!supabaseReady || !projectId) {
      setSavedResults([]);
      return;
    }

    setIsLoadingSavedResults(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("tool_results")
        .select("id,created_at,tool_slug,tool_title,result_title,borehole_id,unit_system,result_payload")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        setSavedResults([]);
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      const rows =
        (data ?? []) as Array<
          SavedToolResultRecord & {
            result_payload?: unknown;
          }
        >;
      const analysisRows: SavedToolResultRecord[] = [];
      for (const row of rows) {
        const { result_payload: payload, ...rest } = row;
        if (!isToolReportSnapshotPayload(payload)) {
          analysisRows.push(rest);
        }
      }
      setSavedResults(analysisRows);
    } finally {
      setIsLoadingSavedResults(false);
    }
  };

  const refreshProjectParameters = async (projectId: string) => {
    if (!supabaseReady || !projectId) {
      setProjectParameters([]);
      return;
    }

    setIsLoadingProjectParameters(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("project_parameters")
        .select(
          "id,project_id,borehole_label,sample_depth,parameter_code,parameter_label,value,unit,source_tool_slug,source_result_id,created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        setProjectParameters([]);
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      setProjectParameters((data ?? []) as ProjectParameterRecord[]);
    } finally {
      setIsLoadingProjectParameters(false);
    }
  };

  useEffect(() => {
    setActiveSelection(readActiveProjectBorehole());
    void refreshProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setSavedResults([]);
      return;
    }
    void refreshSavedResults(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectParameters([]);
      return;
    }
    void refreshProjectParameters(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!savedResultDetails) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSavedResultDetails(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [savedResultDetails]);

  const onCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const name = newProjectName.trim();
    if (!name) {
      setMessage("Please enter a project name.");
      setMessageType("error");
      return;
    }

    if (effectiveTier === "none") {
      setMessage("Creating projects requires Bronze or higher membership.");
      setMessageType("error");
      return;
    }

    const maxP = tierLimits.maxProjects;
    if (Number.isFinite(maxP) && projects.length >= maxP) {
      setMessage(`You can create at most ${maxP} projects on your subscription tier.`);
      setMessageType("error");
      return;
    }

    if (!supabaseReady) {
      setMessage("Supabase is not configured.");
      setMessageType("error");
      return;
    }

    setIsSavingProject(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Please sign in again.");
        setMessageType("error");
        return;
      }

      const { error } = await supabase.from("projects").insert({
        name,
        user_id: user.id,
      });

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      setNewProjectName("");
      setIsNewProjectOpen(false);
      setMessage("Project created.");
      setMessageType("ok");
      await refreshProjects();
    } finally {
      setIsSavingProject(false);
    }
  };

  const onAddBorehole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!selectedProjectId) {
      setMessage("Select a project first.");
      setMessageType("error");
      return;
    }

    const boreholeId = (boreholeEntryMode === "existing" ? existingBoreholeId : newBoreholeId).trim();
    if (!boreholeId) {
      setMessage("Please enter Borehole ID.");
      setMessageType("error");
      return;
    }

    if (effectiveTier === "none") {
      setMessage("Saving borehole samples requires Bronze or higher membership.");
      setMessageType("error");
      return;
    }

    const projectSamples = selectedProject?.boreholes ?? [];
    const sampleCheck = validateBoreholeSampleAdd(projectSamples, boreholeId, tierLimits);
    if (!sampleCheck.ok) {
      setMessage(sampleCheck.message);
      setMessageType("error");
      return;
    }

    if (!supabaseReady) {
      setMessage("Supabase is not configured.");
      setMessageType("error");
      return;
    }

    setIsSavingBorehole(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Please sign in again.");
        setMessageType("error");
        return;
      }

      let error: { message: string } | null = null;
      let insertedSampleId: string | null = null;
      const piForStore = newSoilBehavior === "granular" ? null : toNullableNumber(newPiValue);
      const extendedInsert = await supabase
        .from("boreholes")
        .insert({
          project_id: selectedProjectId,
          user_id: user.id,
          borehole_id: boreholeId,
          sample_top_depth: toNullableNumber(newSampleTopDepth),
          sample_bottom_depth: null,
          n_value: toNullableNumber(newNValue),
          pi_value: piForStore,
          gwt_depth: toNullableNumber(newGwtDepth),
          unit_weight: toNullableNumber(newUnitWeight),
          soil_behavior: newSoilBehavior === "" ? null : newSoilBehavior,
        })
        .select("id")
        .maybeSingle();
      error = extendedInsert.error ? { message: extendedInsert.error.message } : null;
      insertedSampleId = (extendedInsert.data as { id?: string } | null)?.id ?? null;

      if (error && isExtendedBoreholeColumnError(error.message)) {
        const legacyInsert = await supabase.from("boreholes").insert({
          project_id: selectedProjectId,
          user_id: user.id,
          borehole_id: boreholeId,
          sample_top_depth: toNullableNumber(newSampleTopDepth),
          sample_bottom_depth: null,
          n_value: toNullableNumber(newNValue),
        })
          .select("id")
          .maybeSingle();
        error = legacyInsert.error ? { message: legacyInsert.error.message } : null;
        insertedSampleId = (legacyInsert.data as { id?: string } | null)?.id ?? null;
      }

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      if (insertedSampleId) {
        upsertBoreholeExtras(user.id, insertedSampleId, {
          piValue: piForStore,
          gwtDepth: toNullableNumber(newGwtDepth),
          unitWeight: toNullableNumber(newUnitWeight),
          soilBehavior: newSoilBehavior === "" ? null : newSoilBehavior,
        });
      }

      if (boreholeEntryMode === "new") {
        setNewBoreholeId("");
      }
      setBoreholeEntryMode("existing");
      setExistingBoreholeId(boreholeId);
      setNewSampleTopDepth("");
      setNewNValue("");
      setNewPiValue("");
      setNewSoilBehavior("");
      setNewGwtDepth("");
      setNewUnitWeight("");
      setMessage(`Sample added under "${boreholeId}".`);
      setMessageType("ok");
      await refreshProjects();
    } finally {
      setIsSavingBorehole(false);
    }
  };

  const setActiveProject = (project: ProjectRecord) => {
    const allSamples = [...(project.boreholes ?? [])].sort(boreholeSampleComparator);
    const selectedBoreholes = allSamples.map((sample) => ({
      boreholeId: sample.id,
      boreholeLabel: sample.borehole_id.trim() || "BH not set",
      sampleTopDepth: sample.sample_top_depth ?? null,
      sampleBottomDepth: sample.sample_bottom_depth ?? null,
      nValue: sample.n_value ?? null,
      piValue: sample.pi_value ?? null,
      gwtDepth: sample.gwt_depth ?? null,
      unitWeight: sample.unit_weight ?? null,
      soilBehavior: sample.soil_behavior ?? null,
    }));
    const primary = selectedBoreholes[0];

    const payload: ActiveProjectBorehole = {
      projectId: project.id,
      projectName: project.name,
      boreholeId: primary?.boreholeId ?? null,
      boreholeLabel: primary?.boreholeLabel ?? null,
      sampleTopDepth: primary?.sampleTopDepth ?? null,
      sampleBottomDepth: primary?.sampleBottomDepth ?? null,
      nValue: primary?.nValue ?? null,
      piValue: primary?.piValue ?? null,
      gwtDepth: primary?.gwtDepth ?? null,
      unitWeight: primary?.unitWeight ?? null,
      soilBehavior: primary?.soilBehavior ?? null,
      selectedBoreholes,
    };
    writeActiveProjectBorehole(payload);
    setActiveSelection(payload);
    setMessage(
      selectedBoreholes.length > 0
        ? `"${project.name}" is now active in Tools (${selectedBoreholes.length} samples).`
        : `"${project.name}" is now active in Tools.`,
    );
    setMessageType("ok");
  };

  const setActiveBorehole = (project: ProjectRecord, borehole: BoreholeRecord) => {
    const payload: ActiveProjectBorehole = {
      projectId: project.id,
      projectName: project.name,
      boreholeId: borehole.id,
      boreholeLabel: borehole.borehole_id,
      sampleTopDepth: borehole.sample_top_depth ?? null,
      sampleBottomDepth: borehole.sample_bottom_depth ?? null,
      nValue: borehole.n_value ?? null,
      piValue: borehole.pi_value ?? null,
      gwtDepth: borehole.gwt_depth ?? null,
      unitWeight: borehole.unit_weight ?? null,
      soilBehavior: borehole.soil_behavior ?? null,
    };
    writeActiveProjectBorehole(payload);
    setActiveSelection(payload);
    setMessage(`"${borehole.borehole_id}" is now active in Tools.`);
    setMessageType("ok");
  };

  const setActiveSelectedBoreholes = (project: ProjectRecord) => {
    const selectedSamples = (project.boreholes ?? []).filter((sample) => selectedSampleIds.includes(sample.id));
    if (selectedSamples.length === 0) {
      setMessage("Select at least one borehole sample.");
      setMessageType("error");
      return;
    }

    const selectedBoreholes = [...selectedSamples]
      .sort((a, b) => {
        const byBorehole = a.borehole_id.localeCompare(b.borehole_id, undefined, { numeric: true, sensitivity: "base" });
        if (byBorehole !== 0) {
          return byBorehole;
        }
        const aTop = a.sample_top_depth ?? Number.POSITIVE_INFINITY;
        const bTop = b.sample_top_depth ?? Number.POSITIVE_INFINITY;
        return aTop - bTop;
      })
      .map((sample) => ({
        boreholeId: sample.id,
        boreholeLabel: sample.borehole_id.trim(),
        sampleTopDepth: sample.sample_top_depth ?? null,
        sampleBottomDepth: sample.sample_bottom_depth ?? null,
        nValue: sample.n_value ?? null,
        piValue: sample.pi_value ?? null,
        gwtDepth: sample.gwt_depth ?? null,
        unitWeight: sample.unit_weight ?? null,
        soilBehavior: sample.soil_behavior ?? null,
      }));

    const primary = selectedBoreholes[0];
    const payload: ActiveProjectBorehole = {
      projectId: project.id,
      projectName: project.name,
      boreholeId: primary?.boreholeId ?? null,
      boreholeLabel: primary?.boreholeLabel ?? null,
      sampleTopDepth: primary?.sampleTopDepth ?? null,
      sampleBottomDepth: primary?.sampleBottomDepth ?? null,
      nValue: primary?.nValue ?? null,
      piValue: primary?.piValue ?? null,
      gwtDepth: primary?.gwtDepth ?? null,
      unitWeight: primary?.unitWeight ?? null,
      soilBehavior: primary?.soilBehavior ?? null,
      selectedBoreholes,
    };

    writeActiveProjectBorehole(payload);
    setActiveSelection(payload);
    setMessage(`${selectedBoreholes.length} samples are now active in Tools.`);
    setMessageType("ok");
  };

  const toggleSampleSelection = (sampleId: string) => {
    setSelectedSampleIds((current) =>
      current.includes(sampleId) ? current.filter((id) => id !== sampleId) : [...current, sampleId],
    );
  };

  const toggleSelectAllSamples = (samples: BoreholeRecord[]) => {
    const allIds = samples.map((sample) => sample.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedSampleIds.includes(id));
    if (allSelected) {
      setSelectedSampleIds((current) => current.filter((id) => !allIds.includes(id)));
      return;
    }
    setSelectedSampleIds((current) => Array.from(new Set([...current, ...allIds])));
  };

  const startEditSample = (borehole: BoreholeRecord) => {
    setEditingSampleId(borehole.id);
    setEditBoreholeId(borehole.borehole_id);
    setEditSampleTopDepth(
      borehole.sample_top_depth === null || borehole.sample_top_depth === undefined
        ? ""
        : String(borehole.sample_top_depth),
    );
    setEditNValue(borehole.n_value === null || borehole.n_value === undefined ? "" : String(borehole.n_value));
    setEditPiValue(borehole.pi_value === null || borehole.pi_value === undefined ? "" : String(borehole.pi_value));
    setEditGwtDepth(
      borehole.gwt_depth === null || borehole.gwt_depth === undefined ? "" : String(borehole.gwt_depth),
    );
    setEditUnitWeight(
      borehole.unit_weight === null || borehole.unit_weight === undefined ? "" : String(borehole.unit_weight),
    );
    setEditSoilBehavior(
      borehole.soil_behavior === "cohesive" || borehole.soil_behavior === "granular" ? borehole.soil_behavior : "",
    );
    setMessage(null);
  };

  const cancelEditSample = () => {
    setEditingSampleId(null);
    setEditBoreholeId("");
    setEditSampleTopDepth("");
    setEditNValue("");
    setEditPiValue("");
    setEditSoilBehavior("");
    setEditGwtDepth("");
    setEditUnitWeight("");
  };

  const saveEditSample = async () => {
    if (!editingSampleId) {
      return;
    }

    const boreholeId = editBoreholeId.trim();
    if (!boreholeId) {
      setMessage("Borehole ID cannot be empty.");
      setMessageType("error");
      return;
    }

    setIsUpdatingSample(true);
    try {
      const supabase = createSupabaseBrowserClient();
      let error: { message: string } | null = null;
      let affectedRows = 0;
      const piForStore = editSoilBehavior === "granular" ? null : toNullableNumber(editPiValue);
      const extendedUpdate = await supabase
        .from("boreholes")
        .update({
          borehole_id: boreholeId,
          sample_top_depth: toNullableNumber(editSampleTopDepth),
          sample_bottom_depth: null,
          n_value: toNullableNumber(editNValue),
          pi_value: piForStore,
          gwt_depth: toNullableNumber(editGwtDepth),
          unit_weight: toNullableNumber(editUnitWeight),
          soil_behavior: editSoilBehavior === "" ? null : editSoilBehavior,
        })
        .eq("id", editingSampleId)
        .select("id");
      error = extendedUpdate.error ? { message: extendedUpdate.error.message } : null;
      affectedRows = extendedUpdate.data?.length ?? 0;

      if (error && isExtendedBoreholeColumnError(error.message)) {
        const legacyUpdate = await supabase
          .from("boreholes")
          .update({
            borehole_id: boreholeId,
            sample_top_depth: toNullableNumber(editSampleTopDepth),
            sample_bottom_depth: null,
            n_value: toNullableNumber(editNValue),
          })
          .eq("id", editingSampleId)
          .select("id");
        error = legacyUpdate.error ? { message: legacyUpdate.error.message } : null;
        affectedRows = legacyUpdate.data?.length ?? 0;
      }

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      if (affectedRows === 0) {
        setMessage("Sample could not be updated. Please refresh the page and try again.");
        setMessageType("error");
        return;
      }

      if (editingSampleId) {
        upsertBoreholeExtras(authUserId, editingSampleId, {
          piValue: piForStore,
          gwtDepth: toNullableNumber(editGwtDepth),
          unitWeight: toNullableNumber(editUnitWeight),
          soilBehavior: editSoilBehavior === "" ? null : editSoilBehavior,
        });
      }

      setMessage("Sample updated.");
      setMessageType("ok");
      cancelEditSample();
      await refreshProjects();
    } finally {
      setIsUpdatingSample(false);
    }
  };

  const removeSample = async (borehole: BoreholeRecord) => {
    const confirmed = window.confirm(
      `Remove sample ${borehole.borehole_id} (top: ${borehole.sample_top_depth ?? "-"} m)?`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingSampleId(borehole.id);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("boreholes").delete().eq("id", borehole.id);
      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      if (editingSampleId === borehole.id) {
        cancelEditSample();
      }

      removeBoreholeExtras(authUserId, borehole.id);

      setMessage("Sample removed.");
      setMessageType("ok");
      await refreshProjects();
    } finally {
      setDeletingSampleId(null);
    }
  };

  const removeProject = async (project: ProjectRecord, options?: { confirmedByUi?: boolean }) => {
    if (!options?.confirmedByUi) {
      const confirmed = window.confirm(
        [
          `Are you sure you want to remove the project "${project.name}"?`,
          "",
          "This will permanently delete all boreholes, samples, and saved analyses linked to this project.",
          "This cannot be undone.",
        ].join("\n"),
      );
      if (!confirmed) {
        return;
      }
    }

    setDeletingProjectId(project.id);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("projects").delete().eq("id", project.id);
      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      if (activeSelection?.projectId === project.id) {
        clearActiveProjectBorehole();
        setActiveSelection(null);
      }

      setMessage(`Project "${project.name}" removed.`);
      setMessageType("ok");
      await refreshProjects();
    } finally {
      setDeletingProjectId(null);
    }
  };

  const startEditProjectName = (project: ProjectRecord) => {
    setEditProjectName(project.name);
    setIsEditingProjectName(true);
  };

  const cancelEditProjectName = () => {
    setIsEditingProjectName(false);
    setEditProjectName(selectedProject?.name ?? "");
  };

  const saveProjectName = async () => {
    if (!selectedProject) {
      return;
    }

    const nextName = editProjectName.trim();
    if (!nextName) {
      setMessage("Project name cannot be empty.");
      setMessageType("error");
      return;
    }

    if (nextName === selectedProject.name.trim()) {
      setIsEditingProjectName(false);
      return;
    }

    setIsUpdatingProjectName(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("projects").update({ name: nextName }).eq("id", selectedProject.id);
      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      setMessage(`Project renamed to "${nextName}".`);
      setMessageType("ok");
      setIsEditingProjectName(false);
      await refreshProjects();
    } finally {
      setIsUpdatingProjectName(false);
    }
  };

  const openSavedResultDetails = async (resultId: string) => {
    if (!supabaseReady) {
      return;
    }

    setIsLoadingSavedResultDetails(true);
    setSavedResultDetails(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("tool_results")
        .select("id,created_at,tool_slug,tool_title,result_title,borehole_id,unit_system,result_payload")
        .eq("id", resultId)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      if (!data) {
        setMessage("Saved analysis not found.");
        setMessageType("error");
        return;
      }

      setSavedResultDetails(data as SavedToolResultDetails);
      setSavedResultPlotIndex(0);
    } finally {
      setIsLoadingSavedResultDetails(false);
    }
  };

  const closeSavedResultDetails = () => {
    setSavedResultDetails(null);
    setSavedResultPlotIndex(0);
  };

  const loadSavedAnalysisToTool = async (resultId: string) => {
    if (!supabaseReady) {
      setMessage("Supabase is not configured.");
      setMessageType("error");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("tool_results")
      .select("id,tool_slug,unit_system,result_payload")
      .eq("id", resultId)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    if (!data) {
      setMessage("Saved analysis not found.");
      setMessageType("error");
      return;
    }

    if (isToolReportSnapshotPayload(data.result_payload)) {
      setMessage(
        "This record is a saved tool report snapshot. Open the tool and use its Report tab to view it; it cannot be loaded as a calculation.",
      );
      setMessageType("error");
      return;
    }

    const toolSlug = (data.tool_slug ?? "").trim();
    if (!toolSlug) {
      setMessage("This saved item cannot be loaded because the tool slug is missing.");
      setMessageType("error");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "gih:load-saved-analysis",
        JSON.stringify({
          id: data.id,
          toolSlug,
          unitSystem: data.unit_system,
          payload: data.result_payload,
        }),
      );
    }

    router.push(`/tools/${toolSlug}?saved=${encodeURIComponent(data.id)}`);
  };

  const removeSavedResult = async (resultId: string) => {
    const confirmed = window.confirm("Remove this saved record?");
    if (!confirmed) {
      return;
    }

    setDeletingSavedResultId(resultId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: parametersError } = await supabase
        .from("project_parameters")
        .delete()
        .eq("source_result_id", resultId);
      if (parametersError) {
        setMessage(parametersError.message);
        setMessageType("error");
        return;
      }

      const { error } = await supabase.from("tool_results").delete().eq("id", resultId);

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      setSavedResults((current) => current.filter((item) => item.id !== resultId));
      if (savedResultDetails?.id === resultId) {
        setSavedResultDetails(null);
      }
      setMessage("Saved record removed.");
      setMessageType("ok");
      if (selectedProjectId) {
        await refreshProjectParameters(selectedProjectId);
      }
    } finally {
      setDeletingSavedResultId(null);
    }
  };

  if (!supabaseReady) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Supabase is not configured.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <label htmlFor="active-project-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active project
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                id="active-project-select"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={isLoading || projects.length === 0}
                className="min-h-[44px] w-full min-w-0 max-w-xl rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:flex-1"
              >
                {projects.length === 0 ? (
                  <option value="">No projects yet — create one below</option>
                ) : (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                className="btn-base btn-md shrink-0"
                onClick={() => setIsNewProjectOpen((prev) => !prev)}
                disabled={effectiveTier === "none" || subscriptionLoading}
                title={
                  effectiveTier === "none"
                    ? "Upgrade to Bronze or higher to create cloud projects."
                    : undefined
                }
              >
                New Project
              </button>
              <button
                type="button"
                className="btn-base btn-md shrink-0"
                onClick={() => {
                  if (selectedProject) {
                    startEditProjectName(selectedProject);
                  }
                }}
                disabled={!selectedProject || isEditingProjectName || isUpdatingProjectName}
              >
                Edit Project
              </button>
              <button
                type="button"
                className="btn-base btn-md btn-danger shrink-0"
                onClick={() => {
                  if (!selectedProject) {
                    return;
                  }
                  setConfirmRemoveProjectId((current) =>
                    current === selectedProject.id ? null : selectedProject.id,
                  );
                }}
                disabled={!selectedProject || deletingProjectId === selectedProject.id}
              >
                {selectedProject && deletingProjectId === selectedProject.id ? "Removing..." : "Remove Project"}
              </button>
            </div>
            {isLoading ? <p className="text-sm text-slate-600">Loading projects...</p> : null}
          </div>
        </div>

        {isNewProjectOpen ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <form onSubmit={onCreateProject} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Create new project</p>
                <button type="button" className="btn-base px-3 py-1.5 text-xs" onClick={() => setIsNewProjectOpen(false)}>
                  Close
                </button>
              </div>
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
                disabled={
                  effectiveTier === "none" ||
                  (Number.isFinite(tierLimits.maxProjects) && projects.length >= tierLimits.maxProjects)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  {Number.isFinite(tierLimits.maxProjects)
                    ? `${projects.length}/${tierLimits.maxProjects} projects`
                    : `${projects.length} projects (unlimited)`}
                </p>
                <button
                  type="submit"
                  className="btn-base btn-md"
                  disabled={
                    isSavingProject ||
                    effectiveTier === "none" ||
                    (Number.isFinite(tierLimits.maxProjects) && projects.length >= tierLimits.maxProjects)
                  }
                >
                  {isSavingProject ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {selectedProject && confirmRemoveProjectId === selectedProject.id ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 text-sm text-red-900">
                <p className="font-semibold">Remove project &quot;{selectedProject.name}&quot;?</p>
                <p className="text-red-800">
                  This will permanently delete all boreholes, samples, and saved analyses linked to this project. This
                  cannot be undone.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-base px-3 py-1.5 text-xs"
                  onClick={() => setConfirmRemoveProjectId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-base border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                  onClick={() => {
                    setConfirmRemoveProjectId(null);
                    void removeProject(selectedProject, { confirmedByUi: true });
                  }}
                  disabled={deletingProjectId === selectedProject.id}
                >
                  {deletingProjectId === selectedProject.id ? "Removing..." : "Remove permanently"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
          {message ? (
            <div
              className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                messageType === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          ) : null}
          {selectedProject ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {isEditingProjectName ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={editProjectName}
                        onChange={(event) => setEditProjectName(event.target.value)}
                        placeholder="Project name"
                        className="w-full max-w-[340px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      />
                      <button
                        type="button"
                        className="btn-base px-3 py-1.5 text-xs"
                        onClick={() => {
                          void saveProjectName();
                        }}
                        disabled={isUpdatingProjectName}
                      >
                        {isUpdatingProjectName ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        className="btn-base px-3 py-1.5 text-xs"
                        onClick={cancelEditProjectName}
                        disabled={isUpdatingProjectName}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">{selectedProject.name}</h3>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-base btn-md" onClick={() => setActiveSelectedBoreholes(selectedProject)}>
                  Use Selected in Tools
                </button>
                <button type="button" className="btn-base btn-md" onClick={() => setActiveProject(selectedProject)}>
                  Use Project in Tools
                </button>
              </div>

              {activeSelection ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Active in Tools: <span className="font-semibold">{activeSelection.projectName}</span>
                  {activeSelection.selectedBoreholes && activeSelection.selectedBoreholes.length > 1 ? (
                    <>
                      {" - "}
                      <span className="font-semibold">{activeSelection.selectedBoreholes.length} samples</span>
                    </>
                  ) : activeSelection.boreholeLabel ? (
                    <>
                      {" - "}
                      <span className="font-semibold">{activeSelection.boreholeLabel}</span>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                <div
                  className="grid grid-cols-2 gap-2 lg:grid-cols-3 sm:gap-4"
                  role="tablist"
                  aria-label="Project workspace"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeProjectsView === "boreholes"}
                    onClick={() => setActiveProjectsView("boreholes")}
                    className={`flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center shadow-sm transition sm:min-h-[5rem] sm:px-5 sm:py-4 ${
                      activeProjectsView === "boreholes"
                        ? "border-slate-800/20 bg-white ring-2 ring-slate-800/10"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                      Boreholes
                    </span>
                    {activeProjectsView === "boreholes" ? (
                      <span className="text-xs font-medium text-emerald-700">Active</span>
                    ) : (
                      <span className="text-xs text-slate-400" aria-hidden>
                        Open
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeProjectsView === "saved"}
                    onClick={() => setActiveProjectsView("saved")}
                    className={`flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center shadow-sm transition sm:min-h-[5rem] sm:px-5 sm:py-4 ${
                      activeProjectsView === "saved"
                        ? "border-slate-800/20 bg-white ring-2 ring-slate-800/10"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                      Saved Analyses
                      <span className="tabular-nums"> ({savedResults.length})</span>
                    </span>
                    {activeProjectsView === "saved" ? (
                      <span className="text-xs font-medium text-emerald-700">Active</span>
                    ) : (
                      <span className="text-xs text-slate-400" aria-hidden>
                        Open
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeProjectsView === "matrix"}
                    onClick={() => setActiveProjectsView("matrix")}
                    className={`flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center shadow-sm transition sm:min-h-[5rem] sm:px-5 sm:py-4 ${
                      activeProjectsView === "matrix"
                        ? "border-slate-800/20 bg-white ring-2 ring-slate-800/10"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                      Integrated Parameter Matrix
                      <span className="tabular-nums"> ({integratedMatrixRows.length})</span>
                    </span>
                    {activeProjectsView === "matrix" ? (
                      <span className="text-xs font-medium text-emerald-700">Active</span>
                    ) : (
                      <span className="text-xs text-slate-400" aria-hidden>
                        Open
                      </span>
                    )}
                  </button>
                </div>

                {activeProjectsView === "boreholes" ? (
                  <div
                    ref={boreholesSectionRef}
                    className="flex min-h-[min(75vh,900px)] flex-col overflow-hidden rounded-2xl border-2 border-slate-900/12 bg-white shadow-md"
                  >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Boreholes</h3>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">
                        <input
                          type="checkbox"
                          checked={
                            visibleBoreholes.length > 0 && visibleBoreholes.every((sample) => selectedSampleIds.includes(sample.id))
                          }
                          onChange={() => toggleSelectAllSamples(visibleBoreholes)}
                          aria-label="Select all samples"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">Borehole ID</th>
                      <th className="px-3 py-2 text-left font-semibold">Sample depth</th>
                      <th className="px-3 py-2 text-left font-semibold">N value</th>
                      <th className="px-3 py-2 text-left font-semibold">Soil (optional)</th>
                      <th className="px-3 py-2 text-left font-semibold">PI (%)</th>
                      <th className="px-3 py-2 text-left font-semibold">GWT (m)</th>
                      <th className="px-3 py-2 text-left font-semibold">Unit Weight (kN/m3)</th>
                      <th className="px-3 py-2 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBoreholes.map((borehole) => {
                      const isEditing = editingSampleId === borehole.id;
                      const isDeleting = deletingSampleId === borehole.id;
                      return (
                        <tr key={borehole.id} className="border-t border-slate-200 bg-white">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedSampleIds.includes(borehole.id)}
                              onChange={() => toggleSampleSelection(borehole.id)}
                              aria-label={`Select ${borehole.borehole_id}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                value={editBoreholeId}
                                onChange={(event) => setEditBoreholeId(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                              />
                            ) : (
                              borehole.borehole_id
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                value={editSampleTopDepth}
                                onChange={(event) => setEditSampleTopDepth(event.target.value)}
                                type="number"
                                step="0.1"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                              />
                            ) : (
                              borehole.sample_top_depth ?? "-"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                value={editNValue}
                                onChange={(event) => setEditNValue(event.target.value)}
                                type="number"
                                step="0.1"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                              />
                            ) : (
                              borehole.n_value ?? "-"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <select
                                value={editSoilBehavior}
                                onChange={(event) => {
                                  const next = event.target.value as "" | "cohesive" | "granular";
                                  setEditSoilBehavior(next);
                                  if (next === "granular") {
                                    setEditPiValue("");
                                  }
                                }}
                                className="w-full max-w-[140px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                              >
                                <option value="">—</option>
                                <option value="cohesive">Cohesive</option>
                                <option value="granular">Granular</option>
                              </select>
                            ) : borehole.soil_behavior === "cohesive" ? (
                              "Cohesive"
                            ) : borehole.soil_behavior === "granular" ? (
                              "Granular"
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                value={editPiValue}
                                onChange={(event) => setEditPiValue(event.target.value)}
                                type="number"
                                step="0.1"
                                disabled={editSoilBehavior === "granular"}
                                title={editSoilBehavior === "granular" ? "PI is not used for granular soils." : undefined}
                                className={`w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500 ${
                                  editSoilBehavior === "granular" ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""
                                }`}
                              />
                            ) : (
                              borehole.pi_value ?? "-"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                value={editGwtDepth}
                                onChange={(event) => setEditGwtDepth(event.target.value)}
                                type="number"
                                step="0.1"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                              />
                            ) : (
                              borehole.gwt_depth ?? "-"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                value={editUnitWeight}
                                onChange={(event) => setEditUnitWeight(event.target.value)}
                                type="number"
                                step="0.1"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                              />
                            ) : (
                              borehole.unit_weight ?? "-"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <div className="flex flex-nowrap gap-2">
                                <button
                                  type="button"
                                  className="btn-base px-3 py-1.5 text-xs"
                                  onClick={() => {
                                    void saveEditSample();
                                  }}
                                  disabled={isUpdatingSample}
                                >
                                  {isUpdatingSample ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  className="btn-base px-3 py-1.5 text-xs"
                                  onClick={cancelEditSample}
                                  disabled={isUpdatingSample}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-nowrap gap-2">
                                <button
                                  type="button"
                                  className="btn-base px-3 py-1.5 text-xs"
                                  onClick={() => startEditSample(borehole)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-base px-3 py-1.5 text-xs"
                                  onClick={() => {
                                    void removeSample(borehole);
                                  }}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? "Removing..." : "Remove"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {visibleBoreholes.length === 0 ? (
                      <tr className="border-t border-slate-200 bg-white">
                        <td colSpan={9} className="px-3 py-3 text-sm text-slate-600">
                          No boreholes in this project yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <details ref={addSampleFormRef} open className="rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    <span>Add borehole sample</span>
                    <span className="text-xs font-normal text-slate-500">Show / hide</span>
                  </span>
                </summary>
                <div className="border-t border-slate-200 px-3 pb-3">
                <p className="mt-2 text-xs text-slate-600">
                  For a <span className="font-medium text-slate-800">new</span> borehole, enter Borehole ID, GWT, and
                  unit weight here. For an <span className="font-medium text-slate-800">existing</span> borehole, pick
                  the ID and those fields fill from the project; add further sample depths below.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {Number.isFinite(tierLimits.maxBoreholesPerProject)
                    ? `${distinctBoreholeCount}/${tierLimits.maxBoreholesPerProject} boreholes in this project`
                    : `${distinctBoreholeCount} boreholes (unlimited)`}
                  {Number.isFinite(tierLimits.maxBoreholesPerProject) &&
                  distinctBoreholeCount >= tierLimits.maxBoreholesPerProject
                    ? " — new borehole IDs are not allowed; add samples under an existing ID."
                    : null}
                </p>
                <form onSubmit={onAddBorehole} className="mt-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {/* Order: Borehole → ID → GWT → Unit weight → Sample depth → Soil type → N → PI */}
                  <select
                    value={boreholeEntryMode}
                    onChange={(event) => {
                      const mode = event.target.value as "new" | "existing";
                      setBoreholeEntryMode(mode);
                      if (mode === "new") {
                        setNewGwtDepth("");
                        setNewUnitWeight("");
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                    aria-label="New or existing borehole"
                  >
                    <option
                      value="new"
                      disabled={
                        Number.isFinite(tierLimits.maxBoreholesPerProject) &&
                        distinctBoreholeCount >= tierLimits.maxBoreholesPerProject
                      }
                    >
                      New Borehole ID
                    </option>
                    <option value="existing" disabled={!existingBoreholeIds.length}>
                      Existing Borehole ID
                    </option>
                  </select>
                  {boreholeEntryMode === "existing" ? (
                    <select
                      value={existingBoreholeId}
                      onChange={(event) => setExistingBoreholeId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                      aria-label="Borehole ID"
                    >
                      {existingBoreholeIds.length === 0 ? <option value="">No existing boreholes</option> : null}
                      {existingBoreholeIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={newBoreholeId}
                      onChange={(event) => setNewBoreholeId(event.target.value)}
                      placeholder="Borehole ID"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                    />
                  )}
                  <input
                    value={newGwtDepth}
                    onChange={(event) => setNewGwtDepth(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="GWT (m)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  />
                  <input
                    value={newUnitWeight}
                    onChange={(event) => setNewUnitWeight(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="Unit Weight (kN/m3)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  />
                  <input
                    value={newSampleTopDepth}
                    onChange={(event) => setNewSampleTopDepth(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="Sample depth (m)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  />
                  <select
                    value={newSoilBehavior}
                    onChange={(event) => {
                      const next = event.target.value as "" | "cohesive" | "granular";
                      setNewSoilBehavior(next);
                      if (next === "granular") {
                        setNewPiValue("");
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                    aria-label="Soil behaviour (optional)"
                  >
                    <option value="">Soil: not set</option>
                    <option value="cohesive">Cohesive</option>
                    <option value="granular">Granular</option>
                  </select>
                  <input
                    value={newNValue}
                    onChange={(event) => setNewNValue(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="N value"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  />
                  <input
                    value={newPiValue}
                    onChange={(event) => setNewPiValue(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="PI (%)"
                    disabled={newSoilBehavior === "granular"}
                    title={newSoilBehavior === "granular" ? "PI is not used for granular soils." : undefined}
                    className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500 ${
                      newSoilBehavior === "granular" ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""
                    }`}
                  />
                </div>
                <div className="mt-3">
                  <button
                    type="submit"
                    className="btn-base btn-md"
                    disabled={
                      isSavingBorehole ||
                      effectiveTier === "none" ||
                      subscriptionLoading ||
                      (() => {
                        const proposal = (boreholeEntryMode === "new" ? newBoreholeId : existingBoreholeId).trim();
                        if (!proposal) {
                          return false;
                        }
                        return !validateBoreholeSampleAdd(selectedProject?.boreholes ?? [], proposal, tierLimits).ok;
                      })()
                    }
                  >
                    {isSavingBorehole ? "Saving..." : "Add Sample"}
                  </button>
                </div>
                </form>
                </div>
              </details>
                    </div>
                  </div>
                ) : null}

                {activeProjectsView === "saved" ? (
                  <div
                    ref={analysesSectionRef}
                    className="flex min-h-[min(75vh,900px)] flex-col overflow-hidden rounded-2xl border-2 border-slate-900/12 bg-white shadow-md"
                  >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Saved Analyses</h3>
                      <button
                        type="button"
                        className="btn-base px-3 py-1.5 text-xs"
                        onClick={() => {
                          void refreshSavedResults(selectedProject.id);
                        }}
                        disabled={isLoadingSavedResults}
                      >
                        {isLoadingSavedResults ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">

                {isLoadingSavedResults ? (
                  <p className="mt-2 text-sm text-slate-600">Loading saved analyses...</p>
                ) : savedResults.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    No saved analyses yet. Use &quot;Save Analysis to Project&quot; in tool profile tabs.
                  </p>
                ) : (
                  <div className="mt-3 min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full table-fixed border-collapse text-sm">
                      <colgroup>
                        <col className="w-[7.25rem] sm:w-[8rem]" />
                        <col />
                        <col className="w-[14rem] sm:w-[16.5rem]" />
                      </colgroup>
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Saved at</th>
                          <th className="min-w-0 px-3 py-2 text-left font-semibold">Tool</th>
                          <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-2.5">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedResults.map((result) => (
                          <tr key={result.id} className="border-t border-slate-200">
                            <td
                              className="px-3 py-2 align-top text-slate-700"
                              title={
                                result.created_at ? new Date(result.created_at).toLocaleString("en-GB") : undefined
                              }
                            >
                              {result.created_at ? (
                                <div className="flex flex-col gap-0.5 leading-tight tabular-nums">
                                  <span>{new Date(result.created_at).toLocaleDateString("en-GB")}</span>
                                  <span className="text-slate-500">
                                    {new Date(result.created_at).toLocaleTimeString("en-GB")}
                                  </span>
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="min-w-0 max-w-0 px-3 py-2 align-top text-slate-900">
                              <div className="truncate" title={result.tool_title ?? undefined}>
                                {result.tool_title ?? "-"}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top sm:px-2.5">
                              <div className="flex flex-wrap justify-end gap-1 sm:flex-nowrap sm:justify-end sm:gap-1.5">
                                <button
                                  type="button"
                                  className="btn-base !rounded-md !border !px-2 !py-1 !text-[11px] !font-semibold !leading-tight !shadow-sm sm:!px-2.5 sm:!py-1 sm:!text-xs"
                                  onClick={() => {
                                    void openSavedResultDetails(result.id);
                                  }}
                                  disabled={isLoadingSavedResultDetails}
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="btn-base !rounded-md !border !px-2 !py-1 !text-[11px] !font-semibold !leading-tight !shadow-sm sm:!px-2.5 sm:!py-1 sm:!text-xs"
                                  onClick={() => {
                                    void loadSavedAnalysisToTool(result.id);
                                  }}
                                  title="Load analysis into the tool"
                                >
                                  Load to Tool
                                </button>
                                <button
                                  type="button"
                                  className="btn-base !rounded-md !border !px-2 !py-1 !text-[11px] !font-semibold !leading-tight !shadow-sm sm:!px-2.5 sm:!py-1 sm:!text-xs"
                                  onClick={() => {
                                    void removeSavedResult(result.id);
                                  }}
                                  disabled={deletingSavedResultId === result.id}
                                >
                                  {deletingSavedResultId === result.id ? "Removing..." : "Remove"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                    </div>
                  </div>
                ) : null}

                {activeProjectsView === "matrix" ? (
                  <div
                    ref={matrixSectionRef}
                    className="flex min-h-[min(75vh,900px)] flex-col overflow-hidden rounded-2xl border-2 border-slate-900/12 bg-white shadow-md"
                  >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Integrated Parameter Matrix</h3>
                      <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-base px-3 py-1.5 text-xs"
                      onClick={() => {
                        void refreshProjectParameters(selectedProject.id);
                      }}
                      disabled={isLoadingProjectParameters}
                    >
                      {isLoadingProjectParameters ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      type="button"
                      className="btn-base px-3 py-1.5 text-xs"
                      onClick={exportIntegratedMatrixExcel}
                      disabled={!selectedProject || integratedMatrixRows.length === 0}
                      title={integratedMatrixRows.length === 0 ? "Matrix is empty." : undefined}
                    >
                      Export Excel
                    </button>
                    <button
                      type="button"
                      className={`${AI_ANALYZE_BUTTON_CLASS} !w-auto shrink-0 !min-h-[2.25rem] !px-3 !py-1.5 !text-xs`}
                      onClick={() => {
                        void generateIntegratedMatrixAiReport();
                      }}
                      disabled={
                        !reportReady ||
                        isGeneratingMatrixAiReport ||
                        !tierAllowsAiAnalysis(effectiveTier) ||
                        subscriptionLoading ||
                        matrixGenerationsExhausted
                      }
                      title={
                        !tierAllowsAiAnalysis(effectiveTier)
                          ? "Gold membership required for AI engineering report from the integrated matrix."
                          : matrixGenerationsExhausted
                            ? `Weekly limit reached (${MATRIX_AI_REPORTS_PER_WEEK} matrix reports for Gold; resets Monday Europe/Istanbul).`
                            : !reportReady
                              ? "Save analyses and build the matrix first."
                              : "Generate AI geotechnical interpretation (Gold; admins uncapped; others weekly limit applies)."
                      }
                    >
                      {isGeneratingMatrixAiReport ? "Generating report..." : "Generate report"}
                    </button>
                  </div>
                </div>
                {tierAllowsAiAnalysis(effectiveTier) && matrixAiWeeklyQuota.loaded && !matrixAiWeeklyQuota.isAdmin ? (
                  <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] leading-snug text-slate-600">
                    Matrix AI report (Gold):{" "}
                    <span className="font-semibold text-slate-800">{matrixAiWeeklyQuota.remaining}</span> /{" "}
                    {MATRIX_AI_REPORTS_PER_WEEK} remaining this week (resets Monday, Europe/Istanbul).
                  </p>
                ) : tierAllowsAiAnalysis(effectiveTier) && matrixAiWeeklyQuota.loaded && matrixAiWeeklyQuota.isAdmin ? (
                  <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] leading-snug text-slate-600">
                    Matrix AI report: administrator account — no weekly generation limit.
                  </p>
                ) : null}

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {isLoadingProjectParameters ? (
                  <p className="mt-2 text-sm text-slate-600">Loading integrated parameters...</p>
                ) : integratedMatrixRows.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    No integrated rows yet. Save profile analyses from tools to build this matrix.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="min-w-max border-collapse text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">#</th>
                            <th className="px-3 py-2 text-left font-semibold">Borehole ID</th>
                            <th className="px-3 py-2 text-left font-semibold">Soil behaviour</th>
                            <th className="px-3 py-2 text-left font-semibold">Sample depth</th>
                            {PARAMETER_COLUMN_ORDER.map((code) => (
                              <th key={code} className="px-3 py-2 text-left font-semibold">
                                <ParameterHeader code={code} />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {integratedMatrixRows.map((row, index) => (
                            <tr
                              key={`${row.boreholeLabel}-${row.sampleDepth ?? "na"}`}
                              className="border-t border-slate-200"
                            >
                              <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                              <td className="px-3 py-2 text-slate-900">{row.boreholeLabel}</td>
                              <td className="px-3 py-2 text-slate-700">{formatSoilBehaviorLabel(row.soilBehavior)}</td>
                              <td className="px-3 py-2 text-slate-700">
                                {row.sampleDepth === null ? "-" : row.sampleDepth}
                              </td>
                              {PARAMETER_COLUMN_ORDER.map((code) => (
                                <td
                                  key={`${row.boreholeLabel}-${row.sampleDepth ?? "na"}-${code}`}
                                  className="px-3 py-2 text-slate-700"
                                >
                                  {row.values[code] ?? "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {integratedMatrixAiReport ? (
                      <div className="mt-4 rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50/95 to-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="text-sm font-bold uppercase tracking-[0.06em] text-amber-950">
                            AI engineering interpretation
                          </h4>
                          <button
                            type="button"
                            className="btn-base shrink-0 px-2 py-1 text-[11px] text-slate-700"
                            onClick={() => {
                              if (authUserId && selectedProjectId) {
                                try {
                                  localStorage.removeItem(matrixAiReportStorageKey(authUserId, selectedProjectId));
                                } catch {
                                  /* ignore */
                                }
                              }
                              setIntegratedMatrixAiReport(null);
                              setMatrixAiReportTruncated(false);
                              setMatrixReportDataStale(false);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                        {matrixReportDataStale ? (
                          <p className="mt-2 rounded-lg border border-amber-500/70 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
                            The integrated matrix changed after this report was saved. For up-to-date data, use
                            &quot;Generate report&quot; again.
                          </p>
                        ) : null}
                        {matrixAiReportTruncated ? (
                          <p className="mt-2 rounded-lg border border-amber-400/70 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
                            Output may have been truncated at the model length limit. Scroll down for the full text; if
                            needed, try &quot;Generate report&quot; again (you can increase{" "}
                            <code className="rounded bg-white/80 px-1">GEMINI_MATRIX_MAX_OUTPUT_TOKENS</code> in the
                            environment).
                          </p>
                        ) : null}
                        <div className="mt-3 max-h-[min(88vh,1200px)] min-h-[12rem] overflow-y-auto scroll-smooth rounded-lg border border-slate-200/80 bg-white/60 p-3 text-left text-sm leading-relaxed shadow-inner">
                          <IntegratedMatrixAiReportBody content={integratedMatrixAiReport} />
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
                </div>
                </div>
                ) : null}
              </div>
            </div>

          ) : (
            <p className="text-sm text-slate-600">Select or create a project to manage boreholes.</p>
          )}
        </section>

      {savedResultDetails && typeof document !== "undefined"
        ? createPortal(
            <div
              className="flex items-start justify-center p-4"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                background: "rgba(15, 23, 42, 0.55)",
                overflowY: "auto",
              }}
              onClick={closeSavedResultDetails}
              role="dialog"
              aria-modal="true"
              aria-label={
                isToolReportSnapshotPayload(savedResultDetails.result_payload)
                  ? "Saved report details"
                  : "Saved analysis details"
              }
            >
              <div
                className="my-4 flex w-full max-w-[900px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
                style={{
                  minHeight: "70vh",
                  maxHeight: "88vh",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">
                      {isToolReportSnapshotPayload(savedResultDetails.result_payload)
                        ? "Saved Report Details"
                        : "Saved Analysis Details"}
                    </h4>
                    <p className="text-sm text-slate-600">{savedResultDetails.tool_title ?? "-"}</p>
                  </div>
                  <button type="button" className="btn-base px-3 py-1.5 text-xs" onClick={closeSavedResultDetails}>
                    Close
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: "contain" }}>
                  {(() => {
                    const rawPayload = savedResultDetails.result_payload;
                    if (isToolReportSnapshotPayload(rawPayload)) {
                      const slug =
                        (savedResultDetails.tool_slug ?? "").trim() || (rawPayload.toolSlug ?? "").trim() || "";
                      return (
                        <section className="mx-auto w-full max-w-[820px] space-y-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            <p>Saved at: {new Date(savedResultDetails.created_at).toLocaleString("en-GB")}</p>
                            <p>Tool: {savedResultDetails.tool_title ?? "-"}</p>
                          </div>
                          {slug ? (
                            <Link
                              href={`/tools/${slug}`}
                              className="inline-flex text-sm font-semibold text-slate-800 underline decoration-slate-400 underline-offset-2 hover:text-slate-950"
                            >
                              Open this tool
                            </Link>
                          ) : null}
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                              AI interpretation
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                              {rawPayload.aiText || "—"}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Narrative</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                              {rawPayload.narrative || "—"}
                            </p>
                          </div>
                        </section>
                      );
                    }

                    const payload = rawPayload as
                      | {
                          profileSnapshot?: {
                            plots?: Array<{ dataUrl?: string; title?: string; width?: number; height?: number }>;
                          };
                        }
                      | null;

                    if (!payload || typeof payload !== "object") {
                      return <p className="text-sm text-slate-600">No preview data available.</p>;
                    }

                    const plots = Array.isArray(payload.profileSnapshot?.plots) ? payload.profileSnapshot.plots : [];

                    const activePlot =
                      plots.length > 0
                        ? plots[Math.min(savedResultPlotIndex, Math.max(plots.length - 1, 0))]
                        : null;
                    const savedPlotWidth =
                      typeof activePlot?.width === "number" && Number.isFinite(activePlot.width) && activePlot.width > 0
                        ? activePlot.width
                        : 720;
                    const savedPlotHeight =
                      typeof activePlot?.height === "number" && Number.isFinite(activePlot.height) && activePlot.height > 0
                        ? activePlot.height
                        : 460;
                    const viewPlotWidth = Math.min(760, Math.max(680, savedPlotWidth));
                    const viewPlotHeight = Math.min(500, Math.max(420, Math.round((viewPlotWidth * savedPlotHeight) / savedPlotWidth)));

                    return (
                      <section className="mx-auto w-full max-w-[820px] space-y-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <p>Saved at: {new Date(savedResultDetails.created_at).toLocaleString("en-GB")}</p>
                          <p>Tool: {savedResultDetails.tool_title ?? "-"}</p>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">Saved Plot</p>
                            {plots.length > 1 ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="btn-base px-2.5 py-1 text-xs"
                                  onClick={() => setSavedResultPlotIndex((current) => Math.max(0, current - 1))}
                                  disabled={savedResultPlotIndex <= 0}
                                >
                                  Previous
                                </button>
                                <span className="text-xs text-slate-600">
                                  {savedResultPlotIndex + 1} / {plots.length}
                                </span>
                                <button
                                  type="button"
                                  className="btn-base px-2.5 py-1 text-xs"
                                  onClick={() =>
                                    setSavedResultPlotIndex((current) => Math.min(plots.length - 1, current + 1))
                                  }
                                  disabled={savedResultPlotIndex >= plots.length - 1}
                                >
                                  Next
                                </button>
                              </div>
                            ) : null}
                          </div>

                          {plots.length === 0 || !activePlot ? (
                            <p className="mt-2 text-sm text-slate-600">No saved plot image in this record.</p>
                          ) : (
                            <div
                              className="mt-3 mx-auto rounded-md border border-slate-200 bg-slate-50 p-2"
                              style={{ width: `${viewPlotWidth}px`, maxWidth: "100%" }}
                            >
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                {activePlot.title ?? `Plot ${savedResultPlotIndex + 1}`}
                              </p>
                              {activePlot.dataUrl ? (
                                <img
                                  src={activePlot.dataUrl}
                                  alt={activePlot.title ?? `Saved plot ${savedResultPlotIndex + 1}`}
                                  className="rounded border border-slate-200 bg-white"
                                  style={{
                                    width: `${viewPlotWidth}px`,
                                    height: `${viewPlotHeight}px`,
                                    maxWidth: "100%",
                                    objectFit: "contain",
                                    imageRendering: "-webkit-optimize-contrast",
                                  }}
                                />
                              ) : (
                                <p className="text-xs text-slate-500">Plot image unavailable.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })()}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

    </div>
  );
}
