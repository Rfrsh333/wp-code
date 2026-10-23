import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSessieInclGepauzeerd } from "@/lib/medewerker/sessie-boete";

export async function GET(request: NextRequest) {
  // Gepauzeerde medewerkers moeten hun boete juist kunnen zien en betalen.
  const medewerker = await getMedewerkerSessieInclGepauzeerd(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: boetes } = await supabaseAdmin
    .from("boetes")
    .select("id, bedrag, reden, status, created_at, dienst:diensten(datum, locatie, functie)")
    .eq("medewerker_id", medewerker.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ boetes: boetes || [] });
}
