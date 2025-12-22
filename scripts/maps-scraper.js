/**
 * Google Maps scraper (Playwright) with basic CAPTCHA detection/pause.
 * Defaults:
 *   SEARCH_QUERY=h horeca Amsterdam
 *   MAX_RESULTS=50
 *   OUTPUT=data/clean/maps_amsterdam.csv
 *   PROXY_URL= (optional, e.g. http://user:pass@host:port)
 *
 * Steps:
 *   1) npm i -D playwright
 *   2) npx playwright install chromium
 *   3) node scripts/maps-scraper.js
 *
 * If a CAPTCHA appears, solve it manually and press Enter in the terminal.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// Single search term (backwards compatible)
const SEARCH_QUERY = process.env.SEARCH_QUERY || null;
// Comma-separated list of queries
const QUERIES = process.env.QUERIES
  ? process.env.QUERIES.split(",").map((q) => q.trim()).filter(Boolean)
  : [
      "restaurants Amsterdam",
      "cafe Amsterdam",
      "bar Amsterdam",
      "snackbar Amsterdam",
      "koffiezaak Amsterdam",
      "bistro Amsterdam",
      "event locatie Amsterdam",
      "catering Amsterdam",
      "hotel Amsterdam",
    ];

const MAX_RESULTS_PER_QUERY = Number(process.env.MAX_RESULTS || 200);
const PROXY = process.env.PROXY_URL || null;
const OUTPUT = process.env.OUTPUT || path.join("data", "clean", "maps_multi_amsterdam.csv");
const SCRAPE_WEBSITE = process.env.SCRAPE_WEBSITE === "1"; // open bedrijfswebsite en e-mail/LinkedIn proberen te vinden
const SKIP_SPONSORED = process.env.SKIP_SPONSORED !== "0"; // standaard gesponsorde kaarten overslaan
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 3);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const isMeaningfulName = (name) => {
  if (!name) return false;
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  if (norm === "gesponsord") return false;
  if (norm === "resultaten" || norm.startsWith("resultaten ")) return false;
  if (norm === "results" || norm.startsWith("results ")) return false;
  return true;
};

async function fallbackNameFromCard(card) {
  const aria = await card.getAttribute("aria-label").catch(() => "");
  if (isMeaningfulName(aria)) return aria.trim();
  const heading = await card.locator('[role="heading"]').first().textContent().catch(() => "");
  if (isMeaningfulName(heading)) return heading.trim();
  const text = await card.innerText().catch(() => "");
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean);
  if (isMeaningfulName(firstLine)) return firstLine;
  return "";
}

function buildProxyConfig(proxyUrl) {
  if (!proxyUrl) return undefined;
  try {
    const u = new URL(proxyUrl);
    return {
      server: `${u.protocol}//${u.hostname}:${u.port}`,
      username: u.username || undefined,
      password: u.password || undefined,
    };
  } catch {
    return { server: proxyUrl };
  }
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeCsv(outputPath, rows) {
  const header = ["name", "address", "phone", "website", "email"];
  const csv = [header.join(","), ...rows].join("\n");
  fs.writeFileSync(outputPath, csv, "utf8");
}

async function waitForEnter(prompt = "Solve CAPTCHA in the browser, then press Enter here to continue...") {
  process.stdout.write(`${prompt}\n`);
  return new Promise((resolve) => process.stdin.once("data", () => resolve()));
}

async function detectCaptcha(page) {
  const frame = page.frames().find((f) => f.url().includes("recaptcha"));
  const textEl = page.locator('text="Ik ben geen robot"').first();
  const captchaVisible = frame || (await textEl.isVisible().catch(() => false));
  if (captchaVisible) {
    console.log("⚠️  CAPTCHA gedetecteerd. Los hem handmatig op.");
    await waitForEnter();
  }
}

async function acceptGoogleConsent(page) {
  const selectors = [
    'button:has-text("Alles accepteren")',
    'button:has-text("Ik ga akkoord")',
    'button:has-text("Akkoord")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(800);
      return true;
    }
  }
  return false;
}

function parseLatLngFromUrl(url) {
  const match = url.match(/@([0-9.-]+),([0-9.-]+)/);
  if (!match) return { lat: "", lng: "" };
  return { lat: match[1], lng: match[2] };
}

function cleanLabelValue(text) {
  if (!text) return "";
  return String(text).replace(/^[^A-Za-z0-9+]+/, "").trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
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

function pickPreferredEmail(emails) {
  const businessHints = [
    "info",
    "contact",
    "sales",
    "admin",
    "support",
    "hello",
    "office",
    "reservatie",
    "booking",
    "service",
    "marketing",
    "jobs",
    "careers",
  ];
  const normalized = emails
    .map((e) => (e || "").trim())
    .filter(Boolean)
    .map((e) => e.replace(/^mailto:/i, "").trim());
  const isBusiness = (email) => {
    const local = email.split("@")[0] || "";
    return businessHints.some((h) => local.toLowerCase().includes(h));
  };
  const personal = normalized.find((e) => !isBusiness(e)) || "";
  const business = normalized.find((e) => isBusiness(e)) || "";
  return personal || business || "";
}

async function scrapeDetail(page) {
  const main = page.locator('div[role="main"]');
  await main.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});

  const readDetail = async () => {
    const name = await main
      .locator('h1 span, h1[role="heading"], h1')
      .first()
      .textContent()
      .catch(() => "");
    const category = await main
      .locator(
        'button[jsaction*="pane.rating.category"], button[aria-label*="Categorie"], button[aria-label*="category"], span[aria-label*="Categorie"], span[aria-label*="category"]'
      )
      .first()
      .textContent()
      .catch(() => "");
    const rating = await main
      .locator('span[aria-label*="sterren"], span[aria-label*="stars"]')
      .first()
      .textContent()
      .catch(() => "");
    const reviewsText = await main
      .locator(
        'button[jsaction*="pane.rating.moreReviews"], span[aria-label*="beoordeling"], span[aria-label*="reviews"], span[aria-label*="review"]'
      )
      .first()
      .textContent()
      .catch(() => "");
    const address = await main.locator('button[data-item-id="address"]').first().textContent().catch(() => "");
    const phone = await main.locator('button[data-item-id^="phone:tel"]').first().textContent().catch(() => "");
    const website = await main.locator('a[data-item-id="authority"]').first().getAttribute("href").catch(() => "");

    const url = page.url();
    const { lat, lng } = parseLatLngFromUrl(url);

    return {
      name: (name || "").trim(),
      category: (category || "").trim(),
      rating: (rating || "").trim(),
      reviews: (reviewsText || "").replace(/[()]/g, "").trim(),
      address: cleanLabelValue(address),
      phone: cleanLabelValue(phone),
      website: website || "",
      url,
      lat,
      lng,
    };
  };

  for (let i = 0; i < 3; i++) {
    const data = await readDetail();
    if (isMeaningfulName(data.name)) return data;
    await page.waitForTimeout(800);
  }
  return await readDetail();
}

function extractEmailsAndLinkedins(html) {
  const emails = new Set();
  const linkedins = new Set();
  const mailRegex = /mailto:([^"'>\s]+)/gi;
  const emailRegex = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  const linkedinRegex = /https?:\/\/(?:[a-z]+\.)?linkedin\.com\/[^\s"'<>]+/gi;

  const isValidEmail = (email) => {
    const lower = String(email || "").toLowerCase();
    if (!lower.includes("@")) return false;
    if (lower.includes("/") || lower.includes("..")) return false;
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(lower)) return false;
    return true;
  };

  let m;
  while ((m = mailRegex.exec(html))) {
    if (isValidEmail(m[1])) emails.add(m[1]);
  }
  while ((m = emailRegex.exec(html))) {
    if (isValidEmail(m[0])) emails.add(m[0]);
  }
  while ((m = linkedinRegex.exec(html))) linkedins.add(m[0]);

  return { emails: Array.from(emails), linkedins: Array.from(linkedins) };
}

async function scrapeWebsiteEmails(context, url) {
  if (!url) return { emails: [], linkedins: [] };
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    const html = await page.content();
    const { emails, linkedins } = extractEmailsAndLinkedins(html);
    await page.close();
    return { emails, linkedins };
  } catch {
    await page.close();
    return { emails: [], linkedins: [] };
  }
}

function loadExisting(outputPath) {
  if (!fs.existsSync(outputPath)) return { data: [], seen: new Set() };
  const content = fs.readFileSync(outputPath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  if (lines.length <= 1) return { data: [], seen: new Set() };
  const header = parseCsvLine(lines[0]);
  const idxName = header.indexOf("name");
  const idxAddr = header.indexOf("address");
  const idxPhone = header.indexOf("phone");
  const existing = [];
  const seen = new Set();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    existing.push(row);
    const cols = parseCsvLine(row);
    const name = idxName >= 0 ? cols[idxName] : "";
    const addr = idxAddr >= 0 ? cols[idxAddr] : "";
    const phone = idxPhone >= 0 ? cols[idxPhone] : "";
    const key = `${name}__${addr || phone}`;
    seen.add(key);
  }
  return { data: existing, seen };
}

async function scrapeQueries() {
  await ensureDir(OUTPUT);
  if (!fs.existsSync(OUTPUT)) {
    writeCsv(OUTPUT, []);
  }

  const browser = await chromium.launch({
    headless: false,
    proxy: buildProxyConfig(PROXY),
  });
  const context = await browser.newContext({
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const queries = SEARCH_QUERY ? [SEARCH_QUERY] : QUERIES;
  const existing = loadExisting(OUTPUT);
  const all = [...existing.data];
  const globalSeen = new Set(existing.seen);
  console.log(`Found ${existing.data.length} bestaande rijen in ${OUTPUT}`);

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    console.log(`\n=== Batch ${i / BATCH_SIZE + 1}: ${batch.join(" | ")} ===`);

    for (const query of batch) {
      console.log(`\n=== Query: ${query} ===`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;
      console.log(`Navigeren naar: ${searchUrl}`);
      let navigated = false;
      for (let attempt = 1; attempt <= 2 && !navigated; attempt++) {
        try {
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
          navigated = true;
        } catch (err) {
          if (attempt === 2) throw err;
          console.log("Navigatie time-out, probeer opnieuw...");
        }
      }
      await acceptGoogleConsent(page);
      await detectCaptcha(page);
      await page.waitForTimeout(2000);

      const feed = page.locator('div[role="feed"]');
      await feed.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
      await feed.locator('div[role="article"]').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
      for (let warmups = 0; warmups < 5; warmups++) {
        const count = await feed.locator('div[role="article"]').count();
        if (count > 0) break;
        await feed.evaluate((el) => el.scrollBy(0, 400));
        await page.waitForTimeout(rand(800, 1200));
      }
      const initialCount = await feed.locator('div[role="article"]').count();
      if (initialCount === 0) {
        console.log("Geen resultaten gevonden; door naar volgende query.");
        continue;
      }

      let index = 0;
      let staleScrolls = 0;
      const localSeen = new Set();

      while (localSeen.size < MAX_RESULTS_PER_QUERY) {
        await detectCaptcha(page);

        const cards = await feed.locator('div[role="article"]').all();
        if (index >= cards.length) {
          await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight));
          await page.waitForTimeout(rand(800, 1400));
          const newCount = await feed.locator('div[role="article"]').count();
          staleScrolls = newCount > cards.length ? 0 : staleScrolls + 1;
          if (staleScrolls >= 5) {
            console.log("Geen nieuwe kaarten meer gevonden; verder met volgende query.");
            break;
          }
          continue;
        }

        const card = cards[index];
        if (SKIP_SPONSORED) {
          const txt = await card.innerText().catch(() => "");
          const hasBadge = await card.locator('text=Gesponsord').first().isVisible().catch(() => false);
          if (txt.toLowerCase().includes("gesponsord") || hasBadge) {
            index += 1;
            continue;
          }
        }

        await card.scrollIntoViewIfNeeded().catch(() => {});
        await card.click().catch(() => {});
        await page.waitForTimeout(rand(1200, 2200));
        await detectCaptcha(page);

        let data = await scrapeDetail(page);
        if (!isMeaningfulName(data.name)) {
          await page.waitForTimeout(800);
          data = await scrapeDetail(page);
        }
        if (!isMeaningfulName(data.name)) {
          const fallback = await fallbackNameFromCard(card);
          if (isMeaningfulName(fallback)) data.name = fallback;
        }
        if (!isMeaningfulName(data.name)) {
          console.log("Lege of generieke naam in detailpaneel; overslaan.");
          index += 1;
          continue;
        }
        if (SKIP_SPONSORED && data.name.toLowerCase() === "gesponsord") {
          index += 1;
          continue;
        }
        if (!data.address && !data.phone) {
          console.log(`Geen adres/telefoon voor ${data.name}; overslaan.`);
          index += 1;
          continue;
        }

        let preferredEmail = "";
        if (SCRAPE_WEBSITE && data.website) {
          const extra = await scrapeWebsiteEmails(context, data.website);
          preferredEmail = pickPreferredEmail(extra.emails);
        }

        const key = `${data.name}__${data.address || data.phone}`;
        if (data.name && !localSeen.has(key)) {
          localSeen.add(key);
          if (!globalSeen.has(key)) {
            globalSeen.add(key);
            const record = { ...data, email: preferredEmail };
            const header = ["name", "address", "phone", "website", "email"];
            const row = header
              .map((h) => {
                const val = record[h] ?? "";
                const safe = String(val).replace(/\"/g, '""');
                return `"${safe}"`;
              })
              .join(",");
            all.push(row);
            console.log(`+ ${data.name} [${localSeen.size}/${MAX_RESULTS_PER_QUERY}]`);
            if (all.length % 10 === 0) {
              writeCsv(OUTPUT, all);
              console.log(`Autosave: ${all.length} rijen in ${OUTPUT}`);
            }
          }
        }

        index += 1;
        if (index % 10 === 0) {
          await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight));
          await page.waitForTimeout(rand(800, 1500));
        }
        if (index > 1000) break; // safeguard
      }

      // Flush na elke query om progress te bewaren
      writeCsv(OUTPUT, all);
      console.log(`Saved progress: ${all.length} totale rijen in ${OUTPUT}`);
    }
  }

  await browser.close();

  writeCsv(OUTPUT, all);
  console.log(`\nKlaar. ${all.length} unieke resultaten opgeslagen in ${OUTPUT}`);
}

scrapeQueries().catch((err) => {
  console.error(err);
  process.exit(1);
});
