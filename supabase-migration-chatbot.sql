-- =============================================================
-- AI Chatbot: conversations + messages + realtime
-- =============================================================

-- Chatbot conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('medewerker', 'klant')),
  user_id UUID NOT NULL,
  user_naam TEXT,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'ai' CHECK (status IN ('ai', 'waiting_for_agent', 'live_agent', 'closed')),
  assigned_admin_id UUID,
  assigned_admin_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai', 'admin', 'system')),
  sender_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_user ON chatbot_conversations(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_status ON chatbot_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_admin ON chatbot_conversations(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_updated ON chatbot_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_msg_conv ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_msg_created ON chatbot_messages(conversation_id, created_at);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chatbot_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chatbot_messages;

-- Auto-update updated_at on conversations
CREATE OR REPLACE FUNCTION update_chatbot_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chatbot_conversation_updated ON chatbot_conversations;
CREATE TRIGGER chatbot_conversation_updated
  BEFORE UPDATE ON chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_conversation_timestamp();
