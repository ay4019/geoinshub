"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { UnitSystem } from "@/lib/types";

interface ToolUnitContextValue {
  unitSystem: UnitSystem;
  setUnitSystem: (value: UnitSystem) => void;
}

const STORAGE_KEY = "gih-tool-unit-system";

const ToolUnitContext = createContext<ToolUnitContextValue | undefined>(undefined);

export function ToolUnitProvider({ children }: { children: React.ReactNode }) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    if (typeof window === "undefined") {
      return "metric";
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "american" ? "american" : "metric";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, unitSystem);
  }, [unitSystem]);

  return <ToolUnitContext.Provider value={{ unitSystem, setUnitSystem }}>{children}</ToolUnitContext.Provider>;
}

export function useToolUnitSystem() {
  const context = useContext(ToolUnitContext);

  if (!context) {
    throw new Error("useToolUnitSystem must be used within ToolUnitProvider.");
  }

  return context;
}

export function ToolUnitToggle({ compact = false }: { compact?: boolean }) {
  const { unitSystem, setUnitSystem } = useToolUnitSystem();

  if (compact) {
    return (
      <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Units</span>
        <div className="relative grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <span
            aria-hidden="true"
            className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-md bg-slate-800 transition-transform duration-200 ${
              unitSystem === "metric" ? "translate-x-0" : "translate-x-full"
            }`}
          />
          <button
            type="button"
            onClick={() => setUnitSystem("metric")}
            className={`relative z-10 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              unitSystem === "metric" ? "text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Metric
          </button>
          <button
            type="button"
            onClick={() => setUnitSystem("american")}
            className={`relative z-10 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              unitSystem === "american" ? "text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            American
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,_#ffffff_0%,_#f6f8fb_100%)] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Unit system</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">Display inputs and results in your preferred standard</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Calculations stay internally consistent while the tool updates the visible units for entry and output.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          {unitSystem === "metric" ? "SI / Metric active" : "US / American active"}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1">
        <span
          aria-hidden="true"
          className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-[10px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition-transform duration-300 ${
            unitSystem === "metric" ? "translate-x-0" : "translate-x-full"
          }`}
        />
        <button
          type="button"
          onClick={() => setUnitSystem("metric")}
          className={`relative z-10 rounded-[10px] px-4 py-3 text-sm font-medium transition-colors ${
            unitSystem === "metric"
              ? "text-slate-900"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Metric
        </button>
        <button
          type="button"
          onClick={() => setUnitSystem("american")}
          className={`relative z-10 rounded-[10px] px-4 py-3 text-sm font-medium transition-colors ${
            unitSystem === "american"
              ? "text-slate-900"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          American
        </button>
      </div>
    </div>
  );
}
