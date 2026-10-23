import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { stuurInplanBevestiging } from "@/lib/medewerker/inplan-bevestiging";
import { INGEPLAND_STATUSSEN, isIngepland } from "@/lib/dienst-status";
import { leesMetKolomFallback } from "@/lib/db-kolom-fallback";
import {
  effectieveAanmeldStatus,
  isAutomatischIngetrokken,
  REACTIE_FOUTCODES,
  reactieVoorWerkgever,
  wijktAfVanGezien,
} from "@/lib/medewerker/reactie-regels";
import { GEEN_EXTRAS, haalDienstExtras, haalVoorwaarden, type AanmeldingVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";
import { nlVandaag } from "@/lib/nl-tijd";
import { herberekenPlekken } from "@/lib/plekken";
import { magKlantAanmeldingWijzigen } from "@/lib/klant-portaal-regels";
import { captureRouteError } from "@/lib/sentry-utils";
import { notifyMedewerkerAanmeldingBeslist } from "@/lib/dienst-push-triggers";

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = nlVandaag();

  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, start_tijd, eind_tijd, locatie, functie, aantal_nodig, plekken_totaal, status, notities, uurtarief")
    .eq("klant_id", klant.id)
    .gte("datum", today)
    .neq("status", "geannuleerd")
    .order("datum", { ascending: true })
    .order("start_tijd", { ascending: true })
    .limit(100);

  if (!diensten || diensten.length === 0) {
    return NextResponse.json({ diensten: [] });
  }

  const dienstIds = diensten.map((d) => d.id);
  const dienstPerId = new Map(diensten.map((d) => [d.id, d]));

  // auto_intrekken_uren bestaat pas na migratie 20261023_uitgebreid_reageren.sql.
  const [{ data: aanmeldingenRuw }, extras] = await Promise.all([
    leesMetKolomFallback((metNieuw) =>
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select(metNieuw ? "id, dienst_id, status, auto_intrekken_uren" : "id, dienst_id, status")
        .in("dienst_id", dienstIds),
    ),
    haalDienstExtras(dienstIds),
  ]);
  const aanmeldingen = (aanmeldingenRuw ?? []) as unknown as { id: string; dienst_id: string; status: string; auto_intrekken_uren?: number | null }[];

  // "geaccepteerd" telt alles wat ingepland is (geaccepteerd door klant óf bevestigd door medewerker/admin).
  // Een reactie voorbij haar intrekmoment telt niet meer als open reactie (lazy check).
  const countMap: Record<string, { total: number; aangemeld: number; geaccepteerd: number; uitgenodigd: number }> = {};
  aanmeldingen.forEach((a) => {
    if (!countMap[a.dienst_id]) {
      countMap[a.dienst_id] = { total: 0, aangemeld: 0, geaccepteerd: 0, uitgenodigd: 0 };
    }
    const status = effectieveAanmeldStatus(a, dienstPerId.get(a.dienst_id));
    countMap[a.dienst_id].total++;
    if (status === "aangemeld") countMap[a.dienst_id].aangemeld++;
    if (status === "uitgenodigd") countMap[a.dienst_id].uitgenodigd++;
    if (isIngepland(status)) countMap[a.dienst_id].geaccepteerd++;
  });

  const result = diensten.map((d) => ({
    ...d,
    ...(extras.get(d.id) ?? GEEN_EXTRAS),
    aanmeldingen_count: countMap[d.id]?.total || 0,
    aanmeldingen_aangemeld: countMap[d.id]?.aangemeld || 0,
    aanmeldingen_geaccepteerd: countMap[d.id]?.geaccepteerd || 0,
    aanmeldingen_uitgenodigd: countMap[d.id]?.uitgenodigd || 0,
  }));

  return NextResponse.json({ diensten: result });
}

async function telIngepland(dienstId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id", { count: "exact", head: true })
    .eq("dienst_id", dienstId)
    .in("status", [...INGEPLAND_STATUSSEN]);
  return count ?? 0;
}

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }
  const { action, dienst_id, id, data } = body as {
    action?: string;
    dienst_id?: string;
    id?: string;
    /** Bij accepteren optioneel wat de werkgever zag (klant_uurtarief, start_tijd, eind_tijd). */
    data?: { status?: string; klant_uurtarief?: unknown; start_tijd?: unknown; eind_tijd?: unknown };
  };

  if (action === "get_aanmeldingen") {
    if (!dienst_id) return NextResponse.json({ error: "dienst_id is verplicht" }, { status: 400 });

    // Verifieer dat dienst bij deze klant hoort
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("id, klant_id, datum, start_tijd, eind_tijd, uurtarief")
      .eq("id", dienst_id)
      .eq("klant_id", klant.id)
      .maybeSingle();

    if (!dienst) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
    }

    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, medewerker_id, status, aangemeld_at, check_in_at, medewerker:medewerkers(naam, functie, profile_photo_url, gemiddelde_score, aantal_beoordelingen, badge, admin_score_aanwezigheid, admin_score_vaardigheden)")
      .eq("dienst_id", dienst_id)
      .order("aangemeld_at", { ascending: true })
      .limit(100);

    // Per reactie: motivatie, tijden, wat de werkgever per uur betaalt, akkoord kleding en of de
    // reactie automatisch is ingetrokken (dan is de status `geannuleerd`, ook vóór de cron).
    const [voorwaarden, extras] = await Promise.all([
      haalVoorwaarden((aanmeldingen ?? []).map((a) => a.id)),
      haalDienstExtras([dienst.id]),
    ]);
    const pauze = extras.get(dienst.id)?.pauze_minuten ?? null;
    const metReactie = (aanmeldingen ?? []).map((a) => {
      const v = voorwaarden.get(a.id);
      const bron = { status: a.status, ...(v ?? {}) };
      return {
        ...a,
        status: effectieveAanmeldStatus(bron, dienst),
        reactie: reactieVoorWerkgever(bron, { ...dienst, pauze_minuten: pauze }),
      };
    });

    return NextResponse.json({ data: metReactie });
  }

  if (action === "update_aanmelding") {
    const naar = data?.status ?? "";
    if (!id) return NextResponse.json({ error: "id is verplicht" }, { status: 400 });

    // Haal aanmelding op en verifieer dat het bij een dienst van deze klant hoort
    const { data: aanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, status, dienst:diensten!inner(klant_id, status, aantal_nodig, plekken_totaal, datum, start_tijd, eind_tijd, uurtarief)")
      .eq("id", id)
      .maybeSingle();

    const dienstData = (Array.isArray(aanmelding?.dienst) ? aanmelding?.dienst[0] : aanmelding?.dienst) as
      | {
          klant_id: string;
          status: string | null;
          aantal_nodig: number | null;
          plekken_totaal: number | null;
          datum: string;
          start_tijd: string;
          eind_tijd: string;
          uurtarief: number | null;
        }
      | undefined;
    if (!aanmelding || dienstData?.klant_id !== klant.id) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
    }

    // Alleen toegestane overgangen (aangemeld → geaccepteerd/afgewezen).
    if (!magKlantAanmeldingWijzigen(aanmelding.status, naar)) {
      return NextResponse.json(
        { error: `Deze aanmelding kan niet meer worden gewijzigd (status: ${aanmelding.status})` },
        { status: 409 },
      );
    }

    const totaal = dienstData.plekken_totaal ?? dienstData.aantal_nodig ?? 1;
    // Het voorstel dat bij accepteren gold (alleen gevuld als de reactiekolommen bestaan).
    let voorstel: AanmeldingVoorwaarden | undefined;

    // Capaciteit vóór accepteren: een volle dienst krijgt geen extra medewerker.
    if (naar === "geaccepteerd") {
      if (dienstData.status === "geannuleerd") {
        return NextResponse.json({ error: "Deze dienst is geannuleerd" }, { status: 409 });
      }
      // Uitgebreid reageren: een reactie voorbij haar intrekmoment is niet meer te accepteren
      // (ook als de cron nog niet draaide), en accepteren neemt tijden en tarief over zoals de
      // werkgever ze zag. Die gelden daarna per aanmelding (lib/medewerker/reactie-regels).
      voorstel = (await haalVoorwaarden([aanmelding.id])).get(aanmelding.id);
      const bron = { status: aanmelding.status, ...(voorstel ?? {}) };
      if (isAutomatischIngetrokken(bron, dienstData)) {
        return NextResponse.json(
          {
            error: "Deze reactie is automatisch ingetrokken: de medewerker was op het gekozen moment voor de start nog niet gekozen.",
            code: REACTIE_FOUTCODES.reactieIngetrokken,
          },
          { status: 409 },
        );
      }
      if (wijktAfVanGezien(reactieVoorWerkgever(bron, dienstData), data)) {
        return NextResponse.json(
          { error: "Deze reactie is intussen gewijzigd. Ververs de pagina en bekijk het nieuwe voorstel.", code: REACTIE_FOUTCODES.reactieGewijzigd },
          { status: 409 },
        );
      }
      if ((await telIngepland(aanmelding.dienst_id)) >= totaal) {
        return NextResponse.json({ error: "Alle plekken voor deze dienst zijn al bezet" }, { status: 409 });
      }
    }

    // Conditioneel op de oude status, zodat twee gelijktijdige klikken niet allebei slagen. Bij
    // accepteren ook op het voorstel dat hierboven is gecontroleerd: trekt de medewerker in dat
    // venster in en reageert hij opnieuw met een ander voorstel, dan slaagt de update niet (409).
    let bijwerken = supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: naar, beoordeeld_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", aanmelding.status);
    if (naar === "geaccepteerd" && voorstel) {
      const zelfde = (kolom: string, waarde: string | number | null) =>
        (bijwerken = waarde == null ? bijwerken.is(kolom, null) : bijwerken.eq(kolom, waarde));
      zelfde("voorgesteld_uurtarief", voorstel.voorgesteld_uurtarief);
      zelfde("voorgestelde_start_tijd", voorstel.voorgestelde_start_tijd);
      zelfde("voorgestelde_eind_tijd", voorstel.voorgestelde_eind_tijd);
    }
    const { data: bijgewerkt, error: updateError } = await bijwerken.select("id");

    if (updateError) {
      captureRouteError(updateError, { route: "/api/klant/diensten", action: "update_aanmelding" });
      return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
    }
    if (!bijgewerkt || bijgewerkt.length === 0) {
      return NextResponse.json({ error: "Deze aanmelding is intussen al gewijzigd" }, { status: 409 });
    }

    // Twee gelijktijdige acceptaties op de laatste plek kunnen allebei door de check hierboven
    // komen. Na de update opnieuw tellen en bij overboeking terugdraaien (zelfde patroon als meldAan).
    if (naar === "geaccepteerd" && (await telIngepland(aanmelding.dienst_id)) > totaal) {
      await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ status: aanmelding.status, beoordeeld_at: null })
        .eq("id", id)
        .eq("status", naar);
      await herberekenPlekken(aanmelding.dienst_id);
      return NextResponse.json(
        { error: "Alle plekken voor deze dienst zijn intussen bezet. De aanmelding is niet geaccepteerd." },
        { status: 409 },
      );
    }

    await herberekenPlekken(aanmelding.dienst_id);

    // De medewerker hoort het direct in de app: ingepland of niet gekozen.
    if (naar === "geaccepteerd" || naar === "afgewezen") {
      after(() =>
        notifyMedewerkerAanmeldingBeslist(id, naar).catch((e) =>
          captureRouteError(e, { route: "/api/klant/diensten", action: "PUSH" }),
        ),
      );
    }

    // Bij acceptatie: stuur bevestigingsmail (met de tijden die voor deze medewerker gelden)
    if (naar === "geaccepteerd") {
      await stuurInplanBevestiging(id).catch((e) =>
        captureRouteError(e, { route: "/api/klant/diensten", action: "bevestigingsmail" }),
      );

      // Check of dienst "vol" moet worden
      if (dienstData.status === "open" && (await telIngepland(aanmelding.dienst_id)) >= totaal) {
        await supabaseAdmin
          .from("diensten")
          .update({ status: "vol" })
          .eq("id", aanmelding.dienst_id)
          .eq("status", "open");
      }
    }

    return NextResponse.json({ success: true });
  }

  // Dienst heropenen: zet status terug naar "open" en herbereken plekken
  if (action === "heropenen") {
    if (!dienst_id) return NextResponse.json({ error: "dienst_id is verplicht" }, { status: 400 });

    // Verifieer dat dienst bij klant hoort
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("id, klant_id, aantal_nodig, plekken_totaal, status")
      .eq("id", dienst_id)
      .eq("klant_id", klant.id)
      .maybeSingle();

    if (!dienst) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
    }
    if (dienst.status !== "vol") {
      return NextResponse.json({ error: "Alleen een volle dienst kan heropend worden" }, { status: 409 });
    }

    const totaal = dienst.plekken_totaal ?? dienst.aantal_nodig ?? 1;
    const plekkenBeschikbaar = Math.max(0, totaal - (await telIngepland(dienst_id)));
    const nieuweStatus = plekkenBeschikbaar > 0 ? "open" : "vol";

    await supabaseAdmin.from("diensten").update({ status: nieuweStatus }).eq("id", dienst_id);
    await herberekenPlekken(dienst_id);

    return NextResponse.json({
      success: true,
      status: nieuweStatus,
      plekken_beschikbaar: plekkenBeschikbaar,
    });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
