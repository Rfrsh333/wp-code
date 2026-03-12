import OpenAI from "openai";

// Lazy initialization to prevent build-time errors
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is niet geconfigureerd. Voeg deze toe aan .env.local");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

// Default model - can be overridden per call
const DEFAULT_MODEL = "gpt-4o-mini";

// Token/cost limits
const MAX_TOKENS_PER_REQUEST = 2000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send a chat completion request to OpenAI
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    stream?: false;
  }
): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: options?.model || DEFAULT_MODEL,
    messages,
    max_tokens: options?.maxTokens || MAX_TOKENS_PER_REQUEST,
    temperature: options?.temperature ?? 0.7,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Send a streaming chat completion request to OpenAI
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
) {
  const client = getClient();

  return client.chat.completions.create({
    model: options?.model || DEFAULT_MODEL,
    messages,
    max_tokens: options?.maxTokens || MAX_TOKENS_PER_REQUEST,
    temperature: options?.temperature ?? 0.7,
    stream: true,
  });
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
