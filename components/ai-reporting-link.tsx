"use client";

import { useRouter } from "next/navigation";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AiReportingLinkProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> & {
  className?: string;
  children?: ReactNode;
};

export function AiReportingLink({
  className = "",
  children = "AI-powered reporting",
  ...buttonProps
}: AiReportingLinkProps) {
  const router = useRouter();
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = useCallback(async () => {
    if (isNavigating) return;

    setIsNavigating(true);
    try {
      if (!supabaseReady) {
        router.push("/account?mode=signup");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      router.push(user ? "/projects" : "/account?mode=signup");
    } finally {
      setIsNavigating(false);
    }
  }, [isNavigating, router, supabaseReady]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={`inline cursor-pointer bg-transparent p-0 text-amber-600 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${className}`}
      aria-label="AI-powered reporting"
      disabled={isNavigating}
      {...buttonProps}
    >
      <span className="font-semibold">{children}</span>
    </button>
  );
}

