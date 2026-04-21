import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { checkRedisRateLimit, formRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendTelegramAlert } from "@/lib/telegram";
import { generateAutoReply, generateAutoReplySubject } from "@/lib/inquiry-auto-reply";
import { buildAutoReplyEmailHtml } from "@/lib/email-templates";
import { getOfferteAutoMode } from "@/lib/agents/offerte-generator";
import { escapeHtml } from "@/lib/sanitize";
import { personeelAanvraagSchema, formatZodErrors } from "@/lib/validations";

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
  // Lead tracking
  leadSource?: string;
  campaignName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referralCode?: string;
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
    const rateLimit = await checkRedisRateLimit(`personeel:${clientIP}`, formRateLimit);

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

    const rawData = await request.json();

    // Zod validatie
    const parsed = personeelAanvraagSchema.safeParse(rawData);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }
    const data: FormData = parsed.data as FormData;

    // Verify reCAPTCHA - verplicht in productie, overgeslagen in development
    if (process.env.NODE_ENV === "development") {
      console.log("[DEV] reCAPTCHA check skipped in development mode");
    } else {
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
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.bedrijfsnaam)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Contactpersoon:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.contactpersoon)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">E-mail:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="mailto:${escapeHtml(data.email)}" style="color: #F27501;">${escapeHtml(data.email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Telefoon:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="tel:${escapeHtml(data.telefoon)}" style="color: #F27501;">${escapeHtml(data.telefoon)}</a>
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
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.typePersoneel.map(t => escapeHtml(t)).join(", ")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Aantal personen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.aantalPersonen)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Contractvorm:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.contractType.map(ct => escapeHtml(contractTypeLabels[ct] || ct)).join(", ")}</td>
              </tr>
              ${data.gewenstUurtarief ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Gewenst uurtarief:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">&euro;${escapeHtml(data.gewenstUurtarief)} per uur</td>
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
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.startDatum)}</td>
              </tr>
              ${data.eindDatum ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Einddatum:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.eindDatum)}</td>
              </tr>
              ` : ""}
              <tr>
                <td style="padding: 8px 0; color: #666;">Werkdagen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${data.werkdagen.map(d => escapeHtml(d)).join(", ")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Werktijden:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.werktijden)}</td>
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
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.locatie)}</td>
              </tr>
              ${data.opmerkingen ? `
              <tr>
                <td style="padding: 8px 0; color: #666; vertical-align: top;">Opmerkingen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(data.opmerkingen)}</td>
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

    // 1. DB insert EERST — dit is de primaire operatie
    const { data: savedAanvraag, error: dbError } = await supabase.from("personeel_aanvragen").insert({
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
      status: 'nieuw', // BELANGRIJK: status voor dashboard
      // Lead tracking
      lead_source: data.leadSource || 'website',
      campaign_name: data.campaignName || null,
      utm_source: data.utmSource || null,
      utm_medium: data.utmMedium || null,
      utm_campaign: data.utmCampaign || null,
      referral_code: data.referralCode || null,
    }).select().single();

    if (dbError) {
      console.error("[DATABASE ERROR] Failed to save personeel aanvraag to Supabase:", dbError);
      console.error("[DATABASE ERROR] Request data:", JSON.stringify({
        bedrijfsnaam: data.bedrijfsnaam,
        email: data.email,
        timestamp: new Date().toISOString()
      }));

      // Stuur Telegram alert met database error waarschuwing
      sendTelegramAlert(
        `⚠️ <b>PERSONEEL AANVRAAG DATABASE ERROR</b>\n\n` +
        `🏢 ${data.bedrijfsnaam}\n` +
        `👤 ${data.contactpersoon}\n` +
        `📧 ${data.email}\n` +
        `📞 ${data.telefoon}\n\n` +
        `⚠️ <b>Data is NIET opgeslagen in Supabase.</b>\n` +
        `Error: ${dbError.message || JSON.stringify(dbError)}`
      ).catch(console.error);

      return NextResponse.json(
        { error: "Er is een fout opgetreden bij het opslaan. Probeer het later opnieuw." },
        { status: 500 }
      );
    }

    // 2. Admin email — non-blocking (falen blokkeert aanvraag niet)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from: "TopTalent Jobs <info@toptalentjobs.nl>",
          to: ["info@toptalentjobs.nl"],
          replyTo: data.email,
          subject: `Nieuwe personeel aanvraag - ${data.bedrijfsnaam}`,
          html: emailHtml,
        });
        if (error) {
          console.error("Resend admin email error:", JSON.stringify(error, null, 2));
        }
      } catch (emailErr) {
        console.error("Admin email error:", emailErr);
      }
    } else if (process.env.NODE_ENV !== "development") {
      console.warn("RESEND_API_KEY niet geconfigureerd — admin email overgeslagen");
    }

    // 3. Achtergrondtaken: referral tracking, telegram, auto-reply, offerte generatie
    // Deze draaien NA de response zodat de gebruiker niet hoeft te wachten
    after(async () => {
      try {
        // Referral tracking: koppel aan referrer
        if (data.referralCode) {
          try {
            await supabase.from("referrals")
              .update({
                referred_naam: data.bedrijfsnaam,
                referred_email: data.email,
              })
              .eq("referral_code", data.referralCode)
              .eq("status", "pending")
              .is("referred_id", null);
          } catch (refError) {
            console.error("Referral tracking error:", refError);
          }
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

        // Auto-reply: check of het is ingeschakeld en stuur automatisch een reactie
        try {
          const { data: autoReplySetting } = await supabase
            .from("admin_settings")
            .select("value")
            .eq("key", "auto_reply_enabled")
            .single();

          if (autoReplySetting?.value === "true" && process.env.RESEND_API_KEY) {
            const { data: senderSettings } = await supabase
              .from("admin_settings")
              .select("key, value")
              .in("key", ["sender_name", "sender_email"]);

            const sMap = Object.fromEntries((senderSettings || []).map((s) => [s.key, s.value]));
            const arSenderEmail = sMap.sender_email || "info@toptalentjobs.nl";
            const arSenderName = sMap.sender_name || "TopTalent Jobs";

            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl";
            const savedId = (await supabase
              .from("personeel_aanvragen")
              .select("id")
              .eq("email", data.email)
              .eq("bedrijfsnaam", data.bedrijfsnaam)
              .order("created_at", { ascending: false })
              .limit(1)
              .single())?.data?.id;

            const bookingUrl = `${baseUrl}/afspraak-plannen${savedId ? `?ref=${savedId}` : ""}`;

            const emailBody = generateAutoReply(
              {
                id: savedId || "",
                contactpersoon: data.contactpersoon,
                bedrijfsnaam: data.bedrijfsnaam,
                email: data.email,
                type_personeel: data.typePersoneel,
                aantal_personen: data.aantalPersonen,
                start_datum: data.startDatum,
                eind_datum: data.eindDatum || null,
                opmerkingen: data.opmerkingen || null,
                locatie: data.locatie,
              },
              { senderName: arSenderName, bookingUrl },
            );

            const htmlContent = buildAutoReplyEmailHtml(emailBody, bookingUrl);

            const arResend = new Resend(process.env.RESEND_API_KEY);
            const { data: arEmailData } = await arResend.emails.send({
              from: `${arSenderName} <${arSenderEmail}>`,
              to: [data.email],
              subject: generateAutoReplySubject(),
              html: htmlContent,
            });

            if (savedId && arEmailData?.id) {
              await supabase
                .from("personeel_aanvragen")
                .update({
                  replied_at: new Date().toISOString(),
                  reply_email_id: arEmailData.id,
                })
                .eq("id", savedId);
            }
          }
        } catch (autoReplyErr) {
          console.error("Auto-reply error:", autoReplyErr);
        }

        // Auto offerte generatie
        const autoMode = getOfferteAutoMode();
        if (autoMode !== "off" && savedAanvraag?.id) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
            const cronSecret = process.env.CRON_SECRET;
            if (cronSecret) {
              const offerteRes = await fetch(`${baseUrl}/api/admin/ai/offerte-generator`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${cronSecret}`,
                },
                body: JSON.stringify({ aanvraag_id: savedAanvraag.id }),
              });

              if (offerteRes.ok && autoMode === "send") {
                await fetch(`${baseUrl}/api/offerte/send`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${cronSecret}`,
                  },
                  body: JSON.stringify({ aanvraagId: savedAanvraag.id }),
                });
              }
            }
          } catch (offerteErr) {
            console.error("Auto offerte generatie error:", offerteErr);
          }
        }
      } catch (bgErr) {
        console.error("Background tasks error:", bgErr);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
