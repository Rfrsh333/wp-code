/**
 * Mollie Payment Test Script
 *
 * Test de Mollie betaling flow zonder volledige app setup
 *
 * Gebruik:
 *   npx tsx scripts/test-mollie.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createMollieClient } from "@mollie/api-client";

async function testMolliePayment() {
  const apiKey = process.env.MOLLIE_API_KEY;

  if (!apiKey) {
    console.error("❌ MOLLIE_API_KEY niet gevonden in .env.local");
    process.exit(1);
  }

  if (!apiKey.startsWith("test_")) {
    console.warn("⚠️  WARNING: Je gebruikt een LIVE API key!");
    console.warn("⚠️  Voor testen gebruik je beter een test_ key");
    console.log("");
  }

  console.log("🚀 Mollie Payment Test\n");
  console.log(`📊 API Key: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`);
  console.log(`🔧 Mode: ${apiKey.startsWith("test_") ? "TEST" : "LIVE"}\n`);

  try {
    const mollie = createMollieClient({ apiKey });

    // Test 1: Maak een test betaling aan
    console.log("1️⃣  Betaling aanmaken...");
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: "10.00",
      },
      description: "TopTalentJobs — Test Boete",
      redirectUrl: "https://www.toptalentjobs.nl/medewerker/dashboard?betaling=succes",
      webhookUrl: process.env.MOLLIE_WEBHOOK_BASE_URL
        ? `${process.env.MOLLIE_WEBHOOK_BASE_URL}/api/webhooks/mollie`
        : undefined,
      metadata: {
        test: true,
        boete_id: "test-123",
      },
    });

    console.log("✅ Betaling aangemaakt!");
    console.log(`   ID: ${payment.id}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Bedrag: €${payment.amount.value}`);
    console.log("");

    // Test 2: Checkout URL
    const checkoutUrl = payment.getCheckoutUrl();
    console.log("2️⃣  Checkout URL:");
    console.log(`   ${checkoutUrl}`);
    console.log("");
    console.log("   👉 Open deze URL om de test betaling af te ronden");
    console.log("");

    // Test 3: Status ophalen
    console.log("3️⃣  Huidige status ophalen...");
    const updatedPayment = await mollie.payments.get(payment.id);
    console.log(`   Status: ${updatedPayment.status}`);
    console.log("");

    // Test 4: Recente betalingen
    console.log("4️⃣  Laatste 5 betalingen:");
    const payments = await mollie.payments.page({ limit: 5 });
    payments.forEach((p: { id: string; status: string; amount: { value: string }; description: string }, i: number) => {
      console.log(`   ${i + 1}. ${p.id} - ${p.status} - €${p.amount.value} - ${p.description}`);
    });
    console.log("");

    // Instructies
    console.log("📝 Volgende stappen:");
    console.log("   1. Open de checkout URL hierboven");
    console.log("   2. Kies een betaalmethode (bijv. Creditcard)");
    console.log("");
    if (apiKey.startsWith("test_")) {
      console.log("   💳 Test creditcard die werkt:");
      console.log("      Nummer: 5555 5555 5555 4444");
      console.log("      CVV: 123");
      console.log("      Vervaldatum: 12/2030");
      console.log("");
      console.log("   💳 Test creditcard die FAALT:");
      console.log("      Nummer: 5555 5555 5555 5557");
      console.log("");
    }
    console.log("   3. Check webhook in je dev server logs");
    console.log("   4. Verifieer status met: npx tsx scripts/check-mollie-payment.ts " + payment.id);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.field) {
      console.error(`   Field: ${error.field}`);
    }
    process.exit(1);
  }
}

testMolliePayment();
