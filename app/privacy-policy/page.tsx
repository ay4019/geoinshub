import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Geotechnical Insights Hub.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Privacy Policy</h1>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
        <p>
          This Privacy Policy explains how Geotechnical Insights Hub collects, uses, stores, and shares personal data.
          It also explains your privacy rights and choices.
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">1. Who We Are</h2>
          <p>
            Geotechnical Insights Hub is an educational geotechnical engineering platform. For privacy requests, please
            use the{" "}
            <Link href="/contact" className="font-semibold underline underline-offset-4">
              Contact
            </Link>{" "}
            page.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">2. Data We Collect</h2>
          <ul className="space-y-1">
            <li>
              - <span className="font-medium text-slate-900">Account data:</span> email address, authentication user
              ID, and login/session metadata through Supabase Auth.
            </li>
            <li>
              - <span className="font-medium text-slate-900">Project data:</span> project names, borehole IDs, sample
              depths, and user-entered N values when you use the account project tools.
            </li>
            <li>
              - <span className="font-medium text-slate-900">Tool records:</span> selected tool outputs if you choose
              to save results to a project.
            </li>
            <li>
              - <span className="font-medium text-slate-900">Contact data:</span> name, email, subject, and message
              content submitted via the contact form.
            </li>
            <li>
              - <span className="font-medium text-slate-900">Technical data:</span> browser/device diagnostics, page
              requests, and local preferences (for example selected unit system and active tool/project selections in
              local browser storage).
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">3. How We Use Data</h2>
          <ul className="space-y-1">
            <li>- To create and secure accounts.</li>
            <li>- To provide tool functionality and save user project/borehole records.</li>
            <li>- To respond to contact requests and support messages.</li>
            <li>- To maintain platform security, stability, and misuse prevention.</li>
            <li>- To improve product quality and reliability.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">4. Legal Bases (UK GDPR / GDPR Style)</h2>
          <ul className="space-y-1">
            <li>- Contract: to provide account and platform features you request.</li>
            <li>- Legitimate interests: to secure, operate, and improve the website.</li>
            <li>- Consent: where required for optional communications or specific processing.</li>
            <li>- Legal obligation: where disclosure is required by law.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">5. Cookies and Local Storage</h2>
          <p>
            Authentication and essential security/session mechanisms may use cookies or equivalent browser storage.
            Some functional preferences (such as selected units or active tool selection) are stored locally on your
            device for usability.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">6. Service Providers and Data Sharing</h2>
          <p>
            We use trusted third-party processors to operate the service. Typical providers include:
          </p>
          <ul className="space-y-1">
            <li>- Supabase (authentication and database infrastructure).</li>
            <li>- Vercel (hosting and deployment infrastructure).</li>
            <li>- Resend (transactional email delivery, if enabled).</li>
          </ul>
          <p>We do not sell personal data.</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">7. International Transfers</h2>
          <p>
            Data may be processed in countries outside your own. Where required, appropriate safeguards are used by
            service providers (for example, contractual transfer mechanisms and security controls).
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">8. Data Retention</h2>
          <p>
            We retain data only as long as needed for account services, support, security, legal compliance, and
            legitimate business records. You can request deletion of your account from the account privacy section.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">9. Your Privacy Rights</h2>
          <p>Depending on your jurisdiction, you may have rights to:</p>
          <ul className="space-y-1">
            <li>- Access, correct, or delete personal data.</li>
            <li>- Restrict or object to processing in certain cases.</li>
            <li>- Data portability where applicable.</li>
            <li>- Withdraw consent where processing is consent-based.</li>
            <li>- Lodge a complaint with your local supervisory authority.</li>
          </ul>
          <p>
            UK users can complain to the Information Commissioner&apos;s Office (ICO). California users may have CCPA/CPRA
            rights under applicable law.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">10. Security</h2>
          <p>
            Reasonable technical and organisational safeguards are used to protect data. However, no internet
            transmission or storage system can be guaranteed 100% secure.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">11. Children&apos;s Privacy</h2>
          <p>
            This website is not intended for children under 13 and is not directed to minors for independent account
            use.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">12. Policy Updates</h2>
          <p>
            We may update this policy from time to time. Material changes will be reflected by updating the date below.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">13. Related Legal Pages</h2>
          <p>
            Please also review our{" "}
            <Link href="/terms" className="font-semibold underline underline-offset-4">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/disclaimer" className="font-semibold underline underline-offset-4">
              Disclaimer
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
