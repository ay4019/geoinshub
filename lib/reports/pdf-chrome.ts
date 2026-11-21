"use client";

import {
  AI_INTERPRETATION_NOTICE,
  REPORT_FOOTER_TEXT,
  REPORT_RESPONSIBILITY_PARAGRAPHS,
  REPORT_STATUS_BANNER,
} from "@/lib/legal/report-disclaimer";
import { toPdfSafeText } from "@/lib/pdf-safe-text";

type Doc = import("jspdf").jsPDF;

/**
 * Shared page furniture for every generated report PDF: title block, status banner, responsibility
 * section, AI notice, and a footer with page numbers on every page. Expects the "NotoSans" font family
 * to be registered on the document.
 */

export function drawReportTitleBlock(
  doc: Doc,
  marginX: number,
  contentWidth: number,
  startY: number,
  meta: { subject: string; toolTitle: string; projectName?: string | null; boreholeIds?: string[]; unitSystem?: string },
): number {
  let y = startY;
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("GEOTECHNICAL INSIGHTS HUB · PRELIMINARY ASSESSMENT REPORT", marginX, y, { baseline: "top" });
  y += 16;

  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(toPdfSafeText(meta.subject), contentWidth);
  doc.text(titleLines, marginX, y, { baseline: "top" });
  y += titleLines.length * 21 + 4;

  const rows: Array<[string, string]> = [
    ["Tool", meta.toolTitle],
    ["Project", meta.projectName?.trim() || "Not specified"],
    ["Boreholes", meta.boreholeIds?.length ? meta.boreholeIds.join(", ") : "As listed in the results table"],
    ["Unit system", meta.unitSystem === "american" ? "US customary" : "SI (metric)"],
    ["Generated", new Date().toLocaleString("en-GB")],
  ];
  doc.setFontSize(9);
  for (const [label, value] of rows) {
    doc.setFont("NotoSans", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(label, marginX, y, { baseline: "top" });
    doc.setFont("NotoSans", "normal");
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(toPdfSafeText(value), contentWidth - 80);
    doc.text(lines, marginX + 80, y, { baseline: "top" });
    y += Math.max(lines.length, 1) * 12 + 2;
  }
  y += 6;
  return drawStatusBanner(doc, marginX, contentWidth, y);
}

export function drawStatusBanner(doc: Doc, marginX: number, contentWidth: number, startY: number): number {
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(8.5);
  const lines = doc.splitTextToSize(toPdfSafeText(REPORT_STATUS_BANNER), contentWidth - 16);
  const h = lines.length * 11 + 12;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.rect(marginX, startY, contentWidth, h, "FD");
  doc.setTextColor(120, 53, 15);
  doc.text(lines, marginX + 8, startY + 6, { baseline: "top" });
  doc.setTextColor(15, 23, 42);
  return startY + h + 16;
}

export function drawAiNotice(doc: Doc, marginX: number, contentWidth: number, startY: number, pageHeight: number): number {
  doc.setFont("NotoSans", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 53, 15);
  const lines = doc.splitTextToSize(toPdfSafeText(AI_INTERPRETATION_NOTICE), contentWidth);
  let y = startY;
  if (y + lines.length * 11 > pageHeight - 50) {
    doc.addPage();
    y = 48;
  }
  doc.text(lines, marginX, y, { baseline: "top" });
  doc.setTextColor(15, 23, 42);
  return y + lines.length * 11 + 8;
}

export function drawResponsibilitySection(
  doc: Doc,
  marginX: number,
  contentWidth: number,
  startY: number,
  pageHeight: number,
  heading: string,
): number {
  let y = startY;
  if (y > pageHeight - 160) {
    doc.addPage();
    y = 48;
  }
  if (heading) {
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(toPdfSafeText(heading), marginX, y, { baseline: "top" });
    y += 18;
  }
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  for (const paragraph of REPORT_RESPONSIBILITY_PARAGRAPHS) {
    const lines = doc.splitTextToSize(toPdfSafeText(paragraph), contentWidth);
    if (y + lines.length * 12.5 > pageHeight - 50) {
      doc.addPage();
      y = 48;
    }
    // Draw line by line: jsPDF's multi-line text uses its own (tighter) line height, which made these
    // paragraphs look denser than the rest of the report.
    (lines as string[]).forEach((line, i) => doc.text(line, marginX, y + i * 12.5, { baseline: "top" }));
    y += lines.length * 12.5 + 7;
  }
  doc.setTextColor(15, 23, 42);
  return y + 6;
}

/** Writes the footer and "Page x of y" on every page; call immediately before doc.save(). */
export function stampReportFooters(doc: Doc): void {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(44, height - 34, width - 44, height - 34);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const label = `Page ${i} of ${pages}`;
    const labelWidth = doc.getTextWidth(label);
    // Keep the footer on one line and clear of the page number.
    const footer = (doc.splitTextToSize(toPdfSafeText(REPORT_FOOTER_TEXT), width - 88 - labelWidth - 16) as string[])[0] ?? "";
    doc.text(footer, 44, height - 28, { baseline: "top" });
    doc.text(label, width - 44 - labelWidth, height - 28, { baseline: "top" });
  }
  doc.setTextColor(15, 23, 42);
}
