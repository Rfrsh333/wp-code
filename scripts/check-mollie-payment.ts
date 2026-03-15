/**
 * Check Mollie Payment Status
 *
 * Gebruik:
 *   npx tsx scripts/check-mollie-payment.ts <payment-id>
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createMollieClient } from "@mollie/api-client";

async function checkPayment(paymentId: string) {
  const apiKey = process.env.MOLLIE_API_KEY;

  if (!apiKey) {
    console.error("❌ MOLLIE_API_KEY niet gevonden in .env.local");
    process.exit(1);
  }

  console.log(`🔍 Checking payment: ${paymentId}\n`);

  try {
    const mollie = createMollieClient({ apiKey });
    const payment = await mollie.payments.get(paymentId);

    console.log("📊 Payment Details:");
    console.log(`   ID: ${payment.id}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Bedrag: €${payment.amount.value} ${payment.amount.currency}`);
    console.log(`   Beschrijving: ${payment.description}`);
    console.log(`   Gemaakt: ${payment.createdAt}`);
    console.log(`   Methode: ${payment.method || "Nog niet gekozen"}`);
    console.log("");

    if (payment.metadata) {
      console.log("🏷️  Metadata:");
      Object.entries(payment.metadata).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      console.log("");
    }

    // Status uitleg
    const statusEmoji = {
      open: "⏳",
      pending: "⏳",
      paid: "✅",
      failed: "❌",
      expired: "⌛",
      canceled: "🚫",
    };

    console.log(`Status: ${statusEmoji[payment.status as keyof typeof statusEmoji] || "❓"} ${payment.status.toUpperCase()}`);

    if (payment.status === "paid") {
      console.log("   ✅ Betaling is geslaagd!");
      console.log(`   💰 Betaald op: ${payment.paidAt}`);
    } else if (payment.status === "open" || payment.status === "pending") {
      console.log("   ⏳ Wacht op betaling...");
      const checkoutUrl = payment.getCheckoutUrl();
      if (checkoutUrl) {
        console.log(`   🔗 Checkout URL: ${checkoutUrl}`);
      }
    } else if (payment.status === "failed") {
      console.log("   ❌ Betaling is mislukt");
      if (payment.details) {
        console.log(`   Reden: ${JSON.stringify(payment.details)}`);
      }
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

const paymentId = process.argv[2];
if (!paymentId) {
  console.error("❌ Gebruik: npx tsx scripts/check-mollie-payment.ts <payment-id>");
  process.exit(1);
}

checkPayment(paymentId);
