import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateOutreachEmail } from "@/lib/agents/outreach-email";
import { isOpenAIConfigured } from "@/lib/openai";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized outreach email attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI is niet geconfigureerd" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { lead_id, type, action, email_content, onderwerp } = body;

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id is vereist" }, { status: 400 });
    }

    const { data: lead, error: dbError } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (dbError || !lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    // Generate email
    if (!action || action === "generate") {
      const result = await generateOutreachEmail({
        type: type || "cold_intro",
        bedrijfsnaam: lead.bedrijfsnaam,
        contactpersoon: lead.contactpersoon,
        branche: lead.branche,
        stad: lead.stad,
        pain_points: lead.pain_points || [],
        personalisatie_notities: lead.personalisatie_notities,
        eerdere_emails_count: lead.emails_verzonden_count || 0,
        laatste_contact_type: lead.laatste_contact_type,
      });

      return NextResponse.json(result);
    }

    // Send email
    if (action === "send") {
      if (!lead.email) {
        return NextResponse.json({ error: "Lead heeft geen email adres" }, { status: 400 });
      }

      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: "Email service niet geconfigureerd" }, { status: 503 });
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: "TopTalent Jobs <info@toptalentjobs.nl>",
        to: [lead.email],
        subject: onderwerp || `TopTalent Jobs - Horeca personeel voor ${lead.bedrijfsnaam}`,
        html: (email_content || "").replace(/\n/g, "<br>"),
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        return NextResponse.json({ error: "Email versturen mislukt" }, { status: 500 });
      }

      // Log contactmoment
      await supabaseAdmin.from("acquisitie_contactmomenten").insert({
        lead_id: lead.id,
        type: "email",
        richting: "uitgaand",
        onderwerp: onderwerp || `Outreach email`,
        inhoud: email_content,
        email_id: emailResult?.id || null,
      });

      // Update lead
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

      return NextResponse.json({ success: true, message: "Email verstuurd" });
    }

    return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
  } catch (error) {
    console.error("Outreach email error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
