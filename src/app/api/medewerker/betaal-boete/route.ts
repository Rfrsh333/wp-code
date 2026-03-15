import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
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

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
