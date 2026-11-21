import type { Metadata } from "next";
import Link from "next/link";

import { B, LegalDocument, List, type LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy and KVKK (Law No. 6698) information notice for Geotechnical Insights Hub: what data is processed, why, with whom, for how long, and your rights.",
};

const linkClass = "font-semibold underline underline-offset-4";
const th = "border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600";
const td = "border-b border-slate-100 px-3 py-2 align-top";

const dataRows: Array<[string, string, string, string, string]> = [
  [
    "Account",
    "E‑mail address, user ID, password hash, membership level, sign‑in and session metadata",
    "Create and secure your account, apply membership features",
    "Contract (Art. 5/2‑c); legitimate interest (Art. 5/2‑f)",
    "Until you delete your account; copies in backups are removed in the providers’ normal backup cycle",
  ],
  [
    "Projects and analyses",
    "Project and borehole labels, sample depths and values, saved tool inputs, outputs and plot images",
    "Store and reload your work, feed one tool from another",
    "Contract (Art. 5/2‑c)",
    "Until you delete them or your account",
  ],
  [
    "AI requests",
    "Report tables, figures, method text and the labels you entered (no name or e‑mail)",
    "Produce the AI interpretation you request; enforce quotas",
    "Contract (Art. 5/2‑c); explicit instruction when you start the feature",
    "Not stored by us beyond the session and quota counters; provider terms apply",
  ],
  [
    "Contact messages",
    "Name, e‑mail, subject and message (delivered to the operator by e‑mail); a log of e‑mail address, subject and time",
    "Answer your enquiry, prevent spam and keep a record",
    "Legitimate interest (Art. 5/2‑f); establishing or defending rights (Art. 5/2‑e)",
    "As long as needed to handle the enquiry and any related claims",
  ],
  [
    "Newsletter",
    "E‑mail address you submit to the newsletter form",
    "Send occasional updates about new tools and articles",
    "Explicit consent (Art. 5/1), given by submitting the form",
    "Until you ask us to remove it",
  ],
  [
    "Technical and usage",
    "IP address, browser and device data, pages viewed, performance metrics, error logs",
    "Operate, secure and improve the Service; prevent misuse",
    "Legitimate interest (Art. 5/2‑f); legal obligation (Art. 5/2‑ç)",
    "For the providers’ standard log retention periods; analytics only in aggregated form",
  ],
  [
    "Preferences on your device",
    "Unit system, guide language, tool and project selections, unsaved table drafts",
    "Remember your settings",
    "Legitimate interest (Art. 5/2‑f)",
    "Stored in your browser until you clear it",
  ],
];

const sections: LegalSection[] = [
  {
    id: "controller",
    title: "Data controller",
    body: (
      <p>
        The data controller under Law No. 6698 on the Protection of Personal Data (<B>KVKK</B>) is the operator of Geotechnical
        Insights Hub, based in the Republic of Türkiye. You can reach the operator for any privacy matter through the{" "}
        <Link href="/contact" className={linkClass}>
          Contact
        </Link>{" "}
        page. This Policy is also the information notice required by Art. 10 KVKK. Where the EU General Data Protection
        Regulation or another law applies to you, comparable rights are respected.
      </p>
    ),
  },
  {
    id: "principles",
    title: "Our approach",
    body: (
      <List
        items={[
          "We collect only what is needed to run an educational engineering platform.",
          "We do not sell or rent personal data, and we do not use it for advertising or profiling.",
          "There is no general file upload: we process what you type into forms and the results you choose to save.",
          <>
            <B>Please do not enter confidential or personal data</B> about clients, sites or other people in project, borehole
            or message fields. Use neutral labels.
          </>,
        ]}
      />
    ),
  },
  {
    id: "data",
    title: "What we process, why, on which legal basis and for how long",
    body: (
      <>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[720px] border-collapse text-[13px] leading-5">
            <thead>
              <tr>
                <th className={th}>Category</th>
                <th className={th}>Examples</th>
                <th className={th}>Purpose</th>
                <th className={th}>Legal basis (KVKK)</th>
                <th className={th}>Retention</th>
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i} className={`${td} ${i === 0 ? "font-semibold text-slate-900" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We do not intentionally process special categories of personal data (Art. 6 KVKK). After the retention period, data is
          deleted, destroyed or anonymised. Anonymised or aggregated statistics may be kept.
        </p>
      </>
    ),
  },
  {
    id: "collection",
    title: "How data is collected",
    body: (
      <p>
        Data is collected electronically when you register, sign in, use tools, save analyses, start AI features, send a
        contact message or simply browse the site (through server logs, cookies, local storage and cookieless analytics).
      </p>
    ),
  },
  {
    id: "recipients",
    title: "Who we share data with",
    body: (
      <>
        <p>We share data only with service providers that process it on our behalf, and with authorities where the law requires:</p>
        <List
          items={[
            <>
              <B>Supabase</B>: authentication and database hosting.
            </>,
            <>
              <B>Vercel</B>: website hosting, server logs, and privacy‑friendly analytics and performance measurement (Vercel
              Web Analytics and Speed Insights, which work without advertising cookies and report aggregated figures).
            </>,
            <>
              <B>Resend</B>: delivery of transactional e‑mails, such as account and contact messages.
            </>,
            <>
              <B>Google (Gemini API)</B>: only when you start an AI feature; the report data described above is sent for
              processing. Your name and e‑mail address are not sent.
            </>,
            "Public authorities, courts or law enforcement, where a legal obligation or court order requires it.",
          ]}
        />
      </>
    ),
  },
  {
    id: "transfers",
    title: "Transfers abroad",
    body: (
      <>
        <p>
          These providers may store or process data outside Türkiye, including in the European Union and the United States.
          Such transfers are carried out under Art. 9 KVKK, mainly on the basis of standard contracts or other appropriate
          safeguards provided by the providers, or, where those are not available, on a basis permitted by law, such as the
          transfer being necessary for the performance of the contract with you.
        </p>
        <p>
          AI features are optional. Starting one transfers the related data to Google; do not use them for confidential, personal
          or client‑restricted information.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <List
          items={[
            <>
              <B>Strictly necessary</B>: authentication and session cookies set by Supabase to keep you signed in and protect
              your account. The site cannot work without them.
            </>,
            <>
              <B>Visit counter</B>: a first‑party cookie (<code>gih_visit_session</code>, 30 minutes) so a visit is counted once
              in the anonymous site counters. It contains no personal data.
            </>,
            <>
              <B>Functional local storage</B>: your preferences and drafts (for example unit system, guide language, selected
              project and tool tables), kept only in your browser.
            </>,
            <>
              <B>Analytics</B>: Vercel Web Analytics and Speed Insights measure visits and performance without advertising or
              cross‑site tracking cookies.
            </>,
          ]}
        />
        <p>We use no advertising or social‑media tracking cookies. You can delete cookies and local storage in your browser at any time; signed‑in features will then require you to sign in again.</p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI features",
    body: (
      <p>
        AI interpretations are produced by a third‑party model from a general‑purpose prompt and the data you choose to send.
        They are not used to make any decision about you and involve no profiling of you. The provider processes the request
        under its own terms; see the{" "}
        <Link href="/disclaimer" className={linkClass}>
          Disclaimer
        </Link>{" "}
        for the limits of AI output.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We apply reasonable technical and organisational measures (Art. 12 KVKK), such as encrypted connections, access controls,
        row‑level security in the database and least‑privilege access. The Service is not designed as a secure repository for
        confidential engineering files, and no system can be guaranteed to be completely secure. If a breach affects your data,
        we will notify you and the Personal Data Protection Board as required by law.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Under Art. 11 KVKK you have the right to:</p>
        <List
          items={[
            "learn whether your personal data is processed and request information about it;",
            "learn the purpose of processing and whether data is used accordingly;",
            "know the third parties in Türkiye or abroad to whom data is transferred;",
            "request correction of incomplete or inaccurate data, and notification of the correction to recipients;",
            "request deletion or destruction of data under Art. 7, and notification of this to recipients;",
            "withdraw consent at any time where processing is based on consent (for example the newsletter);",
            "object to a result against you arising solely from automated analysis; and",
            "claim compensation for damage caused by unlawful processing.",
          ]}
        />
        <p>
          You can delete your account and its data yourself from your account page. For other requests, write to us through the{" "}
          <Link href="/contact" className={linkClass}>
            Contact
          </Link>{" "}
          page from your registered e‑mail address, stating your request clearly. We will answer free of charge within 30 days
          at the latest, as provided in the Communiqué on the Procedures and Principles of Application to the Data Controller;
          a fee may be charged only where the law allows. If you are not satisfied, you may complain to the Personal Data
          Protection Board (Kişisel Verileri Koruma Kurulu).
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The Service is intended for adults and for learners using it under supervision. It is not directed at children, and we
        do not knowingly create accounts for persons under 18 without supervision. If you believe a child has given us personal
        data, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this Policy",
    body: (
      <p>
        We may update this Policy when the Service, our providers or the law change. The date above shows the latest version;
        where changes are material and you have an account, we will make reasonable efforts to inform you.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="21 November 2026"
      intro={
        <p>
          This Policy explains how Geotechnical Insights Hub processes personal data, in line with Law No. 6698 on the
          Protection of Personal Data (KVKK), and how you can exercise your rights. It should be read with the{" "}
          <Link href="/terms" className={linkClass}>
            Terms of Use
          </Link>
          .
        </p>
      }
      sections={sections}
    />
  );
}
