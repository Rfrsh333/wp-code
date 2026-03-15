import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createMollieClient } from "@mollie/api-client";
import { logAuditEvent } from "@/lib/audit-log";

function getMollieClient() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error("MOLLIE_API_KEY is not configured");
  }
  return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const paymentId = body.get("id") as string;

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
    console.error("[MOLLIE WEBHOOK] Error:", error);
    // Return 200 om retries te voorkomen bij onverwachte fouten
    return new NextResponse("OK", { status: 200 });
  }
}
