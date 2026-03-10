import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { ensureMedewerkerFromCandidate } from "@/lib/candidate-to-medewerker";

// KRITIEK: Whitelist van toegestane tables om SQL injection te voorkomen
const ALLOWED_TABLES = [
  "calculator_leads",
  "contact_berichten",
  "personeel_aanvragen",
  "inschrijvingen",
  "leads",
  "klanten",
  "diensten",
  "dienst_aanmeldingen",
  "uren_registraties",
  "facturen",
  "factuur_regels",
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

function isAllowedTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized data access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table");

  if (!table) {
    return NextResponse.json({ error: "Table required" }, { status: 400 });
  }

  // KRITIEK: Check table whitelist
  if (!isAllowedTable(table)) {
    console.warn(`[SECURITY] Attempt to access non-whitelisted table: ${table} by ${email}`);
    return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
  }

  const { data } = await supabaseAdmin.from(table).select("*").order("created_at", { ascending: false });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized data mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, table, id, ids, data } = await request.json();

  // KRITIEK: Check table whitelist
  if (!table || !isAllowedTable(table)) {
    console.warn(`[SECURITY] Attempt to mutate non-whitelisted table: ${table} by ${email}`);
    return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
  }

  if ((action === "delete" || action === "delete_many") && !hasRequiredAdminRole(role, ["owner"])) {
    return NextResponse.json(
      { error: "Alleen owners mogen records verwijderen" },
      { status: 403 }
    );
  }

  let generatedMedewerkerLinks = 0;

  if (action === "update") {
    await supabaseAdmin.from(table).update(data).eq("id", id);

    if (
      table === "inschrijvingen" &&
      data?.onboarding_status === "inzetbaar"
    ) {
      const { data: candidate } = await supabaseAdmin
        .from("inschrijvingen")
        .select("id, voornaam, tussenvoegsel, achternaam, email, telefoon, gewenste_functies, interne_notitie, medewerker_id")
        .eq("id", id)
        .single();

      if (candidate && !candidate.medewerker_id) {
        const medewerkerId = await ensureMedewerkerFromCandidate(candidate);
        await supabaseAdmin.from("inschrijvingen").update({ medewerker_id: medewerkerId }).eq("id", id);
        generatedMedewerkerLinks = 1;
      }
    }
  }
  if (action === "delete") {
    await supabaseAdmin.from(table).delete().eq("id", id);
  }
  if (action === "delete_many") {
    await supabaseAdmin.from(table).delete().in("id", data.ids);
  }
  if (action === "bulk_update") {
    await supabaseAdmin.from(table).update(data).in("id", ids);

    if (
      table === "inschrijvingen" &&
      data?.onboarding_status === "inzetbaar" &&
      Array.isArray(ids) &&
      ids.length > 0
    ) {
      const { data: candidates } = await supabaseAdmin
        .from("inschrijvingen")
        .select("id, voornaam, tussenvoegsel, achternaam, email, telefoon, gewenste_functies, interne_notitie, medewerker_id")
        .in("id", ids);

      for (const candidate of candidates || []) {
        if (candidate.medewerker_id) continue;

        const medewerkerId = await ensureMedewerkerFromCandidate(candidate);
        await supabaseAdmin
          .from("inschrijvingen")
          .update({ medewerker_id: medewerkerId })
          .eq("id", candidate.id);
        generatedMedewerkerLinks += 1;
      }
    }
  }
  if (action === "insert") {
    await supabaseAdmin.from(table).insert(data);
  }

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: `admin_data_${action}`,
    targetTable: table,
    targetId: id || null,
    summary: `${action} uitgevoerd op ${table}`,
    metadata: {
      ids: ids || null,
      changedFields: data ? Object.keys(data) : [],
      generatedMedewerkerLinks,
    },
  });

  return NextResponse.json({ success: true });
}
