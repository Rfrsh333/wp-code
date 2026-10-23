import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { PDF_URL_SECONDEN, UITBETALING_BUCKET } from "@/lib/uitbetaling/config";
import { isMigratieFout } from "@/lib/uitbetaling/db";

/**
 * PDF van één eigen zelffactuur, via een kortlevende signed URL (private bucket).
 *   GET  → 200 { url, verloopt_over_seconden } (app)
 *   GET ?redirect=1 → 302 naar de PDF (web: gewone link, de sessiecookie gaat mee)
 *   404 als de factuur niet van deze medewerker is of (nog) niet bestaat.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("uitbetalingen")
      .select("id, pdf_pad, ronde:uitbetaalrondes!inner(status)")
      .eq("id", id)
      .eq("medewerker_id", medewerker.id)
      .neq("ronde.status", "concept")
      .maybeSingle();
    if (isMigratieFout(error)) return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    if (error) throw error;
    if (!data?.pdf_pad) return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });

    const { data: signed, error: signFout } = await supabaseAdmin.storage
      .from(UITBETALING_BUCKET)
      .createSignedUrl(data.pdf_pad as string, PDF_URL_SECONDEN);
    if (signFout || !signed?.signedUrl) throw signFout ?? new Error("Geen signed URL");

    if (request.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json(
      { url: signed.signedUrl, verloopt_over_seconden: PDF_URL_SECONDEN },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/zelffacturen/[id]/pdf", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
