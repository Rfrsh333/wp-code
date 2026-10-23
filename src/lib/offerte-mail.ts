import { escapeHtml } from "@/lib/sanitize";
import { escapeTelegramHtml } from "@/lib/telegram";
import { adminMeldingMailHtml } from "@/lib/admin-melding-mail";

/**
 * Teksten rond offertes (pure functies, los testbaar in tests/unit/offerte-mail.spec.ts):
 * - de offertemail aan de klant, met de link naar de online offerte (bekijken en accepteren);
 * - de melding aan TopTalent als een klant een offerte online accepteert: dezelfde route als een
 *   nieuwe personeelsaanvraag (Telegram zonder persoonsgegevens + mail naar info@).
 * Alle invoer van klant of AI wordt ge-escaped.
 */

/** Publieke link naar de offerte (bekijken + accepteren), app/offerte/[token]. */
export function offerteOnlineUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/offerte/${encodeURIComponent(token)}`;
}

/** Url veilig in een attribuut zonder de slashes te escapen (anders "&#x2F;" in de tekstversie). */
function veiligeUrl(url: string): string {
  return url.replace(/["'<>\s]/g, (c) => encodeURIComponent(c));
}

export function offerteMailHtml(input: {
  contactpersoon: string | null | undefined;
  introductie: string | null | undefined;
  offerteNummer: string;
  geldigTot: string; // al opgemaakt, bv. "06 november 2026"
  onlineUrl: string | null;
  telefoon: string;
}): string {
  const intro = input.introductie
    ? escapeHtml(input.introductie).replace(/\n/g, "<br>")
    : "Bedankt voor uw interesse in onze horecapersoneel diensten. Hierbij ontvangt u de offerte voor uw aanvraag.";
  const telefoon = escapeHtml(input.telefoon);

  const online = input.onlineUrl
    ? `
            <div style="text-align: center; margin: 30px 0 10px;">
              <a href="${veiligeUrl(input.onlineUrl)}"
                 style="display: inline-block; background: #1B2E4A; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Offerte online bekijken en accepteren
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0 0 20px; word-break: break-all;">
              ${veiligeUrl(input.onlineUrl)}
            </p>`
    : "";

  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
          <img src="https://www.toptalentjobs.nl/logo-white.png" alt="TopTalent Jobs" style="height: 40px; margin-bottom: 12px;" />
          <h1 style="color: white; margin: 0; font-size: 24px;">Uw Personeelsofferte</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">
              Beste ${escapeHtml(input.contactpersoon || "")},
            </p>

            <p style="color: #666; line-height: 1.6;">
              ${intro}
            </p>

            <div style="background: #FFF7ED; border-left: 4px solid #F27501; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #333;">
                <strong>Offertenummer:</strong> ${escapeHtml(input.offerteNummer)}<br>
                <strong>Geldig tot:</strong> ${escapeHtml(input.geldigTot)}
              </p>
            </div>

            <p style="color: #666; line-height: 1.6;">
              In de bijlage vindt u de offerte met alle details over de tarieven en voorwaarden.${
                input.onlineUrl ? " U kunt de offerte ook online bekijken en direct accepteren." : ""
              }
              Heeft u vragen of wilt u de offerte bespreken? Neem gerust contact met ons op.
            </p>
${online}
            <div style="text-align: center; margin: 30px 0;">
              <a href="tel:${telefoon}"
                 style="display: inline-block; background: #F27501; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Bel ons: ${telefoon}
              </a>
            </div>

            <p style="color: #666; line-height: 1.6;">
              Met vriendelijke groet,<br><br>
              <strong>Rachid</strong><br>
              TopTalent Jobs<br>
              <a href="https://www.toptalentjobs.nl" style="color: #F27501;">toptalentjobs.nl</a>
            </p>
          </div>
        </div>

        <div style="background: #1B2E4A; padding: 20px; text-align: center;">
          <p style="color: #94a3b8; margin: 0 0 8px; font-size: 12px;">
            TopTalent Jobs | Utrecht | KvK: 73401161
          </p>
          <p style="margin: 0;">
            <a href="https://www.toptalentjobs.nl" style="color: #F27501; font-size: 12px; text-decoration: none;">toptalentjobs.nl</a>
          </p>
        </div>
      </div>
    `;
}

export type GeaccepteerdeOfferte = {
  offerte_nummer: string;
  bedrijfsnaam: string | null;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  locatie: string | null;
  totaal_bedrag: number | null;
  geldig_tot: string | null;
};

/** Melding aan TopTalent na online accepteren. Telegram zonder persoonsgegevens (AVG). */
export function offerteGeaccepteerdMelding(
  o: GeaccepteerdeOfferte,
  extra: { ondertekendDoor: string; adminUrl: string },
): { telegram: string; onderwerp: string; html: string } {
  const totaal =
    typeof o.totaal_bedrag === "number" && Number.isFinite(o.totaal_bedrag)
      ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(o.totaal_bedrag)
      : null;

  return {
    telegram:
      `✅ <b>OFFERTE GEACCEPTEERD!</b>\n\n` +
      `Offerte ${escapeTelegramHtml(o.offerte_nummer)} is online geaccepteerd — bekijk in dashboard`,
    onderwerp: `Offerte geaccepteerd - ${o.offerte_nummer}${o.bedrijfsnaam ? ` - ${o.bedrijfsnaam}` : ""}`,
    html: adminMeldingMailHtml({
      titel: "Offerte geaccepteerd",
      intro: `De klant heeft offerte ${o.offerte_nummer} online geaccepteerd. Neem contact op voor de vervolgstappen (de offertepagina belooft "Wij nemen spoedig contact met u op").`,
      secties: [
        {
          kop: "Klant",
          regels: [
            ["Bedrijfsnaam", o.bedrijfsnaam],
            ["Contactpersoon", o.contactpersoon],
            ["E-mail", o.email],
            ["Telefoon", o.telefoon],
            ["Locatie", o.locatie],
          ],
        },
        {
          kop: "Offerte",
          regels: [
            ["Offertenummer", o.offerte_nummer],
            ["Totaal per week", totaal],
            ["Ondertekend door", extra.ondertekendDoor],
          ],
        },
      ],
      knop: { tekst: "Bekijk in dashboard", url: extra.adminUrl },
      voet: "Dit bericht is automatisch verzonden na het online accepteren van een offerte op toptalentjobs.nl",
    }),
  };
}
