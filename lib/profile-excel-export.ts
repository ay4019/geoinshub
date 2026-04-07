"use client";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function wrapBase64(base64: string): string {
  return base64.replace(/(.{76})/g, "$1\r\n");
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
    .map((cell) => `<th>${escapeHtml(cell.textContent?.replace(/\s+/g, " ").trim() ?? "")}</th>`)
    .join("");

  const bodyRows = Array.from(table.querySelectorAll("tbody tr"))
    .map((row) => {
      const values = Array.from(row.querySelectorAll("td")).map((cell) => extractCellText(cell));
      return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

async function svgToPngDataUri(svg: SVGSVGElement): Promise<string> {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const encoded = encodeURIComponent(source);
  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encoded}`;

  const viewBox = svg.viewBox?.baseVal;
  const width = Math.max(Math.round(viewBox?.width || svg.clientWidth || 1200), 200);
  const height = Math.max(Math.round(viewBox?.height || svg.clientHeight || 800), 200);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas not available.");
  }

  const image = new Image();
  image.decoding = "sync";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
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
      ${Array.from({ length: imageCount }, (_, index) => `<div><img src="file:///plot-${index + 1}.png" alt="Profile plot ${index + 1}" /></div>`).join("")}
    </div>`
      : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} Export</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 24px 0 10px; }
      p { font-size: 12px; color: #475569; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
      .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
      .chart-grid img { width: 100%; height: auto; display: block; border: 1px solid #cbd5e1; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)} Export</h1>
    <p>${escapeHtml(summary)}</p>
    <h2>Layered profile table</h2>
    ${tableHtml}
    ${chartHtml}
  </body>
</html>`;
}

function buildMhtmlDocument(html: string, pngDataUris: string[]): string {
  if (pngDataUris.length === 0) {
    return html;
  }

  const boundary = "----=_NextPart_ProfileExport";
  const parts: string[] = [
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=\"utf-8\"",
    "Content-Transfer-Encoding: 8bit",
    "Content-Location: file:///report.htm",
    "",
    html,
    "",
  ];

  pngDataUris.forEach((uri, index) => {
    const base64 = uri.startsWith("data:image/png;base64,") ? uri.replace("data:image/png;base64,", "") : "";
    if (!base64) {
      return;
    }
    parts.push(
      `--${boundary}`,
      `Content-Location: file:///plot-${index + 1}.png`,
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(base64),
      "",
    );
  });

  parts.push(`--${boundary}--`);
  return parts.join("\r\n");
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
    return box.width > 240 && box.height > 160;
  });

  const pngDataUris = await Promise.all(svgPlots.map((svg) => svgToPngDataUri(svg)));
  const html = buildExcelHtml(title, summary, tableHtml, pngDataUris.length);
  const payload = buildMhtmlDocument(html, pngDataUris);

  downloadBlob(filename, new Blob([payload], { type: "application/vnd.ms-excel;charset=utf-8" }));
}

