import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { applyTemplate } from "@/lib/agents/outreach-email";
import { determineNextAction } from "@/lib/agents/smart-sequence";
import { isOpenAIConfigured } from "@/lib/openai";
import { sendEmail } from "@/lib/email-service";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";

// Dagelijkse cron voor drip campagnes + smart sequences
// Configureer via Vercel Cron of externe scheduler: GET /api/cron/acquisitie-drip
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-acquisitie-drip", async () => {

  try {
    const today = new Date().toISOString().split("T")[0];

    // Get all drip campaign leads due today
    const { data: dueLeads } = await supabaseAdmin
      .from("acquisitie_campagne_leads")
      .select("*, acquisitie_leads(*), acquisitie_campagnes(*)")
      .lte("next_send_date", today)
      .neq("status", "replied")
      .not("next_send_date", "is", null);

    if (!dueLeads?.length) {
      return NextResponse.json({ success: true, sent: 0, message: "Geen emails te versturen" });
    }

    let sent = 0;

    for (const cl of dueLeads) {
      const lead = cl.acquisitie_leads;
      const campagne = cl.acquisitie_campagnes;

      if (!lead?.email || !campagne) continue;
      if (campagne.status !== "actief") continue;

      // Skip bounced leads
      if (Array.isArray(lead.tags) && lead.tags.includes("email-bounced")) continue;

      // Get current drip step template
      let onderwerp = campagne.onderwerp_template || "";
      let inhoud = campagne.inhoud_template || "";

      if (campagne.is_drip_campaign && Array.isArray(campagne.drip_sequence)) {
        const step = campagne.drip_sequence[cl.current_drip_step];
        if (step) {
          onderwerp = step.onderwerp || onderwerp;
          inhoud = step.inhoud || inhoud;
        } else {
          // No more steps - mark as completed
          await supabaseAdmin
            .from("acquisitie_campagne_leads")
            .update({ next_send_date: null })
            .eq("id", cl.id);
          continue;
        }
      }

      const variables: Record<string, string> = {
        bedrijfsnaam: lead.bedrijfsnaam || "",
        contactpersoon: lead.contactpersoon || "",
        stad: lead.stad || "",
        branche: lead.branche || "",
      };

      onderwerp = applyTemplate(onderwerp, variables);
      inhoud = applyTemplate(inhoud, variables);

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

        // Update campagne lead
        const nextStep = (cl.current_drip_step || 0) + 1;
        let nextSendDate: string | null = null;

        if (campagne.is_drip_campaign && Array.isArray(campagne.drip_sequence)) {
          const nextStepData = campagne.drip_sequence[nextStep];
          if (nextStepData) {
            const d = new Date();
            d.setDate(d.getDate() + (nextStepData.dag || 3));
            nextSendDate = d.toISOString().split("T")[0];
          }
        }

        await supabaseAdmin
          .from("acquisitie_campagne_leads")
          .update({
            status: "sent",
            emails_sent_count: (cl.emails_sent_count || 0) + 1,
            current_drip_step: nextStep,
            next_send_date: nextSendDate,
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

        // Update campagne stats
        await supabaseAdmin
          .from("acquisitie_campagnes")
          .update({ emails_sent: (campagne.emails_sent || 0) + 1 })
          .eq("id", campagne.id);

        sent++;
      } catch (err) {
        captureRouteError(err, { route: "/api/cron/acquisitie-drip", action: "GET" });
        // console.error(`Drip email naar ${lead.email} mislukt:`, err);
      }
    }

    // === SMART SEQUENCES: Herbereken volgende acties ===
    let sequencesProcessed = 0;
    if (isOpenAIConfigured()) {
      try {
        const now = new Date();
        // Haal leads op met actieve sequences die een update nodig hebben
        const { data: sequenceLeads } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("id, bedrijfsnaam, contactpersoon, branche, stad, email, telefoon, pipeline_stage, ai_score, engagement_score, emails_verzonden_count, laatste_contact_datum, laatste_contact_type, created_at, auto_sequence_paused_until, auto_sequence_history")
          .eq("auto_sequence_active", true)
          .not("pipeline_stage", "in", '("klant","afgewezen")')
          .or(`auto_sequence_next_date.is.null,auto_sequence_next_date.lte.${now.toISOString()}`);

        for (const lead of sequenceLeads || []) {
          // Skip gepauzeerde leads
          if (lead.auto_sequence_paused_until && new Date(lead.auto_sequence_paused_until) > now) {
            continue;
          }

          try {
            // Haal contactmomenten op
            const { data: contactmomenten } = await supabaseAdmin
              .from("acquisitie_contactmomenten")
              .select("type, richting, resultaat, created_at")
              .eq("lead_id", lead.id)
              .order("created_at", { ascending: false })
              .limit(15);

            const result = await determineNextAction({
              ...lead,
              engagement_score: lead.engagement_score || 0,
              contactmomenten: contactmomenten || [],
            });

            const nextDate = new Date();
            if (result.action === "wacht" || result.action === "parkeer") {
              nextDate.setDate(nextDate.getDate() + (result.wacht_dagen || 3));
            } else {
              nextDate.setDate(nextDate.getDate() + (result.prioriteit === "hoog" ? 0 : 1));
            }

            const actionLabel = {
              email: `Email sturen (${result.email_type || "follow-up"})`,
              bel: "Bellen",
              whatsapp: "WhatsApp sturen",
              wacht: `Wachten (${result.wacht_dagen || 3} dagen)`,
              parkeer: `Geparkeerd (${result.wacht_dagen || 30} dagen)`,
            }[result.action];

            const historyEntry = { datum: now.toISOString(), actie: result.action, reden: result.reden };
            const history = [historyEntry, ...(lead.auto_sequence_history || [])].slice(0, 20);

            const updateData: Record<string, unknown> = {
              auto_sequence_next_action: actionLabel,
              auto_sequence_next_date: nextDate.toISOString(),
              auto_sequence_history: history,
            };
            if (result.action === "parkeer") {
              updateData.auto_sequence_paused_until = nextDate.toISOString();
            }

            await supabaseAdmin.from("acquisitie_leads").update(updateData).eq("id", lead.id);
            sequencesProcessed++;
          } catch (err) {
            captureRouteError(err, { route: "/api/cron/acquisitie-drip", action: "GET" });
            // console.error(`Sequence update failed for ${lead.id}:`, err);
          }
        }
      } catch (err) {
        captureRouteError(err, { route: "/api/cron/acquisitie-drip", action: "GET" });
        // console.error("Smart sequences cron error:", err);
      }
    }

    return NextResponse.json({ success: true, sent, total_due: dueLeads.length, sequences_processed: sequencesProcessed });
  } catch (error) {
    captureRouteError(error, { route: "/api/cron/acquisitie-drip", action: "GET" });
    // console.error("Drip cron error:", error);
    return NextResponse.json({ error: "Cron job mislukt" }, { status: 500 });
  }
  });
}
