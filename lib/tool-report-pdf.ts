"use client";

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
  plotImageDataUrl?: string | null;
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

