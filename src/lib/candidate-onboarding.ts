import crypto from "crypto";
import { Resend } from "resend";
import {
  applyCandidateEmailVars,
  candidateEmailCopy,
  getDocumentChecklist,
} from "@/content/candidateEmails";
import type { AdminCandidateTemplateKey } from "@/content/adminCandidateEmailTemplates";
import { adminCandidateEmailTemplates } from "@/content/adminCandidateEmailTemplates";

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
  onboarding_portal_token?: string | null;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

function renderCard(title: string | undefined, items: readonly string[] | undefined) {
  if (!title || !items || items.length === 0) {
    return "";
  }

  return `
    <div class="card">
      <p><strong>${title}</strong></p>
      <ul style="margin: 12px 0; padding-left: 20px;">
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
}

// 1. Intake bevestiging - Losser en geruststellend
export async function sendIntakeBevestiging(kandidaat: Kandidaat) {
  const statusUrl = `${getBaseUrl()}/kandidaat/status?token=${generateStatusToken(kandidaat.email, kandidaat.id)}`;
  const copy = candidateEmailCopy.bevestiging;
  const content = `
    <span class="emoji">👋</span>

    <h1>${applyCandidateEmailVars(copy.heading, { voornaam: kandidaat.voornaam })}</h1>

    <p>${copy.intro}</p>

    ${renderCard(copy.cardTitle, copy.cardItems)}

    <p>${copy.bodyAfterCard}</p>

    <center>
      <a href="${statusUrl}" class="cta-button">
        ${copy.ctaLabel}
      </a>
    </center>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      ${copy.outro}
    </p>
  `;

  const result = await resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: applyCandidateEmailVars(copy.subject, { voornaam: kandidaat.voornaam }),
    html: getEmailLayout(content),
  });

  return result;
}

// 2. Documenten verzoek - Upbeat en duidelijk
export async function sendDocumentenVerzoek(kandidaat: Kandidaat, portalToken?: string) {
  const uploadToken = portalToken || await generateAndSaveUploadToken(kandidaat.id);
  const uploadUrl = `${getBaseUrl()}/kandidaat/documenten?token=${uploadToken}`;

  const isZZP = kandidaat.uitbetalingswijze === "zzp";
  const copy = candidateEmailCopy.documenten;

  const content = `
    <span class="emoji">📄</span>

    <h1>${applyCandidateEmailVars(copy.heading, { voornaam: kandidaat.voornaam })}</h1>

    <p>${copy.intro}</p>

    ${renderCard(copy.cardTitle, getDocumentChecklist(isZZP))}
    <div class="card" style="margin-top: -8px;">
      <p style="margin-top: 16px; font-size: 14px; color: #666;">
        💡 <strong>Tip:</strong> Maak gewoon een foto met je telefoon - hoeft niet super professioneel!
      </p>
    </div>

    <p>${copy.bodyAfterCard}</p>

    <center>
      <a href="${uploadUrl}" class="cta-button">
        ${copy.ctaLabel}
      </a>
    </center>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      ${copy.outro}
    </p>
  `;

  const result = await resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: applyCandidateEmailVars(copy.subject, { voornaam: kandidaat.voornaam }),
    html: getEmailLayout(content),
  });

  return result;
}

export async function sendDocumentenReminder(kandidaat: Kandidaat, portalToken?: string) {
  const uploadToken = portalToken || await generateAndSaveUploadToken(kandidaat.id);
  const uploadUrl = `${getBaseUrl()}/kandidaat/documenten?token=${uploadToken}`;
  const isZZP = kandidaat.uitbetalingswijze === "zzp";
  const copy = candidateEmailCopy.documentenReminder;

  const content = `
    <span class="emoji">⏰</span>

    <h1>${applyCandidateEmailVars(copy.heading, { voornaam: kandidaat.voornaam })}</h1>

    <p>${copy.intro}</p>

    ${renderCard(copy.cardTitle, getDocumentChecklist(isZZP))}

    <p>${copy.bodyAfterCard}</p>

    <center>
      <a href="${uploadUrl}" class="cta-button">
        ${copy.ctaLabel}
      </a>
    </center>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      ${copy.outro}
    </p>
  `;

  const result = await resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: applyCandidateEmailVars(copy.subject, { voornaam: kandidaat.voornaam }),
    html: getEmailLayout(content),
  });

  return result;
}

export async function sendCandidateTemplateEmail(
  kandidaat: Kandidaat,
  template: (typeof adminCandidateEmailTemplates)[AdminCandidateTemplateKey]
) {
  const statusUrl = `${getBaseUrl()}/kandidaat/status?token=${generateStatusToken(kandidaat.email, kandidaat.id)}`;
  const uploadToken = kandidaat.onboarding_portal_token || await generateAndSaveUploadToken(kandidaat.id);
  const uploadUrl = `${getBaseUrl()}/kandidaat/documenten?token=${uploadToken}`;
  const ctaUrl = template.ctaUrlType === "upload" ? uploadUrl : statusUrl;

  const content = `
    <span class="emoji">✉️</span>
    <h1>${applyCandidateEmailVars(template.heading, { voornaam: kandidaat.voornaam })}</h1>
    <p>${applyCandidateEmailVars(template.intro, { voornaam: kandidaat.voornaam })}</p>
    ${renderCard(template.cardTitle, template.cardItems)}
    ${template.bodyAfterCard ? `<p>${template.bodyAfterCard}</p>` : ""}
    ${template.ctaLabel ? `<center><a href="${ctaUrl}" class="cta-button">${template.ctaLabel}</a></center>` : ""}
    ${template.outro ? `<p style="margin-top: 30px; color: #666; font-size: 14px;">${template.outro}</p>` : ""}
  `;

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: applyCandidateEmailVars(template.subject, { voornaam: kandidaat.voornaam }),
    html: getEmailLayout(content),
  });
}

// 3. Welkomst mail - "Yes, je bent klaar" vibe
export async function sendWelkomstmail(kandidaat: Kandidaat) {
  const statusUrl = `${getBaseUrl()}/kandidaat/status?token=${generateStatusToken(kandidaat.email, kandidaat.id)}`;
  const copy = candidateEmailCopy.welkom;

  const content = `
    <span class="emoji">🎉</span>

    <h1>${applyCandidateEmailVars(copy.heading, { voornaam: kandidaat.voornaam })}</h1>

    <p style="font-size: 18px; color: #F27501; font-weight: 600;">
      Welkom in het team! 🙌
    </p>

    <p>${copy.intro}</p>

    ${renderCard(copy.cardTitle, copy.cardItems)}

    <p>${copy.bodyAfterCard}</p>

    <center>
      <a href="${statusUrl}" class="cta-button">
        ${copy.ctaLabel}
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 18px; text-align: center; color: #666;">
      ${copy.outro}
    </p>
  `;

  const result = await resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [kandidaat.email],
    replyTo: "info@toptalentjobs.nl",
    subject: applyCandidateEmailVars(copy.subject, { voornaam: kandidaat.voornaam }),
    html: getEmailLayout(content),
  });

  return result;
}

// Helper functions voor token generation
function generateStatusToken(email: string, kandidaatId: string): string {
  const secret = process.env.KANDIDAAT_TOKEN_SECRET || "fallback-secret";
  const data = `${email}:${kandidaatId}:${secret}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

// 🚀 Optimized: Generate token and save to database for O(1) lookup
export async function generateAndSaveUploadToken(kandidaatId: string, expiryDays = 7): Promise<string> {
  const { supabaseAdmin } = await import("@/lib/supabase");

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

// Email logging helper met Resend tracking
export async function logEmail(
  kandidaatId: string,
  emailType: "bevestiging" | "documenten_opvragen" | "documenten_reminder" | "inzetbaar" | "custom",
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
