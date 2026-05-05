import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("crm_tags")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Fout bij ophalen tags" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, color, lead_id, tag_id } = body;

  // Assign existing tag to lead
  if (lead_id && tag_id) {
    const { error } = await supabaseAdmin
      .from("crm_lead_tags")
      .insert({ lead_id, tag_id });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Tag al toegewezen" }, { status: 409 });
      }
      return NextResponse.json({ error: "Toewijzen mislukt" }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  }

  // Create new tag
  if (!name) {
    return NextResponse.json({ error: "name is verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_tags")
    .insert({ name, color: color || "#6B7280" })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Tag naam bestaat al" }, { status: 409 });
    }
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const tag_id = url.get("tag_id");
  const lead_id = url.get("lead_id");

  // Remove tag from lead
  if (lead_id && tag_id) {
    const { error } = await supabaseAdmin
      .from("crm_lead_tags")
      .delete()
      .eq("lead_id", lead_id)
      .eq("tag_id", tag_id);

    if (error) {
      return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Delete tag entirely
  if (tag_id) {
    const { error } = await supabaseAdmin
      .from("crm_tags")
      .delete()
      .eq("id", tag_id);

    if (error) {
      return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "tag_id is verplicht" }, { status: 400 });
}
