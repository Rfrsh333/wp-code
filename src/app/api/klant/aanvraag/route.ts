import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { sendTelegramAlert } from "@/lib/telegram";
import { sendPushToAllOfType, sendPushToUser } from "@/lib/push-notifications";
import { captureRouteError } from "@/lib/sentry-utils";
import { getAllPricingOverview } from "@/lib/pricing/smart-pricing";
import { nlVandaag } from "@/lib/nl-tijd";
import { kiesDienstVoorFavoriet, parseUurtarief, uurtariefFout } from "@/lib/klant-portaal-regels";

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const TIJD = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ondergrens voor het uurtarief bij self-service aanvragen: het laagste basistarief uit de
 * bestaande prijsbron (lib/pricing/smart-pricing, BASIS_TARIEVEN). Zo kan een klant geen
 * dienst plaatsen onder het laagste tarief dat TopTalent zelf hanteert.
 * Lukt het ophalen niet, dan geen ondergrens (0) i.p.v. alle aanvragen te blokkeren.
 */
async function minimaalUurtarief(): Promise<number> {
  try {
    const { tarieven } = await getAllPricingOverview();
    const basis = tarieven.map((t) => t.basis).filter((b) => Number.isFinite(b) && b > 0);
    return basis.length ? Math.min(...basis) : 0;
  } catch (e) {
    captureRouteError(e, { route: "/api/klant/aanvraag", action: "MIN_TARIEF" });
    return 0;
  }
}

type FunctieRegel = { functie: string; aantal: number; tarief: number };

/**
 * Nodigt de gekozen favorieten uit (status `uitgenodigd`). De medewerker ziet de uitnodiging
 * onder "Aangeboden" in de app en neemt hem aan of af (api/medewerker/diensten/accept|decline).
 * Alleen medewerkers die echt bij deze klant als favoriet staan; bij meerdere functies de
 * dienst die bij de medewerker past.
 */
async function nodigFavorietenUit(
  klantId: string,
  medewerkerIds: string[],
  diensten: { id: string; functie: string | null }[],
  omschrijving: string,
): Promise<{ uitgenodigd: number; overgeslagen: number }> {
  if (medewerkerIds.length === 0 || diensten.length === 0) return { uitgenodigd: 0, overgeslagen: 0 };

  const { data: favorieten } = await supabaseAdmin
    .from("klant_favoriete_medewerkers")
    .select("medewerker_id, medewerker:medewerkers(id, functie, status)")
    .eq("klant_id", klantId)
    .in("medewerker_id", medewerkerIds);

  let uitgenodigd = 0;
  let overgeslagen = medewerkerIds.length - (favorieten?.length ?? 0);

  for (const fav of favorieten || []) {
    const med = (Array.isArray(fav.medewerker) ? fav.medewerker[0] : fav.medewerker) as
      | { id: string; functie: string | string[] | null; status: string | null }
      | null;
    const dienstId = med && med.status === "actief" ? kiesDienstVoorFavoriet(med.functie, diensten) : null;
    if (!med || !dienstId) {
      overgeslagen++;
      continue;
    }

    const { error } = await supabaseAdmin.from("dienst_aanmeldingen").insert({
      dienst_id: dienstId,
      medewerker_id: med.id,
      status: "uitgenodigd",
    });
    if (error) {
      // 23505 = al een aanmelding voor deze dienst (unieke index); geen fout voor de klant.
      if (error.code !== "23505") captureRouteError(error, { route: "/api/klant/aanvraag", action: "UITNODIGEN" });
      overgeslagen++;
      continue;
    }
    uitgenodigd++;

    sendPushToUser(med.id, "medewerker", {
      title: "Je bent uitgenodigd voor een dienst",
      body: omschrijving,
      url: "/medewerker/diensten/",
      tag: `uitnodiging-${dienstId}`,
    }).catch((e) => captureRouteError(e, { route: "/api/klant/aanvraag", action: "PUSH_UITNODIGING" }));
  }

  return { uitgenodigd, overgeslagen };
}

export async function POST(request: NextRequest) {
  try {
    const klant = await getKlantSession(request);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify klant exists in database
    const { data: klantData, error: klantError } = await supabaseAdmin
      .from("klanten")
      .select("id, bedrijfsnaam")
      .eq("id", klant.id)
      .single();

    if (klantError || !klantData) {
      captureRouteError(klantError, { route: "/api/klant/aanvraag", action: "POST" });
      return NextResponse.json({ error: "Klant account niet gevonden. Neem contact op met support." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
    }
    const { functie, categorie_id, functie_id, vereiste_taal, vereiste_vaardigheden, functies_met_aantal, datum, start_tijd, eind_tijd, aantal, locatie, opmerkingen, favoriet_medewerker_ids, uurtarief, afbeelding_url } = body;

    // Datum en tijden
    if (typeof datum !== "string" || !DATUM.test(datum) || typeof start_tijd !== "string" || !TIJD.test(start_tijd) || typeof eind_tijd !== "string" || !TIJD.test(eind_tijd)) {
      return NextResponse.json({ error: "Datum en tijd zijn verplicht" }, { status: 400 });
    }
    if (start_tijd.slice(0, 5) === eind_tijd.slice(0, 5)) {
      return NextResponse.json({ error: "Start- en eindtijd mogen niet gelijk zijn" }, { status: 400 });
    }
    // Datum vandaag of later (NL-kalenderdatum; voorheen UTC-middernacht vs. lokale tijd)
    if (datum < nlVandaag()) {
      return NextResponse.json({ error: "Datum moet in de toekomst liggen" }, { status: 400 });
    }

    // Functies + tarieven normaliseren (nieuw formaat: meerdere functies met eigen tarief;
    // oud formaat: één functie + globaal tarief).
    const minimum = await minimaalUurtarief();
    const globaalTarief = parseUurtarief(uurtarief);
    const regels: FunctieRegel[] = [];

    if (Array.isArray(functies_met_aantal) && functies_met_aantal.length > 0) {
      if (functies_met_aantal.length > 20) {
        return NextResponse.json({ error: "Te veel functies in één aanvraag" }, { status: 400 });
      }
      for (const f of functies_met_aantal as { functie?: unknown; aantal?: unknown; uurtarief?: unknown }[]) {
        const naam = typeof f?.functie === "string" ? f.functie.trim().slice(0, 100) : "";
        const n = Number(f?.aantal);
        if (!naam || !Number.isInteger(n) || n < 1 || n > 50) {
          return NextResponse.json({ error: "Elke functie heeft een naam en een aantal tussen 1 en 50 nodig" }, { status: 400 });
        }
        const eigen = parseUurtarief(f?.uurtarief);
        const tarief = Number.isFinite(eigen) && eigen > 0 ? eigen : globaalTarief;
        const fout = uurtariefFout(tarief, minimum);
        if (fout) return NextResponse.json({ error: `${naam}: ${fout}`, min_uurtarief: minimum }, { status: 400 });
        regels.push({ functie: naam, aantal: n, tarief });
      }
    } else {
      if (typeof functie !== "string" || !functie.trim()) {
        return NextResponse.json({ error: "Selecteer minimaal één functie" }, { status: 400 });
      }
      const n = parseInt(aantal) || 1;
      if (n < 1 || n > 50) return NextResponse.json({ error: "Aantal moet tussen 1 en 50 liggen" }, { status: 400 });
      const fout = uurtariefFout(globaalTarief, minimum);
      if (fout) return NextResponse.json({ error: fout, min_uurtarief: minimum }, { status: 400 });
      regels.push({ functie: functie.trim().slice(0, 100), aantal: n, tarief: globaalTarief });
    }

    // Alleen een afbeelding die via /api/klant/dienst-afbeelding voor déze klant is geüpload.
    const afbeelding =
      typeof afbeelding_url === "string" && afbeelding_url.includes(`/dienst-afbeeldingen/diensten/${klantData.id}/`)
        ? afbeelding_url
        : null;

    const gemeenschappelijk: Record<string, unknown> = {
      klant_id: klantData.id,
      klant_naam: klantData.bedrijfsnaam || null,
      datum,
      start_tijd,
      eind_tijd,
      locatie: typeof locatie === "string" && locatie.trim() ? locatie.trim().slice(0, 300) : null,
      status: "open",
      notities: typeof opmerkingen === "string" && opmerkingen.trim() ? opmerkingen.trim().slice(0, 2000) : null,
    };
    if (["nl", "en", "nl_en"].includes(vereiste_taal)) gemeenschappelijk.vereiste_taal = vereiste_taal;
    if (Array.isArray(vereiste_vaardigheden) && vereiste_vaardigheden.length > 0) {
      gemeenschappelijk.vereiste_vaardigheden = vereiste_vaardigheden.filter((v: unknown) => typeof v === "string").slice(0, 30);
    }
    if (afbeelding) gemeenschappelijk.afbeelding_url = afbeelding;

    const nieuwFormaat = Array.isArray(functies_met_aantal) && functies_met_aantal.length > 0;
    const dienstenToCreate: Record<string, unknown>[] = [];

    for (const regel of regels) {
      const insertData: Record<string, unknown> = {
        ...gemeenschappelijk,
        functie: nieuwFormaat ? regel.functie.toLowerCase() : regel.functie,
        aantal_nodig: regel.aantal,
        plekken_totaal: regel.aantal,
        plekken_beschikbaar: regel.aantal,
        uurtarief: regel.tarief,
      };

      if (nieuwFormaat) {
        // Lookup functie_id and categorie_id from dienst_functies table
        const { data: functieRef } = await supabaseAdmin
          .from("dienst_functies")
          .select("id, categorie_id")
          .ilike("naam", regel.functie)
          .maybeSingle();

        if (functieRef) {
          insertData.functie_id = functieRef.id;
          insertData.categorie_id = functieRef.categorie_id;
        }
      } else {
        if (typeof categorie_id === "string" && UUID.test(categorie_id)) insertData.categorie_id = categorie_id;
        if (typeof functie_id === "string" && UUID.test(functie_id)) insertData.functie_id = functie_id;
      }

      dienstenToCreate.push(insertData);
    }

    // Insert all diensten
    const { data: diensten, error } = await supabaseAdmin
      .from("diensten")
      .insert(dienstenToCreate)
      .select("id, functie");

    if (error) {
      captureRouteError(error, { route: "/api/klant/aanvraag", action: "POST" });
      return NextResponse.json({ error: "Aanvraag opslaan mislukt. Probeer het opnieuw." }, { status: 500 });
    }

    const functieSummary = regels.map((r) => `${r.functie} (${r.aantal}x)`).join(", ");
    const totaalPersoneel = regels.reduce((sum, r) => sum + r.aantal, 0);
    const omschrijving = `${functieSummary} op ${datum} (${start_tijd.slice(0, 5)} - ${eind_tijd.slice(0, 5)})${gemeenschappelijk.locatie ? ` in ${gemeenschappelijk.locatie}` : ""}`;

    // Favorieten uit stap 4 daadwerkelijk uitnodigen (voorheen werd de keuze genegeerd).
    const favorietIds = Array.isArray(favoriet_medewerker_ids)
      ? [...new Set(favoriet_medewerker_ids.filter((i: unknown): i is string => typeof i === "string" && UUID.test(i)))].slice(0, 50)
      : [];
    const uitnodigingen = await nodigFavorietenUit(klantData.id, favorietIds, diensten || [], omschrijving);

    // Telegram notification (geen PII — AVG compliance)
    sendTelegramAlert(
      `<b>🆕 Nieuwe personeelsaanvraag</b>\n` +
      `👥 ${totaalPersoneel} personen op ${datum}\n` +
      `🕐 ${start_tijd} - ${eind_tijd}\n` +
      `📋 ${diensten?.length || 1} diensten — bekijk in dashboard`
    ).catch((e) => captureRouteError(e, { route: "/api/klant/aanvraag", action: "TELEGRAM" }));

    // Push notificatie naar alle medewerkers: nieuwe dienst beschikbaar
    sendPushToAllOfType("medewerker", {
      title: "Nieuwe dienst beschikbaar!",
      body: omschrijving,
      url: "/medewerker/diensten/",
      tag: `nieuwe-dienst-${datum}`,
    }).catch((e) => captureRouteError(e, { route: "/api/klant/aanvraag", action: "PUSH" }));

    return NextResponse.json({
      success: true,
      dienst_ids: diensten?.map(d => d.id) || [],
      count: diensten?.length || 0,
      favorieten_uitgenodigd: uitnodigingen.uitgenodigd,
      favorieten_overgeslagen: uitnodigingen.overgeslagen,
    });
  } catch (err) {
    captureRouteError(err, { route: "/api/klant/aanvraag", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis bij het opslaan" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const klant = await getKlantSession(request);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get previous locations for this klant
    const [{ data: locaties, error }, minimum] = await Promise.all([
      supabaseAdmin
        .from("diensten")
        .select("locatie")
        .eq("klant_id", klant.id)
        .not("locatie", "is", null)
        .order("datum", { ascending: false })
        .limit(50),
      minimaalUurtarief(),
    ]);

    if (error) {
      captureRouteError(error, { route: "/api/klant/aanvraag", action: "GET" });
      return NextResponse.json({ locaties: [], min_uurtarief: minimum });
    }

    const uniqueLocaties = [...new Set((locaties || []).map((l) => l.locatie).filter(Boolean))];

    return NextResponse.json({ locaties: uniqueLocaties, min_uurtarief: minimum });
  } catch (err) {
    captureRouteError(err, { route: "/api/klant/aanvraag", action: "GET" });
    return NextResponse.json({ locaties: [] });
  }
}
