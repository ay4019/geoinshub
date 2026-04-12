import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy and KVKK-related information for Geotechnical Insights Hub (Türkiye).",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Privacy Policy</h1>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
        <p>
          This Privacy Policy explains how Geotechnical Insights Hub collects, uses, stores, and shares personal data.
          The Service is operated from the Republic of Türkiye (Turkey). Processing is described in line with Law No.
          6698 on the Protection of Personal Data (KVKK) and, where relevant, international standards. It also explains
          your privacy rights and choices.
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">1. Who We Are</h2>
          <p>
            Geotechnical Insights Hub is an educational geotechnical engineering platform published from the Republic of
            Türkiye. For privacy and data subject requests, please use the{" "}
            <Link href="/contact" className="font-semibold underline underline-offset-4">
              Contact
            </Link>{" "}
            page.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">2. Data We Collect</h2>
          <p>
            <span className="font-medium text-slate-900">No general file uploads.</span> The website does not provide a
            feature to upload documents, borehole logs, or attachments. We only process data you enter into forms and
            fields, plus technical data needed to run the Service.
          </p>
          <p>
            <span className="font-medium text-slate-900">Use neutral labels.</span> Project names, borehole identifiers,
            and similar fields are optional labels to help you organise records inside the application. Do not enter
            confidential client names, exact site addresses, contract codes, or other sensitive identifiers there unless
            you accept the risk of processing and storage as described here.
          </p>
          <ul className="space-y-1">
            <li>
              - <span className="font-medium text-slate-900">Account data:</span> email address, authentication user
              ID, and login/session metadata through Supabase Auth.
            </li>
            <li>
              - <span className="font-medium text-slate-900">Project and engineering inputs:</span> project names,
              borehole identifiers, sample depths, and numeric or text fields you enter when using account project
              tools (for example user-entered N values). You are responsible for not submitting special categories of
              personal data or third-party personal data except where you have a lawful basis.
            </li>
            <li>
              - <span className="font-medium text-slate-900">Tool records:</span> selected tool outputs if you choose to
              save results to a project.
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
          <h2 className="text-xl font-semibold text-slate-900">4. Legal Bases (KVKK and International Practice)</h2>
          <p>
            Under KVKK, processing may rely on conditions such as: establishment or performance of a contract, legal
            obligation, legitimate interest (where not overridden by your interests), explicit consent where
            required, or other bases set out in the law. Where GDPR or other regimes apply to certain users, comparable
            concepts (contract, legitimate interests, consent, legal obligation) may apply in parallel.
          </p>
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
            Infrastructure providers may process data in the European Economic Area, the United States, or other
            regions. Where personal data is transferred outside Türkiye, we rely on appropriate safeguards permitted
            under KVKK (such as the data importer&apos;s commitment to adequate protection, standard contractual clauses,
            or other mechanisms required by law) and contractual security requirements.
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
          <p>
            If you are located in Türkiye or your data is processed under KVKK, you may exercise rights under Law No.
            6698, including (where applicable) the right to learn whether your personal data is processed, to request
            information, to obtain a copy, to request correction or deletion, to object to outcomes exclusively produced
            by automated processing, to request data portability, to claim compensation for unlawful processing, and to
            lodge a complaint with the Turkish Personal Data Protection Authority (Kişisel Verileri Koruma Kurulu).
          </p>
          <p>Users in other jurisdictions may have comparable rights under local law.</p>
          <ul className="space-y-1">
            <li>- Access, correct, or delete personal data.</li>
            <li>- Restrict or object to processing in certain cases.</li>
            <li>- Data portability where applicable.</li>
            <li>- Withdraw consent where processing is consent-based.</li>
            <li>- Lodge a complaint with the competent supervisory authority.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">10. Security</h2>
          <p>
            We apply reasonable technical and organisational measures appropriate to the nature of the Service (for
            example access controls, encryption in transit where supported by providers, and least-privilege
            practices). Because the Service is not intended for highly confidential engineering files or bulk uploads,
            you should not treat it as a classified or secure document repository. No internet transmission or storage
            system can be guaranteed 100% secure.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">11. Children&apos;s Privacy</h2>
          <p>
            The Service is intended for professional and educational use by adults and supervised learners. It is not
            directed at young children for independent account registration. If you are a parent or guardian in
            Türkiye, please supervise minors&apos; use of online services in line with applicable law.
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
            Governing law and jurisdiction for use of the Service are set out in the{" "}
            <Link href="/terms" className="font-semibold underline underline-offset-4">
              Terms of Use
            </Link>
            . Please also review our{" "}
            <Link href="/disclaimer" className="font-semibold underline underline-offset-4">
              Disclaimer
            </Link>
            .
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Last updated: 12 April 2026. This page is general information and is not legal advice.
        </p>
      </section>
    </div>
  );
}
