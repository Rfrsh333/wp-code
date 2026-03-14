import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { enrichLead, type EnrichmentData } from "@/lib/agents/lead-research";
import { isOpenAIConfigured } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized lead-research access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI niet geconfigureerd" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { lead_id, action } = body;

    // Enrich single lead
    if (!action || action === "enrich") {
      if (!lead_id) {
        return NextResponse.json({ error: "lead_id is vereist" }, { status: 400 });
      }

      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("bedrijfsnaam, website, branche, stad, adres, telefoon, email, tags")
        .eq("id", lead_id)
        .single();

      if (!lead) {
        return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
      }

      const enrichment = await enrichLead({
        bedrijfsnaam: lead.bedrijfsnaam,
        website: lead.website,
        branche: lead.branche,
        stad: lead.stad,
        adres: lead.adres,
        telefoon: lead.telefoon,
        email: lead.email,
      });

      // Sla enrichment data op
      const updateData: Record<string, unknown> = {
        enrichment_data: enrichment,
      };

      // Update ook pain_points en personalisatie als die beter zijn
      if (enrichment.pain_points.length > 0) {
        updateData.pain_points = enrichment.pain_points;
      }
      if (enrichment.personalisatie_notities) {
        updateData.personalisatie_notities = enrichment.personalisatie_notities;
      }
      if (enrichment.tags.length > 0) {
        // Merge met bestaande tags
        const existingTags = lead.tags || [];
        const allTags = [...new Set([...existingTags, ...enrichment.tags])];
        updateData.tags = allTags;
      }
      // Update branche als die verfijnder is
      if (enrichment.branche_verfijnd && enrichment.branche_verfijnd !== "horeca") {
        updateData.branche = enrichment.branche_verfijnd;
      }

      await supabaseAdmin
        .from("acquisitie_leads")
        .update(updateData)
        .eq("id", lead_id);

      return NextResponse.json({ data: enrichment });
    }

    // Batch enrich: verrijk alle leads met website die nog niet verrijkt zijn
    if (action === "batch") {
      const limit = body.limit || 10;

      const { data: leads } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, bedrijfsnaam, website, branche, stad, adres, telefoon, email")
        .is("enrichment_data", null)
        .not("website", "is", null)
        .order("ai_score", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (!leads || leads.length === 0) {
        return NextResponse.json({ success: true, processed: 0, message: "Geen leads om te verrijken" });
      }

      let processed = 0;
      const errors: string[] = [];

      for (const lead of leads) {
        try {
          const enrichment = await enrichLead({
            bedrijfsnaam: lead.bedrijfsnaam,
            website: lead.website,
            branche: lead.branche,
            stad: lead.stad,
            adres: lead.adres,
            telefoon: lead.telefoon,
            email: lead.email,
          });

          const updateData: Record<string, unknown> = {
            enrichment_data: enrichment,
          };
          if (enrichment.pain_points.length > 0) {
            updateData.pain_points = enrichment.pain_points;
          }
          if (enrichment.personalisatie_notities) {
            updateData.personalisatie_notities = enrichment.personalisatie_notities;
          }
          if (enrichment.tags.length > 0) {
            const existingTags = (lead as Record<string, unknown>).tags as string[] || [];
            updateData.tags = [...new Set([...existingTags, ...enrichment.tags])];
          }
          if (enrichment.branche_verfijnd && enrichment.branche_verfijnd !== "horeca") {
            updateData.branche = enrichment.branche_verfijnd;
          }

          await supabaseAdmin
            .from("acquisitie_leads")
            .update(updateData)
            .eq("id", lead.id);

          processed++;
        } catch (err) {
          errors.push(`${lead.bedrijfsnaam}: ${err instanceof Error ? err.message : "onbekende fout"}`);
        }
      }

      return NextResponse.json({
        success: true,
        processed,
        total: leads.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Stats: hoeveel leads zijn verrijkt
    if (action === "stats") {
      const { count: totalLeads } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id", { count: "exact", head: true });

      const { count: enrichedLeads } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id", { count: "exact", head: true })
        .not("enrichment_data", "is", null);

      const { count: withWebsite } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id", { count: "exact", head: true })
        .not("website", "is", null);

      const { count: enrichable } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id", { count: "exact", head: true })
        .is("enrichment_data", null)
        .not("website", "is", null);

      return NextResponse.json({
        total_leads: totalLeads || 0,
        enriched: enrichedLeads || 0,
        with_website: withWebsite || 0,
        enrichable: enrichable || 0,
      });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Lead research error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
