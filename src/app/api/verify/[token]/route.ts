import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Ongeldige verificatie link" }, { status: 400 });
  }

  // Rate limit: 10 requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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

  // Lookup medewerker by token
  const { data: medewerker, error } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, functie, profile_photo_url, bsn_verified, documenten_compleet")
    .eq("verificatie_token", token)
    .single();

  if (error || !medewerker) {
    return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
  }

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
      bsn_verified: medewerker.bsn_verified ?? false,
      documenten_compleet: medewerker.documenten_compleet ?? false,
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
