export interface BoreholeRecord {
  id: string;
  project_id: string;
  borehole_id: string;
  sample_top_depth: number | null;
  sample_bottom_depth: number | null;
  n_value: number | null;
  created_at?: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  created_at?: string;
  boreholes?: BoreholeRecord[];
}

export interface SelectedBoreholeSummary {
  boreholeId: string;
  boreholeLabel: string;
  sampleTopDepth: number | null;
  sampleBottomDepth: number | null;
  nValue: number | null;
}

export interface ActiveProjectBorehole {
  projectId: string;
  projectName: string;
  boreholeId: string | null;
  boreholeLabel: string | null;
  sampleTopDepth: number | null;
  sampleBottomDepth: number | null;
  nValue: number | null;
  selectedBoreholes?: SelectedBoreholeSummary[];
}

export const ACTIVE_PROJECT_BOREHOLE_STORAGE_KEY = "gih.activeProjectBorehole";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readActiveProjectBorehole(): ActiveProjectBorehole | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_PROJECT_BOREHOLE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActiveProjectBorehole;
    if (!parsed?.projectId || !parsed?.projectName) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeActiveProjectBorehole(payload: ActiveProjectBorehole): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(ACTIVE_PROJECT_BOREHOLE_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("gih:active-project-changed"));
}

export function clearActiveProjectBorehole(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(ACTIVE_PROJECT_BOREHOLE_STORAGE_KEY);
  window.dispatchEvent(new Event("gih:active-project-changed"));
}

export function getActiveImportBoreholes(
  selection: ActiveProjectBorehole | null | undefined,
): SelectedBoreholeSummary[] {
  if (!selection) {
    return [];
  }

  if (selection.selectedBoreholes && selection.selectedBoreholes.length > 0) {
    return selection.selectedBoreholes;
  }

  if (!selection.boreholeId || !selection.boreholeLabel) {
    return [];
  }

  return [
    {
      boreholeId: selection.boreholeId,
      boreholeLabel: selection.boreholeLabel,
      sampleTopDepth: selection.sampleTopDepth,
      sampleBottomDepth: selection.sampleBottomDepth,
      nValue: selection.nValue,
    },
  ];
}
