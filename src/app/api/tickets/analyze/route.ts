import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { chatCompletion, isOpenAIConfigured } from "@/lib/openai";
import { sendEmail } from "@/lib/email-service";
import { checkRedisRateLimit, getClientIP, formRateLimit } from "@/lib/rate-limit-redis";

interface TicketSubmission {
  question: string;
  visitor_name?: string;
  visitor_email?: string;
}

interface AIAnalysis {
  priority: "high" | "medium" | "low";
  category: string;
  is_spam: boolean;
  similar_existing_question: string | null;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRedisRateLimit(`ticket:${clientIP}`, formRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Te veel aanvragen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const body: TicketSubmission = await request.json();

    if (!body.question || body.question.trim().length < 10) {
      return NextResponse.json(
        { error: "Vraag moet minimaal 10 tekens bevatten." },
        { status: 400 }
      );
    }

    if (body.question.trim().length > 1000) {
      return NextResponse.json(
        { error: "Vraag mag maximaal 1000 tekens bevatten." },
        { status: 400 }
      );
    }

    // 1. Save ticket to database
    const { data: ticket, error: insertError } = await supabaseAdmin
      .from("tickets")
      .insert({
        question: body.question.trim(),
        visitor_name: body.visitor_name?.trim() || null,
        visitor_email: body.visitor_email?.trim() || null,
        status: "new",
      })
      .select()
      .single();

    if (insertError || !ticket) {
      console.error("Ticket insert error:", insertError);
      return NextResponse.json(
        { error: "Kon vraag niet opslaan." },
        { status: 500 }
      );
    }

    // 2. Get existing FAQ questions for comparison
    const { data: existingFaqs } = await supabaseAdmin
      .from("faq_items")
      .select("id, question, category")
      .eq("status", "published")
      .order("priority", { ascending: false });

    const faqList = (existingFaqs || [])
      .map((f) => `- [${f.id}] ${f.question}`)
      .join("\n");

    // 3. AI Analysis
    let analysis: AIAnalysis | null = null;

    if (isOpenAIConfigured()) {
      try {
        const systemPrompt = `Je bent een assistent voor TopTalent Jobs, een horeca uitzendbureau. Analyseer de volgende vraag van een websitebezoeker.

Bepaal:
1. PRIORITEIT (high / medium / low):
   - high: De bezoeker wil NU personeel inhuren, heeft een acute behoefte, of vraagt een offerte aan. Dit is een potentiële klant met directe koopintentie.
   - medium: De bezoeker heeft een relevante vraag over diensten, kosten, of proces. Mogelijk toekomstige klant.
   - low: Algemene vraag, al beantwoord in bestaande FAQ's, of niet direct gerelateerd aan het inhuren van personeel.

2. CATEGORIE: Kies uit: "Kosten & Tarieven", "Hoe het werkt", "Functies & Personeel", "Contracten & Juridisch", "Locaties & Beschikbaarheid", "Voor horecamedewerkers", "Evenementen & Catering", "Kwaliteit & Screening", "Overig"

3. SPAM CHECK: Is dit spam of een onzinvraag? (true/false)

4. VERGELIJKBARE FAQ: Als de vraag al (deels) beantwoord wordt door een bestaande FAQ, geef dan het ID van de meest relevante FAQ terug uit onderstaande lijst. Geef null als er geen match is.

Bestaande FAQ's:
${faqList}

5. REDENERING: Geef in 1 zin uitleg waarom je deze prioriteit en categorie hebt gekozen.

Antwoord ALLEEN in valid JSON format:
{
  "priority": "high|medium|low",
  "category": "...",
  "is_spam": false,
  "similar_existing_question": "uuid-of-faq" of null,
  "reasoning": "..."
}`;

        const result = await chatCompletion(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: body.question.trim() },
          ],
          { temperature: 0.3, maxTokens: 500 }
        );

        // Parse JSON from response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]) as AIAnalysis;
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
        // Continue without AI analysis
      }
    }

    // 4. Update ticket with AI analysis
    const updateData: Record<string, unknown> = {};

    if (analysis) {
      updateData.ai_priority = analysis.priority;
      updateData.ai_category = analysis.category;
      updateData.ai_reasoning = analysis.reasoning;

      if (analysis.is_spam) {
        updateData.status = "spam";
      }

      if (analysis.similar_existing_question) {
        // Validate that the FAQ ID exists
        const { data: faqMatch } = await supabaseAdmin
          .from("faq_items")
          .select("id")
          .eq("id", analysis.similar_existing_question)
          .single();

        if (faqMatch) {
          updateData.ai_similar_faq_id = faqMatch.id;
        }
      }

      await supabaseAdmin
        .from("tickets")
        .update(updateData)
        .eq("id", ticket.id);
    }

    // 5. Send email notification for high-priority tickets
    if (analysis?.priority === "high" && !analysis.is_spam) {
      try {
        await sendEmail({
          from: "TopTalent Jobs <noreply@toptalentjobs.nl>",
          to: [process.env.NOTIFICATION_EMAIL || "info@toptalentjobs.nl"],
          subject: `🔴 High-priority FAQ ticket: ${body.question.slice(0, 60)}...`,
          html: `
            <h2>Nieuw high-priority ticket</h2>
            <p><strong>Vraag:</strong> ${body.question}</p>
            ${body.visitor_name ? `<p><strong>Naam:</strong> ${body.visitor_name}</p>` : ""}
            ${body.visitor_email ? `<p><strong>Email:</strong> ${body.visitor_email}</p>` : ""}
            <p><strong>AI Categorie:</strong> ${analysis.category}</p>
            <p><strong>AI Redenering:</strong> ${analysis.reasoning}</p>
            <hr>
            <p><a href="https://www.toptalentjobs.nl/admin">Bekijk in admin dashboard</a></p>
          `,
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Bedankt! We beantwoorden je vraag zo snel mogelijk.",
    });
  } catch (error) {
    console.error("Ticket analyze error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer het later opnieuw." },
      { status: 500 }
    );
  }
}
