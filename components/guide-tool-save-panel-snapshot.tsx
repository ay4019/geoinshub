import Link from "next/link";

/**
 * Static replica of the profile “Save Profile Analysis” card (success state) for
 * `/guide-capture/tool-save-panel` — user guide screenshots only.
 */
export function GuideToolSavePanelSnapshot() {
  return (
    <div
      data-guide-capture="tool-save-panel"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Save Profile Analysis</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Save current profile inputs and plot images to the active project folder.
      </p>
      <p className="mt-2 text-sm text-slate-500">Target: Trial 1 / BH-01</p>
      <p className="mt-1 text-sm text-slate-500">Active imported samples: 20</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="btn-base inline-flex cursor-default px-4 py-2 text-sm">Save Analysis to Project</span>
      </div>
      <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900">
        <p>
          Profile analysis saved. Captured 25 input fields, 2 tables, and 1 plot images. Indexed 18 parameters.
        </p>
        <div className="mt-3">
          <Link href="/account" className="btn-base inline-flex px-4 py-2 text-sm">
            Go to Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
