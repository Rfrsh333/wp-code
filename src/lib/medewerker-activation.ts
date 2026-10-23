import crypto from "crypto";
import { sendEmail } from "@/lib/email-service";
import { supabaseAdmin } from "@/lib/supabase";
import { hashToken } from "@/lib/token-hash";
import { escapeHtml } from "@/lib/sanitize";
import { captureRouteError } from "@/lib/sentry-utils";

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
  const expiresAt = new Date(Date.now() + ACTIVATIE_GELDIG_DAGEN * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("medewerkers")
    .update({
      magic_token: hashToken(token), // hash at rest; plaintext gaat alleen in de e-mail-link
      magic_token_expires_at: expiresAt,
    })
    .eq("id", medewerkerId);

  if (error) {
    throw new Error(error.message || "Activatietoken kon niet worden opgeslagen");
  }

  return token;
}

/** Geldigheid van een activatielink (ook bij opnieuw sturen vanuit de admin). */
export const ACTIVATIE_GELDIG_DAGEN = 7;

/**
 * De ene mail bij "inzetbaar" voor een nieuw account (B15): voorheen gingen er twee mails
 * tegelijk uit (deze activatiemail én een welkomstmail met "we bellen je" en een knop naar de
 * statuspagina). Nu zegt deze mail alles: je bent inzetbaar, kies je wachtwoord, log in.
 */
export async function sendMedewerkerActivationEmail(medewerker: MedewerkerActivationTarget) {
  const token = await createMedewerkerActivationToken(medewerker.id);
  const activationUrl = `${getBaseUrl()}/medewerker/activeren?token=${token}`;
  const resetUrl = `${getBaseUrl()}/medewerker/wachtwoord-vergeten`;
  const firstName = medewerker.naam.split(" ")[0] || medewerker.naam;

  return sendEmail({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [medewerker.email],
    replyTo: "info@toptalentjobs.nl",
    subject: "Je bent inzetbaar bij TopTalent: activeer je account",
    html: renderEmailLayout(`
      <p style="font-size:32px;margin:0 0 16px;">🎉</p>
      <h1 style="margin:0 0 16px;color:#F27501;font-size:28px;">Hey ${escapeHtml(firstName)}, je bent inzetbaar!</h1>
      <p>Je inschrijving is rond en je medewerkeraccount is aangemaakt. Kies hieronder je wachtwoord. Daarna log je in op TopTalent Hub en kun je reageren op open diensten.</p>
      <div style="background:#fff7f1;border:1px solid #f8d4b4;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;"><strong>Zo werkt het:</strong></p>
        <ol style="margin:0;padding-left:20px;">
          <li>Klik op de knop hieronder</li>
          <li>Kies je wachtwoord</li>
          <li>Log in, maak je profiel compleet en bekijk de open diensten</li>
        </ol>
      </div>
      <p style="text-align:center;margin:32px 0;">
        <a href="${activationUrl}" style="display:inline-block;background:#0B2447;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          Wachtwoord instellen
        </a>
      </p>
      <p style="font-size:14px;color:#666;">Deze link is ${ACTIVATIE_GELDIG_DAGEN} dagen geldig. Verlopen? Kies dan via <a href="${resetUrl}" style="color:#F27501;">Wachtwoord vergeten</a> zelf een nieuw wachtwoord met dit e-mailadres.</p>
      <p style="font-size:13px;word-break:break-all;color:#666;">${activationUrl}</p>
    `),
  });
}

export type ActivatiemailUitkomst = { ok: true; emailId: string | null } | { ok: false; fout: string };

/**
 * Activatiemail versturen mét controle op het resultaat (B8). Voorheen werd het resultaat
 * genegeerd: een mislukte mail betekende een account dat nooit geactiveerd kon worden, zonder
 * dat iemand het merkte. Een mislukking gaat nu naar Sentry en terug naar de aanroeper.
 */
export async function verstuurActivatiemail(
  medewerker: MedewerkerActivationTarget,
  route: string,
): Promise<ActivatiemailUitkomst> {
  try {
    const resultaat = await sendMedewerkerActivationEmail(medewerker);
    if (resultaat.error || resultaat.suppressed) {
      const fout = resultaat.error?.message || "Adres staat op de bounce-lijst";
      captureRouteError(new Error(`Activatiemail mislukt voor medewerker ${medewerker.id}: ${fout}`), {
        route,
        action: "ACTIVATIEMAIL",
      });
      return { ok: false, fout };
    }
    return { ok: true, emailId: resultaat.data?.id ?? null };
  } catch (error) {
    captureRouteError(error, { route, action: "ACTIVATIEMAIL" });
    return { ok: false, fout: error instanceof Error ? error.message : "Onbekende fout" };
  }
}
