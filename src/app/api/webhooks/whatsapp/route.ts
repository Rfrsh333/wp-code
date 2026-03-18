import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";
import { createHmac, timingSafeEqual } from "crypto";

const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WA_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WA_APP_SECRET) {
    console.error("[WhatsApp] WHATSAPP_APP_SECRET niet geconfigureerd — webhook geweigerd");
    return false;
  }
  if (!signatureHeader) {
    console.warn("[WhatsApp] Geen X-Hub-Signature-256 header ontvangen");
    return false;
  }
  const expectedSignature = "sha256=" + createHmac("sha256", WA_APP_SECRET).update(rawBody).digest("hex");
  // Timing-safe comparison
  if (expectedSignature.length !== signatureHeader.length) return false;
  const a = Buffer.from(expectedSignature);
  const b = Buffer.from(signatureHeader);
  return timingSafeEqual(a, b);
}

// WhatsApp webhook verificatie (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Inkomende WhatsApp berichten (POST)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-hub-signature-256");

    if (!verifyWhatsAppSignature(rawBody, signatureHeader)) {
      console.warn("[WhatsApp] Ongeldige webhook signature — verworpen");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // WhatsApp Cloud API webhook format
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      // Status updates (delivered, read) — acknowledge
      return NextResponse.json({ received: true });
    }

    for (const message of value.messages) {
      const from = message.from; // Telefoonnummer afzender
      const text = message.text?.body || message.caption || "[media]";
      const timestamp = message.timestamp;
      const contactName = value.contacts?.[0]?.profile?.name || null;

      console.log(`[WhatsApp] Inkomend van ${from}: ${text.slice(0, 100)}`);

      // Zoek lead op basis van telefoonnummer
      // Probeer verschillende formaten: 316..., 06..., +316...
      const phoneVariants = [
        from,
        "0" + from.slice(2),  // 31612345678 → 0612345678
        "+" + from,           // 31612345678 → +31612345678
        "00" + from,          // 31612345678 → 0031612345678
      ];

      let lead = null;
      for (const variant of phoneVariants) {
        const { data } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("id, bedrijfsnaam, telefoon, pipeline_stage, engagement_score")
          .ilike("telefoon", `%${variant.slice(-9)}%`) // Match op laatste 9 cijfers
          .limit(1)
          .single();

        if (data) {
          lead = data;
          break;
        }
      }

      if (!lead) {
        // Onbekend nummer — stuur Telegram alert
        await sendTelegramAlert(
          `📱 <b>WhatsApp van onbekend nummer</b>\n\n` +
          `Van: ${from}${contactName ? ` (${contactName})` : ""}\n` +
          `Bericht: ${text.slice(0, 300)}`
        );
        continue;
      }

      // Log als contactmoment
      await supabaseAdmin.from("acquisitie_contactmomenten").insert({
        lead_id: lead.id,
        type: "whatsapp",
        richting: "inkomend",
        onderwerp: `WhatsApp van ${contactName || from}`,
        inhoud: text,
        resultaat: "positief", // Inkomend bericht = positief signaal
      });

      // Update lead
      const updateData: Record<string, unknown> = {
        laatste_contact_datum: new Date(parseInt(timestamp) * 1000).toISOString(),
        laatste_contact_type: "whatsapp",
        engagement_score: Math.max(0, (lead.engagement_score || 0) + 30),
      };

      // Auto-stage: reactie = interesse
      if (lead.pipeline_stage === "nieuw" || lead.pipeline_stage === "benaderd") {
        updateData.pipeline_stage = "interesse";
      }

      await supabaseAdmin
        .from("acquisitie_leads")
        .update(updateData)
        .eq("id", lead.id);

      // Telegram alert
      await sendTelegramAlert(
        `📱 <b>WhatsApp ontvangen!</b>\n\n` +
        `Bedrijf: ${lead.bedrijfsnaam}\n` +
        `Van: ${contactName || from}\n` +
        `Stage: ${lead.pipeline_stage} → ${updateData.pipeline_stage || lead.pipeline_stage}\n\n` +
        `${text.slice(0, 300)}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WhatsApp] Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
