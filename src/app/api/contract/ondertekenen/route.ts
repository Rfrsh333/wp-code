import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHash } from "crypto";
import { checkRedisRateLimit, getClientIP, contractSignRateLimit } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";

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
      medewerker:medewerkers(id, naam, voornaam, achternaam)
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
  if (!["verzonden", "bekeken", "ondertekend_admin"].includes(contract.status)) {
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
    const { token, ondertekenaar_naam, handtekening_data } = await request.json();

    if (!token || !ondertekenaar_naam || !handtekening_data) {
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
      .single();

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
    await supabaseAdmin.from("contract_ondertekeningen").insert({
      contract_id: contract.id,
      ondertekenaar_type: "medewerker",
      ondertekenaar_naam,
      ondertekenaar_email: medewerker?.email || null,
      handtekening_data,
      handtekening_hash: hash,
      ip_adres: clientIP,
      user_agent: request.headers.get("user-agent")?.substring(0, 500) || null,
    });

    // Check of admin ook al getekend heeft
    const { data: adminSign } = await supabaseAdmin
      .from("contract_ondertekeningen")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("ondertekenaar_type", "admin")
      .maybeSingle();

    const newStatus = adminSign ? "actief" : "ondertekend_medewerker";

    await supabaseAdmin
      .from("contracten")
      .update({
        status: newStatus,
        ondertekend_medewerker_at: new Date().toISOString(),
      })
      .eq("id", contract.id);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    captureRouteError(err, { route: "/api/contract/ondertekenen", action: "POST" });
    // console.error("[CONTRACT] Sign error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
