/** Shared HTML/MHTML helpers for "Save as .xls" exports opened in Excel. */

export function escapeExcelHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Forces Excel to treat cell content as text (avoids dates, scientific notation, locale surprises). */
export const EXCEL_TABLE_BLOCK_CSS = `
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
      td.xls-txt, th.xls-txt { mso-number-format:"\\@"; white-space: nowrap; }
`;

export function excelTextCell(raw: string): string {
  return `<td class="xls-txt">${escapeExcelHtml(raw)}</td>`;
}

export function excelTextHeader(raw: string): string {
  return `<th class="xls-txt">${escapeExcelHtml(raw)}</th>`;
}

export function wrapBase64Lines(base64: string): string {
  return base64.replace(/(.{76})/g, "$1\r\n");
}

const DEFAULT_BOUNDARY = "----=_NextPart_ExcelMhtml";

export function buildMhtmlMultipartDocument(
  htmlDocument: string,
  pngAttachments: { contentLocation: string; base64Png: string }[],
  boundary: string = DEFAULT_BOUNDARY,
): string {
  if (pngAttachments.length === 0) {
    return htmlDocument;
  }

  const parts: string[] = [
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "Content-Location: file:///report.htm",
    "",
    htmlDocument,
    "",
  ];

  for (const att of pngAttachments) {
    const b64 = att.base64Png.startsWith("data:image/png;base64,")
      ? att.base64Png.replace("data:image/png;base64,", "")
      : att.base64Png;
    if (!b64.trim()) {
      continue;
    }
    parts.push(
      `--${boundary}`,
      `Content-Location: ${att.contentLocation}`,
      "Content-Type: image/png",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64Lines(b64),
      "",
    );
  }

  parts.push(`--${boundary}--`);
  return parts.join("\r\n");
}
