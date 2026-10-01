import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession, getMedewerkerSession } from "@/lib/portal-auth";
import { verifyAdmin } from "@/lib/admin-auth";
import type { UserType } from "@/types/chatbot";

// Via portal-auth: ook Bearer-tokens (app), accountstatus en ingetrokken sessies.
async function getUserId(request: NextRequest, userType: UserType): Promise<string | null> {
  const session = userType === "medewerker" ? await getMedewerkerSession(request) : await getKlantSession(request);
  return session?.id || null;
}

// GET: Fetch conversation messages (for user or admin)
export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("id");
  const userType = request.nextUrl.searchParams.get("user_type") as UserType | null;

  if (!conversationId) {
    return NextResponse.json({ error: "Conversation ID is verplicht" }, { status: 400 });
  }

  // Check if admin
  const { isAdmin } = await verifyAdmin(request);

  if (!isAdmin) {
    // User access - verify ownership
    if (!userType) {
      return NextResponse.json({ error: "user_type is verplicht" }, { status: 400 });
    }
    const userId = await getUserId(request, userType);
    if (!userId) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { data: conv } = await supabaseAdmin
      .from("chatbot_conversations")
      .select("id, user_id")
      .eq("id", conversationId)
      .single();

    if (!conv || conv.user_id !== userId) {
      return NextResponse.json({ error: "Gesprek niet gevonden" }, { status: 404 });
    }
  }

  // Fetch messages
  const { data: messages, error } = await supabaseAdmin
    .from("chatbot_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Berichten ophalen mislukt" }, { status: 500 });
  }

  // Also fetch conversation metadata
  const { data: conversation } = await supabaseAdmin
    .from("chatbot_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  return NextResponse.json({ messages: messages || [], conversation });
}

// POST: Admin actions on conversations
export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action, conversation_id, message } = body;

  if (!conversation_id) {
    return NextResponse.json({ error: "conversation_id is verplicht" }, { status: 400 });
  }

  if (action === "accept") {
    // Admin accepts the conversation
    await supabaseAdmin
      .from("chatbot_conversations")
      .update({
        status: "live_agent",
        assigned_admin_email: email,
      })
      .eq("id", conversation_id);

    await supabaseAdmin.from("chatbot_messages").insert({
      conversation_id,
      sender_type: "system",
      content: "Een medewerker van TopTalent heeft het gesprek overgenomen.",
    });

    return NextResponse.json({ success: true });
  }

  if (action === "send_message") {
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Bericht is verplicht" }, { status: 400 });
    }

    await supabaseAdmin.from("chatbot_messages").insert({
      conversation_id,
      sender_type: "admin",
      content: message,
    });

    // Update conversation timestamp
    await supabaseAdmin
      .from("chatbot_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return NextResponse.json({ success: true });
  }

  if (action === "send_user_message") {
    // This is for users sending messages in live_agent/waiting mode
    // We don't need admin auth for this - verify user session instead
    return NextResponse.json({ error: "Gebruik /api/ai-chat/user-message" }, { status: 400 });
  }

  if (action === "close") {
    await supabaseAdmin
      .from("chatbot_conversations")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", conversation_id);

    await supabaseAdmin.from("chatbot_messages").insert({
      conversation_id,
      sender_type: "system",
      content: "Dit gesprek is gesloten. Bedankt voor het contact met TopTalent!",
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
