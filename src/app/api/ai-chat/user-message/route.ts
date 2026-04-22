import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession, verifyKlantSession } from "@/lib/session";
import { z } from "zod";
import type { UserType } from "@/types/chatbot";
import { captureRouteError } from "@/lib/sentry-utils";

const bodySchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
  user_type: z.enum(["medewerker", "klant"]),
});

async function getUserId(request: NextRequest, userType: UserType): Promise<string | null> {
  if (userType === "medewerker") {
    const cookie = request.cookies.get("medewerker_session");
    if (!cookie) return null;
    const session = await verifyMedewerkerSession(cookie.value);
    return session?.id || null;
  } else {
    const cookie = request.cookies.get("klant_session");
    if (!cookie) return null;
    const session = await verifyKlantSession(cookie.value);
    return session?.id || null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }

    const { conversation_id, message, user_type } = parsed.data;

    const userId = await getUserId(request, user_type);
    if (!userId) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Verify conversation belongs to user
    const { data: conv } = await supabaseAdmin
      .from("chatbot_conversations")
      .select("id, user_id, status")
      .eq("id", conversation_id)
      .single();

    if (!conv || conv.user_id !== userId) {
      return NextResponse.json({ error: "Gesprek niet gevonden" }, { status: 404 });
    }

    if (conv.status === "closed") {
      return NextResponse.json({ error: "Gesprek is gesloten" }, { status: 400 });
    }

    // Insert message
    await supabaseAdmin.from("chatbot_messages").insert({
      conversation_id,
      sender_type: "user",
      sender_id: userId,
      content: message,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/ai-chat/user-message", action: "POST" });
    // console.error("[AI-CHAT] User message error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
