/**
 * Post-process model markdown to strip filler lines that are only long runs of `-` (no table pipes).
 * Preserves GitHub-flavored markdown table separator lines such as `| --- | --- |`.
 */
export function sanitizeMatrixAiMarkdown(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n");
  // Lines that are only repeated dashes (model "fills" space) — must not contain `|`
  s = s.replace(/^\s*\-{12,}\s*$/gm, "");
  s = s.replace(/\n{5,}/g, "\n\n\n\n");
  return s.trim();
}
