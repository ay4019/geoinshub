"use client";

import { createContext, useContext } from "react";

import type { UnitSystem } from "@/lib/types";

interface ToolUnitContextValue {
  unitSystem: UnitSystem;
  setUnitSystem: (value: UnitSystem) => void;
}

const ToolUnitContext = createContext<ToolUnitContextValue | undefined>(undefined);

export function ToolUnitProvider({ children }: { children: React.ReactNode }) {
  const value: ToolUnitContextValue = {
    unitSystem: "metric",
    setUnitSystem: () => {
      // Unit switching is archived for now. App stays metric-only.
    },
  };

  return <ToolUnitContext.Provider value={value}>{children}</ToolUnitContext.Provider>;
}

export function useToolUnitSystem() {
  const context = useContext(ToolUnitContext);

  if (!context) {
    throw new Error("useToolUnitSystem must be used within ToolUnitProvider.");
  }

  return context;
}

export function ToolUnitToggle({ compact = false }: { compact?: boolean }) {
  void compact;
  return null;
}
