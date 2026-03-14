import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { scoreLead, scoreLeadsBatch } from "@/lib/agents/lead-scoring";
import { isOpenAIConfigured } from "@/lib/openai";
import { sendTelegramAlert } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized AI lead score attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI is niet geconfigureerd" }, { status: 503 });
  }

  try {
    const { lead_id, lead_ids } = await request.json();

    // Single lead scoring
    if (lead_id) {
      const { data: lead, error } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("bedrijfsnaam, branche, stad, website, telefoon, email, adres")
        .eq("id", lead_id)
        .single();

      if (error || !lead) {
        return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
      }

      const result = await scoreLead({
        bedrijfsnaam: lead.bedrijfsnaam,
        branche: lead.branche,
        stad: lead.stad,
        website: lead.website,
        telefoon: lead.telefoon,
        email: lead.email,
        adres: lead.adres,
      });

      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          ai_score: result.score,
          ai_score_reasoning: result.reasoning,
          pain_points: result.pain_points,
          personalisatie_notities: result.personalisatie_tip,
        })
        .eq("id", lead_id);

      if (result.score > 70) {
        await sendTelegramAlert(
          `🎯 <b>High-score lead!</b>\n` +
          `${lead.bedrijfsnaam}: ${result.score}/100\n` +
          `${result.reasoning}`
        );
      }

      return NextResponse.json(result);
    }

    // Batch scoring
    if (lead_ids && Array.isArray(lead_ids)) {
      const { data: leads } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, bedrijfsnaam, branche, stad, website, telefoon, email, adres")
        .in("id", lead_ids);

      if (!leads?.length) {
        return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });
      }

      const profiles = leads.map((l) => ({
        bedrijfsnaam: l.bedrijfsnaam,
        branche: l.branche,
        stad: l.stad,
        website: l.website,
        telefoon: l.telefoon,
        email: l.email,
        adres: l.adres,
      }));

      const results = await scoreLeadsBatch(profiles);

      // Update all leads
      for (let i = 0; i < leads.length; i++) {
        const result = results[i];
        await supabaseAdmin
          .from("acquisitie_leads")
          .update({
            ai_score: result.score,
            ai_score_reasoning: result.reasoning,
            pain_points: result.pain_points,
            personalisatie_notities: result.personalisatie_tip,
          })
          .eq("id", leads[i].id);
      }

      return NextResponse.json({
        success: true,
        scored: results.length,
        results: results.map((r, i) => ({
          lead_id: leads[i].id,
          bedrijfsnaam: leads[i].bedrijfsnaam,
          score: r.score,
        })),
      });
    }

    return NextResponse.json({ error: "lead_id of lead_ids is vereist" }, { status: 400 });
  } catch (error) {
    console.error("AI lead score error:", error);
    return NextResponse.json({ error: "Scoring mislukt" }, { status: 500 });
  }
}
