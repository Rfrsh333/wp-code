import "server-only";

import { ContentPipelineError } from "@/lib/content/errors";
import type { AiTextClient } from "@/lib/content/services/article-classification-service";

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
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

function extractContent(response: OpenAIResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("")
      .trim();
  }

  throw new ContentPipelineError(
    "OpenAI returned no usable content.",
    "openai_empty_response",
  );
}

export class OpenAIContentClient implements AiTextClient {
  constructor(
    private readonly model = process.env.OPENAI_CONTENT_MODEL || "gpt-4o-mini",
    private readonly baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  ) {}

  async generateText(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    const maxTokens = options?.maxTokens ?? 16384;
    const temperature = options?.temperature ?? 0.3;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getOpenAIKey()}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return valid JSON only. Do not add markdown fences or explanatory text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ContentPipelineError(
        `OpenAI request failed (${response.status}): ${errorBody.slice(0, 200)}`,
        "openai_request_failed",
        {
          status: response.status,
          body: errorBody,
        },
      );
    }

    const payload = (await response.json()) as OpenAIResponse;
    return extractContent(payload);
  }
}
