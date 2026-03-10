import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Base layout voor alle kandidaat emails - consistent oranje gradient design
function getEmailLayout(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f8f8f8;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
          }
          .header {
            background: linear-gradient(135deg, #F27501 0%, #d96800 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: white;
            margin: 0;
          }
          .content {
            padding: 40px 30px;
            color: #333;
            line-height: 1.6;
          }
          .card {
            background: #fff;
            border: 2px solid #f0f0f0;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
          }
          .cta-button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #F27501 0%, #d96800 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(242, 117, 1, 0.3);
          }
          .footer {
            padding: 30px;
            text-align: center;
            color: #999;
            font-size: 14px;
            border-top: 1px solid #eee;
          }
          h1 {
            color: #F27501;
            font-size: 24px;
            margin: 0 0 20px 0;
          }
          p {
            margin: 16px 0;
          }
          .emoji {
            font-size: 32px;
            display: block;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">TopTalent</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p><strong>TopTalent Jobs</strong></p>
            <p>
              📧 <a href="mailto:info@toptalentjobs.nl" style="color: #F27501;">info@toptalentjobs.nl</a><br>
              📱 <a href="tel:+31649713766" style="color: #F27501;">+31 6 49 71 37 66</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #aaa;">
              © ${new Date().getFullYear()} TopTalent Jobs. Alle rechten voorbehouden.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

interface Kandidaat {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  uitbetalingswijze: string;
}

// 1. Intake bevestiging - Losser en geruststellend
export async function sendIntakeBevestiging(kandidaat: Kandidaat) {
  const statusUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/kandidaat/status?token=${generateStatusToken(kandidaat.email, kandidaat.id)}`;

  const content = `
    <span class="emoji">👋</span>

    <h1>Hey ${kandidaat.voornaam}, welkom bij TopTalent!</h1>

    <p>
      Top dat je je hebt ingeschreven! We hebben je gegevens binnen en gaan er zo mee aan de slag.
    </p>

    <div class="card">
      <p><strong>Wat gebeurt er nu?</strong></p>
      <ul style="margin: 12px 0; padding-left: 20px;">
        <li>We checken je profiel (duurt meestal 1-2 werkdagen)</li>
        <li>Als we nog wat nodig hebben, hoor je van ons</li>
        <li>Zodra je goedgekeurd bent, gaan we matches voor je zoeken! 🎯</li>
      </ul>
    </div>

    <p>
      Je kunt je status altijd live volgen via onderstaande link:
    </p>

    <center>
      <a href="${statusUrl}" class="cta-button">
        📊 Bekijk je status
      </a>
    </center>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Vragen? Gewoon appen of mailen, we helpen je graag! 💬
    </p>
  `;

  const result = await resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: `Hey ${kandidaat.voornaam}! 👋 Je inschrijving is binnen`,
    html: getEmailLayout(content),
  });

  return result;
}

// 2. Documenten verzoek - Upbeat en duidelijk
export async function sendDocumentenVerzoek(kandidaat: Kandidaat) {
  const uploadToken = await generateAndSaveUploadToken(kandidaat.id);
  const uploadUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/kandidaat/documenten?token=${uploadToken}`;

  const isZZP = kandidaat.uitbetalingswijze === "zzp";

  const content = `
    <span class="emoji">📄</span>

    <h1>Goed nieuws ${kandidaat.voornaam}! 🎉</h1>

    <p>
      Je profiel ziet er goed uit! Om verder te gaan hebben we alleen nog een paar documenten nodig.
      Geen zorgen, dit duurt maar 2 minuten. 😊
    </p>

    <div class="card">
      <p><strong>Dit hebben we nodig:</strong></p>
      <ul style="margin: 12px 0; padding-left: 20px;">
        <li>📸 <strong>Geldig identiteitsbewijs</strong> (paspoort of ID-kaart)</li>
        <li>📝 <strong>CV</strong> (mag kort, gewoon je ervaring)</li>
        ${isZZP ? '<li>🏢 <strong>KVK uittreksel</strong> (niet ouder dan 3 maanden)</li>' : ''}
      </ul>
      <p style="margin-top: 16px; font-size: 14px; color: #666;">
        💡 <strong>Tip:</strong> Maak gewoon een foto met je telefoon - hoeft niet super professioneel!
      </p>
    </div>

    <p>
      Upload je documenten hier:
    </p>

    <center>
      <a href="${uploadUrl}" class="cta-button">
        📤 Upload documenten (2 min)
      </a>
    </center>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      🔒 Deze link is beveiligd en 7 dagen geldig.<br>
      Nadat we alles hebben, ben je zo goedgekeurd! 🚀
    </p>
  `;

  const result = await resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: `${kandidaat.voornaam}, we hebben je documenten nodig! 📄`,
    html: getEmailLayout(content),
  });

  return result;
}

// 3. Welkomst mail - "Yes, je bent klaar" vibe
export async function sendWelkomstmail(kandidaat: Kandidaat) {
  const statusUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/kandidaat/status?token=${generateStatusToken(kandidaat.email, kandidaat.id)}`;

  const content = `
    <span class="emoji">🎉</span>

    <h1>Yes ${kandidaat.voornaam}, je bent inzetbaar!</h1>

    <p style="font-size: 18px; color: #F27501; font-weight: 600;">
      Welkom in het team! 🙌
    </p>

    <p>
      Je bent officieel goedgekeurd en klaar voor inzet. Vanaf nu kunnen we je matchen
      met gave opdrachten in de horeca!
    </p>

    <div class="card">
      <p><strong>Wat nu?</strong></p>
      <p>
        We gaan actief voor je uitkijken naar shifts die bij jou passen. Zodra we iets hebben:
      </p>
      <ul style="margin: 12px 0; padding-left: 20px;">
        <li>📞 Bellen we je of sturen een berichtje</li>
        <li>📅 Matchen we je met een leuke opdracht</li>
        <li>💰 Regel je snel je eerste shift!</li>
      </ul>
    </div>

    <p>
      Houd je telefoon in de gaten - je eerste match kan zomaar binnenkomen! 📱
    </p>

    <center>
      <a href="${statusUrl}" class="cta-button">
        🚀 Bekijk je profiel
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 18px; text-align: center;">
      <strong>Let's go! 🔥</strong>
    </p>

    <p style="margin-top: 20px; color: #666; font-size: 14px; text-align: center;">
      Vragen? We zijn er! Bel, app of mail ons. 💬
    </p>
  `;

  const result = await resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: `🎉 ${kandidaat.voornaam}, je bent inzetbaar!`,
    html: getEmailLayout(content),
  });

  return result;
}

// Helper functions voor token generation
function generateStatusToken(email: string, kandidaatId: string): string {
  const secret = process.env.KANDIDAAT_TOKEN_SECRET || "fallback-secret";
  const crypto = require("crypto");
  const data = `${email}:${kandidaatId}:${secret}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

// 🚀 Optimized: Generate token and save to database for O(1) lookup
export async function generateAndSaveUploadToken(kandidaatId: string, expiryDays = 7): Promise<string> {
  const { supabaseAdmin } = await import("@/lib/supabase");
  const crypto = require("crypto");

  // Generate random secure token
  const token = crypto.randomBytes(32).toString("hex").substring(0, 32);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  // Save to database
  await supabaseAdmin
    .from("inschrijvingen")
    .update({
      onboarding_portal_token: token,
      onboarding_portal_token_expires_at: expiresAt.toISOString(),
    })
    .eq("id", kandidaatId);

  return token;
}

// Legacy function (deprecated but kept for backwards compatibility)
function generateUploadToken(kandidaatId: string, expiryDays = 7): string {
  const secret = process.env.KANDIDAAT_TOKEN_SECRET || "fallback-secret";
  const crypto = require("crypto");
  const expiryDate = Date.now() + expiryDays * 24 * 60 * 60 * 1000;
  const data = `${kandidaatId}:${expiryDate}:${secret}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

// Email logging helper met Resend tracking
export async function logEmail(
  kandidaatId: string,
  emailType: "bevestiging" | "documenten_opvragen" | "inzetbaar",
  recipient: string,
  subject: string,
  resendEmailId?: string
) {
  const { supabaseAdmin } = await import("@/lib/supabase");

  await supabaseAdmin.from("email_log").insert({
    kandidaat_id: kandidaatId,
    email_type: emailType,
    recipient,
    subject,
    sent_at: new Date().toISOString(),
    status: "sent",
    resend_email_id: resendEmailId || null,
  });
}
