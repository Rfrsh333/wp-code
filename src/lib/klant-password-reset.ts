import crypto from "crypto";
import { sendEmail } from "@/lib/email-service";
import { supabaseAdmin } from "@/lib/supabase";
import { hashToken } from "@/lib/token-hash";
import { escapeHtml } from "@/lib/sanitize";

/**
 * Wachtwoord vergeten voor klanten — zelfde opzet als lib/medewerker-password-reset.ts:
 * token 32 bytes, in de database alleen als SHA-256-hash, 2 uur geldig, eenmalig.
 * Kolommen klanten.reset_token(_expires_at) komen uit migratie 20261001_klant_portaal.sql.
 */

export const KLANT_RESET_GELDIG_MS = 2 * 60 * 60 * 1000;

export class ResetNietBeschikbaarError extends Error {
  constructor() {
    super("Wachtwoord resetten is nog niet beschikbaar (migratie 20261001_klant_portaal.sql niet gedraaid)");
  }
}

export const RESET_NIET_BESCHIKBAAR_MELDING =
  "Wachtwoord herstellen is nog niet beschikbaar. Neem contact op met TopTalent via info@toptalentjobs.nl.";

/**
 * Bestaan de resetkolommen? Los van een specifiek account gecontroleerd (limit 0), zodat het
 * antwoord niet verraadt of een e-mailadres bestaat. Bij een andere fout: aannemen van wel.
 */
export async function klantResetBeschikbaar(): Promise<boolean> {
  const { error } = await supabaseAdmin.from("klanten").select("reset_token, reset_token_expires_at").limit(0);
  return !(error && (error.code === "42703" || error.code === "PGRST204"));
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
          <div style="background:#1e3a5f;padding:36px 28px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#fff;">TopTalent Business</div>
          </div>
          <div style="padding:36px 28px;line-height:1.6;">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function createKlantPasswordResetToken(klantId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + KLANT_RESET_GELDIG_MS).toISOString();

  const { error } = await supabaseAdmin
    .from("klanten")
    .update({
      reset_token: hashToken(token), // hash at rest; plaintext gaat alleen in de e-mail-link
      reset_token_expires_at: expiresAt,
    })
    .eq("id", klantId);

  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") throw new ResetNietBeschikbaarError();
    throw new Error(error.message || "Reset token kon niet worden opgeslagen");
  }

  return token;
}

export async function sendKlantPasswordResetEmail(klant: { id: string; contactpersoon: string | null; email: string }) {
  const token = await createKlantPasswordResetToken(klant.id);
  const resetUrl = `${getBaseUrl()}/klant/wachtwoord-reset?token=${token}`;
  const naam = escapeHtml((klant.contactpersoon || "").split(" ")[0] || "");

  return sendEmail({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [klant.email],
    replyTo: "info@toptalentjobs.nl",
    subject: "Stel een nieuw wachtwoord in voor uw TopTalent Business account",
    emailType: "klant_wachtwoord_reset",
    html: renderEmailLayout(`
      <h1 style="margin:0 0 16px;color:#1e3a5f;font-size:24px;">${naam ? `Beste ${naam}, s` : "S"}tel een nieuw wachtwoord in</h1>
      <p>U heeft gevraagd om het wachtwoord van uw TopTalent Business account opnieuw in te stellen. Via de knop hieronder kiest u direct een nieuw wachtwoord.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#F27501;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          Nieuw wachtwoord instellen
        </a>
      </p>
      <p style="font-size:14px;color:#666;">Deze link is 2 uur geldig en werkt één keer. Heeft u dit niet aangevraagd? Dan kunt u deze mail negeren; uw wachtwoord blijft ongewijzigd.</p>
      <p style="font-size:13px;word-break:break-all;color:#666;">${resetUrl}</p>
    `),
  });
}

/** Zoekt een klant bij een (plaintext) token dat nog geldig is. */
export async function findValidKlantResetToken(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const { data, error } = await supabaseAdmin
    .from("klanten")
    .select("id, bedrijfsnaam, contactpersoon, email, status")
    .eq("reset_token", hashToken(token))
    .gt("reset_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data || data.status !== "actief") return null;
  return data;
}
