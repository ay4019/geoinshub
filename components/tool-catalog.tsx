"use client";

import { useEffect, useMemo, useState } from "react";

import { SearchInput } from "@/components/search-input";
import { ToolCard } from "@/components/tool-card";
import { TOOL_CATEGORIES, type ToolDefinition } from "@/lib/types";

interface ToolCatalogProps {
  tools: ToolDefinition[];
}

const TOOL_SUPERGROUPS = [
  {
    id: "site-characterization",
    title: "Site Characterization Tools",
    categories: ["Mechanical Tools", "Rigidity / Deformation Tools", "Stress Related Tools"],
  },
  {
    id: "geotechnical-analysis",
    title: "Geotechnical Analysis Tools",
    categories: [
      "Bearing Capacity",
      "Settlement",
      "Liquefaction",
      "Earth Pressure & Retaining Structures",
      "Pile Foundations",
      "Ground Improvement",
      "Railway Geotechnics",
    ],
  },
] as const;

type ToolSupersection = {
  id: string;
  title: string;
  categories: Array<{ category: string; tools: ToolDefinition[] }>;
};

export function ToolCatalog({ tools }: ToolCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeSupersection, setActiveSupersection] = useState<string>("site-characterization");

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

  const groupedBySupersection = useMemo(() => {
    const usedCategories = new Set<string>();

    const sections: ToolSupersection[] = TOOL_SUPERGROUPS.map((section) => {
      const categories = section.categories
        .map((category) => grouped.find((group) => group.category === category))
        .filter((group): group is (typeof grouped)[number] => Boolean(group));

      categories.forEach((group) => usedCategories.add(group.category));

      return {
        ...section,
        categories,
      };
    }).filter((section) => section.categories.length);

    const remainingCategories = grouped.filter((group) => !usedCategories.has(group.category));

    if (remainingCategories.length) {
      sections.push({
        id: "other-tools",
        title: "Other Tools",
        categories: remainingCategories,
      });
    }

    return sections;
  }, [grouped]);

  useEffect(() => {
    if (!groupedBySupersection.length) {
      return;
    }

    if (!groupedBySupersection.some((section) => section.id === activeSupersection)) {
      setActiveSupersection(groupedBySupersection[0].id);
    }
  }, [activeSupersection, groupedBySupersection]);

  const visibleSection =
    groupedBySupersection.find((section) => section.id === activeSupersection) ?? groupedBySupersection[0];

  return (
    <section className="space-y-8">
      <SearchInput
        value={query}
        onChange={setQuery}
        label="Search tools"
        placeholder="Search by title, category, or engineering keyword"
      />

      {groupedBySupersection.length ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {groupedBySupersection.map((section) => {
              const isActive = section.id === visibleSection?.id;
              const toolCount = section.categories.reduce((sum, category) => sum + category.tools.length, 0);

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSupersection(section.id)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                    isActive
                      ? "border-slate-300 bg-white shadow-sm"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
                  }`}
                  aria-pressed={isActive}
                >
                  <h2 className="font-serif text-xl font-semibold text-slate-900">{section.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {section.categories.length} categories · {toolCount} tools
                  </p>
                </button>
              );
            })}
          </div>

          <section
            key={visibleSection.id}
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby={`supergroup-${visibleSection.id}`}
          >
            <div className="space-y-1">
              <h2 id={`supergroup-${visibleSection.id}`} className="font-serif text-2xl font-semibold text-slate-900">
                {visibleSection.title}
              </h2>
              <p className="text-sm text-slate-600">
                Select a subcategory below to browse the tools in this group.
              </p>
            </div>

            {visibleSection.categories.map((group) => (
              <section key={group.category} className="space-y-4" aria-labelledby={`group-${group.category}`}>
                <h3 id={`group-${group.category}`} className="font-serif text-lg font-semibold text-slate-800">
                  {group.category}
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </section>
            ))}
          </section>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No tools match your search. Try a broader keyword.
        </div>
      )}
    </section>
  );
}
