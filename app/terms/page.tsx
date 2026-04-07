import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Detailed terms of use for Geotechnical Insights Hub.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Terms of Use</h1>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          Important: This website is for education, preliminary screening, and technical understanding only. It is not
          a substitute for project-specific professional engineering services.
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">1. Acceptance of These Terms</h2>
          <p>
            By accessing or using Geotechnical Insights Hub, you agree to these Terms of Use, as updated from time to
            time. If you do not agree, do not use the website.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">2. Educational and Informational Purpose</h2>
          <p>
            Tools, articles, and engineering notes are provided for educational and informational use only. They are
            designed to support learning, early-stage comparison, and assumption testing.
          </p>
          <p>
            Outputs are preliminary and simplified. They must not be treated as final design values, formal design
            approvals, contract documents, or construction instructions.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">3. No Professional Advice or Consultancy</h2>
          <p>
            Nothing on this site constitutes professional engineering advice, legal advice, geotechnical certification,
            statutory compliance confirmation, or any regulated consultancy service.
          </p>
          <p>Use of this site does not create an engineer-client, consultant-client, or fiduciary relationship.</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">4. Engineering Review Requirement</h2>
          <p>
            Before any value, assumption, or interpretation from this site is used in a real project, it must be
            independently reviewed and verified by a suitably qualified engineer.
          </p>
          <ul className="space-y-1">
            <li>- Responsibility for verification and final parameter selection remains with the user and project team.</li>
            <li>- Site-specific investigation, laboratory testing, and applicable code checks remain mandatory.</li>
            <li>- Users are responsible for unit consistency, boundary conditions, and method suitability.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">5. User Responsibilities</h2>
          <p>
            You are solely responsible for how you use any outputs, including any design, construction, procurement,
            safety, or risk decisions made using information from this site.
          </p>
          <p>
            You agree not to rely on this site as your only technical basis for project decisions or statutory
            submissions.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">6. Account and Data Accuracy</h2>
          <p>
            If you create an account, you are responsible for maintaining confidentiality of your credentials and for
            all actions taken under your account.
          </p>
          <p>
            You are responsible for the quality and correctness of project, borehole, and sample data entered into the
            platform.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="space-y-1">
            <li>- Misuse, attack, or attempt unauthorized access to the website or its infrastructure.</li>
            <li>- Use the site for unlawful purposes, harmful automation, or abusive traffic patterns.</li>
            <li>- Reproduce or redistribute content in a way that infringes intellectual property rights.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">8. Intellectual Property</h2>
          <p>
            Unless otherwise stated, website design, text, tools, and content are protected by intellectual property
            law. You may use the site for personal, educational, and internal professional reference.
          </p>
          <p>Commercial redistribution or re-publication requires prior permission.</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">9. Service Availability and Changes</h2>
          <p>
            Features, tools, formulas, or content may be modified, suspended, or removed at any time without notice.
            We do not guarantee uninterrupted availability or error-free operation.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">10. Warranties and Limitation of Liability</h2>
          <p>
            The website is provided &quot;as is&quot; and &quot;as available&quot; without warranties of accuracy,
            completeness, merchantability, fitness for purpose, or non-infringement.
          </p>
          <p>
            To the maximum extent permitted by law, the owner is not liable for direct, indirect, incidental,
            consequential, professional, contractual, or economic losses arising from use of the site.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">11. Indemnity</h2>
          <p>
            You agree to indemnify and hold harmless the website owner from claims, liabilities, damages, and costs
            arising from your misuse of the site or your project use of site outputs.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">12. Privacy and Data Protection</h2>
          <p>
            Use of personal data is described in our{" "}
            <Link href="/privacy-policy" className="font-semibold underline underline-offset-4">
              Privacy Policy
            </Link>
            . Engineering risk limits are described in our{" "}
            <Link href="/disclaimer" className="font-semibold underline underline-offset-4">
              Disclaimer
            </Link>
            .
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">13. Governing Law</h2>
          <p>
            Unless mandatory local consumer law requires otherwise, these Terms are governed by the laws of England and
            Wales.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">14. Contact</h2>
          <p>
            For legal, privacy, or account-related requests, please use the{" "}
            <Link href="/contact" className="font-semibold underline underline-offset-4">
              Contact
            </Link>{" "}
            page.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Last updated: 6 April 2026. This page is general information and is not legal advice.
        </p>
      </section>
    </div>
  );
}
