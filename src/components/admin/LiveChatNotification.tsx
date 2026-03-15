"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MessageCircle, X } from "lucide-react";

interface LiveChatNotificationProps {
  onOpenChat: () => void;
}

interface WaitingConversation {
  id: string;
  user_naam: string | null;
  user_type: string;
  updated_at: string;
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

export default function LiveChatNotification({ onOpenChat }: LiveChatNotificationProps) {
  const [waiting, setWaiting] = useState<WaitingConversation[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [audioEnabled, setAudioEnabled] = useState(true);

  const fetchWaiting = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/livechat", { headers });
      if (!res.ok) return;
      const data = await res.json();
      const waitingConvs = (data.conversations || []).filter(
        (c: WaitingConversation & { status: string }) => c.status === "waiting_for_agent"
      );
      setWaiting(waitingConvs);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchWaiting();
  }, [fetchWaiting]);

  // Realtime: listen for conversation status changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-livechat-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_conversations" },
        () => {
          fetchWaiting();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchWaiting]);

  // Play notification sound for new waiting conversations
  useEffect(() => {
    const newWaiting = waiting.filter((w) => !dismissed.has(w.id));
    if (newWaiting.length > 0 && audioEnabled) {
      try {
        const audio = new Audio("/sounds/notification.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {
        // No audio support
      }
    }
  }, [waiting, dismissed, audioEnabled]);

  const visibleNotifications = waiting.filter((w) => !dismissed.has(w.id));

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {visibleNotifications.map((conv) => (
        <div
          key={conv.id}
          className="bg-white rounded-2xl shadow-2xl border border-amber-200 p-4 animate-in slide-in-from-right-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-neutral-900">
                  Nieuw chatverzoek
                </h4>
                <button
                  onClick={() => setDismissed((prev) => new Set(prev).add(conv.id))}
                  className="text-neutral-400 hover:text-neutral-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-neutral-600 mt-0.5">
                <span className="font-semibold">{conv.user_naam || "Onbekend"}</span>
                {" "}({conv.user_type}) wacht op een medewerker
              </p>
              <button
                onClick={() => {
                  setDismissed((prev) => new Set(prev).add(conv.id));
                  onOpenChat();
                }}
                className="mt-2 w-full px-3 py-1.5 bg-[#F27501] text-white text-xs font-semibold rounded-lg hover:bg-[#d96800] transition-colors"
              >
                Open Live Chat
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
