/**
 * Pure regels voor afspraken (bookings). Los van Supabase zodat ze te testen zijn.
 *
 * Achtergrond: de eindtijd werd vroeger altijd start + 60 minuten, en een
 * conflict werd alleen herkend bij exact dezelfde starttijd. Een overleg van
 * 30 min om 10:30 kon zo dwars door een intake van 10:00–11:30 heen geboekt
 * worden. Hier staat de logica om op overlappende tijdvakken te controleren.
 */

export const TIJD_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
export const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "HH:MM" of "HH:MM:SS" → minuten sinds middernacht. */
export function tijdNaarMinuten(tijd: string): number {
  const [h, m] = tijd.split(":").map(Number);
  return h * 60 + m;
}

/** Minuten sinds middernacht → "HH:MM". */
export function minutenNaarTijd(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** "HH:MM" → "HH:MM:SS" (zoals Postgres `time` het teruggeeft). */
export function volledigeTijd(tijd: string): string {
  return tijd.length === 5 ? `${tijd}:00` : tijd;
}

/** Eindtijd op basis van de duur van het afspraaktype. `null` als het over middernacht gaat. */
export function berekenEindtijd(start: string, duurMinuten: number): string | null {
  const eind = tijdNaarMinuten(start) + duurMinuten;
  if (eind > 24 * 60) return null;
  return minutenNaarTijd(eind);
}

export interface Tijdvak {
  start: string;
  eind: string;
}

/**
 * Halfopen intervallen [start, eind): 10:00–11:00 en 11:00–11:30 overlappen
 * dus NIET (aansluitend boeken mag).
 */
export function tijdvakkenOverlappen(a: Tijdvak, b: Tijdvak): boolean {
  return tijdNaarMinuten(a.start) < tijdNaarMinuten(b.eind) && tijdNaarMinuten(b.start) < tijdNaarMinuten(a.eind);
}

/** Geeft het eerste bestaande tijdvak terug dat met het nieuwe overlapt. */
export function vindOverlap<T extends Tijdvak>(nieuw: Tijdvak, bestaande: T[]): T | null {
  return bestaande.find((b) => tijdvakkenOverlappen(nieuw, b)) ?? null;
}

/** Bookingstatussen die een tijdvak bezet houden (alles behalve geannuleerd). */
export const BEZETTENDE_STATUSSEN = ["confirmed", "completed", "no_show"] as const;

/** Toegestane waarden van bookings.source (CHECK in de database). */
export const BOOKING_SOURCES = ["website", "admin", "phone", "email"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** Valt terug op "website" bij een onbekende of ontbrekende source. */
export function geldigeSource(source: unknown): BookingSource {
  return (BOOKING_SOURCES as readonly string[]).includes(source as string)
    ? (source as BookingSource)
    : "website";
}
