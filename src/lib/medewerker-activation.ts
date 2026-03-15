import crypto from "crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

interface MedewerkerActivationTarget {
  id: string;
  naam: string;
  email: string;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

function renderEmailLayout(content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#333;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#F27501 0%,#d96800 100%);padding:36px 28px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#fff;">TopTalent</div>
          </div>
          <div style="padding:36px 28px;line-height:1.6;">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function createMedewerkerActivationToken(medewerkerId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("medewerkers")
    .update({
      magic_token: token,
      magic_token_expires_at: expiresAt,
    })
    .eq("id", medewerkerId);

  if (error) {
    throw new Error(error.message || "Activatietoken kon niet worden opgeslagen");
  }

  return token;
}

export async function sendMedewerkerActivationEmail(medewerker: MedewerkerActivationTarget) {
  const token = await createMedewerkerActivationToken(medewerker.id);
  const activationUrl = `${getBaseUrl()}/medewerker/activeren?token=${token}`;
  const firstName = medewerker.naam.split(" ")[0] || medewerker.naam;

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [medewerker.email],
    replyTo: "info@toptalentjobs.nl",
    subject: "Activeer je medewerkeraccount bij TopTalent",
    html: renderEmailLayout(`
      <p style="font-size:32px;margin:0 0 16px;">🔐</p>
      <h1 style="margin:0 0 16px;color:#F27501;font-size:28px;">Hey ${firstName}, zet je account live</h1>
      <p>Je medewerkeraccount is aangemaakt. Kies hieronder zelf je wachtwoord, dan kun je meteen inloggen in TopTalent Hub.</p>
      <div style="background:#fff7f1;border:1px solid #f8d4b4;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;"><strong>Zo werkt het:</strong></p>
        <ul style="margin:0;padding-left:20px;">
          <li>Klik op de knop hieronder</li>
          <li>Stel je wachtwoord in</li>
          <li>Log daarna in en bekijk je diensten</li>
        </ul>
      </div>
      <p style="text-align:center;margin:32px 0;">
        <a href="${activationUrl}" style="display:inline-block;background:#0B2447;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          Wachtwoord instellen
        </a>
      </p>
      <p style="font-size:14px;color:#666;">Deze link is 7 dagen geldig.</p>
      <p style="font-size:13px;word-break:break-all;color:#666;">${activationUrl}</p>
    `),
  });
}
