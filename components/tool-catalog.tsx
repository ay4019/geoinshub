"use client";

import { useMemo, useState } from "react";

import { SearchInput } from "@/components/search-input";
import { ToolCard } from "@/components/tool-card";
import { TOOL_CATEGORIES, type ToolDefinition } from "@/lib/types";

interface ToolCatalogProps {
  tools: ToolDefinition[];
}

export function ToolCatalog({ tools }: ToolCatalogProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return tools;
    }

    return tools.filter((tool) => {
      const haystack = [
        tool.title,
        tool.category,
        tool.shortDescription,
        tool.tags.join(" "),
        tool.keywords.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query, tools]);

  const grouped = useMemo(() => {
    const map = filtered.reduce<Record<string, ToolDefinition[]>>((acc, tool) => {
      acc[tool.category] ??= [];
      acc[tool.category].push(tool);
      return acc;
    }, {});

    const additionalCategories = Object.keys(map).filter((category) => !TOOL_CATEGORIES.includes(category as never));

    return [...TOOL_CATEGORIES, ...additionalCategories]
      .filter((category) => map[category]?.length)
      .map((category) => ({ category, tools: map[category] }));
  }, [filtered]);

  return (
    <section className="space-y-8">
      <SearchInput
        value={query}
        onChange={setQuery}
        label="Search tools"
        placeholder="Search by title, category, or engineering keyword"
      />

      {grouped.length ? (
        grouped.map((group) => (
          <section key={group.category} className="space-y-4" aria-labelledby={`group-${group.category}`}>
            <h2 id={`group-${group.category}`} className="text-xl font-semibold text-slate-900">
              {group.category}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No tools match your search. Try a broader keyword.
        </div>
      )}
    </section>
  );
}
