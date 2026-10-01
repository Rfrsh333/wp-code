import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSessieInclGepauzeerd } from "@/lib/medewerker/sessie-boete";
import { createMollieClient } from "@mollie/api-client";

function getMollieClient() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error("MOLLIE_API_KEY is not configured");
  }
  return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
}

const getBaseUrl = () =>
  process.env.MOLLIE_WEBHOOK_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://www.toptalentjobs.nl";

export async function POST(request: NextRequest) {
  // Gepauzeerde medewerkers moeten hun boete juist kunnen zien en betalen.
  const medewerker = await getMedewerkerSessieInclGepauzeerd(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Haal open boete op
  const { data: boete } = await supabaseAdmin
    .from("boetes")
    .select("id, bedrag, reden")
    .eq("medewerker_id", medewerker.id)
    .eq("status", "openstaand")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!boete) {
    return NextResponse.json({ error: "Geen openstaande boete gevonden" }, { status: 404 });
  }

  const baseUrl = getBaseUrl();

  // Maak Mollie betaling aan
  const mollie = getMollieClient();
  const payment = await mollie.payments.create({
    amount: {
      currency: "EUR",
      value: Number(boete.bedrag).toFixed(2),
    },
    description: `TopTalentJobs — Boete #${boete.id.slice(0, 8)}`,
    redirectUrl: `${baseUrl}/medewerker/dashboard?betaling=succes`,
    webhookUrl: `${baseUrl}/api/webhooks/mollie`,
    metadata: {
      boete_id: boete.id,
      medewerker_id: medewerker.id,
    },
  });

  // Sla Mollie payment ID en checkout URL op
  await supabaseAdmin
    .from("boetes")
    .update({
      mollie_payment_id: payment.id,
      mollie_checkout_url: payment.getCheckoutUrl(),
    })
    .eq("id", boete.id);

  return NextResponse.json({ checkoutUrl: payment.getCheckoutUrl() });
}
