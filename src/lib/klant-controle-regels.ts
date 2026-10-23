import { escapeTelegramHtml } from "@/lib/telegram";
import { adminMeldingMailHtml } from "@/lib/admin-melding-mail";

/**
 * Eerste-dienstcontrole voor zelf geregistreerde klanten (besluit Rachid 23-10-2026), pure
 * regels los testbaar in tests/unit/klant-controle-regels.spec.ts.
 *
 * - Een klant moet zijn e-mailadres hebben bevestigd voordat hij iets kan plaatsen.
 * - Zolang TopTalent een zelf geregistreerde klant niet heeft gecontroleerd, krijgen zijn diensten
 *   de status `in_controle`: niet zichtbaar voor medewerkers (die zien alleen open/vol), geen push.
 *   TopTalent krijgt een melding (Telegram + mail) en keurt goed in admin > Diensten. Daarna
 *   worden die diensten `open`, gaat de push uit, en gaan alle volgende diensten direct live.
 * - Een klant die TopTalent zelf aanmaakt of uitnodigt, geldt als gecontroleerd. Demo-accounts ook.
 */

export const DIENST_STATUS_IN_CONTROLE = "in_controle";

export type PlaatsOordeel =
  | { ok: false; status: 403; code: "email_niet_bevestigd"; error: string }
  | { ok: true; dienstStatus: "open" | typeof DIENST_STATUS_IN_CONTROLE };

export function beoordeelDienstPlaatsen(klant: { emailBevestigd: boolean; gecontroleerd: boolean; demo: boolean }): PlaatsOordeel {
  if (!klant.emailBevestigd && !klant.demo) {
    return {
      ok: false,
      status: 403,
      code: "email_niet_bevestigd",
      error: "Bevestig eerst uw e-mailadres via de link in de mail die we u stuurden. Geen mail ontvangen? Vraag in het portaal een nieuwe link aan.",
    };
  }
  return { ok: true, dienstStatus: klant.gecontroleerd || klant.demo ? "open" : DIENST_STATUS_IN_CONTROLE };
}

export type ControleDienst = {
  functie: string | null;
  aantal_nodig: number | null;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string | null;
  uurtarief: number | null;
};

export type ControleKlant = {
  bedrijfsnaam: string | null;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  kvk_nummer?: string | null;
};

/** Eén regel per dienst, bv. "bediening (2x) op 2026-10-30, 18:00-23:00 in Utrecht". */
export function dienstRegel(d: ControleDienst): string {
  return `${d.functie || "dienst"} (${d.aantal_nodig || 1}x) op ${d.datum}, ${d.start_tijd.slice(0, 5)}-${d.eind_tijd.slice(0, 5)}${d.locatie ? ` in ${d.locatie}` : ""}`;
}

/** Melding aan TopTalent: dezelfde route als een nieuwe aanvraag (Telegram zonder PII + mail aan info@). */
export function eersteDienstInControleMelding(
  klant: ControleKlant,
  diensten: readonly ControleDienst[],
  adminUrl: string,
): { telegram: string; onderwerp: string; html: string } {
  const aantal = diensten.length;
  const datums = [...new Set(diensten.map((d) => d.datum))].join(", ");
  return {
    telegram:
      `🔎 <b>EERSTE DIENST WACHT OP CONTROLE</b>\n\n` +
      `Nieuwe zelf geregistreerde klant: ${aantal} dienst${aantal === 1 ? "" : "en"} op ${escapeTelegramHtml(datums)}.\n` +
      `Medewerkers zien ${aantal === 1 ? "hem" : "ze"} pas na goedkeuring — keur goed in dashboard (Diensten)`,
    onderwerp: `Eerste dienst in controle - ${klant.bedrijfsnaam || "nieuwe klant"}`,
    html: adminMeldingMailHtml({
      titel: "Eerste dienst wacht op controle",
      intro:
        "Een zelf geregistreerde klant heeft zijn eerste dienst geplaatst. Medewerkers zien die pas na goedkeuring in admin > Diensten; daarna gaat de push uit en gaan volgende diensten van deze klant direct live.",
      secties: [
        {
          kop: "Klant",
          regels: [
            ["Bedrijfsnaam", klant.bedrijfsnaam],
            ["Contactpersoon", klant.contactpersoon],
            ["E-mail", klant.email],
            ["Telefoon", klant.telefoon],
            ["KvK-nummer", klant.kvk_nummer],
          ],
        },
        {
          kop: aantal === 1 ? "Dienst" : `Diensten (${aantal})`,
          regels: diensten.map((d, i) => [
            `${i + 1}`,
            `${dienstRegel(d)}${typeof d.uurtarief === "number" ? `, € ${d.uurtarief.toFixed(2).replace(".", ",")} per uur` : ""}`,
          ] as const),
        },
      ],
      knop: { tekst: "Controleren in dashboard", url: adminUrl },
      voet: "Dit bericht is automatisch verzonden na de eerste dienst van een nieuwe klant op toptalentjobs.nl",
    }),
  };
}
