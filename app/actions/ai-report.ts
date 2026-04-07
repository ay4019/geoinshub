"use server";

interface ProfileReportAiRequest {
  toolSlug: string;
  toolTitle: string;
  depthUnit: string;
  valueUnit: string;
  templateText: string;
  tableRows: Array<Record<string, string>>;
  plotImageDataUrl?: string | null;
  aiPromptHint?: string;
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const maybe = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof maybe.output_text === "string" && maybe.output_text.trim()) {
    return maybe.output_text.trim();
  }

  const chunks =
    maybe.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text!.trim())
      .filter(Boolean) ?? [];

  return chunks.join("\n\n").trim();
}

function normaliseRows(rows: Array<Record<string, string>>) {
  return rows.slice(0, 80).map((row, index) => {
    const pairs = Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    return `${index + 1}. ${pairs}`;
  });
}

export async function interpretProfileReportAction(request: ProfileReportAiRequest): Promise<string> {
  try {
    if (!request.tableRows?.length) {
      return "No profile table data was found. Please prepare profile rows first.";
    }

    if (!request.plotImageDataUrl) {
      return "No profile plot image is available yet. Please complete the profile plot first.";
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return "AI report is enabled, but OPENAI_API_KEY is missing on the server.";
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You are a geotechnical engineering reporting assistant.",
                  "Return exactly one concise paragraph (80-140 words).",
                  "Tone must be technical, objective, and preliminary-screening focused.",
                  "Do not claim code compliance or final design suitability.",
                  "Include at least one caution sentence about verification by qualified engineers.",
                ].join("\n"),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `Tool slug: ${request.toolSlug}`,
                  `Tool title: ${request.toolTitle}`,
                  `Units: depth (${request.depthUnit}), value (${request.valueUnit})`,
                  request.aiPromptHint ? `Project hint: ${request.aiPromptHint}` : "",
                  "",
                  "Base report text:",
                  request.templateText,
                  "",
                  "Table rows:",
                  ...normaliseRows(request.tableRows),
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
              {
                type: "input_image",
                image_url: request.plotImageDataUrl,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return `AI report request failed (${response.status}).`;
    }

    const payload = (await response.json()) as unknown;
    const text = extractResponseText(payload);
    return text || "AI returned no text. Please try again.";
  } catch {
    return "AI report is temporarily unavailable. Please try again.";
  }
}

