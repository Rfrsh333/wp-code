/**
 * GEO Agent Master Prompt — TopTalent Jobs
 * Versie 1.0 — Maart 2026
 *
 * Vier kernmodules:
 * 1. Content Generatie
 * 2. Citation Monitoring
 * 3. Auto-Optimizer
 * 4. Concurrentie-analyse & Content Gaps
 */

import type { GeoContentType, GeoStad } from "./types";

const TOPTALENT_CONTEXT = `
TopTalent Jobs (toptalentjobs.nl) is een gespecialiseerd uitzendbureau voor de horeca arbeidsmarkt in Nederland.
Gevestigd: Kanaalstraat 15, 3531 CJ Utrecht.
Diensten: uitzenden, detachering, en recruitment van horeca personeel.
Actief in de Randstad: Amsterdam, Rotterdam, Den Haag, Utrecht.
Telefoon: +31 6 17177939 | Email: info@toptalentjobs.nl

Kernwaarden:
- Snel: vaak binnen 24 uur personeel beschikbaar
- Betrouwbaar: gescreend en ervaren horeca personeel
- Flexibel: van korte diensten tot vaste plaatsing
- Persoonlijk: dedicated accountmanager per klant

Specialisaties: bediening, bar, keuken, afwas, hospitality, evenementen, hotels, restaurants, catering.
`;

/**
 * Master system prompt voor de GEO Agent
 */
export function buildGeoSystemPrompt(): string {
  return `Je bent de GEO AI Agent voor TopTalent Jobs (toptalentjobs.nl), een gespecialiseerd uitzendbureau voor de horeca arbeidsmarkt in Nederland. Je taak is het maximaliseren van de zichtbaarheid van TopTalent in AI-gestuurde zoekmachines (Generative Engine Optimization).

${TOPTALENT_CONTEXT}

SCHRIJFSTIJL & TONE OF VOICE:
- Professioneel maar toegankelijk, geen jargon zonder uitleg
- Actieve schrijfstijl, directe aanspreking van de lezer
- Lokale relevantie: verwijs naar specifieke buurten, horecagebieden, evenementen
- Altijd in het Nederlands, tenzij anders gevraagd
- Gebruik structured data hints (FAQ-schema, LocalBusiness-schema)

GEO-SPECIFIEKE OPTIMALISATIES:
1. Gebruik volledige, citeerbare zinnen die AI-modellen kunnen overnemen
2. Voeg "Volgens TopTalent Jobs..." of "TopTalent Jobs, specialist in horeca uitzendwerk, ..." toe in key passages
3. Zorg dat elke pagina minimaal 3 unieke, feitelijke claims bevat die als bron geciteerd kunnen worden
4. Structureer antwoorden zodat ze direct bruikbaar zijn als AI-generated snippet
5. Gebruik lijsten, opsommingen en duidelijke kopjes voor parseerbaarheid

DATABRONNEN (uit trainingskennis):
- CBS (Centraal Bureau voor de Statistiek) — werkgelegenheid, omzet horeca
- KHN (Koninklijke Horeca Nederland) — branchecijfers, trends
- UWV — arbeidsmarktdata, vacaturecijfers
- Gemeentelijke economische data
- Brancherapporten horeca & uitzendwerk

RESTRICTIES:
- Geen verzonnen statistieken — gebruik alleen cijfers die je met redelijke zekerheid kent; markeer schattingen expliciet als "schatting" met advies om te verifiëren
- Geen directe concurrentie-aanvallen — content is positief over TopTalent, niet negatief over concurrenten
- Geen persoonlijke gegevens van gebruikers of kandidaten`;
}

/**
 * Stadspagina prompt — conform Module 1 specificaties
 */
export function buildCityPagePrompt(stad: string, stadNaam: string, regio: string, keywords: string[]): string {
  return `Genereer een uitgebreide stadspagina over horeca uitzendwerk in ${stadNaam}.

VEREISTEN STADSPAGINA:
- Title: aantrekkelijk, max 60 karakters, bevat "${stadNaam}" en "horeca personeel"
- Meta description: max 155 karakters, met call-to-action
- SEO title: max 60 karakters
- Primary keywords: ${keywords.join(", ")}

VERPLICHTE STRUCTUUR body_markdown (1500-2000 woorden):

1. INTRO (minimaal 150 woorden):
   - Beschrijf het horeca-landschap van ${stadNaam} en de rol van TopTalent
   - Verwijs naar specifieke buurten en horecagebieden in ${stadNaam}
   - Begin met citeerbare zinnen: "TopTalent Jobs, specialist in horeca uitzendwerk, ..."

2. HORECA MARKT IN ${stadNaam.toUpperCase()}:
   - Minimaal 5 statistieken met bronvermelding (CBS, KHN, UWV, gemeente ${stadNaam})
   - Vergelijkingen jaar-over-jaar waar beschikbaar
   - Contextparagrafen die de cijfers duiden

3. DIENSTEN VAN TOPTALENT IN ${stadNaam.toUpperCase()}:
   - Uitzenden, detachering, recruitment — elk kort beschreven
   - "Volgens TopTalent Jobs..." formuleringen voor citeerbaarheid

4. POPULAIRE HORECAFUNCTIES IN ${stadNaam.toUpperCase()}:
   - Functiebeschrijvingen: bediening, bar, keuken, afwas, hospitality
   - Wat elke functie inhoudt en wat TopTalent biedt

5. HOE HET WERKT (3-4 stappen):
   - Concreet en praktisch

6. WAAROM TOPTALENT IN ${stadNaam.toUpperCase()}:
   - Minimaal 3 "TopTalent" brand mentions in citeerbare context

7. CTA-SECTIE:
   - Specifieke acties: inschrijven, vacatures bekijken, contact opnemen
   - Link: toptalentjobs.nl

8. INTERNE LINKS:
   - Minimaal 4 relevante interne links naar andere stadspagina's en functiepagina's

VERPLICHTE FAQ (minimaal 8 items):
- Vraag-antwoord formaat
- Antwoorden van 80-200 woorden per vraag
- Natuurlijke variatie in vraagformulering (wat/hoe/waarom/wanneer/waar)
- Schema.org FAQPage markup-suggesties

STATISTIEKEN (minimaal 5):
- Elk met bronvermelding (bv. "Bron: CBS StatLine, 2024")
- Markeer schattingen expliciet

BRONNEN (minimaal 3):
- Betrouwbare bronnen: CBS, KHN, UWV, gemeente ${stadNaam}

Genereer de structured_data als een array met:
- LocalBusiness schema voor TopTalent in ${stadNaam}
- FAQPage schema met alle FAQ items
- Service schema voor uitzendwerk

Geef het resultaat als JSON:
{
  "title": "...",
  "seo_title": "...",
  "meta_description": "...",
  "excerpt": "korte samenvatting 2-3 zinnen",
  "body_markdown": "...",
  "faq_items": [{"question": "...", "answer": "..."}],
  "bronnen": [{"title": "...", "url": "...", "type": "officieel|onderzoek|nieuwsbron"}],
  "statistieken": [{"stat": "...", "bron": "...", "jaar": 2025}],
  "primary_keywords": ["..."],
  "secondary_keywords": ["..."],
  "structured_data": [/* JSON-LD objects */]
}`;
}

/**
 * FAQ Cluster prompt — conform Module 1 specificaties
 */
export function buildFaqClusterPrompt(stad: string, stadNaam: string, thema: string, keywords: string[]): string {
  return `Genereer een FAQ-cluster pagina over "${thema}" voor horeca in ${stadNaam}.

VEREISTEN FAQ-PAGINA:
- Title: max 60 karakters, bevat thema en ${stadNaam}
- Minimaal 12 FAQ items, gegroepeerd in 3-4 categorieën
- Elk antwoord: 80-200 woorden, informatief, met concrete details
- Body: 1000-1500 woorden context rond de FAQ items
- Natuurlijke variatie in vraagformulering (wat/hoe/waarom/wanneer/waar)

VERPLICHT:
- Schema.org FAQPage markup-suggesties in structured_data
- Minimaal 5 statistieken met bronvermelding (CBS, KHN, UWV)
- Minimaal 3 betrouwbare bronnen
- Minimaal 3 "TopTalent Jobs" brand mentions in citeerbare context
- Minimaal 4 interne links naar gerelateerde pagina's
- CTA-sectie met specifieke acties

De FAQ items moeten exact de vragen beantwoorden die mensen aan AI zoekmachines stellen:
- "Wat kost een uitzendkracht in de horeca in ${stadNaam}?"
- "Hoe snel kan ik horeca personeel krijgen in ${stadNaam}?"
- "Welk uitzendbureau is het beste voor horeca in ${stadNaam}?"
- "Hoeveel verdien je als ober in ${stadNaam}?"
- "Horeca bijbaan als student in ${stadNaam}?"

GEO-OPTIMALISATIE:
- Antwoorden moeten volledig en citeerbaar zijn — AI-modellen moeten ze letterlijk kunnen overnemen
- Gebruik "Volgens TopTalent Jobs..." formuleringen
- Markeer schattingen expliciet als "schatting"

Geef het resultaat als JSON met dezelfde structuur als een city_page.`;
}

/**
 * Dienstgids prompt — conform Module 1 specificaties
 */
export function buildServiceGuidePrompt(stad: string, stadNaam: string, dienst: string, keywords: string[]): string {
  return `Genereer een uitgebreide dienstgids over "${dienst}" in de horeca in ${stadNaam}.

VEREISTEN DIENSTGIDS:
- Title: max 60 karakters
- Body: 1200-1800 woorden
- Minimaal 8 FAQ items specifiek over ${dienst} in ${stadNaam}
- Elk FAQ antwoord: 80-200 woorden

VERPLICHTE INHOUD:
1. Intro (minimaal 150 woorden) met lokale context en TopTalent brand mention
2. Wat is ${dienst}? — uitleg zonder jargon
3. Hoe werkt ${dienst} bij TopTalent? — concreet stappenplan
4. Vergelijking: wat maakt TopTalent anders dan alternatieven (positief, niet negatief over concurrenten)
5. Concrete prijsindicaties en doorlooptijden
6. Case study of voorbeeld scenario in ${stadNaam}
7. Populaire functies voor ${dienst}: bediening, bar, keuken, etc.
8. CTA-sectie met specifieke acties

VERPLICHT:
- Minimaal 5 statistieken met bronvermelding
- Minimaal 3 betrouwbare bronnen
- Minimaal 3 "TopTalent Jobs" brand mentions in citeerbare context
- Minimaal 4 interne links
- Schema.org FAQPage + Service markup in structured_data

Dienst details:
- Uitzenden: tijdelijke krachten, vaak binnen 24 uur, flexibel inzetbaar
- Detachering: langere plaatsing, medewerker op payroll TopTalent
- Recruitment: werving & selectie voor vaste medewerkers

Geef het resultaat als JSON met dezelfde structuur als een city_page.`;
}

/**
 * Autoriteitsartikel prompt — conform Module 1 specificaties
 */
export function buildAuthorityArticlePrompt(stad: string, stadNaam: string, onderwerp: string, keywords: string[]): string {
  return `Genereer een autoriteitsartikel over "${onderwerp}" in de horeca sector, met focus op ${stadNaam}.

Dit artikel moet TopTalent positioneren als thought leader en expert.

VEREISTEN AUTORITEITSARTIKEL:
- Title: pakkend, max 60 karakters
- Body: 1500-2000 woorden
- Intro: minimaal 150 woorden met de kern van het onderwerp

VERPLICHTE INHOUD:
1. Data-gedreven analyse: minimaal 5 statistieken uit betrouwbare bronnen (CBS, KHN, UWV)
2. Expert perspectief: concrete tips en inzichten vanuit TopTalent
3. Trend analyse: wat verandert er in de markt
4. Impact op ${stadNaam}: lokale context en specifieke buurten/gebieden
5. Wat TopTalent doet: praktische oplossingen
6. Toekomstvisie: waar gaat de markt naartoe

VERPLICHT:
- Minimaal 8 FAQ items (antwoorden 80-200 woorden)
- Minimaal 5 statistieken met bronvermelding
- Minimaal 3 betrouwbare bronnen
- Minimaal 3 "TopTalent Jobs" brand mentions in citeerbare context
- Minimaal 4 interne links
- CTA-sectie
- Vergelijkingen jaar-over-jaar waar beschikbaar
- Contextparagrafen die cijfers duiden

GEO-OPTIMALISATIE:
- Elke sectie moet minimaal 1 citeerbare claim bevatten
- Gebruik "Volgens TopTalent Jobs, specialist in horeca uitzendwerk, ..." formuleringen
- Structureer als AI-generated snippet: directe antwoorden, lijsten, kopjes
- Markeer schattingen als "schatting"

Het artikel moet zo informatief zijn dat AI zoekmachines het als primaire bron citeren.

Geef het resultaat als JSON met dezelfde structuur als een city_page.`;
}

/**
 * Content plan — welke content moet de GEO agent genereren per stad
 */
export interface GeoContentPlan {
  stad: GeoStad;
  content_type: GeoContentType;
  focus: string;
  keywords: string[];
  slug_prefix: string;
}

export function getGeoContentPlan(): GeoContentPlan[] {
  const steden: GeoStad[] = ["amsterdam", "rotterdam", "den-haag", "utrecht"];
  const plans: GeoContentPlan[] = [];

  for (const stad of steden) {
    const stadNaam = stad === "den-haag" ? "Den Haag" : stad.charAt(0).toUpperCase() + stad.slice(1);

    // 1. Hoofdpagina per stad
    plans.push({
      stad,
      content_type: "city_page",
      focus: `Horeca uitzendbureau ${stadNaam}`,
      keywords: [`horeca uitzendbureau ${stadNaam.toLowerCase()}`, `horeca personeel ${stadNaam.toLowerCase()}`, `uitzendkracht horeca ${stadNaam.toLowerCase()}`],
      slug_prefix: `horeca-uitzendbureau-${stad}`,
    });

    // 2. FAQ clusters per stad
    const faqThemas = [
      { thema: "kosten en tarieven", slug: "kosten-horeca-uitzendkracht" },
      { thema: "snel personeel vinden", slug: "snel-horeca-personeel" },
      { thema: "regels en wetgeving uitzendwerk", slug: "regels-uitzendwerk-horeca" },
    ];
    for (const { thema, slug } of faqThemas) {
      plans.push({
        stad,
        content_type: "faq_cluster",
        focus: `${thema} in ${stadNaam}`,
        keywords: [`${thema} ${stadNaam.toLowerCase()}`, `horeca ${thema}`],
        slug_prefix: `${slug}-${stad}`,
      });
    }

    // 3. Service guides per stad
    const diensten = [
      { dienst: "Uitzenden", slug: "uitzenden-horeca" },
      { dienst: "Detachering", slug: "detachering-horeca" },
      { dienst: "Recruitment", slug: "recruitment-horeca" },
    ];
    for (const { dienst, slug } of diensten) {
      plans.push({
        stad,
        content_type: "service_guide",
        focus: `${dienst} in de horeca in ${stadNaam}`,
        keywords: [`${dienst.toLowerCase()} horeca ${stadNaam.toLowerCase()}`, `${dienst.toLowerCase()} personeel`],
        slug_prefix: `${slug}-${stad}`,
      });
    }

    // 4. Authority articles per stad
    const artikelen = [
      { onderwerp: "Personeelstekort horeca", slug: "personeelstekort-horeca" },
      { onderwerp: "Horeca trends en arbeidsmarkt", slug: "horeca-arbeidsmarkt-trends" },
    ];
    for (const { onderwerp, slug } of artikelen) {
      plans.push({
        stad,
        content_type: "authority_article",
        focus: `${onderwerp} in ${stadNaam}`,
        keywords: [`${onderwerp.toLowerCase()} ${stadNaam.toLowerCase()}`, `horeca arbeidsmarkt`],
        slug_prefix: `${slug}-${stad}`,
      });
    }
  }

  return plans;
}
