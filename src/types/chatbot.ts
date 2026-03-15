export type ConversationStatus = "ai" | "waiting_for_agent" | "live_agent" | "closed";
export type UserType = "medewerker" | "klant";
export type SenderType = "user" | "ai" | "admin" | "system";

export interface ChatbotConversation {
  id: string;
  user_type: UserType;
  user_id: string;
  user_naam: string | null;
  user_email: string | null;
  status: ConversationStatus;
  assigned_admin_id: string | null;
  assigned_admin_email: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface ChatbotMessage {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface ChatMessageDisplay {
  id: string;
  content: string;
  sender_type: SenderType;
  created_at: string;
  isStreaming?: boolean;
}

export interface QuickAction {
  label: string;
  message: string;
  icon?: string;
}
