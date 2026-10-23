import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { isIngepland } from "@/lib/dienst-status";
import { geldendeTijden } from "@/lib/medewerker/reactie-regels";
import { GEEN_EXTRAS, haalDienstExtras, haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";

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

  // Per ingeplande medewerker de tijden die voor hem gelden (eigen tijden na acceptatie), en per
  // dienst kledingvoorschrift en pauze (leeg zolang de migratie niet gedraaid is).
  const alleAanmeldingIds = (diensten || []).flatMap((d) => (d.dienst_aanmeldingen || []).map((a: { id: string }) => a.id));
  const [voorwaarden, extras] = await Promise.all([
    haalVoorwaarden(alleAanmeldingIds),
    haalDienstExtras((diensten || []).map((d) => d.id)),
  ]);

  const rooster = (diensten || []).map((d) => ({
    id: d.id,
    datum: d.datum,
    start_tijd: d.start_tijd,
    eind_tijd: d.eind_tijd,
    locatie: d.locatie,
    functie: d.functie,
    status: d.status,
    aantal_nodig: d.aantal_nodig,
    ...(extras.get(d.id) ?? GEEN_EXTRAS),
    medewerkers: (d.dienst_aanmeldingen || [])
      // Ingepland = geaccepteerd door de klant óf bevestigd door medewerker/admin.
      .filter((a: { status: string }) => isIngepland(a.status))
      .map((a: { id: string; medewerker: unknown }) => {
        const m = a.medewerker as { id: string; naam: string; functie: string | string[]; profile_photo_url: string | null } | null;
        const tijden = geldendeTijden(d, voorwaarden.get(a.id));
        return {
          id: m?.id,
          naam: m?.naam,
          functie: m?.functie,
          profile_photo_url: m?.profile_photo_url,
          start_tijd: tijden.start_tijd,
          eind_tijd: tijden.eind_tijd,
          eigen_tijden: tijden.eigen_tijden,
          // De geaccepteerde eigen tijden ("HH:MM"), of null als de medewerker de hele dienst werkt.
          voorgestelde_start_tijd: tijden.eigen_tijden ? tijden.start_tijd : null,
          voorgestelde_eind_tijd: tijden.eigen_tijden ? tijden.eind_tijd : null,
        };
      }),
  }));

  return NextResponse.json({ rooster });
}
