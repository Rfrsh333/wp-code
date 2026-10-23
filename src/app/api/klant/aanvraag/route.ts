import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { sendTelegramAlert } from "@/lib/telegram";
import { sendPushToUser } from "@/lib/push-notifications";
import { captureRouteError } from "@/lib/sentry-utils";
import {
  alleRichtlijnen,
  MARGE_PER_UUR,
  tariefAdvies,
  WETTELIJK_MINIMUMUURLOON,
  WETTELIJK_MINIMUMUURLOON_PEILDATUM,
} from "@/lib/pricing/richtlijntarieven";
import { nlVandaag } from "@/lib/nl-tijd";
import { begintijdVoorbij, kiesDienstVoorFavoriet, parseUurtarief, uurtariefFout } from "@/lib/klant-portaal-regels";
import { checkRedisRateLimit, klantAanvraagRateLimit } from "@/lib/rate-limit-redis";
import { isDemoKlant, medewerkersInWereld } from "@/lib/demo";
import { laadOnboardingStand } from "@/lib/klant-onboarding";
import { beoordeelDienstPlaatsen, DIENST_STATUS_IN_CONTROLE } from "@/lib/klant-controle-regels";
import { meldDienstInControle, pushNieuweDienst } from "@/lib/klant-controle";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { werkDienstLocatiesBij } from "@/lib/locatie/locatie-opslag";
import { parseKledingvoorschrift, parsePauzeMinuten } from "@/lib/medewerker/reactie-regels";
import { kiesDienstAfbeelding } from "@/lib/sfeerfotos";

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const TIJD = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uurtarief: geen minimum of maximum (besluit Rachid 23-10-2026), wel richtlijnen per functie
 * (lib/pricing/richtlijntarieven.ts). Een tarief onder de richtlijn, of waarbij de medewerker
 * (klanttarief − € 4) onder het wettelijk minimumloon uitkomt, geeft een zachte waarschuwing in
 * het antwoord (`tarief_waarschuwingen`), geen blokkade. Alleen een ongeldig bedrag (≤ 0) of een
 * kennelijke tikfout (> € 1000) wordt geweigerd.
 */

type FunctieRegel = { functie: string; aantal: number; tarief: number };

/**
 * Nodigt de gekozen favorieten uit (status `uitgenodigd`). De medewerker ziet de uitnodiging
 * onder "Aangeboden" in de app en neemt hem aan of af (api/medewerker/diensten/accept|decline).
 * Alleen medewerkers die echt bij deze klant als favoriet staan; bij meerdere functies de
 * dienst die bij de medewerker past.
 */
async function nodigFavorietenUit(
  klantId: string,
  gekozenIds: string[],
  diensten: { id: string; functie: string | null }[],
  omschrijving: string,
  demo: boolean,
): Promise<{ uitgenodigd: number; overgeslagen: number }> {
  if (gekozenIds.length === 0 || diensten.length === 0) return { uitgenodigd: 0, overgeslagen: 0 };

  // Demo-klant nodigt alleen demo-medewerkers uit, een echte klant nooit een demo-medewerker.
  const medewerkerIds = await medewerkersInWereld(gekozenIds, demo);
  const buitenWereld = gekozenIds.length - medewerkerIds.length;
  if (medewerkerIds.length === 0) return { uitgenodigd: 0, overgeslagen: buitenWereld };

  const { data: favorieten } = await supabaseAdmin
    .from("klant_favoriete_medewerkers")
    .select("medewerker_id, medewerker:medewerkers(id, functie, status)")
    .eq("klant_id", klantId)
    .in("medewerker_id", medewerkerIds);

  let uitgenodigd = 0;
  let overgeslagen = buitenWereld + medewerkerIds.length - (favorieten?.length ?? 0);

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

    after(() =>
      sendPushToUser(med.id, "medewerker", {
        title: "Je bent uitgenodigd voor een dienst",
        body: omschrijving,
        url: "/medewerker/diensten/",
        tag: `uitnodiging-${dienstId}`,
      }).catch((e) => captureRouteError(e, { route: "/api/klant/aanvraag", action: "PUSH_UITNODIGING" })),
    );
  }

  return { uitgenodigd, overgeslagen };
}

export async function POST(request: NextRequest) {
  try {
    const klant = await getKlantSession(request);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Per klantaccount begrenzen: elke aanvraag kan een push naar (veel) medewerkers geven.
    const limiet = await checkRedisRateLimit(`klant-aanvraag:${klant.id}`, klantAanvraagRateLimit);
    if (!limiet.success) {
      return NextResponse.json(
        { error: "U heeft in korte tijd veel aanvragen geplaatst. Probeer het over een uur opnieuw of neem contact op met TopTalent." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limiet.reset - Date.now()) / 1000))) } },
      );
    }

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

    // Demo-account (reviewer): dienst wel aanmaken, maar alleen zichtbaar voor demo-medewerkers
    // en geen Telegram of push naar echte mensen (lib/demo.ts).
    const demo = await isDemoKlant(klantData.id);

    // E-mailadres bevestigd? En is de klant al door TopTalent gecontroleerd? Zo niet, dan gaan
    // de diensten eerst langs TopTalent (status in_controle, geen push). Zonder migratie
    // 20261023_klant_onboarding.sql geldt iedereen als bevestigd en gecontroleerd.
    const stand = await laadOnboardingStand(klantData.id);
    const plaatsen = beoordeelDienstPlaatsen({ emailBevestigd: stand.emailBevestigd, gecontroleerd: stand.gecontroleerd, demo });
    if (!plaatsen.ok) {
      return NextResponse.json({ error: plaatsen.error, code: plaatsen.code }, { status: plaatsen.status });
    }
    const inControle = plaatsen.dienstStatus === DIENST_STATUS_IN_CONTROLE;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
    }
    const { functie, categorie_id, functie_id, vereiste_taal, vereiste_vaardigheden, functies_met_aantal, datum, start_tijd, eind_tijd, aantal, locatie, opmerkingen, favoriet_medewerker_ids, uurtarief, afbeelding_url, sfeerfoto_id, kledingvoorschrift, pauze_minuten } = body;

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
    // Vandaag met een begintijd die al voorbij is (NL-tijd)
    if (begintijdVoorbij(datum, start_tijd)) {
      return NextResponse.json(
        { error: "De begintijd ligt al in het verleden. Kies een latere begintijd of een andere datum." },
        { status: 400 },
      );
    }

    // Kledingvoorschrift en pauze: eigen velden (uitgebreid reageren). `opmerkingen` blijft notities.
    const kleding = parseKledingvoorschrift(kledingvoorschrift);
    if (!kleding.ok) return NextResponse.json({ error: kleding.error }, { status: 400 });
    const pauze = parsePauzeMinuten(pauze_minuten, { start_tijd, eind_tijd });
    if (!pauze.ok) return NextResponse.json({ error: pauze.error }, { status: 400 });

    // Functies + tarieven normaliseren (nieuw formaat: meerdere functies met eigen tarief;
    // oud formaat: één functie + globaal tarief).
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
        const fout = uurtariefFout(tarief, 0);
        if (fout) return NextResponse.json({ error: `${naam}: ${fout}` }, { status: 400 });
        regels.push({ functie: naam, aantal: n, tarief });
      }
    } else {
      if (typeof functie !== "string" || !functie.trim()) {
        return NextResponse.json({ error: "Selecteer minimaal één functie" }, { status: 400 });
      }
      const n = parseInt(aantal) || 1;
      if (n < 1 || n > 50) return NextResponse.json({ error: "Aantal moet tussen 1 en 50 liggen" }, { status: 400 });
      const fout = uurtariefFout(globaalTarief, 0);
      if (fout) return NextResponse.json({ error: fout }, { status: 400 });
      regels.push({ functie: functie.trim().slice(0, 100), aantal: n, tarief: globaalTarief });
    }

    // Zachte waarschuwingen per functie (geen blokkade): onder de richtlijn / onder het minimumloon.
    const tariefWaarschuwingen = regels
      .map((r) => ({ functie: r.functie, uurtarief: r.tarief, ...tariefAdvies(r.tarief, r.functie) }))
      .filter((a) => a.waarschuwing)
      .map((a) => ({
        functie: a.functie,
        uurtarief: a.uurtarief,
        medewerker_uurloon: a.medewerkerUurloon,
        onder_richtlijn: a.onderRichtlijn,
        onder_minimumloon: a.onderMinimumloon,
        tekst: a.waarschuwing as string,
      }));

    // Foto voor deze dienst (lib/sfeerfotos.ts): een standaardfoto (`sfeerfoto_id` of een
    // catalogus-URL in `afbeelding_url`) of een eigen upload van déze klant via
    // /api/klant/dienst-afbeelding. Niets gekozen: de dienst volgt de bedrijfsfoto, anders een
    // standaardfoto per functie. Een ongeldige keuze blokkeert de aanvraag niet (waarschuwing).
    const fotoKeuze = kiesDienstAfbeelding(
      { sfeerfoto_id, afbeelding_url },
      { klantId: klantData.id, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL },
    );
    const afbeelding = fotoKeuze.url;

    const gemeenschappelijk: Record<string, unknown> = {
      klant_id: klantData.id,
      klant_naam: klantData.bedrijfsnaam || null,
      datum,
      start_tijd,
      eind_tijd,
      locatie: typeof locatie === "string" && locatie.trim() ? locatie.trim().slice(0, 300) : null,
      status: plaatsen.dienstStatus,
      notities: typeof opmerkingen === "string" && opmerkingen.trim() ? opmerkingen.trim().slice(0, 2000) : null,
    };
    if (["nl", "en", "nl_en"].includes(vereiste_taal)) gemeenschappelijk.vereiste_taal = vereiste_taal;
    if (Array.isArray(vereiste_vaardigheden) && vereiste_vaardigheden.length > 0) {
      gemeenschappelijk.vereiste_vaardigheden = vereiste_vaardigheden.filter((v: unknown) => typeof v === "string").slice(0, 30);
    }
    if (afbeelding) gemeenschappelijk.afbeelding_url = afbeelding;
    // Alleen meesturen als ingevuld: zonder migratie 20261023_uitgebreid_reageren.sql bestaan de
    // kolommen niet; dan opnieuw zonder (hieronder) en een waarschuwing in het antwoord.
    if (kleding.waarde) gemeenschappelijk.kledingvoorschrift = kleding.waarde;
    if (pauze.waarde != null) gemeenschappelijk.pauze_minuten = pauze.waarde;

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
    let { data: diensten, error } = await supabaseAdmin
      .from("diensten")
      .insert(dienstenToCreate)
      .select("id, functie");

    // Kledingvoorschrift/pauze nog niet gemigreerd: zonder die velden plaatsen (de dienst is
    // belangrijker), en de klant laten weten dat ze niet zijn opgeslagen.
    let extrasNietOpgeslagen = false;
    if (isOntbrekendeKolom(error) && ("kledingvoorschrift" in gemeenschappelijk || "pauze_minuten" in gemeenschappelijk)) {
      extrasNietOpgeslagen = true;
      for (const d of dienstenToCreate) {
        delete d.kledingvoorschrift;
        delete d.pauze_minuten;
      }
      ({ data: diensten, error } = await supabaseAdmin.from("diensten").insert(dienstenToCreate).select("id, functie"));
    }
    const extrasWaarschuwing =
      [
        extrasNietOpgeslagen ? "Kledingvoorschrift en pauze konden nog niet worden opgeslagen. Zet ze voorlopig bij de opmerkingen." : null,
        fotoKeuze.waarschuwing,
      ]
        .filter(Boolean)
        .join(" ") || null;

    // 23514: de status-CHECK op diensten kent in_controle nog niet (migratie half gedraaid).
    // Dan zoals voorheen direct open, en een melding in Sentry zodat het opvalt.
    let statusGeplaatst = plaatsen.dienstStatus as string;
    if (error?.code === "23514" && inControle) {
      captureRouteError(error, { route: "/api/klant/aanvraag", action: "IN_CONTROLE_CONSTRAINT" });
      statusGeplaatst = "open";
      ({ data: diensten, error } = await supabaseAdmin
        .from("diensten")
        .insert(dienstenToCreate.map((d) => ({ ...d, status: "open" })))
        .select("id, functie"));
    }
    const wachtOpControle = statusGeplaatst === DIENST_STATUS_IN_CONTROLE;

    if (error) {
      captureRouteError(error, { route: "/api/klant/aanvraag", action: "POST" });
      return NextResponse.json({ error: "Aanvraag opslaan mislukt. Probeer het opnieuw." }, { status: 500 });
    }

    // Globale locatie (postcode → PDOK) op de diensten, voor afstand in Ontdekken en de gerichte
    // push. Na het antwoord en met een korte time-out: een fout of geen resultaat blokkeert niets.
    const dienstIds = (diensten ?? []).map((d) => d.id as string);
    const geocodeer = () =>
      werkDienstLocatiesBij(dienstIds, { locatie: gemeenschappelijk.locatie, klantId: klantData.id }).catch((e) => {
        captureRouteError(e, { route: "/api/klant/aanvraag", action: "LOCATIE" });
        return null;
      });

    const functieSummary = regels.map((r) => `${r.functie} (${r.aantal}x)`).join(", ");
    const totaalPersoneel = regels.reduce((sum, r) => sum + r.aantal, 0);
    const omschrijving = `${functieSummary} op ${datum} (${start_tijd.slice(0, 5)} - ${eind_tijd.slice(0, 5)})${gemeenschappelijk.locatie ? ` in ${gemeenschappelijk.locatie}` : ""}`;

    // Favorieten uit stap 4 daadwerkelijk uitnodigen (voorheen werd de keuze genegeerd).
    // Niet zolang de dienst in controle is: medewerkers zien hem dan nog niet.
    const favorietIds = Array.isArray(favoriet_medewerker_ids)
      ? [...new Set(favoriet_medewerker_ids.filter((i: unknown): i is string => typeof i === "string" && UUID.test(i)))].slice(0, 50)
      : [];
    const uitnodigingen = wachtOpControle
      ? { uitgenodigd: 0, overgeslagen: favorietIds.length }
      : await nodigFavorietenUit(klantData.id, favorietIds, diensten || [], omschrijving, demo);

    if (wachtOpControle) {
      // Eerste dienst(en) van een nog niet gecontroleerde klant: geen push, wel een melding aan
      // TopTalent (Telegram + mail). Goedkeuren in admin > Diensten zet ze open en pusht dan.
      const controleDiensten = dienstenToCreate.map((d) => ({
        functie: (d.functie as string) ?? null,
        aantal_nodig: (d.aantal_nodig as number) ?? null,
        datum,
        start_tijd,
        eind_tijd,
        locatie: (gemeenschappelijk.locatie as string | null) ?? null,
        uurtarief: (d.uurtarief as number) ?? null,
      }));
      after(() =>
        meldDienstInControle(klantData.id, controleDiensten).catch((e) =>
          captureRouteError(e, { route: "/api/klant/aanvraag", action: "MELDING_CONTROLE" }),
        ),
      );
      // Locatie nu al, zodat de push na goedkeuring (keurKlantGoed) gericht kan.
      after(geocodeer);
      return NextResponse.json({
        success: true,
        dienst_ids: diensten?.map((d) => d.id) || [],
        count: diensten?.length || 0,
        status: DIENST_STATUS_IN_CONTROLE,
        in_controle: true,
        melding:
          "Uw aanvraag is ontvangen. Omdat dit uw eerste dienst is, controleert TopTalent hem eerst. Na goedkeuring zien medewerkers de dienst en kunnen ze reageren; volgende diensten gaan direct live.",
        favorieten_uitgenodigd: 0,
        favorieten_overgeslagen: uitnodigingen.overgeslagen,
        tarief_waarschuwingen: tariefWaarschuwingen,
        waarschuwing: extrasWaarschuwing,
      });
    }

    // Telegram notification (geen PII — AVG compliance); niet voor demo-aanvragen.
    if (!demo) after(() =>
      sendTelegramAlert(
        `<b>🆕 Nieuwe personeelsaanvraag</b>\n` +
        `👥 ${totaalPersoneel} personen op ${datum}\n` +
        `🕐 ${start_tijd} - ${eind_tijd}\n` +
        `📋 ${diensten?.length || 1} diensten — bekijk in dashboard`
      ).catch((e) => captureRouteError(e, { route: "/api/klant/aanvraag", action: "TELEGRAM" })),
    );

    // Push "nieuwe dienst beschikbaar", gericht (functie, beschikbaarheid, afstand, niet verborgen;
    // lib/klant-controle.ts). Eerst de locatie, zodat de afstand meetelt. Bij een demo-klant alleen
    // demo-medewerkers; zonder migratie zoals voorheen naar alle medewerkers van die wereld.
    after(async () => {
      await geocodeer();
      await pushNieuweDienst(omschrijving, datum, demo, dienstIds).catch((e) =>
        captureRouteError(e, { route: "/api/klant/aanvraag", action: "PUSH" }),
      );
    });

    return NextResponse.json({
      success: true,
      dienst_ids: diensten?.map(d => d.id) || [],
      count: diensten?.length || 0,
      status: "open",
      in_controle: false,
      favorieten_uitgenodigd: uitnodigingen.uitgenodigd,
      favorieten_overgeslagen: uitnodigingen.overgeslagen,
      tarief_waarschuwingen: tariefWaarschuwingen,
      waarschuwing: extrasWaarschuwing,
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
    const { data: locaties, error } = await supabaseAdmin
      .from("diensten")
      .select("locatie")
      .eq("klant_id", klant.id)
      .not("locatie", "is", null)
      .order("datum", { ascending: false })
      .limit(50);

    // Geen ondergrens meer: min_uurtarief blijft 0 voor oudere clients; `tarieven` geeft de
    // richtlijnen per functie, het minimumloon en de marge voor de zachte waarschuwing.
    const tarieven = {
      richtlijnen: alleRichtlijnen(),
      wettelijk_minimumuurloon: WETTELIJK_MINIMUMUURLOON,
      minimumloon_peildatum: WETTELIJK_MINIMUMUURLOON_PEILDATUM,
      marge_per_uur: MARGE_PER_UUR,
    };

    if (error) {
      captureRouteError(error, { route: "/api/klant/aanvraag", action: "GET" });
      return NextResponse.json({ locaties: [], min_uurtarief: 0, tarieven });
    }

    const uniqueLocaties = [...new Set((locaties || []).map((l) => l.locatie).filter(Boolean))];

    return NextResponse.json({ locaties: uniqueLocaties, min_uurtarief: 0, tarieven });
  } catch (err) {
    captureRouteError(err, { route: "/api/klant/aanvraag", action: "GET" });
    return NextResponse.json({ locaties: [] });
  }
}
