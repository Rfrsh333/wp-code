import { escapeHtml } from "@/lib/sanitize";

/**
 * Pure regels voor zelf registreren als klant (werkgever), los testbaar in
 * tests/unit/klant-registratie-regels.spec.ts. Besluit Rachid 23-10-2026:
 * - e-mailadres bevestigen met een link (minstens 24 uur geldig) vóór er iets geplaatst kan worden;
 * - KvK-nummer verplicht, alleen het formaat (8 cijfers), geen betaalde KvK-API;
 * - akkoord op de algemene voorwaarden verplicht; tijdstip en versie worden opgeslagen.
 */

/**
 * Versie van de algemene voorwaarden op /voorwaarden/ ("Versie 3.0 | april 2025" in
 * src/app/voorwaarden/page.tsx). Bij een nieuwe versie van de voorwaarden beide aanpassen: deze
 * waarde wordt per klant opgeslagen (klanten.av_versie) bij het akkoord tijdens registratie.
 */
export const ALGEMENE_VOORWAARDEN_VERSIE = "3.0 (april 2025)";
export const ALGEMENE_VOORWAARDEN_PAD = "/voorwaarden/";

/** De bevestigingslink is 48 uur geldig (eis: 24 uur of langer) en werkt één keer. */
export const EMAIL_VERIFICATIE_GELDIG_UUR = 48;
export const EMAIL_VERIFICATIE_GELDIG_MS = EMAIL_VERIFICATIE_GELDIG_UUR * 60 * 60 * 1000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** KvK-nummer: 8 cijfers; spaties, punten en streepjes worden genegeerd. Anders null. */
export function normaliseerKvk(waarde: unknown): string | null {
  if (typeof waarde !== "string" && typeof waarde !== "number") return null;
  const cijfers = String(waarde).replace(/[\s.\-]/g, "");
  return /^\d{8}$/.test(cijfers) ? cijfers : null;
}

export type Registratie = {
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string | null;
  kvkNummer: string;
  wachtwoord: string;
};

export type RegistratieOordeel = { ok: true; data: Registratie } | { ok: false; error: string; veld: string };

function tekst(waarde: unknown, max: number): string {
  return typeof waarde === "string" ? waarde.trim().slice(0, max) : "";
}

/** Controleert de invoer van /api/klant/register (het wachtwoord zelf controleert password-security). */
export function valideerRegistratie(body: unknown): RegistratieOordeel {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const bedrijfsnaam = tekst(b.bedrijfsnaam, 200);
  const contactpersoon = tekst(b.contactpersoon, 200);
  const email = tekst(b.email, 254).toLowerCase();
  const telefoon = tekst(b.telefoon, 30) || null;
  const wachtwoord = typeof b.wachtwoord === "string" ? b.wachtwoord : "";

  if (bedrijfsnaam.length < 2) return { ok: false, veld: "bedrijfsnaam", error: "Bedrijfsnaam is verplicht" };
  if (contactpersoon.length < 2) return { ok: false, veld: "contactpersoon", error: "Contactpersoon is verplicht" };
  if (!EMAIL.test(email)) return { ok: false, veld: "email", error: "Ongeldig e-mailadres" };
  if (!wachtwoord) return { ok: false, veld: "wachtwoord", error: "Wachtwoord is verplicht" };

  const kvkNummer = normaliseerKvk(b.kvk_nummer);
  if (!kvkNummer) return { ok: false, veld: "kvk_nummer", error: "Vul een geldig KvK-nummer in (8 cijfers)" };

  if (b.akkoord_voorwaarden !== true) {
    return { ok: false, veld: "akkoord_voorwaarden", error: "Ga akkoord met de algemene voorwaarden om een account aan te maken" };
  }

  return { ok: true, data: { bedrijfsnaam, contactpersoon, email, telefoon, kvkNummer, wachtwoord } };
}

/** Link uit de bevestigingsmail (pagina /klant/email-bevestigen, zonder sessie bereikbaar). */
export function emailVerificatieUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/klant/email-bevestigen?token=${encodeURIComponent(token)}`;
}

/** Inhoud van de bevestigingsmail (binnen de klant-maillayout). */
export function emailVerificatieMailInhoud(input: { contactpersoon?: string | null; url: string }): string {
  const voornaam = escapeHtml((input.contactpersoon || "").trim().split(/\s+/)[0] || "");
  return `
      <h1 style="margin:0 0 16px;color:#1e3a5f;font-size:24px;">${voornaam ? `Beste ${voornaam}, b` : "B"}evestig uw e-mailadres</h1>
      <p>Bedankt voor uw registratie bij TopTalent Business. Bevestig via de knop hieronder dat dit uw e-mailadres is. Daarna kunt u personeel aanvragen.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="${input.url}" style="display:inline-block;background:#F27501;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          E-mailadres bevestigen
        </a>
      </p>
      <p style="font-size:14px;color:#666;">Deze link is ${EMAIL_VERIFICATIE_GELDIG_UUR} uur geldig en werkt één keer. Verlopen? Log in op TopTalent Business en vraag een nieuwe link aan. Heeft u zich niet geregistreerd? Dan kunt u deze mail negeren.</p>
      <p style="font-size:13px;word-break:break-all;color:#666;">${input.url}</p>
    `;
}
