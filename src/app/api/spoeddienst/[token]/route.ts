import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { checkRedisRateLimit, formRateLimit, getClientIP } from "@/lib/rate-limit-redis";

// GET: Publiek — Haal dienstdetails op via uniek token
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Ongeldig token" }, { status: 400 });
  }

  const { data: dienst, error } = await supabaseAdmin
    .from("diensten")
    .select("id, klant_naam, locatie, datum, start_tijd, eind_tijd, functie, aantal_nodig, uurtarief, is_spoeddienst, spoeddienst_token, status")
    .eq("spoeddienst_token", token)
    .eq("is_spoeddienst", true)
    .single();

  if (error || !dienst) {
    return NextResponse.json(
      { error: "Spoeddienst niet gevonden" },
      { status: 404 }
    );
  }

  // Check of dienst nog open is
  if (dienst.status !== "open") {
    return NextResponse.json(
      { error: "Deze spoeddienst is niet meer beschikbaar", status: dienst.status },
      { status: 410 }
    );
  }

  // Tel bestaande responses
  const { count } = await supabaseAdmin
    .from("spoeddienst_responses")
    .select("*", { count: "exact", head: true })
    .eq("dienst_id", dienst.id);

  return NextResponse.json({
    data: {
      klant_naam: dienst.klant_naam,
      locatie: dienst.locatie,
      datum: dienst.datum,
      start_tijd: dienst.start_tijd,
      eind_tijd: dienst.eind_tijd,
      functie: dienst.functie,
      aantal_nodig: dienst.aantal_nodig,
      uurtarief: dienst.uurtarief,
      responses_count: count || 0,
    },
  });
}

// POST: Publiek — Medewerker meldt zich beschikbaar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Ongeldig token" }, { status: 400 });
  }

  // Publiek formulier: zelfde rate limit als de andere publieke formulieren.
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`spoeddienst:${clientIP}`, formRateLimit);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het zo opnieuw." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
        },
      }
    );
  }

  // Haal dienst op
  const { data: dienst, error: dienstError } = await supabaseAdmin
    .from("diensten")
    .select("id, status, spoeddienst_token")
    .eq("spoeddienst_token", token)
    .eq("is_spoeddienst", true)
    .single();

  if (dienstError || !dienst) {
    return NextResponse.json(
      { error: "Spoeddienst niet gevonden" },
      { status: 404 }
    );
  }

  if (dienst.status !== "open") {
    return NextResponse.json(
      { error: "Deze spoeddienst is niet meer beschikbaar" },
      { status: 410 }
    );
  }

  // Parse body
  let body: { naam?: unknown; telefoon?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const naam = typeof body.naam === "string" ? body.naam : "";
  const telefoon = typeof body.telefoon === "string" ? body.telefoon : "";

  if (!naam.trim() || !telefoon.trim()) {
    return NextResponse.json(
      { error: "Naam en telefoon zijn verplicht" },
      { status: 400 }
    );
  }

  // Sanitize inputs
  const cleanNaam = naam.trim().substring(0, 255);
  const cleanTelefoon = telefoon.trim().substring(0, 50);

  // Check of deze persoon al gereageerd heeft (op basis van telefoon)
  const { data: existing } = await supabaseAdmin
    .from("spoeddienst_responses")
    .select("id")
    .eq("dienst_id", dienst.id)
    .eq("telefoon", cleanTelefoon)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Je hebt je al aangemeld voor deze spoeddienst" },
      { status: 409 }
    );
  }

  // Probeer medewerker te matchen op telefoon
  const { data: medewerker } = await supabaseAdmin
    .from("medewerkers")
    .select("id")
    .eq("telefoon", cleanTelefoon)
    .maybeSingle();

  // Sla response op
  const { error: insertError } = await supabaseAdmin
    .from("spoeddienst_responses")
    .insert({
      dienst_id: dienst.id,
      token,
      medewerker_id: medewerker?.id || null,
      naam: cleanNaam,
      telefoon: cleanTelefoon,
      status: "beschikbaar",
    });

  if (insertError) {
    captureRouteError(insertError, { route: "/api/spoeddienst/[token]", action: "POST" });
    // console.error("[SPOEDDIENST] Insert error:", insertError);
    return NextResponse.json(
      { error: "Er ging iets mis, probeer het opnieuw" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
