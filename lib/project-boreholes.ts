import type { SoilBehavior } from "@/lib/soil-behavior-policy";

export interface BoreholeRecord {
  id: string;
  project_id: string;
  borehole_id: string;
  sample_top_depth: number | null;
  sample_bottom_depth: number | null;
  n_value: number | null;
  pi_value: number | null;
  gwt_depth: number | null;
  unit_weight: number | null;
  /** From DB or merged browser extras: cohesive vs granular screening. */
  soil_behavior?: SoilBehavior | null;
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
  piValue: number | null;
  gwtDepth: number | null;
  unitWeight: number | null;
  soilBehavior?: SoilBehavior | null;
}

export interface ActiveProjectBorehole {
  projectId: string;
  projectName: string;
  boreholeId: string | null;
  boreholeLabel: string | null;
  sampleTopDepth: number | null;
  sampleBottomDepth: number | null;
  nValue: number | null;
  piValue: number | null;
  gwtDepth: number | null;
  unitWeight: number | null;
  soilBehavior?: SoilBehavior | null;
  selectedBoreholes?: SelectedBoreholeSummary[];
}

export const ACTIVE_PROJECT_BOREHOLE_STORAGE_KEY = "gih.activeProjectBorehole";
export const ACTIVE_PROJECT_TOOL_LOCK_KEY = "gih.activeProjectToolLock";
export const BOREHOLE_EXTRAS_STORAGE_KEY = "gih.boreholeExtras.v1";

type BoreholeExtrasRecord = {
  piValue: number | null;
  gwtDepth: number | null;
  unitWeight: number | null;
  soilBehavior?: SoilBehavior | null;
  updatedAt: number;
};

type BoreholeExtrasByUser = Record<string, Record<string, BoreholeExtrasRecord>>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normaliseUserId(userId: string | null | undefined): string {
  const trimmed = (userId ?? "").trim();
  return trimmed || "__anonymous__";
}

function readAllBoreholeExtrasRaw(): BoreholeExtrasByUser {
  if (!canUseStorage()) {
    return {};
  }
  const raw = window.localStorage.getItem(BOREHOLE_EXTRAS_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as BoreholeExtrasByUser;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllBoreholeExtrasRaw(payload: BoreholeExtrasByUser): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(BOREHOLE_EXTRAS_STORAGE_KEY, JSON.stringify(payload));
}

export function readBoreholeExtrasByUser(userId: string | null | undefined): Record<string, BoreholeExtrasRecord> {
  const userKey = normaliseUserId(userId);
  const all = readAllBoreholeExtrasRaw();
  return all[userKey] ?? {};
}

export function upsertBoreholeExtras(
  userId: string | null | undefined,
  sampleId: string,
  values: {
    piValue?: number | null;
    gwtDepth?: number | null;
    unitWeight?: number | null;
    soilBehavior?: SoilBehavior | null;
  },
): void {
  if (!canUseStorage() || !sampleId) {
    return;
  }

  const userKey = normaliseUserId(userId);
  const all = readAllBoreholeExtrasRaw();
  const userMap = { ...(all[userKey] ?? {}) };
  const previous = userMap[sampleId];

  userMap[sampleId] = {
    piValue: values.piValue ?? previous?.piValue ?? null,
    gwtDepth: values.gwtDepth ?? previous?.gwtDepth ?? null,
    unitWeight: values.unitWeight ?? previous?.unitWeight ?? null,
    soilBehavior: values.soilBehavior !== undefined ? values.soilBehavior : (previous?.soilBehavior ?? null),
    updatedAt: Date.now(),
  };

  all[userKey] = userMap;
  writeAllBoreholeExtrasRaw(all);
}

export function removeBoreholeExtras(
  userId: string | null | undefined,
  sampleId: string,
): void {
  if (!canUseStorage() || !sampleId) {
    return;
  }

  const userKey = normaliseUserId(userId);
  const all = readAllBoreholeExtrasRaw();
  const userMap = { ...(all[userKey] ?? {}) };
  if (!(sampleId in userMap)) {
    return;
  }

  delete userMap[sampleId];
  all[userKey] = userMap;
  writeAllBoreholeExtrasRaw(all);
}

export function mergeBoreholeExtrasIntoRows(
  userId: string | null | undefined,
  rows: BoreholeRecord[],
): BoreholeRecord[] {
  const extras = readBoreholeExtrasByUser(userId);
  if (!rows.length) {
    return rows;
  }

  return rows.map((row) => {
    const fallback = extras[row.id];
    if (!fallback) {
      return row;
    }
    return {
      ...row,
      pi_value: row.pi_value ?? fallback.piValue ?? null,
      gwt_depth: row.gwt_depth ?? fallback.gwtDepth ?? null,
      unit_weight: row.unit_weight ?? fallback.unitWeight ?? null,
      soil_behavior: row.soil_behavior ?? fallback.soilBehavior ?? null,
    };
  });
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
    return {
      ...parsed,
      piValue: parsed.piValue ?? null,
      gwtDepth: parsed.gwtDepth ?? null,
      unitWeight: parsed.unitWeight ?? null,
      soilBehavior: parsed.soilBehavior ?? null,
      selectedBoreholes: (parsed.selectedBoreholes ?? []).map((item) => ({
        ...item,
        piValue: item.piValue ?? null,
        gwtDepth: item.gwtDepth ?? null,
        unitWeight: item.unitWeight ?? null,
        soilBehavior: item.soilBehavior ?? null,
      })),
    };
  } catch {
    return null;
  }
}

export function writeActiveProjectBorehole(payload: ActiveProjectBorehole): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(ACTIVE_PROJECT_BOREHOLE_STORAGE_KEY, JSON.stringify(payload));
  window.localStorage.setItem(ACTIVE_PROJECT_TOOL_LOCK_KEY, "1");
  window.dispatchEvent(new Event("gih:active-project-changed"));
}

export function clearActiveProjectBorehole(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(ACTIVE_PROJECT_BOREHOLE_STORAGE_KEY);
  window.localStorage.removeItem(ACTIVE_PROJECT_TOOL_LOCK_KEY);
  window.dispatchEvent(new Event("gih:active-project-changed"));
}

export function isActiveProjectToolLocked(): boolean {
  if (!canUseStorage()) {
    return false;
  }
  return window.localStorage.getItem(ACTIVE_PROJECT_TOOL_LOCK_KEY) === "1";
}

export function setActiveProjectToolLock(enabled: boolean): void {
  if (!canUseStorage()) {
    return;
  }
  if (enabled) {
    window.localStorage.setItem(ACTIVE_PROJECT_TOOL_LOCK_KEY, "1");
  } else {
    window.localStorage.removeItem(ACTIVE_PROJECT_TOOL_LOCK_KEY);
  }
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
      piValue: selection.piValue,
      gwtDepth: selection.gwtDepth,
      unitWeight: selection.unitWeight,
      soilBehavior: selection.soilBehavior ?? null,
    },
  ];
}
