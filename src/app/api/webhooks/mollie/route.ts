import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createMollieClient } from "@mollie/api-client";
import { logAuditEvent } from "@/lib/audit-log";
import crypto from "crypto";
import { captureRouteError } from "@/lib/sentry-utils";

function getMollieClient() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error("MOLLIE_API_KEY is not configured");
  }
  return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
}

/**
 * Verify Mollie webhook signature (HMAC-SHA256).
 * Mollie sends a `Mollie-Signature` header when a webhook secret is configured.
 * Format: "v1=<hex-encoded HMAC-SHA256>"
 */
function verifyMollieSignature(rawBody: string, signatureHeader: string | null): boolean {
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET;

  // Fail-closed: zonder secret wordt de webhook geweigerd
  if (!webhookSecret) {
    captureRouteError(new Error("/api/webhooks/mollie UNKNOWN error"), { route: "/api/webhooks/mollie", action: "UNKNOWN" });
    // console.error("[MOLLIE WEBHOOK] MOLLIE_WEBHOOK_SECRET niet geconfigureerd — webhook geweigerd");
    return false;
  }

  if (!signatureHeader) {
    captureRouteError(new Error("/api/webhooks/mollie UNKNOWN error"), { route: "/api/webhooks/mollie", action: "UNKNOWN" });
    // console.error("[MOLLIE WEBHOOK] Geen Mollie-Signature header ontvangen");
    return false;
  }

  // Mollie stuurt "v1=<hmac>"
  const parts = signatureHeader.split("=");
  if (parts.length < 2 || parts[0] !== "v1") {
    captureRouteError(new Error("/api/webhooks/mollie UNKNOWN error"), { route: "/api/webhooks/mollie", action: "UNKNOWN" });
    // console.error("[MOLLIE WEBHOOK] Ongeldig signature formaat:", signatureHeader);
    return false;
  }

  const receivedHmac = parts.slice(1).join("="); // Rejoin in case of '=' in hash
  const expectedHmac = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Timing-safe vergelijking om timing attacks te voorkomen
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Lees raw body voor signature verificatie
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("mollie-signature");

    // Verifieer webhook signature
    if (!verifyMollieSignature(rawBody, signatureHeader)) {
      captureRouteError(new Error("/api/webhooks/mollie POST error"), { route: "/api/webhooks/mollie", action: "POST" });
      // console.error("[MOLLIE WEBHOOK] Ongeldige signature — mogelijke spoofing poging");
      await logAuditEvent({
        action: "mollie_webhook_signature_invalid",
        targetTable: "boetes",
        targetId: "unknown",
        summary: "Mollie webhook ontvangen met ongeldige signature",
        metadata: { signature: signatureHeader?.substring(0, 20) || "missing" },
      });
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Parse form data uit de raw body
    const params = new URLSearchParams(rawBody);
    const paymentId = params.get("id");

    if (!paymentId) {
      return new NextResponse("Missing payment ID", { status: 400 });
    }

    // Haal actuele status op bij Mollie
    const mollie = getMollieClient();
    const payment = await mollie.payments.get(paymentId);

    if (payment.status === "paid") {
      // Update boete status naar betaald
      const { data: boete } = await supabaseAdmin
        .from("boetes")
        .update({
          status: "betaald",
          afgehandeld_at: new Date().toISOString(),
          afgehandeld_door: "mollie_webhook",
        })
        .eq("mollie_payment_id", paymentId)
        .eq("status", "openstaand")
        .select("id, medewerker_id")
        .single();

      if (boete) {
        // Check of er nog andere openstaande boetes zijn
        const { count } = await supabaseAdmin
          .from("boetes")
          .select("id", { count: "exact", head: true })
          .eq("medewerker_id", boete.medewerker_id)
          .eq("status", "openstaand");

        // Alleen heractiveren als er geen andere openstaande boetes zijn
        if (!count || count === 0) {
          await supabaseAdmin
            .from("medewerkers")
            .update({ status: "actief" })
            .eq("id", boete.medewerker_id)
            .eq("status", "gepauzeerd");
        }

        await logAuditEvent({
          action: "mollie_payment_received",
          targetTable: "boetes",
          targetId: boete.id,
          summary: `Boete betaald via Mollie (${paymentId})`,
          metadata: { mollie_payment_id: paymentId, medewerker_id: boete.medewerker_id },
        });
      }
    }

    // Mollie verwacht altijd 200 OK terug
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    captureRouteError(error, { route: "/api/webhooks/mollie", action: "POST" });
    // console.error("[MOLLIE WEBHOOK] Error:", error);
    // Return 200 om retries te voorkomen bij onverwachte fouten
    return new NextResponse("OK", { status: 200 });
  }
}
