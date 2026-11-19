import Link from "next/link";

import { EngineeringText } from "@/components/engineering-text";
import type { ToolDefinition } from "@/lib/types";

interface ToolCardProps {
  tool: ToolDefinition;
  /** "open": no frame, just a top rule and a text link (used on the home page). */
  variant?: "card" | "open";
}

export function ToolCard({ tool, variant = "card" }: ToolCardProps) {
  if (variant === "open") {
    return (
      <article className="group flex h-full flex-col border-t border-slate-300 pt-4">
        <p className="text-[10px] uppercase tracking-[0.1em] text-amber-800 sm:text-xs" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
          {tool.category}
        </p>
        <h3 className="mt-1.5 text-base font-semibold text-slate-900 sm:text-lg">
          <Link href={`/tools/${tool.slug}`} className="transition-colors hover:!text-amber-800">
            <EngineeringText text={tool.title} />
          </Link>
        </h3>
        <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-600" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
          <EngineeringText text={tool.shortDescription} />
        </p>
        <Link
          href={`/tools/${tool.slug}`}
          className="mt-3 w-fit text-sm font-semibold !text-amber-800 underline-offset-4 hover:underline"
        >
          Open tool →
        </Link>
      </article>
    );
  }

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
