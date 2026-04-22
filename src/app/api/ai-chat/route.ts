import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession, verifyKlantSession } from "@/lib/session";
import { chatCompletionStream, isOpenAIConfigured } from "@/lib/openai";
import { buildMessages } from "@/lib/ai-chat/context-builder";
import { apiRateLimit, checkRedisRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { z } from "zod";
import type { UserType, ChatbotMessage } from "@/types/chatbot";
import { captureRouteError } from "@/lib/sentry-utils";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  conversation_id: z.string().uuid().nullish(),
  user_type: z.enum(["medewerker", "klant"]),
});

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

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = await checkRedisRateLimit(`ai-chat:${ip}`, apiRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het over een minuut opnieuw." },
        { status: 429 }
      );
    }

    // Check OpenAI configuration
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: "AI chat is momenteel niet beschikbaar." },
        { status: 503 }
      );
    }

    // Parse & validate body
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ongeldig verzoek", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, conversation_id, user_type } = parsed.data;

    // Verify session
    const user = await getSessionUser(request, user_type);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error } = await supabaseAdmin
        .from("chatbot_conversations")
        .insert({
          user_type,
          user_id: user.id,
          user_naam: user.naam,
          user_email: user.email,
          status: "ai",
        })
        .select("id")
        .single();

      if (error || !conv) {
        captureRouteError(error, { route: "/api/ai-chat", action: "POST" });
        // console.error("[AI-CHAT] Create conversation error:", error);
        return NextResponse.json({ error: "Gesprek aanmaken mislukt" }, { status: 500 });
      }
      convId = conv.id;
    } else {
      // Verify conversation belongs to user and is still in AI mode
      const { data: conv } = await supabaseAdmin
        .from("chatbot_conversations")
        .select("id, status, user_id")
        .eq("id", convId)
        .single();

      if (!conv || conv.user_id !== user.id) {
        return NextResponse.json({ error: "Gesprek niet gevonden" }, { status: 404 });
      }

      if (conv.status !== "ai") {
        return NextResponse.json({ error: "Dit gesprek wordt niet meer door AI afgehandeld" }, { status: 400 });
      }
    }

    // Save user message
    await supabaseAdmin.from("chatbot_messages").insert({
      conversation_id: convId,
      sender_type: "user",
      sender_id: user.id,
      content: message,
    });

    // Get conversation history
    const { data: history } = await supabaseAdmin
      .from("chatbot_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(30);

    // Build messages for OpenAI
    const messages = buildMessages(user_type, (history || []) as ChatbotMessage[], message);

    // Stream response
    const stream = await chatCompletionStream(messages, {
      model: "gpt-4o-mini",
      temperature: 0.6,
      maxTokens: 500,
    });

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation_id first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "conv_id", conversation_id: convId })}\n\n`)
          );

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`)
              );
            }
          }

          // Save complete AI response to database
          if (fullResponse) {
            await supabaseAdmin.from("chatbot_messages").insert({
              conversation_id: convId,
              sender_type: "ai",
              content: fullResponse,
            });
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (err) {
          captureRouteError(err, { route: "/api/ai-chat", action: "POST" });
          // console.error("[AI-CHAT] Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", content: "Er ging iets mis met het genereren van een antwoord." })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/ai-chat", action: "POST" });
    // console.error("[AI-CHAT] Error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
