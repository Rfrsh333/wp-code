"use client";

import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex items-end gap-2 px-3 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Typ een bericht..."}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-3.5 py-2.5 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F27501]/50 disabled:opacity-50 max-h-[120px]"
        aria-label="Chat bericht"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="p-2.5 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        aria-label="Verstuur bericht"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
