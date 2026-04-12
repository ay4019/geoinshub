import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { getArticleSlugs, getToolSlugs } from "@/lib/data-layer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CounterStore, PublicCounters } from "@/lib/types";

const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json");
const NEWSLETTER_PATH = path.join(process.cwd(), "data", "newsletter.json");

let writeQueue: Promise<void> = Promise.resolve();

type AnalyticsMetric = "visits" | "tool_uses" | "article_reads";

function getDefaultCounters(): CounterStore {
  const toolBreakdown = Object.fromEntries(getToolSlugs().map((slug) => [slug, 0]));
  const articleBreakdown = Object.fromEntries(getArticleSlugs().map((slug) => [slug, 0]));

  return {
    visits: 0,
    toolUses: 0,
    articleReads: 0,
    toolBreakdown,
    articleBreakdown,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumberMap(value: unknown): Record<string, number> {
  if (!isObject(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, number>>((acc, [key, val]) => {
    if (typeof val === "number" && Number.isFinite(val)) {
      acc[key] = val;
    }
    return acc;
  }, {});
}

function normalizeCounters(input: unknown): CounterStore {
  const defaults = getDefaultCounters();

  if (!isObject(input)) {
    return defaults;
  }

  return {
    visits: typeof input.visits === "number" && Number.isFinite(input.visits) ? input.visits : defaults.visits,
    toolUses: typeof input.toolUses === "number" && Number.isFinite(input.toolUses) ? input.toolUses : defaults.toolUses,
    articleReads:
      typeof input.articleReads === "number" && Number.isFinite(input.articleReads)
        ? input.articleReads
        : defaults.articleReads,
    toolBreakdown: { ...defaults.toolBreakdown, ...toNumberMap(input.toolBreakdown) },
    articleBreakdown: { ...defaults.articleBreakdown, ...toNumberMap(input.articleBreakdown) },
  };
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeCounters(store: CounterStore): Promise<void> {
  await fs.writeFile(COUNTERS_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function getAnalyticsAdminClient() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

async function mutateCounters(mutator: (current: CounterStore) => CounterStore): Promise<void> {
  writeQueue = writeQueue
    .then(async () => {
      const current = normalizeCounters(await readJsonFile(COUNTERS_PATH, getDefaultCounters()));
      const next = normalizeCounters(mutator(current));
      await writeCounters(next);
    })
    .catch(() => {
      // Prevent queue poisoning; operations are best-effort.
    });

  await writeQueue;
}

export async function getCountersSnapshot(): Promise<CounterStore> {
  const current = await readJsonFile(COUNTERS_PATH, getDefaultCounters());
  return normalizeCounters(current);
}

export async function getPublicCounters(): Promise<PublicCounters> {
  const admin = getAnalyticsAdminClient();
  if (admin) {
    try {
      const { data } = await admin.from("site_metrics").select("visits, tool_uses, article_reads").eq("id", 1).maybeSingle();
      if (data) {
        const row = data as { visits?: number; tool_uses?: number; article_reads?: number };
        return {
          visits: row.visits ?? 0,
          toolUses: row.tool_uses ?? 0,
          articleReads: row.article_reads ?? 0,
        };
      }
    } catch {
      // Fall back to local file storage in local/dev contexts.
    }
  }

  const snapshot = await getCountersSnapshot();
  return {
    visits: snapshot.visits,
    toolUses: snapshot.toolUses,
    articleReads: snapshot.articleReads,
  };
}

async function incrementSupabaseMetric(metric: AnalyticsMetric, slug?: string): Promise<boolean> {
  const admin = getAnalyticsAdminClient();
  if (!admin) {
    return false;
  }

  try {
    const { error } = await admin.rpc("increment_site_metric", {
      p_metric: metric,
      p_slug: slug ?? null,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function incrementVisitCounter(): Promise<void> {
  if (await incrementSupabaseMetric("visits")) {
    return;
  }

  await mutateCounters((current) => ({
    ...current,
    visits: current.visits + 1,
  }));
}

export async function incrementToolUseCounter(slug: string): Promise<void> {
  if (await incrementSupabaseMetric("tool_uses", slug)) {
    return;
  }

  await mutateCounters((current) => ({
    ...current,
    toolUses: current.toolUses + 1,
    toolBreakdown: {
      ...current.toolBreakdown,
      [slug]: (current.toolBreakdown[slug] ?? 0) + 1,
    },
  }));
}

export async function incrementArticleReadCounter(slug: string): Promise<void> {
  if (await incrementSupabaseMetric("article_reads", slug)) {
    return;
  }

  await mutateCounters((current) => ({
    ...current,
    articleReads: current.articleReads + 1,
    articleBreakdown: {
      ...current.articleBreakdown,
      [slug]: (current.articleBreakdown[slug] ?? 0) + 1,
    },
  }));
}

interface NewsletterStore {
  emails: string[];
}

function normalizeNewsletter(input: unknown): NewsletterStore {
  if (!isObject(input)) {
    return { emails: [] };
  }

  const emails = Array.isArray(input.emails)
    ? input.emails.filter((email): email is string => typeof email === "string")
    : [];

  return { emails };
}

export async function addNewsletterEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  const admin = getAnalyticsAdminClient();
  if (admin) {
    try {
      await admin.from("newsletter_subscribers").upsert({ email: normalizedEmail }, { onConflict: "email" });
      return;
    } catch {
      // Fall back to local file storage in local/dev contexts.
    }
  }

  try {
    const raw = await readJsonFile<NewsletterStore>(NEWSLETTER_PATH, { emails: [] });
    const store = normalizeNewsletter(raw);
    const nextEmails = store.emails.includes(normalizedEmail) ? store.emails : [...store.emails, normalizedEmail];

    await fs.writeFile(NEWSLETTER_PATH, `${JSON.stringify({ emails: nextEmails }, null, 2)}\n`, "utf8");
  } catch {
    // Best-effort local persistence.
  }
}
