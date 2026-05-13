import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";
import { captureRouteError } from "@/lib/sentry-utils";
import { determineFollowUpPlan } from "@/lib/acquisitie/follow-up";

const ALLOWED_TYPES = ["email", "telefoon", "whatsapp", "bezoek", "instagram_dm", "linkedin_dm", "facebook_dm", "meeting"] as const;
const ALLOWED_RICHTINGEN = ["uitgaand", "inkomend"] as const;
const ALLOWED_RESULTATEN = ["positief", "neutraal", "negatief", "geen_antwoord", "voicemail"] as const;

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized contactmomenten access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  if (!leadId) {
    return NextResponse.json({ error: "lead_id is vereist" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("acquisitie_contactmomenten")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized contactmoment create by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!body.lead_id || !body.type || !body.richting) {
      return NextResponse.json(
        { error: "lead_id, type en richting zijn vereist" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Ongeldig contacttype" }, { status: 400 });
    }

    if (!ALLOWED_RICHTINGEN.includes(body.richting)) {
      return NextResponse.json({ error: "Ongeldige richting" }, { status: 400 });
    }

    if (body.resultaat && !ALLOWED_RESULTATEN.includes(body.resultaat)) {
      return NextResponse.json({ error: "Ongeldig resultaat" }, { status: 400 });
    }

    const { data: lead } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, telefoon, email, instagram_handle, linkedin_url, facebook_url, pipeline_stage, engagement_score, emails_verzonden_count")
      .eq("id", body.lead_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const followUp = determineFollowUpPlan({
      type: body.type,
      richting: body.richting,
      resultaat: body.resultaat || null,
      lead,
    });

    // Insert contactmoment
    const { data: contactmoment, error } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .insert({
        lead_id: body.lead_id,
        type: body.type,
        richting: body.richting,
        onderwerp: body.onderwerp || null,
        inhoud: body.inhoud || null,
        resultaat: body.resultaat || null,
        email_id: body.email_id || null,
        externe_message_id: body.externe_message_id || null,
        metadata: body.metadata || {},
        follow_up_due_at: followUp?.nextDate || null,
        follow_up_reason: followUp?.reason || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    // Engagement score bijwerken
    const engagementDelta =
      body.resultaat === "positief" ? 40 :
      body.resultaat === "neutraal" ? 10 :
      body.resultaat === "negatief" ? -5 :
      body.resultaat === "geen_antwoord" ? -3 :
      body.type === "telefoon" && body.richting === "inkomend" ? 20 :
      body.type === "bezoek" ? 25 :
      0;

    // Update lead met laatste contact info
    const updateData: Record<string, unknown> = {
      laatste_contact_datum: new Date().toISOString(),
      laatste_contact_type: body.type,
      engagement_score: Math.max(0, (lead.engagement_score || 0) + engagementDelta),
    };

    if (body.richting === "uitgaand") {
      updateData.laatste_uitgaande_contact_datum = new Date().toISOString();
    }
    if (body.richting === "inkomend") {
      updateData.laatste_inkomende_contact_datum = new Date().toISOString();
    }

    if (followUp) {
      updateData.auto_sequence_next_action = followUp.nextAction;
      updateData.auto_sequence_next_date = followUp.nextDate;
      updateData.volgende_actie_datum = followUp.nextDate.split("T")[0];
      updateData.volgende_actie_notitie = followUp.reason;
    }

    // Auto-stage progressie
    if (body.resultaat === "positief" && body.richting === "inkomend") {
      // Positieve reply → interesse
      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("pipeline_stage, bedrijfsnaam")
        .eq("id", body.lead_id)
        .single();

      if (lead && (lead.pipeline_stage === "nieuw" || lead.pipeline_stage === "benaderd")) {
        updateData.pipeline_stage = "interesse";

        await sendTelegramAlert(
          `💬 <b>Positieve reactie!</b>\n\n` +
          `Positieve reactie ontvangen — pipeline update`
        );
      }
    }

    if (body.type === "email" && body.richting === "uitgaand") {
      if (lead) {
        updateData.emails_verzonden_count = (lead.emails_verzonden_count || 0) + 1;
        updateData.laatste_email_verzonden_op = new Date().toISOString();
        if (lead.pipeline_stage === "nieuw") {
          updateData.pipeline_stage = "benaderd";
        }
      }
    }

    await supabaseAdmin
      .from("acquisitie_leads")
      .update(updateData)
      .eq("id", body.lead_id);

    if (followUp) {
      await sendTelegramAlert(
        `🗓️ <b>Follow-up ingepland</b>\n\n` +
        `Bedrijf: ${lead.bedrijfsnaam}\n` +
        `Kanaal: ${body.type}\n` +
        `Volgende stap: ${followUp.nextAction}\n` +
        `Wanneer: ${new Date(followUp.nextDate).toLocaleDateString("nl-NL")}\n\n` +
        `${followUp.reason}`
      );
    }

    return NextResponse.json({ data: contactmoment }, { status: 201 });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/acquisitie/contactmomenten", action: "POST" });
    // console.error("Contactmoment error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
