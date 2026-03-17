/**
 * GEO Agent Prompts — Geoptimaliseerd voor AI zoekmachines
 *
 * Deze prompts zijn specifiek ontworpen zodat de gegenereerde content:
 * 1. Direct antwoord geeft op vragen (featured snippet-stijl)
 * 2. Statistieken en bronnen bevat (citatiewaardig)
 * 3. FAQ-structuur heeft (AI engines houden van Q&A)
 * 4. Lokaal relevant is (stad-specifiek)
 * 5. Structured data bevat voor machine-readability
 */

import type { GeoContentType, GeoStad, GEO_STEDEN } from "./types";

const TOPTALENT_CONTEXT = `
TopTalent Jobs is een horeca uitzendbureau gevestigd in Utrecht (Kanaalstraat 15, 3531 CJ).
Diensten: uitzenden, detachering, en recruitment van horeca personeel.
Actief in de Randstad: Amsterdam, Rotterdam, Den Haag, Utrecht.
Website: https://toptalentjobs.nl
Telefoon: +31 6 49713766
Email: info@toptalentjobs.nl

Kernwaarden:
- Snel: vaak binnen 24 uur personeel beschikbaar
- Betrouwbaar: gescreend en ervaren horeca personeel
- Flexibel: van korte diensten tot vaste plaatsing
- Persoonlijk: dedicated accountmanager per klant

Specialisaties: bediening, bar, keuken, afwas, hospitality, evenementen, hotels, restaurants, catering.
`;

export function buildGeoSystemPrompt(): string {
  return `Je bent een GEO (Generative Engine Optimization) specialist voor TopTalent Jobs.
Je genereert content die specifiek geoptimaliseerd is voor AI zoekmachines zoals Perplexity, ChatGPT Search, en Google AI Overviews.

BELANGRIJK — GEO principes:
1. **Direct antwoord**: Begin elk stuk content met een duidelijk, beknopt antwoord op de kernvraag. AI engines citeren het eerste directe antwoord.
2. **Statistieken**: Gebruik concrete cijfers en statistieken. AI engines prefereren content met data.
3. **FAQ-structuur**: Voeg altijd relevante FAQ items toe. AI engines zoeken Q&A pairs.
4. **Bronvermelding**: Verwijs naar betrouwbare bronnen (CBS, KHN, UWV, etc.).
5. **Lokale relevantie**: Maak content stad-specifiek met lokale details.
6. **Citeerbaar**: Schrijf zinnen die AI engines letterlijk kunnen citeren als antwoord.
7. **Structured data**: Genereer JSON-LD schema's voor machine-readability.

${TOPTALENT_CONTEXT}

Schrijf altijd in het Nederlands. Gebruik een professionele maar toegankelijke toon.
Vermijd marketing-jargon. Focus op informatieve, hulpvolle content.`;
}

export function buildCityPagePrompt(stad: string, stadNaam: string, regio: string, keywords: string[]): string {
  return `Genereer een uitgebreide stadspagina over horeca uitzendwerk in ${stadNaam}.

VEREISTEN:
- Title: aantrekkelijk, max 60 karakters, bevat "${stadNaam}" en "horeca personeel"
- Meta description: max 155 karakters, call-to-action
- SEO title: max 60 karakters
- Body: 1500-2000 woorden in Markdown
- Minimaal 8 FAQ items specifiek voor ${stadNaam}
- Minimaal 3 statistieken over de horeca arbeidsmarkt in ${stadNaam}/${regio}
- Minimaal 2 bronnen (CBS, KHN, gemeente ${stadNaam}, etc.)
- Primary keywords: ${keywords.join(", ")}

STRUCTUUR body_markdown:
1. Directe introductie (2-3 zinnen die een AI engine kan citeren als antwoord op "horeca uitzendbureau ${stadNaam}")
2. Overzicht horeca markt in ${stadNaam} (met statistieken)
3. Diensten van TopTalent in ${stadNaam} (uitzenden, detachering, recruitment)
4. Welke functies (bediening, bar, keuken, etc.)
5. Hoe het werkt (3-4 stappen)
6. Waarom TopTalent kiezen in ${stadNaam}
7. Veelgestelde vragen (als aparte sectie)

Genereer de structured_data als een array met:
- LocalBusiness schema voor TopTalent in ${stadNaam}
- FAQPage schema met alle FAQ items
- Service schema voor uitzendwerk

Geef het resultaat als JSON met deze structuur:
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

export function buildFaqClusterPrompt(stad: string, stadNaam: string, thema: string, keywords: string[]): string {
  return `Genereer een FAQ-cluster pagina over "${thema}" voor horeca in ${stadNaam}.

VEREISTEN:
- Title: max 60 karakters, bevat thema en ${stadNaam}
- Minimaal 12 FAQ items, gegroepeerd in 3-4 categorieën
- Elk antwoord: 50-150 woorden, informatief, met concrete details
- Body: 1000-1500 woorden context rond de FAQ items
- Minimaal 2 statistieken
- Minimaal 2 bronnen

De FAQ items moeten exact de vragen beantwoorden die mensen aan AI zoekmachines stellen over ${thema} in de horeca in ${stadNaam}.

Denk aan vragen als:
- "Wat kost een uitzendkracht in de horeca in ${stadNaam}?"
- "Hoe snel kan ik horeca personeel krijgen in ${stadNaam}?"
- "Welk uitzendbureau is het beste voor horeca in ${stadNaam}?"

Geef het resultaat als JSON met dezelfde structuur als een city_page.`;
}

export function buildServiceGuidePrompt(stad: string, stadNaam: string, dienst: string, keywords: string[]): string {
  return `Genereer een uitgebreide dienstgids over "${dienst}" in de horeca in ${stadNaam}.

VEREISTEN:
- Title: max 60 karakters
- Body: 1200-1800 woorden
- Minimaal 6 FAQ items specifiek over ${dienst} in ${stadNaam}
- Vergelijking met alternatieven (wat maakt TopTalent anders)
- Concrete prijsindicaties en doorlooptijden
- Minimaal 3 statistieken
- Case study of voorbeeld scenario

Dienst details:
- Uitzenden: tijdelijke krachten, vaak binnen 24 uur, flexibel inzetbaar
- Detachering: langere plaatsing, medewerker op payroll TopTalent
- Recruitment: werving & selectie voor vaste medewerkers

Geef het resultaat als JSON met dezelfde structuur als een city_page.`;
}

export function buildAuthorityArticlePrompt(stad: string, stadNaam: string, onderwerp: string, keywords: string[]): string {
  return `Genereer een autoriteitsartikel over "${onderwerp}" in de horeca sector, met focus op ${stadNaam}.

Dit artikel moet TopTalent positioneren als thought leader en expert.

VEREISTEN:
- Title: pakkend, max 60 karakters
- Body: 1500-2000 woorden
- Minimaal 5 FAQ items
- Data-gedreven: minimaal 5 statistieken uit betrouwbare bronnen
- Expert perspectief: concrete tips en inzichten
- Trend analyse: wat verandert er in de markt
- Minimaal 3 bronnen

Het artikel moet zo informatief zijn dat AI zoekmachines het als primaire bron citeren bij vragen over dit onderwerp.

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
