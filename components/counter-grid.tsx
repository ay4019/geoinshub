import type { PublicCounters } from "@/lib/types";

interface CounterGridProps {
  counters: PublicCounters;
}

const counterItems: Array<{ key: keyof PublicCounters; label: string }> = [
  { key: "visits", label: "Total website visits" },
  { key: "toolUses", label: "Total tool uses" },
  { key: "articleReads", label: "Total article reads" },
];

export function CounterGrid({ counters }: CounterGridProps) {
  return (
    <section aria-label="Site counters" className="grid gap-4 sm:grid-cols-3">
      {counterItems.map((item) => (
        <article
          key={item.key}
          className="group relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
            <p className="mt-3 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {counters[item.key].toLocaleString()}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
