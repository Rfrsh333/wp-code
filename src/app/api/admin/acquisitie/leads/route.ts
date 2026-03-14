import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";
import { scoreLead } from "@/lib/agents/lead-scoring";
import { isOpenAIConfigured } from "@/lib/openai";

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
    .select("id, bedrijfsnaam, contactpersoon, email, telefoon, website, adres, stad, branche, tags, pipeline_stage, ai_score, ai_score_reasoning, bron, emails_verzonden_count, laatste_contact_datum, laatste_contact_type, volgende_actie_datum, volgende_actie_notitie, pain_points, personalisatie_notities, predicted_deal_value, predicted_conversion_pct, churn_risk, created_at, updated_at", { count: "exact" });

  if (stage) query = query.eq("pipeline_stage", stage);
  if (branche) query = query.eq("branche", branche);
  if (stad) query = query.ilike("stad", `%${stad}%`);
  if (bron) query = query.eq("bron", bron);
  if (minScore) query = query.gte("ai_score", parseInt(minScore));
  if (search) {
    query = query.or(
      `bedrijfsnaam.ilike.%${search}%,contactpersoon.ilike.%${search}%,email.ilike.%${search}%,telefoon.ilike.%${search}%`
    );
  }

  const ascending = sortDir === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Acquisitie leads fetch error:", error);
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
      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .update(updateData)
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

    // Deduplicatie check op email
    if (leadData.email) {
      const { data: existing } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, bedrijfsnaam")
        .eq("email", leadData.email)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: `Lead met dit email bestaat al: ${existing.bedrijfsnaam}`, duplicate_id: existing.id },
          { status: 409 }
        );
      }
    }

    const { data: newLead, error } = await supabaseAdmin
      .from("acquisitie_leads")
      .insert(leadData)
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

        // Telegram alert voor high-score leads
        if (scoreResult.score > 70) {
          await sendTelegramAlert(
            `🎯 <b>Nieuwe high-score lead!</b>\n\n` +
            `Bedrijf: ${newLead.bedrijfsnaam}\n` +
            `Score: ${scoreResult.score}/100\n` +
            `Stad: ${newLead.stad || "onbekend"}\n` +
            `Branche: ${newLead.branche || "onbekend"}\n\n` +
            `${scoreResult.reasoning}`
          );
        }
      } catch (scoreError) {
        console.error("Auto-scoring failed:", scoreError);
      }
    }

    return NextResponse.json({ data: newLead }, { status: 201 });
  } catch (error) {
    console.error("Acquisitie lead error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
