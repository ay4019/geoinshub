"use client";

import { sanitizeAiInterpretationText } from "@/lib/ai-interpretation-sanitize";
import {
  CPRIME_REPORT_FIGURE_2_CAPTION,
  CPRIME_REPORT_REFERENCE_ENTRIES,
  CPRIME_REPORT_TABLE_1_TITLE,
  CU_REPORT_FIGURE_2_CAPTION,
  CU_REPORT_REFERENCE_ENTRIES,
  CU_REPORT_STROUD_FIGURE_CAPTION,
  CU_REPORT_STROUD_FIGURE_PLACEHOLDER,
  CU_REPORT_TABLE_1_TITLE,
  PHI_PI_REPORT_FIGURE_1_CAPTION,
  PHI_PI_REPORT_REFERENCE_ENTRIES,
  PHI_PI_REPORT_TABLE_1_TITLE,
  SPT_REPORT_EQ_N160_PLACEHOLDER,
  SPT_REPORT_EQ_N60_PLACEHOLDER,
  SPT_REPORT_FIGURE_1_CAPTION,
  SPT_REPORT_FIGURE_2_CAPTION,
  SPT_REPORT_REFERENCE_ENTRIES,
  SPT_REPORT_TABLE_2_TITLE,
} from "@/lib/tool-report-templates";

interface ReportTableColumn {
  header: string;
  key: string;
}

interface CreateToolReportPdfOptions {
  toolTitle: string;
  toolSlug: string;
  unitSystem: string;
  narrativeText: string;
  columns: ReportTableColumn[];
  rows: Array<Record<string, string>>;
  tableImageDataUrl?: string | null;
  plotImageDataUrl?: string | null;
  /** Second profile figure (e.g. SPT (N1)60). */
  plotImageDataUrl2?: string | null;
  aiParagraph?: string | null;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDateTimeStamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function ensureText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || 1200, height: image.naturalHeight || 800 });
    image.onerror = () => reject(new Error("Failed to load report plot image."));
    image.src = dataUrl;
  });
}

/** Load a same-origin image file into a data URL without redrawing (exact pixels for PDF). */
async function loadSameOriginImageAsDataUrl(imagePath: string): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const url = new URL(imagePath, window.location.origin).toString();
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Stroud (1974) f₁–PI chart after “Figure 1.” sentence in narrative; image then caption below. */
async function embedCuStroudFigure1InNarrative(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  startY: number,
  pageHeight: number,
): Promise<number> {
  let cursorY = startY;
  const dataUrl = await loadSameOriginImageAsDataUrl("/images/stroud-1974-f1-pi.png");
  if (!dataUrl) {
    return cursorY;
  }

  const captionFontSize = 10;
  const captionLineHeight = 13;
  setProfilePdfFont(doc, "normal");
  doc.setFontSize(captionFontSize);
  const captionLines = doc.splitTextToSize(plainPdfCaptionFromMarkup(CU_REPORT_STROUD_FIGURE_CAPTION), contentWidth);
  const captionBlockHeight = captionLines.length * captionLineHeight + 12;

  try {
    const dims = await getImageDimensions(dataUrl);
    const ratio = dims.width / Math.max(dims.height, 1);
    const maxW = contentWidth * 0.76;
    let maxH = Math.min(260, pageHeight - cursorY - 48 - captionBlockHeight);
    if (maxH < 120) {
      doc.addPage();
      cursorY = 48;
      maxH = Math.min(260, pageHeight - cursorY - 48 - captionBlockHeight);
    }
    let imgW = maxW;
    let imgH = imgW / ratio;
    if (imgH > maxH) {
      imgH = maxH;
      imgW = imgH * ratio;
    }
    if (cursorY + imgH + captionBlockHeight > pageHeight - 36) {
      doc.addPage();
      cursorY = 48;
      maxH = Math.min(260, pageHeight - cursorY - 48 - captionBlockHeight);
      imgW = maxW;
      imgH = imgW / ratio;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * ratio;
      }
    }
    const imgX = marginX + (contentWidth - imgW) / 2;
    doc.addImage(dataUrl, "PNG", imgX, cursorY, imgW, imgH);
    cursorY += imgH + 10;

    setProfilePdfFont(doc, "normal");
    doc.setFontSize(captionFontSize);
    doc.setTextColor(51, 65, 85);
    for (const line of captionLines) {
      const lw = doc.getTextWidth(line);
      doc.text(line, marginX + (contentWidth - lw) / 2, cursorY, { baseline: "top" });
      cursorY += captionLineHeight;
    }
    doc.setTextColor(15, 23, 42);
    cursorY += 8;
  } catch {
    /* skip image */
  }

  return cursorY;
}

/** Plain-text captions for centered PDF lines (avoids raw “c_u” underscores outside engineering blocks). */
function plainPdfCaptionFromMarkup(s: string): string {
  return s
    .replace(/\(c_u\)/g, "(cu)")
    .replace(/\bc_u\b/g, "cu")
    .replace(/\bN_60\b/g, "N60")
    .replace(/\bf_1\b/g, "f1");
}

type CuPdfFontStyle = "normal" | "bold" | "italic" | "bolditalic";

/** Profile PDF body uses Helvetica except friction-angle-from-pi, which embeds Noto Sans for φ′ and Greek text. */
let activeProfilePdfFont: "helvetica" | "NotoSans" = "helvetica";

function setProfilePdfFont(doc: import("jspdf").jsPDF, style: CuPdfFontStyle): void {
  doc.setFont(activeProfilePdfFont, style);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let notoSansFontBase64: { regular: string; bold: string; italic: string } | null = null;

async function ensureNotoSansFonts(doc: import("jspdf").jsPDF): Promise<void> {
  if ((doc as { __gihNotoSansLoaded?: boolean }).__gihNotoSansLoaded) {
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
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bolditalic");
  doc.addFileToVFS("NotoSans-Italic.ttf", italic);
  doc.addFont("NotoSans-Italic.ttf", "NotoSans", "italic");

  (doc as { __gihNotoSansLoaded?: boolean }).__gihNotoSansLoaded = true;
}

/** Centered caption/title text (same style as Figure 1 caption in this report). */
function drawCuCenteredCaptionText(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  startY: number,
  pageHeight: number,
  text: string,
): number {
  const fontSize = 10;
  const lineHeight = 13;
  let cursorY = startY;
  setProfilePdfFont(doc, "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(51, 65, 85);
  const lines = doc.splitTextToSize(text, contentWidth);
  for (const line of lines) {
    if (cursorY + lineHeight > pageHeight - 36) {
      doc.addPage();
      cursorY = 48;
    }
    const lw = doc.getTextWidth(line);
    doc.text(line, marginX + (contentWidth - lw) / 2, cursorY, { baseline: "top" });
    cursorY += lineHeight;
  }
  doc.setTextColor(15, 23, 42);
  return cursorY + 12;
}

function measureSubscriptPair(
  doc: import("jspdf").jsPDF,
  base: string,
  sub: string,
  fontSize: number,
  style: CuPdfFontStyle,
): number {
  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  const wBase = doc.getTextWidth(base);
  doc.setFontSize(fontSize * 0.65);
  const wSub = doc.getTextWidth(sub);
  doc.setFontSize(fontSize);
  return wBase + wSub;
}

function drawSubscriptPair(
  doc: import("jspdf").jsPDF,
  base: string,
  sub: string,
  x: number,
  y: number,
  fontSize: number,
  style: CuPdfFontStyle,
): number {
  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  doc.text(base, x, y, { baseline: "top" });
  const wBase = doc.getTextWidth(base);
  const subSize = fontSize * 0.65;
  const subY = y + fontSize * 0.32;
  doc.setFontSize(subSize);
  doc.text(sub, x + wBase, subY, { baseline: "top" });
  doc.setFontSize(fontSize);
  return wBase + doc.getTextWidth(sub);
}

/** (N₁)₆₀ — overburden-normalized blow count (Idriss & Boulanger style notation). */
function measureN160Symbol(
  doc: import("jspdf").jsPDF,
  fontSize: number,
  style: CuPdfFontStyle,
): number {
  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  let w = doc.getTextWidth("(");
  w += measureSubscriptPair(doc, "N", "1", fontSize, style);
  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  w += doc.getTextWidth(")");
  const subSize = fontSize * 0.65;
  doc.setFontSize(subSize);
  w += doc.getTextWidth("60");
  doc.setFontSize(fontSize);
  return w;
}

function drawN160Symbol(
  doc: import("jspdf").jsPDF,
  x: number,
  y: number,
  fontSize: number,
  style: CuPdfFontStyle,
): void {
  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  doc.text("(", x, y, { baseline: "top" });
  let w = doc.getTextWidth("(");
  w += drawSubscriptPair(doc, "N", "1", x + w, y, fontSize, style);
  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  doc.text(")", x + w, y, { baseline: "top" });
  w += doc.getTextWidth(")");
  const subSize = fontSize * 0.65;
  const subY = y + fontSize * 0.32;
  doc.setFontSize(subSize);
  doc.text("60", x + w, subY, { baseline: "top" });
  doc.setFontSize(fontSize);
}

type CuEngToken = "c_u" | "N60" | "f1";

function normalizeCuEngToken(raw: string): CuEngToken | null {
  switch (raw) {
    case "c_u":
      return "c_u";
    case "N60":
    case "N_60":
      return "N60";
    case "f1":
    case "f_1":
      return "f1";
    default:
      return null;
  }
}

function measureCuSpecialToken(
  doc: import("jspdf").jsPDF,
  token: CuEngToken,
  fontSize: number,
  style: CuPdfFontStyle,
): number {
  switch (token) {
    case "c_u":
      return measureSubscriptPair(doc, "c", "u", fontSize, style);
    case "N60":
      return measureSubscriptPair(doc, "N", "60", fontSize, style);
    case "f1":
      return measureSubscriptPair(doc, "f", "1", fontSize, style);
    default:
      return 0;
  }
}

function drawCuSpecialToken(
  doc: import("jspdf").jsPDF,
  token: CuEngToken,
  x: number,
  y: number,
  fontSize: number,
  style: CuPdfFontStyle,
): number {
  switch (token) {
    case "c_u":
      return drawSubscriptPair(doc, "c", "u", x, y, fontSize, style);
    case "N60":
      return drawSubscriptPair(doc, "N", "60", x, y, fontSize, style);
    case "f1":
      return drawSubscriptPair(doc, "f", "1", x, y, fontSize, style);
    default:
      return 0;
  }
}

type CuDrawUnit = {
  width: number;
  draw: (x: number, y: number) => void;
  spaceOnly?: boolean;
};

function buildCuEngineeringUnits(
  doc: import("jspdf").jsPDF,
  text: string,
  fontSize: number,
  style: CuPdfFontStyle,
): CuDrawUnit[] {
  const parts = text.split(/(N_60|f_1|\b(?:c_u|N60|f1)\b)/);
  const units: CuDrawUnit[] = [];
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const token = normalizeCuEngToken(part);
    if (token) {
      const w = measureCuSpecialToken(doc, token, fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawCuSpecialToken(doc, token, x, y, fontSize, style);
        },
      });
      continue;
    }
    /* fall through for non-token text */
    const subParts = part.split(/(\s+)/);
    for (const chunk of subParts) {
      if (!chunk) {
        continue;
      }
      setProfilePdfFont(doc, style);
      doc.setFontSize(fontSize);
      const w = doc.getTextWidth(chunk);
      const c = chunk;
      const spaceOnly = /^\s+$/.test(chunk);
      units.push({
        width: w,
        spaceOnly,
        draw: (x, y) => {
          setProfilePdfFont(doc, style);
          doc.setFontSize(fontSize);
          doc.text(c, x, y, { baseline: "top" });
        },
      });
    }
  }
  return units;
}

function buildSptEngineeringUnits(
  doc: import("jspdf").jsPDF,
  text: string,
  fontSize: number,
  style: CuPdfFontStyle,
): CuDrawUnit[] {
  const parts = text.split(/(\(N1\)60|N_60|\bN60\b|C_N|C_E|C_b|C_r|C_s|f_1|\b(?:c_u|f1)\b)/);
  const units: CuDrawUnit[] = [];
  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (part === "(N1)60") {
      const w = measureN160Symbol(doc, fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawN160Symbol(doc, x, y, fontSize, style);
        },
      });
      continue;
    }
    if (part === "C_N") {
      const w = measureSubscriptPair(doc, "C", "N", fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawSubscriptPair(doc, "C", "N", x, y, fontSize, style);
        },
      });
      continue;
    }
    if (part === "C_E") {
      const w = measureSubscriptPair(doc, "C", "E", fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawSubscriptPair(doc, "C", "E", x, y, fontSize, style);
        },
      });
      continue;
    }
    if (part === "C_b") {
      const w = measureSubscriptPair(doc, "C", "b", fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawSubscriptPair(doc, "C", "b", x, y, fontSize, style);
        },
      });
      continue;
    }
    if (part === "C_r") {
      const w = measureSubscriptPair(doc, "C", "r", fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawSubscriptPair(doc, "C", "r", x, y, fontSize, style);
        },
      });
      continue;
    }
    if (part === "C_s") {
      const w = measureSubscriptPair(doc, "C", "s", fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawSubscriptPair(doc, "C", "s", x, y, fontSize, style);
        },
      });
      continue;
    }
    const token = normalizeCuEngToken(part);
    if (token) {
      const w = measureCuSpecialToken(doc, token, fontSize, style);
      units.push({
        width: w,
        draw: (x, y) => {
          drawCuSpecialToken(doc, token, x, y, fontSize, style);
        },
      });
      continue;
    }
    const subParts = part.split(/(\s+)/);
    for (const chunk of subParts) {
      if (!chunk) {
        continue;
      }
      setProfilePdfFont(doc, style);
      doc.setFontSize(fontSize);
      const w = doc.getTextWidth(chunk);
      const c = chunk;
      const spaceOnly = /^\s+$/.test(chunk);
      units.push({
        width: w,
        spaceOnly,
        draw: (x, y) => {
          setProfilePdfFont(doc, style);
          doc.setFontSize(fontSize);
          doc.text(c, x, y, { baseline: "top" });
        },
      });
    }
  }
  return units;
}

function flushCuLine(doc: import("jspdf").jsPDF, line: CuDrawUnit[], marginX: number, y: number): void {
  let x = marginX;
  for (const u of line) {
    u.draw(x, y);
    x += u.width;
  }
}

/** Wrap and draw engineering text with manual subscripts (c_u, N60, f1). Returns next cursorY. */
function addCuEngineeringBlock(
  doc: import("jspdf").jsPDF,
  text: string,
  marginX: number,
  contentWidth: number,
  startY: number,
  pageHeight: number,
  fontSize: number,
  lineHeight: number,
  style: CuPdfFontStyle,
): number {
  let cursorY = startY;
  const units = buildCuEngineeringUnits(doc, text, fontSize, style);
  let line: CuDrawUnit[] = [];
  let lineW = 0;

  const newPageIfNeeded = (needed: number) => {
    if (cursorY + needed > pageHeight - 44) {
      doc.addPage();
      cursorY = 48;
    }
  };

  for (const u of units) {
    if (line.length === 0 && u.spaceOnly) {
      continue;
    }
    if (lineW + u.width > contentWidth && line.length > 0) {
      newPageIfNeeded(lineHeight);
      flushCuLine(doc, line, marginX, cursorY);
      cursorY += lineHeight;
      line = [];
      lineW = 0;
    }
    if (lineW + u.width > contentWidth && line.length === 0) {
      newPageIfNeeded(lineHeight);
      flushCuLine(doc, [u], marginX, cursorY);
      cursorY += lineHeight;
      continue;
    }
    line.push(u);
    lineW += u.width;
  }
  if (line.length) {
    newPageIfNeeded(lineHeight);
    flushCuLine(doc, line, marginX, cursorY);
    cursorY += lineHeight;
  }
  return cursorY + 8;
}

/** Same wrapping as `addCuEngineeringBlock`, with SPT tokens (C_N, (N1)60, …). */
function addSptEngineeringBlock(
  doc: import("jspdf").jsPDF,
  text: string,
  marginX: number,
  contentWidth: number,
  startY: number,
  pageHeight: number,
  fontSize: number,
  lineHeight: number,
  style: CuPdfFontStyle,
): number {
  let cursorY = startY;
  const units = buildSptEngineeringUnits(doc, text, fontSize, style);
  let line: CuDrawUnit[] = [];
  let lineW = 0;

  const newPageIfNeeded = (needed: number) => {
    if (cursorY + needed > pageHeight - 44) {
      doc.addPage();
      cursorY = 48;
    }
  };

  for (const u of units) {
    if (line.length === 0 && u.spaceOnly) {
      continue;
    }
    if (lineW + u.width > contentWidth && line.length > 0) {
      newPageIfNeeded(lineHeight);
      flushCuLine(doc, line, marginX, cursorY);
      cursorY += lineHeight;
      line = [];
      lineW = 0;
    }
    if (lineW + u.width > contentWidth && line.length === 0) {
      newPageIfNeeded(lineHeight);
      flushCuLine(doc, [u], marginX, cursorY);
      cursorY += lineHeight;
      continue;
    }
    line.push(u);
    lineW += u.width;
  }
  if (line.length) {
    newPageIfNeeded(lineHeight);
    flushCuLine(doc, line, marginX, cursorY);
    cursorY += lineHeight;
  }
  return cursorY + 8;
}

function isCuEquationLine(block: string): boolean {
  const s = block.trim().replace(/\s+/g, " ");
  return /^c_u\s*=\s*f_?1\s+x\s+N_?60\s*\(\s*kPa\s*\)$/i.test(s);
}

function isCprimeEquationLine(block: string): boolean {
  const s = block.trim().replace(/\s+/g, " ").replace(/x/gi, "×");
  return /^c′\s*=\s*0[.,]1\s*×\s*c_u\s*\(\s*kPa\s*\)$/i.test(s);
}

function isPhiPiEquationLine(block: string): boolean {
  const s = block
    .trim()
    .replace(/\s+/g, " ")
    .replace(/−/g, "-")
    .replace(/log₁₀/gi, "log10")
    .replace(/φ/g, "phi")
    .replace(/′/g, "'");
  return /^phi'?\s*=\s*45\s*-\s*14\s*log10\s*\(\s*PI\s*\)/i.test(s);
}

/** Equation with subscripts, centered in the row with “Eq.1” on the right (same baseline). */
function drawCuEquationCentered(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  y: number,
  pageHeight: number,
): number {
  let cursorY = y;
  if (cursorY + 40 > pageHeight - 44) {
    doc.addPage();
    cursorY = 48;
  }
  const fontSize = 14;
  const style: CuPdfFontStyle = "italic";
  const multiply = "\u00D7";
  const eqNum = "Eq.1";
  const gap = 18;

  const segments: Array<{ type: "sub"; base: string; sub: string } | { type: "txt"; text: string }> = [
    { type: "sub", base: "c", sub: "u" },
    { type: "txt", text: " = " },
    { type: "sub", base: "f", sub: "1" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "N", sub: "60" },
    { type: "txt", text: " (kPa)" },
  ];

  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  const labelW = doc.getTextWidth(eqNum);
  const innerW = Math.max(0, contentWidth - labelW - gap);

  let totalW = 0;
  for (const seg of segments) {
    if (seg.type === "txt") {
      setProfilePdfFont(doc, style);
      doc.setFontSize(fontSize);
      totalW += doc.getTextWidth(seg.text);
    } else {
      totalW += measureSubscriptPair(doc, seg.base, seg.sub, fontSize, style);
    }
  }

  const rowStart = marginX;
  const eqCenter = rowStart + innerW / 2;
  let x = eqCenter - totalW / 2;
  for (const seg of segments) {
    if (seg.type === "txt") {
      setProfilePdfFont(doc, style);
      doc.setFontSize(fontSize);
      doc.text(seg.text, x, cursorY, { baseline: "top" });
      x += doc.getTextWidth(seg.text);
    } else {
      x += drawSubscriptPair(doc, seg.base, seg.sub, x, cursorY, fontSize, style);
    }
  }

  setProfilePdfFont(doc, "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(eqNum, marginX + contentWidth - labelW, cursorY, { baseline: "top" });
  doc.setTextColor(15, 23, 42);

  return cursorY + Math.round(fontSize * 1.55) + 12;
}

/** c′ = 0.1 × c_u (kPa), Eq.1 — Sorensen & Okkels style screening correlation. */
function drawCprimeEquationCentered(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  y: number,
  pageHeight: number,
): number {
  let cursorY = y;
  if (cursorY + 40 > pageHeight - 44) {
    doc.addPage();
    cursorY = 48;
  }
  const fontSize = 14;
  const style: CuPdfFontStyle = "italic";
  const multiply = "\u00D7";
  const eqNum = "Eq.1";
  const gap = 18;

  const segments: Array<{ type: "sub"; base: string; sub: string } | { type: "txt"; text: string }> = [
    { type: "txt", text: `c′ = 0.1 ${multiply} ` },
    { type: "sub", base: "c", sub: "u" },
    { type: "txt", text: " (kPa)" },
  ];

  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  const labelW = doc.getTextWidth(eqNum);
  const innerW = Math.max(0, contentWidth - labelW - gap);

  let totalW = 0;
  for (const seg of segments) {
    if (seg.type === "txt") {
      setProfilePdfFont(doc, style);
      doc.setFontSize(fontSize);
      totalW += doc.getTextWidth(seg.text);
    } else {
      totalW += measureSubscriptPair(doc, seg.base, seg.sub, fontSize, style);
    }
  }

  const rowStart = marginX;
  const eqCenter = rowStart + innerW / 2;
  let x = eqCenter - totalW / 2;
  for (const seg of segments) {
    if (seg.type === "txt") {
      setProfilePdfFont(doc, style);
      doc.setFontSize(fontSize);
      doc.text(seg.text, x, cursorY, { baseline: "top" });
      x += doc.getTextWidth(seg.text);
    } else {
      x += drawSubscriptPair(doc, seg.base, seg.sub, x, cursorY, fontSize, style);
    }
  }

  setProfilePdfFont(doc, "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(eqNum, marginX + contentWidth - labelW, cursorY, { baseline: "top" });
  doc.setTextColor(15, 23, 42);

  return cursorY + Math.round(fontSize * 1.55) + 12;
}

/** φ′ = 45 − 14 log₁₀(PI) (deg), Eq.1 — uses embedded Noto Sans for correct symbols. */
function drawPhiPiEquationCentered(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  y: number,
  pageHeight: number,
): number {
  let cursorY = y;
  if (cursorY + 40 > pageHeight - 44) {
    doc.addPage();
    cursorY = 48;
  }
  const fontSize = 14;
  const style: CuPdfFontStyle = "italic";
  const eqNum = "Eq.1";
  const gap = 18;
  const text = "\u03c6\u2032 = 45 \u2212 14 log\u2081\u2080(PI) (deg)";

  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  const labelW = doc.getTextWidth(eqNum);
  const innerW = Math.max(0, contentWidth - labelW - gap);
  const textW = doc.getTextWidth(text);
  const x = marginX + (innerW - textW) / 2;
  doc.text(text, x, cursorY, { baseline: "top" });

  setProfilePdfFont(doc, "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(eqNum, marginX + contentWidth - labelW, cursorY, { baseline: "top" });
  doc.setTextColor(15, 23, 42);

  return cursorY + Math.round(fontSize * 1.55) + 12;
}

type SptEqSeg =
  | { type: "sub"; base: string; sub: string }
  | { type: "txt"; text: string }
  | { type: "n160sym" };

function measureSptEqSegment(
  doc: import("jspdf").jsPDF,
  seg: SptEqSeg,
  fontSize: number,
  style: CuPdfFontStyle,
): number {
  if (seg.type === "txt") {
    setProfilePdfFont(doc, style);
    doc.setFontSize(fontSize);
    return doc.getTextWidth(seg.text);
  }
  if (seg.type === "n160sym") {
    return measureN160Symbol(doc, fontSize, style);
  }
  return measureSubscriptPair(doc, seg.base, seg.sub, fontSize, style);
}

function drawSptEqSegment(
  doc: import("jspdf").jsPDF,
  seg: SptEqSeg,
  x: number,
  y: number,
  fontSize: number,
  style: CuPdfFontStyle,
): number {
  if (seg.type === "txt") {
    setProfilePdfFont(doc, style);
    doc.setFontSize(fontSize);
    doc.text(seg.text, x, y, { baseline: "top" });
    return doc.getTextWidth(seg.text);
  }
  if (seg.type === "n160sym") {
    drawN160Symbol(doc, x, y, fontSize, style);
    return measureN160Symbol(doc, fontSize, style);
  }
  return drawSubscriptPair(doc, seg.base, seg.sub, x, y, fontSize, style);
}

function drawSptProductEquationCentered(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  y: number,
  pageHeight: number,
  segments: SptEqSeg[],
  eqNum: string,
): number {
  let cursorY = y;
  if (cursorY + 40 > pageHeight - 44) {
    doc.addPage();
    cursorY = 48;
  }
  const fontSize = 14;
  const style: CuPdfFontStyle = "italic";
  const gap = 18;

  setProfilePdfFont(doc, style);
  doc.setFontSize(fontSize);
  const labelW = doc.getTextWidth(eqNum);
  const innerW = Math.max(0, contentWidth - labelW - gap);

  let totalW = 0;
  for (const seg of segments) {
    totalW += measureSptEqSegment(doc, seg, fontSize, style);
  }

  const rowStart = marginX;
  const eqCenter = rowStart + innerW / 2;
  let x = eqCenter - totalW / 2;
  for (const seg of segments) {
    x += drawSptEqSegment(doc, seg, x, cursorY, fontSize, style);
  }

  setProfilePdfFont(doc, "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(eqNum, marginX + contentWidth - labelW, cursorY, { baseline: "top" });
  doc.setTextColor(15, 23, 42);

  return cursorY + Math.round(fontSize * 1.55) + 12;
}

/** N₆₀ = N · C_R · C_S · C_B · C_E — energy- and equipment-corrected blow count. */
function drawSptN60EquationCentered(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  y: number,
  pageHeight: number,
): number {
  const multiply = "\u00D7";
  const segments: SptEqSeg[] = [
    { type: "sub", base: "N", sub: "60" },
    { type: "txt", text: ` = N ${multiply} ` },
    { type: "sub", base: "C", sub: "R" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "C", sub: "S" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "C", sub: "b" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "C", sub: "E" },
  ];
  return drawSptProductEquationCentered(doc, marginX, contentWidth, y, pageHeight, segments, "Eq.1");
}

/** (N₁)₆₀ = N · C_N · C_R · C_S · C_B · C_E — overburden-normalized resistance from raw N. */
function drawSptN160EquationCentered(
  doc: import("jspdf").jsPDF,
  marginX: number,
  contentWidth: number,
  y: number,
  pageHeight: number,
): number {
  const multiply = "\u00D7";
  const segments: SptEqSeg[] = [
    { type: "n160sym" },
    { type: "txt", text: ` = N ${multiply} ` },
    { type: "sub", base: "C", sub: "N" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "C", sub: "R" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "C", sub: "S" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "C", sub: "b" },
    { type: "txt", text: ` ${multiply} ` },
    { type: "sub", base: "C", sub: "E" },
  ];
  return drawSptProductEquationCentered(doc, marginX, contentWidth, y, pageHeight, segments, "Eq.2");
}

function addCuPlainParagraphHelvetica(
  doc: import("jspdf").jsPDF,
  text: string,
  marginX: number,
  contentWidth: number,
  startY: number,
  pageHeight: number,
  fontSize: number,
  lineHeight: number,
): number {
  const cursorY = startY;
  if (!text.trim()) {
    return cursorY;
  }
  setProfilePdfFont(doc, "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(text, contentWidth);
  let y = cursorY;
  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - 44) {
      doc.addPage();
      y = 48;
    }
    setProfilePdfFont(doc, "normal");
    doc.setFontSize(fontSize);
    doc.text(lines[i], marginX, y, { baseline: "top" });
    y += lineHeight;
  }
  return y + 8;
}

function resetDocToProfileBodyStyle(doc: import("jspdf").jsPDF): void {
  setProfilePdfFont(doc, "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
}

/** AI block after Figure 2 — same colours and margins as the rest of the profile PDF (no accent frame). */
function addProfileAiInterpretationSection(
  doc: import("jspdf").jsPDF,
  aiParagraph: string,
  marginX: number,
  contentWidth: number,
  startY: number,
  pageHeight: number,
  engineeringMode: "cu" | "spt" = "cu",
): number {
  let cursorY = startY;
  if (cursorY > pageHeight - 120) {
    doc.addPage();
    cursorY = 48;
  }

  setProfilePdfFont(doc, "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("AI Interpretation", marginX, cursorY, { baseline: "top" });
  cursorY += 18;

  resetDocToProfileBodyStyle(doc);
  const normalizedAi = sanitizeAiInterpretationText(aiParagraph);
  cursorY =
    engineeringMode === "spt"
      ? addSptEngineeringBlock(doc, normalizedAi, marginX, contentWidth, cursorY, pageHeight, 11, 16, "normal")
      : addCuEngineeringBlock(doc, normalizedAi, marginX, contentWidth, cursorY, pageHeight, 11, 16, "normal");

  resetDocToProfileBodyStyle(doc);
  return cursorY + 8;
}

export async function createToolReportPdf(options: CreateToolReportPdfOptions): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  let cursorY = 48;
  const contentWidth = pageWidth - marginX * 2;

  const addParagraph = (text: string, fontSize = 11, lineHeight = 16) => {
    if (!text.trim()) {
      return;
    }
    doc.setFont("times", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth);
    if (cursorY + lines.length * lineHeight > pageHeight - 44) {
      doc.addPage();
      cursorY = 48;
    }
    doc.text(lines, marginX, cursorY, { baseline: "top" });
    cursorY += lines.length * lineHeight + 8;
  };

  const profileReportKind =
    options.toolSlug === "cu-from-pi-and-spt"
      ? "cu"
      : options.toolSlug === "cprime-from-cu"
        ? "cprime"
        : options.toolSlug === "friction-angle-from-pi"
          ? "phi-pi"
          : options.toolSlug === "spt-corrections"
            ? "spt"
            : null;

  if (profileReportKind) {
    activeProfilePdfFont = "helvetica";
    if (profileReportKind === "phi-pi" || profileReportKind === "spt") {
      await ensureNotoSansFonts(doc);
      activeProfilePdfFont = "NotoSans";
    }
    resetDocToProfileBodyStyle(doc);

    const blocks = options.narrativeText
      .split(/\n\s*\n/g)
      .map((block) => block.trim())
      .filter(Boolean);

    for (const block of blocks) {
      if (profileReportKind === "cu" && block.trim() === CU_REPORT_STROUD_FIGURE_PLACEHOLDER) {
        cursorY = await embedCuStroudFigure1InNarrative(doc, marginX, contentWidth, cursorY, pageHeight);
        continue;
      }
      if (profileReportKind === "cu" && isCuEquationLine(block)) {
        cursorY = drawCuEquationCentered(doc, marginX, contentWidth, cursorY, pageHeight);
        continue;
      }
      if (profileReportKind === "cprime" && isCprimeEquationLine(block)) {
        cursorY = drawCprimeEquationCentered(doc, marginX, contentWidth, cursorY, pageHeight);
        continue;
      }
      if (profileReportKind === "phi-pi" && isPhiPiEquationLine(block)) {
        cursorY = drawPhiPiEquationCentered(doc, marginX, contentWidth, cursorY, pageHeight);
        continue;
      }
      if (profileReportKind === "spt" && block.trim() === SPT_REPORT_EQ_N60_PLACEHOLDER) {
        cursorY = drawSptN60EquationCentered(doc, marginX, contentWidth, cursorY, pageHeight);
        continue;
      }
      if (profileReportKind === "spt" && block.trim() === SPT_REPORT_EQ_N160_PLACEHOLDER) {
        cursorY = drawSptN160EquationCentered(doc, marginX, contentWidth, cursorY, pageHeight);
        continue;
      }
      const isHeading = /^\d+(\.\d+)*\.\s/.test(block);
      cursorY =
        profileReportKind === "spt"
          ? addSptEngineeringBlock(
              doc,
              block,
              marginX,
              contentWidth,
              cursorY,
              pageHeight,
              isHeading ? 12 : 11,
              isHeading ? 18 : 16,
              isHeading ? "bold" : "normal",
            )
          : addCuEngineeringBlock(
              doc,
              block,
              marginX,
              contentWidth,
              cursorY,
              pageHeight,
              isHeading ? 12 : 11,
              isHeading ? 18 : 16,
              isHeading ? "bold" : "normal",
            );
    }

    const tableCaptionForPdf =
      profileReportKind === "phi-pi"
        ? PHI_PI_REPORT_TABLE_1_TITLE
        : profileReportKind === "spt"
          ? SPT_REPORT_TABLE_2_TITLE
          : plainPdfCaptionFromMarkup(
              profileReportKind === "cu" ? CU_REPORT_TABLE_1_TITLE : CPRIME_REPORT_TABLE_1_TITLE,
            );

    cursorY = drawCuCenteredCaptionText(doc, marginX, contentWidth, cursorY, pageHeight, tableCaptionForPdf);

    if (cursorY > pageHeight - 120) {
      doc.addPage();
      cursorY = 48;
    }

    const headRow = options.columns.map((column) => column.header);
    const bodyRows = options.rows.map((row) =>
      options.columns.map((column) => ensureText(row[column.key])),
    );

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 40 },
      styles: {
        font: activeProfilePdfFont,
        fontSize: 9,
        textColor: [15, 23, 42],
        cellPadding: 4,
        lineColor: [203, 213, 225],
        lineWidth: 0.5,
      },
      headStyles: {
        font: activeProfilePdfFont,
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
      },
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [headRow],
      body: bodyRows,
    });

    const lastTable = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    cursorY = (lastTable?.finalY ?? cursorY) + 20;
    resetDocToProfileBodyStyle(doc);

    if (options.plotImageDataUrl) {
      setProfilePdfFont(doc, "normal");
      doc.setFontSize(10);
      const figureCaptionForPdf =
        profileReportKind === "phi-pi"
          ? PHI_PI_REPORT_FIGURE_1_CAPTION
          : profileReportKind === "spt"
            ? SPT_REPORT_FIGURE_1_CAPTION
            : plainPdfCaptionFromMarkup(
                profileReportKind === "cu" ? CU_REPORT_FIGURE_2_CAPTION : CPRIME_REPORT_FIGURE_2_CAPTION,
              );
      const fig2CaptionLines = doc.splitTextToSize(figureCaptionForPdf, contentWidth);
      const fig2CaptionBlockH = fig2CaptionLines.length * 13 + 14;

      try {
        const dims = await getImageDimensions(options.plotImageDataUrl);
        const imageRatio = dims.width / Math.max(dims.height, 1);
        const maxImageHeight = Math.min(560, pageHeight - cursorY - 64 - fig2CaptionBlockH);
        let finalWidth = contentWidth;
        let finalHeight = finalWidth / imageRatio;
        if (finalHeight > maxImageHeight) {
          finalHeight = maxImageHeight;
          finalWidth = finalHeight * imageRatio;
        }

        if (cursorY + finalHeight + fig2CaptionBlockH > pageHeight - 28) {
          doc.addPage();
          cursorY = 48;
        }

        const imgX = marginX + (contentWidth - finalWidth) / 2;
        doc.addImage(options.plotImageDataUrl, "PNG", imgX, cursorY, finalWidth, finalHeight);
        cursorY += finalHeight + 10;
        cursorY = drawCuCenteredCaptionText(doc, marginX, contentWidth, cursorY, pageHeight, figureCaptionForPdf);
      } catch {
        cursorY = addCuPlainParagraphHelvetica(
          doc,
          profileReportKind === "phi-pi" || profileReportKind === "spt"
            ? "Figure 1 could not be embedded in this PDF. Regenerate the profile plot on the Soil Profile Plot tab and try again."
            : "Figure 2 could not be embedded in this PDF. Regenerate the profile plot on the Soil Profile Plot tab and try again.",
          marginX,
          contentWidth,
          cursorY,
          pageHeight,
          10,
          15,
        );
      }
    }

    if (options.plotImageDataUrl2 && profileReportKind === "spt") {
      setProfilePdfFont(doc, "normal");
      doc.setFontSize(10);
      const sptFig2Caption = SPT_REPORT_FIGURE_2_CAPTION;
      const sptFig2CaptionLines = doc.splitTextToSize(sptFig2Caption, contentWidth);
      const sptFig2CaptionBlockH = sptFig2CaptionLines.length * 13 + 14;

      try {
        const dims2 = await getImageDimensions(options.plotImageDataUrl2);
        const imageRatio2 = dims2.width / Math.max(dims2.height, 1);
        const maxImageHeight2 = Math.min(560, pageHeight - cursorY - 64 - sptFig2CaptionBlockH);
        let finalWidth2 = contentWidth;
        let finalHeight2 = finalWidth2 / imageRatio2;
        if (finalHeight2 > maxImageHeight2) {
          finalHeight2 = maxImageHeight2;
          finalWidth2 = finalHeight2 * imageRatio2;
        }

        if (cursorY + finalHeight2 + sptFig2CaptionBlockH > pageHeight - 28) {
          doc.addPage();
          cursorY = 48;
        }

        const imgX2 = marginX + (contentWidth - finalWidth2) / 2;
        doc.addImage(options.plotImageDataUrl2, "PNG", imgX2, cursorY, finalWidth2, finalHeight2);
        cursorY += finalHeight2 + 10;
        cursorY = drawCuCenteredCaptionText(doc, marginX, contentWidth, cursorY, pageHeight, sptFig2Caption);
      } catch {
        cursorY = addCuPlainParagraphHelvetica(
          doc,
          "Figure 2 could not be embedded in this PDF. Regenerate the profile plot on the Soil Profile Plot tab and try again.",
          marginX,
          contentWidth,
          cursorY,
          pageHeight,
          10,
          15,
        );
      }
    }

    const aiParagraph = ensureText(options.aiParagraph);
    if (aiParagraph) {
      if (cursorY > pageHeight - 160) {
        doc.addPage();
        cursorY = 48;
      }
      cursorY = addProfileAiInterpretationSection(
        doc,
        aiParagraph,
        marginX,
        contentWidth,
        cursorY,
        pageHeight,
        profileReportKind === "spt" ? "spt" : "cu",
      );
    }

    resetDocToProfileBodyStyle(doc);
    setProfilePdfFont(doc, "bold");
    doc.setFontSize(12);
    doc.text("2. References", marginX, cursorY, { baseline: "top" });
    cursorY += 18;
    const referenceEntries =
      profileReportKind === "cu"
        ? CU_REPORT_REFERENCE_ENTRIES
        : profileReportKind === "phi-pi"
          ? PHI_PI_REPORT_REFERENCE_ENTRIES
          : profileReportKind === "spt"
            ? SPT_REPORT_REFERENCE_ENTRIES
            : CPRIME_REPORT_REFERENCE_ENTRIES;
    for (const entry of referenceEntries) {
      cursorY = addCuPlainParagraphHelvetica(
        doc,
        `- ${entry}`,
        marginX,
        contentWidth,
        cursorY,
        pageHeight,
        11,
        16,
      );
    }

    const slug = sanitizeFilenamePart(options.toolSlug || "tool");
    const stamp = formatDateTimeStamp();
    doc.save(`${slug}-report-${stamp}.pdf`);
    return;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("Geotechnical Insights Hub", marginX, cursorY, { baseline: "top" });
  cursorY += 30;

  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(options.toolTitle, marginX, cursorY, { baseline: "top" });
  cursorY += 22;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")} | Unit system: ${options.unitSystem}`, marginX, cursorY, {
    baseline: "top",
  });
  doc.setTextColor(15, 23, 42);
  cursorY += 20;

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Base Report Text", marginX, cursorY, { baseline: "top" });
  cursorY += 18;
  addParagraph(options.narrativeText);

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Calculated Data Table", marginX, cursorY, { baseline: "top" });
  cursorY += 10;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    styles: {
      font: "times",
      fontSize: 9,
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
    head: [options.columns.map((column) => column.header)],
    body: options.rows.map((row) => options.columns.map((column) => ensureText(row[column.key]))),
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY;
  cursorY += 20;

  if (options.plotImageDataUrl) {
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("Profile Plot", marginX, cursorY, { baseline: "top" });
    cursorY += 16;

    const dims = await getImageDimensions(options.plotImageDataUrl);
    const imageRatio = dims.width / Math.max(dims.height, 1);
    const targetWidth = contentWidth;
    const targetHeight = targetWidth / imageRatio;
    const maxImageHeight = pageHeight - cursorY - 48;
    const finalHeight = Math.min(targetHeight, maxImageHeight > 120 ? maxImageHeight : targetHeight);
    const finalWidth = finalHeight * imageRatio;

    if (cursorY + finalHeight > pageHeight - 32) {
      doc.addPage();
      cursorY = 48;
    }

    doc.addImage(options.plotImageDataUrl, "PNG", marginX, cursorY, finalWidth, finalHeight, undefined, "FAST");
    cursorY += finalHeight + 14;
  }

  const aiParagraph = ensureText(options.aiParagraph);
  if (aiParagraph) {
    if (cursorY > pageHeight - 170) {
      doc.addPage();
      cursorY = 48;
    }
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("AI Interpretation", marginX, cursorY, { baseline: "top" });
    cursorY += 18;
    addParagraph(aiParagraph);
  }

  const slug = sanitizeFilenamePart(options.toolSlug || "tool");
  const stamp = formatDateTimeStamp();
  doc.save(`${slug}-report-${stamp}.pdf`);
}
