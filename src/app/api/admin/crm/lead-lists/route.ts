import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const source = url.get("source") || "";
  const city = url.get("city") || "";
  const archived = url.get("archived") === "true";
  const search = url.get("search") || "";

  let query = supabaseAdmin
    .from("crm_lead_lists")
    .select("*")
    .order("created_at", { ascending: false });

  if (archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (source) query = query.eq("source", source);
  if (city) query = query.ilike("city", `%${city}%`);
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data: lists, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Fout bij ophalen leadlijsten" }, { status: 500 });
  }

  // Recalculate counts from actual lead data
  const listIds = (lists || []).map(l => l.id);
  if (listIds.length > 0) {
    const { data: leads } = await supabaseAdmin
      .from("crm_leads")
      .select("lead_list_id, outreach_status")
      .in("lead_list_id", listIds);

    if (leads) {
      const countsMap: Record<string, { lead_count: number; contacted_count: number; replied_count: number; interested_count: number; customer_count: number }> = {};
      for (const lead of leads) {
        const lid = lead.lead_list_id;
        if (!lid) continue;
        if (!countsMap[lid]) countsMap[lid] = { lead_count: 0, contacted_count: 0, replied_count: 0, interested_count: 0, customer_count: 0 };
        countsMap[lid].lead_count++;
        if (lead.outreach_status && lead.outreach_status !== "not_started") countsMap[lid].contacted_count++;
        if (lead.outreach_status === "replied") countsMap[lid].replied_count++;
        if (lead.outreach_status === "interested") countsMap[lid].interested_count++;
        if (lead.outreach_status === "converted") countsMap[lid].customer_count++;
      }

      for (const list of lists || []) {
        const counts = countsMap[list.id];
        if (counts) Object.assign(list, counts);
        else {
          list.lead_count = 0;
          list.contacted_count = 0;
          list.replied_count = 0;
          list.interested_count = 0;
          list.customer_count = 0;
        }
      }
    }
  }

  return NextResponse.json(lists || []);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, source, city, imported_file_name } = body;

  if (!name || !source) {
    return NextResponse.json({ error: "name en source zijn verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_lead_lists")
    .insert({ name, description, source, city, imported_file_name })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Fout bij aanmaken leadlijst" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
