"use client";

import { SubscriptionProvider } from "@/components/subscription-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
