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
    .lt("dienst.datum", new Date().toISOString().split("T")[0])
    .limit(100);

  // Filter al beoordeelde
  const { data: beoordeeld } = await supabaseAdmin
    .from("beoordelingen")
    .select("dienst_id, medewerker_id")
    .eq("klant_id", klant.id)
    .limit(500);

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
  const {
    dienst_id, medewerker_id, score, opmerking,
    score_punctualiteit, score_professionaliteit, score_vaardigheden, score_communicatie,
    zou_opnieuw_boeken,
  } = await request.json();

  // Basisvalidatie van de score (1–5). Voorkomt vergiftiging van het publieke gemiddelde.
  const scoreNum = Number(score);
  if (!dienst_id || !medewerker_id || !Number.isFinite(scoreNum) || scoreNum < 1 || scoreNum > 5) {
    return NextResponse.json({ error: "Ongeldige beoordeling" }, { status: 400 });
  }

  // AUTORISATIE: verifieer dat déze klant déze medewerker voor déze afgeronde dienst
  // mág beoordelen (zelfde criteria als de GET-lijst). Zonder deze check kon een
  // ingelogde klant willekeurige medewerkers beoordelen en hun publieke score/badge manipuleren.
  const vandaag = new Date().toISOString().split("T")[0];
  const { data: aanmelding } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst:diensten!inner(klant_id, datum)")
    .eq("dienst_id", dienst_id)
    .eq("medewerker_id", medewerker_id)
    .eq("status", "geaccepteerd")
    .eq("dienst.klant_id", klant.id)
    .lt("dienst.datum", vandaag)
    .maybeSingle();

  if (!aanmelding) {
    return NextResponse.json(
      { error: "Niet gemachtigd om deze dienst/medewerker te beoordelen" },
      { status: 403 },
    );
  }

  // Voorkom dubbele beoordelingen (app-niveau; DB-constraint als extra laag aanbevolen).
  const { data: bestaand } = await supabaseAdmin
    .from("beoordelingen")
    .select("id")
    .eq("dienst_id", dienst_id)
    .eq("medewerker_id", medewerker_id)
    .eq("klant_id", klant.id)
    .maybeSingle();

  if (bestaand) {
    return NextResponse.json({ error: "Deze dienst is al beoordeeld" }, { status: 409 });
  }

  const { error: insertError } = await supabaseAdmin.from("beoordelingen").insert({
    dienst_id, medewerker_id, klant_id: klant.id, score: scoreNum, opmerking,
    score_punctualiteit: score_punctualiteit || null,
    score_professionaliteit: score_professionaliteit || null,
    score_vaardigheden: score_vaardigheden || null,
    score_communicatie: score_communicatie || null,
    zou_opnieuw_boeken: zou_opnieuw_boeken ?? null,
  });

  if (insertError) {
    return NextResponse.json({ error: "Beoordeling kon niet worden opgeslagen" }, { status: 500 });
  }

  // Update gemiddelde score
  const { data } = await supabaseAdmin
    .from("beoordelingen")
    .select("score")
    .eq("medewerker_id", medewerker_id)
    .limit(500);

  const scores = data?.map(b => b.score) || [];
  const gem = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Bereken badge
  const totalDiensten = scores.length;
  let badge = "starter";
  if (totalDiensten > 50 && gem >= 4.25) badge = "toptalent";      // 50+ diensten, gem >= 8.5/10 (4.25/5)
  else if (totalDiensten > 20 && gem >= 4) badge = "star";          // 21+ diensten, gem >= 8/10 (4/5)
  else if (totalDiensten > 5 && gem >= 3.5) badge = "rising";       // 6+ diensten, gem >= 7/10 (3.5/5)

  await supabaseAdmin.from("medewerkers").update({
    gemiddelde_score: Math.round(gem * 10) / 10,
    aantal_beoordelingen: scores.length,
    badge,
    totaal_diensten: totalDiensten,
  }).eq("id", medewerker_id);

  return NextResponse.json({ success: true });
}
