import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, hasRequiredAdminRole } from "@/lib/admin-auth";
import { checkRedisRateLimit, getClientIP, aiRateLimit } from "@/lib/rate-limit-redis";
import { supabaseAdmin } from "@/lib/supabase";
import { analyzeKlantRetention } from "@/lib/agents/klant-retention";

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`ai-admin:${clientIP}`, aiRateLimit);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  const { klant_id } = await request.json();
  if (!klant_id) return NextResponse.json({ error: "klant_id is verplicht" }, { status: 400 });

  // Haal klant data op
  const { data: klant, error } = await supabaseAdmin
    .from("klanten")
    .select("bedrijfsnaam, contactpersoon, stad, loyalty_tier, totaal_diensten, totaal_omzet, laatste_dienst_datum, gemiddelde_beoordeling")
    .eq("id", klant_id)
    .single();

  if (error || !klant) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  // Haal diensten per maand op (afgelopen 12 maanden)
  const eenJaarGeleden = new Date();
  eenJaarGeleden.setFullYear(eenJaarGeleden.getFullYear() - 1);

  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select("datum")
    .eq("klant_id", klant_id)
    .gte("datum", eenJaarGeleden.toISOString().split("T")[0]);

  const maandTelling: Record<string, number> = {};
  (diensten || []).forEach(d => {
    const maand = d.datum?.substring(0, 7);
    if (maand) maandTelling[maand] = (maandTelling[maand] || 0) + 1;
  });

  // Zorg dat alle 12 maanden aanwezig zijn
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!maandTelling[key]) maandTelling[key] = 0;
  }

  const historisch = Object.entries(maandTelling)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([maand, aantal]) => ({ maand, aantal }));

  const nu = new Date();
  const analysis = await analyzeKlantRetention(
    {
      bedrijfsnaam: klant.bedrijfsnaam,
      contactpersoon: klant.contactpersoon,
      stad: klant.stad,
      loyalty_tier: klant.loyalty_tier || "standaard",
      totaal_diensten: klant.totaal_diensten || 0,
      totaal_omzet: Number(klant.totaal_omzet) || 0,
      laatste_dienst_datum: klant.laatste_dienst_datum,
      gemiddelde_beoordeling: Number(klant.gemiddelde_beoordeling) || 0,
    },
    historisch,
    nu.getMonth() + 1,
    nu.getFullYear()
  );

  return NextResponse.json({ analysis });
}
