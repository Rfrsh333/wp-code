import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Haal alle beoordelingen op
  const { data: beoordelingen } = await supabaseAdmin
    .from("beoordelingen")
    .select("score, score_punctualiteit, score_professionaliteit, score_vaardigheden, score_communicatie")
    .eq("medewerker_id", medewerker.id);

  const scores = beoordelingen || [];

  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

  // Aanwezigheid: geaccepteerde diensten vs no-shows
  const { count: gewerkteCount } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id", { count: "exact", head: true })
    .eq("medewerker_id", medewerker.id)
    .eq("status", "geaccepteerd");

  const { count: noShowCount } = await supabaseAdmin
    .from("boetes")
    .select("id", { count: "exact", head: true })
    .eq("medewerker_id", medewerker.id)
    .eq("reden", "No-show");

  const totaalDiensten = (gewerkteCount || 0) + (noShowCount || 0);
  const aanwezigheid = totaalDiensten > 0
    ? Math.round(((gewerkteCount || 0) / totaalDiensten) * 100)
    : 100;

  return NextResponse.json({
    algemeen: avg(scores.map((s) => s.score)),
    punctualiteit: avg(scores.filter((s) => s.score_punctualiteit != null).map((s) => s.score_punctualiteit!)),
    professionaliteit: avg(scores.filter((s) => s.score_professionaliteit != null).map((s) => s.score_professionaliteit!)),
    vaardigheden: avg(scores.filter((s) => s.score_vaardigheden != null).map((s) => s.score_vaardigheden!)),
    communicatie: avg(scores.filter((s) => s.score_communicatie != null).map((s) => s.score_communicatie!)),
    aanwezigheid,
    noShows: noShowCount || 0,
    aantalBeoordelingen: scores.length,
    totaalDiensten,
  });
}
