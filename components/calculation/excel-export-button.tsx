"use client";

import type { ButtonHTMLAttributes } from "react";

import { useSubscription } from "@/components/subscription-context";
import { tierAllowsExcelExport } from "@/lib/subscription";

/** "Export Excel" button that only works for Gold members; everyone else sees a locked Gold badge. */
export function ExcelExportButton({ onClick, disabled, title, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { effectiveTier, loading } = useSubscription();
  const allowed = !loading && tierAllowsExcelExport(effectiveTier);
  return (
    <button
      {...rest}
      className={className}
      onClick={allowed ? onClick : undefined}
      disabled={disabled || !allowed}
      title={allowed ? title : "Excel export is a Gold membership feature"}
      aria-label={allowed ? undefined : "Export Excel (Gold members only)"}
    >
      {children}
      {allowed ? null : (
        <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 align-middle text-amber-800" title="Gold">
          <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
            <path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4Zm2 0h4V5a2 2 0 1 0-4 0v2Z" />
          </svg>
        </span>
      )}
    </button>
  );
}
