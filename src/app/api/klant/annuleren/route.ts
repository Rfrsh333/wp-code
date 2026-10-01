import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { nlMoment, nlVandaag } from "@/lib/nl-tijd";
import { herberekenPlekken } from "@/lib/plekken";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { sendPushToUser } from "@/lib/push-notifications";
import { isOntbrekendeKolomFout, zonderNieuweSnapshotKolommen } from "@/lib/factuur-klant-snapshot";
import { haalKlantSnapshot } from "@/lib/factuur-klant-snapshot-db";
import {
  berekenAnnuleringsboete,
  STANDAARD_ANNULERINGSBELEID,
  type AnnuleringsBeleid,
  type BoeteUitkomst,
} from "@/lib/klant-annuleringsboete";

// NL-wandkloktijd → echt moment. `new Date("…T18:00")` op een UTC-server las 18:00 UTC (= 20:00 NL),
// waardoor de klant 1-2 uur extra "van tevoren" kreeg en een boete kon ontlopen.
function berekenUrenVanTevoren(dienstDatum: string, dienstTijd: string): number {
  const verschilMs = nlMoment(dienstDatum, dienstTijd).getTime() - Date.now();
  return Math.max(0, verschilMs / (1000 * 60 * 60));
}

type Dienst = Record<string, unknown> & {
  id: string;
  status: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  uurtarief: number | null;
  aantal_nodig: number | null;
  functie: string | null;
};

/** Dienst van deze klant die nog geannuleerd mag worden, of een foutantwoord (zelfde checks voor POST en preview). */
async function haalAnnuleerbareDienst(
  klantId: string,
  dienstId: string,
): Promise<{ dienst: Dienst } | { fout: NextResponse }> {
  const { data: dienst } = await supabaseAdmin.from("diensten").select("*").eq("id", dienstId).eq("klant_id", klantId).single();
  if (!dienst) return { fout: NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 }) };
  if (dienst.status === "geannuleerd") return { fout: NextResponse.json({ error: "Al geannuleerd" }, { status: 400 }) };
  if (dienst.datum < nlVandaag() || ["afgerond", "voltooid"].includes(dienst.status)) {
    return { fout: NextResponse.json({ error: "Een afgelopen dienst kan niet meer worden geannuleerd" }, { status: 400 }) };
  }
  return { dienst: dienst as Dienst };
}

/**
 * Eén berekening voor de echte annulering én de preview: beleid + annuleringen deze maand ophalen
 * en berekenAnnuleringsboete toepassen. Wijzigt niets.
 */
async function bepaalBoete(
  klantId: string,
  dienst: Dienst,
): Promise<BoeteUitkomst & { urenVanTevoren: number; beleid: AnnuleringsBeleid }> {
  const urenVanTevoren = berekenUrenVanTevoren(dienst.datum, dienst.start_tijd);
  const { data: beleid } = await supabaseAdmin.from("klant_annuleringsbeleid").select("*").eq("klant_id", klantId).single();
  const policy = (beleid as AnnuleringsBeleid | null) || STANDAARD_ANNULERINGSBELEID;

  let annuleringenDezeMaand = 0;
  if (policy.is_actief && urenVanTevoren < policy.uren_van_tevoren_min) {
    const { count } = await supabaseAdmin.from("dienst_annuleringen").select("id", { count: "exact", head: true }).eq("klant_id", klantId).gte("created_at", nlMoment(`${nlVandaag().slice(0, 7)}-01`, "00:00").toISOString());
    annuleringenDezeMaand = count ?? 0;
  }

  const uitkomst = berekenAnnuleringsboete({ dienst, beleid: policy, urenVanTevoren, annuleringenDezeMaand });
  return { ...uitkomst, urenVanTevoren, beleid: policy };
}

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dienst_id, reden } = await request.json().catch(() => ({}));
  if (!dienst_id) return NextResponse.json({ error: "dienst_id required" }, { status: 400 });

  const gevonden = await haalAnnuleerbareDienst(klant.id, dienst_id);
  if ("fout" in gevonden) return gevonden.fout;
  const { dienst } = gevonden;

  const { boeteToegepast, boeteBedrag, boeteReden, urenVanTevoren } = await bepaalBoete(klant.id, dienst);

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
    after(() =>
      sendPushToUser(a.medewerker_id, "medewerker", {
        title: "Dienst geannuleerd",
        body: `De dienst ${dienst.functie || ""} op ${dienst.datum} is door de opdrachtgever geannuleerd.`,
        url: "/medewerker/diensten/",
        tag: `dienst-geannuleerd-${dienst_id}`,
      }).catch((e) => captureRouteError(e, { route: "/api/klant/annuleren", action: "PUSH" })),
    );
  }
  
  const { data: ann } = await supabaseAdmin.from("dienst_annuleringen").insert({
    dienst_id, klant_id: klant.id, geannuleerd_door: "klant", reden, uren_van_tevoren: urenVanTevoren,
    boete_toegepast: boeteToegepast, boete_bedrag: boeteBedrag, boete_reden: boeteReden,
    dienst_datum: dienst.datum, dienst_start_tijd: dienst.start_tijd, aantal_medewerkers: dienst.aantal_nodig,
  }).select().single();

  if (boeteToegepast && boeteBedrag > 0) {
    // Klant-NAW vastleggen op de boetefactuur; zonder migratie opnieuw zonder de nieuwe kolommen.
    const snapshot = await haalKlantSnapshot(klant.id);
    const boeteFactuur = {
      klant_id: klant.id,
      ...(snapshot ?? {}),
      factuur_nummer: `ANN-${Date.now()}`,
      subtotaal: boeteBedrag,
      btw_bedrag: boeteBedrag * 0.21,
      totaal: boeteBedrag * 1.21,
      status: "open",
      type: "boete",
      beschrijving: `Annuleringsboete - ${boeteReden}`,
      annulering_id: ann?.id ?? null,
    };
    let { error: factuurError } = await supabaseAdmin.from("facturen").insert(boeteFactuur);
    if (snapshot && isOntbrekendeKolomFout(factuurError)) {
      ({ error: factuurError } = await supabaseAdmin.from("facturen").insert(zonderNieuweSnapshotKolommen(boeteFactuur)));
    }
    if (factuurError) {
      captureRouteError(factuurError, { route: "/api/klant/annuleren", action: "factuur-insert" });
    }
  }

  return NextResponse.json({ success: true, boete_toegepast: boeteToegepast, boete_bedrag: boeteBedrag, boete_reden: boeteReden });
}

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Preview: ?dienst_id=… rekent exact zoals de POST, zonder iets te wijzigen.
  const previewDienstId = request.nextUrl.searchParams.get("dienst_id");
  if (previewDienstId) {
    const gevonden = await haalAnnuleerbareDienst(klant.id, previewDienstId);
    if ("fout" in gevonden) return gevonden.fout;
    const boete = await bepaalBoete(klant.id, gevonden.dienst);
    return NextResponse.json(
      {
        dienst_id: previewDienstId,
        boete_toegepast: boete.boeteToegepast,
        boete_bedrag: boete.boeteBedrag,
        boete_reden: boete.boeteReden,
        uren_tot_start: Math.round(boete.urenVanTevoren * 10) / 10,
        binnen_boetegrens: boete.binnenGrens,
        uren_van_tevoren_min: boete.beleid.uren_van_tevoren_min,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { data: beleid } = await supabaseAdmin.from("klant_annuleringsbeleid").select("*").eq("klant_id", klant.id).single();
  const { data: geschiedenis } = await supabaseAdmin.from("dienst_annuleringen").select("*").eq("klant_id", klant.id).order("created_at", { ascending: false }).limit(20);

  return NextResponse.json({ beleid: beleid || { uren_van_tevoren_min: 24, boete_percentage: 50 }, geschiedenis: geschiedenis || [] });
}
