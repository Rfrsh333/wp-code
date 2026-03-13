import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { determineNextAction } from "@/lib/agents/smart-sequence";
import { isOpenAIConfigured } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized next-action access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { lead_id, action: requestAction } = body;

    // Toggle auto-sequence
    if (requestAction === "toggle_sequence") {
      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("auto_sequence_active")
        .eq("id", lead_id)
        .single();

      if (!lead) {
        return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
      }

      const newState = !lead.auto_sequence_active;
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          auto_sequence_active: newState,
          auto_sequence_paused_until: null,
        })
        .eq("id", lead_id);

      // Als we activeren, bepaal meteen de eerste actie
      if (newState) {
        return await calculateAndSaveNextAction(lead_id);
      }

      return NextResponse.json({ success: true, auto_sequence_active: newState });
    }

    // Parkeer lead (pauzeer sequence)
    if (requestAction === "parkeer") {
      const dagen = body.dagen || 30;
      const pauzeTot = new Date();
      pauzeTot.setDate(pauzeTot.getDate() + dagen);

      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          auto_sequence_paused_until: pauzeTot.toISOString(),
          auto_sequence_next_action: `Geparkeerd tot ${pauzeTot.toLocaleDateString("nl-NL")}`,
          auto_sequence_next_date: pauzeTot.toISOString(),
        })
        .eq("id", lead_id);

      return NextResponse.json({ success: true, paused_until: pauzeTot.toISOString() });
    }

    // Bereken volgende actie (handmatig of via batch)
    if (requestAction === "calculate" || !requestAction) {
      if (!lead_id) {
        return NextResponse.json({ error: "lead_id is vereist" }, { status: 400 });
      }
      return await calculateAndSaveNextAction(lead_id);
    }

    // Batch: bereken voor alle actieve sequences
    if (requestAction === "batch_calculate") {
      const { data: activeLeads } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id")
        .eq("auto_sequence_active", true)
        .not("pipeline_stage", "in", '("klant","afgewezen")');

      if (!activeLeads || activeLeads.length === 0) {
        return NextResponse.json({ success: true, processed: 0 });
      }

      let processed = 0;
      for (const lead of activeLeads) {
        try {
          await calculateAndSaveNextAction(lead.id, false);
          processed++;
        } catch (err) {
          console.error(`Next action failed for ${lead.id}:`, err);
        }
      }

      return NextResponse.json({ success: true, processed });
    }

    // Haal vandaag-te-doen lijst op
    if (requestAction === "get_today") {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const { data: todayLeads, error } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, bedrijfsnaam, contactpersoon, branche, stad, telefoon, email, pipeline_stage, ai_score, engagement_score, auto_sequence_next_action, auto_sequence_next_date, auto_sequence_active")
        .or(`auto_sequence_next_date.lte.${today.toISOString()},volgende_actie_datum.lte.${today.toISOString().split("T")[0]}`)
        .not("pipeline_stage", "in", '("klant","afgewezen")')
        .order("ai_score", { ascending: false, nullsFirst: false });

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }

      // Filter out paused leads
      const filtered = (todayLeads || []).filter((lead) => {
        if (!lead.auto_sequence_active && !lead.auto_sequence_next_date) {
          // Include leads with manual volgende_actie_datum
          return true;
        }
        return true;
      });

      return NextResponse.json({ data: filtered });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Next action error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

async function calculateAndSaveNextAction(leadId: string, returnResponse = true) {
  // Haal lead + contactmomenten op
  const [leadRes, contactRes] = await Promise.all([
    supabaseAdmin.from("acquisitie_leads").select("*").eq("id", leadId).single(),
    supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("type, richting, resultaat, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  if (!leadRes.data) {
    if (returnResponse) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }
    return;
  }

  const lead = leadRes.data;

  // Check of lead gepauzeerd is
  if (lead.auto_sequence_paused_until) {
    const pausedUntil = new Date(lead.auto_sequence_paused_until);
    if (pausedUntil > new Date()) {
      if (returnResponse) {
        return NextResponse.json({
          action: "wacht",
          reden: `Geparkeerd tot ${pausedUntil.toLocaleDateString("nl-NL")}`,
          prioriteit: "laag",
          paused_until: lead.auto_sequence_paused_until,
        });
      }
      return;
    }
    // Pauze is voorbij, reset
    await supabaseAdmin
      .from("acquisitie_leads")
      .update({ auto_sequence_paused_until: null })
      .eq("id", leadId);
  }

  if (!isOpenAIConfigured()) {
    if (returnResponse) {
      return NextResponse.json({ error: "OpenAI niet geconfigureerd" }, { status: 500 });
    }
    return;
  }

  const result = await determineNextAction({
    bedrijfsnaam: lead.bedrijfsnaam,
    contactpersoon: lead.contactpersoon,
    branche: lead.branche,
    stad: lead.stad,
    email: lead.email,
    telefoon: lead.telefoon,
    pipeline_stage: lead.pipeline_stage,
    ai_score: lead.ai_score,
    engagement_score: lead.engagement_score || 0,
    emails_verzonden_count: lead.emails_verzonden_count || 0,
    laatste_contact_datum: lead.laatste_contact_datum,
    laatste_contact_type: lead.laatste_contact_type,
    created_at: lead.created_at,
    contactmomenten: contactRes.data || [],
  });

  // Bereken next date
  const nextDate = new Date();
  if (result.action === "wacht" || result.action === "parkeer") {
    nextDate.setDate(nextDate.getDate() + (result.wacht_dagen || 3));
  } else {
    // Actie is vandaag of morgen
    if (result.prioriteit === "hoog") {
      // Vandaag
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }
  }

  // Sla op
  const actionLabel = {
    email: `Email sturen (${result.email_type || "follow-up"})`,
    bel: "Bellen",
    whatsapp: "WhatsApp sturen",
    wacht: `Wachten (${result.wacht_dagen || 3} dagen)`,
    parkeer: `Geparkeerd (${result.wacht_dagen || 30} dagen)`,
  }[result.action];

  const historyEntry = {
    datum: new Date().toISOString(),
    actie: result.action,
    reden: result.reden,
  };

  const existingHistory = lead.auto_sequence_history || [];
  const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);

  const updateData: Record<string, unknown> = {
    auto_sequence_next_action: actionLabel,
    auto_sequence_next_date: nextDate.toISOString(),
    auto_sequence_history: updatedHistory,
  };

  if (result.action === "parkeer") {
    updateData.auto_sequence_paused_until = nextDate.toISOString();
  }

  await supabaseAdmin
    .from("acquisitie_leads")
    .update(updateData)
    .eq("id", leadId);

  if (returnResponse) {
    return NextResponse.json({ ...result, next_date: nextDate.toISOString() });
  }
}
