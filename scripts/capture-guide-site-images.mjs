/**
 * Captures the user-guide screenshots from the local dev server with consistent framing.
 * Requires: dev server on http://127.0.0.1:3000 and Playwright (devDependency).
 *
 * Tool screens use /guide-capture/tool/<slug>?tier=none|bronze|silver|gold, which renders the real
 * tool as a viewer of that membership tier (no sign-in needed).
 *
 * Screens that need a signed-in account with project data (Boreholes, Use in Tools, Saved analyses,
 * parameter matrix) are not captured here; their images are kept as they are.
 *
 * Usage: node scripts/capture-guide-site-images.mjs [name-filter]
 */
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "images", "guide");
const BASE = process.env.GUIDE_CAPTURE_URL ?? "http://127.0.0.1:3000";
const only = process.argv[2] ?? "";
const PAD = 16;

/** Hides dev overlays and un-sticks sticky bars so they do not float over full-height captures. */
const CAPTURE_CSS = `
  nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }
  .sticky, [class*="lg:sticky"] { position: static !important; }
  *, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
`;

/** Teal call-out ring drawn on an element in the page before a capture. */
const HIGHLIGHT = "outline: 3px solid #14b8a6 !important; outline-offset: 4px !important; border-radius: 10px;";

const written = [];

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.addStyleTag({ content: CAPTURE_CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

async function shotElement(locator, name) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: join(outDir, name), type: "png", animations: "disabled", padding: PAD });
  written.push(name);
}

/** Captures the page region from the top of `top` to the bottom of `bottom` (or `maxHeight`), full page width. */
async function shotRegion(page, name, top, { bottom = null, maxHeight = 1400, x = null, width = null, topOffset = -PAD, bottomOffset = PAD } = {}) {
  const t = await top.boundingBox();
  if (!t) throw new Error(`${name}: top element not visible`);
  const scrollY = await page.evaluate(() => window.scrollY);
  const yTop = t.y + scrollY + topOffset;
  let yBottom = yTop + maxHeight;
  if (bottom) {
    const b = await bottom.boundingBox();
    if (b) yBottom = Math.min(b.y + scrollY + b.height + bottomOffset, yTop + maxHeight);
  }
  const vw = page.viewportSize().width;
  const left = x ?? 12;
  await page.screenshot({
    path: join(outDir, name),
    fullPage: true,
    clip: { x: left, y: Math.max(0, yTop), width: width ?? vw - left * 2, height: yBottom - yTop },
    animations: "disabled",
  });
  written.push(name);
}

const tab = (page, label) => page.locator("button", { hasText: new RegExp(`^${label}$`) }).first();
const tool = (slug, tier) => `/guide-capture/tool/${slug}?tier=${tier}`;

async function calculate(page) {
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  await page.waitForTimeout(900);
}

const jobs = {
  /* ───────── site and account ───────── */
  async home(page) {
    await go(page, "/");
    await shotElement(page.locator("header").first(), "site-main-navigation.png");
    await shotElement(page.locator("main section").first(), "site-hero.png");
  },
  async account(page) {
    await go(page, "/account");
    await page.getByRole("heading", { name: "Log in to your account" }).waitFor();
    await shotElement(page.locator("section.account-ui-sans").first(), "account-login.png");

    await go(page, "/account?mode=signup");
    const section = page.locator("section.account-ui-sans").first();
    const tiers = page.locator("div.border-t.border-slate-200").filter({ hasText: "Compare what each tier includes" }).first();
    await shotElement(tiers, "account-membership-tiers.png");
    const box = await section.boundingBox();
    await shotRegion(page, "account-signup.png", section.locator("h2").first(), {
      bottom: page.getByRole("button", { name: "Sign Up" }).first(),
      maxHeight: 900,
      x: Math.max(0, box.x - PAD),
      width: box.width + PAD * 2,
    });

    await go(page, "/guide-capture/account-header");
    await shotElement(page.locator("header").first(), "account-header-tier.png");
    await go(page, "/guide-capture/account-panel");
    await shotElement(page.locator("section.account-ui-sans").first(), "account-information-panel.png");
  },
  async projects(page) {
    await go(page, "/guide-capture/projects-empty");
    await shotElement(page.locator("section.account-ui-sans").first(), "projects-empty.png");
    await go(page, "/guide-capture/projects-active");
    await shotElement(page.locator("section.account-ui-sans").first(), "projects-active.png");
    await go(page, "/guide-capture/tool-save-panel");
    await shotElement(page.locator('[data-guide-capture="tool-save-panel"]'), "save-analysis-to-project-panel.png");
    await go(page, "/guide-capture/eu-n60-autofill");
    await shotElement(page.locator('[data-guide-capture="eu-n60-autofill"]'), "soil-profile-n60-autofill-example.png");
  },

  /* ───────── tools catalogue ───────── */
  async catalogue(page) {
    await go(page, "/tools");
    const site = page.getByText("Site Characterisation Tools", { exact: true }).first();
    const analysis = page.getByText("Geotechnical Analysis Tools", { exact: true }).first();
    await site.evaluate((el, css) => (el.closest("button,a,[role=tab],div").style.cssText += css), HIGHLIGHT);
    await analysis.evaluate((el) => (el.closest("button,a,[role=tab],div").style.cssText += "outline: 3px solid #6366f1 !important; outline-offset: 4px !important; border-radius: 10px;"));
    await shotRegion(page, "tools-landing-two-categories.png", page.locator("h1").first(), { bottom: analysis, bottomOffset: 90, maxHeight: 760 });

    await go(page, "/tools/spt-corrections");
    const pb = page.getByRole("button", { name: /Projects and Boreholes/ }).first();
    await pb.evaluate((el, css) => (el.style.cssText += css), HIGHLIGHT);
    await shotRegion(page, "tools-header-projects-boreholes.png", pb, { bottom: tab(page, "Information"), topOffset: -28, bottomOffset: 24, maxHeight: 600 });
    await shotElement(tab(page, "Calculation").locator("xpath=ancestor::div[1]"), "tool-interface-four-tabs.png");
  },

  /* ───────── calculation tools and membership levels ───────── */
  async calc(page) {
    const slug = "traditional-bearing-capacity-methods";
    await go(page, tool(slug, "gold"));
    await calculate(page);
    await shotRegion(page, "tool-calculation-layout.png", tab(page, "Calculation"), { bottom: page.locator("#detailed-calculations"), bottomOffset: -12, maxHeight: 1500 });

    await go(page, tool(slug, "silver"));
    await calculate(page);
    await shotRegion(page, "tier-details-silver.png", page.locator("#detailed-calculations"), { maxHeight: 760 });

    await go(page, tool(slug, "none"));
    await calculate(page);
    await shotRegion(page, "tier-details-guest.png", page.locator("#detailed-calculations"), { maxHeight: 520 });

    await tab(page, "Information").click();
    await page.waitForTimeout(500);
    await shotRegion(page, "tier-information-guest.png", tab(page, "Information"), { maxHeight: 560 });

    await go(page, tool(slug, "gold"));
    await tab(page, "Information").click();
    await page.waitForTimeout(500);
    await shotRegion(page, "tab-information-equations.png", tab(page, "Information"), { maxHeight: 900 });
  },

  /* ───────── profile tools ───────── */
  async profile(page) {
    await go(page, tool("spt-corrections", "gold"));
    await tab(page, "Soil Profile Plot").click().catch(() => {});
    await page.waitForTimeout(800);
    await shotRegion(page, "tools-profile-spt-manual-example.png", tab(page, "Calculation"), { maxHeight: 900 });

    await tab(page, "Report").click();
    await page.waitForTimeout(800);
    await shotRegion(page, "report-tab-overview.png", tab(page, "Report"), { maxHeight: 470 });
  },
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.warn("page error:", e.message));
  for (const [name, job] of Object.entries(jobs)) {
    if (only && !name.includes(only)) continue;
    try {
      await job(page);
    } catch (error) {
      console.error(`✗ ${name}:`, error.message.split("\n")[0]);
    }
  }
  await browser.close();
  for (const file of written) console.log("Wrote:", join(outDir, file));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
