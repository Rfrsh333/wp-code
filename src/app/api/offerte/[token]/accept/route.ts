import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { checkRedisRateLimit, contractSignRateLimit, getClientIP } from "@/lib/rate-limit-redis";

// POST /api/offerte/[token]/accept - Klant accepteert offerte (digitale ondertekening)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Publiek endpoint met een token in de URL: beperk het aantal pogingen per IP
    // (zelfde limiet als het ondertekenen van contracten).
    const ip = getClientIP(request);
    const rateLimit = await checkRedisRateLimit(`offerte-accept:${ip}`, contractSignRateLimit);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het later opnieuw." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const { token } = await params;
    let naam: unknown;
    try {
      ({ naam } = await request.json());
    } catch {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }

    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });
    }

    if (typeof naam !== "string" || naam.trim().length < 2) {
      return NextResponse.json({ error: "Naam is verplicht voor ondertekening" }, { status: 400 });
    }

    // Fetch offerte
    const { data: offerte, error } = await supabaseAdmin
      .from("offertes")
      .select("id, status, geldig_tot, accepted_at")
      .eq("token", token)
      .single();

    if (error || !offerte) {
      return NextResponse.json({ error: "Offerte niet gevonden" }, { status: 404 });
    }

    if (offerte.accepted_at) {
      return NextResponse.json({ error: "Deze offerte is al geaccepteerd" }, { status: 400 });
    }

    // Check geldigheid
    if (offerte.geldig_tot && new Date(offerte.geldig_tot) < new Date()) {
      return NextResponse.json({ error: "Deze offerte is verlopen" }, { status: 400 });
    }

    // Update offerte
    const { error: updateError } = await supabaseAdmin
      .from("offertes")
      .update({
        status: "geaccepteerd",
        accepted_at: new Date().toISOString(),
        accepted_naam: naam.trim(),
        accepted_ip: ip,
      })
      .eq("id", offerte.id);

    if (updateError) {
      captureRouteError(updateError, { route: "/api/offerte/[token]/accept", action: "POST" });
      return NextResponse.json({ error: "Fout bij accepteren" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Offerte succesvol geaccepteerd" });
  } catch (error) {
    captureRouteError(error, { route: "/api/offerte/[token]/accept", action: "POST" });
    // console.error("Offerte accept error:", error);
    return NextResponse.json({ error: "Fout bij accepteren offerte" }, { status: 500 });
  }
}
