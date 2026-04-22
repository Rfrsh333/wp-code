import crypto from "crypto";
import { sendEmail } from "@/lib/email-service";
import { supabaseAdmin } from "@/lib/supabase";

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

export async function createMedewerkerPasswordResetToken(medewerkerId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("medewerkers")
    .update({
      reset_token: token,
      reset_token_expires_at: expiresAt,
    })
    .eq("id", medewerkerId);

  if (error) {
    throw new Error(error.message || "Reset token kon niet worden opgeslagen");
  }

  return token;
}

export async function sendMedewerkerPasswordResetEmail(medewerker: { id: string; naam: string; email: string }) {
  const token = await createMedewerkerPasswordResetToken(medewerker.id);
  const resetUrl = `${getBaseUrl()}/medewerker/wachtwoord-reset?token=${token}`;
  const firstName = medewerker.naam.split(" ")[0] || medewerker.naam;

  return sendEmail({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [medewerker.email],
    replyTo: "info@toptalentjobs.nl",
    subject: "Stel een nieuw wachtwoord in voor uw TopTalent account",
    html: renderEmailLayout(`
      <p style="font-size:32px;margin:0 0 16px;">🔐</p>
      <h1 style="margin:0 0 16px;color:#F27501;font-size:28px;">Hey ${firstName}, stel een nieuw wachtwoord in</h1>
      <p>U heeft een verzoek gedaan om uw medewerkerwachtwoord opnieuw in te stellen. Via de knop hieronder kiest u direct een nieuw wachtwoord.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#0B2447;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          Nieuw wachtwoord instellen
        </a>
      </p>
      <p style="font-size:14px;color:#666;">Deze link is 2 uur geldig. Heeft u dit niet aangevraagd? Dan kunt u deze mail negeren.</p>
      <p style="font-size:13px;word-break:break-all;color:#666;">${resetUrl}</p>
    `),
  });
}
