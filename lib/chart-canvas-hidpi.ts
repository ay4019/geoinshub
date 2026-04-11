/**
 * Renders chart canvases at higher pixel density so PNG exports look sharp in Excel/PDF.
 * Drawing code uses logical (CSS) pixel coordinates; the backing store is scaled up.
 */
export const CHART_EXPORT_PIXEL_RATIO = 2;

export function getHiDpiCanvas2D(
  logicalWidth: number,
  logicalHeight: number,
  pixelRatio: number = CHART_EXPORT_PIXEL_RATIO,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") {
    return null;
  }
  const pr = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : CHART_EXPORT_PIXEL_RATIO;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(logicalWidth * pr));
  canvas.height = Math.max(1, Math.round(logicalHeight * pr));
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(pr, pr);
  return { canvas, context };
}
