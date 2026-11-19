/**
 * Site-wide design switch.
 *
 *  - "field" (default): earth-tone palette (app/design-field.css), contour hero, soil-strata header strip.
 *  - "classic": the original white/slate palette. Set NEXT_PUBLIC_SITE_DESIGN=classic in .env.local (and in the
 *    hosting provider's env vars) and restart `npm run dev` / redeploy to switch back.
 *
 * The complete original site (layout and components as they were before the redesign) is also kept on the
 * git branch `classic-design-backup`.
 */
export type SiteDesign = "classic" | "field";

export const SITE_DESIGN: SiteDesign = process.env.NEXT_PUBLIC_SITE_DESIGN === "classic" ? "classic" : "field";

export function isFieldDesign(): boolean {
  return SITE_DESIGN === "field";
}
