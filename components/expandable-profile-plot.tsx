"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: ReactNode;
  className?: string;
};

export function ExpandableProfilePlot({ children, className }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (open) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100000] flex flex-col bg-slate-900/75 p-2 sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Grafik tam ekran"
        onClick={() => setOpen(false)}
      >
        <div
          className="flex min-h-0 w-full max-w-[min(96vw,72rem)] flex-1 flex-col overflow-hidden self-center rounded-xl bg-white shadow-2xl sm:max-h-[min(96dvh,56rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-end border-b border-slate-200 px-2 py-1.5">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setOpen(false)}
              aria-label="Grafiği kapat"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">{children}</div>
        </div>
      </div>,
      document.body,
    );
  }

  const outer = ["relative w-full min-w-0", className].filter(Boolean).join(" ");

  return (
    <div className={outer}>
      <button
        type="button"
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        onClick={() => setOpen(true)}
        aria-label="Grafiği tam ekranda aç"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path
            d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {children}
    </div>
  );
}
