"use client";

import { X, Minus, RotateCcw } from "lucide-react";
import type { ConversationStatus } from "@/types/chatbot";

interface ChatHeaderProps {
  status: ConversationStatus;
  onMinimize: () => void;
  onClose: () => void;
  onReset: () => void;
}

const statusLabels: Record<ConversationStatus, string> = {
  ai: "AI Assistent",
  waiting_for_agent: "Wacht op medewerker...",
  live_agent: "Live medewerker",
  closed: "Gesprek gesloten",
};

const statusColors: Record<ConversationStatus, string> = {
  ai: "bg-blue-500",
  waiting_for_agent: "bg-amber-500 animate-pulse",
  live_agent: "bg-green-500",
  closed: "bg-neutral-400",
};

export default function ChatHeader({ status, onMinimize, onClose, onReset }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#F27501] text-white rounded-t-2xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
          TT
        </div>
        <div>
          <h3 className="text-sm font-semibold">TopTalent Support</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
            <span className="text-xs text-white/80">{statusLabels[status]}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onReset}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Nieuw gesprek"
          title="Nieuw gesprek"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={onMinimize}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Minimaliseren"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Sluiten"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
