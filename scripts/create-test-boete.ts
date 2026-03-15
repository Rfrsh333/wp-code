/**
 * Maak een test boete aan voor Mollie payment testing
 *
 * Gebruik:
 *   npx tsx scripts/create-test-boete.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

async function createTestBoete() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase credentials niet gevonden in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🧪 Test Boete Aanmaken\n");

  try {
    // Stap 1: Haal eerste medewerker op (of maak er een aan)
    const { data: existingMedewerker } = await supabase
      .from("medewerkers")
      .select("id, voornaam, achternaam, email")
      .limit(1)
      .single();

    let medewerker: { id: string; voornaam: string; achternaam: string; email: string };

    if (existingMedewerker) {
      medewerker = existingMedewerker;
    } else {
      console.log("Geen medewerker gevonden, maak test medewerker aan...");

      const { data: newMedewerker } = await supabase
        .from("medewerkers")
        .insert({
          voornaam: "Test",
          achternaam: "Medewerker",
          email: "test-medewerker@toptalentjobs.nl",
          telefoonnummer: "+31612345678",
          geboortedatum: "1990-01-01",
          status: "actief",
        })
        .select()
        .single();

      if (!newMedewerker) {
        throw new Error("Kon test medewerker niet aanmaken");
      }
      medewerker = newMedewerker;
      console.log(`✅ Test medewerker aangemaakt: ${medewerker.id}`);
    }

    console.log(`👤 Medewerker: ${medewerker.voornaam} ${medewerker.achternaam} (${medewerker.email})`);
    console.log("");

    // Stap 2: Maak test boete aan
    const { data: boete, error } = await supabase
      .from("boetes")
      .insert({
        medewerker_id: medewerker.id,
        bedrag: 25.00,
        reden: "Test boete voor Mollie payment testing",
        status: "openstaand",
        opgelegd_door: "admin",
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Fout bij aanmaken boete:", error);
      process.exit(1);
    }

    console.log("✅ Test boete aangemaakt!");
    console.log(`   ID: ${boete.id}`);
    console.log(`   Bedrag: €${boete.bedrag}`);
    console.log(`   Status: ${boete.status}`);
    console.log(`   Reden: ${boete.reden}`);
    console.log("");

    // Stap 3: Haal login info op voor medewerker
    const { data: loginInfo } = await supabase
      .from("medewerker_logins")
      .select("email, laatste_login")
      .eq("medewerker_id", medewerker.id)
      .single();

    console.log("📝 Test instructies:");
    console.log("   1. Start dev server: npm run dev");
    console.log("   2. Ga naar: http://localhost:3000/medewerker/login");
    console.log(`   3. Log in met: ${loginInfo?.email || medewerker.email}`);
    console.log("   4. Je ziet nu de openstaande boete");
    console.log("   5. Klik 'Betalen via Mollie'");
    console.log("   6. Test betaling met:");
    console.log("      💳 Creditcard: 5555 5555 5555 4444");
    console.log("      🔐 CVV: 123");
    console.log("      📅 Vervaldatum: 12/2030");
    console.log("");
    console.log("💡 TIP: Zorg dat je MOLLIE_API_KEY=test_... gebruikt in .env.local");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createTestBoete();
