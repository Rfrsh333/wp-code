import { escapeHtml } from "@/lib/sanitize";

/**
 * Pure regels voor de uitnodiging van een klant die TopTalent zelf aanmaakt (lead omzetten,
 * dienst inplannen voor een nieuwe bedrijfsnaam, knop in de admin). Geen database, los testbaar
 * in tests/unit/klant-uitnodiging.spec.ts. Het versturen zit in lib/klant-uitnodiging.ts.
 *
 * De uitnodiging hergebruikt het token van "wachtwoord vergeten" (klanten.reset_token, alleen de
 * hash), maar met een eigen geldigheid: 7 dagen, net als de activatielink van medewerkers
 * (lib/medewerker-activation.ts). De link werkt één keer.
 */

export const KLANT_UITNODIGING_GELDIG_DAGEN = 7;
export const KLANT_UITNODIGING_GELDIG_MS = KLANT_UITNODIGING_GELDIG_DAGEN * 24 * 60 * 60 * 1000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UitnodigingWeigering = "geen_email" | "verwijderd" | "gedeactiveerd";

export type UitnodigingOordeel =
  | { ok: true; zetActief: boolean }
  | { ok: false; reden: UitnodigingWeigering; melding: string };

/**
 * Mag deze klant een uitnodiging krijgen, en moet de status daarvoor op `actief`?
 * - Geen (geldig) e-mailadres: nee.
 * - Verwijderd account (status `verwijderd`, of het geanonimiseerde `…@verwijderd.invalid`): nee.
 * - `inactief`: alleen als de admin uitdrukkelijk kiest voor heractiveren. Nooit stilletjes.
 * - `actief`: ja.
 * - Geen of een onbekende status (bv. een omgezette lead van vóór deze wijziging, waar de
 *   database-standaard gold): ja, en de status wordt `actief`. De resetlink werkt alleen voor
 *   actieve accounts (lib/klant-password-reset.ts, findValidKlantResetToken).
 */
export function beoordeelUitnodiging(
  klant: { email: string | null | undefined; status: string | null | undefined },
  opties: { heractiveren?: boolean } = {},
): UitnodigingOordeel {
  const email = (klant.email || "").trim().toLowerCase();
  const status = (klant.status || "").trim();

  if (status === "verwijderd" || email.endsWith(".invalid")) {
    return { ok: false, reden: "verwijderd", melding: "Dit account is verwijderd en kan geen uitnodiging meer krijgen." };
  }
  if (!email || !EMAIL.test(email)) {
    return { ok: false, reden: "geen_email", melding: "Deze klant heeft geen geldig e-mailadres. Vul eerst een e-mailadres in." };
  }
  if (status === "inactief") {
    if (opties.heractiveren) return { ok: true, zetActief: true };
    return {
      ok: false,
      reden: "gedeactiveerd",
      melding: "Deze klant staat op inactief. Kies 'Heractiveren en uitnodigen' als het account weer gebruikt mag worden.",
    };
  }
  return { ok: true, zetActief: status !== "actief" };
}

/**
 * Moet `ensureKlantForDienst` een bestaande klant uitnodigen? Alleen als de dienst het
 * e-mailadres net heeft aangevuld, er nog geen wachtwoord is en het account actief is.
 * Een nieuwe klant wordt altijd uitgenodigd zodra er een e-mailadres is.
 */
export function moetBestaandeKlantUitnodigen(klant: {
  emailNetToegevoegd: boolean;
  heeftWachtwoord: boolean;
  status: string | null | undefined;
}): boolean {
  return klant.emailNetToegevoegd && !klant.heeftWachtwoord && klant.status === "actief";
}

/** Link uit de mail: dezelfde pagina als "wachtwoord vergeten", met welkomsttekst. */
export function uitnodigingUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/klant/wachtwoord-reset?token=${encodeURIComponent(token)}&welkom=1`;
}

/** Inhoud van de uitnodigingsmail (binnen de klant-maillayout). Alle invoer wordt ge-escaped. */
export function uitnodigingMailInhoud(input: { contactpersoon?: string | null; bedrijfsnaam?: string | null; url: string }): string {
  const contact = (input.contactpersoon || "").trim();
  const bedrijfsnaam = (input.bedrijfsnaam || "").trim();
  // Bij een dienst voor een nieuwe bedrijfsnaam is de contactpersoon gelijk aan de bedrijfsnaam:
  // dan geen "Beste <bedrijfsnaam>".
  const naam = contact && contact.toLowerCase() !== bedrijfsnaam.toLowerCase() ? escapeHtml(contact.split(/\s+/)[0]) : "";
  const bedrijf = escapeHtml(bedrijfsnaam);
  // De url bouwen we zelf (basis-url + hex-token), dus die gaat ongewijzigd in de mail.
  const url = input.url;
  return `
      <h1 style="margin:0 0 16px;color:#1e3a5f;font-size:24px;">${naam ? `Beste ${naam}, w` : "W"}elkom bij TopTalent Business</h1>
      <p>TopTalent heeft ${bedrijf ? `voor <strong>${bedrijf}</strong> ` : ""}een account voor u klaargezet. Daarmee vraagt u personeel aan, volgt u uw diensten en keurt u uren goed, op de website en in de TopTalent-app.</p>
      <p>Kies via de knop hieronder uw wachtwoord. Daarna kunt u direct inloggen.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="${url}" style="display:inline-block;background:#F27501;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          Wachtwoord instellen
        </a>
      </p>
      <p style="font-size:14px;color:#666;">Deze link is ${KLANT_UITNODIGING_GELDIG_DAGEN} dagen geldig en werkt één keer. Is de link verlopen? Vraag dan via "Wachtwoord vergeten" op de inlogpagina een nieuwe aan, of neem contact op via info@toptalentjobs.nl.</p>
      <p style="font-size:13px;word-break:break-all;color:#666;">${url}</p>
    `;
}

/**
 * Status van een bestaande klant nadat een admin een dienst onder zijn bedrijfsnaam inplant
 * (ensureKlantForDienst). Alleen een klant zonder status wordt `actief`. Een gedeactiveerde of
 * verwijderde klant blijft zoals hij is: voorheen werd hij stilletjes weer actief.
 * Geeft null als de status niet verandert.
 */
export function statusNaDienstInplannen(status: string | null | undefined): "actief" | null {
  return status == null || status.trim() === "" ? "actief" : null;
}

/** Escapet % en _ (en de backslash zelf) zodat een bedrijfsnaam in ILIKE letterlijk matcht. */
export function letterlijkLikePatroon(waarde: string): string {
  return waarde.replace(/[\\%_]/g, (c) => `\\${c}`);
}
