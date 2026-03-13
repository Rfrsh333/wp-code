import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("certificeringen")
    .select("*")
    .eq("medewerker_id", medewerker.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ certificeringen: data || [] });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  const { action, id, data } = await request.json();

  if (action === "create") {
    if (!data?.naam?.trim()) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("certificeringen").insert({
      medewerker_id: medewerker.id,
      naam: data.naam.trim(),
      uitgever: data.uitgever || null,
      behaald_op: data.behaald_op || null,
      verloopt_op: data.verloopt_op || null,
    });

    if (error) {
      return NextResponse.json({ error: "Kon certificering niet opslaan" }, { status: 500 });
    }
  }

  if (action === "delete") {
    await supabaseAdmin
      .from("certificeringen")
      .delete()
      .eq("id", id)
      .eq("medewerker_id", medewerker.id);
  }

  return NextResponse.json({ success: true });
}
