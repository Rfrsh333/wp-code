import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("medewerker_session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { verifyMedewerkerSession } = await import("@/lib/session");
    const medewerker = await verifyMedewerkerSession(session.value);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = new Date().toISOString().split("T")[0];

    // Volgende shift
    const { data: volgendeDiensten } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst:diensten(klant_naam, locatie, datum, start_tijd, eind_tijd, functie)")
      .eq("medewerker_id", medewerker.id)
      .eq("status", "geaccepteerd")
      .order("created_at", { ascending: true })
      .limit(100);

    const volgendeShift = (volgendeDiensten || [])
      .map(a => Array.isArray(a.dienst) ? a.dienst[0] : a.dienst)
      .filter(d => d && d.datum >= today)
      .sort((a, b) => (a!.datum > b!.datum ? 1 : -1))[0] || null;

    // Open aanbiedingen
    const { count: openAanbiedingen } = await supabaseAdmin
      .from("dienst_aanbiedingen")
      .select("id", { count: "exact", head: true })
      .eq("medewerker_id", medewerker.id)
      .eq("status", "verstuurd");

    // Verlopen documenten (within 30 days)
    const dertigDagenVoorruit = new Date();
    dertigDagenVoorruit.setDate(dertigDagenVoorruit.getDate() + 30);
    const { count: verlopenDocumenten } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("id", { count: "exact", head: true })
      .eq("medewerker_id", medewerker.id)
      .not("expiry_date", "is", null)
      .lte("expiry_date", dertigDagenVoorruit.toISOString().split("T")[0]);

    // Ongelezen berichten
    const { count: ongelezen } = await supabaseAdmin
      .from("berichten")
      .select("id", { count: "exact", head: true })
      .eq("aan_id", medewerker.id)
      .eq("aan_type", "medewerker")
      .eq("gelezen", false);

    // Totaal diensten en uren
    const { data: stats } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id")
      .eq("medewerker_id", medewerker.id)
      .eq("status", "geaccepteerd")
      .limit(500);

    const { data: urenData } = await supabaseAdmin
      .from("uren_registraties")
      .select("gewerkte_uren, aanmelding:dienst_aanmeldingen!inner(medewerker_id)")
      .eq("status", "goedgekeurd")
      .eq("aanmelding.medewerker_id", medewerker.id)
      .limit(500);

    const totaalUren = (urenData || []).reduce((sum, u) => sum + (u.gewerkte_uren || 0), 0);

    return NextResponse.json({
      volgendeShift,
      openAanbiedingen: openAanbiedingen || 0,
      verlopenDocumenten: verlopenDocumenten || 0,
      ongelezen: ongelezen || 0,
      totaalDiensten: stats?.length || 0,
      totaalUren: Math.round(totaalUren * 10) / 10,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/dashboard-summary", action: "GET" });
    // console.error("Dashboard summary error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
