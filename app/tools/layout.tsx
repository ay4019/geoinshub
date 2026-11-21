import type { Metadata } from "next";

import { ToolUnitProvider } from "@/components/tool-unit-provider";
import { ToolsHeader } from "@/components/tools-header";
import { getAnalysisToolSlugs } from "@/lib/data-layer";

export const metadata: Metadata = {
  title: "Tools",
  description: "Searchable geotechnical calculation tools for educational and preliminary engineering use.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToolUnitProvider>
      <div className="mx-auto w-full max-w-[1600px] px-3 py-6 sm:px-6 sm:py-12">
        <ToolsHeader analysisSlugs={getAnalysisToolSlugs()} />
        {children}
      </div>
    </ToolUnitProvider>
  );
}
