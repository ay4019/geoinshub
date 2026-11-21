"use client";

import { splitSubscripts, type ScriptSegment } from "@/lib/charts/depth-profile";
import { REPORT_RESPONSIBILITY_PARAGRAPHS } from "@/lib/legal/report-disclaimer";
import { toPdfSafeText } from "@/lib/pdf-safe-text";
import { drawAiNotice, drawReportTitleBlock, stampReportFooters } from "@/lib/reports/pdf-chrome";
import type { ReportBlock, ReportDocument } from "@/lib/reports/standard-report-document";
import type { CellHookData } from "jspdf-autotable";

type Doc = import("jspdf").jsPDF;
type Style = "normal" | "bold" | "italic";
type Rgb = [number, number, number];

const INK: Rgb = [31, 35, 40];
const MUTED: Rgb = [85, 84, 79];
const SUB_SCALE = 0.7;

/**
 * Rich text: normal runs and real subscripts (from Unicode subscript glyphs or the C_E notation), drawn
 * run by run so subscripts are smaller and lowered — the same rendering as the on-screen report.
 */
type RichLine = ScriptSegment[];

function setRun(doc: Doc, size: number, style: Style, sub: boolean) {
  doc.setFont("NotoSans", style);
  doc.setFontSize(sub ? size * SUB_SCALE : size);
}

function segWidth(doc: Doc, seg: ScriptSegment, size: number, style: Style): number {
  setRun(doc, size, style, seg.sub);
  return doc.getTextWidth(seg.text);
}

function richWidth(doc: Doc, line: RichLine, size: number, style: Style): number {
  return line.reduce((sum, seg) => sum + segWidth(doc, seg, size, style), 0);
}

/** Greedy word wrap over rich segments. */
function wrapRich(doc: Doc, value: string, size: number, style: Style, maxWidth: number): RichLine[] {
  const segs = splitSubscripts(toPdfSafeText(value));
  // Split into words while keeping sub/normal runs; spaces live only in normal runs.
  const words: RichLine[] = [[]];
  for (const seg of segs) {
    const parts = seg.text.split(/( )/);
    for (const part of parts) {
      if (part === " ") {
        words.push([]);
      } else if (part) {
        words[words.length - 1].push({ text: part, sub: seg.sub });
      }
    }
  }
  const space = (setRun(doc, size, style, false), doc.getTextWidth(" "));
  const lines: RichLine[] = [];
  let current: RichLine = [];
  let width = 0;
  for (const word of words.filter((w) => w.length)) {
    const w = richWidth(doc, word, size, style);
    if (current.length && width + space + w > maxWidth) {
      lines.push(current);
      current = [];
      width = 0;
    }
    if (current.length) {
      current.push({ text: " ", sub: false });
      width += space;
    }
    current.push(...word);
    width += w;
  }
  if (current.length) lines.push(current);
  return lines.length ? lines : [[{ text: "", sub: false }]];
}

function drawRich(doc: Doc, line: RichLine, x: number, y: number, size: number, style: Style, color: Rgb) {
  doc.setTextColor(...color);
  let cx = x;
  for (const seg of line) {
    setRun(doc, size, style, seg.sub);
    doc.text(seg.text, cx, seg.sub ? y + size * 0.42 : y, { baseline: "top" });
    cx += doc.getTextWidth(seg.text);
  }
}

/** True when a table cell needs rich drawing (contains subscripts). */
function needsRich(value: string): boolean {
  return splitSubscripts(value).some((s) => s.sub);
}

/** autoTable hooks that redraw single-line cells containing subscripts with drawRich. */
function richCellHooks(doc: Doc) {
  const pending = new WeakMap<object, string>();
  return {
    willDrawCell: (data: CellHookData) => {
      const raw = data.cell.raw;
      if (typeof raw === "string" && needsRich(raw)) {
        pending.set(data.cell, raw);
        data.cell.text = [];
      }
    },
    didDrawCell: (data: CellHookData) => {
      const raw = pending.get(data.cell);
      if (!raw) return;
      const size = data.cell.styles.fontSize;
      const style = (data.cell.styles.fontStyle as Style) || "normal";
      const line = wrapRich(doc, raw, size, style, Number.POSITIVE_INFINITY)[0];
      const w = richWidth(doc, line, size, style);
      const x =
        data.cell.styles.halign === "center"
          ? data.cell.x + (data.cell.width - w) / 2
          : data.cell.x + data.cell.padding("left");
      const y = data.cell.y + (data.cell.height - size * 1.15) / 2;
      const color = data.cell.styles.textColor;
      drawRich(doc, line, x, y, size, style, Array.isArray(color) ? (color as Rgb) : INK);
    },
  };
}

let fontCache: { regular: string; bold: string; italic: string } | null = null;

async function registerNotoSans(doc: Doc): Promise<void> {
  if (!fontCache) {
    const load = async (path: string) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Missing font: ${path}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    };
    const [regular, bold, italic] = await Promise.all([
      load("/fonts/NotoSans-Regular.ttf"),
      load("/fonts/NotoSans-Bold.ttf"),
      load("/fonts/NotoSans-Italic.ttf"),
    ]);
    fontCache = { regular, bold, italic };
  }
  doc.addFileToVFS("NotoSans-Regular.ttf", fontCache.regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fontCache.bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.addFileToVFS("NotoSans-Italic.ttf", fontCache.italic);
  doc.addFont("NotoSans-Italic.ttf", "NotoSans", "italic");
}

async function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve({ w: 3, h: 2 });
    img.src = dataUrl;
  });
}

export async function createStandardReportPdf(report: ReportDocument, fileSlug: string): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await registerNotoSans(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 50;
  const contentW = pageW - marginX * 2;
  const bottom = pageH - 50;
  let y = 48;

  const ensure = (needed: number) => {
    if (y + needed > bottom) {
      doc.addPage();
      y = 48;
    }
  };
  const text = (
    value: string,
    opts: { size: number; style?: Style; color?: Rgb; lineH?: number; indent?: number; align?: "left" | "center" },
  ) => {
    const lineH = opts.lineH ?? opts.size * 1.45;
    const indent = opts.indent ?? 0;
    const lines = wrapRich(doc, value, opts.size, opts.style ?? "normal", contentW - indent);
    for (const line of lines) {
      ensure(lineH);
      const x =
        opts.align === "center"
          ? marginX + indent + (contentW - indent - richWidth(doc, line, opts.size, opts.style ?? "normal")) / 2
          : marginX + indent;
      drawRich(doc, line, x, y, opts.size, opts.style ?? "normal", opts.color ?? INK);
      y += lineH;
    }
  };
  /** Rough height of the first part of a block, so a heading is never left alone at the foot of a page. */
  const leadHeight = (next: ReportBlock | undefined): number => {
    switch (next?.kind) {
      case "table":
        return 110;
      case "figure":
        return 300;
      case "keyValue":
        return 70;
      case "equation":
        return 40;
      case "responsibility":
        return 120;
      case "references":
      case "bullets":
        return 40;
      default:
        return 45;
    }
  };

  y = drawReportTitleBlock(doc, marginX, contentW, y, {
    subject: report.subject,
    toolTitle: report.toolTitle,
    projectName: report.projectName,
    boreholeIds: report.boreholeIds,
    unitSystem: report.unitSystem,
  });

  for (const [index, block] of report.blocks.entries()) {
    switch (block.kind) {
      case "heading": {
        ensure((block.level === 1 ? 40 : 28) + leadHeight(report.blocks[index + 1]));
        y += block.level === 1 ? 10 : 4;
        text(block.text, { size: block.level === 1 ? 13.5 : 11, style: "bold", color: INK });
        if (block.level === 1) {
          doc.setDrawColor(217, 211, 197);
          doc.setLineWidth(0.6);
          doc.line(marginX, y + 1, marginX + contentW, y + 1);
          y += 6;
        }
        y += 4;
        break;
      }
      case "paragraph":
        text(block.text, { size: 10, lineH: 14.5 });
        y += 6;
        break;
      case "equation": {
        ensure(block.where ? 46 : 30);
        y += 2;
        const eqLines = wrapRich(doc, block.text, 11.5, "normal", contentW - 60);
        for (const line of eqLines) {
          ensure(18);
          const w = richWidth(doc, line, 11.5, "normal");
          drawRich(doc, line, marginX + (contentW - w) / 2, y, 11.5, "normal", INK);
          y += 18;
        }
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        doc.text(block.label, marginX + contentW - doc.getTextWidth(block.label), y - 18, { baseline: "top" });
        if (block.where) {
          text(`where ${block.where}`, { size: 8.5, color: MUTED, lineH: 12, align: "center" });
        }
        y += 6;
        break;
      }
      case "bullets":
        for (const item of block.items) {
          ensure(14);
          doc.setFont("NotoSans", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text("•", marginX + 4, y, { baseline: "top" });
          text(item, { size: 9.5, lineH: 13.5, indent: 16 });
          y += 2;
        }
        y += 4;
        break;
      case "keyValue": {
        ensure(40);
        text(block.title, { size: 9.5, style: "bold", color: MUTED });
        autoTable(doc, {
          startY: y + 2,
          margin: { left: marginX, right: marginX, bottom: 50 },
          theme: "grid",
          styles: { font: "NotoSans", fontSize: 9, cellPadding: 4, lineColor: [217, 211, 197], lineWidth: 0.5, textColor: INK },
          columnStyles: { 0: { cellWidth: contentW * 0.42, fontStyle: "bold", fillColor: [247, 245, 240] } },
          body: block.rows.map((r) => [toPdfSafeText(r.label), toPdfSafeText(r.value)]),
          ...richCellHooks(doc),
        });
        y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 14;
        break;
      }
      case "table": {
        ensure(60);
        text(block.title, { size: 9.5, style: "bold", color: MUTED });
        autoTable(doc, {
          startY: y + 2,
          margin: { left: marginX, right: marginX, bottom: 50 },
          styles: { font: "NotoSans", fontSize: block.columns.length > 9 ? 7.5 : 8.5, cellPadding: 3.5, lineColor: [217, 211, 197], lineWidth: 0.5, textColor: INK, halign: "center" },
          headStyles: { fillColor: [240, 236, 227], textColor: INK, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 249, 246] },
          showHead: "everyPage",
          head: [block.columns.map((c) => toPdfSafeText(c.header))],
          body: block.rows.map((r) => block.columns.map((c) => toPdfSafeText(String(r[c.key] ?? "—")))),
          ...richCellHooks(doc),
        });
        y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 16;
        break;
      }
      case "figure": {
        const { w, h } = await imageSize(block.dataUrl);
        const width = Math.min(contentW * 0.82, contentW);
        const height = (width * h) / w;
        ensure(height + 34);
        doc.addImage(block.dataUrl, "PNG", marginX + (contentW - width) / 2, y, width, height, undefined, "FAST");
        y += height + 6;
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const capLines: string[] = doc.splitTextToSize(toPdfSafeText(block.caption), contentW);
        for (const line of capLines) {
          doc.text(line, marginX + (contentW - doc.getTextWidth(line)) / 2, y, { baseline: "top" });
          y += 12;
        }
        y += 12;
        break;
      }
      case "ai": {
        y = drawAiNotice(doc, marginX, contentW, y, pageH);
        for (const para of block.text.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean)) {
          text(para, { size: 10, lineH: 14.5 });
          y += 6;
        }
        break;
      }
      case "references":
        for (const item of block.items) {
          text(item, { size: 9, lineH: 12.5, indent: 12 });
          y += 3;
        }
        break;
      case "responsibility":
        for (const para of REPORT_RESPONSIBILITY_PARAGRAPHS) {
          text(para, { size: 9, lineH: 13, color: MUTED });
          y += 5;
        }
        break;
    }
  }

  stampReportFooters(doc);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  doc.save(`${fileSlug}-report-${stamp}.pdf`);
}
