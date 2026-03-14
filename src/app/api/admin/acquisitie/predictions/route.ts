import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { predictLead, forecastPipeline, predictBatch } from "@/lib/agents/predictive-ai";

function enrichLeadData(lead: Record<string, unknown>, contactStats: { count: number; positief: number }) {
  const now = new Date();
  const created = new Date(lead.created_at as string);
  const lastContact = lead.laatste_contact_datum ? new Date(lead.laatste_contact_datum as string) : null;

  return {
    id: lead.id as string,
    bedrijfsnaam: lead.bedrijfsnaam as string,
    branche: lead.branche as string | null,
    stad: lead.stad as string | null,
    pipeline_stage: lead.pipeline_stage as string,
    ai_score: lead.ai_score as number | null,
    engagement_score: lead.engagement_score as number | null,
    emails_verzonden_count: (lead.emails_verzonden_count as number) || 0,
    laatste_contact_datum: lead.laatste_contact_datum as string | null,
    laatste_contact_type: lead.laatste_contact_type as string | null,
    created_at: lead.created_at as string,
    tags: lead.tags as string[] | null,
    enrichment_data: lead.enrichment_data as { grootte_indicatie?: string; heeft_vacatures?: boolean } | null,
    contactmomenten_count: contactStats.count,
    positieve_contacten: contactStats.positief,
    dagen_in_pipeline: Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)),
    dagen_sinds_contact: lastContact
      ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  };
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized predictions access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  // Enkele lead prediction
  if (view === "lead") {
    const leadId = searchParams.get("lead_id");
    if (!leadId) return NextResponse.json({ error: "lead_id vereist" }, { status: 400 });

    const { data: lead } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, branche, stad, pipeline_stage, ai_score, engagement_score, emails_verzonden_count, laatste_contact_datum, laatste_contact_type, created_at, tags, enrichment_data")
      .eq("id", leadId)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });

    // Contact stats
    const { count: totalContacts } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);

    const { count: positiefContacts } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId)
      .eq("resultaat", "positief");

    const leadData = enrichLeadData(lead, {
      count: totalContacts || 0,
      positief: positiefContacts || 0,
    });

    const prediction = await predictLead(leadData);

    // Sla op in DB
    await supabaseAdmin
      .from("acquisitie_leads")
      .update({
        predicted_conversion_pct: prediction.conversion_pct,
        predicted_deal_value: prediction.deal_value,
        predicted_close_date: new Date(Date.now() + prediction.close_days * 86400000).toISOString().split("T")[0],
        churn_risk: prediction.churn_risk,
        predicted_best_channel: prediction.best_channel,
        predicted_best_time: prediction.best_time,
        prediction_updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Log prediction
    await supabaseAdmin
      .from("acquisitie_prediction_log")
      .insert({
        lead_id: leadId,
        predicted_conversion_pct: prediction.conversion_pct,
        predicted_deal_value: prediction.deal_value,
        churn_risk: prediction.churn_risk,
      });

    return NextResponse.json({ data: prediction });
  }

  // Pipeline forecast
  if (view === "forecast") {
    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, branche, stad, pipeline_stage, ai_score, engagement_score, emails_verzonden_count, laatste_contact_datum, laatste_contact_type, created_at, tags, enrichment_data")
      .not("pipeline_stage", "in", '("klant","afgewezen")');

    if (!leads?.length) {
      return NextResponse.json({
        data: {
          verwachte_omzet_30d: 0, verwachte_omzet_90d: 0, verwachte_conversies_30d: 0,
          pipeline_gezondheid: "slecht", bottlenecks: ["Geen actieve leads"], kansen: [],
          per_stage: [],
        }
      });
    }

    // Bulk contact stats
    const leadIds = leads.map((l) => l.id);
    const { data: contactStats } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("lead_id, resultaat")
      .in("lead_id", leadIds);

    const statsMap: Record<string, { count: number; positief: number }> = {};
    for (const c of contactStats || []) {
      if (!statsMap[c.lead_id]) statsMap[c.lead_id] = { count: 0, positief: 0 };
      statsMap[c.lead_id].count++;
      if (c.resultaat === "positief") statsMap[c.lead_id].positief++;
    }

    const enrichedLeads = leads.map((l) => enrichLeadData(l, statsMap[l.id] || { count: 0, positief: 0 }));
    const forecast = await forecastPipeline(enrichedLeads);

    return NextResponse.json({ data: forecast });
  }

  // Batch predict (top leads gesorteerd op conversie kans)
  if (view === "top_leads") {
    const limit = parseInt(searchParams.get("limit") || "20");

    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, branche, stad, pipeline_stage, ai_score, engagement_score, emails_verzonden_count, laatste_contact_datum, laatste_contact_type, created_at, tags, enrichment_data")
      .not("pipeline_stage", "in", '("klant","afgewezen")')
      .order("ai_score", { ascending: false, nullsFirst: false });

    if (!leads?.length) return NextResponse.json({ data: [] });

    const leadIds = leads.map((l) => l.id);
    const { data: contactStats } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("lead_id, resultaat")
      .in("lead_id", leadIds);

    const statsMap: Record<string, { count: number; positief: number }> = {};
    for (const c of contactStats || []) {
      if (!statsMap[c.lead_id]) statsMap[c.lead_id] = { count: 0, positief: 0 };
      statsMap[c.lead_id].count++;
      if (c.resultaat === "positief") statsMap[c.lead_id].positief++;
    }

    const enrichedLeads = leads.map((l) => enrichLeadData(l, statsMap[l.id] || { count: 0, positief: 0 }));
    const predictions = await predictBatch(enrichedLeads);

    // Combineer en sorteer op conversie kans
    const results = enrichedLeads.map((l) => ({
      id: l.id,
      bedrijfsnaam: l.bedrijfsnaam,
      branche: l.branche,
      stad: l.stad,
      pipeline_stage: l.pipeline_stage,
      ai_score: l.ai_score,
      engagement_score: l.engagement_score,
      ...predictions.get(l.id)!,
    }))
    .sort((a, b) => b.conversion_pct - a.conversion_pct)
    .slice(0, limit);

    // Batch update predictions
    for (const r of results) {
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          predicted_conversion_pct: r.conversion_pct,
          predicted_deal_value: r.deal_value,
          churn_risk: r.churn_risk,
          prediction_updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);
    }

    return NextResponse.json({ data: results });
  }

  // Churn alerts
  if (view === "churn_alerts") {
    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, branche, stad, pipeline_stage, ai_score, engagement_score, emails_verzonden_count, laatste_contact_datum, laatste_contact_type, created_at, tags, enrichment_data, predicted_conversion_pct, churn_risk")
      .not("pipeline_stage", "in", '("klant","afgewezen")')
      .in("churn_risk", ["hoog", "kritiek"])
      .order("prediction_updated_at", { ascending: false, nullsFirst: false })
      .limit(20);

    return NextResponse.json({ data: leads || [] });
  }

  // Prediction history voor een lead
  if (view === "history") {
    const leadId = searchParams.get("lead_id");
    if (!leadId) return NextResponse.json({ error: "lead_id vereist" }, { status: 400 });

    const { data } = await supabaseAdmin
      .from("acquisitie_prediction_log")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ data: data || [] });
  }

  return NextResponse.json({ error: "Onbekende view" }, { status: 400 });
}
