import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession, verifyKlantSession } from "@/lib/session";
import type { UserType } from "@/types/chatbot";
import { captureRouteError } from "@/lib/sentry-utils";

interface SessionUser {
  id: string;
  naam: string;
  email: string;
}

async function getSessionUser(request: NextRequest, userType: UserType): Promise<SessionUser | null> {
  if (userType === "medewerker") {
    const cookie = request.cookies.get("medewerker_session");
    if (!cookie) return null;
    const session = await verifyMedewerkerSession(cookie.value);
    if (!session) return null;
    return { id: session.id, naam: session.naam, email: session.email };
  } else {
    const cookie = request.cookies.get("klant_session");
    if (!cookie) return null;
    const session = await verifyKlantSession(cookie.value);
    if (!session) return null;
    return { id: session.id, naam: session.contactpersoon || session.bedrijfsnaam, email: session.email };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get("user_type") as UserType | null;

    if (!userType || (userType !== "medewerker" && userType !== "klant")) {
      return NextResponse.json({ error: "user_type is verplicht" }, { status: 400 });
    }

    const user = await getSessionUser(request, userType);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Find most recent non-closed conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("chatbot_conversations")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) {
      captureRouteError(convError, { route: "/api/ai-chat/active", action: "GET" });
      // console.error("[AI-CHAT-ACTIVE] Conversation query error:", convError);
      return NextResponse.json({ error: "Fout bij ophalen gesprek" }, { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    // Fetch messages for this conversation
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("chatbot_messages")
      .select("id, sender_type, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (msgError) {
      captureRouteError(msgError, { route: "/api/ai-chat/active", action: "GET" });
      // console.error("[AI-CHAT-ACTIVE] Messages query error:", msgError);
      return NextResponse.json({ error: "Fout bij ophalen berichten" }, { status: 500 });
    }

    return NextResponse.json({
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/ai-chat/active", action: "GET" });
    // console.error("[AI-CHAT-ACTIVE] Error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
