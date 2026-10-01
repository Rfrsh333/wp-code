import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { dienstUren, nlMoment, nlVandaag } from "@/lib/nl-tijd";
import { herberekenPlekken } from "@/lib/plekken";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { sendPushToUser } from "@/lib/push-notifications";

// NL-wandkloktijd → echt moment. `new Date("…T18:00")` op een UTC-server las 18:00 UTC (= 20:00 NL),
// waardoor de klant 1-2 uur extra "van tevoren" kreeg en een boete kon ontlopen.
function berekenUrenVanTevoren(dienstDatum: string, dienstTijd: string): number {
  const verschilMs = nlMoment(dienstDatum, dienstTijd).getTime() - Date.now();
  return Math.max(0, verschilMs / (1000 * 60 * 60));
}

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dienst_id, reden } = await request.json().catch(() => ({}));
  if (!dienst_id) return NextResponse.json({ error: "dienst_id required" }, { status: 400 });

  const { data: dienst } = await supabaseAdmin.from("diensten").select("*").eq("id", dienst_id).eq("klant_id", klant.id).single();
  if (!dienst) return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
  if (dienst.status === "geannuleerd") return NextResponse.json({ error: "Al geannuleerd" }, { status: 400 });
  if (dienst.datum < nlVandaag() || ["afgerond", "voltooid"].includes(dienst.status)) {
    return NextResponse.json({ error: "Een afgelopen dienst kan niet meer worden geannuleerd" }, { status: 400 });
  }

  const urenVanTevoren = berekenUrenVanTevoren(dienst.datum, dienst.start_tijd);
  const { data: beleid } = await supabaseAdmin.from("klant_annuleringsbeleid").select("*").eq("klant_id", klant.id).single();
  
  const policy = beleid || { uren_van_tevoren_min: 24, boete_percentage: 50, gebruik_percentage: true, geen_boete_eerste_x_keer: 0, is_actief: true };
  
  let boeteToegepast = false;
  let boeteBedrag = 0;
  let boeteReden = "";

  if (policy.is_actief && urenVanTevoren < policy.uren_van_tevoren_min) {
    const { count } = await supabaseAdmin.from("dienst_annuleringen").select("id", { count: "exact", head: true }).eq("klant_id", klant.id).gte("created_at", nlMoment(`${nlVandaag().slice(0, 7)}-01`, "00:00").toISOString());
    
    if (((count ?? 0) >= policy.geen_boete_eerste_x_keer)) {
      boeteToegepast = true;
      // dienstUren rekent nachtdiensten over middernacht goed (voorheen viel dat terug op 6 uur).
      const duur = dienstUren(String(dienst.start_tijd).slice(0, 5), String(dienst.eind_tijd).slice(0, 5));
      const geschatteUren = Number.isFinite(duur) && duur > 0 ? duur : 6;
      const geschat = (dienst.uurtarief || 0) * (dienst.aantal_nodig || 1) * geschatteUren;
      boeteBedrag = policy.gebruik_percentage ? geschat * (policy.boete_percentage / 100) : policy.boete_vast_bedrag || 0;
      boeteReden = `Late annulering ${urenVanTevoren.toFixed(1)}u van tevoren`;
    } else {
      boeteReden = `Gratis annulering ${(count ?? 0) + 1}/${policy.geen_boete_eerste_x_keer}`;
    }
  } else {
    boeteReden = `Geen boete: ${urenVanTevoren.toFixed(1)}u van tevoren`;
  }

  // Conditioneel: bij een dubbelklik annuleert (en beboet) alleen het eerste verzoek.
  const { data: geannuleerd } = await supabaseAdmin
    .from("diensten")
    .update({ status: "geannuleerd" })
    .eq("id", dienst_id)
    .neq("status", "geannuleerd")
    .select("id");
  if (!geannuleerd || geannuleerd.length === 0) {
    return NextResponse.json({ error: "Al geannuleerd" }, { status: 409 });
  }

  // Aanmeldingen mee annuleren: anders bleef een ingeplande medewerker op een geannuleerde
  // dienst staan (en kwam hij gewoon opdagen).
  const { data: vervallen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .update({ status: "geannuleerd" })
    .eq("dienst_id", dienst_id)
    .in("status", ["aangemeld", "uitgenodigd", ...INGEPLAND_STATUSSEN])
    .select("medewerker_id");
  await herberekenPlekken(dienst_id);
  for (const a of vervallen || []) {
    sendPushToUser(a.medewerker_id, "medewerker", {
      title: "Dienst geannuleerd",
      body: `De dienst ${dienst.functie || ""} op ${dienst.datum} is door de opdrachtgever geannuleerd.`,
      url: "/medewerker/diensten/",
      tag: `dienst-geannuleerd-${dienst_id}`,
    }).catch((e) => captureRouteError(e, { route: "/api/klant/annuleren", action: "PUSH" }));
  }
  
  const { data: ann } = await supabaseAdmin.from("dienst_annuleringen").insert({
    dienst_id, klant_id: klant.id, geannuleerd_door: "klant", reden, uren_van_tevoren: urenVanTevoren,
    boete_toegepast: boeteToegepast, boete_bedrag: boeteBedrag, boete_reden: boeteReden,
    dienst_datum: dienst.datum, dienst_start_tijd: dienst.start_tijd, aantal_medewerkers: dienst.aantal_nodig,
  }).select().single();

  if (boeteToegepast && boeteBedrag > 0) {
    const { error: factuurError } = await supabaseAdmin.from("facturen").insert({
      klant_id: klant.id,
      factuur_nummer: `ANN-${Date.now()}`,
      subtotaal: boeteBedrag,
      btw_bedrag: boeteBedrag * 0.21,
      totaal: boeteBedrag * 1.21,
      status: "open",
      type: "boete",
      beschrijving: `Annuleringsboete - ${boeteReden}`,
      annulering_id: ann?.id ?? null,
    });
    if (factuurError) {
      captureRouteError(factuurError, { route: "/api/klant/annuleren", action: "factuur-insert" });
    }
  }

  return NextResponse.json({ success: true, boete_toegepast: boeteToegepast, boete_bedrag: boeteBedrag, boete_reden: boeteReden });
}

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: beleid } = await supabaseAdmin.from("klant_annuleringsbeleid").select("*").eq("klant_id", klant.id).single();
  const { data: geschiedenis } = await supabaseAdmin.from("dienst_annuleringen").select("*").eq("klant_id", klant.id).order("created_at", { ascending: false }).limit(20);

  return NextResponse.json({ beleid: beleid || { uren_van_tevoren_min: 24, boete_percentage: 50 }, geschiedenis: geschiedenis || [] });
}
