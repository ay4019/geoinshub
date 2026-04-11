import type { Metadata } from "next";

import { UserGuidePage } from "@/components/user-guide-page";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "Geotechnical Insights Hub: account, project and borehole management, using tools with project data, saving results, plots and reports.",
};

export default function GuidePage() {
  return <UserGuidePage />;
}
