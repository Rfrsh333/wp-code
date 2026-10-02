import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { captureRouteError } from "@/lib/sentry-utils";

type Med = {
  id: string;
  naam: string;
  functie: string | string[];
  profile_photo_url: string | null;
  gemiddelde_score: number | null;
};

function eerste<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Favorieten + alle ingeplande aanmeldingen bij deze klant in twee queries
  // (voorheen per favoriet opnieuw álle dienst-id's van de klant ophalen: N+1 en een
  // telling die ook afgewezen/geannuleerde aanmeldingen meenam).
  const [{ data: favorieten }, { data: gewerkt }] = await Promise.all([
    supabaseAdmin
      .from("klant_favoriete_medewerkers")
      .select(`
        id, notitie, created_at,
        medewerker:medewerkers(id, naam, functie, profile_photo_url, gemiddelde_score)
      `)
      .eq("klant_id", klant.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        medewerker_id, aangemeld_at,
        medewerker:medewerkers(id, naam, functie, profile_photo_url, gemiddelde_score),
        dienst:diensten!inner(datum, klant_id)
      `)
      .eq("dienst.klant_id", klant.id)
      .in("status", [...INGEPLAND_STATUSSEN])
      // dienst_aanmeldingen heeft geen created_at (42703 → lege lijst, nooit "recent gewerkt").
      .order("aangemeld_at", { ascending: false })
      .limit(1000),
  ]);

  const telling: Record<string, number> = {};
  for (const a of gewerkt || []) telling[a.medewerker_id] = (telling[a.medewerker_id] || 0) + 1;

  const favorietenData = (favorieten || [])
    .map((f) => {
      const med = eerste(f.medewerker as unknown as Med | Med[] | null);
      if (!med) return null;
      return {
        id: f.id,
        notitie: f.notitie,
        medewerker_id: med.id,
        naam: med.naam,
        functie: med.functie,
        profile_photo_url: med.profile_photo_url,
        gemiddelde_score: med.gemiddelde_score,
        diensten_count: telling[med.id] || 0,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  // Recent gewerkte medewerkers (niet al favoriet)
  const favorietIds = new Set(favorietenData.map((f) => f.medewerker_id));
  const recentMedewerkers: (Omit<Med, "id"> & { medewerker_id: string; laatste_dienst: string })[] = [];
  const seen = new Set<string>();
  for (const a of gewerkt || []) {
    const med = eerste(a.medewerker as unknown as Med | Med[] | null);
    const dienst = eerste(a.dienst as unknown as { datum: string } | { datum: string }[] | null);
    if (!med || seen.has(med.id) || favorietIds.has(med.id)) continue;
    seen.add(med.id);
    recentMedewerkers.push({
      medewerker_id: med.id,
      naam: med.naam,
      functie: med.functie,
      profile_photo_url: med.profile_photo_url,
      gemiddelde_score: med.gemiddelde_score,
      laatste_dienst: dienst?.datum || "",
    });
    if (recentMedewerkers.length >= 10) break;
  }

  return NextResponse.json({
    favorieten: favorietenData,
    recentMedewerkers,
  });
}

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { medewerker_id, notitie } = await request.json().catch(() => ({}));
  if (!medewerker_id || typeof medewerker_id !== "string") {
    return NextResponse.json({ error: "medewerker_id is verplicht" }, { status: 400 });
  }

  // Alleen medewerkers die al eens bij deze klant ingepland stonden. Favorieten krijgen
  // uitnodigingen vanuit de aanvraag; zonder deze check kon een klant elke medewerker-id uitnodigen.
  const { count } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst:diensten!inner(klant_id)", { count: "exact", head: true })
    .eq("medewerker_id", medewerker_id)
    .eq("dienst.klant_id", klant.id)
    .in("status", [...INGEPLAND_STATUSSEN]);
  if (!count) {
    return NextResponse.json({ error: "U kunt alleen medewerkers toevoegen die al bij u hebben gewerkt" }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("klant_favoriete_medewerkers").insert({
    klant_id: klant.id,
    medewerker_id,
    notitie: typeof notitie === "string" && notitie.trim() ? notitie.trim().slice(0, 500) : null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Medewerker is al een favoriet" }, { status: 409 });
    }
    captureRouteError(error, { route: "/api/klant/favorieten", action: "POST" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { medewerker_id } = await request.json().catch(() => ({}));
  if (!medewerker_id) {
    return NextResponse.json({ error: "medewerker_id is verplicht" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("klant_favoriete_medewerkers")
    .delete()
    .eq("klant_id", klant.id)
    .eq("medewerker_id", medewerker_id);

  if (error) {
    captureRouteError(error, { route: "/api/klant/favorieten", action: "DELETE" });
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
