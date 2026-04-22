/**
 * Lead Enricher — Persoonlijke emails vinden voor TopTalent
 *
 * Leest bestaande leads CSV → verrijkt elke lead → schrijft enriched_leads.csv
 *
 * Stappen per lead:
 *   1. WHOIS / RDAP  — eigenaar naam + privémail uit domeinregistratie
 *   2. Website scrape — eigenaar naam van /over-ons, /team, /contact
 *   3. Email patronen — voornaam@domein, v.achternaam@domein, etc.
 *   4. SMTP verificatie — check welk adres echt bestaat
 *   5. Facebook       — bedrijfspagina zoeken, contactmail ophalen
 *   6. Instagram      — profiel zoeken, email uit bio/meta
 *
 * Gebruik:
 *   node scripts/lead-enricher.js
 *   ENABLE_FACEBOOK=0 node scripts/lead-enricher.js
 *   ENABLE_INSTAGRAM=0 node scripts/lead-enricher.js
 *   MAX_LEADS=50 node scripts/lead-enricher.js
 *   INPUT_CSV=path/to/file.csv node scripts/lead-enricher.js
 */

const fs = require("fs");
const path = require("path");
const net = require("net");
const dns = require("dns");
const { promisify } = require("util");

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const PROJECT_DIR = path.resolve(__dirname, "..");
const TOPTALENT_DIR = path.resolve(PROJECT_DIR, "..");
const DEFAULT_INPUT = path.join(TOPTALENT_DIR, "csv-backup", "leads_with_email.csv");
// Meerdere input bestanden: komma-gescheiden in INPUT_CSV
const INPUT_CSV = process.env.INPUT_CSV || DEFAULT_INPUT;
const OUTPUT_DIR = path.join(PROJECT_DIR, "data", "enriched");
const OUTPUT_CSV = path.join(OUTPUT_DIR, "enriched_leads.csv");

const ENABLE_WHOIS = process.env.ENABLE_WHOIS !== "0";
const ENABLE_WEBSITE = process.env.ENABLE_WEBSITE !== "0";
const ENABLE_SMTP = process.env.ENABLE_SMTP !== "0";
const ENABLE_FACEBOOK = process.env.ENABLE_FACEBOOK !== "0";
const ENABLE_INSTAGRAM = process.env.ENABLE_INSTAGRAM !== "0";
const ENABLE_GOOGLE = process.env.ENABLE_GOOGLE !== "0";
const ENABLE_KVK = process.env.ENABLE_KVK !== "0";
const ENABLE_DNS = process.env.ENABLE_DNS !== "0";
const MAX_LEADS = process.env.MAX_LEADS ? parseInt(process.env.MAX_LEADS, 10) : Infinity;
const CONCURRENCY = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 3;

const AUTOSAVE_EVERY = 10;

const DELAYS = {
  whois: 1500,
  website: 2000,
  smtp: 1000,
  facebook: 3000,
  instagram: 3000,
  google: 3000,
  kvk: 1000,
  dns: 500,
};

const WEBSITE_TIMEOUT = 15000;

// Email blacklist — filter false positives
const EMAIL_BLACKLIST = [
  "noreply@", "no-reply@", "mailer-daemon@", "postmaster@",
  "abuse@", "webmaster@", "root@", "hostmaster@",
  "example.com", "example.nl", "sentry.io", "wixpress.com",
  "wordpress.com", "googleapis.com", "gravatar.com",
  "domein.com", "domain.com", "voorbeeld.nl", "test.com", "test.nl",
  "gebruiker@", "user@domain", "jouw@", "your@", "naam@",
  "yourhosting.nl", "vevida.com", "antagonist.nl", "transip.nl",
  "atention.hosting", "salescare.nl",
  "privacy-protected@", "privacy@", "protected@",
  "hostnet.nl", "registrar-servers.com",
];

// Pagina-paden om te scrapen voor eigenaarsnamen
const OWNER_PATHS = ["/over-ons", "/about", "/about-us", "/team", "/contact", "/ons-team", "/wie-zijn-wij"];

// ---------------------------------------------------------------------------
// NAAM-VALIDATIE (Apollo.io-stijl)
// ---------------------------------------------------------------------------

// Voornamen uit Nederland — inclusief alle achtergronden die je in NL tegenkomt
// Bron: SVB/Meertens Instituut top-namen + veelvoorkomende migratienamen
const DUTCH_FIRST_NAMES = new Set([
  // Nederlandse klassiek
  "jan", "peter", "johan", "hendrik", "willem", "cornelis", "johannes", "pieter",
  "maria", "anna", "johanna", "elisabeth", "hendrikus", "gerrit", "jacobus",
  "adrianus", "martinus", "theodorus", "antonius", "franciscus", "petrus",
  // Nederlands modern man
  "bas", "tom", "max", "sem", "daan", "liam", "noah", "lucas", "finn", "levi",
  "luuk", "mees", "james", "milan", "jesse", "lars", "bram", "hugo", "sven",
  "nick", "rick", "mark", "erik", "rob", "robin", "dennis", "stefan", "marco",
  "jeroen", "bart", "wouter", "joost", "martijn", "niels", "thijs", "ruben",
  "michiel", "frank", "paul", "henk", "kees", "wim", "piet", "dirk",
  "arjan", "marcel", "ronald", "richard", "vincent", "remco", "patrick",
  "david", "tim", "kevin", "mike", "chris", "leon", "jasper", "floris",
  "gijs", "stijn", "pepijn", "maarten", "rutger", "freek", "casper",
  "oscar", "victor", "anton", "ernst", "herman", "albert", "ferdinand",
  "philip", "george", "hans", "otto", "emile", "joep", "guus", "cor",
  "arie", "jaap", "bert", "roel", "joop", "fred", "nico", "cees",
  // Nederlands modern vrouw
  "emma", "julia", "sophie", "lotte", "lisa", "eva", "sanne", "fleur",
  "iris", "sara", "lieke", "noor", "isa", "mila", "tess", "lynn", "roos",
  "anne", "femke", "laura", "kim", "linda", "sandra", "monique", "wendy",
  "nicole", "angela", "marieke", "esther", "judith", "ingrid", "bianca",
  "chantal", "mandy", "miranda", "natasja", "petra", "yvonne", "astrid",
  "heleen", "marloes", "tineke", "annemarie", "caroline", "danielle",
  "marjolein", "renate", "suzanne", "ilse", "els", "anja", "marian",
  "demi", "amber", "britt", "naomi", "merel", "lina", "zoey", "olivia",
  "fenna", "evi", "rosa", "lana", "maud", "vera", "jet", "hanna",
  // Marokkaans / Arabisch (grote groep in NL)
  "mohammed", "mohamed", "mehdi", "youssef", "omar", "ali", "ahmed", "rachid",
  "hassan", "karim", "said", "abdel", "khalid", "hamza", "bilal", "ismail",
  "nabil", "fouad", "redouan", "soufiane", "zakaria", "amin", "anwar", "tariq",
  "mourad", "adil", "driss", "brahim", "mustafa", "samir", "younes", "othmane",
  "fatima", "khadija", "amina", "yasmine", "samira", "nadia", "laila", "soraya",
  "malika", "najat", "hafida", "karima", "soumaya", "imane", "sanaa", "meryem",
  "houda", "asmae", "wafa", "ikram", "chaima", "zineb", "loubna", "hayat",
  // Turks (tweede grote groep)
  "mehmet", "mustafa", "ali", "ahmet", "hasan", "ibrahim", "ismail", "osman",
  "yusuf", "murat", "emre", "burak", "serkan", "cem", "deniz", "umut", "baris",
  "fatma", "ayse", "emine", "hatice", "zeynep", "elif", "sultan", "merve",
  "esra", "tugba", "derya", "ozlem", "dilek", "sevgi", "gul", "nurcan",
  // Surinaams / Antilliaans
  "sherwin", "jermaine", "glenn", "ryan", "brian", "kevin", "kenny", "randy",
  "franklin", "gregory", "melvin", "marvin", "clifton", "wendell", "clarence",
  "sharina", "natysha", "sharona", "jaleesa", "shaniqua", "priscilla",
  "rajesh", "anil", "sunil", "ravi", "ashwin", "sanjay", "deepak", "vijay",
  "sunita", "anita", "reshma", "kavita", "maya", "indra", "radha", "sita",
  // Indonesisch
  "rio", "budi", "agus", "eko", "wawan", "dewi", "sri", "rina", "sari",
  // Pools (grote expat groep)
  "piotr", "adam", "marek", "tomasz", "marcin", "michal", "pawel", "lukasz",
  "krzysztof", "grzegorz", "andrzej", "jan", "jakub", "mateusz", "kamil",
  "anna", "maria", "katarzyna", "agnieszka", "malgorzata", "monika", "joanna",
  "dorota", "magdalena", "ewa", "aleksandra", "barbara", "beata", "karolina",
  // Duits (grensregio)
  "hans", "kurt", "fritz", "karl", "ludwig", "werner", "horst", "dieter",
  "klaus", "manfred", "andreas", "wolfgang", "jürgen", "stefan", "matthias",
  "sabine", "monika", "ursula", "petra", "helga", "christine", "silke",
  // Italiaans (horeca)
  "giuseppe", "giovanni", "antonio", "marco", "francesco", "luca", "andrea",
  "alessandro", "roberto", "stefano", "paolo", "carlo", "mario", "matteo",
  "angelo", "salvatore", "vincenzo", "domenico", "raffaele", "enrico",
  "maria", "giulia", "francesca", "chiara", "sara", "valentina", "anna",
  "alessandra", "elena", "silvia", "paola", "federica", "nadia", "simona",
  // Internationaal / algemeen
  "alexander", "thomas", "michael", "daniel", "robert", "simon", "joris",
  "william", "james", "john", "charles", "henry", "edward", "benjamin",
  "jack", "sam", "jake", "oliver", "harry", "charlie", "joseph", "leo",
  "sophia", "isabella", "charlotte", "emily", "grace", "alice", "lily",
  "carlos", "miguel", "jose", "juan", "pedro", "luis", "fernando", "rafael",
  "chen", "wei", "li", "wang", "zhang", "liu", "yang", "ming",
  "sato", "tanaka", "suzuki", "takahashi", "watanabe", "yamamoto",
  // Oost-Europees
  "ivan", "vladimir", "sergei", "nikolai", "dmitri", "andrei", "alexei",
  "natasha", "olga", "svetlana", "tatiana", "elena", "irina", "marina",
  // Grieks
  "nikos", "giorgos", "dimitris", "kostas", "yannis", "stavros", "petros",
  // Scandinavisch
  "erik", "lars", "anders", "magnus", "olaf", "bjorn", "gunnar", "sven",
  "ingrid", "sigrid", "astrid", "freya", "helga", "solveig", "kirsten",
  // Extra veelvoorkomend in NL horeca
  "chef", // niet een naam maar voorkomt vaak — wordt gefilterd door andere checks
  "federico", "giovanni", "pierre", "jean", "jacques", "philippe", "alain",
  "dimitri", "nikolaos", "spiros", "christos", "ling", "xin", "jin", "yuki",
]);

// Bedrijfs-indicatoren — als een "naam" deze bevat, is het GEEN persoon
const COMPANY_INDICATORS = [
  // Rechtsvorm
  /\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|c\.?v\.?|stichting|holding|groep|group)\b/i,
  // Generieke bedrijfswoorden
  /\b(restaurant|café|cafe|bar|hotel|hostel|bistro|pizzeria|trattoria|brasserie)\b/i,
  /\b(studio|agency|creative|digital|design|media|solutions|services|consulting)\b/i,
  /\b(brothers|sisters|zonen|&|and|en)\b/i,
  /\b(nederland|netherlands|international|global|europe)\b/i,
  /\b(support|hosting|domains?|domeinen|webdesign|websites?)\b/i,
  /\b(catering|events?|management|logistics|transport)\b/i,
  /\b(food|drinks|kitchen|keuken|eten|bakery|bakkerij)\b/i,
  // Generieke organisatie-woorden
  /\b(foundation|company|corporation|enterprises?|industries?)\b/i,
  /\b(team|organisatie|organization|platform|systeem|system)\b/i,
];

// Technische/hosting partijen die vaak in WHOIS staan
const HOSTING_COMPANIES = [
  "transip", "antagonist", "hostnet", "strato", "godaddy", "namecheap",
  "cloudflare", "registrar", "realtime register", "key-systems",
  "bttr", "metaregistrar", "openprovider", "yourhosting", "vevida",
  "socialbrothers", "webnl", "byte", "true", "leaseweb",
];

/**
 * Valideert of een string een persoonsnaam is (niet een bedrijfsnaam).
 * Apollo.io-stijl: cross-check tegen voornamenlijst + bedrijfspatronen.
 *
 * Returns: { valid: boolean, confidence: "high"|"medium"|"low", reason: string }
 */
function validatePersonName(name) {
  if (!name || name.length < 3) {
    return { valid: false, confidence: "high", reason: "te kort" };
  }

  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // Check 1: Bevat bedrijfsindicatoren?
  for (const re of COMPANY_INDICATORS) {
    if (re.test(trimmed)) {
      return { valid: false, confidence: "high", reason: `bedrijfsindicator: ${re}` };
    }
  }

  // Check 2: Is het een bekende hosting/webbureau partij?
  for (const host of HOSTING_COMPANIES) {
    if (lower.includes(host)) {
      return { valid: false, confidence: "high", reason: `hosting/webbureau: ${host}` };
    }
  }

  // Check 3: Bevat cijfers of speciale tekens (persoonsnamen hebben die niet)
  if (/\d/.test(trimmed) || /[!@#$%^&*()_+=\[\]{};':"\\|<>/?]/.test(trimmed)) {
    return { valid: false, confidence: "high", reason: "bevat cijfers/speciale tekens" };
  }

  // Check 4: Is het maar 1 woord? Persoonsnamen hebben min. 2 delen
  const parts = trimmed.split(/\s+/);
  const significantParts = parts.filter(
    (p) => !["van", "de", "den", "der", "het", "te", "ten", "ter", "el", "al"].includes(p.toLowerCase())
  );
  if (significantParts.length < 2) {
    return { valid: false, confidence: "medium", reason: "maar 1 woord (geen voor+achternaam)" };
  }

  // Check 5: Begint de voornaam met een hoofdletter + is het een bekende voornaam?
  const firstName = significantParts[0].toLowerCase();
  const hasKnownFirstName = DUTCH_FIRST_NAMES.has(firstName);

  // Check 6: Achternaam begint met hoofdletter
  const lastName = significantParts[significantParts.length - 1];
  const lastNameCapitalized = /^[A-Z]/.test(lastName);

  // Check 7: Geen extreem lange "naam" (waarschijnlijk een zin)
  if (trimmed.length > 40) {
    return { valid: false, confidence: "medium", reason: "te lang voor een naam" };
  }

  // Check 8: Alle woorden beginnen met hoofdletter (typisch voor namen)
  const allCapitalized = parts.every(
    (p) => /^[A-Z]/.test(p) || ["van", "de", "den", "der", "het", "te", "ten", "ter", "el", "al"].includes(p.toLowerCase())
  );

  // Scoor het resultaat
  if (hasKnownFirstName && lastNameCapitalized) {
    return { valid: true, confidence: "high", reason: "bekende voornaam + achternaam" };
  }
  if (hasKnownFirstName) {
    return { valid: true, confidence: "medium", reason: "bekende voornaam" };
  }
  // Geen "low confidence" gokken meer — alleen namen uit data accepteren
  // Als de voornaam niet in onze lijst staat, is het waarschijnlijk geen persoon
  // (tenzij het uit een betrouwbare structured-data bron komt, dan wordt
  //  de priority-score in selectBestName hoog genoeg ondanks lage confidence)
  if (allCapitalized && significantParts.length >= 2 && lastNameCapitalized && trimmed.length < 30) {
    // Nog steeds "low" — wordt alleen geaccepteerd als de bron betrouwbaar is
    // (json-ld, meta:author, team-pagina met functietitel)
    return { valid: true, confidence: "low", reason: "structuur klopt maar voornaam onbekend" };
  }

  return { valid: false, confidence: "low", reason: "geen bekende voornaam gevonden" };
}

// ---------------------------------------------------------------------------
// CSV HEADER
// ---------------------------------------------------------------------------

const INPUT_FIELDS = [
  "bedrijfsnaam", "website", "branche", "aantal_medewerkers", "locatie",
  "voornaam", "achternaam", "functie", "email", "telefoon", "linkedin_url",
  "status", "campaign_id", "email_sent_at", "opened", "clicked", "replied",
  "reply_text", "reply_at", "pain_points", "personalisatie_note",
  "instantly_lead_id", "last_contacted", "follow_up_count",
];

const ENRICHED_FIELDS = [
  "domein", "eigenaar_naam", "whois_email", "email_patronen",
  "geverifieerd_email", "facebook_url", "facebook_email",
  "instagram_url", "instagram_email", "enrichment_status", "enrichment_datum",
];

const OUTPUT_FIELDS = [
  // Doorgesluisde originele velden (hernoemd)
  "naam", "website", "email_origineel", "adres", "stad", "telefoon",
  "kvk_nummer", "bron", "branche", "voornaam", "achternaam", "functie",
  // Nieuwe verrijkte velden
  ...ENRICHED_FIELDS,
];

const OUTPUT_HEADER = OUTPUT_FIELDS.join(",");

// ---------------------------------------------------------------------------
// CSV HELPERS (zelfde stijl als maps-scraper / kvk-scraper)
// ---------------------------------------------------------------------------

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
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rowToCsv(obj, fields) {
  return fields.map((f) => csvEscape(obj[f])).join(",");
}

// ---------------------------------------------------------------------------
// FILE I/O
// ---------------------------------------------------------------------------

/**
 * Parseert een volledige CSV string inclusief multiline velden (newlines in quotes).
 * Retourneert array van rij-arrays.
 */
function parseCsvFull(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(cur.trim());
      cur = "";
    } else if (ch === "\n" && !inQuotes) {
      row.push(cur.trim());
      if (row.some((c) => c)) rows.push(row); // skip lege rijen
      row = [];
      cur = "";
    } else if (ch === "\r") {
      // skip \r
    } else {
      cur += ch;
    }
  }
  // Laatste rij
  row.push(cur.trim());
  if (row.some((c) => c)) rows.push(row);

  return rows;
}

function loadInputLeads() {
  // Ondersteun meerdere input bestanden (komma-gescheiden)
  const inputFiles = INPUT_CSV.split(",").map((f) => f.trim()).filter(Boolean);
  const allLeads = [];
  const seen = new Map(); // deduplicatie

  for (const csvPath of inputFiles) {
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Input bestand niet gevonden: ${csvPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(csvPath, "utf-8");
    if (raw.trim().length < 10) {
      console.error(`❌ Input CSV is leeg: ${csvPath}`);
      continue;
    }

    const rows = parseCsvFull(raw);
    if (rows.length < 2) {
      console.error(`❌ Geen data-rijen in: ${csvPath}`);
      continue;
    }

    const header = rows[0].map((h) => h.toLowerCase().trim());
    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const vals = rows[i];
      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = vals[idx] || "";
      });

      // Sla bron op per lead
      obj._bron = path.basename(csvPath, ".csv");

      // Ontdubbelen op bedrijfsnaam + website
      const key = dedupeKey(obj);
      if (!seen.has(key)) {
        seen.set(key, true);
        allLeads.push(obj);
        count++;
      }
    }
    console.log(`📂 ${csvPath.split("/").pop()}: ${rows.length - 1} leads geladen, ${count} uniek`);
  }

  const dupes = inputFiles.length > 1
    ? ` (${seen.size} uniek na ontdubbeling)`
    : "";
  console.log(`📊 Totaal: ${allLeads.length} leads${dupes}`);
  return allLeads;
}

function loadExistingOutput() {
  if (!fs.existsSync(OUTPUT_CSV)) return new Map();
  const raw = fs.readFileSync(OUTPUT_CSV, "utf-8");
  if (raw.trim().length < 10) return new Map();

  const rows = parseCsvFull(raw);
  if (rows.length < 2) return new Map();

  const header = rows[0];
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const vals = rows[i];
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = vals[idx] || "";
    });
    const key = dedupeKey(obj);
    map.set(key, obj);
  }
  console.log(`♻️  ${map.size} al verrijkte leads geladen (worden overgeslagen)`);
  return map;
}

function saveOutput(results) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const lines = [OUTPUT_HEADER];
  for (const row of results.values()) {
    lines.push(rowToCsv(row, OUTPUT_FIELDS));
  }
  fs.writeFileSync(OUTPUT_CSV, lines.join("\n") + "\n", "utf-8");
}

function dedupeKey(obj) {
  const naam = (obj.naam || obj.bedrijfsnaam || obj.bedrijf_naam || obj.name || "").toLowerCase().trim();
  const website = (obj.website || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "").trim();
  return `${naam}__${website}`;
}

// ---------------------------------------------------------------------------
// UTILITY
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function extractDomain(url) {
  if (!url) return "";
  try {
    let u = url.trim();
    if (!u.startsWith("http")) u = "https://" + u;
    const hostname = new URL(u).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return "";
  }
}

function extractCity(locatie) {
  if (!locatie) return "";
  // Format: "Straat 123, 1234 AB Stad, Nederland"
  const parts = locatie.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    // Stad zit meestal in het deel met postcode
    const cityPart = parts[parts.length - 2] || parts[parts.length - 1];
    const match = cityPart.match(/\d{4}\s*[A-Z]{2}\s+(.+)/);
    if (match) return match[1].trim();
    // Als geen postcode patroon, geef het deel terug
    if (!cityPart.match(/^\d/) && cityPart !== "Nederland") return cityPart;
  }
  return "";
}

function isBlacklisted(email) {
  const lower = email.toLowerCase();
  return EMAIL_BLACKLIST.some((b) => lower.includes(b));
}

function extractEmails(text) {
  // Eerst URL-decoding toepassen voor %20 en andere encoded chars
  let cleanText = text;
  try { cleanText = decodeURIComponent(text); } catch {}
  // Remove HTML unicode escapes (u003e = >, u003c = <)
  cleanText = cleanText.replace(/u003[a-f0-9]/gi, "");

  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = cleanText.match(re) || [];
  return [...new Set(matches)]
    .map((e) => e.toLowerCase().replace(/^[^a-z0-9]+/, "").trim())
    .filter((e) => !isBlacklisted(e))
    .filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg"))
    .filter((e) => !e.startsWith("%") && !e.includes("%20")); // Geen URL-encoded troep
}

// ---------------------------------------------------------------------------
// STEP 1: WHOIS / RDAP
// ---------------------------------------------------------------------------

async function whoisLookup(domain) {
  if (!domain) return { eigenaar: "", email: "" };

  // Probeer RDAP eerst (JSON, makkelijker te parsen)
  try {
    const rdapResult = await rdapLookup(domain);
    if (rdapResult.eigenaar || rdapResult.email) return rdapResult;
  } catch {}

  // Fallback: klassieke WHOIS via TCP port 43
  try {
    return await classicWhois(domain);
  } catch {}

  return { eigenaar: "", email: "" };
}

async function rdapLookup(domain) {
  // RDAP bootstrap: zoek de juiste RDAP server
  const res = await fetchWithTimeout(`https://rdap.org/domain/${domain}`, 10000);
  if (!res.ok) return { eigenaar: "", email: "" };

  const data = await res.json();
  let eigenaar = "";
  let email = "";

  // Zoek in entities naar registrant
  if (data.entities) {
    for (const entity of data.entities) {
      const roles = entity.roles || [];
      if (roles.includes("registrant") || roles.includes("administrative")) {
        // vCard info
        if (entity.vcardArray && entity.vcardArray[1]) {
          for (const field of entity.vcardArray[1]) {
            if (field[0] === "fn") eigenaar = eigenaar || field[3];
            if (field[0] === "email") email = email || field[3];
          }
        }
        // Nested entities
        if (entity.entities) {
          for (const sub of entity.entities) {
            if (sub.vcardArray && sub.vcardArray[1]) {
              for (const field of sub.vcardArray[1]) {
                if (field[0] === "fn") eigenaar = eigenaar || field[3];
                if (field[0] === "email") email = email || field[3];
              }
            }
          }
        }
      }
    }
  }

  // Filter generieke namen eruit
  if (eigenaar && /^(privacy|redacted|whois|domain|registr)/i.test(eigenaar)) {
    eigenaar = "";
  }
  // Valideer met persoonsnaam-checker (streng: alleen high/medium confidence)
  if (eigenaar) {
    const validation = validatePersonName(eigenaar);
    if (!validation.valid || validation.confidence === "low") eigenaar = "";
  }
  if (email && isBlacklisted(email)) email = "";

  return { eigenaar, email };
}

async function classicWhois(domain) {
  // Bepaal WHOIS server op basis van TLD
  const tld = domain.split(".").pop();
  const servers = {
    nl: "whois.domain-registry.nl",
    com: "whois.verisign-grs.com",
    net: "whois.verisign-grs.com",
    org: "whois.pir.org",
    eu: "whois.eu",
  };
  const server = servers[tld] || `whois.nic.${tld}`;

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let data = "";
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("WHOIS timeout"));
    }, 10000);

    client.connect(43, server, () => {
      client.write(domain + "\r\n");
    });
    client.on("data", (chunk) => {
      data += chunk.toString();
    });
    client.on("end", () => {
      clearTimeout(timeout);
      const eigenaar = extractWhoisField(data, [
        "Registrant Name", "Tech Name", "Admin Name", "Registrant",
      ]);
      const email = extractWhoisField(data, [
        "Registrant Email", "Tech Email", "Admin Email",
      ]);
      let cleanEigenaar = eigenaar && !/privacy|redacted|whois/i.test(eigenaar) ? eigenaar : "";
      if (cleanEigenaar) {
        const validation = validatePersonName(cleanEigenaar);
        if (!validation.valid || validation.confidence === "low") cleanEigenaar = "";
      }
      resolve({
        eigenaar: cleanEigenaar,
        email: email && !isBlacklisted(email) ? email : "",
      });
    });
    client.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function extractWhoisField(text, fieldNames) {
  for (const name of fieldNames) {
    const re = new RegExp(`${name}\\s*:\\s*(.+)`, "i");
    const m = text.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return "";
}

async function fetchWithTimeout(url, timeout = 10000, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// STEP 2: WEBSITE SCRAPE — eigenaar naam zoeken
// ---------------------------------------------------------------------------

async function scrapeWebsiteForOwner(browser, websiteUrl, domain) {
  if (!websiteUrl || !domain) return { eigenaar: "", emails: [], confidence: "" };

  let eigenaar = "";
  let nameConfidence = "";
  const allEmails = [];
  const candidateNames = []; // Verzamel alle kandidaten, kies de beste

  for (const pagePath of OWNER_PATHS) {
    try {
      const url = websiteUrl.replace(/\/$/, "") + pagePath;
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: WEBSITE_TIMEOUT });

        // Check of pagina echt bestaat (niet een 404 pagina)
        const content = await page.content();
        if (content.includes("404") && content.length < 5000) continue;

        const text = await page.evaluate(() => document.body?.innerText || "");

        // Emails extraheren
        const emails = extractEmails(content);
        allEmails.push(...emails);

        // --- BRON 1: Structured data (JSON-LD, schema.org) ---
        const structuredNames = await extractStructuredData(page);
        candidateNames.push(...structuredNames);

        // --- BRON 2: Meta tags (og:site_name is vaak bedrijf, author is persoon) ---
        const metaNames = await extractMetaNames(page);
        candidateNames.push(...metaNames);

        // --- BRON 3: Tekst-patronen (eigenaar:, oprichter:, etc.) ---
        const textNames = extractOwnerFromText(text);
        candidateNames.push(...textNames);

        // --- BRON 4: Team-pagina profielen ---
        const teamNames = await extractTeamProfiles(page);
        candidateNames.push(...teamNames);

      } finally {
        await page.close();
      }
    } catch {
      // Pagina bestaat niet of timeout, ga door
    }
    await sleep(rand(500, 1000));
  }

  // Kies de beste kandidaat (hoogste confidence + persoonsnaam-validatie)
  const bestName = selectBestName(candidateNames);
  if (bestName) {
    eigenaar = bestName.name;
    nameConfidence = bestName.confidence;
  }

  return {
    eigenaar,
    confidence: nameConfidence,
    emails: [...new Set(allEmails)].filter((e) => !isBlacklisted(e)),
  };
}

/**
 * Extraheert namen uit JSON-LD structured data (schema.org).
 * Dit is de meest betrouwbare bron — websites markeren expliciet wie de eigenaar/founder is.
 */
async function extractStructuredData(page) {
  const names = [];
  try {
    const jsonLdScripts = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      return Array.from(scripts).map((s) => s.textContent).filter(Boolean);
    });

    for (const raw of jsonLdScripts) {
      try {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          // Person type direct
          if (item["@type"] === "Person" && item.name) {
            names.push({ name: item.name, source: "json-ld:Person", priority: 10 });
          }
          // Organization met founder/owner
          if (item.founder) {
            const founders = Array.isArray(item.founder) ? item.founder : [item.founder];
            for (const f of founders) {
              const n = typeof f === "string" ? f : f.name;
              if (n) names.push({ name: n, source: "json-ld:founder", priority: 9 });
            }
          }
          if (item.employee) {
            const employees = Array.isArray(item.employee) ? item.employee : [item.employee];
            for (const e of employees) {
              if (e.name && e.jobTitle && /eigenaar|owner|ceo|directeur|director|founder|oprichter/i.test(e.jobTitle)) {
                names.push({ name: e.name, source: `json-ld:employee(${e.jobTitle})`, priority: 9 });
              }
            }
          }
          // Author
          if (item.author) {
            const authors = Array.isArray(item.author) ? item.author : [item.author];
            for (const a of authors) {
              const n = typeof a === "string" ? a : a.name;
              if (n) names.push({ name: n, source: "json-ld:author", priority: 5 });
            }
          }
        }
      } catch {}
    }
  } catch {}
  return names;
}

/**
 * Extraheert namen uit meta tags (author, og:*, etc.)
 */
async function extractMetaNames(page) {
  const names = [];
  try {
    const metas = await page.evaluate(() => {
      const result = {};
      const tags = document.querySelectorAll("meta[name], meta[property]");
      for (const tag of tags) {
        const key = tag.getAttribute("name") || tag.getAttribute("property") || "";
        const val = tag.getAttribute("content") || "";
        if (val) result[key.toLowerCase()] = val;
      }
      return result;
    });

    if (metas.author) {
      names.push({ name: metas.author, source: "meta:author", priority: 6 });
    }
    if (metas["article:author"]) {
      names.push({ name: metas["article:author"], source: "meta:article:author", priority: 5 });
    }
  } catch {}
  return names;
}

/**
 * Extraheert namen uit platte tekst via patronen.
 * Veel uitgebreider dan de oude versie — meer triggers + betere naam-capture.
 */
function extractOwnerFromText(text) {
  const names = [];

  // Hoge prioriteit: expliciet eigenaar/oprichter/CEO label
  const highPriorityPatterns = [
    // "Eigenaar: Jan de Vries" of "Eigenaar - Jan de Vries"
    /(?:eigenaar|owner|oprichter|founder|ceo|directeur|director|zaakvoerder|bedrijfsleider|general\s*manager)\s*[:\-–|]\s*([A-Z][a-zéèêëïüö]+(?:\s+(?:van|de|den|der|het|te|ten|ter|el|al)\s+)?[A-Z][a-zéèêëïüö]+(?:\s+[A-Za-zéèêëïüö]+)*)/gim,
    // "Opgericht door Jan de Vries"
    /(?:opgericht|founded|gestart|started)\s+(?:door|by|in\s+\d{4}\s+door)\s+([A-Z][a-zéèêëïüö]+(?:\s+(?:van|de|den|der|het|te|ten|ter|el|al)\s+)?[A-Z][a-zéèêëïüö]+(?:\s+[A-Za-zéèêëïüö]+)*)/gim,
  ];

  for (const re of highPriorityPatterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[1]) names.push({ name: m[1].trim(), source: "text:high", priority: 8 });
    }
  }

  // Medium prioriteit: "Ik ben Jan" / "Mijn naam is Jan de Vries"
  const mediumPatterns = [
    /(?:mijn naam is|ik ben|i am|my name is)\s+([A-Z][a-zéèêëïüö]+(?:\s+(?:van|de|den|der|het|te|ten|ter|el|al)\s+)?[A-Z][a-zéèêëïüö]+(?:\s+[A-Za-zéèêëïüö]+)*)/gim,
    // "Jan de Vries, eigenaar"
    /([A-Z][a-zéèêëïüö]+(?:\s+(?:van|de|den|der|het|te|ten|ter|el|al)\s+)?[A-Z][a-zéèêëïüö]+)\s*[,\-–|]\s*(?:eigenaar|owner|oprichter|founder|ceo|directeur|director)/gim,
  ];

  for (const re of mediumPatterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[1]) names.push({ name: m[1].trim(), source: "text:medium", priority: 6 });
    }
  }

  return names;
}

/**
 * Extraheert namen van team-pagina's (profielen met foto + naam + functie).
 * Zoekt specifiek naar de eigenaar/CEO/directeur.
 */
async function extractTeamProfiles(page) {
  const names = [];
  try {
    const profiles = await page.evaluate(() => {
      const results = [];

      // Zoek elementen die lijken op teamleden
      // Typisch: een container met naam (h2/h3/strong) + functie (p/span)
      const containers = document.querySelectorAll(
        '[class*="team"], [class*="member"], [class*="staff"], [class*="people"], [class*="about"]'
      );

      for (const container of containers) {
        const headings = container.querySelectorAll("h2, h3, h4, strong, [class*='name']");
        const subtexts = container.querySelectorAll("p, span, [class*='role'], [class*='function'], [class*='title'], [class*='job']");

        for (const heading of headings) {
          const name = heading.textContent?.trim();
          if (!name || name.length < 4 || name.length > 40) continue;

          // Zoek bijbehorende functie
          let functie = "";
          for (const sub of subtexts) {
            const t = sub.textContent?.trim().toLowerCase();
            if (t && (
              t.includes("eigenaar") || t.includes("owner") ||
              t.includes("oprichter") || t.includes("founder") ||
              t.includes("ceo") || t.includes("directeur") ||
              t.includes("director") || t.includes("manager")
            )) {
              functie = t;
              break;
            }
          }

          if (functie) {
            results.push({ name, functie });
          }
        }
      }
      return results;
    });

    for (const { name, functie } of profiles) {
      names.push({ name, source: `team:${functie}`, priority: 9 });
    }
  } catch {}
  return names;
}

/**
 * Selecteert de beste naam-kandidaat.
 * Apollo-stijl: hoogste prioriteit × naam-validatie = winnaar.
 *
 * Regel: "low" confidence namen worden ALLEEN geaccepteerd als ze uit een
 * betrouwbare bron komen (priority >= 8 = json-ld, team-profiel, expliciet label).
 * Dit voorkomt dat random woorden als naam worden opgeslagen.
 */
function selectBestName(candidates) {
  if (!candidates.length) return null;

  // Valideer elke kandidaat en sorteer
  const scored = candidates
    .map((c) => {
      const validation = validatePersonName(c.name);
      let score = c.priority;

      // Bonus voor gevalideerde persoonsnaam
      if (validation.valid && validation.confidence === "high") score += 5;
      else if (validation.valid && validation.confidence === "medium") score += 3;
      else if (validation.valid && validation.confidence === "low") score += 1;
      else score -= 10; // Niet-valide naam → sterk afstraffen

      return { ...c, score, validation };
    })
    .filter((c) => {
      if (!c.validation.valid) return false;
      // Low confidence alleen accepteren uit betrouwbare bronnen
      if (c.validation.confidence === "low" && c.priority < 8) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  const best = scored[0];
  return {
    name: best.name,
    confidence: best.validation.confidence,
    source: best.source,
    score: best.score,
  };
}

// ---------------------------------------------------------------------------
// STEP 3: EMAIL PATRONEN GENEREREN
// ---------------------------------------------------------------------------

function generateEmailPatterns(eigenaarNaam, domain) {
  if (!eigenaarNaam || !domain) return [];

  // Splits naam in delen
  const parts = eigenaarNaam
    .toLowerCase()
    .replace(/[^a-z\s\-]/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 1);

  if (parts.length < 2) return [];

  // Filter tussenvoegsels voor email maar bewaar voor combinaties
  const tussenvoegsels = ["van", "de", "den", "der", "het", "te", "ten", "ter"];
  const significantParts = parts.filter((p) => !tussenvoegsels.includes(p));
  if (significantParts.length < 2) {
    // Alleen voornaam + tussenvoegsel, geen achternaam
    if (parts.length >= 1) {
      return [`${parts[0]}@${domain}`];
    }
    return [];
  }

  const voornaam = significantParts[0];
  const achternaam = significantParts[significantParts.length - 1];
  const initiaal = voornaam[0];

  // Alle tussenvoegsels die tussen voornaam en achternaam staan
  const volleAchternaam = parts.slice(parts.indexOf(voornaam) + 1).join("");

  const patterns = [
    `${voornaam}@${domain}`,
    `${voornaam}.${achternaam}@${domain}`,
    `${initiaal}.${achternaam}@${domain}`,
    `${voornaam}${achternaam}@${domain}`,
    `${initiaal}${achternaam}@${domain}`,
    `${achternaam}@${domain}`,
    `${voornaam}.${volleAchternaam}@${domain}`,
    `${initiaal}.${volleAchternaam}@${domain}`,
  ];

  // Dedup
  return [...new Set(patterns)];
}

// ---------------------------------------------------------------------------
// STEP 4: SMTP VERIFICATIE
// ---------------------------------------------------------------------------

async function verifyEmails(emails, domain) {
  if (!emails.length || !domain) return { verified: "", catchAll: false };

  // Eerst MX records opzoeken
  let mxHost;
  try {
    const mx = await resolveMx(domain);
    if (!mx || !mx.length) return { verified: "", catchAll: false };
    mx.sort((a, b) => a.priority - b.priority);
    mxHost = mx[0].exchange;
  } catch {
    return { verified: "", catchAll: false };
  }

  // Catch-all detectie: test met random adres
  const randomAddr = `test${Date.now()}xyz@${domain}`;
  const catchAllResult = await smtpVerify(mxHost, randomAddr, domain);
  if (catchAllResult === true) {
    // Catch-all server — alles wordt geaccepteerd, niet betrouwbaar
    return { verified: "", catchAll: true };
  }
  if (catchAllResult === "error") {
    // SMTP connectie mislukt (port 25 geblokkeerd?)
    return { verified: "", catchAll: false };
  }

  // Test elke email
  for (const email of emails) {
    const result = await smtpVerify(mxHost, email, domain);
    if (result === true) {
      return { verified: email, catchAll: false };
    }
    await sleep(rand(300, 600));
  }

  return { verified: "", catchAll: false };
}

async function smtpVerify(mxHost, email, domain) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let step = 0;
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.destroy();
        resolve("error");
      }
    }, 10000);

    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        client.destroy();
        resolve(result);
      }
    };

    client.connect(25, mxHost, () => {
      // Wacht op greeting
    });

    let buffer = "";
    client.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");

      for (const line of lines) {
        if (!line || line.length < 3) continue;
        const code = parseInt(line.substring(0, 3), 10);

        if (step === 0 && code === 220) {
          step = 1;
          client.write(`EHLO ${domain}\r\n`);
          buffer = "";
        } else if (step === 1 && code === 250) {
          step = 2;
          client.write(`MAIL FROM:<verify@${domain}>\r\n`);
          buffer = "";
        } else if (step === 2 && code === 250) {
          step = 3;
          client.write(`RCPT TO:<${email}>\r\n`);
          buffer = "";
        } else if (step === 3) {
          client.write("QUIT\r\n");
          if (code === 250) {
            finish(true);  // Email exists
          } else if (code === 550 || code === 551 || code === 553) {
            finish(false); // Email doesn't exist
          } else {
            finish("error");
          }
        }
      }
    });

    client.on("error", () => finish("error"));
    client.on("close", () => finish("error"));
  });
}

// ---------------------------------------------------------------------------
// STEP 5: FACEBOOK
// ---------------------------------------------------------------------------

async function findFacebook(browser, bedrijfsnaam, domain) {
  if (!bedrijfsnaam) return { url: "", email: "" };

  try {
    const page = await browser.newPage();
    try {
      const query = `${bedrijfsnaam} site:facebook.com`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=nl`;

      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await sleep(rand(1000, 2000));

      // CAPTCHA check
      const hasCaptcha = await detectGoogleCaptcha(page);
      if (hasCaptcha) {
        console.log("  ⚠️  Google CAPTCHA bij Facebook zoeken — handmatig oplossen...");
        await waitForEnter();
        await sleep(2000);
      }

      // Eerste Facebook link uit zoekresultaten
      const fbLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a[href*='facebook.com']"));
        for (const link of links) {
          const href = link.href;
          if (href.includes("facebook.com/") && !href.includes("login") && !href.includes("help")) {
            return href;
          }
        }
        return "";
      });

      if (!fbLink) return { url: "", email: "" };

      // Extract email uit Google snippet (vermijdt login-wall)
      const snippetText = await page.evaluate(() => document.body?.innerText || "");
      const emails = extractEmails(snippetText).filter((e) => {
        const d = e.split("@")[1];
        return d !== "facebook.com" && d !== "fb.com";
      });

      // Probeer de FB pagina te bezoeken voor meer info
      let fbEmail = emails[0] || "";
      try {
        await page.goto(fbLink, { waitUntil: "domcontentloaded", timeout: 12000 });
        await sleep(rand(1000, 2000));
        const fbContent = await page.content();
        const moreEmails = extractEmails(fbContent).filter((e) => {
          const d = e.split("@")[1];
          return d !== "facebook.com" && d !== "fb.com";
        });
        if (!fbEmail && moreEmails.length) fbEmail = moreEmails[0];
      } catch {}

      return { url: cleanFbUrl(fbLink), email: fbEmail };
    } finally {
      await page.close();
    }
  } catch {
    return { url: "", email: "" };
  }
}

function cleanFbUrl(url) {
  try {
    // Verwijder Google redirect wrapper
    if (url.includes("google.com/url")) {
      const u = new URL(url);
      return u.searchParams.get("q") || u.searchParams.get("url") || url;
    }
    // Strip tracking params
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// STEP 6: INSTAGRAM
// ---------------------------------------------------------------------------

async function findInstagram(browser, bedrijfsnaam, domain) {
  if (!bedrijfsnaam) return { url: "", email: "" };

  try {
    const page = await browser.newPage();
    try {
      const query = `${bedrijfsnaam} site:instagram.com`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=nl`;

      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await sleep(rand(1000, 2000));

      const hasCaptcha = await detectGoogleCaptcha(page);
      if (hasCaptcha) {
        console.log("  ⚠️  Google CAPTCHA bij Instagram zoeken — handmatig oplossen...");
        await waitForEnter();
        await sleep(2000);
      }

      // Eerste Instagram link
      const igLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a[href*='instagram.com']"));
        for (const link of links) {
          const href = link.href;
          if (href.includes("instagram.com/") && !href.includes("login") && !href.includes("accounts")) {
            return href;
          }
        }
        return "";
      });

      if (!igLink) return { url: "", email: "" };

      // Email uit Google snippet
      const snippetText = await page.evaluate(() => document.body?.innerText || "");
      const emails = extractEmails(snippetText).filter((e) => {
        const d = e.split("@")[1];
        return d !== "instagram.com";
      });

      // Probeer IG pagina
      let igEmail = emails[0] || "";
      try {
        await page.goto(igLink, { waitUntil: "domcontentloaded", timeout: 12000 });
        await sleep(rand(1000, 2000));
        const igContent = await page.content();
        const moreEmails = extractEmails(igContent).filter((e) => {
          const d = e.split("@")[1];
          return d !== "instagram.com";
        });
        if (!igEmail && moreEmails.length) igEmail = moreEmails[0];

        // Probeer email uit JSON-LD meta data
        if (!igEmail) {
          const jsonLd = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            return Array.from(scripts).map((s) => s.textContent);
          });
          for (const json of jsonLd) {
            try {
              const parsed = JSON.parse(json);
              if (parsed.email) {
                igEmail = parsed.email;
                break;
              }
            } catch {}
          }
        }
      } catch {}

      return { url: cleanIgUrl(igLink), email: igEmail };
    } finally {
      await page.close();
    }
  } catch {
    return { url: "", email: "" };
  }
}

function cleanIgUrl(url) {
  try {
    if (url.includes("google.com/url")) {
      const u = new URL(url);
      return u.searchParams.get("q") || u.searchParams.get("url") || url;
    }
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// STEP 7: GOOGLE DORKING — emails vinden via Google zoekresultaten
// ---------------------------------------------------------------------------

async function googleDork(browser, bedrijfsnaam, domain) {
  if (!bedrijfsnaam && !domain) return { emails: [], eigenaar: "" };

  const allEmails = [];
  let eigenaar = "";

  // Slechts 1 gerichte query om CAPTCHA te vermijden
  const query = domain
    ? `"${bedrijfsnaam || domain}" "@${domain}" OR eigenaar OR oprichter`
    : `"${bedrijfsnaam}" email eigenaar`;

  try {
    const page = await browser.newPage();
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=nl&num=10`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await sleep(rand(2000, 3000));

      // CAPTCHA check — als het er is, sla Google dorking over (niet wachten)
      const hasCaptcha = await detectGoogleCaptcha(page);
      if (hasCaptcha) {
        console.log("  ⚠️  Google CAPTCHA — dorking overgeslagen");
        return { emails: [], eigenaar: "" };
      }

      // Emails uit zoekresultaten
      const text = await page.evaluate(() => document.body?.innerText || "");
      const html = await page.content();
      const emails = extractEmails(html + " " + text);

      // Filter: emails die bij het domein horen OF persoonlijk zijn
      for (const email of emails) {
        const emailDomain = email.split("@")[1];
        if (emailDomain === domain) {
          allEmails.push(email);
        } else if (
          emailDomain &&
          !emailDomain.includes("google") &&
          !emailDomain.includes("facebook") &&
          !emailDomain.includes("instagram") &&
          (emailDomain.includes("gmail") || emailDomain.includes("hotmail") ||
           emailDomain.includes("outlook") || emailDomain.includes("live") ||
           emailDomain.includes("yahoo") || emailDomain.includes("icloud"))
        ) {
          // Alleen bekende persoonlijke email providers accepteren
          allEmails.push(email);
        }
      }

      // Eigenaar naam zoeken in snippets
      if (!eigenaar) {
        const ownerPatterns = [
          /(?:eigenaar|oprichter|founder|ceo|directeur)\s*[:\-–]\s*([A-Z][a-zéèêëïüö]+(?:\s+(?:van|de|den|der|het|te|ten|ter)\s+)?[A-Z][a-zéèêëïüö]+)/gi,
          /([A-Z][a-zéèêëïüö]+(?:\s+(?:van|de|den|der|het|te|ten|ter)\s+)?[A-Z][a-zéèêëïüö]+)\s*[,\-–]\s*(?:eigenaar|oprichter|founder|ceo|directeur)/gi,
        ];
        for (const re of ownerPatterns) {
          const m = re.exec(text);
          if (m && m[1]) {
            const validation = validatePersonName(m[1].trim());
            if (validation.valid && validation.confidence !== "low") {
              eigenaar = m[1].trim();
              break;
            }
          }
        }
      }
    } finally {
      await page.close();
    }
  } catch {
    // Google search mislukt, ga door
  }

  // Dedup en filter
  const uniqueEmails = [...new Set(allEmails)]
    .filter((e) => !isBlacklisted(e))
    .filter((e) => !/^(info|contact|admin|sales|hello|hallo|welkom|receptie)@/i.test(e));

  return { emails: uniqueEmails, eigenaar };
}

// ---------------------------------------------------------------------------
// STEP 8: KVK — eigenaar naam ophalen via OpenKVK API
// ---------------------------------------------------------------------------

const KVK_API_BASE = "https://api.kvk.nl/api/v2";
const KVK_API_KEY = process.env.KVK_API_KEY || "l7677cf3f227404f789519e3a367bd4dea";

let kvkApiWarningShown = false;

async function kvkLookup(bedrijfsnaam, stad) {
  if (!bedrijfsnaam) return { eigenaar: "", kvkNummer: "" };

  try {
    // Zoek bedrijf op naam via officiële KvK API v2
    const params = new URLSearchParams({ naam: bedrijfsnaam });
    if (stad) params.set("plaats", stad);
    const url = `${KVK_API_BASE}/zoeken?${params}`;

    const res = await fetchWithTimeout(url, 10000, {
      headers: { apikey: KVK_API_KEY },
    });

    if (!res.ok) {
      if (!kvkApiWarningShown) {
        const body = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403 || body.includes("key")) {
          console.log("  ⚠️  KvK API key ongeldig — stel KVK_API_KEY in");
          kvkApiWarningShown = true;
        }
      }
      return { eigenaar: "", kvkNummer: "" };
    }

    const data = await res.json();
    if (!data.resultaten || !data.resultaten.length) {
      return { eigenaar: "", kvkNummer: "" };
    }

    // Zoek de beste match (bij voorkeur exact dezelfde plaats)
    const match = data.resultaten[0];
    const kvkNummer = match.kvkNummer || "";

    // Haal basisprofiel op voor eigenaar info
    const basisLink = match.links?.find((l) => l.rel === "basisprofiel");
    if (basisLink && basisLink.href) {
      const basisRes = await fetchWithTimeout(basisLink.href, 10000, {
        headers: { apikey: KVK_API_KEY },
      });
      if (basisRes.ok) {
        const basis = await basisRes.json();

        // Bij eenmanszaken: eigenaar.naam is een persoonsnaam
        // Bij BV's: eigenaar is een rechtspersoon (geen persoonsnaam beschikbaar via API)
        if (basis._embedded && basis._embedded.eigenaar) {
          const eig = basis._embedded.eigenaar;
          // Alleen bij eenmanszaken/VOF's is het een persoon
          if (eig.rechtsvorm && !eig.rechtsvorm.includes("Vennootschap") && !eig.rechtsvorm.includes("Stichting")) {
            // Naam staat mogelijk in een apart veld
            if (eig.naam) {
              const validation = validatePersonName(eig.naam);
              if (validation.valid) {
                return { eigenaar: eig.naam, kvkNummer };
              }
            }
          }
        }

        // Check of de bedrijfsnaam zelf een persoonsnaam is (eenmanszaak)
        // Bijv. "Jan de Vries" als handelsnaam
        if (basis.naam && basis.naam !== match.naam) {
          const validation = validatePersonName(basis.naam);
          if (validation.valid) {
            return { eigenaar: basis.naam, kvkNummer };
          }
        }
      }
    }

    return { eigenaar: "", kvkNummer };
  } catch {
    return { eigenaar: "", kvkNummer: "" };
  }
}

// ---------------------------------------------------------------------------
// STEP 9: DNS/SPF/DMARC — email provider detectie
// ---------------------------------------------------------------------------

/**
 * Analyseert DNS records om email-informatie te achterhalen:
 * - SPF record: onthult email provider (Google, Microsoft, eigen server)
 * - DMARC record: bevat soms rua/ruf email adressen
 * - MX records: bevestigt welke mailserver wordt gebruikt
 *
 * Dit helpt om te weten welke email patronen waarschijnlijk werken:
 * - Google Workspace → voornaam.achternaam@ is standaard
 * - Microsoft 365 → voornaam.achternaam@ of v.achternaam@
 * - Eigen server → alles mogelijk
 */
async function dnsEmailInfo(domain) {
  if (!domain) return { provider: "", dmarcEmails: [], hasMailserver: false };

  let provider = "";
  const dmarcEmails = [];
  let hasMailserver = false;

  // 1. MX records — heeft dit domein überhaupt een mailserver?
  try {
    const mx = await resolveMx(domain);
    if (mx && mx.length > 0) {
      hasMailserver = true;
      const mxHost = mx[0].exchange.toLowerCase();

      // Detecteer provider
      if (mxHost.includes("google") || mxHost.includes("gmail")) {
        provider = "google";
      } else if (mxHost.includes("outlook") || mxHost.includes("microsoft")) {
        provider = "microsoft";
      } else if (mxHost.includes("transip")) {
        provider = "transip";
      } else if (mxHost.includes("hostnet") || mxHost.includes("antagonist")) {
        provider = "shared-hosting";
      } else if (mxHost.includes(domain)) {
        provider = "eigen-server";
      } else {
        provider = "overig";
      }
    }
  } catch {}

  // 2. SPF record — bevestiging provider
  try {
    const txt = await resolveTxt(domain);
    for (const record of txt) {
      const joined = record.join("");
      if (joined.startsWith("v=spf1")) {
        if (joined.includes("google") || joined.includes("_spf.google")) {
          provider = provider || "google";
        } else if (joined.includes("microsoft") || joined.includes("outlook") || joined.includes("spf.protection.outlook")) {
          provider = provider || "microsoft";
        }
      }
    }
  } catch {}

  // 3. DMARC record — bevat soms monitoring emails
  try {
    const txt = await resolveTxt(`_dmarc.${domain}`);
    for (const record of txt) {
      const joined = record.join("");
      if (joined.includes("v=DMARC1")) {
        // Extract rua en ruf email adressen
        const ruaMatch = joined.match(/rua=mailto:([^;,\s]+)/gi);
        const rufMatch = joined.match(/ruf=mailto:([^;,\s]+)/gi);
        const allMatches = [...(ruaMatch || []), ...(rufMatch || [])];
        for (const m of allMatches) {
          const email = m.replace(/^(rua|ruf)=mailto:/i, "").trim();
          if (email && !isBlacklisted(email)) {
            dmarcEmails.push(email);
          }
        }
      }
    }
  } catch {}

  return { provider, dmarcEmails, hasMailserver };
}

/**
 * Genereert extra email patronen gebaseerd op de email provider.
 * Google Workspace en Microsoft 365 hebben typische standaard-patronen.
 */
function providerBasedPatterns(eigenaarNaam, domain, provider) {
  if (!eigenaarNaam || !domain) return [];

  const parts = eigenaarNaam.toLowerCase().replace(/[^a-z\s\-]/g, "").split(/\s+/).filter((p) => p.length > 1);
  const tussenvoegsels = ["van", "de", "den", "der", "het", "te", "ten", "ter"];
  const significant = parts.filter((p) => !tussenvoegsels.includes(p));
  if (significant.length < 2) return [];

  const voornaam = significant[0];
  const achternaam = significant[significant.length - 1];

  switch (provider) {
    case "google":
      // Google Workspace standaard: voornaam.achternaam@
      return [
        `${voornaam}.${achternaam}@${domain}`,
        `${voornaam}@${domain}`,
        `${achternaam}@${domain}`,
      ];
    case "microsoft":
      // Microsoft 365 standaard: voornaam.achternaam@ of v.achternaam@
      return [
        `${voornaam}.${achternaam}@${domain}`,
        `${voornaam[0]}.${achternaam}@${domain}`,
        `${voornaam}@${domain}`,
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// CAPTCHA DETECTIE (hergebruik maps-scraper logica)
// ---------------------------------------------------------------------------

async function detectGoogleCaptcha(page) {
  try {
    const hasCaptcha = await page.evaluate(() => {
      const text = document.body?.innerText || "";
      return (
        text.includes("unusual traffic") ||
        text.includes("niet-menselijk verkeer") ||
        text.includes("Ik ben geen robot") ||
        text.includes("I'm not a robot") ||
        !!document.querySelector("#captcha-form") ||
        !!document.querySelector('iframe[src*="recaptcha"]')
      );
    });
    return hasCaptcha;
  } catch {
    return false;
  }
}

function waitForEnter() {
  return new Promise((resolve) => {
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("  ➡️  Druk ENTER als de CAPTCHA opgelost is... ", () => {
      rl.close();
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// LEAD MAPPING — input → output format
// ---------------------------------------------------------------------------

function mapInputToOutput(input, sourceName) {
  // Ondersteunt meerdere CSV-formaten:
  // Format A: bedrijfsnaam, website, branche, ..., locatie, ...
  // Format B: bedrijf_naam, voornaam, achternaam, email, ..., adres, postcode, stad, telefoon, website
  // Format C (gmaps): name, address, postcode, phone, website, category, city
  const naam = input.bedrijfsnaam || input.bedrijf_naam || input.naam || input.name || "";
  const adres = (input.locatie || input.adres || input.address || "").replace(/[\n\r]+/g, " ").trim();
  const stad = input.stad || input.city || extractCity(adres);

  return {
    naam,
    website: input.website || "",
    email_origineel: input.email || "",
    adres,
    stad,
    telefoon: input.telefoon || input.phone || "",
    kvk_nummer: input.kvk_nummer || "",
    bron: sourceName || path.basename(INPUT_CSV, ".csv"),
    branche: input.branche || input.category || "",
    voornaam: input.voornaam || "",
    achternaam: input.achternaam || "",
    functie: input.functie || "",
    // Enriched fields — initieel leeg
    domein: "",
    eigenaar_naam: "",
    whois_email: "",
    email_patronen: "",
    geverifieerd_email: "",
    facebook_url: "",
    facebook_email: "",
    instagram_url: "",
    instagram_email: "",
    enrichment_status: "",
    enrichment_datum: "",
  };
}

// ---------------------------------------------------------------------------
// MAIN — ENRICHMENT PIPELINE
// ---------------------------------------------------------------------------

async function enrichLead(lead, browser) {
  const domain = extractDomain(lead.website);
  lead.domein = domain;

  const steps = [];
  let eigenaar = lead.voornaam && lead.achternaam
    ? `${lead.voornaam} ${lead.achternaam}`
    : "";

  // ── STAP 1: WHOIS ──
  if (ENABLE_WHOIS && domain) {
    try {
      console.log(`  🔍 WHOIS voor ${domain}...`);
      const whois = await whoisLookup(domain);
      if (whois.eigenaar) eigenaar = eigenaar || whois.eigenaar;
      if (whois.email) lead.whois_email = whois.email;
      steps.push("whois");
      await sleep(DELAYS.whois);
    } catch (err) {
      console.log(`  ⚠️  WHOIS fout: ${err.message}`);
    }
  }

  // ── STAP 2: WEBSITE SCRAPE ──
  if (ENABLE_WEBSITE && lead.website && browser) {
    try {
      console.log(`  🌐 Website scrape voor eigenaar...`);
      const baseUrl = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
      const result = await scrapeWebsiteForOwner(browser, baseUrl, domain);
      if (result.eigenaar) {
        // Website-naam overschrijft WHOIS als confidence medium+ is
        // (website is betrouwbaarder dan WHOIS voor persoonsnamen)
        if (!eigenaar || result.confidence === "high" || result.confidence === "medium") {
          eigenaar = result.eigenaar;
        }
        console.log(`  👤 Naam gevonden: "${result.eigenaar}" (confidence: ${result.confidence})`);
      }
      // Bewaar gevonden emails als potentiële patronen
      if (result.emails.length) {
        const personalEmails = result.emails.filter(
          (e) => !/^(info|contact|admin|sales|hello|hallo|welkom|receptie)@/i.test(e)
        );
        if (personalEmails.length && !lead.geverifieerd_email) {
          lead.geverifieerd_email = personalEmails[0];
        }
      }
      steps.push("website");
      await sleep(DELAYS.website);
    } catch (err) {
      console.log(`  ⚠️  Website scrape fout: ${err.message}`);
    }
  }

  lead.eigenaar_naam = eigenaar;

  // ── STAP 3: EMAIL PATRONEN ──
  if (eigenaar && domain) {
    const patronen = generateEmailPatterns(eigenaar, domain);
    lead.email_patronen = patronen.join("; ");
    steps.push("patronen");

    // ── STAP 4: SMTP VERIFICATIE ──
    if (ENABLE_SMTP && patronen.length && !lead.geverifieerd_email) {
      try {
        console.log(`  📧 SMTP verificatie (${patronen.length} patronen)...`);
        const smtp = await verifyEmails(patronen, domain);
        if (smtp.verified) {
          lead.geverifieerd_email = smtp.verified;
        } else if (smtp.catchAll) {
          lead.enrichment_status = (lead.enrichment_status ? lead.enrichment_status + "; " : "") + "catch-all server";
        }
        steps.push("smtp");
        await sleep(DELAYS.smtp);
      } catch (err) {
        console.log(`  ⚠️  SMTP fout: ${err.message}`);
      }
    }
  }

  // ── STAP 5: FACEBOOK ──
  if (ENABLE_FACEBOOK && browser) {
    try {
      console.log(`  📘 Facebook zoeken...`);
      const fb = await findFacebook(browser, lead.naam, domain);
      lead.facebook_url = fb.url;
      lead.facebook_email = fb.email;
      if (fb.email && !lead.geverifieerd_email) lead.geverifieerd_email = fb.email;
      if (fb.url) steps.push("facebook");
      await sleep(DELAYS.facebook);
    } catch (err) {
      console.log(`  ⚠️  Facebook fout: ${err.message}`);
    }
  }

  // ── STAP 6: INSTAGRAM ──
  if (ENABLE_INSTAGRAM && browser) {
    try {
      console.log(`  📷 Instagram zoeken...`);
      const ig = await findInstagram(browser, lead.naam, domain);
      lead.instagram_url = ig.url;
      lead.instagram_email = ig.email;
      if (ig.email && !lead.geverifieerd_email) lead.geverifieerd_email = ig.email;
      if (ig.url) steps.push("instagram");
      await sleep(DELAYS.instagram);
    } catch (err) {
      console.log(`  ⚠️  Instagram fout: ${err.message}`);
    }
  }

  // ── STAP 7: KVK EIGENAAR (geen browser, snel) ──
  if (ENABLE_KVK && !eigenaar) {
    try {
      console.log(`  🏛️  KvK eigenaar opzoeken...`);
      const kvk = await kvkLookup(lead.naam, lead.stad);
      if (kvk.eigenaar) {
        eigenaar = kvk.eigenaar;
        lead.eigenaar_naam = eigenaar;
        console.log(`  👤 KvK naam: "${kvk.eigenaar}"`);
      }
      if (kvk.kvkNummer) lead.kvk_nummer = kvk.kvkNummer;
      steps.push("kvk");
      await sleep(DELAYS.kvk);

      // Als we nu een naam hebben maar nog geen email → patronen + SMTP
      if (eigenaar && domain && !lead.geverifieerd_email) {
        const extraPatronen = generateEmailPatterns(eigenaar, domain);
        if (extraPatronen.length) {
          lead.email_patronen = lead.email_patronen
            ? lead.email_patronen + "; " + extraPatronen.join("; ")
            : extraPatronen.join("; ");

          if (ENABLE_SMTP) {
            console.log(`  📧 SMTP verificatie KvK-patronen (${extraPatronen.length})...`);
            const smtp = await verifyEmails(extraPatronen, domain);
            if (smtp.verified) {
              lead.geverifieerd_email = smtp.verified;
            }
          }
        }
      }
    } catch (err) {
      console.log(`  ⚠️  KvK fout: ${err.message}`);
    }
  }

  // ── STAP 8: DNS/SPF CHECK (geen browser, snel) ──
  if (ENABLE_DNS && domain) {
    try {
      const dnsInfo = await dnsEmailInfo(domain);

      if (dnsInfo.hasMailserver) {
        steps.push("dns");

        // DMARC emails als bonus
        if (dnsInfo.dmarcEmails.length) {
          for (const email of dnsInfo.dmarcEmails) {
            if (email.includes(domain) && !lead.geverifieerd_email) {
              lead.geverifieerd_email = email;
            }
          }
        }

        // Provider-specifieke patronen genereren en verifyen
        if (eigenaar && dnsInfo.provider && !lead.geverifieerd_email) {
          const providerPatterns = providerBasedPatterns(eigenaar, domain, dnsInfo.provider);
          if (providerPatterns.length) {
            console.log(`  🌐 DNS: ${dnsInfo.provider} gedetecteerd → ${providerPatterns.length} extra patronen`);
            lead.email_patronen = lead.email_patronen
              ? lead.email_patronen + "; " + providerPatterns.join("; ")
              : providerPatterns.join("; ");

            if (ENABLE_SMTP) {
              const smtp = await verifyEmails(providerPatterns, domain);
              if (smtp.verified) {
                lead.geverifieerd_email = smtp.verified;
              }
            }
          }
        }
      }
      await sleep(DELAYS.dns);
    } catch (err) {
      console.log(`  ⚠️  DNS fout: ${err.message}`);
    }
  }

  // ── STAP 9: GOOGLE DORKING (laatste resort, 1 query max) ──
  if (ENABLE_GOOGLE && browser && !lead.geverifieerd_email) {
    try {
      console.log(`  🔎 Google dorking...`);
      const gd = await googleDork(browser, lead.naam, domain);
      if (gd.eigenaar && !eigenaar) {
        eigenaar = gd.eigenaar;
        lead.eigenaar_naam = eigenaar;
      }
      if (gd.emails.length) {
        const personal = gd.emails.filter((e) => {
          const d = e.split("@")[1];
          return d !== domain || !/^(info|contact|admin|sales|hello|hallo)@/i.test(e);
        });
        if (personal.length && !lead.geverifieerd_email) {
          lead.geverifieerd_email = personal[0];
        }
      }
      steps.push("google");
      await sleep(DELAYS.google);
    } catch (err) {
      console.log(`  ⚠️  Google dorking fout: ${err.message}`);
    }
  }

  // Final eigenaar
  lead.eigenaar_naam = eigenaar;

  // Status
  lead.enrichment_status = steps.length
    ? (lead.enrichment_status ? lead.enrichment_status + "; " : "") + steps.join(", ")
    : "geen verrijking mogelijk";
  lead.enrichment_datum = new Date().toISOString().split("T")[0];

  return lead;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  TopTalent Lead Enricher");
  console.log("═══════════════════════════════════════════════════");
  const inputFiles = INPUT_CSV.split(",").map((f) => f.trim());
  inputFiles.forEach((f, i) => console.log(`  Input ${i + 1}:  ${f}`));
  console.log(`  Output:   ${OUTPUT_CSV}`);
  console.log(`  WHOIS:     ${ENABLE_WHOIS ? "✅" : "❌"}`);
  console.log(`  Website:   ${ENABLE_WEBSITE ? "✅" : "❌"}`);
  console.log(`  SMTP:      ${ENABLE_SMTP ? "✅" : "❌"}`);
  console.log(`  Facebook:  ${ENABLE_FACEBOOK ? "✅" : "❌"}`);
  console.log(`  Instagram: ${ENABLE_INSTAGRAM ? "✅" : "❌"}`);
  console.log(`  Google:    ${ENABLE_GOOGLE ? "✅" : "❌"}`);
  console.log(`  KvK:       ${ENABLE_KVK ? "✅" : "❌"}`);
  console.log(`  DNS/SPF:   ${ENABLE_DNS ? "✅" : "❌"}`);
  console.log(`  Max leads: ${MAX_LEADS === Infinity ? "alle" : MAX_LEADS}`);
  console.log(`  Parallel:  ${CONCURRENCY}x`);
  console.log("═══════════════════════════════════════════════════\n");

  // Load input
  const inputLeads = loadInputLeads();
  const existing = loadExistingOutput();

  // Determine welke stappen een browser nodig hebben
  const needsBrowser = ENABLE_WEBSITE || ENABLE_FACEBOOK || ENABLE_INSTAGRAM;
  let browser = null;

  if (needsBrowser) {
    try {
      const { chromium } = require("playwright");
      browser = await chromium.launch({
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
      });
      console.log("🌐 Browser gestart\n");
    } catch (err) {
      console.error(`❌ Playwright kon niet starten: ${err.message}`);
      console.error("   Installeer met: npx playwright install chromium");
      console.error("   Website/Facebook/Instagram stappen worden overgeslagen.\n");
    }
  }

  // Filter leads die nog verwerkt moeten worden
  const toProcess = [];
  let skipped = 0;
  for (const input of inputLeads) {
    if (toProcess.length >= MAX_LEADS) break;
    const lead = mapInputToOutput(input, input._bron);
    const key = dedupeKey(lead);
    if (existing.has(key)) {
      skipped++;
    } else {
      toProcess.push(lead);
    }
  }

  if (skipped > 0) console.log(`♻️  ${skipped} leads overgeslagen (al verrijkt)`);
  console.log(`📋 ${toProcess.length} leads te verwerken (${CONCURRENCY} parallel)\n`);

  const startTime = Date.now();
  let enriched = 0;
  let processed = 0;

  // Verwerk leads in parallelle batches
  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(toProcess.length / CONCURRENCY);

    console.log(`\n── Batch ${batchNum}/${totalBatches} (${batch.length} leads) ──`);

    const results = await Promise.allSettled(
      batch.map(async (lead, idx) => {
        const num = i + idx + 1;
        const label = `[${num}/${toProcess.length}]`;
        console.log(`${label} 🏢 ${lead.naam} (${lead.website || "geen website"})`);

        try {
          await enrichLead(lead, browser);

          // Samenvatting
          const gevonden = [];
          if (lead.eigenaar_naam) gevonden.push(`eigenaar: ${lead.eigenaar_naam}`);
          if (lead.geverifieerd_email) gevonden.push(`email: ${lead.geverifieerd_email}`);
          if (lead.whois_email) gevonden.push(`whois: ${lead.whois_email}`);
          if (lead.facebook_url) gevonden.push("FB ✓");
          if (lead.instagram_url) gevonden.push("IG ✓");
          console.log(`${label} ✅ ${gevonden.length ? gevonden.join(" | ") : "geen extra info"}`);
          return { lead, success: true };
        } catch (err) {
          console.log(`${label} ❌ ${err.message}`);
          lead.enrichment_status = `error: ${err.message}`;
          lead.enrichment_datum = new Date().toISOString().split("T")[0];
          return { lead, success: false };
        }
      })
    );

    // Sla resultaten op
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { lead, success } = result.value;
        const key = dedupeKey(lead);
        existing.set(key, lead);
        processed++;
        if (success) enriched++;
      }
    }

    // Autosave na elke batch
    if (processed % AUTOSAVE_EVERY < CONCURRENCY) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = (processed / (elapsed || 1)).toFixed(1);
      const eta = ((toProcess.length - processed) / (rate || 1) / 60).toFixed(0);
      console.log(`\n💾 Autosave (${existing.size} leads) | ${elapsed}s | ${rate} leads/s | ETA: ~${eta} min`);
      saveOutput(existing);
    }
  }

  // Final save
  saveOutput(existing);

  if (browser) {
    await browser.close();
    console.log("\n🌐 Browser gesloten");
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  Klaar! (${totalTime} minuten)`);
  console.log(`  Verwerkt:     ${processed}`);
  console.log(`  Verrijkt:     ${enriched}`);
  console.log(`  Overgeslagen: ${skipped} (al eerder verrijkt)`);
  console.log(`  Totaal:       ${existing.size} leads in output`);
  console.log(`  Output:       ${OUTPUT_CSV}`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n💥 Onverwachte fout:", err);
  process.exit(1);
});
