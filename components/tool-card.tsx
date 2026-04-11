import Link from "next/link";

import { EngineeringText } from "@/components/engineering-text";
import type { ToolDefinition } from "@/lib/types";

interface ToolCardProps {
  tool: ToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500 sm:text-xs" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        {tool.category}
      </p>
      <h3 className="mt-1.5 text-base font-semibold text-slate-900 sm:mt-2 sm:text-lg">
        <EngineeringText text={tool.title} />
      </h3>
      <p className="mt-1.5 flex-1 text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <EngineeringText text={tool.shortDescription} />
      </p>
      <Link href={`/tools/${tool.slug}`} className="btn-base btn-md mt-3 w-fit sm:mt-4">
        Open Tool
      </Link>
    </article>
  );
}
