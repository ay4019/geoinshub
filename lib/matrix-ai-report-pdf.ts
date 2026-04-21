"use client";

import { sanitizeMatrixAiMarkdown } from "@/lib/matrix-ai-markdown";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

let notoSansFontBase64: { regular: string; bold: string; italic: string } | null = null;

async function ensureNotoSansFonts(doc: import("jspdf").jsPDF): Promise<void> {
  if ((doc as { __matrixAiNotoSansLoaded?: boolean }).__matrixAiNotoSansLoaded) {
    return;
  }

  if (!notoSansFontBase64) {
    const fetchFont = async (path: string) => {
      const res = await fetch(path);
      if (!res.ok) {
        throw new Error(`Missing font: ${path}`);
      }
      return arrayBufferToBase64(await res.arrayBuffer());
    };

    const [regular, bold, italic] = await Promise.all([
      fetchFont("/fonts/NotoSans-Regular.ttf"),
      fetchFont("/fonts/NotoSans-Bold.ttf"),
      fetchFont("/fonts/NotoSans-Italic.ttf"),
    ]);
    notoSansFontBase64 = { regular, bold, italic };
  }

  const { regular, bold, italic } = notoSansFontBase64;
  doc.addFileToVFS("NotoSans-Regular.ttf", regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.addFileToVFS("NotoSans-Italic.ttf", italic);
  doc.addFont("NotoSans-Italic.ttf", "NotoSans", "italic");

  (doc as { __matrixAiNotoSansLoaded?: boolean }).__matrixAiNotoSansLoaded = true;
}

function sanitizeFilenamePart(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDateTimeStamp(): string {
  const now = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function isPipeTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|");
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutEdges = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutEdges.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((c) => {
      const t = c.trim();
      return /^:?-{3,}:?$/.test(t);
    })
  );
}

function stripInlineMarkdown(text: string): string {
  return (text ?? "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
    .trim();
}

type PdfBlock =
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; body: string[][] };

function looksLikeNumberedHeading(line: string): boolean {
  return /^\d+(?:\.\d+)*\.\s+\S/.test(line.trim());
}

function looksLikeLabelHeading(line: string): boolean {
  const t = line.trim();
  if (!t.endsWith(":")) {
    return false;
  }
  if (t.length > 80) {
    return false;
  }
  return /^[A-Za-z0-9][A-Za-z0-9 ,/()'’\-]+:$/.test(t);
}

function parseMarkdownToBlocks(markdown: string): PdfBlock[] {
  const s = sanitizeMatrixAiMarkdown(markdown);
  const lines = s.split("\n");
  const blocks: PdfBlock[] = [];

  let i = 0;
  const pushParagraph = (p: string) => {
    const t = p.trim();
    if (t) {
      blocks.push({ kind: "paragraph", text: t });
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const t = line.trim();

    if (!t) {
      i += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(t);
    if (headingMatch) {
      const level = Math.min(headingMatch[1]?.length ?? 1, 4) as 1 | 2 | 3 | 4;
      blocks.push({ kind: "heading", level, text: stripInlineMarkdown(headingMatch[2] ?? "") });
      i += 1;
      continue;
    }

    if (looksLikeNumberedHeading(t)) {
      blocks.push({ kind: "heading", level: 2, text: stripInlineMarkdown(t) });
      i += 1;
      continue;
    }

    if (looksLikeLabelHeading(t)) {
      blocks.push({ kind: "heading", level: 3, text: stripInlineMarkdown(t.replace(/:$/, "")) });
      i += 1;
      continue;
    }

    if (isPipeTableLine(t)) {
      const tableLines: string[] = [];
      while (i < lines.length && isPipeTableLine(lines[i] ?? "")) {
        tableLines.push(lines[i] ?? "");
        i += 1;
      }

      const rowCells = tableLines.map(splitTableRow);
      const sepIdx = rowCells.findIndex((cells) => isSeparatorRow(cells));
      if (sepIdx > 0) {
        const head = rowCells[sepIdx - 1]?.map(stripInlineMarkdown) ?? [];
        const body = rowCells
          .slice(sepIdx + 1)
          .filter((cells) => cells.some((c) => c.trim()))
          .map((cells) => cells.map(stripInlineMarkdown));
        if (head.length && body.length) {
          blocks.push({ kind: "table", head, body });
          continue;
        }
      }

      // Fallback: treat as paragraph if malformed.
      pushParagraph(tableLines.map((l) => l.trim()).join("\n"));
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const li = (lines[i] ?? "").trim();
        if (!/^[-*]\s+/.test(li)) {
          break;
        }
        items.push(stripInlineMarkdown(li.replace(/^[-*]\s+/, "")));
        i += 1;
      }
      if (items.length) {
        blocks.push({ kind: "list", items });
        continue;
      }
    }

    // Paragraph: accumulate until blank line or special block.
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const raw = lines[i] ?? "";
      const tt = raw.trim();
      if (!tt) {
        break;
      }
      if (/^(#{1,4})\s+/.test(tt) || isPipeTableLine(tt) || /^[-*]\s+/.test(tt)) {
        break;
      }
      paragraphLines.push(tt);
      i += 1;
    }
    pushParagraph(stripInlineMarkdown(paragraphLines.join(" ")));
  }

  return blocks;
}

export async function createIntegratedMatrixAiReportPdf(options: {
  projectName: string;
  markdown: string;
}): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await ensureNotoSansFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 48;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - 44) {
      doc.addPage();
      cursorY = 48;
    }
  };

  const addHeading = (text: string, level: 1 | 2 | 3 | 4) => {
    const fontSize = level === 1 ? 16 : level === 2 ? 13 : 12;
    const lineHeight = level === 1 ? 20 : 18;
    ensureSpace(lineHeight + 8);
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX, cursorY, { baseline: "top" });
      cursorY += lineHeight;
    }
    cursorY += 6;
  };

  const addParagraph = (text: string) => {
    if (!text.trim()) {
      return;
    }
    const fontSize = 10.5;
    const lineHeight = 15;
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX, cursorY, { baseline: "top" });
      cursorY += lineHeight;
    }
    cursorY += 8;
  };

  const addList = (items: string[]) => {
    const fontSize = 10.5;
    const lineHeight = 15;
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 41, 59);
    for (const item of items) {
      const bullet = `- ${item}`;
      const lines = doc.splitTextToSize(bullet, contentWidth);
      for (const line of lines) {
        ensureSpace(lineHeight);
        doc.text(line, marginX, cursorY, { baseline: "top" });
        cursorY += lineHeight;
      }
    }
    cursorY += 8;
  };

  // Title block
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("Integrated Parameter Matrix — AI Engineering Interpretation", marginX, cursorY, { baseline: "top" });
  cursorY += 22;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Project: ${options.projectName} | Generated: ${new Date().toLocaleString("en-GB")}`, marginX, cursorY, {
    baseline: "top",
  });
  doc.setTextColor(15, 23, 42);
  cursorY += 20;

  const blocks = parseMarkdownToBlocks(options.markdown);
  for (const block of blocks) {
    if (block.kind === "heading") {
      addHeading(block.text, block.level);
      continue;
    }
    if (block.kind === "paragraph") {
      addParagraph(block.text);
      continue;
    }
    if (block.kind === "list") {
      addList(block.items);
      continue;
    }
    if (block.kind === "table") {
      ensureSpace(120);
      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX, bottom: 40 },
        styles: {
          font: "NotoSans",
          fontSize: 8.5,
          textColor: [15, 23, 42],
          cellPadding: 4,
          lineColor: [203, 213, 225],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontStyle: "bold",
        },
        showHead: "everyPage",
        pageBreak: "auto",
        rowPageBreak: "avoid",
        head: [block.head],
        body: block.body,
      });

      const lastTable = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable;
      cursorY = (lastTable?.finalY ?? cursorY) + 18;
    }
  }

  const slug = sanitizeFilenamePart(options.projectName || "project");
  const stamp = formatDateTimeStamp();
  doc.save(`matrix-ai-report-${slug}-${stamp}.pdf`);
}

