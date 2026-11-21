/**
 * Maps characters that the embedded PDF font (public/fonts/NotoSans-*.ttf, a Latin/Greek subset) cannot
 * draw onto visually equivalent glyphs it does contain. Without this, jsPDF prints empty boxes or
 * garbage for e.g. "≤", "−", "→" and colour emoji.
 *
 * Verified missing in the bundled Noto Sans subset: U+2212 − , U+2264 ≤ , U+2265 ≥ , U+2248 ≈ ,
 * U+2192 → , U+21D2 ⇒ , U+221A √ , U+2260 ≠ , U+221E ∞ , U+2206 ∆ , U+223C ∼ , emoji.
 */
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/−/g, "‒"], // minus → figure dash (same width as digits, present in font)
  [/≤/g, "<="],
  [/≥/g, ">="],
  [/≈/g, "~"],
  [/∼/g, "~"],
  [/≠/g, "!="],
  [/→/g, "->"],
  [/⇒/g, "=>"],
  [/←/g, "<-"],
  [/√/g, "sqrt"],
  [/∞/g, "infinity"],
  [/∆/g, "Δ"], // increment sign → Greek capital delta
  [/\u{1F7E2}/gu, "HIGH"],
  [/\u{1F7E1}/gu, "MEDIUM"],
  [/\u{1F534}/gu, "LOW"],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?/gu, ""], // remaining pictographs / dingbats
  [/️/g, ""],
  // Invisible joiners/zero-width spaces from HTML-to-text conversion render as visible gaps in jsPDF.
  [/[⁠​‌‍﻿]/g, ""],
];

export function toPdfSafeText(text: string): string {
  let s = text ?? "";
  for (const [pattern, replacement] of REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/ {2,}/g, " ");
}
