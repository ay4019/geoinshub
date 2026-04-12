import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPageGate } from "@/components/admin-page-gate";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Admin",
  description: "Site administration - subscription tiers.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      <AdminPageGate />
    </div>
  );
}
