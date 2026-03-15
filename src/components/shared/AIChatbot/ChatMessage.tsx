"use client";

import type { ChatMessageDisplay } from "@/types/chatbot";

interface ChatMessageProps {
  message: ChatMessageDisplay;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender_type === "user";
  const isSystem = message.sender_type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-2">
        <div className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs px-3 py-1.5 rounded-full text-center max-w-[80%]">
          {message.content}
        </div>
      </div>
    );
  }

  const time = new Date(message.created_at).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex px-4 py-1 ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "order-1" : ""}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-[#F27501] text-white rounded-br-md"
              : message.sender_type === "admin"
              ? "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 rounded-bl-md"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-md"
          }`}
        >
          {message.sender_type === "admin" && (
            <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
              TopTalent Medewerker
            </div>
          )}
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
          )}
        </div>
        <div className={`text-[10px] text-neutral-400 mt-0.5 ${isUser ? "text-right" : "text-left"}`}>
          {time}
        </div>
      </div>
    </div>
  );
}
