import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const klant = await verifyKlantSession(session.value);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start en end parameters zijn verplicht" }, { status: 400 });
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
      .filter((a: { status: string }) => a.status === "bevestigd")
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
