"use server";

import { cookies } from "next/headers";

import {
  addNewsletterEmail,
  getPublicCounters,
  incrementArticleReadCounter,
  incrementToolUseCounter,
  incrementVisitCounter,
} from "@/lib/counters-store";

const VISIT_COOKIE_KEY = "gih_visit_session";
const VISIT_COOKIE_TTL_SECONDS = 60 * 30;

export async function getMetricsAction() {
  try {
    return await getPublicCounters();
  } catch {
    return { visits: 0, toolUses: 0, articleReads: 0 };
  }
}

export async function registerVisitAction(): Promise<{ incremented: boolean }> {
  try {
    const cookieStore = await cookies();
    const seen = cookieStore.get(VISIT_COOKIE_KEY);

    if (seen?.value === "1") {
      return { incremented: false };
    }

    cookieStore.set(VISIT_COOKIE_KEY, "1", {
      httpOnly: true,
      maxAge: VISIT_COOKIE_TTL_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    await incrementVisitCounter();
    return { incremented: true };
  } catch {
    return { incremented: false };
  }
}

export async function incrementToolUseAction(slug: string): Promise<void> {
  try {
    if (!slug) {
      return;
    }

    await incrementToolUseCounter(slug);
  } catch {
    // Fail silently to protect UX.
  }
}

export async function incrementArticleReadAction(slug: string): Promise<void> {
  try {
    if (!slug) {
      return;
    }

    await incrementArticleReadCounter(slug);
  } catch {
    // Fail silently to protect UX.
  }
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function subscribeNewsletterAction(email: string): Promise<{ ok: boolean }> {
  try {
    if (!isLikelyEmail(email)) {
      return { ok: false };
    }

    await addNewsletterEmail(email);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
