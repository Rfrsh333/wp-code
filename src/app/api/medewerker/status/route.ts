import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSessieInclGepauzeerd } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  try {
    // Ook gepauzeerde medewerkers mogen hun status zien (banner + boete betalen).
    const medewerker = await getMedewerkerSessieInclGepauzeerd(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let openstaandeBoete: { id: string; bedrag: number; reden: string | null } | null = null;
    if (medewerker.status === "gepauzeerd") {
      const { data } = await supabaseAdmin
        .from("boetes")
        .select("id, bedrag, reden")
        .eq("medewerker_id", medewerker.id)
        .eq("status", "openstaand")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      openstaandeBoete = data ? { id: data.id, bedrag: Number(data.bedrag), reden: data.reden ?? null } : null;
    }

    return NextResponse.json({
      gepauzeerd: medewerker.status === "gepauzeerd",
      status: medewerker.status,
      openstaande_boete: openstaandeBoete,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/status", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
