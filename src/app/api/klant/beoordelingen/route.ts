import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

type DienstAanmelding = {
  id: string;
  medewerker: { id: string; naam: string } | null;
  dienst: { id: string; datum: string; locatie: string; klant_id: string } | null;
};

export async function GET() {
  // KRITIEK: Verify signed JWT instead of trusting JSON
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyKlantSession } = await import("@/lib/session");
  const klant = await verifyKlantSession(session.value);
  if (!klant) {
    console.warn("[SECURITY] Invalid klant session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

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

  const teBeoordeelen = (data || []).filter((a) => {
    const typedA = a as unknown as DienstAanmelding;
    return !beoordeeldSet.has(`${typedA.dienst?.id}-${typedA.medewerker?.id}`);
  }).map((a) => {
    const typedA = a as unknown as DienstAanmelding;
    return {
      dienst_id: typedA.dienst?.id || '',
      medewerker_id: typedA.medewerker?.id || '',
      medewerker_naam: typedA.medewerker?.naam || '',
      datum: typedA.dienst?.datum || '',
      locatie: typedA.dienst?.locatie || '',
    };
  });

  return NextResponse.json({ teBeoordeelen });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify signed JWT instead of trusting JSON
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyKlantSession } = await import("@/lib/session");
  const klant = await verifyKlantSession(session.value);
  if (!klant) {
    console.warn("[SECURITY] Invalid klant session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }
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
