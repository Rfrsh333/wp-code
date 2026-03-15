import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyKlantSession } from "@/lib/session";
import { sendMedewerkerShiftConfirmationEmail } from "@/lib/medewerker-shift-email";

async function getKlant() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return null;
  return verifyKlantSession(session.value);
}

export async function GET() {
  const klant = await getKlant();
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, start_tijd, eind_tijd, locatie, functie, aantal_nodig, status")
    .eq("klant_id", klant.id)
    .gte("datum", today)
    .neq("status", "geannuleerd")
    .order("datum", { ascending: true })
    .limit(100);

  if (!diensten || diensten.length === 0) {
    return NextResponse.json({ diensten: [] });
  }

  const dienstIds = diensten.map((d) => d.id);

  const { data: aanmeldingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst_id, status")
    .in("dienst_id", dienstIds);

  const countMap: Record<string, { total: number; aangemeld: number; geaccepteerd: number }> = {};
  (aanmeldingen || []).forEach((a) => {
    if (!countMap[a.dienst_id]) {
      countMap[a.dienst_id] = { total: 0, aangemeld: 0, geaccepteerd: 0 };
    }
    countMap[a.dienst_id].total++;
    if (a.status === "aangemeld") countMap[a.dienst_id].aangemeld++;
    if (a.status === "geaccepteerd") countMap[a.dienst_id].geaccepteerd++;
  });

  const result = diensten.map((d) => ({
    ...d,
    aanmeldingen_count: countMap[d.id]?.total || 0,
    aanmeldingen_aangemeld: countMap[d.id]?.aangemeld || 0,
    aanmeldingen_geaccepteerd: countMap[d.id]?.geaccepteerd || 0,
  }));

  return NextResponse.json({ diensten: result });
}

export async function POST(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, dienst_id, id, data } = body;

  if (action === "get_aanmeldingen") {
    // Verifieer dat dienst bij deze klant hoort
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("id, klant_id")
      .eq("id", dienst_id)
      .eq("klant_id", klant.id)
      .single();

    if (!dienst) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
    }

    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("*, medewerker:medewerkers(naam, functie, profile_photo_url, gemiddelde_score, aantal_beoordelingen, admin_score_aanwezigheid, admin_score_vaardigheden)")
      .eq("dienst_id", dienst_id)
      .order("aangemeld_at", { ascending: true })
      .limit(100);

    return NextResponse.json({ data: aanmeldingen });
  }

  if (action === "update_aanmelding") {
    // Haal aanmelding op en verifieer dat het bij een dienst van deze klant hoort
    const { data: aanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, dienst:diensten!inner(klant_id)")
      .eq("id", id)
      .single();

    const dienstData = Array.isArray(aanmelding?.dienst) ? aanmelding?.dienst[0] : aanmelding?.dienst;
    if (!aanmelding || dienstData?.klant_id !== klant.id) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
    }

    // Update aanmelding status
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: data.status, beoordeeld_at: new Date().toISOString() })
      .eq("id", id);

    // Bij acceptatie: stuur bevestigingsmail
    if (data.status === "geaccepteerd") {
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
        });
      }
    }

    // Check of dienst "vol" moet worden
    const { data: dienstInfo } = await supabaseAdmin
      .from("diensten")
      .select("id, aantal_nodig")
      .eq("id", aanmelding.dienst_id)
      .single();

    if (dienstInfo) {
      const { count } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id", { count: "exact", head: true })
        .eq("dienst_id", aanmelding.dienst_id)
        .eq("status", "geaccepteerd");

      if (count !== null && count >= (dienstInfo.aantal_nodig || 1)) {
        await supabaseAdmin
          .from("diensten")
          .update({ status: "vol" })
          .eq("id", aanmelding.dienst_id);
      }
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
