"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onLogout = async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    setIsPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/account");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button type="button" onClick={onLogout} disabled={isPending} className={className ?? "btn-base px-3.5 py-2.5 text-[15px]"}>
      {isPending ? "Logging out..." : "Logout"}
    </button>
  );
}
