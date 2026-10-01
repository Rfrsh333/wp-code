import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { signFactuurToken } from "@/lib/session";
import { nlVandaag } from "@/lib/nl-tijd";
import { captureRouteError } from "@/lib/sentry-utils";
import { calculateKlantReiskosten, roundCurrency } from "@/lib/reiskosten";
import { calculateVat } from "@/lib/factuur-config";
import { berekenToeslagRegel, toeslagLabel } from "@/lib/toeslag";

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Haal facturen op voor deze klant
  const { data: facturen, error } = await supabaseAdmin
    .from("facturen")
    .select("*")
    .eq("klant_id", klant.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    captureRouteError(error, { route: "/api/klant/facturen", action: "GET" });
    // console.error("Facturen ophalen error:", error);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }

  // viewUrl: de factuurpagina vraagt een getekend token (de UI las dit veld al, maar kreeg het nooit).
  const metUrl = await Promise.all(
    (facturen || []).map(async (f) => ({
      ...f,
      viewUrl: `/api/facturen/${f.id}/pdf?token=${await signFactuurToken(f.id, klant.id)}`,
    })),
  );

  return NextResponse.json({ facturen: metUrl });
}

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const uren_ids: unknown = body?.uren_ids;

  if (!Array.isArray(uren_ids) || uren_ids.length === 0 || !uren_ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Geen uren opgegeven" }, { status: 400 });
  }

  // Haal goedgekeurde uren op
  const { data: urenRegistraties, error: urenError } = await supabaseAdmin
    .from("uren_registraties")
    .select(`
      id,
      gewerkte_uren,
      start_tijd,
      eind_tijd,
      reiskosten_km,
      reiskosten_bedrag,
      aanmelding:dienst_aanmeldingen!aanmelding_id(
        medewerker:medewerkers(naam),
        dienst:diensten!dienst_id(datum, locatie, uurtarief, klant_id)
      )
    `)
    .in("id", uren_ids)
    .eq("status", "klant_goedgekeurd");

  if (urenError || !urenRegistraties || urenRegistraties.length === 0) {
    return NextResponse.json({ error: "Geen goedgekeurde uren gevonden" }, { status: 404 });
  }

  // Verifieer dat alle uren bij deze klant horen
  for (const uren of urenRegistraties) {
    const aanmelding = uren.aanmelding as unknown as Record<string, unknown> | null;
    const dienst = aanmelding?.dienst as Record<string, unknown> | null;
    if (dienst?.klant_id !== klant.id) {
      return NextResponse.json({ error: "Ongeautoriseerde uren" }, { status: 403 });
    }
  }

  // Claim de uren vóór de factuur bestaat: alleen rijen die (nog) klant_goedgekeurd zijn en
  // hierboven als eigen uren zijn gecontroleerd. Voorheen ging de ruwe uren_ids-lijst de update
  // in (uren van andere klanten op 'gefactureerd') en gaf een dubbelklik twee facturen.
  const gevalideerdeIds = urenRegistraties.map((u) => u.id);
  const { data: geclaimd, error: claimError } = await supabaseAdmin
    .from("uren_registraties")
    .update({ status: "gefactureerd" })
    .in("id", gevalideerdeIds)
    .eq("status", "klant_goedgekeurd")
    .select("id");

  if (claimError) {
    captureRouteError(claimError, { route: "/api/klant/facturen", action: "POST" });
    return NextResponse.json({ error: "Factuur aanmaken mislukt" }, { status: 500 });
  }
  if ((geclaimd?.length ?? 0) !== gevalideerdeIds.length) {
    // Een deel is intussen al gefactureerd (bv. dubbelklik): niets half doen.
    const terug = (geclaimd ?? []).map((u) => u.id);
    if (terug.length > 0) {
      await supabaseAdmin.from("uren_registraties").update({ status: "klant_goedgekeurd" }).in("id", terug);
    }
    return NextResponse.json({ error: "Deze uren zijn al gefactureerd" }, { status: 409 });
  }

  const zetUrenTerug = () =>
    supabaseAdmin.from("uren_registraties").update({ status: "klant_goedgekeurd" }).in("id", gevalideerdeIds);

  // Bereken totaal
  let subtotaal = 0;
  const regels: { uren_registratie_id: unknown; omschrijving: string; datum: string; medewerker_naam: string; uren: unknown; uurtarief: number; reiskosten: number; bedrag: number }[] = [];

  for (const uren of urenRegistraties) {
    const aanmelding = uren.aanmelding as unknown as Record<string, unknown> | null;
    const dienst = aanmelding?.dienst as Record<string, unknown> | null;
    const medewerker = aanmelding?.medewerker as Record<string, unknown> | null;

    const urenBedrag = roundCurrency(uren.gewerkte_uren * ((dienst?.uurtarief as number) || 0));
    // Reiskosten voor de KLANT-factuur op basis van km × klanttarief (€0,23),
    // niet het opgeslagen medewerkerbedrag (€0,21). Gelijk aan /api/facturen/generate.
    const reiskosten = calculateKlantReiskosten(uren.reiskosten_km);
    const bedrag = roundCurrency(urenBedrag + reiskosten);
    subtotaal += bedrag;

    regels.push({
      uren_registratie_id: uren.id,
      omschrijving: `${(dienst?.locatie as string) || ''} - ${(medewerker?.naam as string) || ''}`,
      datum: (dienst?.datum as string) || '',
      medewerker_naam: (medewerker?.naam as string) || '',
      uren: uren.gewerkte_uren,
      uurtarief: (dienst?.uurtarief as number) || 0,
      reiskosten,
      bedrag,
    });

    // Toeslag (avond/nacht/weekend/feestdag) doorbelasten aan de klant, over het klanttarief.
    const startTijd = (uren as { start_tijd?: string }).start_tijd;
    const eindTijd = (uren as { eind_tijd?: string }).eind_tijd;
    const toeslag = berekenToeslagRegel(
      uren.gewerkte_uren,
      (dienst?.uurtarief as number) || 0,
      dienst?.datum as string,
      startTijd,
      eindTijd,
    );
    if (toeslag.bedrag > 0) {
      subtotaal += toeslag.bedrag;
      regels.push({
        uren_registratie_id: uren.id,
        omschrijving: `${toeslagLabel(toeslag.type)} (${toeslag.percentage}%) - ${(medewerker?.naam as string) || ''}`,
        datum: (dienst?.datum as string) || '',
        medewerker_naam: (medewerker?.naam as string) || '',
        uren: 0,
        uurtarief: 0,
        reiskosten: 0,
        bedrag: toeslag.bedrag,
      });
    }
  }

  subtotaal = roundCurrency(subtotaal);
  const btw = calculateVat(subtotaal, 21);
  const totaal = roundCurrency(subtotaal + btw);

  // Factuurnummer JJJJMM#### — bij een botsing (gelijktijdige factuur) opnieuw proberen.
  const vandaag = nlVandaag();
  const prefix = vandaag.slice(0, 4) + vandaag.slice(5, 7);
  const datums = regels.map((r) => r.datum).filter(Boolean).sort();

  let factuur: { id: string } | null = null;
  let factuurError: unknown = null;
  let factuurNummer = "";
  for (let poging = 0; poging < 5 && !factuur; poging++) {
    const { data: laatsteFactuur } = await supabaseAdmin
      .from("facturen")
      .select("factuur_nummer")
      .like("factuur_nummer", `${prefix}%`)
      .order("factuur_nummer", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Na een botsing (23505) is het laatste nummer hierboven opnieuw gelezen: gewoon +1.
    // (Voorheen + poging erbij, waardoor er gaten in de nummering vielen.)
    const laatste = laatsteFactuur?.factuur_nummer ? parseInt(laatsteFactuur.factuur_nummer.slice(-4)) : 0;
    factuurNummer = `${prefix}${String(laatste + 1).padStart(4, "0")}`;

    const res = await supabaseAdmin
      .from("facturen")
      .insert({
        factuur_nummer: factuurNummer,
        klant_id: klant.id,
        klant_naam: klant.bedrijfsnaam,
        klant_email: klant.email,
        periode_start: datums[0] || vandaag,
        periode_eind: datums[datums.length - 1] || vandaag,
        subtotaal,
        btw_percentage: 21,
        btw_bedrag: btw,
        totaal,
        status: "open",
      })
      .select("id")
      .single();

    factuur = res.data;
    factuurError = res.error;
    if (res.error && res.error.code !== "23505") break;
  }

  if (factuurError || !factuur) {
    await zetUrenTerug();
    captureRouteError(factuurError, { route: "/api/klant/facturen", action: "POST" });
    // console.error("Factuur aanmaken error:", factuurError);
    return NextResponse.json({ error: "Factuur aanmaken mislukt" }, { status: 500 });
  }

  // Maak factuur regels aan
  const factuurRegels = regels.map(r => ({
    ...r,
    factuur_id: factuur.id,
  }));

  const { error: regelsError } = await supabaseAdmin
    .from("factuur_regels")
    .insert(factuurRegels);

  if (regelsError) {
    captureRouteError(regelsError, { route: "/api/klant/facturen", action: "POST" });
    // console.error("Factuur regels error:", regelsError);
    // Rollback factuur
    await supabaseAdmin.from("facturen").delete().eq("id", factuur.id);
    await zetUrenTerug();
    return NextResponse.json({ error: "Factuur regels aanmaken mislukt" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    factuur_id: factuur.id,
    factuur_nummer: factuurNummer,
  });
}
