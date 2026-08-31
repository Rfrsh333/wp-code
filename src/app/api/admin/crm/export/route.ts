import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Serialiseer één CSV-cel veilig:
 * - CSV-formule-injectie tegengaan (cellen die met = + - @ of tab/CR beginnen worden
 *   als tekst geforceerd door een voorloop-apostrof), zodat Excel/Sheets ze niet uitvoert.
 * - Correcte RFC-4180 quoting: cellen met een quote, komma of regeleinde worden gequote
 *   en interne quotes verdubbeld.
 */
function csvCell(value: unknown): string {
  let str = value != null ? String(value) : "";
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (/[",\n\r]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const ids = url.get("ids");
  const format = url.get("format") || "instantly"; // "instantly" or "full"

  let query = supabaseAdmin.from("crm_leads").select("*");

  if (ids) {
    query = query.in("id", ids.split(","));
  } else {
    // Export non-archived leads with email
    query = query.is("archived_at", null).not("email", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Export mislukt" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Geen leads om te exporteren" }, { status: 404 });
  }

  let csv: string;

  if (format === "instantly") {
    // Instantly format: email is required
    const headers = ["company_name", "email", "phone", "city", "website", "instagram_url", "facebook_url"];
    const rows = data
      .filter(l => l.email)
      .map(l => headers.map(h => csvCell((l as Record<string, unknown>)[h])).join(","));
    csv = [headers.join(","), ...rows].join("\n");
  } else {
    // Full export
    const headers = ["company_name", "city", "address", "postal_code", "phone", "email", "website", "instagram_url", "facebook_url", "google_maps_url", "status", "priority", "outreach_status", "next_best_channel", "instantly_email_status", "call_count", "email_count", "instagram_dm_count", "facebook_dm_count", "last_call_at", "last_email_at", "last_instagram_dm_at", "last_facebook_dm_at", "created_at"];
    const rows = data.map(l => headers.map(h => csvCell((l as Record<string, unknown>)[h])).join(","));
    csv = [headers.join(","), ...rows].join("\n");
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="crm_export_${format}_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
