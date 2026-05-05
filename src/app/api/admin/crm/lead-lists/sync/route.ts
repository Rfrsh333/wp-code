import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { source } = body;

  if (source === "personeel_aanvragen") {
    return syncPersoneelAanvragen();
  } else if (source === "calculator") {
    return syncCalculatorLeads();
  }

  return NextResponse.json({ error: "Ongeldige source" }, { status: 400 });
}

async function getOrCreateList(name: string, source: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("crm_lead_lists")
    .select("id")
    .eq("name", name)
    .eq("source", source)
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabaseAdmin
    .from("crm_lead_lists")
    .insert({ name, source, description: `Automatisch gesynchroniseerd vanuit ${name}` })
    .select("id")
    .single();

  return created!.id;
}

async function syncPersoneelAanvragen() {
  const listId = await getOrCreateList("Personeel aanvragen", "personeel_aanvragen");

  const { data: aanvragen, error } = await supabaseAdmin
    .from("personeel_aanvragen")
    .select("id, bedrijfsnaam, email, telefoon, contactpersoon, locatie, type_personeel");

  if (error || !aanvragen) {
    return NextResponse.json({ error: "Fout bij ophalen personeel aanvragen" }, { status: 500 });
  }

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const aanvraag of aanvragen) {
    if (!aanvraag.bedrijfsnaam) { skipped++; continue; }

    // Check if lead already exists (match on email or bedrijfsnaam+locatie)
    let existingLead = null;

    if (aanvraag.email) {
      const { data } = await supabaseAdmin
        .from("crm_leads")
        .select("id, source_reference_id")
        .eq("email", aanvraag.email)
        .limit(1)
        .single();
      existingLead = data;
    }

    if (!existingLead) {
      const { data } = await supabaseAdmin
        .from("crm_leads")
        .select("id, source_reference_id")
        .eq("company_name", aanvraag.bedrijfsnaam)
        .eq("city", aanvraag.locatie || "")
        .limit(1)
        .single();
      existingLead = data;
    }

    if (existingLead) {
      if (!existingLead.source_reference_id) {
        await supabaseAdmin
          .from("crm_leads")
          .update({
            lead_list_id: listId,
            source_type: "personeel_aanvragen",
            source_reference_id: aanvraag.id,
          })
          .eq("id", existingLead.id);
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    // Insert new lead
    await supabaseAdmin
      .from("crm_leads")
      .insert({
        company_name: aanvraag.bedrijfsnaam,
        email: aanvraag.email || null,
        phone: aanvraag.telefoon || null,
        contact_person: aanvraag.contactpersoon || null,
        city: aanvraag.locatie || null,
        category: aanvraag.type_personeel || "restaurant",
        source: "personeel_aanvragen",
        lead_list_id: listId,
        source_type: "personeel_aanvragen",
        source_reference_id: aanvraag.id,
        status: "nieuw",
        priority: "hoog",
        email_available: !!aanvraag.email,
        phone_available: !!aanvraag.telefoon,
      });
    created++;
  }

  // Update list counts
  const { count } = await supabaseAdmin
    .from("crm_leads")
    .select("*", { count: "exact", head: true })
    .eq("lead_list_id", listId);

  await supabaseAdmin
    .from("crm_lead_lists")
    .update({ lead_count: count || 0, updated_at: new Date().toISOString() })
    .eq("id", listId);

  return NextResponse.json({ created, updated, skipped, total: aanvragen.length });
}

async function syncCalculatorLeads() {
  const listId = await getOrCreateList("Calculator leads", "calculator");

  const { data: calcLeads, error } = await supabaseAdmin
    .from("calculator_leads")
    .select("id, bedrijfsnaam, email, naam, functie, aantal_medewerkers");

  if (error || !calcLeads) {
    return NextResponse.json({ error: "Fout bij ophalen calculator leads" }, { status: 500 });
  }

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const calc of calcLeads) {
    if (!calc.bedrijfsnaam) { skipped++; continue; }

    let existingLead = null;

    if (calc.email) {
      const { data } = await supabaseAdmin
        .from("crm_leads")
        .select("id, source_reference_id")
        .eq("email", calc.email)
        .limit(1)
        .single();
      existingLead = data;
    }

    if (!existingLead) {
      const { data } = await supabaseAdmin
        .from("crm_leads")
        .select("id, source_reference_id")
        .eq("company_name", calc.bedrijfsnaam)
        .limit(1)
        .single();
      existingLead = data;
    }

    if (existingLead) {
      if (!existingLead.source_reference_id) {
        await supabaseAdmin
          .from("crm_leads")
          .update({
            lead_list_id: listId,
            source_type: "calculator",
            source_reference_id: calc.id,
          })
          .eq("id", existingLead.id);
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    await supabaseAdmin
      .from("crm_leads")
      .insert({
        company_name: calc.bedrijfsnaam,
        email: calc.email || null,
        contact_person: calc.naam || null,
        category: "restaurant",
        source: "calculator",
        lead_list_id: listId,
        source_type: "calculator",
        source_reference_id: calc.id,
        status: "nieuw",
        priority: "hoog",
        email_available: !!calc.email,
        phone_available: false,
      });
    created++;
  }

  // Update list counts
  const { count } = await supabaseAdmin
    .from("crm_leads")
    .select("*", { count: "exact", head: true })
    .eq("lead_list_id", listId);

  await supabaseAdmin
    .from("crm_lead_lists")
    .update({ lead_count: count || 0, updated_at: new Date().toISOString() })
    .eq("id", listId);

  return NextResponse.json({ created, updated, skipped, total: calcLeads.length });
}
