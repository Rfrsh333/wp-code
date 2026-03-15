import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { calculateMedewerkerReiskosten, sanitizeKilometers } from "@/lib/reiskosten";
import { sendMedewerkerShiftConfirmationEmail } from "@/lib/medewerker-shift-email";

type UrenRegistratie = { status: string };

type UrenAanpassing = {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  reiskosten_km: number;
  reiskosten_bedrag: number;
  klant_start_tijd: string | null;
  klant_eind_tijd: string | null;
  klant_pauze_minuten: number | null;
  klant_gewerkte_uren: number | null;
  klant_reiskosten_km: number | null;
  klant_reiskosten_bedrag: number | null;
  klant_opmerking: string | null;
  aanmelding: {
    medewerker_id: string;
    dienst: { datum: string; klant_naam: string; locatie: string } | null;
  } | null;
};

export async function GET() {
  // KRITIEK: Verify signed JWT instead of trusting JSON
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  const functies = Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie];
  const { data: alleDiensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, start_tijd, eind_tijd, functie, locatie, klant_naam, status, notities, aantal_nodig, uurtarief")
    .in("functie", functies)
    .in("status", ["open", "vol"])
    .gte("datum", new Date().toISOString().split("T")[0])
    .order("datum", { ascending: true })
    .limit(100);

  const { data: aanmeldingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst_id, status, uren_registraties(status)")
    .eq("medewerker_id", medewerker.id)
    .limit(100);

  const aanmeldMap = new Map(
    aanmeldingen?.map((a) => [
      a.dienst_id,
      { id: a.id, status: a.status, uren_status: (a.uren_registraties as UrenRegistratie[])?.[0]?.status },
    ]) || []
  );

  const diensten = (alleDiensten || []).map((d) => ({
    ...d,
    aangemeld: aanmeldMap.has(d.id),
    aanmelding_id: aanmeldMap.get(d.id)?.id,
    aanmelding_status: aanmeldMap.get(d.id)?.status,
    uren_status: aanmeldMap.get(d.id)?.uren_status,
  }));

  // Klant aanpassingen
  const { data: aanpassingen } = await supabaseAdmin
    .from("uren_registraties")
    .select(`
      id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag,
      klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren, klant_reiskosten_km, klant_reiskosten_bedrag, klant_opmerking,
      aanmelding:dienst_aanmeldingen!inner(medewerker_id, dienst:diensten(datum, klant_naam, locatie))
    `)
    .eq("status", "klant_aangepast")
    .eq("aanmelding.medewerker_id", medewerker.id);

  const mapped = (aanpassingen || []).map((u) => {
    const typedU = u as unknown as UrenAanpassing;
    return {
      id: typedU.id, start_tijd: typedU.start_tijd, eind_tijd: typedU.eind_tijd,
      pauze_minuten: typedU.pauze_minuten, gewerkte_uren: typedU.gewerkte_uren,
      reiskosten_km: typedU.reiskosten_km, reiskosten_bedrag: typedU.reiskosten_bedrag,
      klant_start_tijd: typedU.klant_start_tijd, klant_eind_tijd: typedU.klant_eind_tijd,
      klant_pauze_minuten: typedU.klant_pauze_minuten, klant_gewerkte_uren: typedU.klant_gewerkte_uren,
      klant_reiskosten_km: typedU.klant_reiskosten_km, klant_reiskosten_bedrag: typedU.klant_reiskosten_bedrag,
      klant_opmerking: typedU.klant_opmerking,
      dienst_datum: typedU.aanmelding?.dienst?.datum || "",
      klant_naam: typedU.aanmelding?.dienst?.klant_naam || "",
      locatie: typedU.aanmelding?.dienst?.locatie || "",
    };
  });

  // Check of account gepauzeerd is
  const { data: mwStatusCheck } = await supabaseAdmin
    .from("medewerkers")
    .select("status")
    .eq("id", medewerker.id)
    .single();
  const accountGepauzeerd = mwStatusCheck?.status === "gepauzeerd";

  // Vervangingsverzoeken: diensten waar deze medewerker vervanging zoekt + aanmeldingen van anderen
  const myVervangingAanmeldingen = aanmeldingen?.filter(a => a.status === "vervanging_gezocht") || [];
  const vervangingDienstIds = myVervangingAanmeldingen.map(a => a.dienst_id);
  let vervangingVerzoeken: { aanmelding_id: string; dienst_id: string; originele_aanmelding_id: string; naam: string; functie: string | string[]; profile_photo_url: string | null }[] = [];
  if (vervangingDienstIds.length > 0) {
    const { data: vervangers } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, vervanging_voor, medewerker:medewerkers(naam, functie, profile_photo_url)")
      .in("dienst_id", vervangingDienstIds)
      .eq("status", "aangemeld")
      .not("medewerker_id", "eq", medewerker.id);

    vervangingVerzoeken = (vervangers || []).map(v => {
      const mw = Array.isArray(v.medewerker) ? v.medewerker[0] : v.medewerker;
      return {
        aanmelding_id: v.id,
        dienst_id: v.dienst_id,
        originele_aanmelding_id: v.vervanging_voor || "",
        naam: mw?.naam || "Onbekend",
        functie: mw?.functie || "",
        profile_photo_url: mw?.profile_photo_url || null,
      };
    });
  }

  console.log(`[MEDEWERKER DIENSTEN] Functies: ${functies}, Found ${diensten.length} diensten for ${medewerker.naam}`);
  return NextResponse.json({ diensten, aanpassingen: mapped, vervangingVerzoeken, accountGepauzeerd });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify signed JWT instead of trusting JSON
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }
  const { action, dienst_id, aanmelding_id, uren_id, data } = await request.json();

  if (action === "aanmelden") {
    // Check of account gepauzeerd is
    const { data: mwStatus } = await supabaseAdmin
      .from("medewerkers")
      .select("status")
      .eq("id", medewerker.id)
      .single();

    if (mwStatus?.status === "gepauzeerd") {
      return NextResponse.json(
        { error: "Je account is gepauzeerd vanwege een openstaande boete. Neem contact op met TopTalent." },
        { status: 403 }
      );
    }

    await supabaseAdmin.from("dienst_aanmeldingen").insert({
      dienst_id,
      medewerker_id: medewerker.id,
      status: "aangemeld",
    });
  }

  if (action === "afmelden") {
    await supabaseAdmin.from("dienst_aanmeldingen").delete()
      .eq("dienst_id", dienst_id)
      .eq("medewerker_id", medewerker.id);
  }

  if (action === "annuleer_geaccepteerd") {
    // Haal aanmelding + dienst info op
    const { data: aanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, status, dienst:diensten(datum, start_tijd, status)")
      .eq("id", aanmelding_id)
      .eq("medewerker_id", medewerker.id)
      .single();

    const dienst = Array.isArray(aanmelding?.dienst) ? aanmelding?.dienst[0] : aanmelding?.dienst;
    if (!aanmelding || aanmelding.status !== "geaccepteerd" || !dienst) {
      return NextResponse.json({ error: "Aanmelding niet gevonden of niet geaccepteerd" }, { status: 400 });
    }

    const dienstStart = new Date(`${dienst.datum}T${dienst.start_tijd}`);
    const now = new Date();
    const urenTotStart = (dienstStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (urenTotStart > 48) {
      // > 48 uur: direct annuleren
      await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ status: "geannuleerd" })
        .eq("id", aanmelding_id);

      // Dienst terug naar open als die vol was
      if (dienst.status === "vol") {
        await supabaseAdmin
          .from("diensten")
          .update({ status: "open" })
          .eq("id", aanmelding.dienst_id);
      }
    } else {
      // <= 48 uur: vervanging zoeken
      await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ status: "vervanging_gezocht" })
        .eq("id", aanmelding_id);

      // Dienst terug naar open zodat vervangers zich kunnen aanmelden
      if (dienst.status === "vol") {
        await supabaseAdmin
          .from("diensten")
          .update({ status: "open" })
          .eq("id", aanmelding.dienst_id);
      }
    }

    return NextResponse.json({ success: true, vervanging: urenTotStart <= 48 });
  }

  if (action === "accept_vervanging") {
    // Verifieer dat medewerker eigenaar is van originele aanmelding
    const { data: origAanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, status")
      .eq("id", aanmelding_id)
      .eq("medewerker_id", medewerker.id)
      .eq("status", "vervanging_gezocht")
      .single();

    if (!origAanmelding) {
      return NextResponse.json({ error: "Originele aanmelding niet gevonden of geen vervanging actief" }, { status: 400 });
    }

    const vervangingAanmeldingId = data?.vervanging_aanmelding_id;
    if (!vervangingAanmeldingId) {
      return NextResponse.json({ error: "Vervanging aanmelding ID ontbreekt" }, { status: 400 });
    }

    // Vervanger aanmelding: set vervanging_voor, status → geaccepteerd
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ vervanging_voor: aanmelding_id, status: "geaccepteerd" })
      .eq("id", vervangingAanmeldingId);

    // Originele aanmelding: status → vervangen
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: "vervangen" })
      .eq("id", aanmelding_id);

    // Check of dienst weer vol moet
    const { data: dienstInfo } = await supabaseAdmin
      .from("diensten")
      .select("id, aantal_nodig")
      .eq("id", origAanmelding.dienst_id)
      .single();

    if (dienstInfo) {
      const { count } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id", { count: "exact", head: true })
        .eq("dienst_id", origAanmelding.dienst_id)
        .eq("status", "geaccepteerd");

      if (count !== null && count >= (dienstInfo.aantal_nodig || 1)) {
        await supabaseAdmin
          .from("diensten")
          .update({ status: "vol" })
          .eq("id", origAanmelding.dienst_id);
      }
    }

    // Stuur bevestigingsmail naar vervanger
    const { data: fullVervanger } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id,
        medewerker:medewerkers(naam, email),
        dienst:diensten(klant_naam, locatie, datum, start_tijd, eind_tijd, functie, notities)
      `)
      .eq("id", vervangingAanmeldingId)
      .single();

    const vervangerMw = Array.isArray(fullVervanger?.medewerker) ? fullVervanger?.medewerker[0] : fullVervanger?.medewerker;
    const vervangerDienst = Array.isArray(fullVervanger?.dienst) ? fullVervanger?.dienst[0] : fullVervanger?.dienst;

    if (vervangerMw?.email && vervangerDienst) {
      await sendMedewerkerShiftConfirmationEmail({
        medewerkerNaam: vervangerMw.naam,
        medewerkerEmail: vervangerMw.email,
        functie: vervangerDienst.functie,
        datum: vervangerDienst.datum,
        startTijd: vervangerDienst.start_tijd,
        eindTijd: vervangerDienst.eind_tijd,
        locatie: vervangerDienst.locatie,
        klantNaam: vervangerDienst.klant_naam,
        kledingvoorschrift: vervangerDienst.notities,
      });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "afwijs_vervanging") {
    const vervangingAanmeldingId = data?.vervanging_aanmelding_id;
    if (!vervangingAanmeldingId) {
      return NextResponse.json({ error: "Vervanging aanmelding ID ontbreekt" }, { status: 400 });
    }

    // Verifieer dat de oorspronkelijke medewerker dit mag doen
    const { data: vervangingAanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id")
      .eq("id", vervangingAanmeldingId)
      .single();

    if (!vervangingAanmelding) {
      return NextResponse.json({ error: "Vervanging aanmelding niet gevonden" }, { status: 404 });
    }

    // Check dat medewerker een vervanging_gezocht aanmelding heeft voor deze dienst
    const { data: origCheck } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id")
      .eq("dienst_id", vervangingAanmelding.dienst_id)
      .eq("medewerker_id", medewerker.id)
      .eq("status", "vervanging_gezocht")
      .maybeSingle();

    if (!origCheck) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
    }

    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: "afgewezen" })
      .eq("id", vervangingAanmeldingId);

    return NextResponse.json({ success: true });
  }

  if (action === "uren_indienen") {
    const { data: aanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, status, dienst:diensten(datum, eind_tijd)")
      .eq("id", aanmelding_id)
      .eq("medewerker_id", medewerker.id)
      .single();

    const dienst = Array.isArray(aanmelding?.dienst) ? aanmelding?.dienst[0] : aanmelding?.dienst;

    if (!aanmelding || !dienst) {
      return NextResponse.json({ error: "Aanmelding of dienst niet gevonden" }, { status: 404 });
    }

    if (aanmelding.status !== "geaccepteerd") {
      return NextResponse.json({ error: "Je kunt alleen uren indienen voor geaccepteerde diensten" }, { status: 400 });
    }

    const dienstEinde = new Date(`${dienst.datum}T${dienst.eind_tijd}`);
    if (dienstEinde > new Date()) {
      return NextResponse.json({ error: "Uren kunnen pas worden ingevuld nadat de eindtijd van de dienst is verstreken" }, { status: 400 });
    }

    const { data: bestaandUrenItem } = await supabaseAdmin
      .from("uren_registraties")
      .select("id")
      .eq("aanmelding_id", aanmelding_id)
      .maybeSingle();

    if (bestaandUrenItem) {
      return NextResponse.json({ error: "Voor deze dienst zijn al uren ingediend" }, { status: 409 });
    }

    await supabaseAdmin.from("uren_registraties").insert({
      aanmelding_id,
      start_tijd: data.start,
      eind_tijd: data.eind,
      pauze_minuten: data.pauze,
      gewerkte_uren: data.uren,
      reiskosten_km: sanitizeKilometers(data.reiskosten_km),
      reiskosten_bedrag: calculateMedewerkerReiskosten(data.reiskosten_km),
      status: "ingediend",
    });
  }

  if (action === "accepteer_aanpassing") {
    const { data: aanpassing } = await supabaseAdmin
      .from("uren_registraties")
      .select("klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren, klant_reiskosten_km, klant_reiskosten_bedrag")
      .eq("id", uren_id)
      .single();

    if (aanpassing) {
      await supabaseAdmin.from("uren_registraties").update({
        start_tijd: aanpassing.klant_start_tijd,
        eind_tijd: aanpassing.klant_eind_tijd,
        pauze_minuten: aanpassing.klant_pauze_minuten,
        gewerkte_uren: aanpassing.klant_gewerkte_uren,
        reiskosten_km: aanpassing.klant_reiskosten_km ?? 0,
        reiskosten_bedrag: aanpassing.klant_reiskosten_bedrag ?? 0,
        status: "klant_goedgekeurd",
      }).eq("id", uren_id);
    }
  }

  if (action === "weiger_aanpassing") {
    await supabaseAdmin.from("uren_registraties").update({
      status: "ingediend",
      klant_start_tijd: null, klant_eind_tijd: null,
      klant_pauze_minuten: null, klant_gewerkte_uren: null,
      klant_reiskosten_km: null, klant_reiskosten_bedrag: null, klant_opmerking: null,
    }).eq("id", uren_id);
  }

  return NextResponse.json({ success: true });
}
