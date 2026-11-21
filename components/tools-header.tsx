"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { ProjectsBoreholeDropdown } from "@/components/projects-borehole-dropdown";
import { ANALYSIS_SUPERGROUP, TOOLS_SECTION_EVENT, readToolsSection } from "@/lib/tool-supergroups";

/**
 * Header of the /tools section. The catalogue page gets the full title; individual tool pages already have
 * their own h1 (the tool name), so only the project/borehole selector is shown there.
 * The selector is hidden for geotechnical analysis tools (and on the catalogue while that group is open):
 * those tools take their own inputs and do not use project borehole data.
 */
export function ToolsHeader({ analysisSlugs }: { analysisSlugs: string[] }) {
  const pathname = usePathname();
  const isCatalogue = pathname === "/tools";
  const [section, setSection] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSection(readToolsSection());
    sync();
    window.addEventListener(TOOLS_SECTION_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(TOOLS_SECTION_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, [pathname]);

  const slug = pathname.startsWith("/tools/") ? decodeURIComponent(pathname.slice("/tools/".length).split("/")[0]) : "";
  const showProjectSelector = isCatalogue ? section !== ANALYSIS_SUPERGROUP : !analysisSlugs.includes(slug);

  if (!isCatalogue) {
    return showProjectSelector ? (
      <header className="mb-3 flex justify-end sm:mb-4">
        <ProjectsBoreholeDropdown />
      </header>
    ) : null;
  }

  return (
    <header className="mb-5 sm:mb-8">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Geotechnical Tools</h1>
          <p className="mt-2 text-sm leading-[1.6] text-slate-600 sm:mt-3 sm:text-base">
            A structured collection of calculation tools covering key areas of geotechnical engineering, from site
            characterisation to analytical methods.
          </p>
        </div>
        {showProjectSelector ? <ProjectsBoreholeDropdown /> : null}
      </div>
    </header>
  );
}
