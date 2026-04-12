import { tierUi } from "@/lib/subscription";

/**
 * Static layout for user-guide screenshots only. Renders the Projects shell with
 * Gold tier chrome — see /guide-capture/projects-*.
 */
export function GuideProjectsDashboardSnapshot({ variant }: { variant: "empty" | "active" }) {
  const tierStyle = tierUi("gold", false);

  return (
    <section
      className={`account-ui-sans mx-auto max-w-[1200px] rounded-[1.5rem] border-2 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7 ${tierStyle.borderClass}`}
      style={tierStyle.ringStyle}
    >
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Projects</h1>
        <p className="text-sm leading-6 text-slate-600 sm:text-base">
          Manage cloud projects, boreholes, and saved analyses linked to your tools and reports.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <label htmlFor="guide-active-project-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Active project
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <select
                    id="guide-active-project-select"
                    disabled={variant === "empty"}
                    className="min-h-[44px] w-full min-w-0 max-w-xl rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:flex-1"
                    aria-hidden
                  >
                    {variant === "empty" ? (
                      <option value="">No projects yet — create one below</option>
                    ) : (
                      <option value="trial-1">Trial 1</option>
                    )}
                  </select>
                  <button type="button" className="btn-base btn-md shrink-0">
                    New Project
                  </button>
                  <button type="button" className="btn-base btn-md shrink-0" disabled={variant === "empty"}>
                    Edit Project
                  </button>
                  <button type="button" className="btn-base btn-md btn-danger shrink-0" disabled={variant === "empty"}>
                    Remove Project
                  </button>
                </div>
              </div>
            </div>
          </section>

          {variant === "active" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div
                className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                role="status"
              >
                Project created.
              </div>
              <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">Trial 1</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-base btn-md">
                  Use Selected in Tools
                </button>
                <button type="button" className="btn-base btn-md">
                  Use Project in Tools
                </button>
              </div>
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Active in Tools: <span className="font-semibold">Trial 1</span>
                {" — "}
                <span className="font-semibold">21 samples</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 sm:gap-4" role="tablist" aria-label="Project workspace">
                  <button
                    type="button"
                    role="tab"
                    aria-selected
                    className="flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-slate-800/20 bg-white px-3 py-3 text-center shadow-sm ring-2 ring-slate-800/10 sm:min-h-[5rem] sm:px-5 sm:py-4"
                  >
                    <span className="text-sm font-semibold leading-snug text-slate-800 sm:text-base">Boreholes</span>
                    <span className="text-xs font-medium text-emerald-700">Active</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={false}
                    className="flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center shadow-sm sm:min-h-[5rem] sm:px-5 sm:py-4"
                  >
                    <span className="text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                      Saved Analyses<span className="tabular-nums"> (0)</span>
                    </span>
                    <span className="text-xs text-slate-400" aria-hidden>
                      Open
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={false}
                    className="flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center shadow-sm sm:min-h-[5rem] sm:px-5 sm:py-4"
                  >
                    <span className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                      Integrated Parameter Matrix<span className="tabular-nums"> (0)</span>
                    </span>
                    <span className="text-xs text-slate-400" aria-hidden>
                      Open
                    </span>
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <p className="text-sm text-slate-600">Select or create a project to manage boreholes.</p>
          )}
        </div>
      </div>
    </section>
  );
}
