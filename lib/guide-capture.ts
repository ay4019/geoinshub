/**
 * Routes under this prefix render with a simulated Gold membership UI so we can
 * capture screenshots for the user guide without a real signed-in session.
 * Not linked from the public navigation.
 */
export const GUIDE_CAPTURE_PREFIX = "/guide-capture";

export function isGuideCapturePath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && pathname.startsWith(GUIDE_CAPTURE_PREFIX));
}
