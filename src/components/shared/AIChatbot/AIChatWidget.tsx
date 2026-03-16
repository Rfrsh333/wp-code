"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useChatbotStore } from "@/stores/useChatbotStore";
import { supabase } from "@/lib/supabase";
import type { UserType, ChatMessageDisplay } from "@/types/chatbot";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import QuickActions from "./QuickActions";
import HandoffBanner from "./HandoffBanner";
import TypingIndicator from "./TypingIndicator";

interface AIChatWidgetProps {
  userType: UserType;
}

export default function AIChatWidget({ userType }: AIChatWidgetProps) {
  const store = useChatbotStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Set user type on mount + restore active conversation
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      store.setUserType(userType);

      // Restore active conversation if none in memory
      if (!store.conversationId) {
        setIsRestoring(true);
        fetch(`/api/ai-chat/active?user_type=${userType}`)
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data?.conversation && data.messages?.length > 0) {
              const messages: ChatMessageDisplay[] = data.messages.map(
                (msg: { id: string; sender_type: string; content: string; created_at: string }) => ({
                  id: msg.id,
                  content: msg.content,
                  sender_type: msg.sender_type as ChatMessageDisplay["sender_type"],
                  created_at: msg.created_at,
                })
              );
              store.restoreConversation(data.conversation.id, messages, data.conversation.status);
            }
          })
          .catch(() => {
            // Silently fail - user can still start a new conversation
          })
          .finally(() => setIsRestoring(false));
      }
    }
  }, [userType, store]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.messages, store.isTyping]);

  // Realtime subscription for live agent messages
  useEffect(() => {
    if (!store.conversationId) return;
    if (store.status !== "waiting_for_agent" && store.status !== "live_agent") return;

    const channel = supabase
      .channel(`chatbot:${store.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chatbot_messages",
          filter: `conversation_id=eq.${store.conversationId}`,
        },
        (payload) => {
          const msg = payload.new as {
            id: string;
            sender_type: string;
            content: string;
            created_at: string;
          };
          // Only add messages from admin or system (user messages are added locally)
          if (msg.sender_type === "admin" || msg.sender_type === "system") {
            store.addMessage({
              id: msg.id,
              content: msg.content,
              sender_type: msg.sender_type as ChatMessageDisplay["sender_type"],
              created_at: msg.created_at,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chatbot_conversations",
          filter: `id=eq.${store.conversationId}`,
        },
        (payload) => {
          const conv = payload.new as { status: string };
          store.setStatus(conv.status as ChatMessageDisplay["sender_type"] extends string ? typeof conv.status extends string ? "ai" | "waiting_for_agent" | "live_agent" | "closed" : never : never);
          if (conv.status === "live_agent" || conv.status === "waiting_for_agent" || conv.status === "closed") {
            store.setStatus(conv.status as "ai" | "waiting_for_agent" | "live_agent" | "closed");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store.conversationId, store.status, store]);

  const sendMessage = useCallback(
    async (message: string) => {
      // Add user message to UI immediately
      const userMsg: ChatMessageDisplay = {
        id: `user-${Date.now()}`,
        content: message,
        sender_type: "user",
        created_at: new Date().toISOString(),
      };
      store.addMessage(userMsg);

      // If in live_agent or waiting_for_agent mode, send via conversation API
      if (store.status === "live_agent" || store.status === "waiting_for_agent") {
        try {
          await fetch("/api/ai-chat/user-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation_id: store.conversationId,
              message,
              user_type: userType,
            }),
          });
        } catch {
          toast.error("Bericht versturen mislukt");
        }
        return;
      }

      // AI mode - stream response
      store.setIsTyping(true);

      try {
        console.log("[AIChatWidget] Sending message:", { message, conversationId: store.conversationId, userType });
        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversation_id: store.conversationId,
            user_type: userType,
          }),
        });

        console.log("[AIChatWidget] Response status:", response.status);
        if (!response.ok) {
          const responseText = await response.text();
          console.error("[AIChatWidget] API error:", response.status, responseText);
          let errorMsg = `API fout (${response.status})`;
          try { errorMsg = JSON.parse(responseText).error || errorMsg; } catch {}
          throw new Error(errorMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Geen response stream");

        const decoder = new TextDecoder();
        const aiMsgId = `ai-${Date.now()}`;
        let hasAddedMessage = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "conv_id" && data.conversation_id) {
                store.setConversationId(data.conversation_id);
              }

              if (data.type === "chunk" && data.content) {
                if (!hasAddedMessage) {
                  store.addMessage({
                    id: aiMsgId,
                    content: data.content,
                    sender_type: "ai",
                    created_at: new Date().toISOString(),
                    isStreaming: true,
                  });
                  hasAddedMessage = true;
                  store.setIsTyping(false);
                } else {
                  store.updateStreamingMessage(aiMsgId, data.content);
                }
              }

              if (data.type === "done") {
                store.finalizeStreamingMessage(aiMsgId);
              }

              if (data.type === "error") {
                store.setIsTyping(false);
                toast.error(data.content || "Er ging iets mis");
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        store.setIsTyping(false);
        toast.error(err instanceof Error ? err.message : "Er ging iets mis");
      }
    },
    [store, userType]
  );

  const handleHandoff = useCallback(async () => {
    if (!store.conversationId) {
      // Need to create conversation first with an initial message
      toast.error("Stuur eerst een bericht voordat je doorverbonden wordt.");
      return;
    }

    try {
      const res = await fetch("/api/ai-chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: store.conversationId,
          user_type: userType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Doorverbinden mislukt");
      }

      store.setStatus("waiting_for_agent");
      store.addMessage({
        id: `system-${Date.now()}`,
        content: "Je wordt doorverbonden met een medewerker van TopTalent...",
        sender_type: "system",
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Doorverbinden mislukt");
    }
  }, [store, userType]);

  const handleReset = useCallback(() => {
    store.resetChat();
  }, [store]);

  const showQuickActions = store.messages.length === 0 && store.status === "ai";
  const inputDisabled = store.status === "closed";

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!store.isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={store.toggle}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] w-14 h-14 bg-[#F27501] text-white rounded-full shadow-lg hover:bg-[#d96800] transition-colors flex items-center justify-center"
            aria-label="Open chat"
          >
            <MessageCircle className="w-6 h-6" />
            {store.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {store.unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {store.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-[60] w-full h-full md:w-[400px] md:h-[600px] md:max-h-[80vh] flex flex-col bg-white dark:bg-neutral-900 md:rounded-2xl shadow-2xl md:border md:border-neutral-200 md:dark:border-neutral-700"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Header */}
            <ChatHeader
              status={store.status}
              onMinimize={store.close}
              onClose={() => {
                store.close();
                store.resetChat();
              }}
              onReset={handleReset}
            />

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Welcome message */}
              {store.messages.length === 0 && (
                <div className="px-4 py-3">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">
                      Hoi! Ik ben de TopTalent Assistent. Hoe kan ik je helpen?
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {showQuickActions && (
                <QuickActions
                  userType={userType}
                  onSelect={sendMessage}
                  onHandoff={handleHandoff}
                />
              )}

              {/* Messages */}
              {store.messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Typing indicator */}
              {store.isTyping && <TypingIndicator />}

              {/* Handoff banner */}
              {store.status !== "ai" && <HandoffBanner status={store.status} />}

              {/* Handoff button (only in AI mode with messages) */}
              {store.messages.length > 0 && store.status === "ai" && (
                <div className="px-4 py-2">
                  <button
                    onClick={handleHandoff}
                    className="w-full px-3 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-xl border border-green-200 dark:border-green-800 transition-colors"
                  >
                    Spreek een medewerker
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              disabled={inputDisabled}
              placeholder={
                store.status === "closed"
                  ? "Gesprek is gesloten"
                  : store.status === "waiting_for_agent"
                  ? "Typ alvast je vraag..."
                  : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
