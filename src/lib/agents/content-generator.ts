import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";

// ============================================================
// NIEUWSBRONNEN — worden bij elke content generatie opgehaald
// ============================================================

interface NieuwsItem {
  bron: string;
  titel: string;
  beschrijving: string;
  datum: string;
  link: string;
}

const NIEUWS_FEEDS = [
  { naam: "Nu.nl Economie", url: "https://www.nu.nl/rss/Economie" },
  { naam: "Nu.nl Algemeen", url: "https://www.nu.nl/rss/Algemeen" },
  { naam: "RTV Utrecht", url: "https://www.rtvutrecht.nl/rss/nieuws.xml" },
];

// Horeca-gerelateerde keywords voor filtering
const HORECA_KEYWORDS = [
  "horeca", "restaurant", "hotel", "café", "bar", "catering",
  "personeel", "uitzend", "arbeidsmarkt", "werkgelegenheid", "baan", "vacature",
  "kok", "bediening", "hospitality", "gastvrijheid",
  "terras", "festival", "evenement",
  "personeelstekort", "cao", "minimumloon", "uitzendbureau",
  "ondernemer", "mkb", "zzp", "flex", "detachering",
  "voedsel", "eten", "drinken", "maaltijd",
  "utrecht", "amsterdam", "rotterdam", "den haag", "eindhoven",
];

function matchesHoreca(text: string): boolean {
  const lower = text.toLowerCase();
  return HORECA_KEYWORDS.some(kw => lower.includes(kw));
}

function parseRssItems(xml: string, bron: string): NieuwsItem[] {
  const items: NieuwsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 30) {
    const itemXml = match[1];
    const titel = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || "";
    const beschrijving = itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/)?.[1] || "";
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const datum = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    items.push({ bron, titel: titel.trim(), beschrijving: beschrijving.trim(), datum, link: link.trim() });
  }

  return items;
}

async function fetchNieuws(): Promise<string> {
  try {
    const results = await Promise.allSettled(
      NIEUWS_FEEDS.map(async (feed) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(feed.url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) return [];
          const xml = await res.text();
          return parseRssItems(xml, feed.naam);
        } catch {
          clearTimeout(timeout);
          return [];
        }
      })
    );

    const alleItems = results
      .filter((r): r is PromiseFulfilledResult<NieuwsItem[]> => r.status === "fulfilled")
      .flatMap(r => r.value);

    // Filter op horeca-relevante artikelen
    const relevant = alleItems.filter(item =>
      matchesHoreca(item.titel) || matchesHoreca(item.beschrijving)
    );

    // Neem max 8 relevante + 4 algemene (voor bredere context)
    const geselecteerd = [
      ...relevant.slice(0, 8),
      ...alleItems.filter(item => !relevant.includes(item)).slice(0, 4),
    ];

    if (geselecteerd.length === 0) {
      return "Geen actueel nieuws beschikbaar.";
    }

    return geselecteerd
      .map(item => `[${item.bron}] ${item.titel}${item.beschrijving ? ` — ${item.beschrijving.slice(0, 150)}` : ""}`)
      .join("\n");
  } catch {
    return "Nieuwsfeeds konden niet worden opgehaald.";
  }
}

// ============================================================
// CBS DATA — wordt gecacht en periodiek opgehaald
// ============================================================

let cbsCache: { data: string; timestamp: number } | null = null;
const CBS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 uur

async function fetchCBSData(): Promise<string> {
  if (cbsCache && Date.now() - cbsCache.timestamp < CBS_CACHE_TTL) {
    return cbsCache.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // CBS Arbeidsmarkt tabel — werkloosheid en beroepsbevolking
    const res = await fetch(
      "https://opendata.cbs.nl/ODataApi/odata/85224NED/TypedDataSet?$top=12&$format=json&$orderby=Perioden%20desc&$filter=Geslacht%20eq%20%27T001038%27%20and%20Leeftijd%20eq%20%2710000%27",
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return "CBS data niet beschikbaar.";

    const json = await res.json();
    const values = json.value || [];

    if (values.length === 0) return "CBS data niet beschikbaar.";

    // Format de data
    const punten = values.slice(0, 6).map((v: Record<string, unknown>) => {
      const periode = String(v.Perioden || "").trim();
      const werkloosheid = v.Werkloosheidspercentage_17 || v.Werkloosheidspercentage_18;
      const beroepsbevolking = v.Beroepsbevolking_3;
      return `${periode}: werkloosheid ${werkloosheid}%, beroepsbevolking ${beroepsbevolking}k`;
    });

    const result = `CBS Arbeidsmarktcijfers (meest recent):\n${punten.join("\n")}`;
    cbsCache = { data: result, timestamp: Date.now() };
    return result;
  } catch {
    return "CBS data niet beschikbaar.";
  }
}

// ============================================================
// HORECA KENNISBANK — vaste data en seizoensinformatie
// ============================================================

const HORECA_KENNIS = {
  personeelstekort: "In 2025 had 67% van de horecabedrijven moeite met het vinden van personeel (bron: KHN)",
  cao_horeca: "Het minimumuurloon in de horeca CAO 2026 bedraagt €14,06 bruto per uur voor volwassenen",
  seizoenen: {
    januari_februari: "Rustig seizoen, ideaal voor teamopbouw en training van vast uitzendpersoneel",
    maart_april: "Start terrasseizoen, 40% meer vraag naar bediening en runners",
    mei: "Koningsdag, moederdag, Hemelvaartsweekend — piekdagen voor horeca",
    juni_augustus: "Piek horecaseizoen: festivals, terrassen, evenementen, 60% meer vraag",
    september_oktober: "Nazomer, bedrijfsevenementen en borrels seizoen",
    november: "Overgangmaand, voorbereiding op kerstperiode",
    december: "Kerstdiners, nieuwjaarsfeesten, eindejaarsborrels — 50% meer vraag naar keuken en bediening",
  } as Record<string, string>,
  tips: [
    "Restaurants met vaste uitzendkrachten hebben 30% minder last van no-shows",
    "Gemiddelde doorlooptijd van personeelsaanvraag tot plaatsing: 24 uur bij TopTalent",
    "Een goed ingewerkte uitzendkracht is na 2 diensten net zo productief als vast personeel",
    "Flexibel personeel inzetten bespaart gemiddeld 25% op personeelskosten vs overwerk",
    "72% van de horecaondernemers zegt dat personeelstekort hun grootste uitdaging is",
    "Investeren in goede werkomstandigheden verlaagt het verloop met 40%",
    "De horeca is de snelst groeiende werkgever in Nederland met 450.000+ werknemers",
    "Seizoenspersoneel dat via uitzendbureau komt is gemiddeld sneller inzetbaar dan eigen werving",
  ],
  linkedin_formats: [
    "mijlpaal",
    "tip",
    "case_study",
    "seizoen",
    "vacature",
  ],
};

// TopTalent brand voice
const BRAND_VOICE = `## WIE WE ZIJN
- TopTalent Jobs is een horeca uitzendbureau
- We leveren gescreend horecapersoneel binnen 24 uur
- We werken veel met jonge mensen en hebben een informele, luchtige cultuur
- Onze steden: Utrecht, Amsterdam, Rotterdam, Den Haag, Eindhoven
- Onze diensten: uitzenden, detachering, recruitment, evenementenpersoneel
- Website: toptalentjobs.nl

## TONE OF VOICE — DE GOUDEN REGELS

### Wij klinken als: je beste maat in de horeca
We zijn die collega die alles weet over de branche, je eerlijk advies geeft, en waar je mee kunt lachen. We zijn professioneel maar nooit stijf. We zijn serieus over ons vak maar nemen onszelf niet te serieus.

### Zo schrijven we WEL:
- Luchtig en vlot, alsof je het vertelt aan iemand aan de bar
- Met humor — woordspelingen, lichte zelfspot, herkenbare horeca-situaties
- Direct en to the point, geen omhaal
- "Je/jij" — nooit "u", nooit afstandelijk
- Korte zinnen. Punchy. Soms een zin van twee woorden. Werkt prima.
- We gebruiken herkenbare horeca-taal (shift, mis-en-place, couverts, rush, dubbele dienst)
- We tonen dat we de horeca SNAPPEN — de stress, de gastvrijheid, de passie, de chaos
- Af en toe een emoji, maar niet elke zin — max 2-3 per LinkedIn post, 0-2 per blogartikel

### Zo schrijven we NIET:
- Geen corporate taal ("wij faciliteren oplossingen", "onze value proposition", "synergy")
- Geen AI-taal ("in het huidige landschap", "het is belangrijk om te benadrukken", "laten we eens kijken naar")
- Geen overdreven uitroeptekens!!! of CAPS LOCK GESCHREEUW
- Geen clichés ("de horeca draait om mensen" — tenzij je er een twist aan geeft)
- Geen passieve zinnen ("er wordt gezocht naar" → "je zoekt")
- Geen slijmerige verkooppraatjes ("wij zijn de beste!" — laat zien, niet vertellen)
- Geen woorden: "uniek", "innovatief", "toonaangevend", "state-of-the-art", "topkwaliteit"
- Nooit beginnen met "In de dynamische wereld van..." of vergelijkbare AI-openingszinnen
- Geen hashtag-spam: maximaal 3-5 hashtags per LinkedIn post, onderaan`;

function getSeizoenInfo(): string {
  const maand = new Date().getMonth();
  const seizoenKeys = Object.keys(HORECA_KENNIS.seizoenen);
  const mapping: Record<number, number> = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 5, 11: 6 };
  const key = seizoenKeys[mapping[maand] || 0];
  return HORECA_KENNIS.seizoenen[key] || "";
}

async function getBedrijfsData(): Promise<string> {
  try {
    const nu = new Date();
    const eersteVanMaand = new Date(nu.getFullYear(), nu.getMonth(), 1).toISOString();

    const [diensten, klanten, inschrijvingen] = await Promise.all([
      supabaseAdmin.from("diensten").select("id, functie", { count: "exact", head: false }).gte("datum", eersteVanMaand.split("T")[0]),
      supabaseAdmin.from("klanten").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("inschrijvingen").select("id", { count: "exact", head: true }).gte("created_at", eersteVanMaand),
    ]);

    const dienstenCount = diensten.data?.length || 0;
    const klantenCount = klanten.count || 0;
    const inschrijvingenCount = inschrijvingen.count || 0;

    const functieTelling: Record<string, number> = {};
    (diensten.data || []).forEach((d: { functie?: string }) => {
      if (d.functie) functieTelling[d.functie] = (functieTelling[d.functie] || 0) + 1;
    });
    const topFuncties = Object.entries(functieTelling)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([f, c]) => `${f} (${c}x)`)
      .join(", ");

    return `Diensten deze maand: ${dienstenCount}. Totaal klanten: ${klantenCount}. Nieuwe inschrijvingen deze maand: ${inschrijvingenCount}. Populairste functies: ${topFuncties || "bediening, bar, keuken"}.`;
  } catch {
    return "Diensten deze maand: niet beschikbaar.";
  }
}

// ============================================================
// CONTENT GENERATIE
// ============================================================

interface ContentResult {
  titel: string;
  inhoud: string;
  meta_description?: string;
  keywords?: string[];
}

export async function generateContent(
  type: "blog" | "linkedin",
  subtype?: string
): Promise<ContentResult> {
  const seizoenInfo = getSeizoenInfo();
  const maandNamen = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  const huidigeMaand = maandNamen[new Date().getMonth()];
  const linkedinType = subtype || HORECA_KENNIS.linkedin_formats[Math.floor(Math.random() * HORECA_KENNIS.linkedin_formats.length)];

  // Haal alle data parallel op
  const [bedrijfsData, nieuwsData, cbsData] = await Promise.all([
    getBedrijfsData(),
    fetchNieuws(),
    fetchCBSData(),
  ]);

  const randomTip = HORECA_KENNIS.tips[Math.floor(Math.random() * HORECA_KENNIS.tips.length)];
  const randomTip2 = HORECA_KENNIS.tips[Math.floor(Math.random() * HORECA_KENNIS.tips.length)];

  if (!isOpenAIConfigured()) {
    if (type === "linkedin") {
      return {
        titel: `LinkedIn post - ${huidigeMaand}`,
        inhoud: `Vrijdagavond. Vol terras. En je enige ervaren kok belt zich ziek.\n\nWe kennen het verhaal. ${seizoenInfo}\n\nBij TopTalent Jobs merken we het: ${bedrijfsData}\n\n${randomTip}\n\nHerkenbaar? Laat het weten in de comments.\n\n#horeca #horecapersoneel #ondernemen`,
      };
    }
    return {
      titel: `Horecapersoneel in ${huidigeMaand}: dit moet je weten`,
      inhoud: `## Horecapersoneel in ${huidigeMaand}\n\nJe hebt net een tafel van 12 binnen en je bediening staat met twee man op de vloer. ${seizoenInfo}\n\n### De markt\n\n${HORECA_KENNIS.personeelstekort}\n\n### Wat we zien\n\n${bedrijfsData}\n\n### Praktische tip\n\n${randomTip}\n\n### Wat nu?\n\nWil je weten wat dit voor jouw zaak betekent? Neem contact op via toptalentjobs.nl — we denken graag mee.`,
      meta_description: `Horecapersoneel inhuren in ${huidigeMaand}? Tips, trends en tarieven. TopTalent Jobs levert gescreend personeel binnen 24 uur.`,
      keywords: ["horecapersoneel", "uitzendbureau horeca", "horeca personeel inhuren", huidigeMaand],
    };
  }

  const systemPrompt = type === "blog"
    ? `${BRAND_VOICE}

## BLOGARTIKEL OPDRACHT

Schrijf een blogartikel voor horecaondernemers.

### Structuur
1. **Titel:** Helder, concreet, bevat een zoekterm. Geen clickbait.
   - Goed: "Horecapersoneel inhuren: dit zijn de echte kosten in 2026"
   - Goed: "5 signalen dat je restaurant te weinig personeel heeft"
   - Slecht: "Alles wat je moet weten over uitzendwerk"
   - Slecht: "TopTalent Jobs — jouw partner in horeca"

2. **Intro (eerste alinea):** Stel het probleem of de vraag centraal. De lezer moet denken "ja, dit herken ik" of "dit wil ik weten". Binnen 3 zinnen moet duidelijk zijn wat ze gaan leren.

3. **Body:** Praktisch en concreet. Gebruik:
   - Subkoppen (## H2) die op zichzelf al informatief zijn
   - Korte alinea's (max 4 zinnen)
   - Opsommingen waar het de leesbaarheid helpt
   - Echte voorbeelden uit de horeca (geen generieke business-voorbeelden)
   - Cijfers en data waar mogelijk
   - BELANGRIJK: Verwijs naar actueel nieuws als het relevant is (zie nieuwsdata hieronder)

4. **Afsluiter:** Vat samen + geef een volgende stap. De CTA mag iets steviger maar geen "BEL NU!!!". Denk aan: "Wil je weten wat dit voor jouw zaak betekent? Neem contact op, we denken graag mee."

### SEO-regels
- Focus keyword in de titel, eerste alinea, en minimaal 2 subkoppen
- Meta description: max 155 tekens, bevat het focus keyword, klinkt als een zin
- Interne links: verwijs minimaal 2x naar pagina's op toptalentjobs.nl (bijv. /veelgestelde-vragen, /diensten/uitzenden, /locaties/utrecht)
- Lengte: minimaal 800 woorden, ideaal 1200-1500 woorden
- URL/slug: kort en keyword-rijk

### Wat NIET mag:
- Geen keyword-stuffing
- Geen fluff-alinea's die niets toevoegen
- Geen "In dit artikel gaan we het hebben over..." — begin gewoon
- Geen AI-achtige samenvattingen ("Samenvattend kunnen we stellen dat...")
- Geen conclusie die letterlijk herhaalt wat er al stond
- Maximaal 0-2 emoji's in het hele artikel

BELANGRIJK OVER LENGTE:
- Het artikel MOET minimaal 1000 woorden zijn, ideaal 1200-1500 woorden
- Gebruik minimaal 4-5 subkoppen (## H2)
- Elke sectie moet 150-250 woorden bevatten
- Als het artikel te kort is, voeg meer praktische voorbeelden, data en tips toe
- Tel je woorden — onder de 1000 is NIET acceptabel

Antwoord ALLEEN in JSON (geen markdown codeblocks):
{
  "titel": "...",
  "inhoud": "... (markdown met ## koppen, MINIMAAL 1000 woorden)",
  "meta_description": "... (max 155 tekens)",
  "keywords": ["...", "...", "...", "..."]
}`
    : `${BRAND_VOICE}

## LINKEDIN POST OPDRACHT

Type post: ${linkedinType}

### Structuur
1. **Hook (eerste 1-2 regels):** Dit is het ALLERBELANGRIJKSTE. De hook moet iemand laten stoppen met scrollen. Gebruik een van deze technieken:
   - Een herkenbare situatie ("Je hebt 200 couverts vanavond en je souschef belt zich ziek.")
   - Een controversieel of prikkelend statement ("De meeste restaurants verliezen omzet door iets wat ze makkelijk kunnen fixen.")
   - Een vraag die aanspreekt ("Hoe vaak heb je je menukaart aangepast omdat je geen kok had?")
   - Een kort verhaal ("Vorige week belde een klant ons om 14:00. Om 17:00 stond er een kok in zijn keuken.")
   - NOOIT beginnen met "Wist je dat...", "Wij bij TopTalent...", of "Het is weer zover..."
   - Als er relevant actueel nieuws is, gebruik dat als haak!

2. **Body (midden):** Waarde geven. Geen reclame. Kies een van deze invalshoeken:
   - Een probleem erkennen + praktische tip geven
   - Een kijkje achter de schermen bij TopTalent
   - Een trend of ontwikkeling in de horeca bespreken
   - Een verhaal vertellen (klant, medewerker, situatie)
   - Een mening geven waar je achter staat
   - Reageer op actueel nieuws vanuit horeca-perspectief

3. **Afsluiter:** Altijd eindigen met EEN van deze:
   - Een vraag die uitnodigt tot reactie ("Herkenbaar? Hoe lossen jullie dit op?")
   - Een zachte CTA ("Link in de comments als je wilt weten hoe dit werkt")
   - Een punchline of plot twist
   - NOOIT een harde sales CTA ("Neem nu contact op!" / "Bel ons voor een offerte!")

### Regels
- De post MOET minimaal 120 woorden zijn, sweet spot is 130-170 woorden
- Gebruik witregels tussen alinea's — een muur van tekst scrollt niemand doorheen
- Korte alinea's: max 2-3 zinnen per blok
- Max 2-3 emoji's, niet elke zin
- Max 3-5 hashtags, onderaan de post
- Mix van breed (#horeca #ondernemen) en specifiek (#horecapersoneel #uitzendbureau)

### Wat NIET mag:
- Geen stockfoto-beschrijvingen
- Geen "Wij zijn trots om aan te kondigen dat..." posts
- Geen felicitatie-posts zonder inhoud
- Geen engagement bait ("Like als je het eens bent!")
- Geen posts die alleen over TopTalent gaan zonder waarde voor de lezer

Antwoord ALLEEN in JSON (geen markdown codeblocks):
{
  "titel": "LinkedIn post - ${linkedinType}",
  "inhoud": "..."
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Maand: ${huidigeMaand}
Seizoen context: ${seizoenInfo}
Bedrijfsdata: ${bedrijfsData}
Branche feit: ${HORECA_KENNIS.personeelstekort}
CAO info: ${HORECA_KENNIS.cao_horeca}
Tip 1: ${randomTip}
Tip 2: ${randomTip2}

--- ACTUEEL NIEUWS (bronnen: Nu.nl, RTV Utrecht) ---
${nieuwsData}

--- CBS ARBEIDSMARKTDATA ---
${cbsData}

Schrijf nu een ${type === "blog" ? "blogartikel" : "LinkedIn post"} in de TopTalent Jobs tone of voice. Denk eraan: luchtig, vlot, horeca-taal, geen corporate of AI-taal. Gebruik het actuele nieuws als inspiratie waar relevant — verwijs er NIET letterlijk naar tenzij het echt over horeca/personeel/ondernemen gaat.`
    },
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.8, maxTokens: type === "blog" ? 4000 : 800 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    return {
      titel: result.titel || `Content ${huidigeMaand}`,
      inhoud: result.inhoud || "",
      meta_description: result.meta_description,
      keywords: result.keywords,
    };
  } catch {
    return type === "linkedin"
      ? {
          titel: `LinkedIn post - ${huidigeMaand}`,
          inhoud: `Vrijdagavond. Vol terras. En je enige ervaren kok belt zich ziek.\n\nWe kennen het verhaal. ${seizoenInfo}\n\nBij TopTalent Jobs zien we het elke week: ${randomTip}\n\nHerkenbaar? Laat het weten in de comments.\n\n#horeca #horecapersoneel #ondernemen`,
        }
      : {
          titel: `Horecapersoneel trends - ${huidigeMaand}`,
          inhoud: `## Horecapersoneel in ${huidigeMaand}\n\nJe staat achter de bar, twee man tekort, en de reserveringen stromen binnen. ${seizoenInfo}\n\n## De cijfers\n\n${HORECA_KENNIS.personeelstekort}\n\n## Wat we zien\n\n${randomTip}\n\n## Volgende stap\n\nWil je weten wat dit voor jouw zaak betekent? Neem contact op via toptalentjobs.nl — we denken graag mee.`,
          meta_description: `Horecapersoneel inhuren in ${huidigeMaand}? Tips en trends voor horecaondernemers.`,
          keywords: ["horeca", "horecapersoneel", "personeel inhuren", huidigeMaand],
        };
  }
}
