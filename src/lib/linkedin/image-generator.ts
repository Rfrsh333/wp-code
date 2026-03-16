import "server-only";

import path from "path";
import { chatCompletion, type ChatMessage } from "@/lib/openai";
import { generateAiImage } from "@/lib/ai/openai-image-client";
import { applyEditorialHeroBranding } from "@/lib/images/hero-branding";
import { supabaseAdmin } from "@/lib/supabase";

const LINKEDIN_BUCKET = "editorial-images";
const LINKEDIN_WIDTH = 1200;
const LINKEDIN_HEIGHT = 627;

function getLogoPath(): string {
  return path.join(process.cwd(), "public", "logo.png");
}

async function generateImagePrompt(postContent: string): Promise<string> {
  const systemPrompt = `Je bent een image prompt specialist. Genereer een korte, beschrijvende prompt (1-2 zinnen, Engels) voor een stockfoto-achtige afbeelding die past bij een LinkedIn post van een horeca uitzendbureau.

Regels:
- Fotorealistisch, DSLR-stijl, natuurlijk licht
- Focus op horeca-settings: restaurants, keukens, terrassen, bars, evenementen, teams
- Menselijke elementen: handen aan het werk, teaminteractie, gastvrijheid
- Warme, uitnodigende sfeer
- GEEN tekst, logo's, watermerken of overlays in de afbeelding
- Laat de onderste 30% van de afbeelding relatief rustig/donker (daar komt een gradient overheen)
- Nederlandse/Europese uitstraling

Antwoord ALLEEN met de prompt tekst, geen JSON of extra uitleg.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `LinkedIn post:\n${postContent.substring(0, 500)}` },
  ];

  try {
    const prompt = await chatCompletion(messages, { temperature: 0.7, maxTokens: 200 });
    return prompt.trim();
  } catch {
    return "Professional Dutch hospitality team working together in a warm restaurant setting, natural lighting, Canon EOS R5 style photography, shallow depth of field";
  }
}

export async function generateLinkedInImage(postContent: string, postId: string): Promise<string | null> {
  try {
    // 1. Generate image prompt based on post content
    const imagePrompt = await generateImagePrompt(postContent);
    console.log(`[LinkedIn Image] Prompt: ${imagePrompt.substring(0, 100)}...`);

    // 2. Generate AI image
    const rawImageBuffer = await generateAiImage(imagePrompt);

    // 3. Apply TopTalent branding (orange gradient + logo)
    const brandedBuffer = await applyEditorialHeroBranding(rawImageBuffer, {
      logoPath: getLogoPath(),
      outputWidth: LINKEDIN_WIDTH,
      outputHeight: LINKEDIN_HEIGHT,
    });

    // 4. Upload to Supabase Storage
    const timestamp = Date.now();
    const storagePath = `linkedin/${postId}/${timestamp}/branded.webp`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(LINKEDIN_BUCKET)
      .upload(storagePath, brandedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("[LinkedIn Image] Upload error:", uploadError);
      return null;
    }

    // 5. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(LINKEDIN_BUCKET)
      .getPublicUrl(storagePath);

    const imageUrl = urlData?.publicUrl || null;

    // 6. Update post with image URL
    if (imageUrl) {
      await supabaseAdmin
        .from("linkedin_posts")
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq("id", postId);
    }

    console.log(`[LinkedIn Image] Generated for post ${postId}`);
    return imageUrl;
  } catch (error) {
    console.error("[LinkedIn Image] Generation error:", error);
    return null;
  }
}
