// ============================================================
// LinkedIn Content Generator — AI post generatie
// Hergebruikt chatCompletion uit src/lib/openai.ts
// ============================================================

import { chatCompletion, type ChatMessage } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";
import type { LinkedInTemplate, LinkedInTemplateCategorie } from "@/types/linkedin";

// Brand voice en horeca kennis (geïmporteerd vanuit content-generator concepten)
const BRAND_VOICE_SHORT = `TopTalent Jobs is een horeca uitzendbureau. Tone of voice: luchtig, vlot, als je beste maat in de horeca. Gebruik "je/jij", korte zinnen, herkenbare horeca-taal. Geen corporate of AI-taal. Max 2-3 emoji's per post. Max 3-5 hashtags onderaan.`;

const SEIZOEN_INFO: Record<string, string> = {
  januari: "Rustig seizoen, ideaal voor teamopbouw en training",
  februari: "Rustig seizoen, ideaal voor teamopbouw en training",
  maart: "Start terrasseizoen, 40% meer vraag naar bediening",
  april: "Start terrasseizoen, 40% meer vraag naar bediening",
  mei: "Koningsdag, moederdag, Hemelvaartsweekend — piekdagen",
  juni: "Piek horecaseizoen: festivals, terrassen, evenementen",
  juli: "Piek horecaseizoen: festivals, terrassen, evenementen",
  augustus: "Piek horecaseizoen: festivals, terrassen, evenementen",
  september: "Nazomer, bedrijfsevenementen en borrels seizoen",
  oktober: "Nazomer, bedrijfsevenementen en borrels seizoen",
  november: "Overgangmaand, voorbereiding op kerstperiode",
  december: "Kerstdiners, nieuwjaarsfeesten, eindejaarsborrels — 50% meer vraag",
};

function getSeizoenContext(): string {
  const maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  const huidigeMaand = maanden[new Date().getMonth()];
  return `Maand: ${huidigeMaand}. ${SEIZOEN_INFO[huidigeMaand] || ""}`;
}

async function getRandomTemplate(categorie?: LinkedInTemplateCategorie): Promise<LinkedInTemplate | null> {
  let query = supabaseAdmin
    .from("linkedin_templates")
    .select("*")
    .eq("is_active", true);

  if (categorie) query = query.eq("categorie", categorie);

  const { data } = await query;
  if (!data || data.length === 0) return null;

  return data[Math.floor(Math.random() * data.length)];
}

async function getTemplateById(id: string): Promise<LinkedInTemplate | null> {
  const { data } = await supabaseAdmin
    .from("linkedin_templates")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function generateLinkedInPost(options?: {
  categorie?: LinkedInTemplateCategorie;
  template_id?: string;
  context?: string;
}): Promise<{ content: string; hashtags: string[]; template_id?: string }> {
  // Get template
  let template: LinkedInTemplate | null = null;
  if (options?.template_id) {
    template = await getTemplateById(options.template_id);
  } else {
    template = await getRandomTemplate(options?.categorie);
  }

  const seizoenContext = getSeizoenContext();
  const categorie = template?.categorie || options?.categorie || "tip";

  const systemPrompt = `${BRAND_VOICE_SHORT}

Je bent een LinkedIn content creator voor TopTalent Jobs (horeca uitzendbureau).
Schrijf een LinkedIn post in de categorie: ${categorie}

${template ? `Gebruik dit template als structuur (maar vul de variabelen creatief in):\n\n${template.template}\n\nVariabelen om in te vullen: ${template.variabelen.join(", ")}` : ""}

Regels:
- Minimaal 120 woorden, sweet spot 130-170 woorden
- Sterke hook in de eerste 2 regels (laat scrollen stoppen)
- Witregels tussen alinea's
- Korte alinea's: max 2-3 zinnen
- Eindig met een vraag of zachte CTA
- Max 2-3 emoji's
- Voeg 3-5 relevante hashtags toe onderaan
- Geen harde sales CTA
- Geen "Wist je dat...", "Wij bij TopTalent...", of "Het is weer zover..."

Antwoord ALLEEN in JSON:
{
  "content": "de volledige LinkedIn post tekst inclusief hashtags",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${seizoenContext}
${options?.context ? `\nExtra context: ${options.context}` : ""}
${template?.voorbeeld ? `\nVoorbeeldpost (ter inspiratie, niet kopiëren):\n${template.voorbeeld}` : ""}

Schrijf nu een LinkedIn post.`,
    },
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.8, maxTokens: 800 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    // Update template usage count
    if (template) {
      await supabaseAdmin
        .from("linkedin_templates")
        .update({ gebruik_count: (template.gebruik_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", template.id);
    }

    return {
      content: result.content || result.inhoud || "",
      hashtags: result.hashtags || [],
      template_id: template?.id,
    };
  } catch {
    // Fallback post
    return {
      content: `Vrijdagavond. Vol terras. En je enige ervaren kok belt zich ziek.\n\nWe kennen het verhaal. ${seizoenContext}\n\nBij TopTalent Jobs zien we het elke week. Goede mensen op de juiste plek — daar draait het om.\n\nHerkenbaar? Laat het weten in de comments.\n\n#horeca #horecapersoneel #TopTalentJobs`,
      hashtags: ["horeca", "horecapersoneel", "TopTalentJobs"],
      template_id: template?.id,
    };
  }
}

export async function convertBlogToLinkedIn(contentPostId: string): Promise<{
  content: string;
  hashtags: string[];
  link_url: string;
} | null> {
  const { data: blogPost } = await supabaseAdmin
    .from("content_posts")
    .select("*")
    .eq("id", contentPostId)
    .single();

  if (!blogPost) return null;

  const systemPrompt = `${BRAND_VOICE_SHORT}

Je krijgt een blogartikel van TopTalent Jobs. Schrijf een LinkedIn post die het artikel promoot.

Regels:
- De post moet op zichzelf waarde bieden (niet alleen "lees ons nieuwe artikel")
- Gebruik de kernboodschap van het artikel als hook
- 130-170 woorden
- Eindig met een hint naar het artikel ("Meer weten? Link in de comments")
- Max 2-3 emoji's, 3-5 hashtags

Antwoord ALLEEN in JSON:
{
  "content": "de LinkedIn post",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Titel: ${blogPost.titel}\n\nArtikel:\n${blogPost.inhoud?.substring(0, 2000)}`,
    },
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 600 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://toptalentjobs.nl";
    const slug = blogPost.slug || blogPost.id;

    return {
      content: result.content || "",
      hashtags: result.hashtags || [],
      link_url: `${siteUrl}/blog/${slug}`,
    };
  } catch {
    return null;
  }
}

export async function generateBatchPosts(
  count: number = 5,
  categorie?: LinkedInTemplateCategorie
): Promise<Array<{ content: string; hashtags: string[]; template_id?: string }>> {
  const results = [];
  const categories: LinkedInTemplateCategorie[] = categorie
    ? Array(count).fill(categorie)
    : ["tip", "case_study", "seizoen", "engagement", "behind_the_scenes"];

  for (let i = 0; i < Math.min(count, 10); i++) {
    const cat = categories[i % categories.length];
    const result = await generateLinkedInPost({ categorie: cat });
    results.push(result);
  }

  return results;
}
