import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("contracten")
      .select(`
        id, contract_nummer, type, titel, status,
        startdatum, einddatum, verzonden_at,
        ondertekend_medewerker_at, ondertekend_admin_at,
        created_at
      `)
      .eq("medewerker_id", medewerker.id)
      .in("status", ["verzonden", "bekeken", "ondertekend_medewerker", "ondertekend_admin", "actief", "verlopen", "opgezegd"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/contracten", action: "GET" });
      // console.error("[MEDEWERKER CONTRACTEN] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    captureRouteError(err, { route: "/api/medewerker/contracten", action: "GET" });
    // console.error("[MEDEWERKER CONTRACTEN] Error:", err);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
