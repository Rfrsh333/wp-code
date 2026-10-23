import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { isIngepland } from "@/lib/dienst-status";

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const DATUM = /^\d{4}-\d{2}-\d{2}$/;
  if (!start || !end || !DATUM.test(start) || !DATUM.test(end)) {
    return NextResponse.json({ error: "start en end (YYYY-MM-DD) zijn verplicht" }, { status: 400 });
  }

  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select(`
      id, datum, start_tijd, eind_tijd, locatie, functie, status, aantal_nodig,
      dienst_aanmeldingen(
        id, status,
        medewerker:medewerkers(id, naam, functie, profile_photo_url)
      )
    `)
    .eq("klant_id", klant.id)
    .gte("datum", start)
    .lte("datum", end)
    .order("datum", { ascending: true })
    .order("start_tijd", { ascending: true });

  const rooster = (diensten || []).map((d) => ({
    id: d.id,
    datum: d.datum,
    start_tijd: d.start_tijd,
    eind_tijd: d.eind_tijd,
    locatie: d.locatie,
    functie: d.functie,
    status: d.status,
    aantal_nodig: d.aantal_nodig,
    medewerkers: (d.dienst_aanmeldingen || [])
      // Ingepland = geaccepteerd door de klant óf bevestigd door medewerker/admin.
      .filter((a: { status: string }) => isIngepland(a.status))
      .map((a: { medewerker: unknown }) => {
        const m = a.medewerker as { id: string; naam: string; functie: string | string[]; profile_photo_url: string | null } | null;
        return {
          id: m?.id,
          naam: m?.naam,
          functie: m?.functie,
          profile_photo_url: m?.profile_photo_url,
        };
      }),
  }));

  return NextResponse.json({ rooster });
}
