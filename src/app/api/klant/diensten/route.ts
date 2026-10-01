import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { sendMedewerkerShiftConfirmationEmail } from "@/lib/medewerker-shift-email";
import { INGEPLAND_STATUSSEN, isIngepland } from "@/lib/dienst-status";
import { nlVandaag } from "@/lib/nl-tijd";
import { herberekenPlekken } from "@/lib/plekken";
import { magKlantAanmeldingWijzigen } from "@/lib/klant-portaal-regels";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = nlVandaag();

  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, start_tijd, eind_tijd, locatie, functie, aantal_nodig, plekken_totaal, status")
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

  const { data: aanmeldingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst_id, status")
    .in("dienst_id", dienstIds);

  // "geaccepteerd" telt alles wat ingepland is (geaccepteerd door klant óf bevestigd door medewerker/admin).
  const countMap: Record<string, { total: number; aangemeld: number; geaccepteerd: number; uitgenodigd: number }> = {};
  (aanmeldingen || []).forEach((a) => {
    if (!countMap[a.dienst_id]) {
      countMap[a.dienst_id] = { total: 0, aangemeld: 0, geaccepteerd: 0, uitgenodigd: 0 };
    }
    countMap[a.dienst_id].total++;
    if (a.status === "aangemeld") countMap[a.dienst_id].aangemeld++;
    if (a.status === "uitgenodigd") countMap[a.dienst_id].uitgenodigd++;
    if (isIngepland(a.status)) countMap[a.dienst_id].geaccepteerd++;
  });

  const result = diensten.map((d) => ({
    ...d,
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
    data?: { status?: string };
  };

  if (action === "get_aanmeldingen") {
    if (!dienst_id) return NextResponse.json({ error: "dienst_id is verplicht" }, { status: 400 });

    // Verifieer dat dienst bij deze klant hoort
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("id, klant_id")
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

    return NextResponse.json({ data: aanmeldingen });
  }

  if (action === "update_aanmelding") {
    const naar = data?.status ?? "";
    if (!id) return NextResponse.json({ error: "id is verplicht" }, { status: 400 });

    // Haal aanmelding op en verifieer dat het bij een dienst van deze klant hoort
    const { data: aanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, status, dienst:diensten!inner(klant_id, status, aantal_nodig, plekken_totaal)")
      .eq("id", id)
      .maybeSingle();

    const dienstData = (Array.isArray(aanmelding?.dienst) ? aanmelding?.dienst[0] : aanmelding?.dienst) as
      | { klant_id: string; status: string | null; aantal_nodig: number | null; plekken_totaal: number | null }
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

    // Capaciteit vóór accepteren: een volle dienst krijgt geen extra medewerker.
    if (naar === "geaccepteerd") {
      if (dienstData.status === "geannuleerd") {
        return NextResponse.json({ error: "Deze dienst is geannuleerd" }, { status: 409 });
      }
      if ((await telIngepland(aanmelding.dienst_id)) >= totaal) {
        return NextResponse.json({ error: "Alle plekken voor deze dienst zijn al bezet" }, { status: 409 });
      }
    }

    // Conditioneel op de oude status, zodat twee gelijktijdige klikken niet allebei slagen.
    const { data: bijgewerkt, error: updateError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: naar, beoordeeld_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", aanmelding.status)
      .select("id");

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

    // Bij acceptatie: stuur bevestigingsmail
    if (naar === "geaccepteerd") {
      const { data: fullAanmelding } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select(`
          id,
          medewerker:medewerkers(naam, email),
          dienst:diensten(klant_naam, locatie, datum, start_tijd, eind_tijd, functie, notities)
        `)
        .eq("id", id)
        .single();

      const medewerker = Array.isArray(fullAanmelding?.medewerker) ? fullAanmelding?.medewerker[0] : fullAanmelding?.medewerker;
      const dienst = Array.isArray(fullAanmelding?.dienst) ? fullAanmelding?.dienst[0] : fullAanmelding?.dienst;

      if (medewerker?.email && dienst) {
        await sendMedewerkerShiftConfirmationEmail({
          medewerkerNaam: medewerker.naam,
          medewerkerEmail: medewerker.email,
          functie: dienst.functie,
          datum: dienst.datum,
          startTijd: dienst.start_tijd,
          eindTijd: dienst.eind_tijd,
          locatie: dienst.locatie,
          klantNaam: dienst.klant_naam,
          kledingvoorschrift: dienst.notities,
        }).catch((e) => captureRouteError(e, { route: "/api/klant/diensten", action: "bevestigingsmail" }));
      }

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
