"use client";

import {
  buildMhtmlMultipartDocument,
  escapeExcelHtml,
  EXCEL_TABLE_BLOCK_CSS,
} from "@/lib/excel-mhtml-export";

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function extractCellText(cell: HTMLTableCellElement): string {
  const input = cell.querySelector("input, textarea, select") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | null;

  if (input) {
    if (input instanceof HTMLSelectElement) {
      return input.options[input.selectedIndex]?.text?.trim() ?? input.value.trim();
    }
    return input.value.trim();
  }

  const output = cell.querySelector("div");
  if (output?.textContent?.trim()) {
    return output.textContent.trim();
  }

  return cell.textContent?.trim() ?? "";
}

function buildTableHtml(table: HTMLTableElement): string {
  const headerRow = table.querySelector("thead tr");
  const headerCells = Array.from(headerRow?.querySelectorAll("th") ?? [])
    .map((cell) => `<th class="xls-txt">${escapeExcelHtml(cell.textContent?.replace(/\s+/g, " ").trim() ?? "")}</th>`)
    .join("");

  const bodyRows = Array.from(table.querySelectorAll("tbody tr"))
    .map((row) => {
      const values = Array.from(row.querySelectorAll("td")).map((cell) => extractCellText(cell));
      return `<tr>${values.map((value) => `<td class="xls-txt">${escapeExcelHtml(value)}</td>`).join("")}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

async function svgToPngDataUri(svg: SVGSVGElement): Promise<string> {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svg);
  const viewBox = svg.viewBox?.baseVal;
  const w = Math.max(Math.round(viewBox?.width || svg.clientWidth || 1200), 200);
  const h = Math.max(Math.round(viewBox?.height || svg.clientHeight || 800), 200);

  if (!/<svg[^>]*\bwidth\s*=/i.test(source)) {
    source = source.replace(/<svg\b/i, `<svg width="${w}" height="${h}" `);
  }

  const encoded = encodeURIComponent(source);
  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encoded}`;

  const scale = Math.min(3, Math.max(2, 1400 / Math.max(w, 1)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas not available.");
  }

  const image = new Image();
  image.decoding = "sync";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    image.onerror = () => reject(new Error("SVG rasterization failed."));
    image.src = svgDataUri;
  });

  return canvas.toDataURL("image/png");
}

function buildExcelHtml(title: string, summary: string, tableHtml: string, imageCount: number): string {
  const chartHtml =
    imageCount > 0
      ? `<h2>Profile plots</h2>
    <div class="chart-grid">
      ${Array.from({ length: imageCount }, (_, index) => `<div><img src="file:///plot-${index + 1}.png" alt="Profile plot ${index + 1}" style="width:100%;max-width:1200px;height:auto;display:block;border:1px solid #cbd5e1;border-radius:6px" /></div>`).join("")}
    </div>`
      : "";

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <title>${escapeExcelHtml(title)} Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      ${EXCEL_TABLE_BLOCK_CSS}
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
      .chart-grid img { max-width: 100%; }
    </style>
  </head>
  <body>
    <h1>${escapeExcelHtml(title)} Export</h1>
    <p>${escapeExcelHtml(summary)}</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    ${chartHtml}
  </body>
</html>`;
}

export async function exportProfileExcelFromSection(
  triggerElement: HTMLElement,
  options?: {
    title?: string;
    summary?: string;
    filename?: string;
  },
): Promise<void> {
  const section = triggerElement.closest("section");
  if (!section) {
    throw new Error("Profile section not found.");
  }

  const table = section.querySelector("table");
  if (!table) {
    throw new Error("Profile table not found.");
  }

  const title =
    options?.title ??
    section.querySelector("h2")?.textContent?.trim() ??
    section.querySelector("h1")?.textContent?.trim() ??
    "Soil Profile";
  const summary = options?.summary ?? "Exported table and profile plots.";
  const filename = options?.filename ?? `${sanitizeFilename(title) || "soil-profile"}-export.xls`;

  const tableHtml = buildTableHtml(table);
  const svgPlots = Array.from(section.querySelectorAll("svg")).filter((svg) => {
    const box = svg.getBoundingClientRect();
    return box.width > 120 && box.height > 80;
  });

  const pngDataUris = await Promise.all(svgPlots.map((svg) => svgToPngDataUri(svg)));
  const html = buildExcelHtml(title, summary, tableHtml, pngDataUris.length);
  const payload = buildMhtmlMultipartDocument(
    html,
    pngDataUris.map((dataUri, index) => ({
      contentLocation: `file:///plot-${index + 1}.png`,
      base64Png: dataUri,
    })),
  );

  downloadBlob(filename, new Blob([payload], { type: "application/vnd.ms-excel;charset=utf-8" }));
}
