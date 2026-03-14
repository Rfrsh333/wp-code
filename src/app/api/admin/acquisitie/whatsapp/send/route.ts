import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateWhatsAppMessage, recommendChannel } from "@/lib/agents/whatsapp-message";
import { isOpenAIConfigured } from "@/lib/openai";

// WhatsApp Cloud API configuratie
const WA_API_URL = process.env.WHATSAPP_API_URL; // https://graph.facebook.com/v18.0/{phone_number_id}/messages
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

function isWhatsAppConfigured(): boolean {
  return !!(WA_API_URL && WA_ACCESS_TOKEN);
}

// Format telefoonnummer naar internationaal formaat
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, "");
  // Nederlands nummer: 06... → 316...
  if (cleaned.startsWith("06")) {
    cleaned = "31" + cleaned.slice(1);
  } else if (cleaned.startsWith("+31")) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("0031")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    cleaned = "31" + cleaned.slice(1);
  }
  return cleaned.replace(/^\+/, "");
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized WhatsApp access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { lead_id, action } = body;

    // Genereer WhatsApp bericht via AI
    if (action === "generate") {
      if (!isOpenAIConfigured()) {
        return NextResponse.json({ error: "OpenAI niet geconfigureerd" }, { status: 503 });
      }

      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("bedrijfsnaam, contactpersoon, branche, stad, pain_points, laatste_contact_type")
        .eq("id", lead_id)
        .single();

      if (!lead) {
        return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
      }

      // Haal contactmomenten op voor context
      const { data: contactmomenten } = await supabaseAdmin
        .from("acquisitie_contactmomenten")
        .select("type, richting")
        .eq("lead_id", lead_id)
        .eq("type", "whatsapp");

      const result = await generateWhatsAppMessage({
        type: body.type || "intro",
        bedrijfsnaam: lead.bedrijfsnaam,
        contactpersoon: lead.contactpersoon,
        branche: lead.branche,
        stad: lead.stad,
        pain_points: lead.pain_points || [],
        eerdere_berichten_count: contactmomenten?.filter((c) => c.richting === "uitgaand").length || 0,
        laatste_contact_type: lead.laatste_contact_type,
      });

      return NextResponse.json(result);
    }

    // Verstuur WhatsApp bericht
    if (action === "send") {
      const { bericht } = body;

      if (!lead_id || !bericht) {
        return NextResponse.json({ error: "lead_id en bericht zijn vereist" }, { status: 400 });
      }

      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, bedrijfsnaam, telefoon, pipeline_stage, emails_verzonden_count, engagement_score")
        .eq("id", lead_id)
        .single();

      if (!lead) {
        return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
      }

      if (!lead.telefoon) {
        return NextResponse.json({ error: "Lead heeft geen telefoonnummer" }, { status: 400 });
      }

      let sentViaApi = false;
      let whatsappMessageId: string | null = null;

      // Probeer te versturen via WhatsApp Cloud API als geconfigureerd
      if (isWhatsAppConfigured()) {
        try {
          const phoneNumber = formatPhoneNumber(lead.telefoon);
          const res = await fetch(WA_API_URL!, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phoneNumber,
              type: "text",
              text: { body: bericht },
            }),
          });

          if (res.ok) {
            const result = await res.json();
            whatsappMessageId = result.messages?.[0]?.id || null;
            sentViaApi = true;
          } else {
            const errorData = await res.json();
            console.error("[WhatsApp] API error:", errorData);
            // Val terug op handmatig loggen
          }
        } catch (err) {
          console.error("[WhatsApp] Send error:", err);
        }
      }

      // Log als contactmoment
      await supabaseAdmin.from("acquisitie_contactmomenten").insert({
        lead_id: lead.id,
        type: "whatsapp",
        richting: "uitgaand",
        onderwerp: sentViaApi ? "WhatsApp (automatisch)" : "WhatsApp (handmatig)",
        inhoud: bericht,
        email_id: whatsappMessageId, // Hergebruik email_id veld voor message tracking
      });

      // Update lead
      const updateData: Record<string, unknown> = {
        laatste_contact_datum: new Date().toISOString(),
        laatste_contact_type: "whatsapp",
        engagement_score: Math.max(0, (lead.engagement_score || 0) + 2),
      };
      if (lead.pipeline_stage === "nieuw") {
        updateData.pipeline_stage = "benaderd";
      }

      await supabaseAdmin
        .from("acquisitie_leads")
        .update(updateData)
        .eq("id", lead.id);

      return NextResponse.json({
        success: true,
        sent_via_api: sentViaApi,
        message: sentViaApi
          ? "WhatsApp verstuurd via API"
          : "WhatsApp gelogd — open WhatsApp Web om het bericht te versturen",
        whatsapp_link: !sentViaApi
          ? `https://wa.me/${formatPhoneNumber(lead.telefoon)}?text=${encodeURIComponent(bericht)}`
          : undefined,
      });
    }

    // Smart channel recommendation
    if (action === "recommend_channel") {
      if (!lead_id) {
        return NextResponse.json({ error: "lead_id is vereist" }, { status: 400 });
      }

      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("branche, stad, email, telefoon, pipeline_stage, ai_score, engagement_score")
        .eq("id", lead_id)
        .single();

      if (!lead) {
        return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
      }

      const { data: contactmomenten } = await supabaseAdmin
        .from("acquisitie_contactmomenten")
        .select("type, richting, resultaat")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false })
        .limit(15);

      const recommendation = recommendChannel({
        branche: lead.branche,
        stad: lead.stad,
        heeft_email: !!lead.email,
        heeft_telefoon: !!lead.telefoon,
        pipeline_stage: lead.pipeline_stage,
        eerdere_contacten: contactmomenten || [],
        ai_score: lead.ai_score,
        engagement_score: lead.engagement_score || 0,
      });

      return NextResponse.json(recommendation);
    }

    // Check WhatsApp API status
    if (action === "status") {
      return NextResponse.json({
        api_configured: isWhatsAppConfigured(),
        openai_configured: isOpenAIConfigured(),
      });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("WhatsApp error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
