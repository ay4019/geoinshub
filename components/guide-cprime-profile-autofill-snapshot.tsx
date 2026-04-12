import {
  ProfileTableHeaderCell,
  ProfileTableScroll,
  cnProfileTableInput,
  profileTableClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";

const CU_SOURCE_LABEL = "Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI)";

/**
 * Static Soil Profile Plot table (c′ from cu) showing auto-filled cu — for guide capture only.
 */
export function GuideCprimeProfileAutofillSnapshot() {
  return (
    <div
      data-guide-capture="cprime-profile-autofill"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-semibold text-slate-900">Soil Profile Plot</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter c<sub>u</sub> by sample depth. The tool applies c′ = 0.1c<sub>u</sub> (same as the Calculator tab).
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        When samples are imported from <span className="font-semibold">Projects and Boreholes</span>, c<sub>u</sub> can
        be filled from saved project parameters — for example from <span className="font-semibold">{CU_SOURCE_LABEL}</span>
        .
      </p>

      <ProfileTableScroll showHint={false} className="mt-5">
        <table className={`${profileTableClass("c5")} text-[13px] sm:text-[14px]`}>
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[34%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className={profileTableThClass}>
                <ProfileTableHeaderCell title="Borehole ID" />
              </th>
              <th className={profileTableThClass}>
                <ProfileTableHeaderCell title="Sample Depth" unit="m" />
              </th>
              <th className={profileTableThClass}>
                <ProfileTableHeaderCell title={<span>c<sub>u</sub></span>} unit="kPa" />
              </th>
              <th className={profileTableThClass}>
                <ProfileTableHeaderCell title={<span>c′ = 0.1c<sub>u</sub></span>} unit="kPa" />
              </th>
              <th className={profileTableThClass}>
                <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200 bg-white align-top">
              <td className="px-2 py-3">
                <div className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-900">
                  BH-01
                </div>
              </td>
              <td className="px-2 py-3">
                <div className={cnProfileTableInput(true)}>0.75</div>
              </td>
              <td className="px-2 py-3">
                <div className="space-y-2">
                  <div className={cnProfileTableInput(true)}>58.5</div>
                  <span className="inline-flex max-w-full rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold leading-snug text-emerald-800 sm:text-xs">
                    Auto-filled from {CU_SOURCE_LABEL}
                  </span>
                </div>
              </td>
              <td className="px-2 py-3">
                <div className={profileTableOutputCellClass}>5.85</div>
              </td>
              <td className="px-2 py-3">
                <button type="button" className={profileTableRemoveButtonClass} tabIndex={-1}>
                  Remove
                </button>
              </td>
            </tr>
            <tr className="border-t border-slate-200 bg-white align-top">
              <td className="px-2 py-3">
                <div className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-900">
                  BH-01
                </div>
              </td>
              <td className="px-2 py-3">
                <div className={cnProfileTableInput(true)}>1.5</div>
              </td>
              <td className="px-2 py-3">
                <div className="space-y-2">
                  <div className={cnProfileTableInput(true)}>108.3</div>
                  <span className="inline-flex max-w-full rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold leading-snug text-emerald-800 sm:text-xs">
                    Auto-filled from {CU_SOURCE_LABEL}
                  </span>
                </div>
              </td>
              <td className="px-2 py-3">
                <div className={profileTableOutputCellClass}>10.83</div>
              </td>
              <td className="px-2 py-3">
                <button type="button" className={profileTableRemoveButtonClass} tabIndex={-1}>
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </ProfileTableScroll>
    </div>
  );
}
