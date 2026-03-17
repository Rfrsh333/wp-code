import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// Public GET — anyone can fetch the options (klant portal needs these)
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");

  let query = supabaseAdmin
    .from("platform_options")
    .select("id, type, value, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("value", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

// Admin POST — create/update/delete options
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { action, ...body } = await request.json();

  if (action === "create") {
    const { type, value, sort_order } = body;
    const { error } = await supabaseAdmin
      .from("platform_options")
      .insert({ type, value, sort_order: sort_order || 0, active: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "update") {
    const { id, ...updates } = body;
    const { error } = await supabaseAdmin
      .from("platform_options")
      .update(updates)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    const { id } = body;
    // Soft delete — set active to false
    const { error } = await supabaseAdmin
      .from("platform_options")
      .update({ active: false })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "seed") {
    // Seed initial data from hardcoded lists
    const functies = [
      'Administratief medewerker', 'Barista', 'Bartending', 'Bediening', 'Bedrijfscatering',
      'Bezorging', 'Catering', 'Festivalmedewerker', 'Garderobe', 'Gebruikersonderzoeken',
      'Hosting', 'Housekeeping', 'Hulpkok', 'Productiemedewerker', 'Receptie medewerker',
      'Roomservice', 'Schoonmaak', 'Sitecrew - Hospitality', 'Spoelkeuken medewerker',
      'Training', 'Zelfstandig werkend kok'
    ];
    const vaardigheden = [
      'Barista ervaring', 'Cocktail making', 'Food handling certificaat', 'HACCP certificaat',
      'Kassa ervaring', 'POS systeem kennis', 'Engels spreken', 'Zweeds spreken',
      'Leiding geven', 'Event ervaring', 'Rijbewijs B', 'Heftruckcertificaat',
      'VCA certificaat', 'BHV diploma', 'Schoonmaak ervaring', 'Klantenservice',
    ];

    const rows = [
      ...functies.map((v, i) => ({ type: "functie", value: v, sort_order: i, active: true })),
      ...vaardigheden.map((v, i) => ({ type: "vaardigheid", value: v, sort_order: i, active: true })),
    ];

    const { error } = await supabaseAdmin
      .from("platform_options")
      .upsert(rows, { onConflict: "type,value" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, count: rows.length });
  }

  return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
}
