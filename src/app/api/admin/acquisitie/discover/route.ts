import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Pad naar de werkende Python scraper
const SCRAPER_DIR = path.join(os.homedir(), "Desktop", "scrappe");

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized discover attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Import bestaande CSV bestanden (uit ~/Desktop/scrappe/ of DGS 2026)
    if (action === "import_existing") {
      return await importExistingCsv(body.file_path);
    }

    // Lijst beschikbare CSV bestanden
    if (action === "list_files") {
      return listAvailableCsvFiles();
    }

    // Google Maps scrape via Python scraper
    const { query, max_results } = body;
    if (!query) {
      return NextResponse.json({ error: "Zoekterm is vereist" }, { status: 400 });
    }

    return await runPythonScraper(query, max_results || 50);
  } catch (error) {
    console.error("Discovery error:", error);
    return NextResponse.json({ error: "Discovery mislukt" }, { status: 500 });
  }
}

async function runPythonScraper(query: string, maxResults: number) {
  const timestamp = Date.now();
  const outputFile = path.join(SCRAPER_DIR, `discover_${timestamp}.csv`);

  // Maak een scraper script dat de resultaten naar een CSV schrijft
  const scriptContent = `#!/usr/bin/env python3
import csv, sys, time
from playwright.sync_api import sync_playwright

QUERY = ${JSON.stringify(query)}
MAX_RESULTS = ${maxResults}
OUTPUT = ${JSON.stringify(outputFile)}

def scrape():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            proxy={"server":"http://proxy.smartproxy.net:3120","username":"smart-w2m198ltz0j7","password":"1IBdKh16HP8DglVQ"}
        )
        page = browser.new_page()
        url = f"https://www.google.com/maps/search/{QUERY}"
        print(f"Navigating to: {url}", file=sys.stderr)
        page.goto(url, timeout=60000)
        time.sleep(4)
        for sel in ['button:has-text("Alles accepteren")', 'button:has-text("Accept all")']:
            try:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    btn.click()
                    time.sleep(1)
                    break
            except: pass
        scrollable = page.query_selector('div[role="feed"]')
        if not scrollable:
            print("No results feed found", file=sys.stderr)
            browser.close()
            return
        prev_count, no_change = 0, 0
        for i in range(200):
            scrollable.evaluate("el => el.scrollTo(0, el.scrollHeight)")
            time.sleep(0.6)
            links = page.query_selector_all('a[href*="/maps/place/"]')
            if len(links) >= MAX_RESULTS: break
            if len(links) == prev_count:
                no_change += 1
                if no_change >= 5: break
            else: no_change = 0
            prev_count = len(links)
            if i % 20 == 0: print(f"  {len(links)} results so far...", file=sys.stderr)
        links = page.query_selector_all('a[href*="/maps/place/"]')
        print(f"Processing {min(len(links), MAX_RESULTS)} results...", file=sys.stderr)
        for idx, link in enumerate(links[:MAX_RESULTS], 1):
            try:
                link.click()
                time.sleep(0.8)
                h1 = page.query_selector('h1.DUwDvf')
                name = h1.inner_text() if h1 else ""
                if not name or name in ["Resultaten","Results"] or len(name)<2: continue
                addr_btn = page.query_selector('button[data-item-id="address"]')
                address = addr_btn.inner_text() if addr_btn else ""
                phone = ""
                phone_btn = page.query_selector('button[data-item-id*="phone"]')
                if phone_btn:
                    aria = phone_btn.get_attribute('aria-label') or ""
                    phone = aria.replace('Phone: ','').replace('Copy phone number','').strip()
                website = ""
                web_link = page.query_selector('a[data-item-id="authority"]')
                if web_link: website = web_link.get_attribute('href') or ""
                results.append({'name':name,'address':address,'phone':phone,'website':website})
                if idx % 25 == 0: print(f"  {idx} processed...", file=sys.stderr)
            except: continue
        browser.close()
    if results:
        with open(OUTPUT,'w',newline='',encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=['name','address','phone','website'])
            w.writeheader()
            for r in results: w.writerow(r)
    print(f"DONE:{len(results)}")

scrape()
`;

  const tempScript = path.join(SCRAPER_DIR, `_discover_${timestamp}.py`);
  fs.writeFileSync(tempScript, scriptContent, "utf8");

  // Start scraper als detached process via open (macOS) zodat de browser kan openen
  try {
    // Gebruik osascript om een Terminal venster te openen dat de scraper runt
    // Na afloop importeren we het resultaat
    const terminalCmd = `cd "${SCRAPER_DIR}" && python3 "${tempScript}" && echo "\\n\\nScrape klaar! Dit venster mag dicht." && sleep 5`;

    exec(`osascript -e 'tell application "Terminal" to do script "${terminalCmd.replace(/"/g, '\\"')}"'`);

    // Wacht tot de output file verschijnt (poll elke 5 sec, max 10 min)
    const maxWait = 600000;
    const pollInterval = 5000;
    let waited = 0;

    while (waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      waited += pollInterval;

      // Check of het bestand bestaat EN of het "DONE:" in de output heeft
      if (fs.existsSync(outputFile)) {
        // Wacht nog even tot het bestand klaar is met schrijven
        const size1 = fs.statSync(outputFile).size;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const size2 = fs.statSync(outputFile).size;
        if (size2 > 0 && size1 === size2) {
          break; // Bestand is klaar
        }
      }
    }

    // Clean up temp script
    try { fs.unlinkSync(tempScript); } catch { /* ignore */ }

    // Parse results and import
    if (!fs.existsSync(outputFile)) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        message: "Scraper is gestart in een Terminal venster. Als de scrape klaar is, gebruik 'Bestaande Data' om het resultaat te importeren.",
      });
    }

    const result = await importCsvToDatabase(outputFile, "google_maps");

    // Clean up output
    try { fs.unlinkSync(outputFile); } catch { /* ignore */ }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scraper launch error:", error);
    // Clean up
    try { fs.unlinkSync(tempScript); } catch { /* ignore */ }

    return NextResponse.json({
      success: false,
      imported: 0,
      skipped: 0,
      error: "Kon scraper niet starten. Gebruik de terminal: cd ~/Desktop/scrappe && python3 gmaps_robust_scraper.py",
    });
  }
}

async function importExistingCsv(filePath: string) {
  if (!filePath) {
    return NextResponse.json({ error: "file_path is vereist" }, { status: 400 });
  }

  // Security: alleen bestanden uit bekende directories toestaan
  const allowedDirs = [
    path.join(os.homedir(), "Desktop", "scrappe"),
    path.join(os.homedir(), "Desktop", "2.0", "DGS 2026"),
    path.join(os.homedir(), "Desktop", "2.0", "TopTalent 2.0", "DGS"),
    path.join(os.homedir(), "Desktop", "2.0", "TopTalent 2.0", "toptalent-wordpress-html", "data"),
  ];

  const resolved = path.resolve(filePath);
  const isAllowed = allowedDirs.some((dir) => resolved.startsWith(dir));
  if (!isAllowed) {
    return NextResponse.json({ error: "Bestand niet in toegestane directory" }, { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "Bestand niet gevonden" }, { status: 404 });
  }

  const result = await importCsvToDatabase(resolved, "csv_import");
  return NextResponse.json(result);
}

function listAvailableCsvFiles() {
  const files: Array<{ path: string; name: string; size: string; rows: number }> = [];

  const searchDirs = [
    SCRAPER_DIR,
    path.join(os.homedir(), "Desktop", "2.0", "DGS 2026"),
    path.join(os.homedir(), "Desktop", "2.0", "TopTalent 2.0", "DGS"),
    path.join(os.homedir(), "Desktop", "2.0", "TopTalent 2.0", "toptalent-wordpress-html", "data", "clean"),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const findCsvs = (d: string, depth = 0) => {
      if (depth > 3) return;
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          findCsvs(fullPath, depth + 1);
        } else if (entry.isFile() && entry.name.endsWith(".csv") && !entry.name.startsWith("_")) {
          const stat = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, "utf8");
          const lineCount = content.split("\n").filter(Boolean).length - 1; // minus header
          files.push({
            path: fullPath,
            name: entry.name,
            size: formatBytes(stat.size),
            rows: Math.max(0, lineCount),
          });
        }
      }
    };

    findCsvs(dir);
  }

  return NextResponse.json({ files });
}

async function importCsvToDatabase(filePath: string, bron: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);

  if (lines.length <= 1) {
    return { success: true, imported: 0, skipped: 0, total: 0, message: "Leeg bestand" };
  }

  // Detect delimiter: semicolon (DGS) or comma
  const firstLine = lines[0];
  const isSemicolon = firstLine.includes(";");
  const delimiter = isSemicolon ? ";" : ",";

  const header = splitLine(firstLine, delimiter).map((h) => h.replace(/"/g, "").trim());
  const headerLower = header.map((h) => h.toLowerCase());

  // Detect if this is a DGS format
  const isDGS = headerLower.some((h) => h.includes("data-collectief") || h.includes("bedrijf naam"));

  // DGS full format (with addresses/phone): "nh - utr tel.csv"
  const isDGSFull = isDGS && headerLower.some((h) => h.includes("bedrijf straat") || h.includes("bedrijf telefoon"));

  // DGS persoonlijk format: "DGS restaurant persoonlijk.csv"
  const isDGSPersonal = isDGS && !isDGSFull;

  // Map column indexes based on format
  let colMap: {
    name: number;
    email: number;
    phone: number;
    website: number;
    address: number;
    city: number;
    voornaam: number;
    achternaam: number;
    branche: number;
    contactpersoon: number;
  };

  if (isDGSFull) {
    // Full DGS: Bedrijf Naam, Bedrijf Straat + Huisnummer, Bedrijf Postcode, Bedrijf Plaats, Bedrijf Telefoon, Bedrijf E-mail/Contactpersoon E-mail, Bedrijf URL
    colMap = {
      name: headerLower.indexOf("bedrijf naam"),
      email: Math.max(
        headerLower.indexOf("contactpersoon e-mail"),
        headerLower.indexOf("bedrijf e-mail")
      ),
      phone: headerLower.indexOf("bedrijf telefoon"),
      website: headerLower.indexOf("bedrijf url"),
      address: -1, // We'll build this from straat + huisnummer
      city: headerLower.indexOf("bedrijf plaats"),
      voornaam: headerLower.indexOf("contactpersoon voornaam"),
      achternaam: headerLower.indexOf("contactpersoon naam"),
      branche: headerLower.indexOf("bedrijf brancheomschrijving"),
      contactpersoon: -1,
    };
  } else if (isDGSPersonal) {
    // Personal DGS: Bedrijf Naam, Contactpersoon Naam, Contactpersoon Voornaam, Contactpersoon E-mail
    colMap = {
      name: headerLower.indexOf("bedrijf naam"),
      email: headerLower.indexOf("contactpersoon e-mail"),
      phone: -1,
      website: -1,
      address: -1,
      city: -1,
      voornaam: headerLower.indexOf("contactpersoon voornaam"),
      achternaam: headerLower.indexOf("contactpersoon naam"),
      branche: -1,
      contactpersoon: -1,
    };
  } else {
    // Standard CSV (Google Maps scraper output, etc.)
    colMap = {
      name: headerLower.findIndex((h) => ["name", "bedrijfsnaam", "naam"].includes(h)),
      email: headerLower.findIndex((h) => ["email", "e-mail"].includes(h)),
      phone: headerLower.findIndex((h) => ["phone", "telefoon"].includes(h)),
      website: headerLower.findIndex((h) => ["website", "url"].includes(h)),
      address: headerLower.findIndex((h) => ["address", "adres", "locatie"].includes(h)),
      city: headerLower.findIndex((h) => ["city", "stad", "plaats"].includes(h)),
      voornaam: headerLower.findIndex((h) => ["voornaam"].includes(h)),
      achternaam: headerLower.findIndex((h) => ["achternaam"].includes(h)),
      branche: headerLower.findIndex((h) => ["branche", "category"].includes(h)),
      contactpersoon: headerLower.findIndex((h) => ["contactpersoon"].includes(h)),
    };
  }

  if (colMap.name === -1) {
    return { success: false, error: "Geen bedrijfsnaam kolom gevonden", imported: 0, skipped: 0, total: 0 };
  }

  // DGS full: find straat/huisnummer/postcode indexes for address building
  const straatIdx = isDGSFull ? headerLower.indexOf("bedrijf straat") : -1;
  const huisnrIdx = isDGSFull ? headerLower.indexOf("bedrijf huisnummer") : -1;
  const huisnrToevIdx = isDGSFull ? headerLower.indexOf("bedrijf huisnummertoevoeging") : -1;
  const postcodeIdx = isDGSFull ? headerLower.indexOf("bedrijf postcode") : -1;
  const contactEmailIdx = isDGSFull ? headerLower.indexOf("contactpersoon e-mail") : -1;
  const bedrijfEmailIdx = isDGSFull ? headerLower.indexOf("bedrijf e-mail") : -1;

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i], delimiter).map((v) =>
      v.replace(/^"|"$/g, "").replace(/^="(.*)"$/, "$1").trim()
    );

    const name = colMap.name >= 0 ? values[colMap.name] : "";
    if (!name || name.length < 2) { skipped++; continue; }

    // Build address for DGS full format
    let address: string | null = null;
    if (isDGSFull) {
      const straat = straatIdx >= 0 ? values[straatIdx] : "";
      const huisnr = huisnrIdx >= 0 ? values[huisnrIdx] : "";
      const huisnrToev = huisnrToevIdx >= 0 ? values[huisnrToevIdx] : "";
      const postcode = postcodeIdx >= 0 ? values[postcodeIdx] : "";
      const stad = colMap.city >= 0 ? values[colMap.city] : "";
      if (straat) {
        address = `${straat} ${huisnr}${huisnrToev}`.trim();
        if (postcode) address += `, ${postcode}`;
        if (stad) address += ` ${stad}`;
      }
    } else {
      address = colMap.address >= 0 ? values[colMap.address] || null : null;
    }

    // Get best email: prefer contactpersoon email, fallback to bedrijf email
    let email: string | null = null;
    if (isDGSFull) {
      email = (contactEmailIdx >= 0 ? values[contactEmailIdx] : "") ||
              (bedrijfEmailIdx >= 0 ? values[bedrijfEmailIdx] : "") || null;
    } else {
      email = colMap.email >= 0 ? values[colMap.email] || null : null;
    }

    // Clean phone (remove ="..." wrapper from DGS)
    let phone = colMap.phone >= 0 ? values[colMap.phone] || null : null;
    if (phone) phone = phone.replace(/^="(.*)"$/, "$1").replace(/[="]/g, "").trim();
    if (phone === "") phone = null;

    const website = colMap.website >= 0 ? values[colMap.website] || null : null;
    const stad = colMap.city >= 0 ? (values[colMap.city] || "").trim() || null : null;
    const branche = colMap.branche >= 0 ? values[colMap.branche] || null : null;

    // Build contactpersoon from voornaam + achternaam
    let contactpersoon: string | null = null;
    if (colMap.voornaam >= 0 || colMap.achternaam >= 0) {
      const voornaam = colMap.voornaam >= 0 ? values[colMap.voornaam] || "" : "";
      const achternaam = colMap.achternaam >= 0 ? values[colMap.achternaam] || "" : "";
      contactpersoon = [voornaam, achternaam].filter(Boolean).join(" ").trim() || null;
    } else if (colMap.contactpersoon >= 0) {
      contactpersoon = values[colMap.contactpersoon] || null;
    }

    // Extract stad from address if not available
    let finalStad = stad;
    if (!finalStad && address) {
      const stadMatch = address.match(/\d{4}\s*[A-Z]{2}\s+([A-Za-z\s-]+?)(?:,|\s*Nederland|$)/);
      if (stadMatch) finalStad = stadMatch[1].trim();
    }

    if (!email) email = null;
    if (email === "") email = null;

    // Deduplicatie op email
    if (email) {
      const { data: existing } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) { skipped++; continue; }
    }

    // Deduplicatie op bedrijfsnaam + stad
    if (finalStad) {
      const { data: existing } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id")
        .eq("bedrijfsnaam", name)
        .eq("stad", finalStad)
        .maybeSingle();
      if (existing) { skipped++; continue; }
    }

    const { error } = await supabaseAdmin
      .from("acquisitie_leads")
      .insert({
        bedrijfsnaam: name,
        contactpersoon,
        email,
        telefoon: phone,
        website,
        adres: address,
        stad: finalStad,
        branche: branche || "horeca",
        bron,
      });

    if (error) {
      skipped++;
    } else {
      imported++;
    }
  }

  return { success: true, imported, skipped, total: lines.length - 1 };
}

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === ";") {
    // Simple semicolon split (DGS files don't use quoting with semicolons)
    return line.split(";");
  }
  // Comma-separated with quote handling
  return parseCsvLine(line);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}
