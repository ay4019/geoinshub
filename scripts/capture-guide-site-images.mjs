/**
 * Captures guide images from the local dev server with consistent framing.
 * Requires: dev server on http://127.0.0.1:3000 and: npm install playwright
 *
 * Usage: node scripts/capture-guide-site-images.mjs
 */
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "images", "guide");

const BASE = process.env.GUIDE_CAPTURE_URL ?? "http://127.0.0.1:3000";

/** Padding around element captures (CSS pixels) for balanced whitespace */
const PAD = 20;

async function waitForFonts(page) {
  await page.evaluate(() => document.fonts.ready);
}

/**
 * @param {import('playwright').Locator} locator
 * @param {string} path
 */
async function shotElement(locator, path) {
  await locator.scrollIntoViewIfNeeded();
  await waitForFonts(locator.page());
  await locator.screenshot({
    path,
    type: "png",
    animations: "disabled",
    padding: PAD,
    scale: "css",
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 3,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  // --- Home
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator("main").waitFor({ state: "visible", timeout: 30_000 });
  await waitForFonts(page);

  const header = page.locator("header").first();
  await shotElement(header, join(outDir, "site-main-navigation.png"));

  const hero = page.locator("main section").first();
  await shotElement(hero, join(outDir, "site-hero.png"));

  // --- Account login
  await page.goto(`${BASE}/account`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Log in to your account" }).waitFor({ state: "visible", timeout: 30_000 });
  await waitForFonts(page);
  const loginCard = page.locator("section.account-ui-sans").first();
  await shotElement(loginCard, join(outDir, "account-login.png"));

  // --- Account signup: tier block + form strip (h2 top → above tier)
  await page.goto(`${BASE}/account?mode=signup`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Create your account" }).waitFor({ state: "visible", timeout: 30_000 });
  await waitForFonts(page);

  const signupSection = page.locator("section.account-ui-sans").first();
  const tierBlock = page
    .locator("div.border-t.border-slate-200")
    .filter({ has: page.getByText("Compare membership tiers") })
    .first();
  await tierBlock.waitFor({ state: "visible", timeout: 15_000 });

  await shotElement(tierBlock, join(outDir, "account-membership-tiers.png"));

  const h2 = signupSection.locator("h2").first();
  await h2.scrollIntoViewIfNeeded();
  const sbox = await signupSection.boundingBox();
  const h2box = await h2.boundingBox();
  const tbox = await tierBlock.boundingBox();

  if (sbox && h2box && tbox && tbox.y > h2box.y) {
    const margin = 12;
    await page.screenshot({
      path: join(outDir, "account-signup.png"),
      clip: {
        x: Math.max(0, sbox.x - margin),
        y: Math.max(0, h2box.y - margin),
        width: Math.min(sbox.width + margin * 2, 1400),
        height: tbox.y - h2box.y + margin * 2,
      },
      animations: "disabled",
      scale: "css",
    });
  } else {
    await shotElement(signupSection, join(outDir, "account-signup.png"));
  }

  // Guide tier UI (simulated Gold on /guide-capture/* — see lib/guide-capture.ts)
  await page.goto(`${BASE}/guide-capture/account-header`, { waitUntil: "networkidle", timeout: 60_000 });
  await waitForFonts(page);
  const headerTier = page.locator("header").first();
  await shotElement(headerTier, join(outDir, "account-header-tier.png"));

  await page.goto(`${BASE}/guide-capture/account-panel`, { waitUntil: "networkidle", timeout: 60_000 });
  await waitForFonts(page);
  const accountInfoSection = page.locator("section.account-ui-sans").first();
  await shotElement(accountInfoSection, join(outDir, "account-information-panel.png"));

  await page.goto(`${BASE}/guide-capture/projects-empty`, { waitUntil: "networkidle", timeout: 60_000 });
  await waitForFonts(page);
  const projectsEmpty = page.locator("section.account-ui-sans").first();
  await shotElement(projectsEmpty, join(outDir, "projects-empty.png"));

  await page.goto(`${BASE}/guide-capture/projects-active`, { waitUntil: "networkidle", timeout: 60_000 });
  await waitForFonts(page);
  const projectsActive = page.locator("section.account-ui-sans").first();
  await shotElement(projectsActive, join(outDir, "projects-active.png"));

  // --- User guide: Save panel + c′ profile autofill (static /guide-capture pages, crisp text)
  await page.goto(`${BASE}/guide-capture/tool-save-panel`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('[data-guide-capture="tool-save-panel"]').waitFor({ state: "visible", timeout: 30_000 });
  await waitForFonts(page);
  await shotElement(page.locator('[data-guide-capture="tool-save-panel"]'), join(outDir, "save-analysis-to-project-panel.png"));

  await page.goto(`${BASE}/guide-capture/cprime-profile-autofill`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('[data-guide-capture="cprime-profile-autofill"]').waitFor({ state: "visible", timeout: 30_000 });
  await waitForFonts(page);
  await shotElement(page.locator('[data-guide-capture="cprime-profile-autofill"]'), join(outDir, "soil-profile-cu-autofill-example.png"));

  await browser.close();

  console.log("Wrote:", join(outDir, "site-main-navigation.png"));
  console.log("Wrote:", join(outDir, "site-hero.png"));
  console.log("Wrote:", join(outDir, "account-login.png"));
  console.log("Wrote:", join(outDir, "account-signup.png"));
  console.log("Wrote:", join(outDir, "account-membership-tiers.png"));
  console.log("Wrote:", join(outDir, "account-header-tier.png"));
  console.log("Wrote:", join(outDir, "account-information-panel.png"));
  console.log("Wrote:", join(outDir, "projects-empty.png"));
  console.log("Wrote:", join(outDir, "projects-active.png"));
  console.log("Wrote:", join(outDir, "save-analysis-to-project-panel.png"));
  console.log("Wrote:", join(outDir, "soil-profile-cu-autofill-example.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
