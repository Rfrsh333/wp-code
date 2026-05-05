/**
 * Email Guesser — Genereert info@/contact@ kandidaten en valideert via MX + SMTP
 * Voor leads zonder email maar met website
 */

const dns = require("dns").promises;
const net = require("net");
const fs = require("fs");
const path = require("path");
// No external CSV dependency needed - using built-in parser
const { URL } = require("url");

const PROJECT = path.resolve(__dirname, "..");
const INPUT = path.join(PROJECT, "data", "leads_definitief_2026-05-03.csv");
const OUTPUT = path.join(PROJECT, "data", "leads_definitief_2026-05-03.csv"); // update in-place
const CACHE_DIR = path.join(PROJECT, "data", "guesser_cache");
const PROGRESS_FILE = path.join(CACHE_DIR, "progress.json");
const MX_CACHE_FILE = path.join(CACHE_DIR, "mx_cache.json");
const LOG_FILE = path.join(CACHE_DIR, "smtp_guesser.log");

const CONCURRENCY = parseInt(process.env.CONCURRENCY || "10");
const MAX_DOMAINS = parseInt(process.env.MAX_DOMAINS || "999999");

// Common email prefixes voor Nederlandse horeca
const PREFIXES = ["info", "contact", "hallo", "hello", "welkom", "receptie", "reserveringen", "reserveren"];

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// --- CSV parser (simple) ---
function parseCsv(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(current); current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(current); current = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else {
      current += ch;
    }
  }
  if (current || row.length) { row.push(current); rows.push(row); }
  return rows;
}

function csvEscape(val) {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

// --- Domain extraction ---
function extractDomain(website) {
  if (!website) return "";
  try {
    let url = website.trim();
    if (!url.match(/^https?:\/\//)) url = "http://" + url;
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return h;
  } catch { return ""; }
}

// --- MX lookup with cache ---
let mxCache = {};
if (fs.existsSync(MX_CACHE_FILE)) {
  try { mxCache = JSON.parse(fs.readFileSync(MX_CACHE_FILE, "utf-8")); } catch {}
}

async function getMx(domain) {
  if (mxCache[domain] !== undefined) return mxCache[domain];
  try {
    const records = await dns.resolveMx(domain);
    if (records && records.length > 0) {
      const sorted = records.sort((a, b) => a.priority - b.priority);
      mxCache[domain] = sorted[0].exchange;
    } else {
      mxCache[domain] = null;
    }
  } catch {
    mxCache[domain] = null;
  }
  return mxCache[domain];
}

function saveMxCache() {
  fs.writeFileSync(MX_CACHE_FILE, JSON.stringify(mxCache));
}

// --- SMTP RCPT TO check ---
function smtpCheck(mxHost, email, timeout = 10000) {
  return new Promise((resolve) => {
    const sock = net.createConnection(25, mxHost);
    let phase = "connect";
    let buf = "";
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      try { sock.write("QUIT\r\n"); } catch {}
      setTimeout(() => { try { sock.destroy(); } catch {} }, 500);
      resolve(result);
    };

    const timer = setTimeout(() => finish("timeout"), timeout);
    sock.on("error", () => finish("error"));
    sock.on("close", () => finish("error"));

    sock.on("data", (data) => {
      buf += data.toString();
      const lines = buf.split("\r\n");
      buf = lines.pop();
      for (const line of lines) {
        const code = parseInt(line.substring(0, 3));
        if (phase === "connect" && code >= 200 && code < 300) {
          phase = "helo";
          sock.write("HELO mail.toptalent.nl\r\n");
        } else if (phase === "helo" && code === 250) {
          phase = "mailfrom";
          sock.write("MAIL FROM:<verify@toptalent.nl>\r\n");
        } else if (phase === "mailfrom" && code === 250) {
          phase = "rcpt";
          sock.write(`RCPT TO:<${email}>\r\n`);
        } else if (phase === "rcpt") {
          clearTimeout(timer);
          if (code === 250) finish("valid");
          else if (code >= 550 && code <= 554) finish("invalid");
          else if (code >= 450 && code <= 452) finish("greylist");
          else if (code === 421) finish("ratelimit");
          else finish("unknown_" + code);
        }
      }
    });
  });
}

// --- Catch-all detection ---
const catchAllCache = {};
async function isCatchAll(domain, mxHost) {
  if (catchAllCache[domain] !== undefined) return catchAllCache[domain];
  const random = `nonexistent_test_${Math.random().toString(36).slice(2, 10)}@${domain}`;
  const result = await smtpCheck(mxHost, random);
  catchAllCache[domain] = result === "valid";
  return catchAllCache[domain];
}

// --- Progress ---
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")); } catch {}
  }
  return { completed: {}, stats: { checked: 0, found: 0, catch_all: 0, no_mx: 0, invalid: 0 } };
}

function saveProgress(prog) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog));
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// --- Main ---
async function processDomain(domain, progress) {
  if (progress.completed[domain]) return progress.completed[domain];

  const mx = await getMx(domain);
  if (!mx) {
    progress.stats.no_mx++;
    progress.completed[domain] = { status: "no_mx", email: "" };
    log(`${domain}: no MX record`);
    return progress.completed[domain];
  }

  // Check catch-all first
  const catchAll = await isCatchAll(domain, mx);
  if (catchAll) {
    // Catch-all: info@ zal altijd "valid" zeggen, maar het adres werkt waarschijnlijk wel
    progress.stats.catch_all++;
    const email = `info@${domain}`;
    progress.completed[domain] = { status: "catch_all", email, mx };
    log(`${domain}: catch-all, assuming info@ works`);
    return progress.completed[domain];
  }

  // Try each prefix
  for (const prefix of PREFIXES) {
    const email = `${prefix}@${domain}`;
    const result = await smtpCheck(mx, email);
    progress.stats.checked++;

    if (result === "valid") {
      progress.stats.found++;
      progress.completed[domain] = { status: "valid", email, mx, prefix };
      log(`${domain}: ✅ ${email} (SMTP valid)`);
      return progress.completed[domain];
    } else if (result === "ratelimit") {
      // Stop voor dit domein, probeer later opnieuw
      log(`${domain}: rate limited at ${prefix}@`);
      break;
    } else if (result === "greylist") {
      // Greylist = possibly valid, accept info@ as likely
      if (prefix === "info") {
        progress.stats.found++;
        progress.completed[domain] = { status: "greylist_likely", email, mx, prefix };
        log(`${domain}: ${email} greylisted (likely valid)`);
        return progress.completed[domain];
      }
    }
    // Small delay between SMTP checks on same server
    await new Promise((r) => setTimeout(r, 200));
  }

  progress.stats.invalid++;
  progress.completed[domain] = { status: "no_valid_prefix", email: "" };
  log(`${domain}: no valid prefix found`);
  return progress.completed[domain];
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  TopTalent Email Guesser");
  console.log("  Genereert info@/contact@ en valideert via SMTP");
  console.log("═══════════════════════════════════════════════════");

  // Read CSV
  const raw = fs.readFileSync(INPUT, "utf-8");
  const rows = parseCsv(raw);
  const header = rows[0].map((h) => h.trim());
  const leads = rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = (r[i] || "").trim(); });
    return obj;
  });

  console.log(`📂 ${leads.length} leads geladen`);

  // Find leads without email but with website
  const targets = [];
  const targetIndices = [];
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (!lead.alle_emails && lead.website) {
      const domain = extractDomain(lead.website);
      if (domain) {
        targets.push({ index: i, domain, lead });
        targetIndices.push(i);
      }
    }
  }

  // Dedupe by domain
  const domainMap = new Map();
  for (const t of targets) {
    if (!domainMap.has(t.domain)) domainMap.set(t.domain, []);
    domainMap.get(t.domain).push(t.index);
  }

  const domains = [...domainMap.keys()];
  console.log(`🎯 ${targets.length} leads zonder email, ${domains.length} unieke domeinen`);
  console.log(`⚡ ${CONCURRENCY}x parallel, prefixes: ${PREFIXES.join(", ")}\n`);

  const progress = loadProgress();
  const alreadyDone = Object.keys(progress.completed).length;
  const remaining = domains.filter((d) => !progress.completed[d]);
  const toProcess = remaining.slice(0, MAX_DOMAINS);

  if (alreadyDone > 0) console.log(`♻️  ${alreadyDone} domeinen al afgerond\n`);
  console.log(`📋 ${toProcess.length} domeinen te verwerken\n`);

  // Process in batches
  const batchSize = CONCURRENCY;
  let processed = 0;
  const startTime = Date.now();

  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);
    await Promise.all(batch.map((d) => processDomain(d, progress)));
    processed += batch.length;

    // Save every batch
    saveProgress(progress);
    saveMxCache();

    if (processed % 50 === 0 || processed === toProcess.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const eta = Math.round((toProcess.length - processed) / rate / 60);
      console.log(
        `📊 ${processed}/${toProcess.length} | ` +
        `✅ ${progress.stats.found} gevonden | ` +
        `🔄 ${progress.stats.catch_all} catch-all | ` +
        `❌ ${progress.stats.no_mx} no-mx | ` +
        `⏱️  ${Math.round(elapsed/60)}m | ETA ${eta}m`
      );
    }
  }

  // Now update the leads
  console.log("\n📝 CSV bijwerken...");
  let updated = 0;
  for (const [domain, indices] of domainMap) {
    const result = progress.completed[domain];
    if (!result || !result.email) continue;

    for (const idx of indices) {
      const lead = leads[idx];
      // Update beste_email en alle_emails
      if (!lead.beste_email) lead.beste_email = result.email;
      if (lead.alle_emails) {
        lead.alle_emails += ", " + result.email;
      } else {
        lead.alle_emails = result.email;
      }
      // Update validation info
      if (!lead.validation_mx_status) lead.validation_mx_status = "valid";
      if (result.status === "catch_all") {
        lead.validation_is_catch_all = "true";
      }
      updated++;
    }
  }

  // Write output
  const outLines = [header.map(csvEscape).join(",")];
  for (const lead of leads) {
    outLines.push(header.map((h) => csvEscape(lead[h] || "")).join(","));
  }
  fs.writeFileSync(OUTPUT, outLines.join("\n"), "utf-8");

  const totalWithEmail = leads.filter((l) => l.alle_emails).length;
  const totalWithout = leads.filter((l) => !l.alle_emails).length;

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  RESULTAAT`);
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`  Gecontroleerd:     ${Object.keys(progress.completed).length} domeinen`);
  console.log(`  SMTP valid:        ${progress.stats.found}`);
  console.log(`  Catch-all:         ${progress.stats.catch_all}`);
  console.log(`  Geen MX:           ${progress.stats.no_mx}`);
  console.log(`  Geen valid prefix: ${progress.stats.invalid}`);
  console.log(`  Leads bijgewerkt:  ${updated}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Totaal MET email:  ${totalWithEmail} (${Math.round(100*totalWithEmail/leads.length)}%)`);
  console.log(`  Totaal ZONDER:     ${totalWithout} (${Math.round(100*totalWithout/leads.length)}%)`);
  console.log(`═══════════════════════════════════════════════════`);
}

main().catch(console.error);
