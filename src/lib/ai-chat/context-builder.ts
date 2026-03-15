import type { ChatMessage } from "@/lib/openai";
import type { UserType, ChatbotMessage } from "@/types/chatbot";
import { getSystemPrompt } from "./system-prompts";

const MAX_HISTORY_MESSAGES = 20;

export function buildMessages(
  userType: UserType,
  history: ChatbotMessage[],
  newMessage: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: getSystemPrompt(userType) },
  ];

  // Add conversation history (last N messages)
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  for (const msg of recentHistory) {
    if (msg.sender_type === "user") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.sender_type === "ai") {
      messages.push({ role: "assistant", content: msg.content });
    }
    // Skip admin/system messages - they're not relevant for AI context
  }

  // Add the new user message
  messages.push({ role: "user", content: newMessage });

  return messages;
}
