import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * POST { bericht_ids: string[] } — markeer eigen ontvangen berichten als gelezen.
 * De Berichten-pagina riep deze route elke 10 s aan terwijl hij niet bestond (405).
 */
export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.bericht_ids)
      ? (body.bericht_ids as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 200)
      : [];
    if (ids.length === 0) return NextResponse.json({ success: true, bijgewerkt: 0 });

    const { data, error } = await supabaseAdmin
      .from("berichten")
      .update({ gelezen: true, gelezen_at: new Date().toISOString() })
      .in("id", ids)
      .eq("aan_type", "medewerker")
      .eq("aan_id", medewerker.id)
      .eq("gelezen", false)
      .select("id");

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/berichten/mark-read", action: "POST" });
      return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true, bijgewerkt: data?.length ?? 0 });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/berichten/mark-read", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
