"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchMySubscriptionProfile } from "@/lib/subscription-profile-client";
import {
  effectiveSubscriptionTier,
  effectiveTierDisplayLabel,
  type SubscriptionTier,
} from "@/lib/subscription";

type SubscriptionContextValue = {
  /** Stored `subscription_tier` from DB (unchanged for admin). */
  tier: SubscriptionTier;
  isAdmin: boolean;
  /** Tier after admin override (Gold) for limits, gating, and most UI chrome. */
  effectiveTier: SubscriptionTier;
  effectiveTierLabel: string;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tier, setTier] = useState<SubscriptionTier>("none");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setTier("none");
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTier("none");
        setIsAdmin(false);
        return;
      }
      const profile = await fetchMySubscriptionProfile(supabase, user.id);
      if (!profile) {
        setTier("bronze");
        setIsAdmin(false);
        return;
      }
      setTier(profile.subscription_tier);
      setIsAdmin(profile.is_admin);
    } catch {
      setTier("none");
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Initial load + whenever the user navigates (e.g. /admin → /account) so tier changes from the DB show up. */
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  const effectiveTier = useMemo(() => effectiveSubscriptionTier(tier, isAdmin), [tier, isAdmin]);
  const effectiveTierLabel = useMemo(() => effectiveTierDisplayLabel(tier, isAdmin), [tier, isAdmin]);

  const value = useMemo(
    () => ({
      tier,
      isAdmin,
      effectiveTier,
      effectiveTierLabel,
      loading,
      refresh,
    }),
    [tier, isAdmin, effectiveTier, effectiveTierLabel, loading, refresh],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    return {
      tier: "none",
      isAdmin: false,
      effectiveTier: "none",
      effectiveTierLabel: effectiveTierDisplayLabel("none", false),
      loading: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
