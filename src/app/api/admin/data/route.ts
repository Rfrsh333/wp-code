import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// KRITIEK: Whitelist van toegestane tabellen - voorkomt SQL injection en data leakage
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
  "factuur_regels"
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

function isAllowedTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

export async function GET(request: NextRequest) {
  // KRITIEK: Check if user is admin (not just authenticated)
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

  // KRITIEK: Whitelist check - voorkomt willekeurige table toegang
  if (!isAllowedTable(table)) {
    console.warn(`[SECURITY] Attempt to access non-whitelisted table: ${table} by ${email}`);
    return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
  }

  const { data } = await supabaseAdmin.from(table).select("*").order("created_at", { ascending: false });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Check if user is admin (not just authenticated)
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized data POST attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, table, id, data } = await request.json();

  // KRITIEK: Whitelist check - voorkomt willekeurige table toegang
  if (!table || !isAllowedTable(table)) {
    console.warn(`[SECURITY] Attempt to modify non-whitelisted table: ${table} by ${email}`);
    return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
  }

  if (action === "update") {
    await supabaseAdmin.from(table).update(data).eq("id", id);
  }
  if (action === "delete") {
    await supabaseAdmin.from(table).delete().eq("id", id);
  }
  if (action === "delete_many") {
    await supabaseAdmin.from(table).delete().in("id", data.ids);
  }
  if (action === "insert") {
    await supabaseAdmin.from(table).insert(data);
  }

  return NextResponse.json({ success: true });
}
