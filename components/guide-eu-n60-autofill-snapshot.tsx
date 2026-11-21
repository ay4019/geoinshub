import {
  ProfileTableHeaderCell,
  ProfileTableScroll,
  cnProfileTableInput,
  profileTableClass,
  profileTableOutputCellClass,
  profileTableRemoveButtonClass,
  profileTableThClass,
} from "@/components/profile-table-mobile";

const ROWS = [
  { depth: "1.50", n60: "9.0", ratio: "1100", eu: "9900.00" },
  { depth: "3.00", n60: "14.0", ratio: "1100", eu: "15400.00" },
];

/**
 * Static Soil Profile Plot table of "Undrained Deformation Modulus (Eu) from SPT" showing N60 auto-filled from saved
 * SPT Corrections results — for guide capture only (scripts/capture-guide-site-images.mjs).
 */
export function GuideEuN60AutofillSnapshot() {
  return (
    <div data-guide-capture="eu-n60-autofill" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">Soil Profile Plot</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter corrected SPT resistance by sample depth. For cohesive soils, this profile uses Butler (1975) with E<sub>u</sub>/N
        <sub>60</sub> within 1000 to 1200 kN/m<sup>2</sup>, then computes E<sub>u</sub> = (E<sub>u</sub>/N<sub>60</sub>)N<sub>60</sub>.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        When samples are imported from <span className="font-semibold">Projects and Boreholes</span>, N<sub>60</sub> is pulled
        from the <span className="font-semibold">SPT Corrections</span> results saved to the project.
      </p>

      <ProfileTableScroll showHint={false} className="mt-5">
        <table className={`${profileTableClass("c6")} text-[13px] sm:text-[14px]`}>
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[26%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
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
                <ProfileTableHeaderCell title="N60" />
              </th>
              <th className={profileTableThClass}>
                <ProfileTableHeaderCell title={<span>Selected ratio: E<sub>u</sub>/N<sub>60</sub></span>} unit="kPa" />
              </th>
              <th className={profileTableThClass}>
                <ProfileTableHeaderCell title="Eu" unit="kPa" />
              </th>
              <th className={profileTableThClass}>
                <span className="block max-w-[4.5rem] leading-tight sm:max-w-none">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.depth} className="border-t border-slate-200 bg-white align-top">
                <td className="px-2 py-3">
                  <div className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-900">BH-01</div>
                </td>
                <td className="px-2 py-3">
                  <div className={cnProfileTableInput(true)}>{row.depth}</div>
                </td>
                <td className="px-2 py-3">
                  <div className="space-y-2">
                    <div className={cnProfileTableInput(false)}>{row.n60}</div>
                    <span className="inline-flex max-w-full rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold leading-snug text-emerald-800 sm:text-xs">
                      Auto-filled from SPT Corrections
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className={cnProfileTableInput(false)}>{row.ratio}</div>
                </td>
                <td className="px-2 py-3">
                  <div className={profileTableOutputCellClass}>{row.eu}</div>
                </td>
                <td className="px-2 py-3">
                  <button type="button" className={profileTableRemoveButtonClass} tabIndex={-1}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ProfileTableScroll>
    </div>
  );
}
