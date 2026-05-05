import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = request.nextUrl.searchParams.get("lead_id");
  if (!leadId) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("crm_test_shifts")
    .select("*")
    .eq("lead_id", leadId)
    .order("shift_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lead_id, shift_date, shift_time, shift_role, people_count, location, notes } = body;

  if (!lead_id || !shift_date) {
    return NextResponse.json({ error: "lead_id and shift_date required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_test_shifts")
    .insert({
      lead_id,
      shift_date,
      shift_time: shift_time || null,
      shift_role: shift_role || "bediening",
      people_count: people_count || 1,
      location: location || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
