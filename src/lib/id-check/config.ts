/**
 * Instellingen voor de ID-controle via Didit. Alles uit env; niets hardcoded.
 *
 * - ID_CHECK_DIDIT_ACTIEF=1   zet de functie aan. Zonder (of zonder de drie sleutels hieronder)
 *                             werkt alles zoals vóór Didit: de upload van een ID-bewijs blijft, de
 *                             nieuwe routes geven 503/404.
 *   ID_CHECK_DIDIT_ACTIEF=demo  alleen voor demo-/testaccounts (`is_demo`), om op de echte site met
 *                             de Didit-testsleutels te testen; alle andere werknemers merken niets.
 * - DIDIT_API_KEY             API-sleutel van de Didit-applicatie (header x-api-key). Geheim.
 * - DIDIT_WEBHOOK_SECRET      secret_shared_key van de webhook-bestemming in de Didit-console.
 * - DIDIT_WORKFLOW_ID         workflow "TopTalent ID-controle (zonder selfie)".
 * - DIDIT_SESSIE_VERWIJDEREN  standaard aan: na een definitieve beslissing de sessie bij Didit
 *                             verwijderen (beelden en uitgelezen gegevens weg). Zet op 0 om dat uit
 *                             te zetten (bijvoorbeeld tijdens het testen in de Didit-console).
 */

/** Basis-URL van de Didit Verification API (https://docs.didit.me/getting-started/api-authentication). */
export const DIDIT_API_BASIS = "https://verification.didit.me";

export type DiditConfig = { apiKey: string; webhookSecret: string; workflowId: string };

function env(naam: string): string {
  return (process.env[naam] ?? "").trim();
}

/** De drie sleutels, of null als er een ontbreekt. */
export function diditConfig(): DiditConfig | null {
  const apiKey = env("DIDIT_API_KEY");
  const webhookSecret = env("DIDIT_WEBHOOK_SECRET");
  const workflowId = env("DIDIT_WORKFLOW_ID");
  if (!apiKey || !webhookSecret || !workflowId) return null;
  return { apiKey, webhookSecret, workflowId };
}

/** "1" = voor iedereen, "demo" = alleen voor demo-accounts, anders uit. */
function vlag(): "iedereen" | "demo" | null {
  const waarde = env("ID_CHECK_DIDIT_ACTIEF");
  if (waarde === "1") return "iedereen";
  if (waarde === "demo") return "demo";
  return null;
}

/**
 * Is de ID-controle via Didit ingesteld? Vlag op 1 of demo én alle sleutels. Voor de webhook en de
 * admin; of een werknemer hem ziet, bepaalt isDiditActiefVoor.
 */
export function isDiditActief(): boolean {
  return vlag() !== null && diditConfig() !== null;
}

/** Staat de ID-controle aan voor deze werknemer? Met de vlag op demo alleen voor demo-accounts. */
export function isDiditActiefVoor(isDemo: boolean): boolean {
  const modus = vlag();
  return diditConfig() !== null && (modus === "iedereen" || (modus === "demo" && isDemo));
}

/** Sessie bij Didit verwijderen na een definitieve beslissing (standaard ja). */
export function sessieVerwijderenAan(): boolean {
  return env("DIDIT_SESSIE_VERWIJDEREN") !== "0";
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}
