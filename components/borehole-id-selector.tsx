"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface BoreholeIdSelectorProps {
  value: string;
  availableIds: string[];
  onChange: (value: string) => void;
}

function normaliseBoreholeId(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function BoreholeIdSelector({ value, availableIds, onChange }: BoreholeIdSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [draftId, setDraftId] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const uniqueIds = useMemo(
    () => Array.from(new Set(availableIds.map(normaliseBoreholeId).filter(Boolean))),
    [availableIds],
  );

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setDraftId("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const buttonLabel = value || (uniqueIds.length === 0 ? "Add BH" : "Select BH");

  const closePanel = () => {
    setIsOpen(false);
    setIsAdding(false);
    setDraftId("");
  };

  const commitNewId = () => {
    const nextId = normaliseBoreholeId(draftId);
    if (!nextId) {
      return;
    }

    onChange(nextId);
    closePanel();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            closePanel();
          } else {
            setIsOpen(true);
          }
        }}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-left text-sm text-slate-900 outline-none transition-colors duration-200 hover:border-slate-400 focus:border-slate-500"
      >
        <span className={value ? "font-medium text-slate-900" : "text-slate-500"}>{buttonLabel}</span>
        <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[240px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
          <div className="mb-3 border-b border-slate-200 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Borehole ID</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {uniqueIds.length === 0
                ? "Create the first borehole identifier for this profile."
                : "Select an existing borehole or add another one."}
            </p>
          </div>

          {uniqueIds.length > 0 ? (
            <div className="space-y-1.5">
              {uniqueIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onChange(id);
                    closePanel();
                  }}
                  className={`block w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 ${
                    value === id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No borehole IDs yet.
            </div>
          )}

          <div className={`${uniqueIds.length > 0 ? "mt-3 border-t border-slate-200 pt-3" : "mt-3"}`}>
            {!isAdding ? (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100"
              >
                {uniqueIds.length === 0 ? "Add BH" : "Add More"}
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={draftId}
                  onChange={(event) => setDraftId(event.target.value)}
                  placeholder="e.g. BH-3"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="button" onClick={commitNewId} className="btn-base flex-1 px-2 py-2 text-sm">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setDraftId("");
                    }}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
