"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  clearActiveProjectBorehole,
  readActiveProjectBorehole,
  type ActiveProjectBorehole,
  type BoreholeRecord,
  type ProjectRecord,
  writeActiveProjectBorehole,
} from "@/lib/project-boreholes";

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

const PARAMETER_COLUMN_ORDER = [
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
  "k0_nc",
  "k0_oc",
  "ka",
  "kp",
  "sigma_h0_eff",
];

const PARAMETER_COLUMN_LABELS: Record<string, string> = {
  n: "N",
  n60: "N60",
  n160: "(N1)60",
  cu: "cu (kPa)",
  c_prime: "c' (kPa)",
  phi_prime: "φ' (deg)",
  eu: "Eu (kPa)",
  e_prime: "E' (kPa)",
  ocr: "OCR",
  sigma_v0_eff: "σ'v0 (kPa)",
  gmax: "Gmax (MPa)",
  vs: "Vs (m/s)",
  eoed: "Eoed (MPa)",
  mv: "mv (m²/MN)",
  k0_nc: "K0,NC",
  k0_oc: "K0,OC",
  ka: "Ka",
  kp: "Kp",
  sigma_h0_eff: "σ'h,0 (kPa)",
};

function compareBoreholeIds(a: string, b: string): number {
  return a.trim().localeCompare(b.trim(), undefined, { numeric: true, sensitivity: "base" });
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

  const aBottom = a.sample_bottom_depth ?? Number.POSITIVE_INFINITY;
  const bBottom = b.sample_bottom_depth ?? Number.POSITIVE_INFINITY;
  if (aBottom !== bBottom) {
    return aBottom - bBottom;
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

export function AccountProjectsPanel() {
  const router = useRouter();
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeSelection, setActiveSelection] = useState<ActiveProjectBorehole | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [boreholeEntryMode, setBoreholeEntryMode] = useState<"new" | "existing">("new");
  const [existingBoreholeId, setExistingBoreholeId] = useState("");
  const [newBoreholeId, setNewBoreholeId] = useState("");
  const [newSampleTopDepth, setNewSampleTopDepth] = useState("");
  const [newSampleBottomDepth, setNewSampleBottomDepth] = useState("");
  const [newNValue, setNewNValue] = useState("");
  const [boreholeFilter, setBoreholeFilter] = useState("all");
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
  const [editBoreholeId, setEditBoreholeId] = useState("");
  const [editSampleTopDepth, setEditSampleTopDepth] = useState("");
  const [editSampleBottomDepth, setEditSampleBottomDepth] = useState("");
  const [editNValue, setEditNValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
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
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"ok" | "error">("ok");
  const [pendingJump, setPendingJump] = useState<"boreholes" | "analyses" | null>(null);
  const boreholesSectionRef = useRef<HTMLDivElement | null>(null);
  const analysesSectionRef = useRef<HTMLElement | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const existingBoreholeIds = useMemo(
    () =>
      Array.from(new Set((selectedProject?.boreholes ?? []).map((item) => item.borehole_id).filter(Boolean))).sort(
        compareBoreholeIds,
      ),
    [selectedProject],
  );
  const filteredBoreholes = useMemo(() => {
    const samples = selectedProject?.boreholes ?? [];
    if (boreholeFilter === "all") {
      return samples;
    }
    return samples.filter((sample) => sample.borehole_id === boreholeFilter);
  }, [boreholeFilter, selectedProject]);
  const integratedMatrixRows = useMemo(() => {
    const rowMap = new Map<
      string,
      {
        boreholeLabel: string;
        sampleDepth: number | null;
        values: Record<string, string>;
      }
    >();

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
          sampleDepth,
          values: {},
        });
      }
      const target = rowMap.get(key);
      if (!target) {
        return;
      }
      if (sample.n_value !== null && sample.n_value !== undefined && Number.isFinite(sample.n_value)) {
        const nFormatted =
          Math.abs(sample.n_value) < 1000
            ? sample.n_value.toFixed(3).replace(/\.?0+$/, "")
            : Number(sample.n_value).toLocaleString("en-GB");
        target.values.n = nFormatted;
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
          sampleDepth,
          values: {},
        });
      }

      const target = rowMap.get(key);
      if (!target) {
        return;
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
    if (!existingBoreholeIds.length) {
      setBoreholeEntryMode("new");
      setExistingBoreholeId("");
      return;
    }

    setExistingBoreholeId((current) => current || existingBoreholeIds[0]);
  }, [existingBoreholeIds]);

  useEffect(() => {
    setEditingSampleId(null);
    setEditBoreholeId("");
    setEditSampleTopDepth("");
    setEditSampleBottomDepth("");
    setEditNValue("");
    setSelectedSampleIds([]);
    setBoreholeFilter("all");
    setIsEditingProjectName(false);
    setEditProjectName("");
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }
    setEditProjectName(selectedProject.name);
  }, [selectedProject]);

  useEffect(() => {
    if (boreholeFilter === "all") {
      return;
    }
    if (!existingBoreholeIds.includes(boreholeFilter)) {
      setBoreholeFilter("all");
    }
  }, [boreholeFilter, existingBoreholeIds]);

  useEffect(() => {
    if (!pendingJump || !selectedProject) {
      return;
    }
    const targetRef = pendingJump === "boreholes" ? boreholesSectionRef.current : analysesSectionRef.current;
    if (!targetRef) {
      return;
    }
    targetRef.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingJump(null);
  }, [pendingJump, selectedProject, selectedProjectId, filteredBoreholes.length, savedResults.length]);

  const jumpToProjectSection = (projectId: string, target: "boreholes" | "analyses", boreholeId?: string) => {
    setSelectedProjectId(projectId);
    if (target === "boreholes") {
      setBoreholeFilter(boreholeId ?? "all");
    }
    setPendingJump(target);
  };

  const refreshProjects = async () => {
    if (!supabaseReady) {
      setProjects([]);
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
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id,name,created_at,boreholes(id,project_id,borehole_id,sample_top_depth,sample_bottom_depth,n_value,created_at)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProjects([]);
      setIsLoading(false);
      return;
    }

    const mappedProjects = ((data ?? []) as unknown as ProjectRecord[]).map((project) => ({
      ...project,
      boreholes: [...(project.boreholes ?? [])].sort(boreholeSampleComparator),
    }));

    setProjects(mappedProjects);
    setSelectedProjectId((current) => {
      if (current && mappedProjects.some((project) => project.id === current)) {
        return current;
      }
      return mappedProjects[0]?.id ?? "";
    });
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
        .select("id,created_at,tool_slug,tool_title,result_title,borehole_id,unit_system")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        setSavedResults([]);
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      setSavedResults((data ?? []) as SavedToolResultRecord[]);
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

      const { error } = await supabase.from("boreholes").insert({
        project_id: selectedProjectId,
        user_id: user.id,
        borehole_id: boreholeId,
        sample_top_depth: toNullableNumber(newSampleTopDepth),
        sample_bottom_depth: toNullableNumber(newSampleBottomDepth),
        n_value: toNullableNumber(newNValue),
      });

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      if (boreholeEntryMode === "new") {
        setNewBoreholeId("");
      }
      setBoreholeEntryMode("existing");
      setExistingBoreholeId(boreholeId);
      setNewSampleTopDepth("");
      setNewSampleBottomDepth("");
      setNewNValue("");
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
    setEditSampleBottomDepth(
      borehole.sample_bottom_depth === null || borehole.sample_bottom_depth === undefined
        ? ""
        : String(borehole.sample_bottom_depth),
    );
    setEditNValue(borehole.n_value === null || borehole.n_value === undefined ? "" : String(borehole.n_value));
    setMessage(null);
  };

  const cancelEditSample = () => {
    setEditingSampleId(null);
    setEditBoreholeId("");
    setEditSampleTopDepth("");
    setEditSampleBottomDepth("");
    setEditNValue("");
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
      const { error } = await supabase
        .from("boreholes")
        .update({
          borehole_id: boreholeId,
          sample_top_depth: toNullableNumber(editSampleTopDepth),
          sample_bottom_depth: toNullableNumber(editSampleBottomDepth),
          n_value: toNullableNumber(editNValue),
        })
        .eq("id", editingSampleId);

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
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

      setMessage("Sample removed.");
      setMessageType("ok");
      await refreshProjects();
    } finally {
      setDeletingSampleId(null);
    }
  };

  const removeProject = async (project: ProjectRecord) => {
    const confirmed = window.confirm(
      `Remove project "${project.name}"? This will also remove all boreholes and saved tool results in this project.`,
    );
    if (!confirmed) {
      return;
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
    const confirmed = window.confirm("Remove this saved analysis record?");
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
      setMessage("Saved analysis removed.");
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
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-semibold text-slate-900">Projects</h3>
          <form onSubmit={onCreateProject} className="mt-3 space-y-2">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="New project name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            />
            <button type="submit" className="btn-base btn-md" disabled={isSavingProject}>
              {isSavingProject ? "Creating..." : "Create Project"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {isLoading ? <p className="text-sm text-slate-600">Loading projects...</p> : null}
            {!isLoading && projects.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                No projects yet.
              </p>
            ) : null}

            {projects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              const groupedBoreholes = Array.from(
                (project.boreholes ?? []).reduce<Map<string, number>>((acc, sample) => {
                  const key = sample.borehole_id.trim();
                  acc.set(key, (acc.get(key) ?? 0) + 1);
                  return acc;
                }, new Map()),
              ).sort(([a], [b]) => compareBoreholeIds(a, b));
              return (
                <div key={project.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId((current) => (current === project.id ? "" : project.id))}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-200 ${
                      isSelected
                        ? "border-slate-400 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold">{project.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Set((project.boreholes ?? []).map((item) => item.borehole_id)).size} boreholes -{" "}
                      {project.boreholes?.length ?? 0} samples
                    </p>
                  </button>

                  {isSelected ? (
                    <div className="ml-3 border-l border-slate-200 pl-3">
                      <button
                        type="button"
                        onClick={() => jumpToProjectSection(project.id, "boreholes")}
                        className="block text-left text-xs font-medium text-slate-700 hover:text-slate-900"
                      >
                        - Boreholes ({groupedBoreholes.length})
                      </button>
                      <div className="mt-1 space-y-0.5">
                        {groupedBoreholes.map(([boreholeId, sampleCount]) => (
                          <button
                            key={`${project.id}-${boreholeId}`}
                            type="button"
                            onClick={() => jumpToProjectSection(project.id, "boreholes", boreholeId)}
                            className="block w-full text-left text-xs text-slate-600 hover:text-slate-900"
                          >
                            -- {boreholeId} ({sampleCount} samples)
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => jumpToProjectSection(project.id, "analyses")}
                        className="mt-1 block text-left text-xs font-medium text-slate-700 hover:text-slate-900"
                      >
                        - Saved analyses ({savedResults.length})
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
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
                    <h3 className="text-base font-semibold text-slate-900">{selectedProject.name}</h3>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-base px-3 py-1.5 text-xs"
                    onClick={() => startEditProjectName(selectedProject)}
                    disabled={isEditingProjectName || isUpdatingProjectName}
                  >
                    Edit Project
                  </button>
                  <button
                    type="button"
                    className="btn-base border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    onClick={() => {
                      void removeProject(selectedProject);
                    }}
                    disabled={deletingProjectId === selectedProject.id}
                  >
                    {deletingProjectId === selectedProject.id ? "Removing..." : "Remove Project"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={boreholeFilter}
                  onChange={(event) => setBoreholeFilter(event.target.value)}
                  className="btn-base btn-md min-w-[180px] bg-white text-slate-700"
                  aria-label="Filter by borehole"
                >
                  <option value="all">All Boreholes</option>
                  {existingBoreholeIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
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

              {message ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    messageType === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <div ref={boreholesSectionRef} className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">
                        <input
                          type="checkbox"
                          checked={
                            filteredBoreholes.length > 0 &&
                            filteredBoreholes.every((sample) => selectedSampleIds.includes(sample.id))
                          }
                          onChange={() => toggleSelectAllSamples(filteredBoreholes)}
                          aria-label="Select all samples"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">Borehole ID</th>
                      <th className="px-3 py-2 text-left font-semibold">Sample top depth (m)</th>
                      <th className="px-3 py-2 text-left font-semibold">Sample bottom depth (m)</th>
                      <th className="px-3 py-2 text-left font-semibold">N value</th>
                      <th className="px-3 py-2 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBoreholes.map((borehole) => {
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
                                value={editSampleBottomDepth}
                                onChange={(event) => setEditSampleBottomDepth(event.target.value)}
                                type="number"
                                step="0.1"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                              />
                            ) : (
                              borehole.sample_bottom_depth ?? "-"
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
                              <div className="flex flex-wrap gap-2">
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
                              <div className="flex flex-wrap gap-2">
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
                    {filteredBoreholes.length === 0 ? (
                      <tr className="border-t border-slate-200 bg-white">
                        <td colSpan={6} className="px-3 py-3 text-sm text-slate-600">
                          {boreholeFilter === "all"
                            ? "No boreholes in this project yet."
                            : "No samples found for the selected borehole filter."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <form onSubmit={onAddBorehole} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">Add borehole sample</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={boreholeEntryMode}
                    onChange={(event) => setBoreholeEntryMode(event.target.value as "new" | "existing")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  >
                    <option value="new">New Borehole ID</option>
                    <option value="existing" disabled={!existingBoreholeIds.length}>
                      Existing Borehole ID
                    </option>
                  </select>
                  {boreholeEntryMode === "existing" ? (
                    <select
                      value={existingBoreholeId}
                      onChange={(event) => setExistingBoreholeId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
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
                    value={newSampleTopDepth}
                    onChange={(event) => setNewSampleTopDepth(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="Sample top depth (m)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  />
                  <input
                    value={newSampleBottomDepth}
                    onChange={(event) => setNewSampleBottomDepth(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="Sample bottom depth (m)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  />
                  <input
                    value={newNValue}
                    onChange={(event) => setNewNValue(event.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="N value"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  />
                </div>
                <div className="mt-3">
                  <button type="submit" className="btn-base btn-md" disabled={isSavingBorehole}>
                    {isSavingBorehole ? "Saving..." : "Add Sample"}
                  </button>
                </div>
              </form>

              <section ref={analysesSectionRef} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Saved analyses</p>
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

                {isLoadingSavedResults ? (
                  <p className="mt-2 text-sm text-slate-600">Loading saved analyses...</p>
                ) : savedResults.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    No saved analyses yet. Use &quot;Save Analysis to Project&quot; in tool profile tabs.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-max border-collapse text-sm whitespace-nowrap">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Saved at</th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Tool</th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Title</th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedResults.map((result) => (
                          <tr key={result.id} className="border-t border-slate-200">
                            <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                              {result.created_at ? new Date(result.created_at).toLocaleString("en-GB") : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-900 whitespace-nowrap">{result.tool_title ?? "-"}</td>
                            <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{result.result_title ?? "-"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex flex-nowrap gap-2">
                                <button
                                  type="button"
                                  className="btn-base px-3 py-1.5 text-xs"
                                  onClick={() => {
                                    void openSavedResultDetails(result.id);
                                  }}
                                  disabled={isLoadingSavedResultDetails}
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="btn-base px-3 py-1.5 text-xs"
                                  onClick={() => {
                                    void loadSavedAnalysisToTool(result.id);
                                  }}
                                >
                                  Load to Tool
                                </button>
                                <button
                                  type="button"
                                  className="btn-base px-3 py-1.5 text-xs"
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
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Integrated parameter matrix</p>
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
                </div>

                {isLoadingProjectParameters ? (
                  <p className="mt-2 text-sm text-slate-600">Loading integrated parameters...</p>
                ) : integratedMatrixRows.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    No integrated rows yet. Save profile analyses from tools to build this matrix.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-max border-collapse text-sm whitespace-nowrap">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Borehole ID</th>
                          <th className="px-3 py-2 text-left font-semibold">Sample depth (m)</th>
                          {PARAMETER_COLUMN_ORDER.map((code) => (
                            <th key={code} className="px-3 py-2 text-left font-semibold">
                              {PARAMETER_COLUMN_LABELS[code] ?? code}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {integratedMatrixRows.map((row, index) => (
                          <tr key={`${row.boreholeLabel}-${row.sampleDepth ?? "na"}-${index}`} className="border-t border-slate-200">
                            <td className="px-3 py-2 text-slate-900">{row.boreholeLabel}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {row.sampleDepth === null ? "-" : row.sampleDepth}
                            </td>
                            {PARAMETER_COLUMN_ORDER.map((code) => (
                              <td key={`${code}-${index}`} className="px-3 py-2 text-slate-700">
                                {row.values[code] ?? "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Select or create a project to manage boreholes.</p>
          )}
        </section>
      </div>

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
              aria-label="Saved analysis details"
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
                    <h4 className="text-lg font-semibold text-slate-900">Saved Analysis Details</h4>
                    <p className="text-sm text-slate-600">
                      {savedResultDetails.tool_title ?? "-"} - {savedResultDetails.result_title ?? "-"}
                    </p>
                  </div>
                  <button type="button" className="btn-base px-3 py-1.5 text-xs" onClick={closeSavedResultDetails}>
                    Close
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: "contain" }}>
                  {(() => {
                    const payload = savedResultDetails.result_payload as
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
