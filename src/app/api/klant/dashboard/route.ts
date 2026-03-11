import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { signFactuurToken, verifyKlantSession } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const klant = await verifyKlantSession(session.value);
  if (!klant) {
    console.warn("[SECURITY] Invalid klant session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);

  const [{ data: diensten }, { data: facturen }] = await Promise.all([
    supabaseAdmin
      .from("diensten")
      .select("id, datum, start_tijd, eind_tijd, locatie, functie, aantal_nodig, status")
      .eq("klant_id", klant.id)
      .order("datum", { ascending: true }),
    supabaseAdmin
      .from("facturen")
      .select("id, factuur_nummer, periode_start, periode_eind, totaal, status, created_at, klant_id")
      .eq("klant_id", klant.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const dienstIds = (diensten || []).map((dienst) => dienst.id);
  let pendingHoursCount = 0;
  let pendingHoursTotal = 0;
  let approvedHoursThisMonth = 0;

  if (dienstIds.length > 0) {
    const { data: uren } = await supabaseAdmin
      .from("uren_registraties")
      .select("status, gewerkte_uren, created_at, aanmelding:dienst_aanmeldingen!inner(dienst_id)")
      .in("aanmelding.dienst_id", dienstIds);

    (uren || []).forEach((item) => {
      const status = item.status || "";
      const hours = item.gewerkte_uren || 0;
      if (status === "ingediend") {
        pendingHoursCount += 1;
        pendingHoursTotal += hours;
      }
      if (["klant_goedgekeurd", "goedgekeurd"].includes(status)) {
        const createdAt = item.created_at ? new Date(item.created_at) : null;
        if (createdAt && createdAt >= monthStart) {
          approvedHoursThisMonth += hours;
        }
      }
    });
  }

  const upcomingDiensten = (diensten || [])
    .filter((dienst) => dienst.datum >= today && dienst.status !== "geannuleerd")
    .slice(0, 4);

  const activeDienstenCount = (diensten || []).filter(
    (dienst) => dienst.datum >= today && ["open", "bezig", "vol"].includes(dienst.status)
  ).length;

  const openFacturenCount = (facturen || []).filter((factuur) => factuur.status !== "betaald").length;

  const recentFacturen = await Promise.all(
    (facturen || []).map(async (factuur) => {
      const token = await signFactuurToken(factuur.id, klant.id);
      return {
        ...factuur,
        viewUrl: `/api/facturen/${factuur.id}/pdf?token=${token}`,
      };
    })
  );

  return NextResponse.json({
    stats: {
      pendingHoursCount,
      pendingHoursTotal: Math.round(pendingHoursTotal * 100) / 100,
      approvedHoursThisMonth: Math.round(approvedHoursThisMonth * 100) / 100,
      activeDienstenCount,
      openFacturenCount,
    },
    upcomingDiensten,
    recentFacturen,
  });
}
