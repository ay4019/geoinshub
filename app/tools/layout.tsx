import type { Metadata } from "next";

import { ProjectsBoreholeDropdown } from "@/components/projects-borehole-dropdown";
import { ToolUnitProvider } from "@/components/tool-unit-provider";

export const metadata: Metadata = {
  title: "Tools",
  description: "Searchable geotechnical calculation tools for educational and preliminary engineering use.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToolUnitProvider>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
        <header className="relative z-[9999] mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Geotechnical Tools</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                A structured collection of calculation tools covering key areas of geotechnical engineering, from site
                characterization to analytical methods.
              </p>
            </div>
            <ProjectsBoreholeDropdown />
          </div>
        </header>
        {children}
      </div>
    </ToolUnitProvider>
  );
}


