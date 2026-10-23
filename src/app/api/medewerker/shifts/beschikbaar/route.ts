import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { dienstUren, nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { HERACTIVEERBAAR, heeftVrijePlek } from "@/lib/medewerker/dienst-regels";
import { beperkDiensten, haalDemoIds } from "@/lib/demo";
import { leesMetKolomFallback } from "@/lib/db-kolom-fallback";
import { intrekInfo, isAutomatischIngetrokken, medewerkerTariefVanDienst, richtlijnBereik } from "@/lib/medewerker/reactie-regels";
import { GEEN_EXTRAS, haalDienstExtras } from "@/lib/medewerker/reactie-voorwaarden";
import { afstandTussen } from "@/lib/locatie/locatie-regels";
import { haalDienstLocaties, haalMedewerkerAfstand } from "@/lib/locatie/locatie-opslag";
import { parseOntdekFilters, pasOntdekFiltersToe, sorteerOntdek } from "@/lib/medewerker/ontdekken-regels";
import { haalVoorkeuren } from "@/lib/medewerker/werkgever-voorkeuren";
import { fotoVoorDienst, type DienstFoto } from "@/lib/sfeerfotos";
import { fotosVoorDiensten } from "@/lib/sfeerfotos-opslag";

/**
 * De nieuwe Ontdekken-gegevens zijn een aanvulling: lukt een ervan niet, dan de lijst zonder
 * (zoals voorheen) in plaats van een 500. De fout gaat naar Sentry.
 */
async function veilig<T>(werk: Promise<T>, standaard: T, actie: string): Promise<T> {
  try {
    return await werk;
  } catch (e) {
    captureRouteError(e, { route: "/api/medewerker/shifts/beschikbaar", action: actie });
    return standaard;
  }
}

/** Zoveel open diensten halen we op; filters en sortering werken daarop (voorheen 50). */
const OPHAAL_LIMIET = 200;

/**
 * Open reacties per dienst (status aangemeld, zonder reacties die vanzelf vervielen: lazy check via
 * intrekInfo, ook als de cron nog niet gedraaid heeft). Voor "3 reacties" in Ontdekken.
 */
async function openReactiesPerDienst(diensten: { id: string; datum?: string; start_tijd?: string }[]): Promise<Map<string, number>> {
  const uit = new Map<string, number>();
  const perId = new Map(diensten.map((d) => [d.id, d]));
  const ids = [...perId.keys()];
  for (let i = 0; i < ids.length; i += 150) {
    const blok = ids.slice(i, i + 150);
    const { data, error } = await leesMetKolomFallback((metNieuw) =>
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select(metNieuw ? "dienst_id, status, auto_intrekken_uren, annuleer_reden" : "dienst_id, status")
        .in("dienst_id", blok)
        .eq("status", "aangemeld")
        .limit(5000),
    );
    if (error) throw error;
    for (const a of (data ?? []) as unknown as { dienst_id: string; status: string; auto_intrekken_uren?: number | null; annuleer_reden?: string | null }[]) {
      if (intrekInfo(a, perId.get(a.dienst_id)).status !== "aangemeld") continue;
      uit.set(a.dienst_id, (uit.get(a.dienst_id) ?? 0) + 1);
    }
  }
  return uit;
}

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const vandaag = nlVandaag();
    const morgen = plusDagen(vandaag, 1);
    // Demo-medewerkers zien alleen diensten van demo-klanten, echte medewerkers die nooit.
    const demoIds = await haalDemoIds();
    const demo = demoIds.medewerkers.has(medewerker.id);

    // Haal alle toekomstige open diensten op (met optionele klant join)
    const result = await beperkDiensten(supabaseAdmin
      .from("diensten")
      .select(`
        id,
        datum,
        start_tijd,
        eind_tijd,
        locatie,
        notities,
        uurtarief,
        aantal_nodig,
        plekken_totaal,
        plekken_beschikbaar,
        functie,
        klant_naam,
        klant_id,
        status,
        afbeelding_url,
        klant:klanten!left (
          id,
          bedrijfsnaam,
          bedrijf_foto_url
        )
      `)
      .in("status", ["open", "vol"])
      .gte("datum", vandaag)
      .order("datum", { ascending: true })
      .order("start_tijd", { ascending: true })
      .limit(OPHAAL_LIMIET), demoIds, demo);

    let diensten = result.data as Record<string, unknown>[] | null;
    const error = result.error;

    // Fallback: Als de join query faalt, gebruik simpele query
    if (error) {
      console.warn("[SHIFTS BESCHIKBAAR] Join query failed, using fallback:", error);
      const { data: fallbackDiensten } = await beperkDiensten(supabaseAdmin
        .from("diensten")
        .select("id, datum, start_tijd, eind_tijd, locatie, notities, uurtarief, aantal_nodig, plekken_totaal, plekken_beschikbaar, functie, klant_naam, klant_id, status, afbeelding_url")
        .in("status", ["open", "vol"])
        .gte("datum", vandaag)
        .order("datum", { ascending: true })
        .limit(OPHAAL_LIMIET), demoIds, demo);
      // Add null klant property to match type
      diensten = (fallbackDiensten || []).map(d => ({ ...d, klant: null })) as Record<string, unknown>[];
    }

    // Filter uit: diensten waar de medewerker al een lopende aanmelding heeft
    // (een geannuleerde/afgewezen aanmelding mag opnieuw, net als een automatisch ingetrokken reactie).
    const { data: aanmeldingenRuw } = await leesMetKolomFallback((metNieuw) =>
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select(metNieuw ? "dienst_id, status, auto_intrekken_uren" : "dienst_id, status")
        .eq("medewerker_id", medewerker.id),
    );
    const aanmeldingen = (aanmeldingenRuw ?? []) as unknown as { dienst_id: string; status: string; auto_intrekken_uren?: number | null }[];
    const dienstPerId = new Map((diensten || []).map((d) => [d.id as string, d as { datum?: string; start_tijd?: string }]));

    const aangemeldeDienstIds = new Set(
      aanmeldingen
        .filter((a) => !(HERACTIVEERBAAR as readonly string[]).includes(a.status))
        .filter((a) => !isAutomatischIngetrokken(a, dienstPerId.get(a.dienst_id)))
        .map((a) => a.dienst_id),
    );
    // Kledingvoorschrift en pauze voor het reageerscherm (leeg zolang de migratie niet gedraaid is).
    // Stap 3 (Ontdekken): eigen locatie, dienstlocaties, werkgeversvoorkeuren, "waar ik favoriet ben"
    // en het aantal open reacties. Alles leeg/false zolang migratie 20261023_ontdekken_afstand_werkgevers
    // niet gedraaid is; dan is het antwoord zoals voorheen.
    const dienstIds = (diensten || []).map((d) => d.id as string);
    const { filters, ongeldig } = parseOntdekFilters(request.nextUrl.searchParams);
    // Sfeerfoto per dienst (dienst → bedrijfsfoto → standaard per functie, lib/sfeerfotos.ts).
    const [extras, mijnAfstand, dienstLocaties, voorkeuren, favorietBij, reacties, fotos] = await Promise.all([
      haalDienstExtras(dienstIds),
      veilig(haalMedewerkerAfstand(medewerker.id), { beschikbaar: false, locatie: null, maxAfstandKm: null, postcodeIngevuld: false }, "AFSTAND"),
      veilig(haalDienstLocaties(dienstIds), new Map(), "DIENST_LOCATIES"),
      veilig(haalVoorkeuren(medewerker.id), { beschikbaar: false, favoriet: new Set<string>(), verborgen: new Set<string>() }, "VOORKEUREN"),
      supabaseAdmin.from("klant_favoriete_medewerkers").select("klant_id").eq("medewerker_id", medewerker.id).limit(1000),
      veilig(
        openReactiesPerDienst((diensten || []).map((d) => ({ id: d.id as string, datum: d.datum as string, start_tijd: d.start_tijd as string }))),
        new Map<string, number>(),
        "REACTIES",
      ),
      veilig(
        fotosVoorDiensten((diensten || []).map((d) => ({
          id: d.id as string,
          functie: d.functie as string | null,
          afbeelding_url: d.afbeelding_url as string | null,
          klant_id: (d.klant_id as string | null) ?? ((d.klant as { id?: string } | null)?.id ?? null),
        }))),
        new Map<string, DienstFoto>(),
        "FOTOS",
      ),
    ]);
    const ikBenFavorietBij = new Set(((favorietBij.data ?? []) as { klant_id: string }[]).map((f) => f.klant_id));

    const beschikbareShifts = (diensten || [])
      .filter((d: Record<string, unknown>) => {
        if (aangemeldeDienstIds.has(d.id as string)) return false;
        const aantalNodig = (d.aantal_nodig as number) ?? 1;
        if (aantalNodig <= 0) return false;
        // Volle diensten niet tonen: aanmelden zou toch geweigerd worden.
        return heeftVrijePlek({
          status: d.status as string | null,
          plekken_beschikbaar: d.plekken_beschikbaar as number | null,
        });
      })
      .map((d: Record<string, unknown>) => {
        const klant = d.klant as Record<string, unknown> | null;
        // ✅ Use plekken_beschikbaar/plekken_totaal if available, fallback to aantal_nodig
        const plekkenBeschikbaar = (d.plekken_beschikbaar as number) ?? (d.aantal_nodig as number) ?? 1;
        const plekkenTotaal = (d.plekken_totaal as number) ?? (d.aantal_nodig as number) ?? 1;

        const tags: string[] = [];
        const uren = dienstUren(d.start_tijd as string, d.eind_tijd as string) || 0;
        if (uren < 4) tags.push("Korte shift");
        if (uren >= 8) tags.push("Hele dag");

        const medewerkerUurtarief = (d.uurtarief as number) - 4;
        if (medewerkerUurtarief >= 16) tags.push("Goed betaald");

        if (d.datum === morgen) {
          tags.push("Morgen");
        }

        const is_speciaal = medewerkerUurtarief >= 18 || plekkenBeschikbaar >= 5;

        const extra = extras.get(d.id as string) ?? GEEN_EXTRAS;
        const klantId = (d.klant_id as string | null) ?? (klant?.id as string | null) ?? null;
        return {
          id: d.id,
          datum: d.datum as string,
          start_tijd: d.start_tijd as string,
          eind_tijd: d.eind_tijd,
          locatie: d.locatie,
          omschrijving: d.notities || d.functie || "Geen omschrijving",
          functie: (d.functie as string | null) ?? null,
          // Uitgebreid reageren: opmerkingen (notities), kledingvoorschrift en pauze apart, en wat de
          // medewerker bij het tarief van de dienst per uur krijgt (vooringevuld bij een tegenbod).
          opmerkingen: (d.notities as string | null) || null,
          kledingvoorschrift: extra.kledingvoorschrift,
          pauze_minuten: extra.pauze_minuten,
          medewerker_uurtarief: medewerkerTariefVanDienst(d.uurtarief as number | null),
          // Richtlijn voor de functie (wat de werkgever per uur betaalt; null bij een onbekende
          // functie): de app rekent er de waarschuwing "boven de richtlijn" mee na (tegenbod + € 4 > max).
          richtlijn: richtlijnBereik(d.functie as string | null),
          uurtarief: d.uurtarief,
          plekken_beschikbaar: plekkenBeschikbaar,
          plekken_totaal: plekkenTotaal,
          afbeelding_url: d.afbeelding_url || null,
          // Altijd een foto: { groot, klein, bron: "dienst" | "bedrijf" | "standaard" }.
          foto:
            fotos.get(d.id as string) ??
            fotoVoorDienst({ id: d.id as string, functie: d.functie as string | null, afbeelding_url: d.afbeelding_url as string | null }),
          klant_id: klantId,
          klant: {
            id: klantId,
            bedrijfsnaam: (klant?.bedrijfsnaam as string) || (d.klant_naam as string) || "Onbekend",
            bedrijf_foto_url: klant?.bedrijf_foto_url,
          },
          tags,
          is_speciaal,
          // Stap 3: hemelsbrede afstand (km, 1 decimaal) vanaf de eigen postcode, of null als een van
          // beide locaties onbekend is; voorkeuren en het aantal open reacties.
          afstand_km: afstandTussen(mijnAfstand.locatie, dienstLocaties.get(d.id as string) ?? null),
          werkgever_favoriet: !!klantId && voorkeuren.favoriet.has(klantId),
          werkgever_verborgen: !!klantId && voorkeuren.verborgen.has(klantId),
          ik_ben_favoriet: !!klantId && ikBenFavorietBij.has(klantId),
          aantal_reacties: reacties.get(d.id as string) ?? 0,
        };
      });

    // Filters en sortering (alle optioneel). Verborgen werkgevers vallen standaard weg. Zonder eigen
    // locatie kan het afstandsfilter niet: dan genegeerd en gemeld.
    const afstandMogelijk = !!mijnAfstand.locatie;
    const genegeerd = [...ongeldig];
    if (filters.maxAfstandKm != null && !afstandMogelijk) genegeerd.push("max_afstand_km");
    if (filters.sortering === "afstand" && !afstandMogelijk) genegeerd.push("sortering");
    // Zonder voorkeurentabel (migratie) kan niemand werkgevers bewaren: filter niet toepassen.
    const toegepast = { ...filters };
    if (filters.alleenFavorieteWerkgevers && !voorkeuren.beschikbaar) {
      toegepast.alleenFavorieteWerkgevers = false;
      genegeerd.push("alleen_favoriete_werkgevers");
    }
    const gefilterd = sorteerOntdek(pasOntdekFiltersToe(beschikbareShifts, toegepast, afstandMogelijk), filters.sortering);

    return NextResponse.json({
      shifts: gefilterd,
      filters: {
        max_afstand_km: filters.maxAfstandKm,
        min_uurtarief: filters.minUurtarief,
        alleen_favoriete_werkgevers: filters.alleenFavorieteWerkgevers,
        waar_ik_favoriet_ben: filters.waarIkFavorietBen,
        toon_verborgen: filters.toonVerborgen,
        sortering: filters.sortering,
        genegeerd,
      },
      mijn_locatie: {
        bekend: afstandMogelijk,
        postcode_ingevuld: mijnAfstand.postcodeIngevuld,
        max_afstand_km: mijnAfstand.maxAfstandKm,
      },
      werkgever_voorkeuren_beschikbaar: voorkeuren.beschikbaar,
      aantal_verborgen: beschikbareShifts.filter((s) => s.werkgever_verborgen).length,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/shifts/beschikbaar", action: "GET" });
    // console.error("Beschikbare shifts error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

