import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { applyTemplate } from "@/lib/agents/outreach-email";
import { sendEmail } from "@/lib/email-service";
import { campagnesPostSchema, validateAdminBody } from "@/lib/validations-admin";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized campagnes access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("acquisitie_campagnes")
    .select("id, naam, status, type, onderwerp_template, inhoud_template, is_drip_campaign, drip_sequence, emails_sent, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized campagne mutation by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = validateAdminBody(campagnesPostSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { action, id, ...campagneData } = body;

    // Update campagne
    if (action === "update" && id) {
      const { error } = await supabaseAdmin
        .from("acquisitie_campagnes")
        .update(campagneData)
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Delete campagne
    if (action === "delete" && id) {
      const { error } = await supabaseAdmin
        .from("acquisitie_campagnes")
        .delete()
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Send campagne
    if (action === "send" && id) {
      return await sendCampagne(id);
    }

    // Add leads to campagne
    if (action === "add_leads" && id && body.lead_ids) {
      const inserts = body.lead_ids.map((leadId: string) => ({
        campagne_id: id,
        lead_id: leadId,
        status: "queued",
        next_send_date: new Date().toISOString().split("T")[0],
      }));

      const { error } = await supabaseAdmin
        .from("acquisitie_campagne_leads")
        .upsert(inserts, { onConflict: "campagne_id,lead_id" });

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ success: true, added: inserts.length });
    }

    // Get campagne leads
    if (action === "get_leads" && id) {
      const { data, error } = await supabaseAdmin
        .from("acquisitie_campagne_leads")
        .select("*, acquisitie_leads(*)")
        .eq("campagne_id", id)
        .limit(500);

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    // Create new campagne
    if (!campagneData.naam) {
      return NextResponse.json({ error: "Naam is vereist" }, { status: 400 });
    }

    const { data: newCampagne, error } = await supabaseAdmin
      .from("acquisitie_campagnes")
      .insert(campagneData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    return NextResponse.json({ data: newCampagne }, { status: 201 });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/acquisitie/campagnes", action: "POST" });
    // console.error("Campagne error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

async function sendCampagne(campagneId: string) {
  const { data: campagne } = await supabaseAdmin
    .from("acquisitie_campagnes")
    .select("*")
    .eq("id", campagneId)
    .single();

  if (!campagne) {
    return NextResponse.json({ error: "Campagne niet gevonden" }, { status: 404 });
  }

  // Get queued leads — exclude bounced leads
  const { data: queuedLeads } = await supabaseAdmin
    .from("acquisitie_campagne_leads")
    .select("*, acquisitie_leads(*)")
    .eq("campagne_id", campagneId)
    .eq("status", "queued")
    .limit(500);

  if (!queuedLeads?.length) {
    return NextResponse.json({ error: "Geen leads in de wachtrij" }, { status: 400 });
  }

  let sent = 0;

  for (const cl of queuedLeads) {
    const lead = cl.acquisitie_leads;
    if (!lead?.email) continue;

    // Skip leads with bounced tag
    if (Array.isArray(lead.tags) && lead.tags.includes("email-bounced")) continue;

    const variables: Record<string, string> = {
      bedrijfsnaam: lead.bedrijfsnaam || "",
      contactpersoon: lead.contactpersoon || "",
      stad: lead.stad || "",
      branche: lead.branche || "",
    };

    const onderwerp = applyTemplate(campagne.onderwerp_template || "", variables);
    const inhoud = applyTemplate(campagne.inhoud_template || "", variables);

    try {
      const { data: emailResult } = await sendEmail({
        from: "TopTalent Jobs <info@toptalentjobs.nl>",
        to: [lead.email],
        subject: onderwerp,
        html: inhoud.replace(/\n/g, "<br>"),
        type: "marketing",
        checkSuppression: true,
      });

      // Log contactmoment
      await supabaseAdmin.from("acquisitie_contactmomenten").insert({
        lead_id: lead.id,
        type: "email",
        richting: "uitgaand",
        onderwerp,
        inhoud,
        email_id: emailResult?.id || null,
      });

      // Update campagne lead status
      await supabaseAdmin
        .from("acquisitie_campagne_leads")
        .update({
          status: "sent",
          emails_sent_count: (cl.emails_sent_count || 0) + 1,
          current_drip_step: (cl.current_drip_step || 0) + 1,
          next_send_date: campagne.is_drip_campaign
            ? getNextDripDate(campagne.drip_sequence, (cl.current_drip_step || 0) + 1)
            : null,
        })
        .eq("id", cl.id);

      // Update lead stats
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          emails_verzonden_count: (lead.emails_verzonden_count || 0) + 1,
          laatste_email_verzonden_op: new Date().toISOString(),
          laatste_contact_datum: new Date().toISOString(),
          laatste_contact_type: "email",
          pipeline_stage: lead.pipeline_stage === "nieuw" ? "benaderd" : lead.pipeline_stage,
        })
        .eq("id", lead.id);

      sent++;
    } catch (err) {
      captureRouteError(err, { route: "/api/admin/acquisitie/campagnes", action: "POST" });
      // console.error(`Email naar ${lead.email} mislukt:`, err);
    }
  }

  // Update campagne stats
  await supabaseAdmin
    .from("acquisitie_campagnes")
    .update({
      emails_sent: (campagne.emails_sent || 0) + sent,
      status: "actief",
    })
    .eq("id", campagneId);

  return NextResponse.json({ success: true, sent });
}

function getNextDripDate(
  sequence: Array<{ dag: number }> | null,
  currentStep: number
): string | null {
  if (!sequence || !Array.isArray(sequence)) return null;
  const nextStep = sequence[currentStep];
  if (!nextStep) return null;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + (nextStep.dag || 3));
  return nextDate.toISOString().split("T")[0];
}
