"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

import { sanitizeMatrixAiMarkdown } from "@/lib/matrix-ai-markdown";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mt-5 border-b border-slate-200 pb-2 text-lg font-bold text-slate-900 first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mt-4 text-base font-bold text-slate-900 first:mt-0">{children}</h4>
  ),
  h3: ({ children }) => (
    <h5 className="mt-3 text-sm font-bold text-slate-900 first:mt-0">{children}</h5>
  ),
  h4: ({ children }) => (
    <h6 className="mt-3 text-sm font-semibold text-slate-800 first:mt-0">{children}</h6>
  ),
  p: ({ children }) => <p className="mb-3 text-slate-800 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-slate-800 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-slate-800 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <hr className="my-4 border-slate-200" />,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-amber-300/80 bg-amber-50/50 py-1 pl-3 text-slate-700">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[36rem] border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100 text-slate-800">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-slate-100">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-slate-200 px-2.5 py-2 align-top font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-slate-200 px-2.5 py-2 align-top">{children}</td>,
  code: ({ className, children }) => {
    if (className?.includes("language-")) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-900">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-slate-900/90 p-3 text-xs leading-relaxed text-slate-100">{children}</pre>
  ),
};

export function IntegratedMatrixAiReportBody({ content }: { content: string }) {
  const sanitized = useMemo(() => sanitizeMatrixAiMarkdown(content), [content]);
  return (
    <div className="matrix-ai-report-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}
