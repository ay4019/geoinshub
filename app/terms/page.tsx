import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for Geotechnical Insights Hub.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Terms of Use</h1>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
        <p>
          By accessing this website, you agree to use the content and tools for informational and educational
          purposes only. Content may be updated, revised, or removed at any time without notice.
        </p>
        <p>
          You are responsible for evaluating the suitability of any information, assumptions, or calculations before
          applying them to real projects.
        </p>
        <p>
          This website does not provide professional engineering services, construction advice, legal advice, or
          regulatory compliance certification.
        </p>
        <p>
          Any reliance on the site is at your own risk. Use of this site does not create a client-consultant
          relationship.
        </p>
      </section>
    </div>
  );
}
