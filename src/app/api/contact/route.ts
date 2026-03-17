import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { checkRedisRateLimit, formRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendTelegramAlert } from "@/lib/telegram";
import { contactSchema, formatZodErrors } from "@/lib/validations";
import { escapeHtml } from "@/lib/sanitize";

interface ContactFormData {
  naam: string;
  email: string;
  telefoon?: string;
  onderwerp: string;
  bericht: string;
  recaptchaToken?: string;
  // Lead tracking
  leadSource?: string;
  campaignName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 5 requests per minute per IP
    const clientIP = getClientIP(request);
    const rateLimit = await checkRedisRateLimit(`contact:${clientIP}`, formRateLimit);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het zo opnieuw." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const data: ContactFormData = await request.json();

    // Zod validatie
    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    // Verify reCAPTCHA - verplicht in productie, overgeslagen in development
    if (process.env.NODE_ENV === "development") {
      console.log("[DEV] reCAPTCHA check skipped in development mode");
    } else {
      if (!data.recaptchaToken) {
        console.warn("[SECURITY] Contact form submission without reCAPTCHA token");
        return NextResponse.json(
          { error: "reCAPTCHA verificatie vereist" },
          { status: 400 }
        );
      }

      const recaptchaResult = await verifyRecaptcha(data.recaptchaToken);
      if (!recaptchaResult.success) {
        console.warn("[SECURITY] Contact form reCAPTCHA verification failed");
        return NextResponse.json(
          { error: recaptchaResult.error || "Spam detectie mislukt" },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!data.naam || !data.email || !data.onderwerp || !data.bericht) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in" },
        { status: 400 }
      );
    }

    // Format the email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nieuw Contactbericht</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 30%;">Naam:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.naam)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">E-mail:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="mailto:${escapeHtml(data.email)}" style="color: #F27501;">${escapeHtml(data.email)}</a>
                </td>
              </tr>
              ${data.telefoon ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Telefoon:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="tel:${escapeHtml(data.telefoon)}" style="color: #F27501;">${escapeHtml(data.telefoon)}</a>
                </td>
              </tr>
              ` : ""}
              <tr>
                <td style="padding: 8px 0; color: #666;">Onderwerp:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.onderwerp)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; vertical-align: top;">Bericht:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500; white-space: pre-wrap;">${escapeHtml(data.bericht)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            Dit bericht is verzonden via het contactformulier op toptalentjobs.nl
          </p>
        </div>
      </div>
    `;

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: "TopTalent Jobs <noreply@toptalentjobs.nl>",
        to: ["info@toptalentjobs.nl"],
        replyTo: data.email,
        subject: `Contact: ${data.onderwerp} - ${data.naam}`,
        html: emailHtml,
      });

      if (error) {
        console.error("Resend error:", error);
      }
    }

    // Opslaan in Supabase
    const { error: dbError } = await supabase.from("contact_berichten").insert({
      naam: data.naam,
      email: data.email,
      telefoon: data.telefoon || null,
      onderwerp: data.onderwerp,
      bericht: data.bericht,
      // Lead tracking
      lead_source: data.leadSource || 'website',
      campaign_name: data.campaignName || null,
      utm_source: data.utmSource || null,
      utm_medium: data.utmMedium || null,
      utm_campaign: data.utmCampaign || null,
    });

    if (dbError) {
      console.error("Supabase error:", dbError);
      return NextResponse.json(
        { error: "Fout bij opslaan bericht" },
        { status: 500 }
      );
    }

    // Send Telegram alert
    sendTelegramAlert(
      `📧 <b>NIEUW CONTACTBERICHT!</b>\n\n` +
      `👤 ${data.naam}\n` +
      `📧 ${data.email}\n` +
      `${data.telefoon ? `📞 ${data.telefoon}\n` : ''}` +
      `💬 ${data.onderwerp}\n\n` +
      `"${data.bericht.substring(0, 100)}${data.bericht.length > 100 ? '...' : ''}"`
    ).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
