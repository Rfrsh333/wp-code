import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";

// Horeca kennisbank
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
    "mijlpaal",   // "Deze maand plaatsten we X diensten..."
    "tip",        // "3 manieren om..."
    "case_study", // "Hoe Restaurant X..."
    "seizoen",    // "Het terrasseizoen begint..."
    "vacature",   // "We zoeken enthousiaste..."
  ],
};

function getSeizoenInfo(): string {
  const maand = new Date().getMonth();
  const seizoenKeys = Object.keys(HORECA_KENNIS.seizoenen);
  // Map maanden naar seizoen keys
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

    // Populairste functies
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
  const bedrijfsData = await getBedrijfsData();
  const randomTip = HORECA_KENNIS.tips[Math.floor(Math.random() * HORECA_KENNIS.tips.length)];
  const maandNamen = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  const huidigeMaand = maandNamen[new Date().getMonth()];

  // LinkedIn subtype kiezen als niet opgegeven
  const linkedinType = subtype || HORECA_KENNIS.linkedin_formats[Math.floor(Math.random() * HORECA_KENNIS.linkedin_formats.length)];

  if (!isOpenAIConfigured()) {
    if (type === "linkedin") {
      return {
        titel: `LinkedIn post - ${huidigeMaand}`,
        inhoud: `Het is ${huidigeMaand} en in de horeca draait het weer op volle toeren! ${seizoenInfo}\n\nBij TopTalent Jobs merken we de vraag: ${bedrijfsData}\n\nWist je dat? ${randomTip}\n\nOp zoek naar betrouwbaar horecapersoneel? Neem contact op via toptalentjobs.nl\n\n#horeca #personeel #uitzendbureau #TopTalentJobs #Utrecht`,
      };
    }
    return {
      titel: `Horecapersoneel in ${huidigeMaand}: wat u moet weten`,
      inhoud: `## Horecapersoneel in ${huidigeMaand}\n\n${seizoenInfo}\n\n### De markt\n\n${HORECA_KENNIS.personeelstekort}\n\n### Onze cijfers\n\n${bedrijfsData}\n\n### Tips\n\n${randomTip}\n\n### Conclusie\n\nBij TopTalent Jobs zorgen wij ervoor dat u altijd het juiste personeel heeft, precies wanneer u het nodig heeft. Neem vandaag nog contact op voor een vrijblijvend gesprek.`,
      meta_description: `Alles over horecapersoneel inhuren in ${huidigeMaand}. Tips, trends en tarieven van TopTalent Jobs.`,
      keywords: ["horecapersoneel", "uitzendbureau", "horeca", huidigeMaand, "TopTalent Jobs"],
    };
  }

  const systemPrompt = type === "blog"
    ? `Je bent de content manager van TopTalent Jobs, een horeca uitzendbureau in Utrecht.
Schrijf een professionele Nederlandse blogpost voor horecaondernemers.

Structuur:
- Pakkende titel (max 70 tekens)
- Intro (2-3 zinnen)
- 3-4 paragrafen met headers (##)
- Conclusie met CTA naar toptalentjobs.nl
- Gebruik echte data en feiten waar mogelijk

Antwoord in JSON:
{
  "titel": "...",
  "inhoud": "... (markdown)",
  "meta_description": "... (max 160 tekens)",
  "keywords": ["...", "..."]
}`
    : `Je bent de social media manager van TopTalent Jobs, een horeca uitzendbureau in Utrecht.
Schrijf een professionele LinkedIn post voor horecaondernemers.

Type post: ${linkedinType}
Regels:
- Max 250 woorden
- Professionele maar toegankelijke toon
- Geen emojis
- Eindig met CTA + 3-5 relevante hashtags
- Gebruik echte data/feiten

Antwoord in JSON:
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
Tip: ${randomTip}`
    },
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.8, maxTokens: type === "blog" ? 800 : 400 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    return {
      titel: result.titel || `Content ${huidigeMaand}`,
      inhoud: result.inhoud || "",
      meta_description: result.meta_description,
      keywords: result.keywords,
    };
  } catch {
    // Fallback
    return type === "linkedin"
      ? {
          titel: `LinkedIn post - ${huidigeMaand}`,
          inhoud: `De horeca in ${huidigeMaand}: ${seizoenInfo}\n\nBij TopTalent Jobs helpen we horecaondernemers met betrouwbaar personeel. ${randomTip}\n\nMeer weten? Bezoek toptalentjobs.nl\n\n#horeca #personeel #uitzendbureau`,
        }
      : {
          titel: `Horecapersoneel trends - ${huidigeMaand}`,
          inhoud: `## Horecapersoneel in ${huidigeMaand}\n\n${seizoenInfo}\n\n${HORECA_KENNIS.personeelstekort}\n\n${randomTip}\n\nNeem contact op via toptalentjobs.nl`,
          meta_description: `Horecapersoneel trends in ${huidigeMaand} - TopTalent Jobs`,
          keywords: ["horeca", "personeel", huidigeMaand],
        };
  }
}
