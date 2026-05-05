import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Column mapping from CSV headers to database fields
const COLUMN_MAP: Record<string, string> = {
  naam: "company_name",
  name: "company_name",
  company_name: "company_name",
  bedrijfsnaam: "company_name",
  stad: "city",
  city: "city",
  adres: "address",
  address: "address",
  postcode: "postal_code",
  postal_code: "postal_code",
  telefoon: "phone",
  phone: "phone",
  email: "email",
  beste_email: "email",
  website: "website",
  instagram_url: "instagram_url",
  facebook_url: "facebook_url",
  google_maps_url: "google_maps_url",
  branche: "category",
  category: "category",
  rating: "rating",
  review_count: "review_count",
  bron: "source",
  source: "source",
  contact_person: "contact_person",
  contactpersoon: "contact_person",
};

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { csv_content, preview_only, skip_duplicates, import_type, lead_list_id, duplicate_scope } = body;

  if (!csv_content) {
    return NextResponse.json({ error: "csv_content is verplicht" }, { status: 400 });
  }

  // Handle Instantly results import
  if (import_type === "instantly") {
    return handleInstantlyImport(csv_content);
  }

  // Standard leads import
  const lines = csv_content.split("\n").filter((l: string) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV moet minimaal een header en data bevatten" }, { status: 400 });
  }

  const headers = parseCSVLine(lines[0]).map((h: string) => h.toLowerCase().trim());
  const mappedHeaders = headers.map((h: string) => COLUMN_MAP[h] || null);

  // Parse rows
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const row: Record<string, unknown> = {};
    mappedHeaders.forEach((field: string | null, idx: number) => {
      if (field && values[idx]) {
        let value: unknown = values[idx];
        if (field === "rating") value = parseFloat(values[idx]) || null;
        if (field === "review_count") value = parseInt(values[idx]) || null;
        row[field] = value;
      }
    });

    if (row.company_name) {
      rows.push(row);
    }
  }

  // Preview mode
  if (preview_only) {
    return NextResponse.json({
      total_rows: rows.length,
      headers,
      mapped_headers: mappedHeaders,
      preview: rows.slice(0, 10),
      unmapped_columns: headers.filter((_: string, i: number) => !mappedHeaders[i]),
    });
  }

  // Duplicate detection
  let duplicates: string[] = [];
  let toInsert = rows;

  if (skip_duplicates !== false) {
    let existingQuery = supabaseAdmin
      .from("crm_leads")
      .select("company_name, city");

    // Scope duplicate check to list or global
    if (duplicate_scope === "list" && lead_list_id) {
      existingQuery = existingQuery.eq("lead_list_id", lead_list_id);
    }

    const { data: existing } = await existingQuery;

    if (existing) {
      const existingSet = new Set(
        existing.map(e => `${(e.company_name || "").toLowerCase()}|${(e.city || "").toLowerCase()}`)
      );

      toInsert = [];
      for (const row of rows) {
        const key = `${((row.company_name as string) || "").toLowerCase()}|${((row.city as string) || "").toLowerCase()}`;
        if (existingSet.has(key)) {
          duplicates.push(row.company_name as string);
        } else {
          toInsert.push(row);
        }
      }
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      imported: 0,
      duplicates_skipped: duplicates.length,
      duplicate_names: duplicates.slice(0, 20),
    });
  }

  // Add lead_list_id to all rows if provided
  if (lead_list_id) {
    for (const row of toInsert) {
      row.lead_list_id = lead_list_id;
    }
  }

  // Insert in batches
  let imported = 0;
  const batchSize = 100;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabaseAdmin.from("crm_leads").insert(batch);
    if (!error) imported += batch.length;
  }

  // Update lead list counts
  if (lead_list_id && imported > 0) {
    const { count } = await supabaseAdmin
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .eq("lead_list_id", lead_list_id);

    await supabaseAdmin
      .from("crm_lead_lists")
      .update({ lead_count: count || 0, updated_at: new Date().toISOString() })
      .eq("id", lead_list_id);
  }

  return NextResponse.json({
    imported,
    duplicates_skipped: duplicates.length,
    duplicate_names: duplicates.slice(0, 20),
    total_processed: rows.length,
  });
}

async function handleInstantlyImport(csv_content: string) {
  const lines = csv_content.split("\n").filter((l: string) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV moet minimaal een header en data bevatten" }, { status: 400 });
  }

  const headers = parseCSVLine(lines[0]).map((h: string) => h.toLowerCase().trim());
  const emailIdx = headers.indexOf("email");
  const statusIdx = headers.indexOf("status");
  const campaignIdIdx = headers.indexOf("campaign_id");
  const campaignNameIdx = headers.indexOf("campaign_name");
  const lastEventIdx = headers.indexOf("last_event_at");

  if (emailIdx === -1) {
    return NextResponse.json({ error: "email kolom is verplicht voor Instantly import" }, { status: 400 });
  }

  let updated = 0;
  let notFound = 0;
  const contactLogs: Array<{ lead_id: string; type: string; notes: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const email = values[emailIdx]?.trim();
    if (!email) continue;

    const status = statusIdx >= 0 ? values[statusIdx]?.trim() : null;
    const campaignId = campaignIdIdx >= 0 ? values[campaignIdIdx]?.trim() : null;
    const campaignName = campaignNameIdx >= 0 ? values[campaignNameIdx]?.trim() : null;
    const lastEvent = lastEventIdx >= 0 ? values[lastEventIdx]?.trim() : null;

    // Find lead by email
    const { data: lead } = await supabaseAdmin
      .from("crm_leads")
      .select("id")
      .eq("email", email)
      .single();

    if (!lead) {
      notFound++;
      continue;
    }

    const leadUpdates: Record<string, unknown> = {};
    if (status) leadUpdates.instantly_email_status = status;
    if (campaignId) leadUpdates.instantly_campaign_id = campaignId;
    if (campaignName) leadUpdates.instantly_campaign_name = campaignName;
    if (lastEvent) leadUpdates.instantly_last_event_at = lastEvent;

    if (status === "sent") {
      leadUpdates.last_email_at = lastEvent || new Date().toISOString();
      leadUpdates.email_count = lead.id; // Will be handled via raw SQL
    }

    if (Object.keys(leadUpdates).length > 0) {
      // Use RPC or direct update for counter increment
      if (status === "sent") {
        await supabaseAdmin.rpc("increment_crm_email_count", { lead_uuid: lead.id });
      }
      delete leadUpdates.email_count;

      await supabaseAdmin.from("crm_leads").update(leadUpdates).eq("id", lead.id);
      updated++;

      // Create contact log for important events
      if (status && ["replied", "bounced", "unsubscribed"].includes(status)) {
        const logType = status === "replied" ? "instantly_replied" : status === "bounced" ? "instantly_bounced" : "instantly_sent";
        contactLogs.push({ lead_id: lead.id, type: logType, notes: `Instantly: ${status}` });
      }
    }
  }

  // Insert contact logs in bulk
  if (contactLogs.length > 0) {
    await supabaseAdmin.from("crm_contact_logs").insert(contactLogs);
  }

  return NextResponse.json({
    updated,
    not_found: notFound,
    contact_logs_created: contactLogs.length,
  });
}
