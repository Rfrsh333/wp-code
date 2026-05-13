import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";
import { scoreLead } from "@/lib/agents/lead-scoring";
import { isOpenAIConfigured } from "@/lib/openai";
import { captureRouteError } from "@/lib/sentry-utils";
import { buildLeadIdentityFields, normalizeCompanyName } from "@/lib/acquisitie/identity";

type LeadIdentityCandidate = {
  id: string;
  bedrijfsnaam: string;
  stad: string | null;
};

async function findExistingLead(leadData: Record<string, unknown>): Promise<{ existing: LeadIdentityCandidate | null; reason: string | null }> {
  const identity = buildLeadIdentityFields({
    email: typeof leadData.email === "string" ? leadData.email : null,
    telefoon: typeof leadData.telefoon === "string" ? leadData.telefoon : null,
    website: typeof leadData.website === "string" ? leadData.website : null,
    instagram_handle: typeof leadData.instagram_handle === "string" ? leadData.instagram_handle : null,
    linkedin_url: typeof leadData.linkedin_url === "string" ? leadData.linkedin_url : null,
    facebook_url: typeof leadData.facebook_url === "string" ? leadData.facebook_url : null,
    bedrijfsnaam: typeof leadData.bedrijfsnaam === "string" ? leadData.bedrijfsnaam : null,
  });

  const checks: Array<{ column: string; value: string | null; reason: string }> = [
    { column: "normalized_email", value: identity.normalized_email, reason: "email" },
    { column: "normalized_phone", value: identity.normalized_phone, reason: "telefoon" },
    { column: "instagram_handle", value: identity.instagram_handle, reason: "instagram" },
    { column: "linkedin_url", value: identity.linkedin_url, reason: "linkedin" },
    { column: "facebook_url", value: identity.facebook_url, reason: "facebook" },
  ];

  for (const check of checks) {
    if (!check.value) continue;
    const { data } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, stad")
      .eq(check.column, check.value)
      .maybeSingle<LeadIdentityCandidate>();

    if (data) {
      return { existing: data, reason: check.reason };
    }
  }

  if (identity.website_domain && identity.normalized_bedrijfsnaam) {
    const { data } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, stad")
      .eq("website_domain", identity.website_domain)
      .eq("normalized_bedrijfsnaam", identity.normalized_bedrijfsnaam)
      .maybeSingle<LeadIdentityCandidate>();

    if (data) {
      return { existing: data, reason: "website + bedrijfsnaam" };
    }
  }

  if (identity.normalized_bedrijfsnaam && leadData.stad) {
    const { data } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, stad")
      .eq("normalized_bedrijfsnaam", identity.normalized_bedrijfsnaam)
      .ilike("stad", String(leadData.stad))
      .maybeSingle<LeadIdentityCandidate>();

    if (data) {
      return { existing: data, reason: "bedrijfsnaam + stad" };
    }
  }

  return { existing: null, reason: null };
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized acquisitie leads access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage");
  const branche = searchParams.get("branche");
  const stad = searchParams.get("stad");
  const bron = searchParams.get("bron");
  const search = searchParams.get("search");
  const minScore = searchParams.get("min_score");
  const sortBy = searchParams.get("sort") || "created_at";
  const sortDir = searchParams.get("dir") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("acquisitie_leads")
    .select("id, bedrijfsnaam, normalized_bedrijfsnaam, contactpersoon, email, normalized_email, telefoon, normalized_phone, website, website_domain, adres, stad, branche, instagram_handle, linkedin_url, facebook_url, duplicate_of_lead_id, duplicate_confidence, duplicate_reason, tags, pipeline_stage, ai_score, ai_score_reasoning, bron, emails_verzonden_count, laatste_contact_datum, laatste_contact_type, laatste_uitgaande_contact_datum, laatste_inkomende_contact_datum, volgende_actie_datum, volgende_actie_notitie, pain_points, personalisatie_notities, predicted_deal_value, predicted_conversion_pct, churn_risk, created_at, updated_at", { count: "exact" });

  if (stage) query = query.eq("pipeline_stage", stage);
  if (branche) query = query.eq("branche", branche);
  if (stad) {
    const sanitizedStad = stad.replace(/%/g, "").replace(/_/g, "").replace(/[(),."']/g, "");
    if (sanitizedStad.length >= 2) query = query.ilike("stad", `%${sanitizedStad}%`);
  }
  if (bron) query = query.eq("bron", bron);
  if (minScore) query = query.gte("ai_score", parseInt(minScore));
  if (search) {
    const sanitized = search.replace(/%/g, "").replace(/_/g, "").replace(/[(),."']/g, "");
    if (sanitized.length >= 2) {
      query = query.or(
        `bedrijfsnaam.ilike.%${sanitized}%,contactpersoon.ilike.%${sanitized}%,email.ilike.%${sanitized}%,telefoon.ilike.%${sanitized}%`
      );
    }
  }

  const ascending = sortDir === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    captureRouteError(error, { route: "/api/admin/acquisitie/leads", action: "GET" });
    // console.error("Acquisitie leads fetch error:", error);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit }, {
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
  });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized acquisitie lead create by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, id, ids, data: updateData, ...leadData } = body;

    // Bulk update
    if (action === "bulk_update" && ids && updateData) {
      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .update(updateData)
        .in("id", ids);

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Update
    if (action === "update" && id) {
      const normalizedUpdateData = { ...updateData };
      if (updateData && typeof updateData === "object") {
        Object.assign(normalizedUpdateData, buildLeadIdentityFields({
          email: typeof updateData.email === "string" ? updateData.email : undefined,
          telefoon: typeof updateData.telefoon === "string" ? updateData.telefoon : undefined,
          website: typeof updateData.website === "string" ? updateData.website : undefined,
          instagram_handle: typeof updateData.instagram_handle === "string" ? updateData.instagram_handle : undefined,
          linkedin_url: typeof updateData.linkedin_url === "string" ? updateData.linkedin_url : undefined,
          facebook_url: typeof updateData.facebook_url === "string" ? updateData.facebook_url : undefined,
          bedrijfsnaam: typeof updateData.bedrijfsnaam === "string" ? updateData.bedrijfsnaam : undefined,
        }));
      }

      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .update(normalizedUpdateData)
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Delete
    if (action === "delete" && id) {
      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .delete()
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Bulk delete
    if (action === "delete_many" && ids) {
      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .delete()
        .in("id", ids);

      if (error) {
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Convert to klant
    if (action === "convert" && id) {
      const { data: lead } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("bedrijfsnaam, contactpersoon, email, telefoon, adres")
        .eq("id", id)
        .single();

      if (!lead) {
        return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
      }

      // Create klant record
      const { data: klant, error: klantError } = await supabaseAdmin
        .from("klanten")
        .insert({
          bedrijfsnaam: lead.bedrijfsnaam,
          contactpersoon: lead.contactpersoon,
          email: lead.email,
          telefoon: lead.telefoon,
          adres: lead.adres,
        })
        .select()
        .single();

      if (klantError) {
        return NextResponse.json({ error: klantError.message }, { status: 500 });
      }

      // Update lead
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          pipeline_stage: "klant",
          klant_id: klant.id,
          geconverteerd_op: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({ success: true, klant_id: klant.id });
    }

    // Create new lead
    if (!leadData.bedrijfsnaam) {
      return NextResponse.json({ error: "Bedrijfsnaam is vereist" }, { status: 400 });
    }

    const normalizedLeadData = {
      ...leadData,
      ...buildLeadIdentityFields({
        email: typeof leadData.email === "string" ? leadData.email : undefined,
        telefoon: typeof leadData.telefoon === "string" ? leadData.telefoon : undefined,
        website: typeof leadData.website === "string" ? leadData.website : undefined,
        instagram_handle: typeof leadData.instagram_handle === "string" ? leadData.instagram_handle : undefined,
        linkedin_url: typeof leadData.linkedin_url === "string" ? leadData.linkedin_url : undefined,
        facebook_url: typeof leadData.facebook_url === "string" ? leadData.facebook_url : undefined,
        bedrijfsnaam: typeof leadData.bedrijfsnaam === "string" ? leadData.bedrijfsnaam : undefined,
      }),
    };

    if (!normalizedLeadData.normalized_bedrijfsnaam && typeof leadData.bedrijfsnaam === "string") {
      normalizedLeadData.normalized_bedrijfsnaam = normalizeCompanyName(leadData.bedrijfsnaam);
    }

    const { existing, reason } = await findExistingLead(normalizedLeadData);
    if (existing) {
      return NextResponse.json(
        {
          error: `Lead lijkt al te bestaan via ${reason}: ${existing.bedrijfsnaam}`,
          duplicate_id: existing.id,
          duplicate_reason: reason,
        },
        { status: 409 }
      );
    }

    const { data: newLead, error } = await supabaseAdmin
      .from("acquisitie_leads")
      .insert(normalizedLeadData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    // Auto AI score bij aanmaken
    if (isOpenAIConfigured()) {
      try {
        const scoreResult = await scoreLead({
          bedrijfsnaam: newLead.bedrijfsnaam,
          branche: newLead.branche,
          stad: newLead.stad,
          website: newLead.website,
          telefoon: newLead.telefoon,
          email: newLead.email,
          adres: newLead.adres,
        });

        await supabaseAdmin
          .from("acquisitie_leads")
          .update({
            ai_score: scoreResult.score,
            ai_score_reasoning: scoreResult.reasoning,
            pain_points: scoreResult.pain_points,
            personalisatie_notities: scoreResult.personalisatie_tip,
          })
          .eq("id", newLead.id);

        newLead.ai_score = scoreResult.score;

        // Telegram alert voor high-score leads (geen PII — AVG compliance)
        if (scoreResult.score > 70) {
          await sendTelegramAlert(
            `🎯 <b>Nieuwe high-score lead!</b>\n\n` +
            `Score: ${scoreResult.score}/100 — bekijk in dashboard`
          );
        }
      } catch (scoreError) {
        captureRouteError(scoreError, { route: "/api/admin/acquisitie/leads", action: "POST" });
        // console.error("Auto-scoring failed:", scoreError);
      }
    }

    return NextResponse.json({ data: newLead }, { status: 201 });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/acquisitie/leads", action: "POST" });
    // console.error("Acquisitie lead error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
