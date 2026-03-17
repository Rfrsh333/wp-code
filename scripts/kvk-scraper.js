/**
 * OpenKVK Scraper — haalt bedrijfsregistraties op via de overheid.io OpenKVK API.
 * Focust op sectoren relevant voor TopTalent (horeca, retail, logistiek, schoonmaak).
 *
 * De API bevat basisgegevens uit het Handelsregister. Per sector zoeken we op
 * relevante trefwoorden in de handelsnaam, gefilterd op plaats.
 *
 * Scrapt de hele Randstad + omgeving, geen limiet, inclusief email scraping.
 *
 * Gebruik:
 *   node scripts/kvk-scraper.js
 *
 * Omgevingsvariabelen (optioneel):
 *   OVERHEID_API_KEY=xxx       — overheid.io API key (standaard ingebouwd)
 */

const fs = require("fs");
const path = require("path");

// ─── Configuratie ───────────────────────────────────────────────────────────

const CONFIG = {
  // Zoektermen per sector — matchen op handelsnaam
  sectoren: [
    { zoektermen: ["restaurant", "eetcafe", "eetcafé", "trattoria", "bistro", "pizzeria", "sushi", "wok", "grill", "diner", "brasserie", "lunchroom", "broodjeszaak"], naam: "Restaurants" },
    { zoektermen: ["cafe", "café", "koffiebar", "koffie", "coffeeshop", "espresso", "tearoom", "theehuis"], naam: "Cafes" },
    { zoektermen: ["bar", "lounge", "kroeg", "pub", "tapperij", "proeflokaal", "cocktail"], naam: "Bars" },
    { zoektermen: ["hotel", "hostel", "b&b", "pension", "lodge", "aparthotel"], naam: "Hotels" },
    { zoektermen: ["catering", "horeca", "keuken", "food", "maaltijd", "banquet", "feest", "evenement"], naam: "Catering/Horeca" },
    { zoektermen: ["schoonmaak", "cleaning", "reiniging", "glazenwas", "facilitair", "hygiene"], naam: "Schoonmaak" },
    { zoektermen: ["logistiek", "transport", "bezorg", "koerier", "warehouse", "distributie", "vracht", "expeditie"], naam: "Logistiek" },
    { zoektermen: ["uitzend", "detachering", "payroll", "personeels", "staffing", "recruitment", "werving"], naam: "Uitzend/Personeel" },
  ],

  // Randstad + omgeving — alle relevante steden
  regios: [
    // Utrecht provincie
    "Utrecht", "Amersfoort", "Veenendaal", "Nieuwegein", "Zeist", "Houten",
    "IJsselstein", "Woerden", "De Bilt", "Soest", "Bilthoven", "Maarssen",
    "Driebergen", "Bunnik", "Breukelen", "Vianen", "Leerdam",
    // Noord-Holland / Amsterdam regio
    "Amsterdam", "Haarlem", "Zaandam", "Amstelveen", "Hoofddorp",
    "Hilversum", "Almere", "Bussum", "Naarden", "Huizen", "Laren",
    "Weesp", "Diemen", "Ouderkerk aan de Amstel", "Badhoevedorp",
    "Purmerend", "Zaandijk", "Schiphol",
    // Zuid-Holland / Den Haag + Rotterdam regio
    "Rotterdam", "Den Haag", "Leiden", "Delft", "Dordrecht",
    "Zoetermeer", "Gouda", "Schiedam", "Vlaardingen", "Capelle aan den IJssel",
    "Rijswijk", "Voorburg", "Leidschendam", "Wassenaar", "Alphen aan den Rijn",
    "Spijkenisse", "Barendrecht", "Ridderkerk", "Papendrecht",
    // Flevoland
    "Lelystad",
  ],

  maxResultaten: Infinity, // Geen limiet — alles ophalen
  scrapeWebsite: true,     // Altijd emails proberen te scrapen
  outputFile: path.join("data", "kvk", "kvk_leads.csv"),
  existingLeadsFiles: [
    path.join("data", "clean", "maps_multi_amsterdam.csv"),
    path.join("leads_with_email.csv"),
  ],
};

const API_BASE = "https://api.overheid.io/openkvk";
const API_KEY = process.env.OVERHEID_API_KEY || "ce01a3ff52f9a780e65db8ce9cd8a7bafa29912ffe2787b32a6bb3329b0855e1";

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(val) {
  const str = String(val ?? "").replace(/"/g, '""');
  return `"${str}"`;
}

const CSV_HEADER = [
  "naam",
  "kvk_nummer",
  "sector",
  "adres",
  "stad",
  "postcode",
  "website",
  "email",
  "telefoon",
  "zoekterm",
];

function writeCsv(filePath, rows) {
  const lines = [CSV_HEADER.join(","), ...rows].join("\n");
  fs.writeFileSync(filePath, lines, "utf8");
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

// ─── Deduplicatie ───────────────────────────────────────────────────────────

function dedupeKey(naam, stad) {
  return `${(naam || "").trim().toLowerCase()}__${(stad || "").trim().toLowerCase()}`;
}

function loadExistingSeen() {
  const seen = new Set();

  // Laad bestaande KVK output
  if (fs.existsSync(CONFIG.outputFile)) {
    const content = fs.readFileSync(CONFIG.outputFile, "utf8");
    const lines = content.split("\n").filter(Boolean);
    if (lines.length > 1) {
      const header = parseCsvLine(lines[0]);
      const idxNaam = header.indexOf("naam");
      const idxStad = header.indexOf("stad");
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        seen.add(dedupeKey(cols[idxNaam], cols[idxStad]));
      }
    }
  }

  // Check ook bestaande lead-bestanden
  for (const file of CONFIG.existingLeadsFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n").filter(Boolean);
    if (lines.length <= 1) continue;
    const header = parseCsvLine(lines[0]);
    const idxName = Math.max(header.indexOf("naam"), header.indexOf("name"));
    const idxCity = Math.max(header.indexOf("stad"), header.indexOf("city"));
    if (idxName < 0) continue;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      seen.add(dedupeKey(cols[idxName], idxCity >= 0 ? cols[idxCity] : ""));
    }
  }

  return seen;
}

// ─── Email scraping ─────────────────────────────────────────────────────────

function extractEmailsFromHtml(html) {
  const emails = new Set();
  const mailtoRegex = /mailto:([^"'>\s]+)/gi;
  const emailRegex = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  let m;
  while ((m = mailtoRegex.exec(html))) {
    const email = m[1].trim().toLowerCase();
    if (isValidEmail(email)) emails.add(email);
  }
  while ((m = emailRegex.exec(html))) {
    const email = m[0].trim().toLowerCase();
    if (isValidEmail(email)) emails.add(email);
  }
  return Array.from(emails);
}

function isValidEmail(email) {
  if (!email || !email.includes("@")) return false;
  if (email.includes("/") || email.includes("..")) return false;
  if (/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(email)) return false;
  return true;
}

function pickBestEmail(emails) {
  const hints = [
    "info", "contact", "sales", "admin", "hello", "office",
    "reservatie", "booking", "service", "hr", "jobs",
  ];
  const business = emails.find((e) => {
    const local = e.split("@")[0] || "";
    return hints.some((h) => local.includes(h));
  });
  return business || emails[0] || "";
}

async function scrapeEmailFromWebsite(url) {
  if (!url) return "";
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const html = await res.text();
    const emails = extractEmailsFromHtml(html);
    return pickBestEmail(emails);
  } catch {
    return "";
  }
}

// ─── OpenKVK API ────────────────────────────────────────────────────────────

async function searchKvk(zoekterm, plaats, page = 1) {
  const url = `${API_BASE}?query=${encodeURIComponent(zoekterm)}&queryfields[]=handelsnaam&filters[plaats]=${encodeURIComponent(plaats)}&size=100&page=${page}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "ovio-api-key": API_KEY,
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`  API fout: ${res.status} ${res.statusText}`);
      return { results: [], total: 0 };
    }

    const data = await res.json();
    const embedded = data._embedded || {};
    const results = embedded.bedrijf || [];
    const total = data.totalItemCount || 0;

    return { results, total };
  } catch (err) {
    console.log(`  API fout: ${err.message}`);
    return { results: [], total: 0 };
  }
}

async function fetchCompanyDetail(selfHref) {
  const url = `https://api.overheid.io${selfHref}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "ovio-api-key": API_KEY,
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseCompany(item, sector, zoekterm) {
  return {
    naam: item.handelsnaam || "",
    kvk_nummer: item.dossiernummer || "",
    sector: sector,
    adres: [item.straat || "", item.huisnummer || ""].filter(Boolean).join(" "),
    stad: item.plaats || "",
    postcode: item.postcode || "",
    website: "",
    email: "",
    telefoon: "",
    zoekterm: zoekterm,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const steden = CONFIG.regios;
  const totalCombos = CONFIG.sectoren.reduce((sum, s) => sum + s.zoektermen.length, 0) * steden.length;

  console.log("=== OpenKVK Scraper voor TopTalent ===\n");
  console.log(`Steden: ${steden.length} (Randstad + omgeving)`);
  console.log(`Sectoren: ${CONFIG.sectoren.length}`);
  console.log(`Zoektermen: ${totalCombos} combinaties (sector x stad)`);
  console.log(`Limiet: geen — alles ophalen`);
  console.log(`Website/email scraping: aan\n`);

  ensureDir(CONFIG.outputFile);

  const seen = loadExistingSeen();
  console.log(`${seen.size} bestaande leads geladen voor deduplicatie\n`);

  // Laad bestaande CSV rijen
  const existingRows = [];
  if (fs.existsSync(CONFIG.outputFile)) {
    const content = fs.readFileSync(CONFIG.outputFile, "utf8");
    const lines = content.split("\n").filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      existingRows.push(lines[i]);
    }
  }

  const allRows = [...existingRows];
  let newCount = 0;
  let apiCalls = 0;

  for (const sector of CONFIG.sectoren) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`SECTOR: ${sector.naam}`);
    console.log(`${"=".repeat(60)}`);
    let sectorCount = 0;

    for (const stad of steden) {
      let stadCount = 0;

      for (const zoekterm of sector.zoektermen) {
        let page = 1;

        while (true) {
          const { results, total } = await searchKvk(zoekterm, stad, page);
          apiCalls++;

          if (results.length === 0) break;
          if (page === 1 && total > 0) {
            console.log(`  [${stad}] "${zoekterm}" — ${total} resultaten`);
          }

          for (const item of results) {
            const selfHref = item._links?.self?.href;
            let detail = null;
            if (selfHref) {
              detail = await fetchCompanyDetail(selfHref);
              apiCalls++;
              await new Promise((r) => setTimeout(r, 150));
            }

            const source = detail || item;
            const company = parseCompany(source, sector.naam, zoekterm);
            if (!company.naam) continue;

            // Alleen actieve bedrijven
            if (detail && detail.actief === false) continue;

            const key = dedupeKey(company.naam, company.stad);
            if (seen.has(key)) continue;
            seen.add(key);

            // Email scrapen van website
            if (company.website) {
              company.email = await scrapeEmailFromWebsite(company.website);
              await new Promise((r) => setTimeout(r, 200));
            }

            const row = CSV_HEADER.map((h) => csvEscape(company[h])).join(",");
            allRows.push(row);
            sectorCount++;
            stadCount++;
            newCount++;

            console.log(
              `  + ${company.naam} — ${company.stad} (${company.postcode}) [totaal: ${newCount}]`
            );

            // Autosave elke 25 resultaten
            if (newCount % 25 === 0) {
              writeCsv(CONFIG.outputFile, allRows);
              console.log(`  [autosave: ${allRows.length} rijen | ${apiCalls} API calls]`);
            }
          }

          if (results.length < 100) break;
          page++;
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (stadCount > 0) {
        console.log(`  => ${stad}: +${stadCount} leads`);
      }
    }

    // Save na elke sector
    writeCsv(CONFIG.outputFile, allRows);
    console.log(`\n  SECTOR ${sector.naam} KLAAR: ${sectorCount} nieuwe leads`);
    console.log(`  Totaal tot nu toe: ${allRows.length} rijen\n`);
  }

  // Final save
  writeCsv(CONFIG.outputFile, allRows);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`KLAAR`);
  console.log(`${"=".repeat(60)}`);
  console.log(`${newCount} nieuwe leads toegevoegd`);
  console.log(`${allRows.length} totale rijen in ${CONFIG.outputFile}`);
  console.log(`${apiCalls} API calls gemaakt`);
  console.log(`${seen.size} unieke bedrijven in database`);
}

main().catch((err) => {
  console.error("Fout:", err);
  process.exit(1);
});
