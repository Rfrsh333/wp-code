import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendTelegramAlert } from "@/lib/telegram";

interface FormData {
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  typePersoneel: string[];
  aantalPersonen: string;
  contractType: string[];
  gewenstUurtarief: string;
  startDatum: string;
  eindDatum: string;
  werkdagen: string[];
  werktijden: string;
  locatie: string;
  opmerkingen: string;
  recaptchaToken?: string;
}

const contractTypeLabels: Record<string, string> = {
  zzp: "ZZP'er",
  loondienst: "Loondienst",
  uitzendkracht: "Uitzendkracht",
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 5 requests per minute per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`personeel:${clientIP}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Te veel verzoeken. Probeer opnieuw over ${rateLimit.resetIn} seconden.` },
        { status: 429 }
      );
    }

    const data: FormData = await request.json();

    // KRITIEK: Verify reCAPTCHA - VERPLICHT (was optioneel, nu required)
    if (!data.recaptchaToken) {
      console.warn("[SECURITY] Personeel-aanvragen form submission without reCAPTCHA token");
      return NextResponse.json(
        { error: "reCAPTCHA verificatie vereist" },
        { status: 400 }
      );
    }

    const recaptchaResult = await verifyRecaptcha(data.recaptchaToken);
    if (!recaptchaResult.success) {
      console.warn("[SECURITY] Personeel-aanvragen form reCAPTCHA verification failed");
      return NextResponse.json(
        { error: recaptchaResult.error || "Spam detectie mislukt" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!data.bedrijfsnaam || !data.contactpersoon || !data.email || !data.telefoon) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in" },
        { status: 400 }
      );
    }

    // Format the email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nieuwe Personeel Aanvraag</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Bedrijfsgegevens
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Bedrijfsnaam:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.bedrijfsnaam}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Contactpersoon:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.contactpersoon}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">E-mail:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="mailto:${data.email}" style="color: #F27501;">${data.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Telefoon:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="tel:${data.telefoon}" style="color: #F27501;">${data.telefoon}</a>
                </td>
              </tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Personeelsbehoefte
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Type personeel:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.typePersoneel.join(", ")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Aantal personen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.aantalPersonen}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Contractvorm:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.contractType.map(ct => contractTypeLabels[ct] || ct).join(", ")}</td>
              </tr>
              ${data.gewenstUurtarief ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Gewenst uurtarief:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">€${data.gewenstUurtarief} per uur</td>
              </tr>
              ` : ""}
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Planning
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Startdatum:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.startDatum}</td>
              </tr>
              ${data.eindDatum ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Einddatum:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.eindDatum}</td>
              </tr>
              ` : ""}
              <tr>
                <td style="padding: 8px 0; color: #666;">Werkdagen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.werkdagen.join(", ")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Werktijden:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.werktijden}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Extra informatie
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Locatie:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.locatie}</td>
              </tr>
              ${data.opmerkingen ? `
              <tr>
                <td style="padding: 8px 0; color: #666; vertical-align: top;">Opmerkingen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.opmerkingen}</td>
              </tr>
              ` : ""}
            </table>
          </div>
        </div>

        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            Dit bericht is automatisch verzonden via het personeel aanvraag formulier op toptalentjobs.nl
          </p>
        </div>
      </div>
    `;

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set - email would be sent:", data.bedrijfsnaam);
      // Return success for testing without API key
      return NextResponse.json({ success: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log("Attempting to send email from info@toptalentjobs.nl");

    const { data: emailData, error } = await resend.emails.send({
      from: "TopTalent Jobs <info@toptalentjobs.nl>",
      to: ["info@toptalentjobs.nl"],
      replyTo: data.email,
      subject: `Nieuwe personeel aanvraag - ${data.bedrijfsnaam}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error details:", JSON.stringify(error, null, 2));
      console.error("Resend error type:", typeof error);
      console.error("Resend error keys:", Object.keys(error));

      return NextResponse.json(
        { error: "Fout bij verzenden e-mail. Probeer het later opnieuw.", details: error.message || String(error) },
        { status: 500 }
      );
    }

    console.log("Email successfully sent! ID:", emailData?.id);

    // Opslaan in Supabase
    const { error: dbError } = await supabase.from("personeel_aanvragen").insert({
      bedrijfsnaam: data.bedrijfsnaam,
      contactpersoon: data.contactpersoon,
      email: data.email,
      telefoon: data.telefoon,
      type_personeel: data.typePersoneel,
      aantal_personen: data.aantalPersonen,
      contract_type: data.contractType,
      gewenst_uurtarief: data.gewenstUurtarief ? parseFloat(data.gewenstUurtarief) : null,
      start_datum: data.startDatum,
      eind_datum: data.eindDatum || null,
      werkdagen: data.werkdagen,
      werktijden: data.werktijden,
      locatie: data.locatie,
      opmerkingen: data.opmerkingen || null,
    });

    if (dbError) {
      console.error("Supabase error:", dbError);
      // We laten de request toch slagen want de email is al verstuurd
    }

    // Send Telegram alert
    sendTelegramAlert(
      `👥 <b>NIEUWE PERSONEEL AANVRAAG!</b>\n\n` +
      `🏢 ${data.bedrijfsnaam}\n` +
      `👤 ${data.contactpersoon}\n` +
      `📧 ${data.email}\n` +
      `📞 ${data.telefoon}\n\n` +
      `💼 ${data.typePersoneel.join(', ')}\n` +
      `📊 ${data.aantalPersonen} personen\n` +
      `📍 ${data.locatie}\n` +
      `📅 Start: ${data.startDatum}`
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
