"use client";

import { useEffect, useRef, useState } from "react";

import { createDefaultPileModel, normaliseModel, type PileDesignModel } from "@/lib/design-tools/pile-strata";

const STORAGE_KEY = "pile-axial-capacity:model:v2";

function isStoredModel(value: unknown): value is Partial<PileDesignModel> {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PileDesignModel>;
  return Array.isArray(v.layers) && v.layers.length > 0 && typeof v.code === "string" && typeof v.diameter === "number";
}

/**
 * Pile tool state shared by the Soil Strata, Pile Capacity and Report tabs. Lives in ToolCalculator so it survives
 * tab switches; also kept in localStorage as a per-browser convenience (the page works without it).
 */
export function usePileModel(enabled: boolean) {
  const [model, setModel] = useState<PileDesignModel>(createDefaultPileModel);
  const loaded = useRef(false);

  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore from storage after hydration (server renders defaults)
      if (isStoredModel(parsed)) setModel(normaliseModel(parsed));
    } catch {
      // storage unavailable or corrupt: keep defaults
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !loaded.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
    } catch {
      // ignore
    }
  }, [enabled, model]);

  return [model, setModel] as const;
}
