# SEO Fundamenten Audit

**Datum:** 2026-04-22

## 1. robots.txt — PASS

| Check | Status | Details |
|-------|--------|---------|
| Disallow `/admin/*` | PASS | ✓ |
| Disallow `/api/*` | PASS | ✓ |
| Disallow `/klant/*` | PASS | ✓ |
| Disallow `/medewerker/*` | PASS | ✓ |
| Disallow WordPress legacy paths | PASS | `/wp-content/`, `/wp-includes/`, `/wp-admin/` |
| Sitemap URL | PASS | `https://www.toptalentjobs.nl/sitemap.xml` |
| AI bots toegestaan | PASS | GPTBot, ClaudeBot, PerplexityBot etc. expliciet allowed |

**Opmerking:** `/bedankt/` wordt ook geblokkeerd — correct, want bedankt-pagina's moeten niet geïndexeerd worden.

---

## 2. sitemap.xml

| Check | Status | Details |
|-------|--------|---------|
| Statische routes aanwezig | PASS | 17 statische pagina's |
| Locatie-pagina's | PASS | Alle steden + stad/dienst combinaties |
| Blog artikelen | PASS | Handmatige + editorial slugs |
| FAQ pagina's | PASS | Hub + individuele FAQ pagina's |
| Totaal URL's | PASS | **127 URL's** |
| `lastmod` actueel | **FAIL** | Alle entries hebben **dezelfde datum: 2024-12-19** |
| `changeFrequency` | PASS | Correct per type (weekly/monthly/yearly) |
| `priority` | PASS | Logisch gelaagd (1.0 → 0.3) |

**Probleem:** `lastmod` is een hardcoded `contentDate = new Date('2024-12-19')` in `sitemap.ts`. Dit geeft Google het signaal dat content niet verandert → minder frequent crawlen.

**Fix:** Gebruik `new Date()` voor dynamische content, of haal `updated_at` uit database.

---

## 3. Per-pagina Meta Tags

### Homepage `/`
| Check | Status | Waarde |
|-------|--------|--------|
| `<title>` | PASS | "Extra horecapersoneel binnen 24 u | Stop omzetverlies | TopTalent" (65 tekens — iets te lang, max 60) |
| `<meta description>` | PASS | 156 tekens, klikwaardig ✓ |
| `<link canonical>` | PASS | `https://www.toptalentjobs.nl/` |
| `og:title` | PASS | Uniek, korter dan page title |
| `og:description` | PASS | ✓ |
| `og:image` | PASS | Opengraph image aanwezig |
| `og:type` | PASS | "website" |
| `twitter:card` | PASS | "summary_large_image" |
| JSON-LD | PASS | Organization + WebSite + FAQPage |

### Personeel Aanvragen `/personeel-aanvragen/`
| Check | Status | Waarde |
|-------|--------|--------|
| `<title>` | PASS | "Personeel Aanvragen | TopTalent Jobs" |
| `<meta description>` | PASS | Goede beschrijving |
| `<link canonical>` | **FAIL** | Ontbreekt |
| `og:title` | **FAIL** | Gebruikt default layout OG (niet pagina-specifiek) |
| `og:url` | **FAIL** | Wijst naar `https://www.toptalentjobs.nl/` i.p.v. `/personeel-aanvragen/` |
| JSON-LD | **FAIL** | Geen pagina-specifieke structured data |

### Inschrijven `/inschrijven/`
| Check | Status | Waarde |
|-------|--------|--------|
| `<title>` | **FAIL** | Ontbreekt (erft default "TopTalent Jobs - Horeca Uitzendbureau Utrecht") |
| `<meta description>` | **FAIL** | Ontbreekt (erft default) |
| `<link canonical>` | **FAIL** | Ontbreekt |
| JSON-LD | **FAIL** | Geen |

### Diensten `/diensten/`
| Check | Status | Waarde |
|-------|--------|--------|
| `<title>` | PASS | "Onze Diensten | TopTalent Jobs" |
| `<meta description>` | PASS | 149 tekens ✓ |
| `<link canonical>` | PASS | `https://www.toptalentjobs.nl/diensten/` |
| `og:*` | PASS | Volledig + uniek |
| JSON-LD | PASS | Organization + BreadcrumbList |

### Diensten/Uitzenden `/diensten/uitzenden/`
| Check | Status | Waarde |
|-------|--------|--------|
| `<title>` | PASS | "Uitzenden | TopTalent Jobs" |
| `<meta description>` | PASS | 155 tekens ✓ |
| `<link canonical>` | PASS | Via layout |
| JSON-LD | PASS | Via layout |

### Locaties/Utrecht `/locaties/utrecht/`
| Check | Status | Waarde |
|-------|--------|--------|
| `<title>` | **WARN** | "Horeca Uitzendbureau Utrecht | TopTalent Jobs | TopTalent Jobs" — dubbel! |
| `<meta description>` | PASS | ✓ |
| `<link canonical>` | PASS | ✓ |
| JSON-LD | PASS | Organization + EmploymentAgency + BreadcrumbList |

---

## 4. HTML lang & Internationaal

| Check | Status |
|-------|--------|
| `<html lang="nl">` | PASS ✓ |
| Alleen NL content | PASS |
| `.nl` TLD | PASS (www.toptalentjobs.nl) |
| `geo.region: NL` | PASS |
| `geo.placename: Utrecht` | PASS |
| `hreflang` | N/A (niet nodig, alleen NL) |

---

## 5. Structured Data (Basis)

| Schema Type | Status | Pagina's |
|-------------|--------|----------|
| `Organization` / `EmploymentAgency` | PASS | Globaal (layout.tsx) |
| `WebSite` | PASS | Globaal (layout.tsx) |
| `FAQPage` | PASS | Homepage |
| `BreadcrumbList` | PASS | Diensten, locaties |
| `LocalBusiness` / `EmploymentAgency` | PASS | Locatie-pagina's |
| `Article` | **ONTBREEKT** | Blog pagina's |
| `JobPosting` | **ONTBREEKT** | Geen vacature-pagina's |

---

## Score Samenvatting

| Categorie | Score | Details |
|-----------|-------|---------|
| robots.txt | **10/10** | Perfect |
| sitemap.xml | **7/10** | -3 voor hardcoded lastmod |
| Homepage meta | **10/10** | Volledig |
| Personeel-aanvragen meta | **4/10** | Geen canonical, default OG, geen structured data |
| Inschrijven meta | **2/10** | Geen title, description, canonical, OG |
| Diensten meta | **9/10** | -1 voor ontbrekende Article schema |
| Locaties meta | **8/10** | -2 voor dubbele title |
| Structured data | **7/10** | Basis goed, maar Article + JobPosting ontbreekt |
| **Totaal** | **57/80** | **71%** |
