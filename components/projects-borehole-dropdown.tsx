"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  clearActiveProjectBorehole,
  mergeBoreholeExtrasIntoRows,
  readActiveProjectBorehole,
  type BoreholeRecord,
  type ProjectRecord,
  writeActiveProjectBorehole,
} from "@/lib/project-boreholes";

function normaliseBoreholeLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function groupProjectBoreholes(project: ProjectRecord | null | undefined) {
  const records = project?.boreholes ?? [];
  const map = new Map<string, { displayLabel: string; samples: BoreholeRecord[] }>();
  records.forEach((record) => {
    const displayLabel = record.borehole_id.trim() || "BH not set";
    const key = normaliseBoreholeLabel(displayLabel) || "__empty__";
    const existing = map.get(key);
    if (existing) {
      existing.samples.push(record);
      return;
    }
    map.set(key, { displayLabel, samples: [record] });
  });

  return Array.from(map.values()).map(({ displayLabel, samples }) => {
    const representative =
      [...samples].sort((a, b) => {
        const aTop = a.sample_top_depth ?? Number.POSITIVE_INFINITY;
        const bTop = b.sample_top_depth ?? Number.POSITIVE_INFINITY;
        return aTop - bTop;
      })[0] ?? samples[0];

    return {
      boreholeLabel: displayLabel,
      representative,
      samples,
    };
  });
}

function isExtendedBoreholeColumnError(message: string): boolean {
  return /pi_value|gwt_depth|unit_weight|column/i.test(message);
}

function isMissingBoreholesTableError(message: string): boolean {
  return (
    /relation .*boreholes.* does not exist/i.test(message) ||
    /Could not find the table 'public\.boreholes'/i.test(message) ||
    /table.*boreholes.*schema cache/i.test(message)
  );
}

export function ProjectsBoreholeDropdown() {
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedBoreholeIds, setSelectedBoreholeIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"ok" | "error">("ok");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const groupedBoreholesForSelectedProject = useMemo(() => groupProjectBoreholes(selectedProject), [selectedProject]);
  const selectedBoreholes = groupedBoreholesForSelectedProject.filter((entry) =>
    selectedBoreholeIds.includes(entry.representative.id),
  );

  const loadProjects = async () => {
    if (!supabaseReady) {
      setIsAuthenticated(false);
      setProjects([]);
      return;
    }

    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsAuthenticated(false);
      setProjects([]);
      setSelectedProjectId("");
      setSelectedBoreholeIds([]);
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(true);

    const projectsQuery = await supabase
      .from("projects")
      .select("id,name,created_at")
      .order("created_at", { ascending: false });

    if (projectsQuery.error) {
      setProjects([]);
      setStatusMessage(projectsQuery.error.message);
      setStatusType("error");
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
      .select("id,project_id,borehole_id,sample_top_depth,sample_bottom_depth,n_value,pi_value,gwt_depth,unit_weight,created_at")
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
      boreholes: [...(boreholesByProject.get(project.id) ?? [])].sort((a, b) => {
        const aTop = a.sample_top_depth ?? Number.POSITIVE_INFINITY;
        const bTop = b.sample_top_depth ?? Number.POSITIVE_INFINITY;
        return aTop - bTop;
      }),
    }));

    const stored = readActiveProjectBorehole();
    const hasStoredSelection = Boolean(stored?.projectId);
    const defaultProjectId =
      (stored?.projectId && mappedProjects.some((project) => project.id === stored.projectId) && stored.projectId) ||
      mappedProjects[0]?.id ||
      "";

    const defaultProject = mappedProjects.find((project) => project.id === defaultProjectId) ?? null;
    const defaultGrouped = groupProjectBoreholes(defaultProject);
    const storedSelectedLabels = new Set(
      (stored?.selectedBoreholes ?? [])
        .map((item) => normaliseBoreholeLabel(item.boreholeLabel))
        .filter(Boolean),
    );
    const validStoredSelectedIds = defaultGrouped
      .filter((entry) => storedSelectedLabels.has(normaliseBoreholeLabel(entry.boreholeLabel)))
      .map((entry) => entry.representative.id);
    const fallbackBoreholeId =
      (stored?.boreholeId &&
        defaultProject?.boreholes?.some((borehole) => borehole.id === stored.boreholeId) &&
        stored.boreholeId) ||
      (hasStoredSelection ? defaultGrouped[0]?.representative.id : "") ||
      "";
    const defaultBoreholeIds =
      validStoredSelectedIds.length > 0
        ? validStoredSelectedIds
        : fallbackBoreholeId
            ? [fallbackBoreholeId]
            : [];

    setProjects(mappedProjects);
    setSelectedProjectId(defaultProjectId);
    setSelectedBoreholeIds(defaultBoreholeIds);
    if (boreholesError) {
      setStatusMessage(boreholesError);
      setStatusType("error");
    } else {
      setStatusMessage(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadProjects();
  }, [supabaseReady]);

  useEffect(() => {
    function onActiveSelectionChange() {
      const stored = readActiveProjectBorehole();
      if (!stored) {
        setSelectedBoreholeIds([]);
        return;
      }
      setSelectedProjectId((current) => (current || stored.projectId ? stored.projectId : current));
      const project = projects.find((item) => item.id === stored.projectId) ?? null;
      const grouped = groupProjectBoreholes(project);
      const selectedLabels = new Set(
        (stored.selectedBoreholes ?? [])
          .map((item) => normaliseBoreholeLabel(item.boreholeLabel))
          .filter(Boolean),
      );
      const nextSelectedIds = grouped
        .filter((entry) => selectedLabels.has(normaliseBoreholeLabel(entry.boreholeLabel)))
        .map((entry) => entry.representative.id);
      if (nextSelectedIds.length > 0) {
        setSelectedBoreholeIds(nextSelectedIds);
        return;
      }
      const fallbackId =
        grouped.find((entry) => entry.representative.id === stored.boreholeId)?.representative.id ??
        grouped[0]?.representative.id ??
        "";
      setSelectedBoreholeIds(fallbackId ? [fallbackId] : []);
    }

    window.addEventListener("gih:active-project-changed", onActiveSelectionChange);
    return () => {
      window.removeEventListener("gih:active-project-changed", onActiveSelectionChange);
    };
  }, [projects]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const applySelectionToTools = () => {
    if (!selectedProject) {
      setStatusMessage("Select a project first.");
      setStatusType("error");
      return;
    }

    const selectedEntries = selectedBoreholes;
    if (groupedBoreholesForSelectedProject.length > 0 && selectedEntries.length === 0) {
      setStatusMessage("Select at least one borehole.");
      setStatusType("error");
      return;
    }

    const selectedSamples = selectedEntries
      .flatMap((entry) => entry.samples.map((sample) => ({ ...sample, boreholeLabel: entry.boreholeLabel })))
      .sort((a, b) => {
        const byBorehole = a.boreholeLabel.localeCompare(b.boreholeLabel, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (byBorehole !== 0) {
          return byBorehole;
        }
        const aTop = a.sample_top_depth ?? Number.POSITIVE_INFINITY;
        const bTop = b.sample_top_depth ?? Number.POSITIVE_INFINITY;
        return aTop - bTop;
      });

    const primary = selectedSamples[0] ?? null;

    const payload = {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      boreholeId: primary?.id ?? null,
      boreholeLabel: primary?.boreholeLabel ?? null,
      sampleTopDepth: primary?.sample_top_depth ?? null,
      sampleBottomDepth: primary?.sample_bottom_depth ?? null,
      nValue: primary?.n_value ?? null,
      piValue: (primary as BoreholeRecord & { pi_value?: number | null })?.pi_value ?? null,
      gwtDepth: (primary as BoreholeRecord & { gwt_depth?: number | null })?.gwt_depth ?? null,
      unitWeight: (primary as BoreholeRecord & { unit_weight?: number | null })?.unit_weight ?? null,
      soilBehavior: primary?.soil_behavior ?? null,
      selectedBoreholes: selectedSamples.map((sample) => ({
        boreholeId: sample.id,
        boreholeLabel: sample.boreholeLabel,
        sampleTopDepth: sample.sample_top_depth ?? null,
        sampleBottomDepth: sample.sample_bottom_depth ?? null,
        nValue: sample.n_value ?? null,
        piValue: (sample as BoreholeRecord & { pi_value?: number | null })?.pi_value ?? null,
        gwtDepth: (sample as BoreholeRecord & { gwt_depth?: number | null })?.gwt_depth ?? null,
        unitWeight: (sample as BoreholeRecord & { unit_weight?: number | null })?.unit_weight ?? null,
        soilBehavior: sample.soil_behavior ?? null,
      })),
    };

    writeActiveProjectBorehole(payload);
    setStatusMessage(
      selectedSamples.length > 1
        ? `Active in tools: ${selectedProject.name} / ${selectedSamples.length} samples from ${selectedEntries.length} boreholes`
        : primary
          ? `Active in tools: ${selectedProject.name} / ${primary.boreholeLabel}`
          : `Active in tools: ${selectedProject.name}`,
    );
    setStatusType("ok");
  };

  const clearSelection = () => {
    clearActiveProjectBorehole();
    setSelectedBoreholeIds([]);
    setStatusMessage("Active tool selection cleared.");
    setStatusType("ok");
  };

  const toggleBoreholeSelection = (boreholeId: string) => {
    setSelectedBoreholeIds((current) =>
      current.includes(boreholeId) ? current.filter((id) => id !== boreholeId) : [...current, boreholeId],
    );
  };

  const toggleSelectAllBoreholes = () => {
    const allIds = groupedBoreholesForSelectedProject.map((entry) => entry.representative.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedBoreholeIds.includes(id));
    if (allSelected) {
      setSelectedBoreholeIds([]);
      return;
    }
    setSelectedBoreholeIds(allIds);
  };

  return (
    <div ref={dropdownRef} className="relative ml-auto w-auto shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-[15px] font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-400 hover:bg-slate-50"
        aria-expanded={open}
        aria-controls="projects-borehole-panel"
      >
        <span>Projects and Boreholes</span>
        <svg
          viewBox="0 0 20 20"
          className={`h-2 w-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          id="projects-borehole-panel"
          className="absolute right-0 z-20 mt-2 w-[380px] rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        >
          {!isAuthenticated ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              To add projects/boreholes and use saved records, you need to{" "}
              <Link href="/account?mode=login" className="font-semibold underline underline-offset-4">
                Sign in
              </Link>{" "}
              or{" "}
              <Link href="/account?mode=signup" className="font-semibold underline underline-offset-4">
                Register
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-slate-600">Loading projects...</p>
              ) : projects.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  No projects yet. Create one in{" "}
                  <Link href="/account" className="font-semibold underline underline-offset-4">
                    Account
                  </Link>
                  .
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="project-select" className="mb-1 block text-sm font-medium text-slate-700">
                      Project
                    </label>
                    <select
                      id="project-select"
                      value={selectedProjectId}
                      onChange={(event) => {
                        const nextProjectId = event.target.value;
                        setSelectedProjectId(nextProjectId);
                        setSelectedBoreholeIds([]);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-sm font-medium text-slate-700">Boreholes</label>
                      <button
                        type="button"
                        onClick={toggleSelectAllBoreholes}
                        className="text-xs font-semibold text-slate-700 underline underline-offset-4"
                      >
                        {groupedBoreholesForSelectedProject.length > 0 &&
                        groupedBoreholesForSelectedProject.every((entry) =>
                          selectedBoreholeIds.includes(entry.representative.id),
                        )
                          ? "Clear all"
                          : "Select all"}
                      </button>
                    </div>
                    <div className="max-h-36 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-2">
                      {groupedBoreholesForSelectedProject.length === 0 ? (
                        <p className="px-1 py-1 text-sm text-slate-500">No boreholes in this project</p>
                      ) : (
                        groupedBoreholesForSelectedProject.map((entry) => (
                          <label
                            key={entry.representative.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-800 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBoreholeIds.includes(entry.representative.id)}
                              onChange={() => toggleBoreholeSelection(entry.representative.id)}
                              aria-label={`Select ${entry.boreholeLabel}`}
                            />
                            <span>{entry.boreholeLabel}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Selected: {selectedBoreholes.length} / {groupedBoreholesForSelectedProject.length}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-400 hover:bg-slate-50"
                      onClick={applySelectionToTools}
                    >
                      Use in Tools
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-400 hover:bg-slate-50"
                      onClick={clearSelection}
                    >
                      Clear
                    </button>
                    <Link
                      href="/account"
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-400 hover:bg-slate-50"
                    >
                      Manage
                    </Link>
                  </div>

                </>
              )}

              {statusMessage ? (
                <p
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    statusType === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
