"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchMySubscriptionProfile } from "@/lib/subscription-profile-client";
import { type SubscriptionTier } from "@/lib/subscription";

type SubscriptionContextValue = {
  tier: SubscriptionTier;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    void refresh();
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

  const value = useMemo(
    () => ({
      tier,
      isAdmin,
      loading,
      refresh,
    }),
    [tier, isAdmin, loading, refresh],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    return {
      tier: "none",
      isAdmin: false,
      loading: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
