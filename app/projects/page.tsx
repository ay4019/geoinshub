import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProjectsDashboardPanel } from "@/components/projects-dashboard-panel";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Projects",
  description: "Manage your Geotechnical Insights Hub cloud projects and boreholes.",
};

export default async function ProjectsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/account");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account");
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <ProjectsDashboardPanel />
    </div>
  );
}
