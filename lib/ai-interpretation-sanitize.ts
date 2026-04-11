/**
 * Normalizes Gemini (or similar) profile-report interpretation text for display and PDF:
 * typography, Unicode engineering symbols, light spelling fixes — idempotent.
 */

/** Same band as `interpretProfileReportAction` / `buildSystemPrompt` (≈300–350 words). */
export function getAiInterpretationWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isSuccessfulAiInterpretationBody(text: string): boolean {
  const wordCount = getAiInterpretationWordCount(text);
  return wordCount >= 220 && wordCount <= 400;
}

const SUB_DIGIT = new Map<string, string>([
  ["\u2080", "0"],
  ["\u2081", "1"],
  ["\u2082", "2"],
  ["\u2083", "3"],
  ["\u2084", "4"],
  ["\u2085", "5"],
  ["\u2086", "6"],
  ["\u2087", "7"],
  ["\u2088", "8"],
  ["\u2089", "9"],
]);

/** Conservative English fixes (word-boundary aware where possible). */
const SPELL_FIXES: Array<[RegExp, string]> = [
  [/\boccured\b/gi, "occurred"],
  [/\boccurence\b/gi, "occurrence"],
  [/\bseperator\b/gi, "separator"],
  [/\bheterogenous\b/gi, "heterogeneous"],
  [/\bhomogenous\b/gi, "homogeneous"],
  [/\bneccessary\b/gi, "necessary"],
  [/\bacheive\b/gi, "achieve"],
  [/\bacheived\b/gi, "achieved"],
  [/\bacheivement\b/gi, "achievement"],
  [/\bdefinately\b/gi, "definitely"],
  [/\bconsistant\b/gi, "consistent"],
  [/\bconsistancy\b/gi, "consistency"],
  [/\bvariabilitys\b/gi, "variabilities"],
  [/\bparamater\b/gi, "parameter"],
  [/\bparamaters\b/gi, "parameters"],
  [/\binterpretion\b/gi, "interpretation"],
];

/**
 * Single pass: Unicode/markdown cleanup + engineering tokens + light spelling.
 * Safe to call multiple times.
 */
export function sanitizeAiInterpretationText(raw: string): string {
  let s = raw.normalize("NFKC");
  s = s.replace(/\u200b|\ufeff/g, "");
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/\*\*([^*]*)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/[“”]/g, '"');
  s = s.replace(/[‘’]/g, "'");
  s = s.replace(/\s+([.,;:!?])/g, "$1");
  s = s.replace(/ {2,}/g, " ");

  s = s.replace(/N([\u2080-\u2089]+)/g, (_, subs: string) => {
    const digits = Array.from(subs)
      .map((ch) => SUB_DIGIT.get(ch) ?? "")
      .join("");
    return digits ? `N${digits}` : `N${subs}`;
  });
  s = s.replace(/f\u2081/g, "f1");
  s = s.replace(/c\u1D58/g, "c_u");
  s = s.replace(/N[\s\u2009\u00A0]+60\b/g, "N60");

  for (const [re, rep] of SPELL_FIXES) {
    s = s.replace(re, rep);
  }

  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
