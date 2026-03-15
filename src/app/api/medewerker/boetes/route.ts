import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: boetes } = await supabaseAdmin
    .from("boetes")
    .select("id, bedrag, reden, status, created_at, dienst:diensten(datum, locatie, functie)")
    .eq("medewerker_id", medewerker.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ boetes: boetes || [] });
}
