"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { ChatbotConversation, ChatbotMessage, ConversationStatus } from "@/types/chatbot";

type Filter = "all" | "waiting_for_agent" | "live_agent" | "ai" | "closed";

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

export default function LiveChatTab() {
  const [conversations, setConversations] = useState<ChatbotConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<ChatbotConversation | null>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/livechat", { headers });
      if (!res.ok) {
        throw new Error();
      }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("[LiveChat] Error:", err);
      toast.error("Gesprekken ophalen mislukt");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/ai-chat/conversations?id=${convId}`, { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data.messages || []);
      if (data.conversation) {
        setSelectedConv(data.conversation);
      }
    } catch {
      toast.error("Berichten ophalen mislukt");
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription for conversations list
  useEffect(() => {
    const channel = supabase
      .channel("admin-livechat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_conversations" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  // Realtime subscription for selected conversation messages
  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel(`admin-chat-${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chatbot_messages",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        (payload) => {
          const msg = payload.new as ChatbotMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv]);

  const handleAccept = async (convId: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/ai-chat/conversations", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", conversation_id: convId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Gesprek overgenomen");
      fetchConversations();
      if (selectedConv?.id === convId) {
        fetchMessages(convId);
      }
    } catch {
      toast.error("Overnemen mislukt");
    }
  };

  const handleClose = async (convId: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/ai-chat/conversations", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", conversation_id: convId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Gesprek gesloten");
      fetchConversations();
      if (selectedConv?.id === convId) {
        fetchMessages(convId);
      }
    } catch {
      toast.error("Sluiten mislukt");
    }
  };

  const handleSend = async () => {
    if (!selectedConv || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/ai-chat/conversations", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          conversation_id: selectedConv.id,
          message: newMessage.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setNewMessage("");
    } catch {
      toast.error("Versturen mislukt");
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conv: ChatbotConversation) => {
    setSelectedConv(conv);
    fetchMessages(conv.id);
  };

  const filtered = conversations.filter((c) => filter === "all" || c.status === filter);
  const waitingCount = conversations.filter((c) => c.status === "waiting_for_agent").length;
  const liveCount = conversations.filter((c) => c.status === "live_agent").length;

  const statusBadge = (status: ConversationStatus) => {
    const map: Record<ConversationStatus, { bg: string; text: string; label: string }> = {
      ai: { bg: "bg-blue-100", text: "text-blue-700", label: "AI" },
      waiting_for_agent: { bg: "bg-amber-100", text: "text-amber-700", label: "Wachtend" },
      live_agent: { bg: "bg-green-100", text: "text-green-700", label: "Live" },
      closed: { bg: "bg-neutral-100", text: "text-neutral-500", label: "Gesloten" },
    };
    const s = map[status];
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleString("nl-NL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-neutral-100 flex flex-col">
        {/* Stats */}
        <div className="p-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900 mb-3">Live Chat</h2>
          <div className="flex gap-2">
            <div className="flex-1 bg-amber-50 rounded-xl p-2 text-center">
              <div className="text-xl font-bold text-amber-700">{waitingCount}</div>
              <div className="text-xs text-amber-600">Wachtend</div>
            </div>
            <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
              <div className="text-xl font-bold text-green-700">{liveCount}</div>
              <div className="text-xs text-green-600">Live</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 px-3 py-2 border-b border-neutral-100 overflow-x-auto">
          {[
            { id: "all" as Filter, label: "Alle" },
            { id: "waiting_for_agent" as Filter, label: "Wachtend" },
            { id: "live_agent" as Filter, label: "Live" },
            { id: "closed" as Filter, label: "Gesloten" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.id
                  ? "bg-[#F27501] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-neutral-400 text-sm">
              Geen gesprekken
            </div>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${
                selectedConv?.id === conv.id ? "bg-orange-50" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-neutral-900 truncate">
                  {conv.user_naam || "Onbekend"}
                </span>
                {statusBadge(conv.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 capitalize">
                  {conv.user_type} &middot; {conv.user_email || ""}
                </span>
                <span className="text-xs text-neutral-400">
                  {formatTime(conv.updated_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main - Chat View */}
      <div className="flex-1 flex flex-col">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-neutral-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Selecteer een gesprek om te beginnen</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-900">
                  {selectedConv.user_naam || "Onbekend"}
                </h3>
                <p className="text-xs text-neutral-500">
                  {selectedConv.user_type === "medewerker" ? "Medewerker" : "Klant"} &middot;{" "}
                  {selectedConv.user_email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(selectedConv.status)}
                {selectedConv.status === "waiting_for_agent" && (
                  <button
                    onClick={() => handleAccept(selectedConv.id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Overnemen
                  </button>
                )}
                {(selectedConv.status === "live_agent" || selectedConv.status === "waiting_for_agent") && (
                  <button
                    onClick={() => handleClose(selectedConv.id)}
                    className="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg hover:bg-neutral-300 transition-colors"
                  >
                    Sluiten
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isUser = msg.sender_type === "user";
                const isAdmin = msg.sender_type === "admin";
                const isSystem = msg.sender_type === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="bg-neutral-100 text-neutral-500 text-xs px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[70%] ${isAdmin ? "order-1" : ""}`}>
                      <div className="text-xs text-neutral-400 mb-0.5">
                        {isUser
                          ? selectedConv.user_naam || "Gebruiker"
                          : isAdmin
                          ? "Jij (Admin)"
                          : "AI"}
                      </div>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                          isUser
                            ? "bg-neutral-100 text-neutral-900 rounded-bl-md"
                            : isAdmin
                            ? "bg-[#F27501] text-white rounded-br-md"
                            : "bg-blue-50 text-blue-900 rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Admin input */}
            {selectedConv.status === "live_agent" && (
              <div className="px-4 py-3 border-t border-neutral-100 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Typ een antwoord..."
                  className="flex-1 px-4 py-2.5 bg-neutral-100 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F27501]/50"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2.5 bg-[#F27501] text-white text-sm font-semibold rounded-xl hover:bg-[#d96800] disabled:opacity-40 transition-colors"
                >
                  {sending ? "..." : "Verstuur"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
