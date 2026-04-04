"use server";

interface CuProfilePoint {
  boreholeId: string;
  depth: number;
  pi: number;
  n60: number;
  f1: number;
  cu: number;
}

interface CuProfileReportRequest {
  toolTitle: string;
  depthUnit: string;
  stressUnit: string;
  points: CuProfilePoint[];
  plotImageDataUrl?: string | null;
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

export async function interpretCuProfileAction(request: CuProfileReportRequest): Promise<string> {
  try {
    if (!request.points?.length) {
      return "No soil profile data found. Please add sample rows in Soil Profile Plot first.";
    }

    if (!request.plotImageDataUrl) {
      return "Plot image was not generated. Please return to Soil Profile Plot and try again.";
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return "AI interpretation is configured, but OPENAI_API_KEY is missing on the server.";
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
                text:
                  "You are a geotechnical engineering assistant. Interpret the provided c_u depth profile for preliminary screening only. Keep it concise, technical, and practical. Avoid design-code claims.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `Tool: ${request.toolTitle}`,
                  `Units: depth (${request.depthUnit}), c_u (${request.stressUnit})`,
                  "Please provide:",
                  "1) Trend summary with depth",
                  "2) Any outliers or unusual transitions",
                  "3) Practical implications for preliminary site characterisation",
                  "4) A short caution note for design-stage use",
                  "",
                  "Tabulated points:",
                  ...request.points.map(
                    (point, index) =>
                      `${index + 1}. BH=${point.boreholeId}, z=${point.depth.toFixed(2)}, PI=${point.pi.toFixed(
                        2,
                      )}, N60=${point.n60.toFixed(2)}, f1=${point.f1.toFixed(2)}, cu=${point.cu.toFixed(2)}`,
                  ),
                ].join("\n"),
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
      return `AI interpretation request failed (${response.status}).`;
    }

    const payload = (await response.json()) as unknown;
    const text = extractResponseText(payload);
    return text || "AI returned no text. Please try again.";
  } catch {
    return "AI interpretation is temporarily unavailable. Please try again.";
  }
}

