"use client";

import { useMemo, useState, useTransition } from "react";

import { interpretCuProfileAction } from "@/app/actions/ai-report";

export interface CuProfileReportPoint {
  boreholeId: string;
  depth: number;
  pi: number;
  n60: number;
  f1: number;
  cu: number;
}

interface CuProfileReportTabProps {
  toolTitle: string;
  depthUnit: string;
  stressUnit: string;
  points: CuProfileReportPoint[];
  plotImageDataUrl?: string | null;
}

export function CuProfileReportTab({
  toolTitle,
  depthUnit,
  stressUnit,
  points,
  plotImageDataUrl,
}: CuProfileReportTabProps) {
  const [isPending, startTransition] = useTransition();
  const [reportText, setReportText] = useState<string>("");

  const hasData = useMemo(() => points.length > 0 && Boolean(plotImageDataUrl), [plotImageDataUrl, points.length]);

  const handleInterpret = () => {
    if (!hasData) {
      setReportText("No profile plot is ready yet. Please complete the Soil Profile Plot inputs first.");
      return;
    }

    startTransition(async () => {
      const text = await interpretCuProfileAction({
        toolTitle,
        depthUnit,
        stressUnit,
        points,
        plotImageDataUrl,
      });
      setReportText(text);
    });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">AI Report</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use <span className="font-semibold">Yorumla</span> to interpret the current soil profile plot and table data.
        </p>

        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-base btn-md" onClick={handleInterpret} disabled={isPending}>
            {isPending ? "Yorumlanıyor..." : "Yorumla"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Output</h3>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {reportText || "AI output will appear here after you press Yorumla."}
          </div>
        </div>
      </div>
    </section>
  );
}

