import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const klant = await verifyKlantSession(session.value);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Haal afgeronde diensten op die nog niet beoordeeld zijn
  const { data } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      id, medewerker:medewerkers(id, naam),
      dienst:diensten!inner(id, datum, locatie, klant_id)
    `)
    .eq("dienst.klant_id", klant.id)
    .eq("status", "geaccepteerd")
    .lt("dienst.datum", new Date().toISOString().split("T")[0]);

  // Filter al beoordeelde
  const { data: beoordeeld } = await supabaseAdmin
    .from("beoordelingen")
    .select("dienst_id, medewerker_id")
    .eq("klant_id", klant.id);

  const beoordeeldSet = new Set((beoordeeld || []).map(b => `${b.dienst_id}-${b.medewerker_id}`));

  const teBeoordeelen = (data || []).filter((a: any) =>
    !beoordeeldSet.has(`${a.dienst?.id}-${a.medewerker?.id}`)
  ).map((a: any) => ({
    dienst_id: a.dienst?.id,
    medewerker_id: a.medewerker?.id,
    medewerker_naam: a.medewerker?.naam,
    datum: a.dienst?.datum,
    locatie: a.dienst?.locatie,
  }));

  return NextResponse.json({ teBeoordeelen });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const klant = await verifyKlantSession(session.value);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dienst_id, medewerker_id, score, opmerking } = await request.json();

  await supabaseAdmin.from("beoordelingen").insert({
    dienst_id, medewerker_id, klant_id: klant.id, score, opmerking
  });

  // Update gemiddelde score
  const { data } = await supabaseAdmin
    .from("beoordelingen")
    .select("score")
    .eq("medewerker_id", medewerker_id);

  const scores = data?.map(b => b.score) || [];
  const gem = scores.reduce((a, b) => a + b, 0) / scores.length;

  await supabaseAdmin.from("medewerkers").update({
    gemiddelde_score: Math.round(gem * 10) / 10,
    aantal_beoordelingen: scores.length
  }).eq("id", medewerker_id);

  return NextResponse.json({ success: true });
}
