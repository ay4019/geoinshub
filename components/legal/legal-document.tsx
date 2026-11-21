import Link from "next/link";
import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Shared layout for Terms of Use, Disclaimer and Privacy Policy: contents and numbered sections. */
export function LegalDocument({
  title,
  intro,
  sections,
  updated,
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  updated: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Legal</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
        <p className="text-sm text-slate-500">Last updated: {updated}</p>
        <div className="text-[15px] leading-7 text-slate-700">{intro}</div>
      </header>


      <nav aria-label="Contents" className="rounded-xl border border-slate-200 bg-slate-50/80 p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contents</p>
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id} className="flex gap-2">
              <span className="w-6 shrink-0 tabular-nums text-slate-400">{i + 1}.</span>
              <a href={`#${s.id}`} className="text-slate-800 underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-600">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="space-y-7 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm sm:p-8">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 space-y-2.5">
            <h2 className="text-xl font-semibold text-slate-900">
              {i + 1}. {s.title}
            </h2>
            {s.body}
          </section>
        ))}
        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          This page is provided for general information and does not constitute legal advice. If a translation of this page
          is ever provided, the English version prevails. See also the{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Use
          </Link>
          ,{" "}
          <Link href="/disclaimer" className="underline underline-offset-2">
            Disclaimer
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </article>
    </div>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-slate-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-slate-900">{children}</strong>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 font-medium uppercase tracking-[0.01em] text-slate-800">{children}</p>;
}
