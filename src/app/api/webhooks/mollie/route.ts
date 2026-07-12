import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createMollieClient } from "@mollie/api-client";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";

function getMollieClient() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error("MOLLIE_API_KEY is not configured");
  }
  return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
}

/**
 * Mollie Payments-webhook.
 *
 * Beveiligingsmodel (conform Mollie): de webhook-body bevat alléén het payment-id
 * (`id=tr_xxx`). We vertrouwen NOOIT op de request-inhoud voor de betaalstatus — we
 * halen de actuele status server-side op via de Mollie API met onze eigen API-sleutel.
 * Een aanvaller die een willekeurig id post kan hooguit een verwerking triggeren voor
 * een betaling die Mollie zélf als "paid" rapporteert én die al aan een openstaande
 * boete is gekoppeld (via `mollie_payment_id`) én waarvan het bedrag klopt.
 *
 * Let op: Mollie's Payments-webhook ondertekent het request NIET met een HMAC-header.
 * Een handtekeningcontrole is hier dus niet van toepassing — de vorige implementatie
 * wees daardoor élke webhook af (401), waardoor boetebetalingen nooit werden verwerkt.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    const paymentId = params.get("id");

    if (!paymentId) {
      return new NextResponse("Missing payment ID", { status: 400 });
    }

    // Haal actuele status op bij Mollie (de bron van waarheid).
    const mollie = getMollieClient();
    const payment = await mollie.payments.get(paymentId);

    if (payment.status === "paid") {
      // Zoek de gekoppelde openstaande boete.
      const { data: boete } = await supabaseAdmin
        .from("boetes")
        .select("id, medewerker_id, bedrag")
        .eq("mollie_payment_id", paymentId)
        .eq("status", "openstaand")
        .maybeSingle();

      if (boete) {
        // Defense-in-depth: verifieer dat het betaalde bedrag overeenkomt met de boete
        // (vergelijking in hele centen om afrondings-/formatteringsverschillen te vermijden).
        const betaaldeCenten = Math.round(Number(payment.amount.value) * 100);
        const boeteCenten = Math.round(Number(boete.bedrag) * 100);

        if (betaaldeCenten !== boeteCenten) {
          await logAuditEvent({
            action: "mollie_payment_amount_mismatch",
            targetTable: "boetes",
            targetId: boete.id,
            summary: `Mollie-betaling ${paymentId} bedrag (${payment.amount.value}) wijkt af van boete (${boete.bedrag}) — niet automatisch afgehandeld`,
            metadata: { mollie_payment_id: paymentId, betaald: payment.amount.value, verwacht: String(boete.bedrag) },
          });
          // 200 zodat Mollie niet blijft herproberen; handmatige controle vereist.
          return new NextResponse("OK", { status: 200 });
        }

        // Markeer als betaald. Idempotent dankzij het status-filter: een tweede
        // (retry-)webhook vindt geen "openstaand"-rij meer en doet niets.
        const { data: updated } = await supabaseAdmin
          .from("boetes")
          .update({
            status: "betaald",
            afgehandeld_at: new Date().toISOString(),
            afgehandeld_door: "mollie_webhook",
          })
          .eq("id", boete.id)
          .eq("status", "openstaand")
          .select("id, medewerker_id")
          .maybeSingle();

        if (updated) {
          // Heractiveer de medewerker alleen als er geen andere openstaande boetes meer zijn.
          const { count } = await supabaseAdmin
            .from("boetes")
            .select("id", { count: "exact", head: true })
            .eq("medewerker_id", updated.medewerker_id)
            .eq("status", "openstaand");

          if (!count || count === 0) {
            await supabaseAdmin
              .from("medewerkers")
              .update({ status: "actief" })
              .eq("id", updated.medewerker_id)
              .eq("status", "gepauzeerd");
          }

          await logAuditEvent({
            action: "mollie_payment_received",
            targetTable: "boetes",
            targetId: updated.id,
            summary: `Boete betaald via Mollie (${paymentId})`,
            metadata: { mollie_payment_id: paymentId, medewerker_id: updated.medewerker_id },
          });
        }
      }
    }

    // Mollie verwacht altijd 200 OK terug.
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    captureRouteError(error, { route: "/api/webhooks/mollie", action: "POST" });
    // 500 zodat Mollie de webhook opnieuw aanbiedt bij onverwachte fouten.
    // 200 pas retourneren als de betaling succesvol verwerkt is.
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
