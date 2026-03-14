import "server-only";

import { ContentPipelineError } from "@/lib/content/errors";

interface OpenAIImageResponse {
  data?: Array<{
    b64_json?: string;
  }>;
}

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ContentPipelineError(
      "OPENAI_API_KEY is not configured.",
      "openai_key_missing",
    );
  }
  return apiKey.trim();
}

export async function generateAiImage(prompt: string): Promise<Buffer> {
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ContentPipelineError(
      `OpenAI image generation failed (${response.status}): ${errorBody.slice(0, 200)}`,
      "openai_image_failed",
      { status: response.status, body: errorBody },
    );
  }

  const payload = (await response.json()) as OpenAIImageResponse;
  const b64 = payload.data?.[0]?.b64_json;

  if (!b64) {
    throw new ContentPipelineError(
      "OpenAI returned no image data.",
      "openai_image_empty",
    );
  }

  return Buffer.from(b64, "base64");
}
