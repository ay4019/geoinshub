/**
 * Canonical public site origin (no trailing slash).
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://www.yourdomain.com).
 * On Vercel, `VERCEL_URL` is used when unset so preview deployments get correct absolute URLs.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^\/+/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
