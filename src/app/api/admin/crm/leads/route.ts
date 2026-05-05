import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const page = parseInt(url.get("page") || "1");
  const per_page = Math.min(parseInt(url.get("per_page") || "50"), 100);
  const search = url.get("search") || "";
  const status = url.get("status") || "";
  const priority = url.get("priority") || "";
  const city = url.get("city") || "";
  const tag_id = url.get("tag_id") || "";
  const sort_by = url.get("sort_by") || "created_at";
  const sort_dir = url.get("sort_dir") === "asc" ? true : false;
  const archived = url.get("archived") === "true";
  // Outreach filters
  const outreach_status = url.get("outreach_status") || "";
  const next_best_channel = url.get("next_best_channel") || "";
  const instantly_email_status = url.get("instantly_email_status") || "";
  const phone_available = url.get("phone_available");
  const email_available = url.get("email_available");
  const instagram_available = url.get("instagram_available");
  const facebook_available = url.get("facebook_available");
  const not_contacted = url.get("not_contacted") === "true";
  const followup_today = url.get("followup_today") === "true";
  const lead_list_id = url.get("lead_list_id") || "";

  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = supabaseAdmin
    .from("crm_leads")
    .select("*, crm_lead_tags(tag_id, crm_tags(id, name, color))", { count: "exact" });

  // Archived filter
  if (archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  // Status filter
  if (status) {
    const statuses = status.split(",");
    if (statuses.length === 1) {
      query = query.eq("status", statuses[0]);
    } else {
      query = query.in("status", statuses);
    }
  }

  if (lead_list_id) query = query.eq("lead_list_id", lead_list_id);
  if (priority) query = query.eq("priority", priority);
  if (city) query = query.ilike("city", `%${city}%`);

  // Outreach filters
  if (outreach_status) query = query.eq("outreach_status", outreach_status);
  if (next_best_channel) query = query.eq("next_best_channel", next_best_channel);
  if (instantly_email_status) query = query.eq("instantly_email_status", instantly_email_status);
  if (phone_available === "true") query = query.eq("phone_available", true);
  if (email_available === "true") query = query.eq("email_available", true);
  if (instagram_available === "true") query = query.eq("instagram_available", true);
  if (facebook_available === "true") query = query.eq("facebook_available", true);
  if (not_contacted) query = query.eq("outreach_status", "not_started");

  if (followup_today) {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    query = query.lte("next_followup_at", todayEnd.toISOString()).not("next_followup_at", "is", null);
  }

  // Search
  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  // Tag filter
  if (tag_id) {
    const { data: taggedLeadIds } = await supabaseAdmin
      .from("crm_lead_tags")
      .select("lead_id")
      .eq("tag_id", tag_id);
    if (taggedLeadIds && taggedLeadIds.length > 0) {
      query = query.in("id", taggedLeadIds.map(t => t.lead_id));
    } else {
      return NextResponse.json({ leads: [], total: 0, page, per_page });
    }
  }

  // Sorting
  const validSortColumns = ["created_at", "company_name", "city", "status", "priority", "last_contacted_at", "next_followup_at", "rating", "outreach_status", "next_best_channel", "last_call_at", "last_email_at", "call_count"];
  const sortColumn = validSortColumns.includes(sort_by) ? sort_by : "created_at";
  query = query.order(sortColumn, { ascending: sort_dir, nullsFirst: false });
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "Fout bij ophalen leads" }, { status: 500 });
  }

  // Transform tags
  const leads = (data || []).map((lead: Record<string, unknown>) => {
    const leadTags = lead.crm_lead_tags as Array<{ tag_id: string; crm_tags: { id: string; name: string; color: string } }> | null;
    return {
      ...lead,
      tags: leadTags?.map(lt => lt.crm_tags).filter(Boolean) || [],
      crm_lead_tags: undefined,
    };
  });

  return NextResponse.json({ leads, total: count || 0, page, per_page });
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { company_name, city, address, postal_code, phone, email, website, instagram_url, facebook_url, google_maps_url, category, rating, review_count, status, priority, source, contact_person } = body;

  if (!company_name) {
    return NextResponse.json({ error: "company_name is verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_leads")
    .insert({
      company_name, city, address, postal_code, phone, email, website,
      instagram_url, facebook_url, google_maps_url, category,
      rating, review_count, status: status || "nieuw",
      priority: priority || "normaal", source, contact_person,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Fout bij aanmaken lead" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { ids, updates } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is verplicht" }, { status: 400 });
  }
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "updates object is verplicht" }, { status: 400 });
  }

  const allowedFields = ["status", "priority", "archived_at", "next_followup_at", "outreach_status", "next_best_channel"];
  const safeUpdates: Record<string, unknown> = {};
  for (const key of Object.keys(updates)) {
    if (allowedFields.includes(key)) {
      safeUpdates[key] = updates[key];
    }
  }

  const { error } = await supabaseAdmin
    .from("crm_leads")
    .update(safeUpdates)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: "Bulk update mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: ids.length });
}
