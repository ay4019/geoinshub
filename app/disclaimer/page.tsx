import type { Metadata } from "next";
import Link from "next/link";

import { B, LegalDocument, List, Notice, type LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Engineering, accuracy, AI and liability disclaimer for Geotechnical Insights Hub: an educational platform whose outputs are non-binding and must be independently verified.",
};

const sections: LegalSection[] = [
  {
    id: "purpose",
    title: "Educational purpose only",
    body: (
      <>
        <p>
          Geotechnical Insights Hub (the <B>Service</B>) is an educational platform. Its calculators, profile tools,
          visualisations, generated reports, AI interpretations, articles and guides exist to help students, educators and
          engineers <B>learn</B> geotechnical concepts, explore how methods behave and compare assumptions at an early,
          indicative stage.
        </p>
        <p>
          The Service is <B>not</B> a design tool, a certified engineering software package, a consultancy service or a
          substitute for site investigation, laboratory testing, engineering judgement or a qualified engineer.
        </p>
      </>
    ),
  },
  {
    id: "non-binding",
    title: "Outputs are non-binding",
    body: (
      <>
        <p>
          Every value, check result, chart, table, report and text produced by the Service is <B>indicative and
          non-binding</B>. No output is a representation, warranty, statement of fact, design value, approval,
          certification or opinion of the operator, and none has legal, contractual or regulatory effect.
        </p>
        <p>
          A result shown as “passes”, “OK”, “safe” or similar only means that the simplified calculation, with the inputs
          you entered, met the threshold coded in that tool. It does not mean that a structure, foundation, slope, wall or
          site is safe, compliant or fit for purpose.
        </p>
      </>
    ),
  },
  {
    id: "accuracy",
    title: "Limits of the methods and of the software",
    body: (
      <>
        <p>The calculations are simplified on purpose. In particular:</p>
        <List
          items={[
            "Empirical correlations (for example SPT‑, PI‑ or Vs‑based) carry large scatter and are valid only within the conditions of the studies they come from.",
            "Methods may omit effects that matter in practice, such as layering, anisotropy, drainage conditions, time effects, cyclic or dynamic loading, group effects, construction sequence, three‑dimensional geometry or soil–structure interaction.",
            "Default and example values are illustrative only and are not recommended design parameters.",
            "Rounding, unit conversion, numerical approximation, chart digitisation and interpolation introduce error.",
            "The software may contain bugs, outdated formulas, transcription errors or display faults, and results can change when the Service is updated.",
          ]}
        />
        <p>No guarantee is given that any calculation is correct, complete, current, or suitable for your case.</p>
      </>
    ),
  },
  {
    id: "standards",
    title: "References to codes and standards",
    body: (
      <>
        <p>
          Tools may refer to Eurocode 7, TBDY 2018, AASHTO LRFD, FHWA guidance or other publications. These references are
          the operator’s <B>simplified, partial and unofficial interpretation</B> for teaching purposes. They:
        </p>
        <List
          items={[
            "do not reproduce the standards in full and omit clauses, National Annex choices, partial factors and checks that may apply to your project;",
            "may be outdated, superseded or interpreted differently by the relevant authority;",
            "do not show compliance with any code, regulation, permit or contract;",
            "do not imply any affiliation with, or endorsement by, CEN, AFAD, AASHTO, FHWA or any other standards body or authority.",
          ]}
        />
        <p>Always work from the official, current text of the standard that governs your project.</p>
      </>
    ),
  },
  {
    id: "verification",
    title: "You must check everything",
    body: (
      <>
        <p>
          Before any output is used for any purpose beyond learning, you, and a suitably qualified and responsible engineer,
          must independently:
        </p>
        <List
          items={[
            "verify every input, unit and assumption, and that the soil parameters are representative of the site;",
            "confirm that each method is applicable to the ground profile, groundwater, loading and construction stage;",
            "repeat the calculations by independent means (hand calculation, recognised software or both);",
            "check compliance with the governing codes, regulations and contract requirements; and",
            "exercise engineering judgement on the results.",
          ]}
        />
        <p>Responsibility for this verification and for every decision based on the Service rests entirely with you.</p>
      </>
    ),
  },
  {
    id: "reports",
    title: "Generated reports",
    body: (
      <>
        <p>
          Reports, tables, figures and PDF files are produced <B>automatically</B> from the data you enter, using fixed
          templates. Whatever their layout or wording, they are not prepared, reviewed, checked, approved or signed by the
          operator or by any engineer, and they are not engineering reports, design calculations, certificates or
          deliverables.
        </p>
        <p>
          You must not present a generated report, or any part of it, as work prepared, reviewed or endorsed by
          Geotechnical Insights Hub or its operator, or submit it to any authority, client or third party as such.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI‑generated interpretations",
    body: (
      <>
        <p>
          Optional AI features (“Analyse with AI” and the parameter matrix “Generate report”) send your tabulated data,
          figures and method text to a third‑party large language model (currently Google Gemini) and display the text it
          returns. Please note:
        </p>
        <List
          items={[
            <>
              The model is driven by a <B>general‑purpose prompt</B> written once for each tool. The prompt is the same for
              every user and is <B>not tailored</B> to your project, site, geology, loading or design code.
            </>,
            "The model sees only the data sent to it. It has no knowledge of your site, borehole logs, laboratory results, drawings or project constraints.",
            "The output is not read, checked or edited by a human before you see it.",
            "Language models can be wrong while sounding confident: they may misread values, invent trends, numbers, standards clauses or references, contradict themselves or give different answers to the same data.",
            "AI text is not the opinion or advice of the operator or of any engineer, and must never be relied on without independent verification.",
          ]}
        />
      </>
    ),
  },
  {
    id: "articles",
    title: "Articles, guides and other content",
    body: (
      <p>
        Blog articles, research summaries, guides and examples express general views at the time of writing. They may be
        incomplete, simplified or out of date, may contain errors, and do not account for your circumstances. Citations are
        given for further reading; check the original sources.
      </p>
    ),
  },
  {
    id: "safety",
    title: "No safety‑critical or construction use",
    body: (
      <p>
        The Service must not be used as the basis for construction, procurement, temporary works, excavation, demolition,
        emergency response, insurance, valuation, legal proceedings or any decision where an error could cause injury,
        loss of life, damage to property, environmental harm or financial loss.
      </p>
    ),
  },
  {
    id: "relationship",
    title: "No professional relationship",
    body: (
      <p>
        Using the Service, contacting the operator, or receiving a reply does not create an engineer–client, consultant–client,
        employment, agency, partnership or fiduciary relationship, and the operator owes you no professional duty of care.
      </p>
    ),
  },
  {
    id: "liability",
    title: "No warranty and no liability",
    body: (
      <>
        <Notice>
          The Service and all outputs are provided “as is” and “as available”, without any warranty of any kind, express or
          implied, including accuracy, completeness, reliability, currency, merchantability, fitness for a particular purpose
          and non‑infringement.
        </Notice>
        <p>
          To the fullest extent permitted by the law of the Republic of Türkiye, the operator is not liable for any loss or
          damage of any kind, whether direct, indirect, incidental, consequential, special, financial, professional,
          regulatory or project‑delay loss, arising from use of, reliance on, or inability to use the Service or any output,
          including losses caused by errors in calculations, reports, AI text or content. Liability that cannot be excluded
          by law (such as for intent or gross negligence) is not affected. Full terms are in the{" "}
          <Link href="/terms" className="font-semibold underline underline-offset-4">
            Terms of Use
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "links",
    title: "External links and third‑party services",
    body: (
      <p>
        Links to external websites, standards bodies, publications or tools are provided for convenience. The operator does
        not control or endorse them and is not responsible for their content, availability or practices. Third‑party
        services used to run the Service (hosting, database, e‑mail, AI) can fail or change, which may affect results or
        availability.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this Disclaimer",
    body: (
      <p>
        This Disclaimer may be updated at any time; the date above shows the latest version. Continued use of the Service
        after an update means you accept the updated Disclaimer.
      </p>
    ),
  },
];

export default function DisclaimerPage() {
  return (
    <LegalDocument
      title="Disclaimer"
      updated="21 November 2026"
      intro={
        <p>
          Please read this Disclaimer carefully. It forms part of the{" "}
          <Link href="/terms" className="font-semibold underline underline-offset-4">
            Terms of Use
          </Link>{" "}
          and applies to every tool, report, AI feature, article and other content on Geotechnical Insights Hub, published
          from the Republic of Türkiye.
        </p>
      }
      sections={sections}
    />
  );
}
