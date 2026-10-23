import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { dienstUren, nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { HERACTIVEERBAAR, heeftVrijePlek } from "@/lib/medewerker/dienst-regels";
import { beperkDiensten, haalDemoIds } from "@/lib/demo";
import { leesMetKolomFallback } from "@/lib/db-kolom-fallback";
import { isAutomatischIngetrokken, medewerkerTariefVanDienst, richtlijnBereik } from "@/lib/medewerker/reactie-regels";
import { GEEN_EXTRAS, haalDienstExtras } from "@/lib/medewerker/reactie-voorwaarden";

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
      .limit(50), demoIds, demo);

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
        .limit(50), demoIds, demo);
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
    const extras = await haalDienstExtras((diensten || []).map((d) => d.id as string));

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
        return {
          id: d.id,
          datum: d.datum,
          start_tijd: d.start_tijd,
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
          klant: {
            bedrijfsnaam: (klant?.bedrijfsnaam as string) || (d.klant_naam as string) || "Onbekend",
            bedrijf_foto_url: klant?.bedrijf_foto_url,
          },
          tags,
          is_speciaal,
        };
      });

    return NextResponse.json({ shifts: beschikbareShifts });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/shifts/beschikbaar", action: "GET" });
    // console.error("Beschikbare shifts error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

