/**
 * Single source for the liability wording printed in every generated report (screen and PDF) and shown
 * next to AI interpretations. Keep in step with app/disclaimer, app/terms and app/privacy-policy.
 * This text was drafted for clarity, not by a lawyer — have it reviewed by counsel qualified in Turkish law.
 */

export const REPORT_STATUS_BANNER =
  "PRELIMINARY SCREENING OUTPUT — NOT FOR DESIGN OR CONSTRUCTION. Prepared automatically from data entered by the user; not checked, approved, or signed by a qualified engineer.";

export const REPORT_FOOTER_TEXT =
  "Geotechnical Insights Hub · Automated preliminary output · Not for design or construction";

export const REPORT_RESPONSIBILITY_PARAGRAPHS: readonly string[] = [
  "This document was generated automatically by Geotechnical Insights Hub from data entered by the user. Geotechnical Insights Hub and its operator have not reviewed, verified, or approved the input data, the selected methods, or the results, and this document is not a professional engineering report, design calculation, opinion, certification, or deliverable.",
  "The methods are simplified, empirical, or screening-level procedures that may be unsuitable for the ground conditions, loading, groundwater regime, or design standard of a particular project. Results may contain errors arising from input data, unit conversion, method limitations, software defects, or interpretation.",
  "Before any use of these results, the user and the responsible engineer must carry out their own independent analysis and verification: confirm the representativeness and quality of the input data, check the applicability of each method, repeat the calculations with independent means, and confirm compliance with the governing codes, the National Annex, and contractual requirements. Responsibility for any decision based on this document rests entirely with the user and the engineer of record.",
  "To the fullest extent permitted by the laws of the Republic of Türkiye, the operator accepts no liability for any loss or damage of any kind arising from the use of, or reliance on, this document. Use of this document is subject to the Terms of Use and Disclaimer published at the Geotechnical Insights Hub website.",
];

export const AI_INTERPRETATION_NOTICE =
  "AI-generated text: produced by a third-party large language model (Google Gemini) from the tabulated data and figures in this report. It has not been reviewed by a qualified engineer, may contain factual or technical errors, and must not be relied upon without independent verification.";

/** Short consent line shown before the user sends data to the AI provider. */
export const AI_DATA_SHARING_NOTICE =
  "Analyse with AI sends the report table, profile figures, and method text (no account details) to Google's Gemini API for processing outside Türkiye. Do not use it for confidential or client-restricted data.";
