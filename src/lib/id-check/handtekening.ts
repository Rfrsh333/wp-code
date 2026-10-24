import { createHmac, timingSafeEqual } from "crypto";

/**
 * Controle van de handtekening op een Didit-webhook (https://docs.didit.me/integration/webhooks,
 * "Signature verification"). Puur, los testbaar (tests/unit/id-check-didit.spec.ts).
 *
 * - `X-Signature`: HMAC-SHA256 (hex) over de ruwe body zoals Didit die verstuurde. In een
 *   Next.js-route lezen we de body zelf met `request.text()`, dus de bytes zijn onaangeroerd: dit is
 *   de eerste keus.
 * - `X-Signature-V2`: HMAC-SHA256 over de canonieke JSON (sleutels gesorteerd, compact, Unicode
 *   onveranderd). Terugval als de body onderweg toch opnieuw gecodeerd is.
 * - `X-Signature-Simple` accepteren we NIET: die dekt alleen de envelop, niet de beslissing.
 * - Voor 24 uur na het roteren van het geheim stuurt Didit ook `…-Previous`-headers mee (zelfde
 *   handtekening met het oude geheim); een match op een van beide is genoeg.
 * - Tijdstempel: `X-Timestamp` (Unix-seconden) mag maximaal 300 seconden afwijken. De header zelf is
 *   niet ondertekend; daarom moet ook `timestamp` in de (ondertekende) body vers zijn, anders kan een
 *   oude, geldige body met een nieuwe header worden afgespeeld.
 */

export const MAX_AFWIJKING_SECONDEN = 300;

type Headers = { get(naam: string): string | null };

export type HandtekeningUitslag =
  | { ok: true; variant: "raw" | "v2" }
  | { ok: false; reden: "geen_geheim" | "geen_tijdstempel" | "verlopen" | "ongeldig" };

function hmacHex(geheim: string, inhoud: string): string {
  return createHmac("sha256", geheim).update(inhoud, "utf8").digest("hex");
}

function gelijk(verwacht: string, ontvangen: string): boolean {
  const a = Buffer.from(verwacht, "utf8");
  const b = Buffer.from(ontvangen.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Sleutels recursief sorteren (canonieke JSON van X-Signature-V2). */
function sorteerSleutels(waarde: unknown): unknown {
  if (Array.isArray(waarde)) return waarde.map(sorteerSleutels);
  if (waarde !== null && typeof waarde === "object") {
    const uit: Record<string, unknown> = {};
    for (const sleutel of Object.keys(waarde as Record<string, unknown>).sort()) {
      uit[sleutel] = sorteerSleutels((waarde as Record<string, unknown>)[sleutel]);
    }
    return uit;
  }
  return waarde;
}

/** Canonieke JSON zoals Didit die voor X-Signature-V2 ondertekent; null als de body geen JSON is. */
export function canoniekeJson(ruweBody: string): string | null {
  try {
    return JSON.stringify(sorteerSleutels(JSON.parse(ruweBody)));
  } catch {
    return null;
  }
}

function headerWaarden(headers: Headers, naam: string): string[] {
  return [headers.get(naam), headers.get(`${naam}-Previous`)].filter((w): w is string => !!w && !!w.trim());
}

function isVers(seconden: number, nuSeconden: number): boolean {
  return Number.isFinite(seconden) && Math.abs(nuSeconden - seconden) <= MAX_AFWIJKING_SECONDEN;
}

export function controleerDiditHandtekening(input: {
  ruweBody: string;
  headers: Headers;
  geheim: string | null | undefined;
  nuSeconden: number;
}): HandtekeningUitslag {
  const { ruweBody, headers, geheim, nuSeconden } = input;
  if (!geheim) return { ok: false, reden: "geen_geheim" };

  const tijdHeader = headers.get("X-Timestamp");
  if (!tijdHeader || !/^\d{1,12}$/.test(tijdHeader.trim())) return { ok: false, reden: "geen_tijdstempel" };
  if (!isVers(Number(tijdHeader.trim()), nuSeconden)) return { ok: false, reden: "verlopen" };

  let variant: "raw" | "v2" | null = null;
  const raw = headerWaarden(headers, "X-Signature");
  if (raw.length > 0) {
    const verwacht = hmacHex(geheim, ruweBody);
    if (raw.some((h) => gelijk(verwacht, h))) variant = "raw";
  }
  if (!variant) {
    const v2 = headerWaarden(headers, "X-Signature-V2");
    const canoniek = v2.length > 0 ? canoniekeJson(ruweBody) : null;
    if (canoniek !== null) {
      const verwacht = hmacHex(geheim, canoniek);
      if (v2.some((h) => gelijk(verwacht, h))) variant = "v2";
    }
  }
  if (!variant) return { ok: false, reden: "ongeldig" };

  // De ondertekende `timestamp` in de body moet ook vers zijn (tegen het opnieuw afspelen).
  try {
    const body = JSON.parse(ruweBody) as { timestamp?: unknown };
    if (body && typeof body === "object" && body.timestamp !== undefined && body.timestamp !== null) {
      if (!isVers(Number(body.timestamp), nuSeconden)) return { ok: false, reden: "verlopen" };
    }
  } catch {
    return { ok: false, reden: "ongeldig" };
  }
  return { ok: true, variant };
}

/** Voor tests en de Didit-console-test: maak de headers zoals Didit ze zou sturen. */
export function maakDiditHeaders(ruweBody: string, geheim: string, tijdstempel: number): Record<string, string> {
  const canoniek = canoniekeJson(ruweBody) ?? ruweBody;
  return {
    "X-Timestamp": String(tijdstempel),
    "X-Signature": hmacHex(geheim, ruweBody),
    "X-Signature-V2": hmacHex(geheim, canoniek),
  };
}
