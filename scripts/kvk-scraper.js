/**
 * OpenKVK Scraper — haalt nieuwe bedrijfsregistraties op via de OpenKVK API.
 * Focust op sectoren relevant voor TopTalent (horeca, retail, logistiek, schoonmaak).
 *
 * Gebruik:
 *   node scripts/kvk-scraper.js
 *
 * Omgevingsvariabelen (optioneel):
 *   REGIO=Utrecht         — zoek in specifieke regio
 *   MAX_RESULTS=100       — max resultaten per sector
 *   SCRAPE_WEBSITE=1      — probeer email van bedrijfswebsite te scrapen
 */

const fs = require("fs");
const path = require("path");

// ─── Configuratie ───────────────────────────────────────────────────────────

const CONFIG = {
  sectoren: [
    { sbi: "56", naam: "Horeca" },
    { sbi: "5610", naam: "Restaurants" },
    { sbi: "5630", naam: "Cafes" },
    { sbi: "47", naam: "Retail" },
    { sbi: "52", naam: "Logistiek" },
    { sbi: "81", naam: "Schoonmaak" },
  ],
  regio: process.env.REGIO || "Utrecht",
  maxResultaten: Number(process.env.MAX_RESULTS || 100),
  scrapeWebsite: process.env.SCRAPE_WEBSITE === "1",
  outputDir: path.join("data", "kvk"),
  outputFile: path.join("data", "kvk", "kvk_leads.csv"),
  existingLeadsFiles: [
    path.join("data", "clean", "maps_multi_amsterdam.csv"),
    path.join("leads_with_email.csv"),
  ],
};

const API_BASE = "https://api.overheid.io/openkvk";

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
  "sbi_code",
  "sbi_omschrijving",
  "adres",
  "stad",
  "postcode",
  "website",
  "email",
  "telefoon",
  "oprichtingsdatum",
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

const emailRegex = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;

function extractEmailsFromHtml(html) {
  const emails = new Set();
  const mailtoRegex = /mailto:([^"'>\s]+)/gi;
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

async function queryOpenKvk(sbiCode, plaats, page = 1) {
  // overheid.io API: filters op plaats, query voor SBI-gerelateerde zoektermen
  const params = new URLSearchParams();
  params.set("size", "100");
  params.set("page", String(page));
  params.set("filters[plaats]", plaats);

  // SBI-code mapping naar zoektermen voor de query
  const sbiQueryMap = {
    "56": "horeca",
    "5610": "restaurant",
    "5630": "cafe",
    "47": "retail winkel",
    "52": "logistiek transport",
    "81": "schoonmaak",
  };
  const queryTerm = sbiQueryMap[sbiCode] || "";
  if (queryTerm) {
    params.set("query", queryTerm);
    params.set("queryfields[]", "handelsnaam");
  }

  const url = `${API_BASE}?${params.toString()}`;
  console.log(`  API request: SBI=${sbiCode}, plaats=${plaats}, page=${page}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "TopTalent-KVK-Scraper/1.0",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`  API fout: ${res.status} ${res.statusText}`);
      return { results: [], total: 0 };
    }

    const data = await res.json();

    // overheid.io wraps results in embedded._embedded or _embedded.openkvk
    const embedded = data._embedded || {};
    const results = embedded.openkvk || embedded.items || [];
    const total = data.totalItemCount || data.total || results.length;

    return { results, total };
  } catch (err) {
    console.log(`  API fout: ${err.message}`);
    return { results: [], total: 0 };
  }
}

function parseCompany(item) {
  return {
    naam: item.handelsnaam || item.trade_name || item.name || "",
    kvk_nummer: item.dossiernummer || item.kvk_number || item.kvkNumber || "",
    sbi_code: item.sbiCode || item.sbi_code || "",
    sbi_omschrijving: item.sbiOmschrijving || item.sbi_description || "",
    adres: [item.straat || item.street || "", item.huisnummer || item.house_number || ""]
      .filter(Boolean)
      .join(" "),
    stad: item.plaats || item.city || "",
    postcode: item.postcode || item.postal_code || "",
    website: item.website || item.url || "",
    email: "",
    telefoon: item.telefoon || item.phone || "",
    oprichtingsdatum: item.registratiedatum || item.registration_date || item.startDate || "",
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== OpenKVK Scraper voor TopTalent ===\n");
  console.log(`Regio: ${CONFIG.regio}`);
  console.log(`Max resultaten per sector: ${CONFIG.maxResultaten}`);
  console.log(`Website scraping: ${CONFIG.scrapeWebsite ? "aan" : "uit"}`);
  console.log(`Sectoren: ${CONFIG.sectoren.map((s) => s.naam).join(", ")}\n`);

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

  for (const sector of CONFIG.sectoren) {
    console.log(`\n--- Sector: ${sector.naam} (SBI ${sector.sbi}) ---`);
    let collected = 0;
    let page = 1;

    while (collected < CONFIG.maxResultaten) {
      const { results, total } = await queryOpenKvk(sector.sbi, CONFIG.regio, page);

      if (results.length === 0) {
        if (page === 1) console.log("  Geen resultaten gevonden.");
        break;
      }

      if (page === 1) console.log(`  Totaal beschikbaar: ${total}`);

      for (const item of results) {
        if (collected >= CONFIG.maxResultaten) break;

        const company = parseCompany(item);
        if (!company.naam) continue;

        const key = dedupeKey(company.naam, company.stad);
        if (seen.has(key)) continue;
        seen.add(key);

        // Email scrapen van website indien gewenst
        if (CONFIG.scrapeWebsite && company.website) {
          company.email = await scrapeEmailFromWebsite(company.website);
          // Kleine pauze om niet te agressief te zijn
          await new Promise((r) => setTimeout(r, 500));
        }

        const row = CSV_HEADER.map((h) => csvEscape(company[h])).join(",");
        allRows.push(row);
        collected++;
        newCount++;

        console.log(
          `  + ${company.naam}${company.stad ? ` (${company.stad})` : ""} [${collected}/${CONFIG.maxResultaten}]`
        );

        // Autosave elke 20 resultaten
        if (newCount % 20 === 0) {
          writeCsv(CONFIG.outputFile, allRows);
          console.log(`  Autosave: ${allRows.length} rijen`);
        }
      }

      page++;

      // Pauze tussen pagina's
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`  Sector ${sector.naam}: ${collected} nieuwe leads`);
  }

  // Final save
  writeCsv(CONFIG.outputFile, allRows);
  console.log(`\n=== Klaar ===`);
  console.log(`${newCount} nieuwe leads toegevoegd`);
  console.log(`${allRows.length} totale rijen in ${CONFIG.outputFile}`);
}

main().catch((err) => {
  console.error("Fout:", err);
  process.exit(1);
});
