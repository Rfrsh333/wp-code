import { create } from "zustand";
import type { ChatMessageDisplay, ConversationStatus, UserType } from "@/types/chatbot";

interface ChatbotState {
  isOpen: boolean;
  messages: ChatMessageDisplay[];
  conversationId: string | null;
  status: ConversationStatus;
  isTyping: boolean;
  unreadCount: number;
  userType: UserType;

  // Actions
  toggle: () => void;
  open: () => void;
  close: () => void;
  setUserType: (type: UserType) => void;
  setConversationId: (id: string) => void;
  setStatus: (status: ConversationStatus) => void;
  addMessage: (message: ChatMessageDisplay) => void;
  updateStreamingMessage: (id: string, content: string) => void;
  finalizeStreamingMessage: (id: string) => void;
  setIsTyping: (typing: boolean) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
  resetChat: () => void;
}

export const useChatbotStore = create<ChatbotState>((set) => ({
  isOpen: false,
  messages: [],
  conversationId: null,
  status: "ai",
  isTyping: false,
  unreadCount: 0,
  userType: "medewerker",

  toggle: () => set((s) => ({ isOpen: !s.isOpen, unreadCount: !s.isOpen ? 0 : s.unreadCount })),
  open: () => set({ isOpen: true, unreadCount: 0 }),
  close: () => set({ isOpen: false }),
  setUserType: (userType) => set({ userType }),
  setConversationId: (conversationId) => set({ conversationId }),
  setStatus: (status) => set({ status }),

  addMessage: (message) =>
    set((s) => ({
      messages: [...s.messages, message],
      unreadCount: s.isOpen ? s.unreadCount : s.unreadCount + 1,
    })),

  updateStreamingMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    })),

  finalizeStreamingMessage: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
    })),

  setIsTyping: (isTyping) => set({ isTyping }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),

  resetChat: () =>
    set({
      messages: [],
      conversationId: null,
      status: "ai",
      isTyping: false,
      unreadCount: 0,
    }),
}));
