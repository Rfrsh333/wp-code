import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { haalUrenRegistraties } from "@/lib/medewerker/uren";
import { isVerdiend } from "@/lib/medewerker/uren-regels";
import { telVerlopendeDocumenten } from "@/lib/medewerker/dienst-regels";

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = nlVandaag();

    // Volgende shift
    const { data: volgendeDiensten } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst:diensten(klant_naam, locatie, datum, start_tijd, eind_tijd, functie)")
      .eq("medewerker_id", medewerker.id)
      .in("status", [...INGEPLAND_STATUSSEN])
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
      .eq("status", "aangeboden");

    // Verlopen of binnen 30 dagen verlopende documenten; per type telt alleen het nieuwste.
    const { data: documenten } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("document_type, expiry_date, uploaded_at")
      .eq("medewerker_id", medewerker.id)
      .order("uploaded_at", { ascending: false })
      .limit(200);
    const verlopenDocumenten = telVerlopendeDocumenten(
      (documenten ?? []) as { document_type: string; expiry_date: string | null; uploaded_at: string | null }[],
      plusDagen(today, 30),
    );

    // Ongelezen berichten
    const { count: ongelezen } = await supabaseAdmin
      .from("berichten")
      .select("id", { count: "exact", head: true })
      .eq("aan_id", medewerker.id)
      .eq("aan_type", "medewerker")
      .eq("gelezen", false);

    // Totaal diensten en uren (zelfde definities als dashboard/Uren; filter via de aanmelding)
    const { data: stats } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id")
      .eq("medewerker_id", medewerker.id)
      .in("status", [...INGEPLAND_STATUSSEN])
      .limit(500);

    const registraties = await haalUrenRegistraties(medewerker.id);
    const totaalUren = registraties.filter((u) => isVerdiend(u.status)).reduce((sum, u) => sum + (u.gewerkte_uren || 0), 0);

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
