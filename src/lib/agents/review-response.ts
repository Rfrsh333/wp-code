import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";

interface ReviewInput {
  reviewerNaam: string;
  score: number;
  tekst: string;
}

export async function generateReviewResponse(input: ReviewInput): Promise<string> {
  const isPositief = input.score >= 4;

  if (!isOpenAIConfigured()) {
    if (isPositief) {
      return `Beste ${input.reviewerNaam},\n\nHartelijk dank voor uw mooie review en het vertrouwen in TopTalent Jobs! Het doet ons goed om te horen dat u tevreden bent over onze dienstverlening. Wij streven er altijd naar om het beste horecapersoneel te leveren.\n\nMet vriendelijke groet,\nTeam TopTalent Jobs`;
    }
    return `Beste ${input.reviewerNaam},\n\nDank u voor het delen van uw ervaring. Het spijt ons te horen dat onze dienstverlening niet aan uw verwachtingen voldeed. Wij nemen uw feedback zeer serieus en zouden graag persoonlijk contact met u opnemen om dit te bespreken.\n\nU kunt ons bereiken via info@toptalentjobs.nl of 030-xxx xxxx.\n\nMet vriendelijke groet,\nTeam TopTalent Jobs`;
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Je bent de klantenservice manager van TopTalent Jobs, een horeca uitzendbureau.
Schrijf een professioneel maar warm antwoord op een Google Review.

Regels:
- ${isPositief ? "POSITIEF (4-5 sterren): Bedank de reviewer, refereer aan specifieke punten uit hun review, eindig met uitnodiging om opnieuw samen te werken." : "NEGATIEF (1-3 sterren): Erken het probleem empathisch, bied excuses aan, geef concrete oplossing, nodig uit voor persoonlijk contact (email/telefoon)."}
- Maximaal 4-5 zinnen
- Noem de reviewer bij naam
- Onderteken als "Team TopTalent Jobs"
- Geen emojis
- Nederlands

Antwoord met ALLEEN de reactietekst, geen JSON of andere formatting.`
    },
    {
      role: "user",
      content: `Reviewer: ${input.reviewerNaam}\nScore: ${input.score}/5 sterren\nReview: "${input.tekst}"`
    }
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 250 });
    return response.trim();
  } catch {
    return isPositief
      ? `Beste ${input.reviewerNaam}, hartelijk dank voor uw positieve review! Wij waarderen uw feedback enorm. Met vriendelijke groet, Team TopTalent Jobs`
      : `Beste ${input.reviewerNaam}, dank u voor uw feedback. Wij betreuren dat uw ervaring niet optimaal was en nemen contact met u op. Met vriendelijke groet, Team TopTalent Jobs`;
  }
}
