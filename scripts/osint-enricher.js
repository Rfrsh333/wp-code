/**
 * OSINT Enricher — Pass 2: Diepere email-discovery + validatie
 *
 * Leest Pass 1 output (enriched_leads.csv) + originele combined CSV
 * Voert per domein OSINT-recon uit en valideert alles via 3-lagen pipeline
 *
 * Bronnen:
 *   1. crt.sh         — SSL-certificaat transparancy logs
 *   2. theHarvester   — Multi-engine email harvesting
 *   3. Wayback Machine — Historische versies van team/contact pagina's
 *   4. GitHub search  — Per ongeluk gepubliceerde emails
 *   5. Site crawl     — Deep crawl (diepte 2, 30 pagina's)
 *   6. Doc metadata   — PDF/DOCX auteur-info
 *
 * Pipeline:
 *   - Patroon-detectie per domein
 *   - KvK-seed generatie (naam + patroon → kandidaat)
 *   - 3-lagen validatie: Syntax → MX + catch-all → SMTP RCPT TO
 *
 * Gebruik:
 *   node scripts/osint-enricher.js
 *   MAX_DOMAINS=50 node scripts/osint-enricher.js
 *   CONCURRENCY=5 node scripts/osint-enricher.js
 *   SKIP_SMTP=1 node scripts/osint-enricher.js
 */

const fs = require("fs");
const path = require("path");
const net = require("net");
const dns = require("dns");
const https = require("https");
const http = require("http");
const { execSync, spawn } = require("child_process");
const { promisify } = require("util");

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const PROJECT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_DIR, "data");
const COMBINED_CSV = path.join(DATA_DIR, "combined_leads_8568.csv");
const ENRICHED_CSV = path.join(DATA_DIR, "enriched", "enriched_leads.csv");
const TODAY = new Date().toISOString().slice(0, 10);
const OUTPUT_CSV = path.join(DATA_DIR, `combined_leads_8568_enriched_${TODAY}.csv`);
const CACHE_DIR = path.join(DATA_DIR, "osint_cache");
const LOG_DIR = path.join(DATA_DIR, "osint_logs");

const MAX_DOMAINS = process.env.MAX_DOMAINS ? parseInt(process.env.MAX_DOMAINS, 10) : Infinity;
const CONCURRENCY = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 5;
const SKIP_SMTP = process.env.SKIP_SMTP === "1";
const SKIP_HARVESTER = process.env.SKIP_HARVESTER === "1";
const SKIP_WAYBACK = process.env.SKIP_WAYBACK === "1";
const SKIP_GITHUB = process.env.SKIP_GITHUB === "1";
const SKIP_CRAWL = process.env.SKIP_CRAWL === "1";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const AUTOSAVE_EVERY = 25;

const SMTP_HELO = process.env.SMTP_HELO || "";
const SMTP_FROM = process.env.SMTP_FROM || "verify@example.com";

// Rate limits per provider
const SMTP_LIMITS = {
  google: { perMin: 20, parallel: 3 },
  microsoft365: { perMin: 10, parallel: 2 },
  other: { perMin: 30, parallel: 5 },
};

const DELAYS = {
  crtsh: 2000,
  harvester: 5000,
  wayback: 2000,
  github: 3000,
  crawl: 1000,
  smtp: 500,
};

// ---------------------------------------------------------------------------
// EMAIL VALIDATION
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const VALID_EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const EMAIL_BLACKLIST = [
  "noreply@", "no-reply@", "mailer-daemon@", "postmaster@",
  "abuse@", "webmaster@", "root@", "hostmaster@",
  "example.com", "example.nl", "sentry.io", "wixpress.com",
  "wordpress.com", "googleapis.com", "gravatar.com",
  "domein.com", "domain.com", "voorbeeld.nl", "test.com", "test.nl",
  "gebruiker@", "user@domain", "jouw@", "your@", "naam@",
  "yourhosting.nl", "vevida.com", "antagonist.nl", "transip.nl",
  "hostnet.nl", "registrar-servers.com", "privacy-protected@",
  "support@jouwweb.nl", "placeholder", "@example", "yourname@",
  "name@company", "dmarc@", "dmarc-report", "rua+",
  "gserviceaccount.com", ".webp", ".png", ".jpg",
];

function isBlacklisted(email) {
  const lower = email.toLowerCase();
  return EMAIL_BLACKLIST.some((b) => lower.includes(b));
}

function validateSyntax(email) {
  if (!email || typeof email !== "string") return false;
  // Clean URL encoding + zero-width characters + HTML entities
  let cleaned = email.trim().toLowerCase();
  try { cleaned = decodeURIComponent(cleaned); } catch {}
  // Remove HTML unicode escapes (u003e = >, u003c = <, etc.)
  cleaned = cleaned.replace(/u003[a-f0-9]/gi, "");
  // Remove zero-width chars, BOM, soft hyphens
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");
  // Remove leading/trailing non-email chars (>, <, spaces, %20 remnants)
  cleaned = cleaned.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9.]+$/, "").trim();
  if (!VALID_EMAIL_REGEX.test(cleaned)) return false;
  if (isBlacklisted(cleaned)) return false;
  if (cleaned.length > 254) return false;
  return cleaned;
}

// ---------------------------------------------------------------------------
// MX + PROVIDER DETECTION
// ---------------------------------------------------------------------------

const mxCache = new Map();
const catchAllCache = new Map();

async function getMxRecords(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  try {
    const records = await resolveMx(domain);
    records.sort((a, b) => a.priority - b.priority);
    mxCache.set(domain, records);
    return records;
  } catch {
    mxCache.set(domain, null);
    return null;
  }
}

function detectProvider(mxRecords) {
  if (!mxRecords || mxRecords.length === 0) return "none";
  const mx = mxRecords[0].exchange.toLowerCase();
  if (mx.includes("google") || mx.includes("gmail")) return "google";
  if (mx.includes("outlook") || mx.includes("microsoft")) return "microsoft365";
  if (mx.includes("protonmail") || mx.includes("proton")) return "proton";
  if (mx.includes("zoho")) return "zoho";
  return "other";
}

// ---------------------------------------------------------------------------
// CATCH-ALL DETECTION
// ---------------------------------------------------------------------------

async function isCatchAll(domain) {
  if (catchAllCache.has(domain)) return catchAllCache.get(domain);
  const randomUser = `xyztest${Math.random().toString(36).slice(2, 10)}`;
  const testEmail = `${randomUser}@${domain}`;
  const result = await smtpVerify(testEmail, true);
  const isCa = result === "valid"; // random address accepted = catch-all
  catchAllCache.set(domain, isCa);
  return isCa;
}

// ---------------------------------------------------------------------------
// SMTP VERIFICATION
// ---------------------------------------------------------------------------

async function smtpVerify(email, silent = false) {
  const domain = email.split("@")[1];
  const mx = await getMxRecords(domain);
  if (!mx || mx.length === 0) return "no_mx";

  const mxHost = mx[0].exchange;
  const helo = SMTP_HELO || "mail.toptalent.nl";

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve("timeout");
    }, 15000);

    const socket = net.createConnection(25, mxHost);
    let step = 0;
    let response = "";

    socket.setEncoding("utf-8");
    socket.on("error", () => { clearTimeout(timeout); resolve("error"); });
    socket.on("close", () => { clearTimeout(timeout); });

    socket.on("data", (data) => {
      response += data;
      if (!response.includes("\r\n")) return;
      const code = parseInt(response.slice(0, 3), 10);
      response = "";

      if (step === 0) {
        // Banner received
        if (code === 220) {
          step = 1;
          socket.write(`EHLO ${helo}\r\n`);
        } else { socket.destroy(); resolve("rejected"); }
      } else if (step === 1) {
        // EHLO response
        if (code === 250) {
          step = 2;
          socket.write(`MAIL FROM:<${SMTP_FROM}>\r\n`);
        } else { socket.destroy(); resolve("rejected"); }
      } else if (step === 2) {
        // MAIL FROM response
        if (code === 250) {
          step = 3;
          socket.write(`RCPT TO:<${email}>\r\n`);
        } else { socket.destroy(); resolve("rejected"); }
      } else if (step === 3) {
        // RCPT TO response — this is what we care about
        socket.write("QUIT\r\n");
        socket.destroy();
        clearTimeout(timeout);
        if (code === 250) resolve("valid");
        else if (code >= 550 && code <= 554) resolve("invalid");
        else if (code === 450 || code === 451 || code === 452) resolve("greylist");
        else if (code === 421) resolve("throttled");
        else resolve("unknown_" + code);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// OSINT SOURCES
// ---------------------------------------------------------------------------

// 1. crt.sh — Certificate Transparency Logs
async function queryCrtSh(domain) {
  return new Promise((resolve) => {
    const url = `https://crt.sh/?q=%25.${domain}&output=json`;
    const timeout = setTimeout(() => resolve([]), 15000);

    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        clearTimeout(timeout);
        try {
          const entries = JSON.parse(data);
          const names = new Set();
          for (const entry of entries) {
            const cn = entry.common_name || "";
            const na = entry.name_value || "";
            [cn, ...na.split("\n")].forEach((n) => {
              if (n.includes("@")) names.add(n.trim().toLowerCase());
            });
          }
          resolve([...names]);
        } catch { resolve([]); }
      });
      res.on("error", () => { clearTimeout(timeout); resolve([]); });
    }).on("error", () => { clearTimeout(timeout); resolve([]); });
  });
}

// 2. theHarvester
async function runHarvester(domain) {
  if (SKIP_HARVESTER) return [];
  return new Promise((resolve) => {
    const timeout = setTimeout(() => { proc.kill(); resolve([]); }, 60000);
    const proc = spawn("theHarvester", ["-d", domain, "-b", "bing,duckduckgo,crtsh", "-l", "100"], {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    proc.stdout.on("data", (d) => { output += d.toString(); });
    proc.stderr.on("data", () => {});
    proc.on("close", () => {
      clearTimeout(timeout);
      const emails = output.match(EMAIL_REGEX) || [];
      resolve([...new Set(emails.map((e) => e.toLowerCase()))]);
    });
    proc.on("error", () => { clearTimeout(timeout); resolve([]); });
  });
}

// 3. Wayback Machine
async function queryWayback(domain) {
  if (SKIP_WAYBACK) return [];
  const paths = ["contact", "team", "over-ons", "about", "medewerkers", "staff", "impressum"];
  const emails = new Set();

  for (const p of paths) {
    const url = `http://web.archive.org/web/2023*/${domain}/${p}`;
    try {
      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${domain}/${p}&output=json&limit=3&fl=timestamp,original`;
      const snapshots = await fetchJson(cdxUrl, 10000);
      if (!snapshots || snapshots.length < 2) continue;

      // Fetch most recent snapshot
      const [, [timestamp, original]] = [snapshots[0], snapshots[snapshots.length - 1]];
      const archiveUrl = `https://web.archive.org/web/${timestamp}/${original}`;
      const html = await fetchText(archiveUrl, 15000);
      if (html) {
        const found = html.match(EMAIL_REGEX) || [];
        found.forEach((e) => emails.add(e.toLowerCase()));
      }
    } catch {}
    await sleep(500);
  }
  return [...emails];
}

// 4. GitHub Code Search
async function searchGitHub(domain) {
  if (SKIP_GITHUB || !GITHUB_TOKEN) return [];
  try {
    const query = encodeURIComponent(`"@${domain}"`);
    const url = `https://api.github.com/search/code?q=${query}&per_page=30`;
    const data = await fetchJson(url, 15000, {
      Authorization: `token ${GITHUB_TOKEN}`,
      "User-Agent": "TopTalent-OSINT/1.0",
      Accept: "application/vnd.github.v3.text-match+json",
    });
    if (!data || !data.items) return [];

    const emails = new Set();
    for (const item of data.items) {
      if (item.text_matches) {
        for (const tm of item.text_matches) {
          const found = (tm.fragment || "").match(EMAIL_REGEX) || [];
          found.filter((e) => e.includes(domain)).forEach((e) => emails.add(e.toLowerCase()));
        }
      }
    }
    return [...emails];
  } catch { return []; }
}

// 5. Deep Site Crawl
async function deepCrawl(domain, browser) {
  if (SKIP_CRAWL || !browser) return [];
  const emails = new Set();
  const visited = new Set();
  const toVisit = [`https://${domain}`, `https://www.${domain}`];
  const priorityPaths = [
    "/contact", "/team", "/over-ons", "/about", "/about-us",
    "/medewerkers", "/staff", "/impressum", "/ons-team", "/wie-zijn-wij",
  ];
  priorityPaths.forEach((p) => toVisit.push(`https://${domain}${p}`, `https://www.${domain}${p}`));

  const maxPages = 30;
  let crawled = 0;

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (compatible; PentestRecon/1.0)",
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  for (const startUrl of toVisit) {
    if (crawled >= maxPages) break;
    const normalized = normalizeUrl(startUrl, domain);
    if (!normalized || visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      await page.goto(normalized, { waitUntil: "domcontentloaded", timeout: 12000 });
      await sleep(300);
      const html = await page.content();
      const found = html.match(EMAIL_REGEX) || [];
      found.forEach((e) => emails.add(e.toLowerCase()));
      crawled++;

      // Extract internal links (depth 1)
      if (crawled < maxPages) {
        const links = await page.evaluate((dom) => {
          return [...document.querySelectorAll("a[href]")]
            .map((a) => a.href)
            .filter((h) => h.includes(dom) && !h.includes("#") && !h.match(/\.(pdf|jpg|png|gif|css|js)$/i))
            .slice(0, 10);
        }, domain);
        for (const link of links) {
          const norm = normalizeUrl(link, domain);
          if (norm && !visited.has(norm)) toVisit.push(norm);
        }
      }
    } catch {}
  }

  await context.close();
  return [...emails];
}

// 6. Document Metadata (PDF harvesting)
async function harvestDocuments(domain, browser) {
  if (!browser) return [];
  const emails = new Set();

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (compatible; PentestRecon/1.0)",
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Find PDFs on website
    await page.goto(`https://${domain}`, { waitUntil: "domcontentloaded", timeout: 12000 });
    const pdfLinks = await page.evaluate((dom) => {
      return [...document.querySelectorAll('a[href$=".pdf"]')]
        .map((a) => a.href)
        .filter((h) => h.includes(dom))
        .slice(0, 5);
    }, domain);

    // Try to extract text from PDFs (basic approach via fetch + regex)
    for (const pdfUrl of pdfLinks) {
      try {
        const response = await page.goto(pdfUrl, { timeout: 10000 });
        if (response) {
          const body = await response.body();
          const text = body.toString("latin1"); // raw bytes, look for email patterns
          const found = text.match(EMAIL_REGEX) || [];
          found.forEach((e) => emails.add(e.toLowerCase()));
        }
      } catch {}
    }

    await context.close();
  } catch {}

  return [...emails];
}

// ---------------------------------------------------------------------------
// PATTERN DETECTION
// ---------------------------------------------------------------------------

const PATTERNS = [
  { name: "firstname", regex: /^([a-z]+)@/, gen: (f, l) => `${f}@` },
  { name: "lastname", regex: /^([a-z]+)@/, gen: (f, l) => `${l}@` },
  { name: "firstname.lastname", regex: /^([a-z]+)\.([a-z]+)@/, gen: (f, l) => `${f}.${l}@` },
  { name: "f.lastname", regex: /^([a-z])\.([a-z]+)@/, gen: (f, l) => `${f[0]}.${l}@` },
  { name: "firstnamelastname", regex: /^([a-z]{2,})([a-z]{2,})@/, gen: (f, l) => `${f}${l}@` },
  { name: "flastname", regex: /^([a-z])([a-z]{2,})@/, gen: (f, l) => `${f[0]}${l}@` },
  { name: "firstname_lastname", regex: /^([a-z]+)_([a-z]+)@/, gen: (f, l) => `${f}_${l}@` },
  { name: "firstnamel", regex: /^([a-z]+)([a-z])@/, gen: (f, l) => `${f}${l[0]}@` },
];

function detectPattern(emails, domain) {
  // Filter to emails matching this domain
  const domainEmails = emails
    .filter((e) => e.endsWith(`@${domain}`) || e.endsWith(`@www.${domain}`))
    .filter((e) => !isGenericPrefix(e.split("@")[0]));

  if (domainEmails.length < 2) return { pattern: null, confidence: 0 };

  const counts = {};
  for (const email of domainEmails) {
    const local = email.split("@")[0];
    for (const p of PATTERNS) {
      if (p.regex.test(local)) {
        counts[p.name] = (counts[p.name] || 0) + 1;
      }
    }
  }

  let bestPattern = null;
  let bestCount = 0;
  for (const [name, count] of Object.entries(counts)) {
    if (count > bestCount) { bestPattern = name; bestCount = count; }
  }

  if (!bestPattern || bestCount < 2) return { pattern: null, confidence: 0 };
  const confidence = Math.min(100, Math.round((bestCount / domainEmails.length) * 100));
  return { pattern: bestPattern, confidence };
}

function isGenericPrefix(local) {
  const generics = ["info", "contact", "hello", "admin", "support", "mail",
    "office", "sales", "marketing", "hr", "team", "general",
    "noreply", "no-reply", "webmaster", "postmaster", "receptie",
    "reserveringen", "boekingen", "secretariaat"];
  return generics.includes(local.toLowerCase());
}

// ---------------------------------------------------------------------------
// KVK-SEED GENERATION
// ---------------------------------------------------------------------------

function generateEmailCandidates(firstName, lastName, domain, pattern) {
  if (!firstName || !domain) return [];
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = (lastName || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!f) return [];

  const candidates = new Set();

  // Pattern-based generation
  if (pattern && l) {
    switch (pattern) {
      case "firstname.lastname": candidates.add(`${f}.${l}@${domain}`); break;
      case "f.lastname": candidates.add(`${f[0]}.${l}@${domain}`); break;
      case "firstname": candidates.add(`${f}@${domain}`); break;
      case "lastname": candidates.add(`${l}@${domain}`); break;
      case "firstnamelastname": candidates.add(`${f}${l}@${domain}`); break;
      case "flastname": candidates.add(`${f[0]}${l}@${domain}`); break;
      case "firstname_lastname": candidates.add(`${f}_${l}@${domain}`); break;
      case "firstnamel": candidates.add(`${f}${l[0]}@${domain}`); break;
    }
  }

  // Always generate common fallbacks
  candidates.add(`${f}@${domain}`);
  if (l) {
    candidates.add(`${f}.${l}@${domain}`);
    candidates.add(`${f[0]}.${l}@${domain}`);
    candidates.add(`${f[0]}${l}@${domain}`);
    candidates.add(`${f}.${l[0]}@${domain}`);
    candidates.add(`${f}${l}@${domain}`);
  }

  return [...candidates];
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeUrl(url, domain) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes(domain)) return null;
    return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/$/, "");
  } catch { return null; }
}

function extractDomain(website) {
  if (!website) return "";
  try {
    let url = website.trim();
    if (!url.match(/^https?:\/\//)) url = "https://" + url;
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch { return ""; }
}

function fetchJson(url, timeout = 10000, headers = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "Mozilla/5.0", ...headers } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => { clearTimeout(timer); try { resolve(JSON.parse(data)); } catch { resolve(null); } });
      res.on("error", () => { clearTimeout(timer); resolve(null); });
    }).on("error", () => { clearTimeout(timer); resolve(null); });
  });
}

function fetchText(url, timeout = 10000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        fetchText(res.headers.location, timeout).then(resolve);
        return;
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk; if (data.length > 500000) res.destroy(); });
      res.on("end", () => { clearTimeout(timer); resolve(data); });
      res.on("error", () => { clearTimeout(timer); resolve(null); });
    }).on("error", () => { clearTimeout(timer); resolve(null); });
  });
}

// ---------------------------------------------------------------------------
// CSV HELPERS
// ---------------------------------------------------------------------------

function parseCsvFull(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) { row.push(cur.trim()); cur = ""; }
    else if (ch === "\n" && !inQuotes) { row.push(cur.trim()); if (row.some((c) => c)) rows.push(row); row = []; cur = ""; }
    else if (ch === "\r") {}
    else { cur += ch; }
  }
  row.push(cur.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

function escapeCsv(val) {
  const s = String(val || "").replace(/[\n\r]+/g, " ").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ---------------------------------------------------------------------------
// LOAD DATA
// ---------------------------------------------------------------------------

function loadCombinedLeads() {
  const raw = fs.readFileSync(COMBINED_CSV, "utf-8");
  const rows = parseCsvFull(raw);
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const leads = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = rows[i][idx] || ""; });
    leads.push(obj);
  }
  return { header, leads };
}

function loadPass1Results() {
  if (!fs.existsSync(ENRICHED_CSV)) return new Map();
  const raw = fs.readFileSync(ENRICHED_CSV, "utf-8");
  const rows = parseCsvFull(raw);
  if (rows.length < 2) return new Map();
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = rows[i][idx] || ""; });
    const domain = extractDomain(obj.website);
    if (domain) map.set(domain, obj);
  }
  return map;
}

function loadProgress() {
  const progressFile = path.join(CACHE_DIR, "progress.json");
  if (fs.existsSync(progressFile)) {
    try { return JSON.parse(fs.readFileSync(progressFile, "utf-8")); } catch {}
  }
  return { completed: [], results: {} };
}

function saveProgress(progress) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, "progress.json"), JSON.stringify(progress, null, 2));
}

// ---------------------------------------------------------------------------
// FULL VALIDATION PIPELINE
// ---------------------------------------------------------------------------

async function validateEmail(email, domain, highConfidence = false) {
  // Layer 1: Syntax
  const cleaned = validateSyntax(email);
  if (!cleaned) return { email, status: "rejected", reason: "syntax" };

  // Layer 2: MX
  const emailDomain = cleaned.split("@")[1];
  const mx = await getMxRecords(emailDomain);
  if (!mx) return { email: cleaned, status: "rejected", reason: "no_mx" };
  const provider = detectProvider(mx);

  if (SKIP_SMTP) {
    return { email: cleaned, status: "mx_valid", reason: "smtp_skipped", provider };
  }

  // Layer 3: Catch-all detection
  const catchAll = await isCatchAll(emailDomain);

  // Layer 4: SMTP RCPT TO
  const smtpResult = await smtpVerify(cleaned);

  if (smtpResult === "valid") {
    if (catchAll && !highConfidence) {
      return { email: cleaned, status: "catch_all_unconfirmed", reason: "catch_all", provider };
    }
    return { email: cleaned, status: "valid", reason: "smtp_confirmed", provider };
  } else if (smtpResult === "invalid") {
    return { email: cleaned, status: "rejected", reason: "smtp_rejected", provider };
  } else if (smtpResult === "greylist") {
    return { email: cleaned, status: "greylist", reason: "greylist_retry", provider };
  } else {
    return { email: cleaned, status: "unverified", reason: smtpResult, provider };
  }
}

// ---------------------------------------------------------------------------
// PROCESS ONE DOMAIN
// ---------------------------------------------------------------------------

async function processDomain(domain, lead, pass1Data, browser) {
  const result = {
    recon_emails: [],
    recon_rejected: [],
    recon_sources: new Set(),
    recon_primary_pattern: "",
    recon_pattern_confidence: 0,
    kvk_seed_candidates: [],
    kvk_seed_validated: [],
    confirmed_decision_makers: [],
    validation_mx_status: "",
    validation_is_catch_all: false,
    validation_smtp_provider: "",
  };

  const allFoundEmails = new Set();

  // Collect existing emails from pass 1
  const ownerName = pass1Data?.eigenaar_naam || "";
  const existingEmails = [
    pass1Data?.whois_email,
    pass1Data?.geverifieerd_email,
    lead.email,
  ].filter(Boolean);
  existingEmails.forEach((e) => { const v = validateSyntax(e); if (v) allFoundEmails.add(v); });

  // --- OSINT SOURCES ---

  // 1. crt.sh
  try {
    const crtEmails = await queryCrtSh(domain);
    crtEmails.forEach((e) => allFoundEmails.add(e));
    if (crtEmails.length > 0) result.recon_sources.add("crt.sh");
  } catch {}
  await sleep(DELAYS.crtsh);

  // 2. theHarvester
  try {
    const harvesterEmails = await runHarvester(domain);
    harvesterEmails.forEach((e) => allFoundEmails.add(e));
    if (harvesterEmails.length > 0) result.recon_sources.add("theHarvester");
  } catch {}
  await sleep(DELAYS.harvester);

  // 3. Wayback Machine
  try {
    const waybackEmails = await queryWayback(domain);
    waybackEmails.forEach((e) => allFoundEmails.add(e));
    if (waybackEmails.length > 0) result.recon_sources.add("wayback");
  } catch {}

  // 4. GitHub
  try {
    const githubEmails = await searchGitHub(domain);
    githubEmails.forEach((e) => allFoundEmails.add(e));
    if (githubEmails.length > 0) result.recon_sources.add("github");
  } catch {}
  await sleep(DELAYS.github);

  // 5. Deep crawl
  try {
    const crawlEmails = await deepCrawl(domain, browser);
    crawlEmails.forEach((e) => allFoundEmails.add(e));
    if (crawlEmails.length > 0) result.recon_sources.add("site_crawl");
  } catch {}

  // 6. Document metadata
  try {
    const docEmails = await harvestDocuments(domain, browser);
    docEmails.forEach((e) => allFoundEmails.add(e));
    if (docEmails.length > 0) result.recon_sources.add("doc_metadata");
  } catch {}

  // --- PATTERN DETECTION ---
  const domainEmails = [...allFoundEmails].filter((e) => e.endsWith(`@${domain}`));
  const { pattern, confidence } = detectPattern(domainEmails, domain);
  result.recon_primary_pattern = pattern || "";
  result.recon_pattern_confidence = confidence;

  // --- KVK SEED GENERATION ---
  if (ownerName && ownerName.includes(" ")) {
    const parts = ownerName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join("");
    const candidates = generateEmailCandidates(firstName, lastName, domain, pattern);
    result.kvk_seed_candidates = candidates;
  }

  // --- MX + PROVIDER ---
  const mx = await getMxRecords(domain);
  const provider = detectProvider(mx);
  result.validation_smtp_provider = provider;
  result.validation_mx_status = mx ? "valid" : "no_mx";
  result.validation_is_catch_all = mx ? await isCatchAll(domain) : false;

  // --- VALIDATE ALL FOUND EMAILS ---
  const toValidate = [...allFoundEmails].filter((e) => {
    const cleaned = validateSyntax(e);
    return cleaned && (cleaned.endsWith(`@${domain}`) || cleaned.includes(domain));
  });

  for (const email of toValidate.slice(0, 20)) {
    const vResult = await validateEmail(email, domain, result.recon_sources.has("site_crawl"));
    if (vResult.status === "valid" || vResult.status === "mx_valid") {
      if (!isGenericPrefix(email.split("@")[0])) {
        result.recon_emails.push(vResult.email);
      }
    } else if (vResult.status === "rejected") {
      result.recon_rejected.push(`${vResult.email} (${vResult.reason})`);
    }
    await sleep(DELAYS.smtp);
  }

  // --- VALIDATE KVK SEEDS ---
  for (const candidate of result.kvk_seed_candidates.slice(0, 8)) {
    const vResult = await validateEmail(candidate, domain, true);
    if (vResult.status === "valid" || vResult.status === "mx_valid") {
      result.kvk_seed_validated.push(vResult.email);
    }
    await sleep(DELAYS.smtp);
  }

  // --- CROSS-CHECK: confirmed decision makers ---
  if (ownerName) {
    const ownerLower = ownerName.toLowerCase();
    const ownerParts = ownerLower.split(/\s+/);
    for (const email of result.recon_emails) {
      const local = email.split("@")[0].toLowerCase();
      if (ownerParts.some((p) => p.length > 2 && local.includes(p))) {
        result.confirmed_decision_makers.push(email);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  TopTalent OSINT Enricher — Pass 2");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Input:      ${COMBINED_CSV}`);
  console.log(`  Pass 1:     ${ENRICHED_CSV}`);
  console.log(`  Output:     ${OUTPUT_CSV}`);
  console.log(`  Max:        ${MAX_DOMAINS === Infinity ? "all" : MAX_DOMAINS} domeinen`);
  console.log(`  Parallel:   ${CONCURRENCY}x`);
  console.log(`  SMTP:       ${SKIP_SMTP ? "❌ (overgeslagen)" : "✅"}`);
  console.log(`  Harvester:  ${SKIP_HARVESTER ? "❌" : "✅"}`);
  console.log(`  Wayback:    ${SKIP_WAYBACK ? "❌" : "✅"}`);
  console.log(`  GitHub:     ${SKIP_GITHUB || !GITHUB_TOKEN ? "❌" : "✅"}`);
  console.log(`  Site crawl: ${SKIP_CRAWL ? "❌" : "✅"}`);
  console.log("═══════════════════════════════════════════════════\n");

  // Load data
  const { header, leads } = loadCombinedLeads();
  console.log(`📂 ${leads.length} leads geladen uit combined CSV`);

  const pass1Map = loadPass1Results();
  console.log(`📂 ${pass1Map.size} Pass 1 resultaten geladen`);

  const progress = loadProgress();
  console.log(`♻️  ${progress.completed.length} domeinen al afgerond (worden overgeslagen)\n`);

  // Deduplicate domains
  const domainMap = new Map(); // domain → [lead indices]
  for (let i = 0; i < leads.length; i++) {
    const domain = extractDomain(leads[i].website);
    if (!domain) continue;
    if (!domainMap.has(domain)) domainMap.set(domain, []);
    domainMap.get(domain).push(i);
  }

  const allDomains = [...domainMap.keys()].filter((d) => !progress.completed.includes(d));
  const domainsToProcess = allDomains.slice(0, MAX_DOMAINS);
  console.log(`🎯 ${domainsToProcess.length} unieke domeinen te verwerken\n`);

  // Start browser
  let browser = null;
  if (!SKIP_CRAWL) {
    try {
      const { chromium } = require("playwright");
      browser = await chromium.launch({ headless: true });
      console.log("🌐 Browser gestart (headless)\n");
    } catch (err) {
      console.error(`⚠️  Playwright niet beschikbaar: ${err.message}`);
      console.error("   Site crawl wordt overgeslagen.\n");
    }
  }

  // Process in batches
  const startTime = Date.now();
  let processed = 0;
  let totalEmailsFound = 0;
  let totalValidated = 0;
  let totalRejected = 0;
  let totalKvkSeeds = 0;
  let totalConfirmed = 0;

  for (let i = 0; i < domainsToProcess.length; i += CONCURRENCY) {
    const batch = domainsToProcess.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(domainsToProcess.length / CONCURRENCY);

    console.log(`\n── Batch ${batchNum}/${totalBatches} (${batch.length} domeinen) ──`);

    const results = await Promise.all(
      batch.map(async (domain) => {
        const leadIdx = domainMap.get(domain)[0];
        const lead = leads[leadIdx];
        const pass1 = pass1Map.get(domain) || null;

        console.log(`[${processed + batch.indexOf(domain) + 1}/${domainsToProcess.length}] 🔍 ${domain}`);

        try {
          const result = await processDomain(domain, lead, pass1, browser);
          return { domain, result, success: true };
        } catch (err) {
          console.log(`  ❌ ${domain}: ${err.message}`);
          return { domain, result: null, success: false };
        }
      })
    );

    // Store results
    for (const { domain, result, success } of results) {
      processed++;
      progress.completed.push(domain);

      if (success && result) {
        progress.results[domain] = {
          recon_emails: result.recon_emails,
          recon_rejected: result.recon_rejected,
          recon_sources: [...result.recon_sources],
          recon_primary_pattern: result.recon_primary_pattern,
          recon_pattern_confidence: result.recon_pattern_confidence,
          kvk_seed_candidates: result.kvk_seed_candidates,
          kvk_seed_validated: result.kvk_seed_validated,
          confirmed_decision_makers: result.confirmed_decision_makers,
          validation_mx_status: result.validation_mx_status,
          validation_is_catch_all: result.validation_is_catch_all,
          validation_smtp_provider: result.validation_smtp_provider,
        };

        totalEmailsFound += result.recon_emails.length;
        totalValidated += result.recon_emails.length;
        totalRejected += result.recon_rejected.length;
        totalKvkSeeds += result.kvk_seed_validated.length;
        totalConfirmed += result.confirmed_decision_makers.length;

        const summary = [];
        if (result.recon_emails.length) summary.push(`${result.recon_emails.length} emails`);
        if (result.kvk_seed_validated.length) summary.push(`${result.kvk_seed_validated.length} seeds`);
        if (result.confirmed_decision_makers.length) summary.push(`${result.confirmed_decision_makers.length} confirmed`);
        if (result.recon_primary_pattern) summary.push(`pattern: ${result.recon_primary_pattern}`);
        console.log(`  ✅ ${domain}: ${summary.length ? summary.join(" | ") : "geen resultaat"}`);
      }
    }

    // Autosave
    if (processed % AUTOSAVE_EVERY === 0 || i + CONCURRENCY >= domainsToProcess.length) {
      saveProgress(progress);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = (processed / elapsed).toFixed(2);
      const eta = Math.round((domainsToProcess.length - processed) / (processed / elapsed) / 60);
      console.log(`\n💾 Checkpoint (${processed}/${domainsToProcess.length}) | ${elapsed}s | ${rate} dom/s | ETA: ~${eta} min`);
    }

    // Progress report every 50
    if (processed % 50 === 0 && processed > 0) {
      console.log(`\n📊 Tussenstand: ${processed}/${domainsToProcess.length} | emails: ${totalEmailsFound} | validated: ${totalValidated} | rejected: ${totalRejected} | kvk_seeds: ${totalKvkSeeds} | confirmed: ${totalConfirmed}`);
    }
  }

  // Close browser
  if (browser) await browser.close();

  // --- WRITE OUTPUT ---
  console.log("\n📝 Output schrijven...");
  writeOutput(leads, header, domainMap, progress.results);

  // --- FINAL SUMMARY ---
  const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  OSINT Enricher — Samenvatting");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Domeinen verwerkt:   ${processed}`);
  console.log(`  Emails gevonden:     ${totalEmailsFound}`);
  console.log(`  Emails gevalideerd:  ${totalValidated}`);
  console.log(`  Emails afgekeurd:    ${totalRejected}`);
  console.log(`  KvK seeds valide:    ${totalKvkSeeds}`);
  console.log(`  Confirmed beslissers:${totalConfirmed}`);
  console.log(`  Tijd:                ${totalTime} minuten`);
  console.log(`  Output:              ${OUTPUT_CSV}`);
  console.log("═══════════════════════════════════════════════════\n");
}

// ---------------------------------------------------------------------------
// WRITE OUTPUT CSV
// ---------------------------------------------------------------------------

function writeOutput(leads, origHeader, domainMap, results) {
  const extraCols = [
    "recon_emails", "recon_email_count", "recon_rejected_emails",
    "recon_primary_pattern", "recon_pattern_confidence", "recon_sources", "recon_status",
    "validation_mx_status", "validation_is_catch_all", "validation_smtp_provider",
    "kvk_seed_candidates", "kvk_seed_validated", "confirmed_decision_makers",
    "email_match_status", "recon_timestamp",
  ];

  const outputHeader = [...origHeader, ...extraCols];
  const lines = [outputHeader.join(",")];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const domain = extractDomain(lead.website);
    const r = results[domain] || null;

    const origVals = origHeader.map((h) => escapeCsv(lead[h] || ""));

    let extraVals;
    if (r) {
      const reconEmails = r.recon_emails || [];
      const reconRejected = r.recon_rejected || [];
      const matchStatus = lead.email && reconEmails.includes(lead.email.toLowerCase())
        ? "confirmed" : reconEmails.length > 0 ? "new_found" : "no_recon";

      extraVals = [
        escapeCsv(reconEmails.join("; ")),
        reconEmails.length,
        escapeCsv(reconRejected.join("; ")),
        escapeCsv(r.recon_primary_pattern || ""),
        r.recon_pattern_confidence || 0,
        escapeCsv((r.recon_sources || []).join(", ")),
        reconEmails.length > 0 ? "enriched" : "no_results",
        escapeCsv(r.validation_mx_status || ""),
        r.validation_is_catch_all ? "true" : "false",
        escapeCsv(r.validation_smtp_provider || ""),
        escapeCsv((r.kvk_seed_candidates || []).join("; ")),
        escapeCsv((r.kvk_seed_validated || []).join("; ")),
        escapeCsv((r.confirmed_decision_makers || []).join("; ")),
        matchStatus,
        TODAY,
      ];
    } else {
      extraVals = ["", 0, "", "", 0, "", "pending", "", "", "", "", "", "", "pending", ""];
    }

    lines.push([...origVals, ...extraVals].join(","));
  }

  fs.writeFileSync(OUTPUT_CSV, lines.join("\n") + "\n", "utf-8");
  console.log(`✅ ${lines.length - 1} rijen geschreven naar ${OUTPUT_CSV}`);
}

// ---------------------------------------------------------------------------
// RUN
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
