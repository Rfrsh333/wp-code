import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHash } from "crypto";
import { checkRedisRateLimit, getClientIP, contractSignRateLimit } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";

// Statussen waarin de medewerker nog mag tekenen (zelfde lijst als de GET).
const TEKENBARE_STATUSSEN = ["verzonden", "bekeken", "ondertekend_admin"];

// GET: Haal contract op via token (publiek)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || token.length !== 32) {
    return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });
  }

  const { data: contract, error } = await supabaseAdmin
    .from("contracten")
    .select(`
      id, contract_nummer, titel, type, status, startdatum, einddatum,
      contract_data, onderteken_token_verloopt_at,
      template:contract_templates(id, naam, inhoud),
      medewerker:medewerkers(id, naam)
    `)
    .eq("onderteken_token", token)
    .single();

  if (error || !contract) {
    return NextResponse.json({ error: "Contract niet gevonden" }, { status: 404 });
  }

  // Check of token verlopen is
  if (contract.onderteken_token_verloopt_at) {
    const verloopt = new Date(contract.onderteken_token_verloopt_at);
    if (verloopt < new Date()) {
      return NextResponse.json({ error: "Deze link is verlopen. Neem contact op met TopTalent." }, { status: 410 });
    }
  }

  // Check status
  if (!TEKENBARE_STATUSSEN.includes(contract.status)) {
    return NextResponse.json({ error: "Dit contract kan niet meer ondertekend worden." }, { status: 400 });
  }

  // Markeer als bekeken
  if (contract.status === "verzonden") {
    await supabaseAdmin
      .from("contracten")
      .update({ status: "bekeken" })
      .eq("id", contract.id);
  }

  // Haal bestaande admin handtekening op als die er is
  const { data: adminSign } = await supabaseAdmin
    .from("contract_ondertekeningen")
    .select("ondertekenaar_naam, getekend_at")
    .eq("contract_id", contract.id)
    .eq("ondertekenaar_type", "admin")
    .maybeSingle();

  return NextResponse.json({
    contract: {
      id: contract.id,
      contract_nummer: contract.contract_nummer,
      titel: contract.titel,
      type: contract.type,
      status: contract.status,
      startdatum: contract.startdatum,
      einddatum: contract.einddatum,
      contract_data: contract.contract_data,
      template: contract.template,
      medewerker: contract.medewerker,
    },
    admin_ondertekening: adminSign || null,
  });
}

// POST: Medewerker tekent het contract
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  if (contractSignRateLimit) {
    const rateLimit = await checkRedisRateLimit(`contract-sign:${clientIP}`, contractSignRateLimit);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het later opnieuw." },
        { status: 429 }
      );
    }
  }

  try {
    let body: { token?: unknown; ondertekenaar_naam?: unknown; handtekening_data?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }
    const token = typeof body.token === "string" ? body.token : "";
    const ondertekenaar_naam = typeof body.ondertekenaar_naam === "string" ? body.ondertekenaar_naam.trim().slice(0, 200) : "";
    const handtekening_data = typeof body.handtekening_data === "string" ? body.handtekening_data : "";

    if (token.length !== 32 || !ondertekenaar_naam || !handtekening_data) {
      return NextResponse.json(
        { error: "Token, naam en handtekening zijn verplicht" },
        { status: 400 }
      );
    }

    // Valideer handtekening data (moet base64 PNG zijn)
    if (!handtekening_data.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { error: "Ongeldige handtekening formaat" },
        { status: 400 }
      );
    }

    // Max 500KB voor handtekening
    if (handtekening_data.length > 500_000) {
      return NextResponse.json(
        { error: "Handtekening bestand te groot" },
        { status: 400 }
      );
    }

    // Haal contract op via token
    const { data: contract } = await supabaseAdmin
      .from("contracten")
      .select("id, status, onderteken_token_verloopt_at, medewerker:medewerkers(email)")
      .eq("onderteken_token", token)
      .maybeSingle();

    if (!contract) {
      return NextResponse.json({ error: "Contract niet gevonden" }, { status: 404 });
    }

    // Check verlopen
    if (contract.onderteken_token_verloopt_at) {
      const verloopt = new Date(contract.onderteken_token_verloopt_at);
      if (verloopt < new Date()) {
        return NextResponse.json({ error: "Link verlopen" }, { status: 410 });
      }
    }

    // Alleen tekenen in een tekenbare status: een concept, opgezegd of al
    // actief contract mag niet via een (oude) link opnieuw getekend worden.
    if (!TEKENBARE_STATUSSEN.includes(contract.status)) {
      return NextResponse.json({ error: "Dit contract kan niet meer ondertekend worden." }, { status: 400 });
    }

    // Check of medewerker al getekend heeft
    const { data: existingSign } = await supabaseAdmin
      .from("contract_ondertekeningen")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("ondertekenaar_type", "medewerker")
      .maybeSingle();

    if (existingSign) {
      return NextResponse.json({ error: "U heeft dit contract al ondertekend" }, { status: 400 });
    }

    // Hash
    const hash = createHash("sha256").update(handtekening_data).digest("hex");

    // Medewerker email
    const medewerker = Array.isArray(contract.medewerker)
      ? contract.medewerker[0]
      : contract.medewerker;

    // Sla ondertekening op
    const { data: ondertekening, error: insertError } = await supabaseAdmin.from("contract_ondertekeningen").insert({
      contract_id: contract.id,
      ondertekenaar_type: "medewerker",
      ondertekenaar_naam,
      ondertekenaar_email: medewerker?.email || null,
      handtekening_data,
      handtekening_hash: hash,
      ip_adres: clientIP,
      user_agent: request.headers.get("user-agent")?.substring(0, 500) || null,
    }).select("id").single();

    if (insertError || !ondertekening) {
      captureRouteError(insertError ?? new Error("Ondertekening niet opgeslagen"), { route: "/api/contract/ondertekenen", action: "POST" });
      return NextResponse.json({ error: "Ondertekenen is niet gelukt. Probeer het opnieuw." }, { status: 500 });
    }

    // Check of admin ook al getekend heeft
    const { data: adminSign } = await supabaseAdmin
      .from("contract_ondertekeningen")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("ondertekenaar_type", "admin")
      .maybeSingle();

    const newStatus = adminSign ? "actief" : "ondertekend_medewerker";

    const { data: bijgewerkt, error: updateError } = await supabaseAdmin
      .from("contracten")
      .update({
        status: newStatus,
        ondertekend_medewerker_at: new Date().toISOString(),
      })
      .eq("id", contract.id)
      .in("status", TEKENBARE_STATUSSEN)
      .select("id");

    if (updateError || !bijgewerkt || bijgewerkt.length === 0) {
      // Handtekening terugdraaien zodat de medewerker het opnieuw kan proberen
      // en er geen losse handtekening bij een niet-bijgewerkt contract blijft.
      await supabaseAdmin.from("contract_ondertekeningen").delete().eq("id", ondertekening.id);
      captureRouteError(updateError ?? new Error("Contractstatus gewijzigd tijdens ondertekenen"), {
        route: "/api/contract/ondertekenen",
        action: "POST",
      });
      return NextResponse.json({ error: "Ondertekenen is niet gelukt. Probeer het opnieuw." }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    captureRouteError(err, { route: "/api/contract/ondertekenen", action: "POST" });
    // Geen ruwe foutmelding naar de client (kan interne details bevatten).
    return NextResponse.json({ error: "Er ging iets mis bij het ondertekenen" }, { status: 500 });
  }
}
