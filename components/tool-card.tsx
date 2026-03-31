import Link from "next/link";

import { EngineeringText } from "@/components/engineering-text";
import type { ToolDefinition } from "@/lib/types";

interface ToolCardProps {
  tool: ToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{tool.category}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">
        <EngineeringText text={tool.title} />
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
        <EngineeringText text={tool.shortDescription} />
      </p>
      <Link href={`/tools/${tool.slug}`} className="btn-base btn-md mt-4 w-fit">
        Open Tool
      </Link>
    </article>
  );
}
