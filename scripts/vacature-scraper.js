/**
 * Vacature Scraper — Indeed.nl + Nationale Vacaturebank
 * Scrapet horeca vacatures om bedrijven te vinden die actief personeel zoeken.
 * Bedrijven met openstaande vacatures zijn de warmste leads.
 *
 * Gebruik:
 *   node scripts/vacature-scraper.js
 *
 * Omgevingsvariabelen:
 *   PLATFORM=both          — indeed, nvb, of both
 *   STEDEN=Amsterdam,Utrecht — komma-gescheiden steden
 *   MAX_RESULTS=100        — max resultaten per stad per platform
 *   SCRAPE_WEBSITE=0       — email van bedrijfswebsite scrapen (1=aan)
 *   SCRAPE_DETAILS=1       — volledige vacaturetekst ophalen (1=aan)
 *   OUTPUT=data/vacatures/vacature_leads.csv
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// ─── Configuratie ───────────────────────────────────────────────────────────

const PLATFORM = process.env.PLATFORM || "both";
const STEDEN = (process.env.STEDEN || "Amsterdam,Utrecht")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_RESULTS = Number(process.env.MAX_RESULTS || 100);
const SCRAPE_WEBSITE = process.env.SCRAPE_WEBSITE === "1";
const SCRAPE_DETAILS = process.env.SCRAPE_DETAILS !== "0";
const OUTPUT =
  process.env.OUTPUT || path.join("data", "vacatures", "vacature_leads.csv");

const ZOEKTERMEN = [
  "horeca",
  "restaurant",
  "cafe",
  "hotel",
  "bar",
  "kok",
  "bediening",
  "keukenhulp",
];

const CSV_HEADER = [
  "bedrijfsnaam",
  "stad",
  "adres",
  "website",
  "email",
  "telefoon",
  "vacature_titel",
  "vacature_url",
  "vacature_beschrijving",
  "datum_geplaatst",
  "aantal_vacatures",
  "platform",
  "bron_query",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(val) {
  const str = String(val ?? "")
    .replace(/"/g, '""')
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
  return `"${str}"`;
}

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

async function waitForEnter(
  prompt = "Los de CAPTCHA op in de browser en druk Enter om door te gaan..."
) {
  process.stdout.write(`\n⚠️  ${prompt}\n`);
  return new Promise((resolve) => process.stdin.once("data", () => resolve()));
}

async function detectCaptcha(page) {
  const frame = page.frames().find((f) => f.url().includes("recaptcha"));
  const robotText = page
    .locator('text="Ik ben geen robot"')
    .first();
  const captchaVisible =
    frame || (await robotText.isVisible().catch(() => false));

  // Indeed-specifieke CAPTCHA detectie
  const indeedCaptcha = page.locator("#challenge-stage, .captcha-container, #px-captcha").first();
  const indeedVisible = await indeedCaptcha.isVisible().catch(() => false);

  if (captchaVisible || indeedVisible) {
    console.log("⚠️  CAPTCHA gedetecteerd. Los hem handmatig op.");
    await waitForEnter();
  }
}

// ─── Cookie consent ─────────────────────────────────────────────────────────

async function acceptCookies(page) {
  const selectors = [
    // Indeed
    'button#onetrust-accept-btn-handler',
    'button[data-testid="accept-all-cookies"]',
    // NVB
    'button.cookie-accept',
    'button[data-action="accept"]',
    // Generic
    'button:has-text("Alles accepteren")',
    'button:has-text("Accepteren")',
    'button:has-text("Akkoord")',
    'button:has-text("Accept all")',
    'button:has-text("Alle cookies accepteren")',
    'button:has-text("Ik ga akkoord")',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(800);
      return true;
    }
  }
  return false;
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

async function scrapeEmailFromWebsite(context, url) {
  if (!url) return "";
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const page = await context.newPage();
  try {
    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    const html = await page.content();
    const emails = extractEmailsFromHtml(html);
    await page.close();
    return pickBestEmail(emails);
  } catch {
    await page.close();
    return "";
  }
}

// ─── Deduplicatie ───────────────────────────────────────────────────────────

function dedupeKey(naam, stad) {
  return `${(naam || "").trim().toLowerCase()}__${(stad || "").trim().toLowerCase()}`;
}

function loadExistingSeen() {
  const seen = new Set();

  // Bestaande vacature output
  if (fs.existsSync(OUTPUT)) {
    const content = fs.readFileSync(OUTPUT, "utf8");
    const lines = content.split("\n").filter(Boolean);
    if (lines.length > 1) {
      const header = parseCsvLine(lines[0]);
      const idxNaam = header.indexOf("bedrijfsnaam");
      const idxStad = header.indexOf("stad");
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        seen.add(dedupeKey(cols[idxNaam], cols[idxStad]));
      }
    }
  }

  // Bestaande lead-bestanden
  const existingFiles = [
    path.join("data", "clean", "maps_multi_amsterdam.csv"),
    path.join("leads_with_email.csv"),
  ];
  for (const file of existingFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n").filter(Boolean);
    if (lines.length <= 1) continue;
    const header = parseCsvLine(lines[0]);
    const idxName = Math.max(
      header.indexOf("bedrijfsnaam"),
      header.indexOf("naam"),
      header.indexOf("name")
    );
    const idxCity = Math.max(
      header.indexOf("stad"),
      header.indexOf("city")
    );
    if (idxName < 0) continue;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      seen.add(dedupeKey(cols[idxName], idxCity >= 0 ? cols[idxCity] : ""));
    }
  }

  return seen;
}

function loadExistingRows() {
  if (!fs.existsSync(OUTPUT)) return [];
  const content = fs.readFileSync(OUTPUT, "utf8");
  const lines = content.split("\n").filter(Boolean);
  if (lines.length <= 1) return [];
  return lines.slice(1); // skip header
}

// ─── Indeed.nl scraping ─────────────────────────────────────────────────────

async function scrapeIndeed(page, context, stad, seen, allRows) {
  let totalNew = 0;

  for (const zoekterm of ZOEKTERMEN) {
    if (totalNew >= MAX_RESULTS) break;

    const query = `${zoekterm} ${stad}`;
    const url = `https://nl.indeed.com/jobs?q=${encodeURIComponent(zoekterm)}&l=${encodeURIComponent(stad)}`;
    console.log(`\n  [Indeed] Zoeken: "${query}"`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (err) {
      console.log(`  Navigatie mislukt: ${err.message}`);
      continue;
    }

    await acceptCookies(page);
    await page.waitForTimeout(rand(1500, 2500));
    await detectCaptcha(page);

    let pageNum = 0;

    while (totalNew < MAX_RESULTS) {
      // Verzamel vacature-kaarten op de huidige pagina
      const cards = await page
        .locator('.job_seen_beacon, .resultContent, .jobsearch-ResultsList > li, div[data-testid="slider_item"]')
        .all();

      if (cards.length === 0) {
        console.log("  Geen resultaten op deze pagina.");
        break;
      }

      console.log(`  Pagina ${pageNum + 1}: ${cards.length} vacatures gevonden`);

      for (const card of cards) {
        if (totalNew >= MAX_RESULTS) break;

        try {
          // Titel + link
          const titleEl = card.locator(
            'h2.jobTitle a, a[data-jk], a.jcs-JobTitle, h2 a'
          ).first();
          const titel = await titleEl.textContent().catch(() => "");
          const href = await titleEl.getAttribute("href").catch(() => "");
          const vacatureUrl = href
            ? href.startsWith("http")
              ? href
              : `https://nl.indeed.com${href}`
            : "";

          // Bedrijfsnaam
          const bedrijfEl = card.locator(
            'span[data-testid="company-name"], span.companyName, span.css-1h7lukg, [data-testid="company-name"]'
          ).first();
          const bedrijfsnaam = (await bedrijfEl.textContent().catch(() => "")).trim();

          if (!bedrijfsnaam || !titel) continue;

          // Locatie
          const locatieEl = card.locator(
            'div[data-testid="text-location"], div.companyLocation, div.css-1restlb'
          ).first();
          const locatie = (await locatieEl.textContent().catch(() => "")).trim();

          // Datum
          const datumEl = card.locator(
            'span[data-testid="myJobsStateDate"], span.date, .result-footer .date'
          ).first();
          const datum = (await datumEl.textContent().catch(() => "")).trim();

          // Deduplicatie
          const key = dedupeKey(bedrijfsnaam, stad);
          if (seen.has(key)) {
            // Tel extra vacature voor bestaand bedrijf
            updateVacatureCount(allRows, bedrijfsnaam, stad);
            continue;
          }

          // Detail pagina voor beschrijving
          let beschrijving = "";
          if (SCRAPE_DETAILS && vacatureUrl) {
            beschrijving = await scrapeIndeedDetail(page, context, vacatureUrl);
            await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(rand(800, 1500));
          }

          // Website email scrapen
          let email = "";
          let website = "";
          if (SCRAPE_WEBSITE) {
            // Indeed toont soms bedrijfs-links
            const companyLink = await card
              .locator('a[data-tn-element="companyName"], a.companyOverviewLink')
              .first()
              .getAttribute("href")
              .catch(() => "");
            if (companyLink) {
              website = companyLink.startsWith("http")
                ? companyLink
                : `https://nl.indeed.com${companyLink}`;
            }
            if (website) {
              email = await scrapeEmailFromWebsite(context, website);
            }
          }

          seen.add(key);
          const row = CSV_HEADER.map((h) => {
            const values = {
              bedrijfsnaam,
              stad,
              adres: locatie,
              website,
              email,
              telefoon: "",
              vacature_titel: titel.trim(),
              vacature_url: vacatureUrl,
              vacature_beschrijving: beschrijving,
              datum_geplaatst: datum,
              aantal_vacatures: "1",
              platform: "indeed",
              bron_query: zoekterm,
            };
            return csvEscape(values[h]);
          }).join(",");

          allRows.push(row);
          totalNew++;
          console.log(`  + ${bedrijfsnaam} — "${titel.trim()}" [${totalNew}/${MAX_RESULTS}]`);

          // Autosave
          if (allRows.length % 10 === 0) {
            writeCsv(OUTPUT, allRows);
            console.log(`  Autosave: ${allRows.length} rijen`);
          }
        } catch (err) {
          console.log(`  Fout bij kaart: ${err.message}`);
          continue;
        }
      }

      // Volgende pagina
      const nextBtn = page.locator(
        'a[data-testid="pagination-page-next"], a[aria-label="Next Page"], a[aria-label="Volgende"]'
      ).first();
      const hasNext = await nextBtn.isVisible().catch(() => false);
      if (!hasNext) break;

      await nextBtn.click().catch(() => {});
      await page.waitForTimeout(rand(2000, 3500));
      await detectCaptcha(page);
      pageNum++;
    }
  }

  return totalNew;
}

async function scrapeIndeedDetail(page, context, url) {
  const detailPage = await context.newPage();
  try {
    await detailPage.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await detailPage.waitForTimeout(rand(800, 1500));

    const beschrijving = await detailPage
      .locator('#jobDescriptionText, .jobsearch-jobDescriptionText, div[id="jobDescriptionText"]')
      .first()
      .innerText()
      .catch(() => "");

    await detailPage.close();
    // Beperk tot 500 chars voor CSV
    return beschrijving.substring(0, 500).replace(/\n/g, " ").trim();
  } catch {
    await detailPage.close();
    return "";
  }
}

// ─── Nationale Vacaturebank scraping ────────────────────────────────────────

async function scrapeNVB(page, context, stad, seen, allRows) {
  let totalNew = 0;

  for (const zoekterm of ZOEKTERMEN) {
    if (totalNew >= MAX_RESULTS) break;

    const query = `${zoekterm} ${stad}`;
    const url = `https://www.nationalevacaturebank.nl/vacature/zoeken?query=${encodeURIComponent(zoekterm)}&location=${encodeURIComponent(stad)}&distance=10`;
    console.log(`\n  [NVB] Zoeken: "${query}"`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (err) {
      console.log(`  Navigatie mislukt: ${err.message}`);
      continue;
    }

    await acceptCookies(page);
    await page.waitForTimeout(rand(2500, 4000));
    await detectCaptcha(page);

    let pageNum = 0;

    while (totalNew < MAX_RESULTS) {
      // Wacht tot NVB resultaten geladen zijn
      await page
        .locator('a[class*="searchResult"]')
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {});

      // NVB vacature kaarten — elke kaart is een <a> met class*="searchResult"
      const cards = await page
        .locator('a[class*="searchResult"]')
        .all();

      if (cards.length === 0) {
        console.log("  Geen resultaten op deze pagina.");
        break;
      }

      console.log(`  Pagina ${pageNum + 1}: ${cards.length} vacatures gevonden`);

      for (const card of cards) {
        if (totalNew >= MAX_RESULTS) break;

        try {
          // Link (de kaart zelf is een <a>)
          const href = await card.getAttribute("href").catch(() => "");
          const vacatureUrl = href
            ? href.startsWith("http")
              ? href
              : `https://www.nationalevacaturebank.nl${href}`
            : "";

          // Titel — h2 in de kaart
          const titel = (
            await card.locator("h2").first().textContent().catch(() => "")
          ).trim();

          // Bedrijfsnaam — strong met class*="companyName"
          const bedrijfsnaam = (
            await card
              .locator('strong[class*="companyName"]')
              .first()
              .textContent()
              .catch(() => "")
          ).trim();

          if (!bedrijfsnaam || !titel) continue;

          // Locatie — span in de companyDetails div
          const locatie = (
            await card
              .locator('[class*="companyDetails"] span')
              .first()
              .textContent()
              .catch(() => "")
          ).trim();

          // Datum — div met class*="publishedDate"
          const datum = (
            await card
              .locator('[class*="publishedDate"]')
              .first()
              .textContent()
              .catch(() => "")
          ).trim();

          // Deduplicatie
          const key = dedupeKey(bedrijfsnaam, stad);
          if (seen.has(key)) {
            updateVacatureCount(allRows, bedrijfsnaam, stad);
            continue;
          }

          // Detail pagina
          let beschrijving = "";
          if (SCRAPE_DETAILS && vacatureUrl) {
            beschrijving = await scrapeNVBDetail(context, vacatureUrl);
          }

          // Website + email
          let email = "";
          let website = "";
          if (SCRAPE_WEBSITE && vacatureUrl) {
            // Probeer website te vinden op detail pagina
            const details = await scrapeNVBCompanyInfo(context, vacatureUrl);
            website = details.website;
            if (website) {
              email = await scrapeEmailFromWebsite(context, website);
            }
          }

          seen.add(key);
          const row = CSV_HEADER.map((h) => {
            const values = {
              bedrijfsnaam,
              stad,
              adres: locatie,
              website,
              email,
              telefoon: "",
              vacature_titel: titel,
              vacature_url: vacatureUrl,
              vacature_beschrijving: beschrijving,
              datum_geplaatst: datum,
              aantal_vacatures: "1",
              platform: "nvb",
              bron_query: zoekterm,
            };
            return csvEscape(values[h]);
          }).join(",");

          allRows.push(row);
          totalNew++;
          console.log(`  + ${bedrijfsnaam} — "${titel}" [${totalNew}/${MAX_RESULTS}]`);

          // Autosave
          if (allRows.length % 10 === 0) {
            writeCsv(OUTPUT, allRows);
            console.log(`  Autosave: ${allRows.length} rijen`);
          }

          await page.waitForTimeout(rand(500, 1000));
        } catch (err) {
          console.log(`  Fout bij kaart: ${err.message}`);
          continue;
        }
      }

      // Laad meer resultaten — NVB gebruikt scroll + "toon meer" knop
      const prevCount = cards.length;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(rand(1500, 2500));

      // Klik "toon meer" als die er is
      const meerBtn = page.locator('button:has-text("toon meer"), button:has-text("Toon meer")').first();
      if (await meerBtn.isVisible().catch(() => false)) {
        await meerBtn.click().catch(() => {});
        await page.waitForTimeout(rand(2000, 3000));
      }

      const newCount = await page.locator('a[class*="searchResult"]').count();
      if (newCount <= prevCount) {
        // Geen nieuwe resultaten meer
        break;
      }
      pageNum++;
    }
  }

  return totalNew;
}

async function scrapeNVBDetail(context, url) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(rand(500, 1000));

    const beschrijving = await page
      .locator('.vacancy-description, .job-description, [class*="description"], article .content, .vacancy-body')
      .first()
      .innerText()
      .catch(() => "");

    await page.close();
    return beschrijving.substring(0, 500).replace(/\n/g, " ").trim();
  } catch {
    await page.close();
    return "";
  }
}

async function scrapeNVBCompanyInfo(context, url) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Zoek bedrijfswebsite link op vacature detail pagina
    const websiteLink = await page
      .locator('a[href*="http"]:near(.company), a.company-website, a[rel="noopener"]:has-text("website")')
      .first()
      .getAttribute("href")
      .catch(() => "");

    await page.close();
    return { website: websiteLink || "" };
  } catch {
    await page.close();
    return { website: "" };
  }
}

// ─── Vacature count update ──────────────────────────────────────────────────

function updateVacatureCount(allRows, bedrijfsnaam, stad) {
  const nameNorm = (bedrijfsnaam || "").trim().toLowerCase();
  const stadNorm = (stad || "").trim().toLowerCase();

  for (let i = 0; i < allRows.length; i++) {
    const cols = parseCsvLine(allRows[i]);
    const rowName = (cols[0] || "").trim().toLowerCase();
    const rowStad = (cols[1] || "").trim().toLowerCase();

    if (rowName === nameNorm && rowStad === stadNorm) {
      // Update aantal_vacatures (index 10)
      const count = parseInt(cols[10] || "1", 10) + 1;
      cols[10] = String(count);
      allRows[i] = cols.map((c) => csvEscape(c)).join(",");
      return;
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Vacature Scraper — Indeed.nl + Nationale Vacaturebank ===\n");
  console.log(`Platform:  ${PLATFORM}`);
  console.log(`Steden:    ${STEDEN.join(", ")}`);
  console.log(`Max/stad:  ${MAX_RESULTS}`);
  console.log(`Details:   ${SCRAPE_DETAILS ? "aan" : "uit"}`);
  console.log(`Website:   ${SCRAPE_WEBSITE ? "aan" : "uit"}`);
  console.log(`Output:    ${OUTPUT}\n`);

  ensureDir(OUTPUT);

  const seen = loadExistingSeen();
  const existingRows = loadExistingRows();
  const allRows = [...existingRows];
  console.log(`${seen.size} bestaande leads geladen voor deduplicatie`);
  console.log(`${existingRows.length} bestaande rijen in output\n`);

  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext({
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const stats = { indeed: 0, nvb: 0 };

  for (const stad of STEDEN) {
    console.log(`\n${"═".repeat(50)}`);
    console.log(`  STAD: ${stad}`);
    console.log(`${"═".repeat(50)}`);

    // Indeed
    if (PLATFORM === "indeed" || PLATFORM === "both") {
      console.log(`\n--- Indeed.nl — ${stad} ---`);
      const count = await scrapeIndeed(page, context, stad, seen, allRows);
      stats.indeed += count;
      writeCsv(OUTPUT, allRows);
      console.log(`  Indeed ${stad}: ${count} nieuwe leads`);
    }

    // Nationale Vacaturebank
    if (PLATFORM === "nvb" || PLATFORM === "both") {
      console.log(`\n--- Nationale Vacaturebank — ${stad} ---`);
      const count = await scrapeNVB(page, context, stad, seen, allRows);
      stats.nvb += count;
      writeCsv(OUTPUT, allRows);
      console.log(`  NVB ${stad}: ${count} nieuwe leads`);
    }
  }

  await browser.close();

  // Final save
  writeCsv(OUTPUT, allRows);

  // Samenvatting per bedrijf
  const bedrijven = new Map();
  for (const row of allRows) {
    const cols = parseCsvLine(row);
    const naam = (cols[0] || "").trim();
    const stad = (cols[1] || "").trim();
    const count = parseInt(cols[10] || "1", 10);
    const key = `${naam}__${stad}`;
    if (!bedrijven.has(key)) {
      bedrijven.set(key, { naam, stad, count });
    } else {
      bedrijven.get(key).count += count;
    }
  }

  const meerDanEen = [...bedrijven.values()].filter((b) => b.count > 1);
  meerDanEen.sort((a, b) => b.count - a.count);

  console.log(`\n${"═".repeat(50)}`);
  console.log("  SAMENVATTING");
  console.log(`${"═".repeat(50)}`);
  console.log(`Totaal rijen:         ${allRows.length}`);
  console.log(`Unieke bedrijven:     ${bedrijven.size}`);
  console.log(`Indeed nieuwe leads:  ${stats.indeed}`);
  console.log(`NVB nieuwe leads:     ${stats.nvb}`);
  console.log(`Output:               ${OUTPUT}`);

  if (meerDanEen.length > 0) {
    console.log(`\nBedrijven met meerdere vacatures (${meerDanEen.length}):`);
    for (const b of meerDanEen.slice(0, 20)) {
      console.log(`  ${b.count}x  ${b.naam} (${b.stad})`);
    }
    if (meerDanEen.length > 20) {
      console.log(`  ... en ${meerDanEen.length - 20} meer`);
    }
  }

  console.log("\nKlaar!");
}

main().catch((err) => {
  console.error("Fout:", err);
  process.exit(1);
});
