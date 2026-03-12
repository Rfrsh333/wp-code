import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import fs from "fs";
import path from "path";
import os from "os";

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

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Discovery error:", error);
    return NextResponse.json({ error: "Discovery mislukt" }, { status: 500 });
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
