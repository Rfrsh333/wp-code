import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { bulkEmailPostSchema, validateAdminBody } from "@/lib/validations-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limiting: max 50 emails per request, max 3 requests per hour
const MAX_EMAILS_PER_REQUEST = 50;
const BATCH_SIZE = 10; // Send in batches of 10 to avoid overwhelming the email service
const DELAY_BETWEEN_BATCHES_MS = 2000; // 2 seconds between batches

interface BulkEmailRequest {
  kandidaat_ids: string[];
  template: "onboarding_update" | "document_request" | "approved" | "custom";
  customSubject?: string;
  customMessage?: string;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const { isAdmin, email: adminEmail } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rawBody = await request.json();
    const validation = validateAdminBody(bulkEmailPostSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { kandidaat_ids, template, customSubject, customMessage } = validation.data;

    // Fetch kandidaten
    const { data: kandidaten, error: fetchError } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, voornaam, achternaam, email, onboarding_status")
      .in("id", kandidaat_ids);

    if (fetchError || !kandidaten) {
      return NextResponse.json({ error: "Fout bij ophalen kandidaten" }, { status: 500 });
    }

    // Prepare email templates
    const getEmailContent = (kandidaat: typeof kandidaten[0]) => {
      switch (template) {
        case "onboarding_update":
          return {
            subject: `Update over je inschrijving bij TopTalent`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">TopTalent Jobs</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <p>Beste ${kandidaat.voornaam},</p>
                  <p>We willen je op de hoogte brengen van je inschrijving bij TopTalent.</p>
                  <p>Je huidige status: <strong>${kandidaat.onboarding_status || 'nieuw'}</strong></p>
                  <p>We nemen binnenkort contact met je op voor de volgende stappen.</p>
                  <p>Heb je vragen? Neem gerust contact met ons op via <a href="mailto:info@toptalentjobs.nl">info@toptalentjobs.nl</a>.</p>
                  <p>Met vriendelijke groet,<br>Team TopTalent</p>
                </div>
              </div>
            `,
          };
        case "document_request":
          return {
            subject: `Documenten nodig voor je inschrijving`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">TopTalent Jobs</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <p>Beste ${kandidaat.voornaam},</p>
                  <p>Om je inschrijving verder te verwerken, hebben we nog enkele documenten van je nodig.</p>
                  <p>We nemen binnenkort contact met je op om deze aan te leveren.</p>
                  <p>Met vriendelijke groet,<br>Team TopTalent</p>
                </div>
              </div>
            `,
          };
        case "approved":
          return {
            subject: `🎉 Je inschrijving is goedgekeurd!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">TopTalent Jobs</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <p>Beste ${kandidaat.voornaam},</p>
                  <p>Goed nieuws! Je inschrijving bij TopTalent is goedgekeurd! 🎉</p>
                  <p>We nemen binnenkort contact met je op voor de volgende stappen.</p>
                  <p>Welkom bij TopTalent!</p>
                  <p>Met vriendelijke groet,<br>Team TopTalent</p>
                </div>
              </div>
            `,
          };
        case "custom":
          return {
            subject: customSubject || "Bericht van TopTalent",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">TopTalent Jobs</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <p>Beste ${kandidaat.voornaam},</p>
                  ${customMessage ? `<p>${customMessage}</p>` : ""}
                  <p>Met vriendelijke groet,<br>Team TopTalent</p>
                </div>
              </div>
            `,
          };
        default:
          throw new Error("Unknown template");
      }
    };

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails in batches
    for (let i = 0; i < kandidaten.length; i += BATCH_SIZE) {
      const batch = kandidaten.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (kandidaat) => {
        try {
          const { subject, html } = getEmailContent(kandidaat);

          const { error } = await resend.emails.send({
            from: "TopTalent Jobs <info@toptalentjobs.nl>",
            to: [kandidaat.email],
            subject,
            html,
          });

          if (error) {
            failed++;
            errors.push(`${kandidaat.email}: Verzenden mislukt`);
            console.error(`Email error for ${kandidaat.email}:`, error);
          } else {
            sent++;
          }
        } catch (error) {
          failed++;
          errors.push(`${kandidaat.email}: Verzenden mislukt`);
          console.error(`Email error for ${kandidaat.email}:`, error);
        }
      });

      await Promise.all(promises);

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < kandidaten.length) {
        await delay(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors: failed > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk email error:", error);
    return NextResponse.json(
      { error: "Fout bij verzenden bulk emails" },
      { status: 500 }
    );
  }
}
