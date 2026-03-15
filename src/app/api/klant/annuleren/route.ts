import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";

async function getKlant() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return null;
  return await verifyKlantSession(session.value);
}

function berekenUrenVanTevoren(dienstDatum: string, dienstTijd: string): number {
  const dienstDateTime = new Date(`${dienstDatum}T${dienstTijd}`);
  const nu = new Date();
  const verschilMs = dienstDateTime.getTime() - nu.getTime();
  return Math.max(0, verschilMs / (1000 * 60 * 60));
}

export async function POST(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dienst_id, reden } = await request.json();
  if (!dienst_id) return NextResponse.json({ error: "dienst_id required" }, { status: 400 });

  const { data: dienst } = await supabaseAdmin.from("diensten").select("*").eq("id", dienst_id).eq("klant_id", klant.id).single();
  if (!dienst) return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
  if (dienst.status === "geannuleerd") return NextResponse.json({ error: "Al geannuleerd" }, { status: 400 });

  const urenVanTevoren = berekenUrenVanTevoren(dienst.datum, dienst.start_tijd);
  const { data: beleid } = await supabaseAdmin.from("klant_annuleringsbeleid").select("*").eq("klant_id", klant.id).single();
  
  const policy = beleid || { uren_van_tevoren_min: 24, boete_percentage: 50, gebruik_percentage: true, geen_boete_eerste_x_keer: 0, is_actief: true };
  
  let boeteToegepast = false;
  let boeteBedrag = 0;
  let boeteReden = "";

  if (policy.is_actief && urenVanTevoren < policy.uren_van_tevoren_min) {
    const { count } = await supabaseAdmin.from("dienst_annuleringen").select("id", { count: "exact", head: true }).eq("klant_id", klant.id).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    
    if (((count ?? 0) >= policy.geen_boete_eerste_x_keer)) {
      boeteToegepast = true;
      const geschat = (dienst.uurtarief || 0) * (dienst.aantal_nodig || 1) * 6;
      boeteBedrag = policy.gebruik_percentage ? geschat * (policy.boete_percentage / 100) : policy.boete_vast_bedrag || 0;
      boeteReden = `Late annulering ${urenVanTevoren.toFixed(1)}u van tevoren`;
    } else {
      boeteReden = `Gratis annulering ${(count ?? 0) + 1}/${policy.geen_boete_eerste_x_keer}`;
    }
  } else {
    boeteReden = `Geen boete: ${urenVanTevoren.toFixed(1)}u van tevoren`;
  }

  await supabaseAdmin.from("diensten").update({ status: "geannuleerd" }).eq("id", dienst_id);
  
  const { data: ann } = await supabaseAdmin.from("dienst_annuleringen").insert({
    dienst_id, klant_id: klant.id, geannuleerd_door: "klant", reden, uren_van_tevoren: urenVanTevoren,
    boete_toegepast: boeteToegepast, boete_bedrag: boeteBedrag, boete_reden: boeteReden,
    dienst_datum: dienst.datum, dienst_start_tijd: dienst.start_tijd, aantal_medewerkers: dienst.aantal_nodig,
  }).select().single();

  if (boeteToegepast && boeteBedrag > 0) {
    await supabaseAdmin.from("facturen").insert({
      klant_id: klant.id, factuurnummer: `ANN-${Date.now()}`, bedrag: boeteBedrag, btw: boeteBedrag * 0.21,
      totaal: boeteBedrag * 1.21, status: "open", type: "boete", beschrijving: `Annuleringsboete - ${boeteReden}`,
    });
  }

  return NextResponse.json({ success: true, boete_toegepast: boeteToegepast, boete_bedrag: boeteBedrag, boete_reden: boeteReden });
}

export async function GET() {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: beleid } = await supabaseAdmin.from("klant_annuleringsbeleid").select("*").eq("klant_id", klant.id).single();
  const { data: geschiedenis } = await supabaseAdmin.from("dienst_annuleringen").select("*").eq("klant_id", klant.id).order("created_at", { ascending: false }).limit(20);

  return NextResponse.json({ beleid: beleid || { uren_van_tevoren_min: 24, boete_percentage: 50 }, geschiedenis: geschiedenis || [] });
}
