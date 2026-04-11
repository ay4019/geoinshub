/** Layout classes for profile tool plot sections (single plot centered, multi side-by-side on xl). */
export function profilePlotsSectionClass(plotCount: number, options?: { gap?: "normal" | "loose"; marginTop?: boolean }): string {
  const marginTop = options?.marginTop === false ? "" : "mt-4 ";
  const gap = options?.gap === "loose" ? "gap-5" : "gap-4";
  if (plotCount <= 1) {
    return `${marginTop}flex flex-wrap justify-center ${gap}`.trim();
  }
  return `${marginTop}grid ${gap} xl:grid-cols-2`.trim();
}

export function profilePlotItemClass(plotCount: number): string {
  if (plotCount <= 1) {
    return "w-full max-w-3xl min-w-0";
  }
  return "w-full min-w-0";
}
