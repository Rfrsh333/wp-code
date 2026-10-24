import { DIDIT_API_BASIS, diditConfig } from "@/lib/id-check/config";

/**
 * De drie Didit-aanroepen die we nodig hebben. Alleen vanaf de server (de API-sleutel is geheim).
 *
 * - Sessie maken:      POST   /v3/session/                     https://docs.didit.me/sessions-api/create-session
 * - Beslissing ophalen: GET    /v3/session/{id}/decision/       https://docs.didit.me/sessions-api/retrieve-session
 * - Sessie verwijderen: DELETE /v3/session/{id}/delete/         https://docs.didit.me/sessions-api/delete-session
 *
 * Foutmeldingen bevatten alleen de HTTP-status, nooit de body van Didit: een beslissing kan
 * persoonsgegevens bevatten en mag niet in logs of Sentry terechtkomen.
 */

export class DiditFout extends Error {
  constructor(
    public readonly actie: "sessie_maken" | "beslissing_ophalen" | "sessie_verwijderen" | "config",
    public readonly httpStatus: number | null,
  ) {
    super(`Didit ${actie} mislukt${httpStatus ? ` (HTTP ${httpStatus})` : ""}`);
    this.name = "DiditFout";
  }
}

function config() {
  const c = diditConfig();
  if (!c) throw new DiditFout("config", null);
  return c;
}

export type DiditSessie = {
  sessionId: string;
  sessienummer: number | null;
  url: string;
  status: string;
};

/**
 * Nieuwe verificatiesessie. `vendor_data` is alleen het medewerker-id (geen naam of e-mail).
 * Didit hergebruikt zelf een nog lopende sessie met dezelfde vendor_data op dezelfde workflow-versie
 * (antwoord is dan ook 201, met het bestaande session_id).
 */
export async function maakDiditSessie(input: { medewerkerId: string; callback: string }): Promise<DiditSessie> {
  const { apiKey, workflowId } = config();
  const res = await fetch(`${DIDIT_API_BASIS}/v3/session/`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: input.medewerkerId,
      callback: input.callback,
      // Alleen het apparaat dat de flow startte gaat terug naar de callback. Op de computer toont
      // Didit een QR-code; de telefoon hoeft daarna niet naar ons portaal (daar is hij niet ingelogd).
      callback_method: "initiator",
      language: "nl",
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new DiditFout("sessie_maken", res.status);
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const sessionId = typeof data?.session_id === "string" ? data.session_id : null;
  const url = typeof data?.url === "string" ? data.url : null;
  if (!sessionId || !url || !/^https:\/\//.test(url)) throw new DiditFout("sessie_maken", res.status);
  return {
    sessionId,
    sessienummer: typeof data?.session_number === "number" ? data.session_number : null,
    url,
    status: typeof data?.status === "string" ? data.status : "Not Started",
  };
}

/** De volledige beslissing (alleen gebruikt als een webhook zonder `decision` binnenkomt). */
export async function haalDiditBeslissing(sessionId: string, timeoutMs = 3_000): Promise<unknown> {
  const { apiKey } = config();
  const res = await fetch(`${DIDIT_API_BASIS}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new DiditFout("beslissing_ophalen", res.status);
  return res.json();
}

/**
 * Verwijder de sessie bij Didit: beslissing, uitgelezen gegevens en alle beelden. Geen
 * gezichtstemplate bewaren (`retain_face_embeddings: false`). 404 = al weg; dat telt als gelukt.
 */
export async function verwijderDiditSessie(sessionId: string): Promise<"verwijderd" | "was_al_weg"> {
  const { apiKey } = config();
  const res = await fetch(`${DIDIT_API_BASIS}/v3/session/${encodeURIComponent(sessionId)}/delete/`, {
    method: "DELETE",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ retain_face_embeddings: false }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (res.status === 404) return "was_al_weg";
  if (!res.ok) throw new DiditFout("sessie_verwijderen", res.status);
  return "verwijderd";
}
