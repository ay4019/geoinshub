import { ToolCatalog } from "@/components/tool-catalog";
import { getAllTools } from "@/lib/data-layer";

export default function ToolsPage() {
  const tools = getAllTools();

  return <ToolCatalog tools={tools} />;
}
