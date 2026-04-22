import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, hasRequiredAdminRole } from "@/lib/admin-auth";
import { checkRedisRateLimit, getClientIP, aiRateLimit } from "@/lib/rate-limit-redis";
import { supabaseAdmin } from "@/lib/supabase";
import { generateLeadResponse } from "@/lib/agents/lead-followup";
import { isOpenAIConfigured } from "@/lib/openai";
import { sendEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized AI lead response attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`ai-admin:${clientIP}`, aiRateLimit);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI is niet geconfigureerd" }, { status: 503 });
  }

  try {
    const { aanvraag_id, email_content, action } = await request.json();

    if (!aanvraag_id) {
      return NextResponse.json({ error: "aanvraag_id is vereist" }, { status: 400 });
    }

    // Haal aanvraag op
    const { data: aanvraag, error: dbError } = await supabaseAdmin
      .from("personeel_aanvragen")
      .select("bedrijfsnaam, contactpersoon, email, type_personeel, aantal_personen, start_datum, eind_datum, werkdagen, werktijden, locatie, opmerkingen")
      .eq("id", aanvraag_id)
      .single();

    if (dbError || !aanvraag) {
      return NextResponse.json({ error: "Aanvraag niet gevonden" }, { status: 404 });
    }

    // Action: generate - Genereer AI reactie
    if (!action || action === "generate") {
      const draft = await generateLeadResponse({
        bedrijfsnaam: aanvraag.bedrijfsnaam,
        contactpersoon: aanvraag.contactpersoon,
        email: aanvraag.email,
        type_personeel: aanvraag.type_personeel || [],
        aantal_personen: aanvraag.aantal_personen,
        start_datum: aanvraag.start_datum,
        eind_datum: aanvraag.eind_datum,
        werkdagen: aanvraag.werkdagen || [],
        werktijden: aanvraag.werktijden,
        locatie: aanvraag.locatie,
        opmerkingen: aanvraag.opmerkingen,
      });

      // Sla draft op
      await supabaseAdmin
        .from("personeel_aanvragen")
        .update({ ai_response_draft: draft })
        .eq("id", aanvraag_id);

      return NextResponse.json({ draft });
    }

    // Action: send - Verstuur goedgekeurde email
    if (action === "send" && email_content) {
      const { error: emailError } = await sendEmail({
        from: "TopTalent Jobs <info@toptalentjobs.nl>",
        to: [aanvraag.email],
        subject: `Re: Personeel aanvraag - ${aanvraag.bedrijfsnaam}`,
        html: email_content.replace(/\n/g, "<br>"),
        type: "marketing",
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        return NextResponse.json({ error: "Email versturen mislukt" }, { status: 500 });
      }

      // Update aanvraag status
      await supabaseAdmin
        .from("personeel_aanvragen")
        .update({
          ai_response_sent: true,
          ai_response_sent_at: new Date().toISOString(),
          status: "in_behandeling",
        })
        .eq("id", aanvraag_id);

      return NextResponse.json({ success: true, message: "Email verstuurd" });
    }

    return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
  } catch (error) {
    console.error("AI lead response error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
