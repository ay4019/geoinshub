"use client";

import { useEffect, useId, useRef } from "react";

import { HardeningSoilFurtherQuestionsContent } from "@/components/hardening-soil-further-questions-content";
import type { InsightArticleBlock } from "@/lib/types";

type DialogBlock = Extract<InsightArticleBlock, { type: "further_reading_dialog" }>;

export function ArticleFurtherReadingDialog({ block }: { block: DialogBlock }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) {
      return;
    }
    const onClose = () => {
      document.body.style.overflow = "";
    };
    node.addEventListener("close", onClose);
    return () => node.removeEventListener("close", onClose);
  }, []);

  const open = () => {
    const node = dialogRef.current;
    if (!node) {
      return;
    }
    document.body.style.overflow = "hidden";
    if (!node.open) {
      node.showModal();
    }
  };

  const close = () => {
    const node = dialogRef.current;
    if (!node) {
      return;
    }
    node.close();
    document.body.style.overflow = "";
  };

  return (
    <div className="not-prose my-2">
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-900 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
      >
        <span aria-hidden>▸</span>
        {block.triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="fixed left-1/2 top-1/2 z-[100] w-[min(100vw-1.5rem,42rem)] max-h-[min(90vh,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl [&::backdrop]:bg-slate-900/45"
      >
        <div className="flex max-h-[min(90vh,40rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900 sm:text-xl">
              {block.dialogTitle}
            </h2>
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {block.preset === "hardening-soil-further-questions" ? <HardeningSoilFurtherQuestionsContent /> : null}
          </div>
        </div>
      </dialog>
    </div>
  );
}
