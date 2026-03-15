"use client";

import type { ConversationStatus } from "@/types/chatbot";

interface HandoffBannerProps {
  status: ConversationStatus;
}

export default function HandoffBanner({ status }: HandoffBannerProps) {
  if (status === "waiting_for_agent") {
    return (
      <div className="mx-4 my-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Je wordt doorverbonden...
          </span>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          Een medewerker van TopTalent neemt zo snel mogelijk het gesprek over. Je kunt alvast je vraag typen.
        </p>
      </div>
    );
  }

  if (status === "live_agent") {
    return (
      <div className="mx-4 my-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs font-semibold text-green-700 dark:text-green-400">
            Verbonden met een medewerker
          </span>
        </div>
      </div>
    );
  }

  if (status === "closed") {
    return (
      <div className="mx-4 my-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-center">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Dit gesprek is gesloten. Start een nieuw gesprek om verder te gaan.
        </span>
      </div>
    );
  }

  return null;
}
