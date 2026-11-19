"use client";

import { toPdfSafeText } from "@/lib/pdf-safe-text";
import {
  drawAiNotice,
  drawReportTitleBlock,
  drawResponsibilitySection,
  stampReportFooters,
} from "@/lib/reports/pdf-chrome";
import type { ReportDocument } from "@/lib/reports/standard-report-document";

type Doc = import("jspdf").jsPDF;

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
  const text = (value: string, opts: { size: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; lineH?: number; indent?: number }) => {
    doc.setFont("NotoSans", opts.style ?? "normal");
    doc.setFontSize(opts.size);
    doc.setTextColor(...(opts.color ?? [15, 23, 42]));
    const lineH = opts.lineH ?? opts.size * 1.45;
    const lines: string[] = doc.splitTextToSize(toPdfSafeText(value), contentW - (opts.indent ?? 0));
    for (const line of lines) {
      ensure(lineH);
      doc.text(line, marginX + (opts.indent ?? 0), y, { baseline: "top" });
      y += lineH;
    }
  };

  y = drawReportTitleBlock(doc, marginX, contentW, y, {
    subject: report.subject,
    toolTitle: report.toolTitle,
    projectName: report.projectName,
    boreholeIds: report.boreholeIds,
    unitSystem: report.unitSystem,
  });

  for (const block of report.blocks) {
    switch (block.kind) {
      case "heading": {
        ensure(block.level === 1 ? 60 : 40);
        y += block.level === 1 ? 10 : 4;
        text(block.text, { size: block.level === 1 ? 13.5 : 11, style: "bold", color: block.level === 1 ? [22, 61, 107] : [15, 23, 42] });
        if (block.level === 1) {
          doc.setDrawColor(203, 213, 225);
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
        ensure(34);
        doc.setFont("NotoSans", "italic");
        doc.setFontSize(11.5);
        doc.setTextColor(15, 23, 42);
        const eqLines: string[] = doc.splitTextToSize(toPdfSafeText(block.text), contentW - 60);
        for (const line of eqLines) {
          ensure(17);
          const w = doc.getTextWidth(line);
          doc.text(line, marginX + (contentW - 40 - w) / 2, y, { baseline: "top" });
          y += 17;
        }
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(block.label, marginX + contentW - doc.getTextWidth(block.label), y - 17, { baseline: "top" });
        if (block.where) {
          text(`where ${block.where}`, { size: 8.5, color: [100, 116, 139], lineH: 12, indent: 30 });
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
        text(block.title, { size: 9.5, style: "bold", color: [51, 65, 85] });
        autoTable(doc, {
          startY: y + 2,
          margin: { left: marginX, right: marginX, bottom: 50 },
          theme: "grid",
          styles: { font: "NotoSans", fontSize: 9, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.5, textColor: [15, 23, 42] },
          columnStyles: { 0: { cellWidth: contentW * 0.42, fontStyle: "bold", fillColor: [248, 250, 252] } },
          body: block.rows.map((r) => [toPdfSafeText(r.label), toPdfSafeText(r.value)]),
        });
        y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 14;
        break;
      }
      case "table": {
        ensure(60);
        text(block.title, { size: 9.5, style: "bold", color: [51, 65, 85] });
        autoTable(doc, {
          startY: y + 2,
          margin: { left: marginX, right: marginX, bottom: 50 },
          styles: { font: "NotoSans", fontSize: block.columns.length > 9 ? 7 : 8.5, cellPadding: 3.5, lineColor: [203, 213, 225], lineWidth: 0.5, textColor: [15, 23, 42], halign: "center" },
          headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
          showHead: "everyPage",
          head: [block.columns.map((c) => toPdfSafeText(c.header))],
          body: block.rows.map((r) => block.columns.map((c) => toPdfSafeText(String(r[c.key] ?? "—")))),
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
        y = drawResponsibilitySection(doc, marginX, contentW, y, pageH, "");
        break;
    }
  }

  stampReportFooters(doc);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  doc.save(`${fileSlug}-report-${stamp}.pdf`);
}
