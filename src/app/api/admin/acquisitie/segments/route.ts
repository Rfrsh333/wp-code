import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";

interface SegmentFilters {
  stages?: string[];
  branches?: string[];
  steden?: string[];
  tags?: string[];
  min_ai_score?: number;
  max_ai_score?: number;
  min_engagement?: number;
  churn_risk?: string[];
  has_email?: boolean;
  has_phone?: boolean;
  assigned_to?: string[];
  days_since_contact_min?: number;
  days_since_contact_max?: number;
  created_after?: string;
  created_before?: string;
  predicted_conversion_min?: number;
}

function buildSegmentQuery(filters: SegmentFilters) {
  let query = supabaseAdmin
    .from("acquisitie_leads")
    .select("id", { count: "exact", head: false });

  if (filters.stages?.length) {
    query = query.in("pipeline_stage", filters.stages);
  }
  if (filters.branches?.length) {
    query = query.in("branche", filters.branches);
  }
  if (filters.steden?.length) {
    // Case-insensitive stad matching via OR
    const stadFilters = filters.steden.map((s) => `stad.ilike.%${s}%`).join(",");
    query = query.or(stadFilters);
  }
  if (filters.tags?.length) {
    // PostgreSQL array overlap: tags && ARRAY[...]
    query = query.overlaps("tags", filters.tags);
  }
  if (filters.min_ai_score !== undefined) {
    query = query.gte("ai_score", filters.min_ai_score);
  }
  if (filters.max_ai_score !== undefined) {
    query = query.lte("ai_score", filters.max_ai_score);
  }
  if (filters.min_engagement !== undefined) {
    query = query.gte("engagement_score", filters.min_engagement);
  }
  if (filters.churn_risk?.length) {
    query = query.in("churn_risk", filters.churn_risk);
  }
  if (filters.has_email === true) {
    query = query.not("email", "is", null).neq("email", "");
  }
  if (filters.has_phone === true) {
    query = query.not("telefoon", "is", null).neq("telefoon", "");
  }
  if (filters.assigned_to?.length) {
    query = query.in("assigned_to", filters.assigned_to);
  }
  if (filters.days_since_contact_min !== undefined) {
    const date = new Date(Date.now() - filters.days_since_contact_min * 86400000).toISOString();
    query = query.lte("laatste_contact_datum", date);
  }
  if (filters.days_since_contact_max !== undefined) {
    const date = new Date(Date.now() - filters.days_since_contact_max * 86400000).toISOString();
    query = query.gte("laatste_contact_datum", date);
  }
  if (filters.created_after) {
    query = query.gte("created_at", filters.created_after);
  }
  if (filters.created_before) {
    query = query.lte("created_at", filters.created_before);
  }
  if (filters.predicted_conversion_min !== undefined) {
    query = query.gte("predicted_conversion_pct", filters.predicted_conversion_min);
  }

  return query;
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized segments access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  // Alle segmenten
  if (view === "list" || !view) {
    const { data: segmenten, error } = await supabaseAdmin
      .from("acquisitie_segmenten")
      .select("*")
      .order("naam");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Herbereken lead counts
    for (const seg of segmenten || []) {
      if (seg.is_dynamic && seg.filters) {
        const query = buildSegmentQuery(seg.filters as SegmentFilters);
        const { count } = await query;
        seg.lead_count = count || 0;

        await supabaseAdmin
          .from("acquisitie_segmenten")
          .update({ lead_count: seg.lead_count, last_calculated_at: new Date().toISOString() })
          .eq("id", seg.id);
      }
    }

    return NextResponse.json({ data: segmenten });
  }

  // Preview segment (leads die matchen)
  if (view === "preview") {
    const segmentId = searchParams.get("segment_id");
    let filters: SegmentFilters;

    if (segmentId) {
      const { data: seg } = await supabaseAdmin
        .from("acquisitie_segmenten")
        .select("filters")
        .eq("id", segmentId)
        .single();
      if (!seg) return NextResponse.json({ error: "Segment niet gevonden" }, { status: 404 });
      filters = seg.filters as SegmentFilters;
    } else {
      // Filters direct via query params (voor preview zonder opslaan)
      filters = JSON.parse(searchParams.get("filters") || "{}");
    }

    const query = supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, branche, stad, pipeline_stage, ai_score, engagement_score, tags, email, telefoon, churn_risk, predicted_conversion_pct");

    // Rebuild query with filters (not using head:true this time)
    let filteredQuery = query;
    if (filters.stages?.length) filteredQuery = filteredQuery.in("pipeline_stage", filters.stages);
    if (filters.branches?.length) filteredQuery = filteredQuery.in("branche", filters.branches);
    if (filters.steden?.length) {
      const stadFilters = filters.steden.map((s) => `stad.ilike.%${s}%`).join(",");
      filteredQuery = filteredQuery.or(stadFilters);
    }
    if (filters.tags?.length) filteredQuery = filteredQuery.overlaps("tags", filters.tags);
    if (filters.min_ai_score !== undefined) filteredQuery = filteredQuery.gte("ai_score", filters.min_ai_score);
    if (filters.max_ai_score !== undefined) filteredQuery = filteredQuery.lte("ai_score", filters.max_ai_score);
    if (filters.min_engagement !== undefined) filteredQuery = filteredQuery.gte("engagement_score", filters.min_engagement);
    if (filters.churn_risk?.length) filteredQuery = filteredQuery.in("churn_risk", filters.churn_risk);
    if (filters.has_email === true) filteredQuery = filteredQuery.not("email", "is", null).neq("email", "");
    if (filters.has_phone === true) filteredQuery = filteredQuery.not("telefoon", "is", null).neq("telefoon", "");
    if (filters.assigned_to?.length) filteredQuery = filteredQuery.in("assigned_to", filters.assigned_to);
    if (filters.predicted_conversion_min !== undefined) filteredQuery = filteredQuery.gte("predicted_conversion_pct", filters.predicted_conversion_min);

    const { data, count } = await filteredQuery
      .order("ai_score", { ascending: false, nullsFirst: false })
      .limit(100);

    return NextResponse.json({ data: data || [], count: count || (data?.length ?? 0) });
  }

  // Tag definities
  if (view === "tags") {
    const { data } = await supabaseAdmin
      .from("acquisitie_tag_definities")
      .select("*")
      .order("categorie", { ascending: true })
      .order("naam");

    return NextResponse.json({ data: data || [] });
  }

  // Alle unieke tags in gebruik
  if (view === "tags_in_use") {
    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("tags")
      .not("tags", "is", null);

    const tagCounts: Record<string, number> = {};
    for (const l of leads || []) {
      for (const t of l.tags || []) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    const sorted = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({ data: sorted });
  }

  // AI suggest tags
  if (view === "ai_suggest_tags") {
    const leadId = searchParams.get("lead_id");
    if (!leadId) return NextResponse.json({ error: "lead_id vereist" }, { status: 400 });

    const { data: lead } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("bedrijfsnaam, branche, stad, pipeline_stage, ai_score, engagement_score, tags, enrichment_data, pain_points, personalisatie_notities, emails_verzonden_count, laatste_contact_type, churn_risk")
      .eq("id", leadId)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });

    // Get existing tag definitions
    const { data: tagDefs } = await supabaseAdmin
      .from("acquisitie_tag_definities")
      .select("naam, categorie");

    const availableTags = (tagDefs || []).map((t) => t.naam);

    if (!isOpenAIConfigured()) {
      // Fallback rule-based
      const suggestions: string[] = [];
      if ((lead.engagement_score || 0) >= 50) suggestions.push("hot-lead");
      else if ((lead.engagement_score || 0) >= 20) suggestions.push("warm-lead");
      else suggestions.push("cold-lead");
      if (lead.churn_risk === "hoog" || lead.churn_risk === "kritiek") suggestions.push("niet-bereikbaar");
      if (lead.enrichment_data?.heeft_vacatures) suggestions.push("heeft-vacatures");

      return NextResponse.json({ data: suggestions.filter((s) => !(lead.tags || []).includes(s)) });
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `Je bent een CRM tagging assistent. Suggereer relevante tags voor een lead.
Beschikbare tags: ${availableTags.join(", ")}
Je mag ook nieuwe tags suggereren (lowercase, met-streepjes).
Huidige tags van de lead: ${(lead.tags || []).join(", ") || "geen"}
Suggereer 2-5 tags die nog NIET op de lead staan.
Antwoord ALLEEN met een JSON array van strings: ["tag1", "tag2"]`
      },
      {
        role: "user",
        content: `Lead: ${lead.bedrijfsnaam}
Branche: ${lead.branche || "onbekend"}
Stad: ${lead.stad || "onbekend"}
Stage: ${lead.pipeline_stage}
AI Score: ${lead.ai_score || "n/a"}
Engagement: ${lead.engagement_score || 0}
Churn risk: ${lead.churn_risk || "onbekend"}
Emails verzonden: ${lead.emails_verzonden_count}
Laatste contact: ${lead.laatste_contact_type || "geen"}
Heeft vacatures: ${lead.enrichment_data?.heeft_vacatures ?? "onbekend"}
Pain points: ${lead.pain_points?.join(", ") || "geen"}`
      }
    ];

    try {
      const response = await chatCompletion(messages, { temperature: 0.4, maxTokens: 200 });
      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const suggestions = JSON.parse(cleaned);
      return NextResponse.json({ data: suggestions });
    } catch {
      return NextResponse.json({ data: [] });
    }
  }

  return NextResponse.json({ error: "Onbekende view" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized segments write by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // CRUD segment
    if (action === "create_segment") {
      const { naam, beschrijving, kleur, filters, is_dynamic } = body;
      if (!naam) return NextResponse.json({ error: "Naam is vereist" }, { status: 400 });

      // Bereken initial count
      let leadCount = 0;
      if (is_dynamic !== false && filters) {
        const query = buildSegmentQuery(filters as SegmentFilters);
        const { count } = await query;
        leadCount = count || 0;
      }

      const { data, error } = await supabaseAdmin
        .from("acquisitie_segmenten")
        .insert({
          naam,
          beschrijving: beschrijving || null,
          kleur: kleur || "#6B7280",
          filters: filters || {},
          is_dynamic: is_dynamic !== false,
          lead_count: leadCount,
          last_calculated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data }, { status: 201 });
    }

    if (action === "update_segment") {
      const { id, ...updateData } = body;
      if (!id) return NextResponse.json({ error: "id is vereist" }, { status: 400 });
      delete updateData.action;

      const { error } = await supabaseAdmin
        .from("acquisitie_segmenten")
        .update(updateData)
        .eq("id", id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_segment") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id is vereist" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("acquisitie_segmenten")
        .delete()
        .eq("id", id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Tag management
    if (action === "create_tag") {
      const { naam, kleur, categorie, beschrijving } = body;
      if (!naam) return NextResponse.json({ error: "Naam is vereist" }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from("acquisitie_tag_definities")
        .insert({
          naam: naam.toLowerCase().replace(/\s+/g, "-"),
          kleur: kleur || "#6B7280",
          categorie: categorie || "custom",
          beschrijving: beschrijving || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data }, { status: 201 });
    }

    if (action === "delete_tag") {
      const { id } = body;
      const { error } = await supabaseAdmin
        .from("acquisitie_tag_definities")
        .delete()
        .eq("id", id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Bulk tag leads
    if (action === "bulk_tag") {
      const { lead_ids, tags_to_add, tags_to_remove } = body;
      if (!lead_ids?.length) return NextResponse.json({ error: "lead_ids vereist" }, { status: 400 });

      const { data: leads } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, tags")
        .in("id", lead_ids);

      let updated = 0;
      for (const lead of leads || []) {
        let currentTags: string[] = lead.tags || [];

        if (tags_to_add?.length) {
          currentTags = [...new Set([...currentTags, ...tags_to_add])];
        }
        if (tags_to_remove?.length) {
          currentTags = currentTags.filter((t: string) => !tags_to_remove.includes(t));
        }

        await supabaseAdmin
          .from("acquisitie_leads")
          .update({ tags: currentTags })
          .eq("id", lead.id);
        updated++;
      }

      return NextResponse.json({ success: true, updated });
    }

    // Bulk stage change
    if (action === "bulk_stage") {
      const { lead_ids, stage } = body;
      if (!lead_ids?.length || !stage) return NextResponse.json({ error: "lead_ids en stage vereist" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .update({ pipeline_stage: stage })
        .in("id", lead_ids);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, updated: lead_ids.length });
    }

    // AI auto-tag: tag alle leads in een segment
    if (action === "auto_tag_segment") {
      const { segment_id } = body;
      if (!segment_id) return NextResponse.json({ error: "segment_id vereist" }, { status: 400 });

      const { data: seg } = await supabaseAdmin
        .from("acquisitie_segmenten")
        .select("naam, filters")
        .eq("id", segment_id)
        .single();

      if (!seg) return NextResponse.json({ error: "Segment niet gevonden" }, { status: 404 });

      // Get matching leads
      let query = supabaseAdmin.from("acquisitie_leads").select("id, tags");
      const filters = seg.filters as SegmentFilters;
      if (filters.stages?.length) query = query.in("pipeline_stage", filters.stages);
      if (filters.branches?.length) query = query.in("branche", filters.branches);
      if (filters.tags?.length) query = query.overlaps("tags", filters.tags);
      if (filters.min_ai_score !== undefined) query = query.gte("ai_score", filters.min_ai_score);

      const { data: leads } = await query.limit(500);

      // Tag naam = segment naam als tag
      const tagName = seg.naam.toLowerCase().replace(/\s+/g, "-");
      let tagged = 0;

      for (const lead of leads || []) {
        const currentTags: string[] = lead.tags || [];
        if (!currentTags.includes(tagName)) {
          await supabaseAdmin
            .from("acquisitie_leads")
            .update({ tags: [...currentTags, tagName] })
            .eq("id", lead.id);
          tagged++;
        }
      }

      // Ensure tag definition exists
      await supabaseAdmin
        .from("acquisitie_tag_definities")
        .upsert({ naam: tagName, categorie: "segment" }, { onConflict: "naam" });

      return NextResponse.json({ success: true, tagged, tag: tagName });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Segments error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
