import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";

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
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    // Engagement score bijwerken
    const { data: currentLead } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("engagement_score")
      .eq("id", body.lead_id)
      .single();

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
      engagement_score: Math.max(0, (currentLead?.engagement_score || 0) + engagementDelta),
    };

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
      // Increment emails count
      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("emails_verzonden_count, pipeline_stage")
        .eq("id", body.lead_id)
        .single();

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

    return NextResponse.json({ data: contactmoment }, { status: 201 });
  } catch (error) {
    console.error("Contactmoment error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
