import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Engineering and liability disclaimer for Geotechnical Insights Hub.",
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Disclaimer</h1>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
        <p>
          All tools and articles on Geotechnical Insights Hub are provided &quot;as is&quot; without warranties of
          accuracy, completeness, merchantability, or fitness for a particular purpose.
        </p>
        <p>
          Calculations are simplified and may omit project-specific factors such as groundwater variability,
          construction sequence, seismic loading, layered subsurface behaviour, and code-specific modifiers.
        </p>
        <p>
          Outputs are indicative only and must not be used as final design values. Always perform qualified,
          project-specific engineering review and applicable code checks.
        </p>
        <p>
          To the fullest extent permitted by law, the website owner disclaims liability for direct, indirect,
          incidental, consequential, or professional losses arising from use of the site content or tools.
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Design Use and Responsibility</h2>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-400">
              -
            </span>
            <span>
              The tools on this site are intended for education, rapid screening, early-stage comparison, and
              assumption testing only. They are not a substitute for full project-specific analysis or formal design.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-400">
              -
            </span>
            <span>
              Before any value from this site is used in design, reporting, procurement, construction planning, risk
              assessment, or professional advice, the calculations, inputs, assumptions, units, and engineering
              relevance must be independently checked by a suitably qualified engineer.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-400">
              -
            </span>
            <span>
              Project-specific ground investigation, laboratory testing, groundwater assessment, load definition,
              construction sequence review, and applicable code compliance checks remain essential in all cases.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-400">
              -
            </span>
            <span>
              No responsibility or liability is accepted for direct or indirect loss, technical error, design
              inadequacy, construction outcome, delay, claim, or damage arising from reliance on these tools, articles,
              or any derived interpretation.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-400">
              -
            </span>
            <span>
              The user remains solely responsible for selecting appropriate parameters, confirming applicability,
              interpreting outputs correctly, and establishing all final design values.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

