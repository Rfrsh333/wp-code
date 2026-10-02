import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getClientIP } from "@/lib/rate-limit-redis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Ongeldige verificatie link" }, { status: 400 });
  }

  // Rate limit: 10 requests per minute per IP
  const ip = getClientIP(request);
  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "verify",
      });
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json({ error: "Te veel verzoeken. Probeer het later opnieuw." }, { status: 429 });
      }
    }
  } catch {
    // Redis not configured, continue without rate limiting
  }

  // Lookup medewerker by token. `bsn_verified` en `documenten_compleet`
  // bestaan niet op medewerkers (live: bsn_geverifieerd); door die select gaf
  // elke scan een 404.
  const { data: medewerker, error } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, functie, profile_photo_url, bsn_geverifieerd")
    .eq("verificatie_token", token)
    .maybeSingle();

  if (error || !medewerker) {
    return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
  }

  // "Documenten compleet" staat op de inschrijving waaruit de medewerker is
  // aangemaakt. Geen gekoppelde inschrijving → niet compleet tonen.
  const { data: inschrijving } = await supabaseAdmin
    .from("inschrijvingen")
    .select("documenten_compleet")
    .eq("medewerker_id", medewerker.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Check dienst vandaag
  const today = new Date().toISOString().split("T")[0];
  const { data: dienstVandaag } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      id, status,
      dienst:diensten(datum, start_tijd, eind_tijd, locatie, functie)
    `)
    .eq("medewerker_id", medewerker.id)
    .eq("status", "bevestigd")
    .limit(5);

  const vandaagDiensten = (dienstVandaag || []).filter((da) => {
    const d = da.dienst as unknown as { datum?: string };
    return d?.datum === today;
  });

  // Log scan
  await supabaseAdmin.from("verificatie_logs").insert({
    medewerker_id: medewerker.id,
    ip_adres: ip,
  });

  return NextResponse.json({
    medewerker: {
      naam: medewerker.naam,
      functie: medewerker.functie,
      profile_photo_url: medewerker.profile_photo_url,
      bsn_verified: medewerker.bsn_geverifieerd ?? false,
      documenten_compleet: inschrijving?.documenten_compleet ?? false,
    },
    dienst_vandaag: vandaagDiensten.map((da) => {
      const d = da.dienst as unknown as {
        datum?: string;
        start_tijd?: string;
        eind_tijd?: string;
        locatie?: string;
        functie?: string;
      };
      return {
        start_tijd: d?.start_tijd,
        eind_tijd: d?.eind_tijd,
        locatie: d?.locatie,
        functie: d?.functie,
      };
    }),
  });
}
