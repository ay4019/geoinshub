import type { Metadata } from "next";
import Link from "next/link";

import { B, LegalDocument, List, Notice, type LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for Geotechnical Insights Hub, an educational geotechnical engineering platform published from Türkiye.",
};

const linkClass = "font-semibold underline underline-offset-4";

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these Terms",
    body: (
      <>
        <p>
          These Terms of Use (the <B>Terms</B>) govern your access to and use of Geotechnical Insights Hub, its website,
          tools, accounts, projects, reports, AI features, articles and any related service (together, the <B>Service</B>),
          operated from the Republic of Türkiye by its operator (<B>we</B>, <B>us</B>, the <B>operator</B>).
        </p>
        <p>
          By accessing or using the Service, with or without an account, you agree to these Terms, the{" "}
          <Link href="/disclaimer" className={linkClass}>
            Disclaimer
          </Link>{" "}
          and the{" "}
          <Link href="/privacy-policy" className={linkClass}>
            Privacy Policy
          </Link>
          , which form part of these Terms. If you do not agree, do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <List
        items={[
          "You must be at least 18 years old, or use the Service under the supervision of a parent, guardian or teacher.",
          "If you use the Service on behalf of an employer, university or other organisation, you confirm that you are authorised to accept these Terms for it, and the organisation is bound by them.",
          "You may hold only one account and must not use the Service where doing so is prohibited by law.",
        ]}
      />
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    body: (
      <List
        items={[
          <>
            <B>Output</B>: any value, check result, chart, drawing, table, report, PDF, spreadsheet, AI text or other result
            produced by the Service.
          </>,
          <>
            <B>User Data</B>: the information you enter or save, such as project and borehole labels, sample values and saved
            analyses.
          </>,
          <>
            <B>Membership</B>: the access level of an account (currently Bronze, Silver or Gold) that decides which features
            are available.
          </>,
        ]}
      />
    ),
  },
  {
    id: "purpose",
    title: "Educational purpose and nature of the Service",
    body: (
      <>
        <p>
          The Service is provided for <B>educational and informational purposes</B>: learning, teaching, exploring methods
          and early, indicative comparison of assumptions. It uses deliberately simplified methods, empirical correlations and
          unofficial interpretations of design codes.
        </p>
        <p>
          Outputs are <B>indicative and non‑binding</B>. They are not design values, approvals, certifications, statements of
          fact or professional opinions, and they must not be used as contract documents, construction instructions or
          submissions to any authority. The limits of the Service are described in detail in the{" "}
          <Link href="/disclaimer" className={linkClass}>
            Disclaimer
          </Link>
          , which you should read before use.
        </p>
      </>
    ),
  },
  {
    id: "no-advice",
    title: "No professional advice or relationship",
    body: (
      <p>
        Nothing in the Service is engineering, geotechnical, legal, financial or other professional advice, and using it does
        not create an engineer–client, consultant–client, agency, employment or fiduciary relationship. The operator owes you
        no professional duty of care.
      </p>
    ),
  },
  {
    id: "verification",
    title: "Your duty to verify",
    body: (
      <>
        <p>You agree that, before any Output is used for anything other than learning:</p>
        <List
          items={[
            "it will be independently checked, repeated by independent means and approved by a suitably qualified and responsible engineer;",
            "site investigation, laboratory testing and code‑compliant design will be carried out as required; and",
            "you, not the operator, are solely responsible for inputs, units, method selection, parameter selection, interpretation and every decision taken.",
          ]}
        />
        <p>You must not rely on the Service as the sole or main technical basis for any project, design or safety decision.</p>
      </>
    ),
  },
  {
    id: "reports-ai",
    title: "Generated reports and AI features",
    body: (
      <>
        <p>
          Reports are generated automatically from your inputs using fixed templates and are not reviewed or signed by anyone.
          AI features send your report data to a third‑party model (currently Google Gemini) using a <B>general‑purpose
          prompt</B> that is the same for every user and is not tailored to your project; the text returned is not checked by a
          human and may be wrong or invented.
        </p>
        <p>
          You may use reports and AI text for your own preliminary work, but you must verify every statement and value, must not
          present them as prepared, reviewed or endorsed by the operator, and must not submit them to clients or authorities as
          professional work. By starting an AI feature you instruct us to send the related data to the AI provider, as described
          in the{" "}
          <Link href="/privacy-policy" className={linkClass}>
            Privacy Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and security",
    body: (
      <List
        items={[
          "You must give a valid e‑mail address and keep your credentials confidential. You are responsible for all activity under your account.",
          "Tell us promptly through the Contact page if you suspect unauthorised use. We are not liable for loss caused by unauthorised use of your credentials.",
          "You are responsible for your own devices, internet access and security software.",
        ]}
      />
    ),
  },
  {
    id: "membership",
    title: "Memberships and features",
    body: (
      <>
        <p>
          New accounts receive the free Bronze membership. Some features (for example detailed derivations, reports, Excel
          export, AI features or certain design codes) are limited to particular memberships. The operator may at any time,
          at its discretion, add, change, move between memberships, limit or withdraw features, quotas and limits, and may
          assign or change an account’s membership.
        </p>
        <p>
          Free memberships carry no entitlement to continued availability of any feature. If paid memberships are introduced,
          prices, billing, renewal, cancellation and refund rules will be set out in separate terms presented before purchase,
          and mandatory consumer rights under Turkish law will apply to them.
        </p>
      </>
    ),
  },
  {
    id: "user-data",
    title: "Your data and content",
    body: (
      <>
        <p>
          You keep ownership of your User Data. You grant the operator a non‑exclusive, worldwide, royalty‑free licence to host,
          store, process, copy and display it, and to send it to service providers, only as needed to run, secure and improve
          the Service.
        </p>
        <p>
          The Service does not provide general file uploads. <B>Do not enter confidential information</B>: no trade secrets,
          privileged or classified material, client names, contract codes, exact site addresses or personal data of others.
          Project and borehole fields are convenience labels only; use neutral names. You warrant that you are entitled to enter
          your User Data and that doing so breaches no duty to an employer, client or third party.
        </p>
        <p>
          The Service is not a backup or archive. Keep your own copies of anything important. We do not guarantee that User
          Data will be preserved, and we are not liable for its loss, corruption or deletion. Inactive accounts and their data
          may be deleted after reasonable notice to the registered e‑mail address.
        </p>
        <p>
          If you send feedback or suggestions, we may use them freely without obligation to you.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You must not:</p>
        <List
          items={[
            "attack, overload, probe or attempt unauthorised access to the Service, its accounts, database or infrastructure;",
            "circumvent, disable or interfere with membership restrictions, quotas, blurring, access controls or security features;",
            "scrape, crawl, bulk‑download or systematically extract tools, formulas, content or data, or use automated means to access the Service, except for ordinary search‑engine indexing;",
            "copy, reverse‑engineer, decompile or reproduce the tools or their logic to build a competing product;",
            "upload or inject files, scripts or payloads where the Service does not expressly allow it;",
            "use the Service unlawfully, to infringe the rights of others, or to submit misleading, offensive or harmful content;",
            "share your account, resell access, or misrepresent your identity or affiliation; or",
            "present Outputs as having been prepared, verified or endorsed by the operator.",
          ]}
        />
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    body: (
      <>
        <p>
          The Service, including its design, text, articles, graphics, code, tool logic, templates and arrangement, belongs to
          the operator or its licensors and is protected by intellectual property law, including Law No. 5846 on Intellectual
          and Artistic Works. Names of standards and organisations belong to their owners.
        </p>
        <p>
          You may use the Service and its Outputs for personal learning, teaching and internal reference. Any other
          reproduction, republication, redistribution or commercial use requires our prior written permission. Short quotations
          with clear attribution and a link are allowed.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third‑party services and links",
    body: (
      <p>
        The Service relies on third‑party providers (for example hosting, database and authentication, e‑mail and AI) and may
        link to external websites. We do not control them and are not responsible for their content, availability, security or
        practices, or for any loss they cause.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the Service",
    body: (
      <p>
        We may change, update, suspend or discontinue any part of the Service, including tools, formulas, default values and
        methods, at any time and without notice. Results can therefore differ between visits. Features marked or reasonably
        understood as beta or experimental may be incomplete. We do not promise that the Service will be uninterrupted,
        timely, secure or free of errors or viruses.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "Disclaimer of warranties",
    body: (
      <Notice>
        The Service and all Outputs are provided “as is” and “as available”, without warranties of any kind, express or
        implied, including accuracy, completeness, reliability, currency, merchantability, fitness for a particular purpose,
        title and non‑infringement, to the fullest extent permitted by law.
      </Notice>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <Notice>
          To the fullest extent permitted by the law of the Republic of Türkiye, the operator shall not be liable for any
          direct, indirect, incidental, consequential, special, exemplary, professional or economic loss or damage, including
          loss of profit, revenue, contracts, data, goodwill or time, project delay, rework, design or construction costs, or
          personal injury or property damage resulting from reliance on Outputs, arising out of or in connection with the
          Service, whether in contract, tort or otherwise, even if advised of the possibility of such loss.
        </Notice>
        <p>
          Because the Service is provided free of charge, where liability cannot be fully excluded it is limited, to the extent
          the law allows, to re‑supplying the relevant part of the Service. Nothing in these Terms excludes liability that cannot
          be excluded under mandatory law, including liability for intent or gross negligence (Turkish Code of Obligations
          No. 6098, Art. 115) or non‑waivable consumer rights.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        You agree to indemnify and hold harmless the operator from all claims, losses, liabilities, damages, costs and
        expenses (including reasonable legal fees) arising from your use of the Service or Outputs, your projects or decisions,
        your User Data, your breach of these Terms or of law, or any representation that Outputs were prepared, reviewed or
        endorsed by the operator.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          You may stop using the Service and delete your account at any time from your account page. We may suspend, restrict or
          close any account, or refuse access, at any time and without liability, in particular for breach of these Terms,
          misuse, security risk or legal requirement, or if we discontinue the Service.
        </p>
        <p>
          On termination your right to use the Service ends and your User Data may be deleted. Sections that by their nature
          should survive termination (including the duty to verify, user data responsibilities, intellectual property,
          disclaimers, limitation of liability, indemnity and governing law) continue to apply.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms at any time by publishing a new version on this page and changing the date above. Where a
        change is material and you have an account, we will make reasonable efforts to inform you. Continued use of the Service
        after the update means you accept the updated Terms; if you do not agree, stop using the Service.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and jurisdiction",
    body: (
      <>
        <p>
          These Terms and any dispute arising from or in connection with them or the Service are governed by the laws of the
          Republic of Türkiye, excluding its conflict‑of‑law rules.
        </p>
        <p>
          Subject to mandatory consumer‑protection rules (including Law No. 6502, under which consumers may apply to consumer
          arbitration committees or consumer courts at their place of residence), the courts and enforcement offices of the
          Republic of Türkiye have exclusive jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General provisions",
    body: (
      <List
        items={[
          <>
            <B>Entire agreement.</B> These Terms, the Disclaimer and the Privacy Policy are the entire agreement between you
            and the operator about the Service.
          </>,
          <>
            <B>Severability.</B> If any provision is held invalid or unenforceable, it is limited to the minimum extent
            necessary and the rest remains in force.
          </>,
          <>
            <B>No waiver.</B> Not enforcing a provision is not a waiver of it.
          </>,
          <>
            <B>Assignment.</B> You may not transfer your rights or obligations without our consent; we may transfer ours,
            for example with a transfer of the Service.
          </>,
          <>
            <B>Force majeure.</B> We are not liable for delay or failure caused by events beyond reasonable control, including
            outages of providers, network failures, cyber‑attacks, natural disasters, epidemics or acts of authorities.
          </>,
          <>
            <B>Evidence.</B> Our electronic records and logs constitute evidence in disputes, within the meaning of
            Art. 193 of the Code of Civil Procedure No. 6100, subject to proof to the contrary.
          </>,
          <>
            <B>Language.</B> These Terms are written in English; if a translation is provided, the English version prevails.
          </>,
        ]}
      />
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        For questions about these Terms, legal notices or account requests, use the{" "}
        <Link href="/contact" className={linkClass}>
          Contact
        </Link>{" "}
        page. We may send notices to the e‑mail address registered to your account.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      updated="21 November 2026"
      intro={
        <p>
          These Terms are an agreement between you and the operator of Geotechnical Insights Hub. Please read them, together
          with the{" "}
          <Link href="/disclaimer" className={linkClass}>
            Disclaimer
          </Link>{" "}
          and the{" "}
          <Link href="/privacy-policy" className={linkClass}>
            Privacy Policy
          </Link>
          , before using the Service.
        </p>
      }
      sections={sections}
    />
  );
}
