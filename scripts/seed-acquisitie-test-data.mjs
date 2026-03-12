/**
 * Seed script: Vul acquisitie tabellen met realistische testdata
 * Usage: node scripts/seed-acquisitie-test-data.mjs
 */

import { createClient } from "@supabase/supabase-js";

import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

// === 1. SALES REPS ===
console.log("Sales Reps aanmaken...");
const salesReps = [
  { naam: "Rachid Ouaalit", email: "rachid@toptalentjobs.nl", telefoon: "06-12345678", regios: ["Utrecht", "Amersfoort"], branches: ["restaurant", "cafe", "hotel"], actief: true, kleur: "#F27501" },
  { naam: "Lisa de Vries", email: "lisa@toptalentjobs.nl", telefoon: "06-23456789", regios: ["Amsterdam", "Haarlem"], branches: ["restaurant", "catering", "events"], actief: true, kleur: "#3B82F6" },
  { naam: "Ahmed Hassan", email: "ahmed@toptalentjobs.nl", telefoon: "06-34567890", regios: ["Rotterdam", "Den Haag"], branches: ["hotel", "bezorging", "cafe"], actief: true, kleur: "#10B981" },
];
const { data: reps, error: repErr } = await supabase.from("acquisitie_sales_reps").insert(salesReps).select();
if (repErr) console.error("  Sales reps error:", repErr.message);
else console.log(`  ${reps.length} sales reps`);
const repIds = (reps || []).map((r) => r.id);

// === 2. LEADS ===
console.log("\nLeads aanmaken...");
const branches = ["restaurant", "cafe", "hotel", "catering", "events", "bezorging"];
const steden = ["Utrecht", "Amsterdam", "Rotterdam", "Den Haag", "Eindhoven", "Groningen", "Arnhem", "Leiden"];
const bronnen = ["google_maps", "csv_import", "handmatig", "website"];
// contactmomenten type CHECK: email, telefoon, whatsapp, bezoek (geen linkedin!)
const contactKanalen = ["email", "telefoon", "whatsapp", "bezoek"];

const restaurantNamen = [
  "De Gouden Leeuw", "Pasta e Basta", "Eetcafe De Hoek", "Brasserie Blanc", "Sushi Palace",
  "Pizzeria Napoli", "Het Wapen van Utrecht", "De Oude Herberg", "Grand Cafe Central", "Bistro Le Parc",
  "Wok to Walk", "Steakhouse The Ranch", "Thai Garden", "Grieks Restaurant Athena", "Tapas Bar Sol",
  "Cafe de Tijd", "Restaurant Zuiver", "Eethuys de Smulpot", "Asian Fusion House", "Mediterranean Grill",
  "De Keuken van Thijs", "Buurman en Buurman", "La Dolce Vita", "El Sombrero", "De Drie Graefjes",
  "Dim Sum Palace", "Fish en More", "Veggie Heaven", "Burger Brothers", "Indiaas Tandoori House",
];

const leads = restaurantNamen.map((naam, i) => {
  const stad = steden[i % steden.length];
  const branche = branches[i % branches.length];
  const stage = i < 5 ? "nieuw" : i < 10 ? "benaderd" : i < 16 ? "interesse" : i < 20 ? "offerte" : i < 24 ? "klant" : "afgewezen";
  const score = stage === "klant" ? randomBetween(75, 98) : stage === "offerte" ? randomBetween(60, 85) : stage === "interesse" ? randomBetween(45, 75) : randomBetween(10, 55);

  return {
    bedrijfsnaam: naam,
    contactpersoon: `${randomFrom(["Jan", "Piet", "Klaas", "Mohammed", "Sophie", "Emma", "Fatima", "Maria"])} ${randomFrom(["Jansen", "de Boer", "Bakker", "Visser", "Smit", "El Amrani", "Hassan", "Meijer"])}`,
    email: naam.toLowerCase().replace(/[^a-z]/g, "") + "@gmail.com",
    telefoon: `06-${randomBetween(10000000, 99999999)}`,
    website: `https://www.${naam.toLowerCase().replace(/[^a-z]/g, "")}.nl`,
    adres: `${randomFrom(["Lange", "Korte", "Oude", "Nieuwe"])}${randomFrom(["straat", "gracht", "weg", "laan"])} ${randomBetween(1, 200)}`,
    stad,
    branche,
    tags: [branche, stad.toLowerCase(), score > 70 ? "hot-lead" : score > 40 ? "warm-lead" : "cold-lead"].filter(Boolean),
    pipeline_stage: stage,
    ai_score: score,
    ai_score_reasoning: `Score ${score}: ${branche} in ${stad}, ${stage === "klant" ? "al geconverteerd" : stage === "offerte" ? "offerte fase, hoge kans" : "potentieel interessant"}`,
    bron: randomFrom(bronnen),
    emails_verzonden_count: stage === "nieuw" ? 0 : randomBetween(1, 5),
    laatste_contact_datum: stage === "nieuw" ? null : daysAgo(randomBetween(1, 30)) + "T10:00:00Z",
    laatste_contact_type: stage === "nieuw" ? null : randomFrom(contactKanalen),
    volgende_actie_datum: stage === "klant" || stage === "afgewezen" ? null : daysAgo(-randomBetween(1, 14)),
    volgende_actie_notitie: stage === "klant" ? null : randomFrom(["Nabellen", "Follow-up email", "Offerte sturen", "Bezoek inplannen", "WhatsApp sturen"]),
    predicted_conversion_pct: stage === "klant" ? 100 : stage === "offerte" ? randomBetween(55, 80) : stage === "interesse" ? randomBetween(25, 55) : randomBetween(5, 25),
    predicted_deal_value: randomBetween(2000, 6000),
    churn_risk: stage === "afgewezen" ? "hoog" : randomFrom(["laag", "laag", "medium", "medium", "hoog"]),
    assigned_to: repIds.length > 0 ? repIds[i % repIds.length] : null,
    interne_notities: randomFrom([null, "Goede contactpersoon, snel reageren", "Heeft al interesse getoond via website", "Concurrent klant, voorzichtig benaderen", null]),
  };
});

const { data: insertedLeads, error: leadErr } = await supabase.from("acquisitie_leads").insert(leads).select("id, bedrijfsnaam, pipeline_stage");
if (leadErr) console.error("  Leads error:", leadErr.message);
else console.log(`  ${insertedLeads.length} leads`);

// === 3. CONTACTMOMENTEN ===
console.log("\nContactmomenten aanmaken...");
const contactmomenten = [];
for (const lead of insertedLeads || []) {
  if (lead.pipeline_stage === "nieuw") continue;
  const aantalContacten = randomBetween(1, 4);
  for (let j = 0; j < aantalContacten; j++) {
    contactmomenten.push({
      lead_id: lead.id,
      type: randomFrom(contactKanalen), // email, telefoon, whatsapp, bezoek
      richting: "uitgaand",
      onderwerp: randomFrom(["Introductie TopTalent", "Follow-up gesprek", "Offerte besproken", "Servicepresentatie", "Behoefteanalyse"]),
      inhoud: randomFrom([
        "Gebeld en kort gesproken over onze dienstverlening. Interesse in uitzendkrachten voor het weekend.",
        "Email gestuurd met onze brochure en tarieven. Contactpersoon gaat het intern bespreken.",
        "WhatsApp gestuurd, snel antwoord gekregen. Willen graag een afspraak inplannen.",
        "Bezoek gebracht aan het restaurant. Goede sfeer, drukke tent. Manager wil meer info over flex personeel.",
        "Telefonisch contact gehad. Ze zijn op zoek naar betrouwbaar personeel voor de feestdagen.",
      ]),
      resultaat: randomFrom(["positief", "positief", "neutraal", "neutraal", "geen_antwoord", "voicemail"]),
      created_at: daysAgo(randomBetween(1, 60)) + `T${randomBetween(9, 17)}:${randomBetween(10, 59)}:00Z`,
    });
  }
}
const { error: cmErr } = await supabase.from("acquisitie_contactmomenten").insert(contactmomenten);
if (cmErr) console.error("  Contactmomenten error:", cmErr.message);
else console.log(`  ${contactmomenten.length} contactmomenten`);

// === 4. CAMPAGNES ===
console.log("\nCampagnes aanmaken...");
const campagnes = [
  {
    naam: "Winteractie Horeca Utrecht",
    status: "actief",
    onderwerp_template: "Personeel nodig deze winter, {{bedrijfsnaam}}?",
    inhoud_template: "Beste {{contactpersoon}},\n\nDe feestdagen komen eraan en wij helpen u met betrouwbaar personeel...",
    target_filters: { branche: ["restaurant", "cafe"], stad: ["Utrecht"] },
    emails_sent: 45, emails_opened: 28, emails_clicked: 12, emails_replied: 5,
  },
  {
    naam: "Nieuwe Restaurants Amsterdam",
    status: "actief",
    onderwerp_template: "TopTalent: uw partner voor horeca personeel",
    inhoud_template: "Hallo {{contactpersoon}},\n\nGefeliciteerd met uw restaurant {{bedrijfsnaam}}! Wij ondersteunen graag...",
    target_filters: { branche: ["restaurant"], stad: ["Amsterdam"], min_ai_score: 50 },
    emails_sent: 32, emails_opened: 18, emails_clicked: 8, emails_replied: 3,
  },
  {
    naam: "Re-engagement Inactieve Leads",
    status: "gepauzeerd",
    onderwerp_template: "We missen u, {{bedrijfsnaam}}!",
    inhoud_template: "Beste {{contactpersoon}},\n\nHet is even geleden dat we contact hadden...",
    target_filters: { pipeline_stage: ["benaderd"], min_dagen_sinds_contact: 30 },
    emails_sent: 120, emails_opened: 35, emails_clicked: 10, emails_replied: 2,
  },
];
const { data: camps, error: campErr } = await supabase.from("acquisitie_campagnes").insert(campagnes).select();
if (campErr) console.error("  Campagnes error:", campErr.message);
else console.log(`  ${camps.length} campagnes`);

// === 5. CONCURRENTEN ===
console.log("\nConcurrenten aanmaken...");
const concurrenten = [
  { naam: "Randstad Horeca", type: "uitzendbureau", branches: ["horeca", "retail"], regios: ["Utrecht", "Amsterdam", "Rotterdam"], sterke_punten: ["Groot netwerk", "Bekend merk", "Veel vestigingen"], zwakke_punten: ["Onpersoonlijk", "Hoge tarieven", "Traag schakelen"], prijsindicatie: "premium", website: "https://www.randstad.nl", actief: true },
  { naam: "Tempo-Team", type: "uitzendbureau", branches: ["horeca", "logistiek"], regios: ["Utrecht", "Amsterdam", "Rotterdam", "Den Haag"], sterke_punten: ["Snel personeel leveren", "Veel vestigingen"], zwakke_punten: ["Wisselende kwaliteit", "Veel verloop"], prijsindicatie: "marktconform", website: "https://www.tempo-team.nl", actief: true },
  { naam: "Horecaforce", type: "uitzendbureau", branches: ["horeca"], regios: ["Amsterdam", "Utrecht"], sterke_punten: ["Gespecialiseerd in horeca", "Goede reputatie"], zwakke_punten: ["Beperkt bereik buiten Randstad"], prijsindicatie: "marktconform", website: "https://www.horecaforce.nl", actief: true },
  { naam: "FlexHoreca Utrecht", type: "uitzendbureau", branches: ["horeca"], regios: ["Utrecht"], sterke_punten: ["Lokale kennis", "Persoonlijk contact"], zwakke_punten: ["Klein team", "Beperkt aanbod"], prijsindicatie: "goedkoop", website: "https://www.flexhorecautrecht.nl", actief: true },
];
const { data: conc, error: concErr } = await supabase.from("acquisitie_concurrenten").insert(concurrenten).select();
if (concErr) console.error("  Concurrenten error:", concErr.message);
else console.log(`  ${conc.length} concurrenten`);
const concIds = (conc || []).map((c) => c.id);

// === 6. WIN/LOSS RECORDS ===
console.log("\nWin/Loss records aanmaken...");
const klantLeads = (insertedLeads || []).filter((l) => l.pipeline_stage === "klant");
const afgewezenLeads = (insertedLeads || []).filter((l) => l.pipeline_stage === "afgewezen");

const winLoss = [];
for (const lead of klantLeads.slice(0, 3)) {
  winLoss.push({
    lead_id: lead.id,
    concurrent_id: concIds.length > 0 ? randomFrom(concIds) : null,
    resultaat: "gewonnen",
    deal_waarde: randomBetween(3000, 5500),
    reden: randomFrom(["prijs", "service", "snelheid", "relatie", "kwaliteit"]),
    reden_detail: "Klant koos voor TopTalent vanwege onze lokale aanpak en snelle reactietijd.",
    branche: randomFrom(branches),
    stad: randomFrom(steden),
    learnings: "Persoonlijk contact en snelle respons zijn key differentiators.",
  });
}
for (const lead of afgewezenLeads.slice(0, 2)) {
  winLoss.push({
    lead_id: lead.id,
    concurrent_id: concIds.length > 0 ? randomFrom(concIds) : null,
    resultaat: "verloren",
    deal_waarde: randomBetween(2500, 4500),
    reden: randomFrom(["prijs", "relatie", "anders"]),
    reden_detail: "Klant ging naar concurrent vanwege bestaande relatie. Opvolgen over 3 maanden.",
    branche: randomFrom(branches),
    stad: randomFrom(steden),
    contactpersoon_feedback: "Jullie zijn goed maar we kennen Randstad al jaren.",
    learnings: "Bestaande relaties zijn moeilijk te doorbreken. Focus op nieuwe bedrijven.",
  });
}
const { error: wlErr } = await supabase.from("acquisitie_win_loss").insert(winLoss);
if (wlErr) console.error("  Win/Loss error:", wlErr.message);
else console.log(`  ${winLoss.length} win/loss records`);

// === 7. KOSTEN (ROI) ===
console.log("\nKosten aanmaken...");
const kosten = [
  { categorie: "personeel", omschrijving: "Salaris Rachid - Sales (jan)", bedrag: 4200, periode_start: "2026-01-01", periode_eind: "2026-01-31", kanaal: null, sales_rep_id: repIds[0] || null },
  { categorie: "personeel", omschrijving: "Salaris Rachid - Sales (feb)", bedrag: 4200, periode_start: "2026-02-01", periode_eind: "2026-02-28", kanaal: null, sales_rep_id: repIds[0] || null },
  { categorie: "personeel", omschrijving: "Salaris Rachid - Sales (mrt)", bedrag: 4200, periode_start: "2026-03-01", periode_eind: "2026-03-31", kanaal: null, sales_rep_id: repIds[0] || null },
  { categorie: "personeel", omschrijving: "Salaris Lisa - Sales (jan)", bedrag: 3800, periode_start: "2026-01-01", periode_eind: "2026-01-31", kanaal: null, sales_rep_id: repIds[1] || null },
  { categorie: "personeel", omschrijving: "Salaris Lisa - Sales (feb)", bedrag: 3800, periode_start: "2026-02-01", periode_eind: "2026-02-28", kanaal: null, sales_rep_id: repIds[1] || null },
  { categorie: "personeel", omschrijving: "Salaris Lisa - Sales (mrt)", bedrag: 3800, periode_start: "2026-03-01", periode_eind: "2026-03-31", kanaal: null, sales_rep_id: repIds[1] || null },
  { categorie: "advertenties", omschrijving: "Google Ads Horeca Utrecht", bedrag: 850, periode_start: "2026-01-15", kanaal: "google_maps" },
  { categorie: "advertenties", omschrijving: "LinkedIn Sponsored Posts", bedrag: 600, periode_start: "2026-02-01", kanaal: "linkedin" },
  { categorie: "advertenties", omschrijving: "Facebook Ads Restaurant Owners", bedrag: 450, periode_start: "2026-02-15", kanaal: "advertenties" },
  { categorie: "advertenties", omschrijving: "Google Ads Horeca Amsterdam", bedrag: 720, periode_start: "2026-03-01", kanaal: "google_maps" },
  { categorie: "tooling", omschrijving: "Resend Email Platform (jan)", bedrag: 29, periode_start: "2026-01-01", is_maandelijks: true, kanaal: "email" },
  { categorie: "tooling", omschrijving: "Resend Email Platform (feb)", bedrag: 29, periode_start: "2026-02-01", is_maandelijks: true, kanaal: "email" },
  { categorie: "tooling", omschrijving: "Resend Email Platform (mrt)", bedrag: 29, periode_start: "2026-03-01", is_maandelijks: true, kanaal: "email" },
  { categorie: "tooling", omschrijving: "LinkedIn Sales Navigator (jan)", bedrag: 79, periode_start: "2026-01-01", is_maandelijks: true, kanaal: "linkedin" },
  { categorie: "tooling", omschrijving: "LinkedIn Sales Navigator (feb)", bedrag: 79, periode_start: "2026-02-01", is_maandelijks: true, kanaal: "linkedin" },
  { categorie: "tooling", omschrijving: "LinkedIn Sales Navigator (mrt)", bedrag: 79, periode_start: "2026-03-01", is_maandelijks: true, kanaal: "linkedin" },
  { categorie: "events", omschrijving: "Horecava Beurs 2026 - Standkosten", bedrag: 1800, periode_start: "2026-01-20", kanaal: "bezoek" },
  { categorie: "events", omschrijving: "Horecava Beurs 2026 - Materiaal", bedrag: 400, periode_start: "2026-01-20", kanaal: "bezoek" },
  { categorie: "telefoon", omschrijving: "Belkosten Januari", bedrag: 180, periode_start: "2026-01-01", kanaal: "telefoon" },
  { categorie: "telefoon", omschrijving: "Belkosten Februari", bedrag: 210, periode_start: "2026-02-01", kanaal: "telefoon" },
  { categorie: "telefoon", omschrijving: "Belkosten Maart", bedrag: 165, periode_start: "2026-03-01", kanaal: "telefoon" },
  { categorie: "overig", omschrijving: "Visitekaartjes & Brochures", bedrag: 320, periode_start: "2026-01-10", kanaal: "bezoek" },
  { categorie: "overig", omschrijving: "CRM Software licentie (Q1)", bedrag: 150, periode_start: "2026-01-01", kanaal: null },
];
const { error: kostenErr } = await supabase.from("acquisitie_kosten").insert(kosten);
if (kostenErr) console.error("  Kosten error:", kostenErr.message);
else console.log(`  ${kosten.length} kostenposten`);

// === 8. DEALS (ROI) ===
console.log("\nDeals aanmaken...");
const deals = [];
for (const lead of klantLeads) {
  const dw = randomBetween(2500, 5500);
  const dur = randomFrom([6, 12, 12, 12, 24]);
  deals.push({
    lead_id: lead.id,
    bedrijfsnaam: lead.bedrijfsnaam,
    deal_waarde: dw,
    deal_type: "nieuw",
    contract_duur_maanden: dur,
    totale_waarde: dw * dur,
    kanaal: randomFrom(contactKanalen),
    sales_rep_id: repIds.length > 0 ? randomFrom(repIds) : null,
    gesloten_op: daysAgo(randomBetween(1, 60)),
  });
}
// Extra deals
const extraDeals = [
  { bedrijfsnaam: "Hotel Kasteel Utrecht", deal_waarde: 4800, deal_type: "nieuw", contract_duur_maanden: 24, totale_waarde: 4800 * 24, kanaal: "bezoek", sales_rep_id: repIds[0] || null, gesloten_op: daysAgo(15) },
  { bedrijfsnaam: "Cafe De Kroeg", deal_waarde: 2200, deal_type: "nieuw", contract_duur_maanden: 12, totale_waarde: 2200 * 12, kanaal: "email", sales_rep_id: repIds[1] || null, gesloten_op: daysAgo(30) },
  { bedrijfsnaam: "Cateraar Van Dijk", deal_waarde: 3800, deal_type: "upsell", contract_duur_maanden: 12, totale_waarde: 3800 * 12, kanaal: "telefoon", sales_rep_id: repIds[2] || null, gesloten_op: daysAgo(5) },
  { bedrijfsnaam: "Party Events BV", deal_waarde: 5200, deal_type: "nieuw", contract_duur_maanden: 12, totale_waarde: 5200 * 12, kanaal: "bezoek", sales_rep_id: repIds[0] || null, gesloten_op: daysAgo(45) },
  { bedrijfsnaam: "Sushi Express", deal_waarde: 1800, deal_type: "verlenging", contract_duur_maanden: 6, totale_waarde: 1800 * 6, kanaal: "telefoon", sales_rep_id: repIds[1] || null, gesloten_op: daysAgo(10) },
];
deals.push(...extraDeals);
const { error: dealErr } = await supabase.from("acquisitie_deals").insert(deals);
if (dealErr) console.error("  Deals error:", dealErr.message);
else console.log(`  ${deals.length} deals`);

// === 9. PREDICTION LOG ===
console.log("\nPrediction logs aanmaken...");
const predLogs = [];
for (const lead of (insertedLeads || []).slice(0, 15)) {
  predLogs.push({
    lead_id: lead.id,
    predicted_conversion_pct: randomBetween(10, 80),
    predicted_deal_value: randomBetween(2000, 6000),
    churn_risk: randomFrom(["laag", "medium", "hoog"]),
    model_version: "hybrid-v1",
  });
}
const { error: predErr } = await supabase.from("acquisitie_prediction_log").insert(predLogs);
if (predErr) console.error("  Predictions error:", predErr.message);
else console.log(`  ${predLogs.length} prediction logs`);

// === SAMENVATTING ===
console.log("\n========================================");
console.log("Alle testdata succesvol aangemaakt!");
console.log("========================================");
console.log(`  Sales reps:       ${salesReps.length}`);
console.log(`  Leads:            ${leads.length}`);
console.log(`  Contactmomenten:  ${contactmomenten.length}`);
console.log(`  Campagnes:        ${campagnes.length}`);
console.log(`  Concurrenten:     ${concurrenten.length}`);
console.log(`  Win/Loss:         ${winLoss.length}`);
console.log(`  Kosten:           ${kosten.length}`);
console.log(`  Deals:            ${deals.length}`);
console.log(`  Prediction logs:  ${predLogs.length}`);
console.log("\nGa naar het admin panel > Acquisitie tab om alles te zien!");
