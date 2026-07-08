import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { pushLeadToReachiq, isReachiqConfigured } from "@/lib/integrations/reachiq";
import { captureRouteError } from "@/lib/sentry-utils";

export async function POST(request: NextRequest) {
  const { isAdmin, email: adminEmail } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized ReachIQ push by: ${adminEmail || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isReachiqConfigured()) {
    return NextResponse.json(
      { error: "ReachIQ is niet geconfigureerd. Stel REACHIQ_BASE_URL, REACHIQ_API_KEY en REACHIQ_CAMPAIGN_ID in als omgevingsvariabelen." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { lead_id } = body as { lead_id?: string };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is vereist" }, { status: 400 });
  }

  // Lead ophalen
  const { data: lead, error: fetchError } = await supabaseAdmin
    .from("acquisitie_leads")
    .select("id, bedrijfsnaam, contactpersoon, email, branche, stad, ai_score, pain_points, personalisatie_notities, emails_verzonden_count, tags, pipeline_stage")
    .eq("id", lead_id)
    .maybeSingle();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
  }

  if (!lead.email) {
    return NextResponse.json({ error: "Lead heeft geen emailadres — voeg eerst een email toe" }, { status: 422 });
  }

  // Voorkom dubbel inschrijven
  const tags: string[] = lead.tags || [];
  if (tags.includes("reachiq")) {
    return NextResponse.json({ error: "Lead is al ingeschreven op de ReachIQ-campagne" }, { status: 409 });
  }

  try {
    const result = await pushLeadToReachiq({
      email: lead.email,
      bedrijfsnaam: lead.bedrijfsnaam,
      contactpersoon: lead.contactpersoon,
      branche: lead.branche,
      stad: lead.stad,
      ai_score: lead.ai_score,
      pain_points: Array.isArray(lead.pain_points) ? lead.pain_points : null,
      personalisatie_notities: lead.personalisatie_notities,
      emails_verzonden_count: lead.emails_verzonden_count ?? 0,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // Tag toevoegen + pipeline bijwerken + email-teller ophogen
    const updatedTags = [...new Set([...tags, "reachiq"])];
    const newStage = lead.pipeline_stage === "nieuw" ? "benaderd" : lead.pipeline_stage;

    await Promise.all([
      supabaseAdmin
        .from("acquisitie_leads")
        .update({
          tags: updatedTags,
          pipeline_stage: newStage,
          emails_verzonden_count: (lead.emails_verzonden_count ?? 0) + 1,
          laatste_contact_datum: new Date().toISOString(),
          laatste_contact_type: "email",
          laatste_uitgaande_contact_datum: new Date().toISOString(),
        })
        .eq("id", lead_id),

      supabaseAdmin.from("acquisitie_contactmomenten").insert({
        lead_id,
        type: "email",
        richting: "uitgaand",
        onderwerp: result.emailSubject || "ReachIQ-campagne",
        inhoud: `Lead ingeschreven op ReachIQ horeca-campagne (3 stappen). Contact-ID: ${result.contactId}. Enrolled: ${result.enrolled ?? 0}.`,
        resultaat: "positief",
        metadata: {
          reachiq_contact_id: result.contactId,
          reachiq_enrolled: result.enrolled,
          via: "reachiq-campagne",
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      contactId: result.contactId,
      enrolled: result.enrolled,
      emailSubject: result.emailSubject,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/acquisitie/leads/push-reachiq", action: lead_id });
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}
