import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";

async function getKlant() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return null;
  return await verifyKlantSession(session.value);
}

export async function GET() {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get favorites with medewerker info
  const { data: favorieten } = await supabaseAdmin
    .from("klant_favoriete_medewerkers")
    .select(`
      id, notitie, created_at,
      medewerker:medewerkers(id, naam, functie, profile_photo_url, gemiddelde_score)
    `)
    .eq("klant_id", klant.id)
    .order("created_at", { ascending: false });

  // Get diensten count per favoriet medewerker
  const favorietenData = await Promise.all(
    (favorieten || []).map(async (f) => {
      const med = f.medewerker as unknown as {
        id: string;
        naam: string;
        functie: string | string[];
        profile_photo_url: string | null;
        gemiddelde_score: number | null;
      };
      if (!med) return null;

      const { count } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id", { count: "exact", head: true })
        .eq("medewerker_id", med.id)
        .in("dienst_id", (
          await supabaseAdmin.from("diensten").select("id").eq("klant_id", klant.id)
        ).data?.map((d) => d.id) || []);

      return {
        id: f.id,
        notitie: f.notitie,
        medewerker_id: med.id,
        naam: med.naam,
        functie: med.functie,
        profile_photo_url: med.profile_photo_url,
        gemiddelde_score: med.gemiddelde_score,
        diensten_count: count || 0,
      };
    })
  );

  // Recent gewerkte medewerkers (niet al favoriet)
  const favorietIds = favorietenData.filter(Boolean).map((f) => f!.medewerker_id);

  const { data: klantDiensten } = await supabaseAdmin
    .from("diensten")
    .select("id")
    .eq("klant_id", klant.id);

  let recentMedewerkers: {
    medewerker_id: string;
    naam: string;
    functie: string | string[];
    profile_photo_url: string | null;
    gemiddelde_score: number | null;
    laatste_dienst: string;
  }[] = [];

  if (klantDiensten?.length) {
    const { data: recentAanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        medewerker_id,
        medewerker:medewerkers(id, naam, functie, profile_photo_url, gemiddelde_score),
        dienst:diensten(datum)
      `)
      .in("dienst_id", klantDiensten.map((d) => d.id))
      .eq("status", "bevestigd")
      .order("created_at", { ascending: false })
      .limit(50);

    const seen = new Set<string>();
    for (const a of recentAanmeldingen || []) {
      const med = a.medewerker as unknown as {
        id: string;
        naam: string;
        functie: string | string[];
        profile_photo_url: string | null;
        gemiddelde_score: number | null;
      };
      const dienst = a.dienst as unknown as { datum: string };
      if (!med || seen.has(med.id) || favorietIds.includes(med.id)) continue;
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
  }

  return NextResponse.json({
    favorieten: favorietenData.filter(Boolean),
    recentMedewerkers,
  });
}

export async function POST(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { medewerker_id, notitie } = await request.json();
  if (!medewerker_id) {
    return NextResponse.json({ error: "medewerker_id is verplicht" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("klant_favoriete_medewerkers").insert({
    klant_id: klant.id,
    medewerker_id,
    notitie: notitie || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Medewerker is al een favoriet" }, { status: 409 });
    }
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { medewerker_id } = await request.json();
  if (!medewerker_id) {
    return NextResponse.json({ error: "medewerker_id is verplicht" }, { status: 400 });
  }

  await supabaseAdmin
    .from("klant_favoriete_medewerkers")
    .delete()
    .eq("klant_id", klant.id)
    .eq("medewerker_id", medewerker_id);

  return NextResponse.json({ success: true });
}
