import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { buildLeadIdentityFields } from "@/lib/acquisitie/identity";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized import attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { rows, column_mapping, bron } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Geen data om te importeren" }, { status: 400 });
    }

    if (!column_mapping || typeof column_mapping !== "object") {
      return NextResponse.json({ error: "Kolom mapping is vereist" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const duplicates: string[] = [];

    for (const row of rows) {
      const lead: Record<string, unknown> = {
        bron: bron || "csv_import",
      };

      // Map columns
      for (const [csvCol, dbCol] of Object.entries(column_mapping)) {
        if (dbCol && row[csvCol] !== undefined && row[csvCol] !== "") {
          lead[dbCol as string] = row[csvCol];
        }
      }

      if (!lead.bedrijfsnaam) {
        skipped++;
        continue;
      }

      Object.assign(lead, buildLeadIdentityFields({
        email: typeof lead.email === "string" ? lead.email : null,
        telefoon: typeof lead.telefoon === "string" ? lead.telefoon : null,
        website: typeof lead.website === "string" ? lead.website : null,
        instagram_handle: typeof lead.instagram_handle === "string" ? lead.instagram_handle : null,
        linkedin_url: typeof lead.linkedin_url === "string" ? lead.linkedin_url : null,
        facebook_url: typeof lead.facebook_url === "string" ? lead.facebook_url : null,
        bedrijfsnaam: typeof lead.bedrijfsnaam === "string" ? lead.bedrijfsnaam : null,
      }));

      // Extract stad from adres if not mapped
      if (!lead.stad && lead.adres) {
        const stadMatch = String(lead.adres).match(
          /\d{4}\s*[A-Z]{2}\s+([A-Za-z\s]+?)(?:,|\s*Nederland|$)/
        );
        if (stadMatch) {
          lead.stad = stadMatch[1].trim();
        }
      }

      if (lead.normalized_email) {
        const { data: existing } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("id")
          .eq("normalized_email", lead.normalized_email as string)
          .single();

        if (existing) {
          duplicates.push(String(lead.bedrijfsnaam));
          skipped++;
          continue;
        }
      }

      if (lead.normalized_phone) {
        const { data: existing } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("id")
          .eq("normalized_phone", lead.normalized_phone as string)
          .single();

        if (existing) {
          duplicates.push(String(lead.bedrijfsnaam));
          skipped++;
          continue;
        }
      }

      if (lead.instagram_handle) {
        const { data: existing } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("id")
          .eq("instagram_handle", lead.instagram_handle as string)
          .single();

        if (existing) {
          duplicates.push(String(lead.bedrijfsnaam));
          skipped++;
          continue;
        }
      }

      // Deduplicatie op bedrijfsnaam + stad
      if (lead.bedrijfsnaam && lead.stad) {
        const { data: existing } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("id")
          .eq("bedrijfsnaam", lead.bedrijfsnaam as string)
          .eq("stad", lead.stad as string)
          .single();

        if (existing) {
          duplicates.push(String(lead.bedrijfsnaam));
          skipped++;
          continue;
        }
      }

      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .insert(lead);

      if (error) {
        captureRouteError(error, { route: "/api/admin/acquisitie/import", action: "POST" });
        // console.error(`Import error for ${lead.bedrijfsnaam}:`, error.message);
        errors++;
      } else {
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors,
      duplicates: duplicates.slice(0, 20),
      total: rows.length,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/acquisitie/import", action: "POST" });
    // console.error("CSV import error:", error);
    return NextResponse.json({ error: "Import mislukt" }, { status: 500 });
  }
}
