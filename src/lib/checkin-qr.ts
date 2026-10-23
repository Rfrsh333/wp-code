/**
 * QR-code waarmee de klant een medewerker incheckt. Eén formaat voor alle plekken die een QR tonen
 * (Account-kaart, Documenten, straks de app) én voor de scanner in het klantportaal.
 * Voorheen codeerde Account alleen het e-mailadres en Documenten `type: "medewerker_id"` zonder id,
 * terwijl de scanner `type: "toptalent_medewerker"` + id eist — inchecken lukte dus nooit.
 */
export const CHECKIN_QR_TYPE = "toptalent_medewerker";

export function buildCheckinQr(medewerker: { id: string; naam?: string }): string {
  return JSON.stringify({ type: CHECKIN_QR_TYPE, id: medewerker.id, naam: medewerker.naam ?? "" });
}

export function parseCheckinQr(text: string): { id: string; naam?: string } | null {
  try {
    const data = JSON.parse(text) as { type?: string; id?: unknown; naam?: unknown };
    if (data.type !== CHECKIN_QR_TYPE || typeof data.id !== "string" || !data.id) return null;
    return { id: data.id, naam: typeof data.naam === "string" ? data.naam : undefined };
  } catch {
    return null;
  }
}
