import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Engineering and liability disclaimer for Geotechnical Insights Hub.",
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Disclaimer</h1>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          All tools and content are indicative and simplified. They must not be used directly as final project design
          values without independent professional engineering verification.
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">1. Scope of Technical Content</h2>
          <p>
            Geotechnical Insights Hub publishes educational calculators and engineering commentary. Simplified methods
            are intentionally used to support learning and early-stage screening.
          </p>
          <p>
            Real projects require full ground investigation, laboratory and field testing, code-compliant calculations,
            and project-specific interpretation.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">2. No Final Design Reliance</h2>
          <p>
            Outputs, charts, and equations on this site are not a substitute for formal design checks. They are not
            certified for direct use in construction, procurement, safety-critical decisions, or contractual
            deliverables.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">3. Mandatory Independent Review</h2>
          <p>
            Before applying any site output to a project, a qualified engineer must independently confirm:
          </p>
          <ul className="space-y-1">
            <li>- Input quality, unit consistency, and representative soil parameters.</li>
            <li>- Method applicability to ground profile, loading, groundwater, and construction sequence.</li>
            <li>- Compliance with governing design standards and contractual requirements.</li>
          </ul>
          <p>
            Responsibility for this independent review lies entirely with the user and the appointed engineering team.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">4. No Professional Duty of Care</h2>
          <p>
            Use of this website does not establish professional engagement, advisory duty, or consultant-client
            relationship between the site owner and any user.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">5. Warranty Disclaimer</h2>
          <p>
            Content is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of accuracy,
            completeness, currency, merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">6. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, the owner disclaims liability for direct, indirect, incidental,
            consequential, financial, technical, professional, regulatory, and project-delay losses arising from use of
            this site.
          </p>
          <p>
            This includes losses connected to parameter selection, incorrect assumptions, unsuitable method choice,
            software misuse, misinterpretation, omitted checks, or project implementation decisions.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">7. Third-Party Services and External Dependencies</h2>
          <p>
            The site may rely on external providers (for authentication, hosting, and communications). Service
            disruptions, outages, or third-party failures may affect functionality and data availability.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">8. Legal and Privacy Cross-Reference</h2>
          <p>
            Additional legal terms are available in the{" "}
            <Link href="/terms" className="font-semibold underline underline-offset-4">
              Terms of Use
            </Link>
            . Data handling details are available in the{" "}
            <Link href="/privacy-policy" className="font-semibold underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Last updated: 6 April 2026. This page is general information and is not legal advice.
        </p>
      </section>
    </div>
  );
}
