/**
 * Datum/tijd in Nederlandse tijd (Europe/Amsterdam), los van de tijdzone van de server (UTC op Vercel)
 * of de browser. Gebruik dit voor "vandaag", dienststart-grenzen en maandindelingen.
 */

const TZ = "Europe/Amsterdam";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD van het moment `d` in Nederlandse tijd. */
export function nlDatum(d: Date = new Date()): string {
  return dateFmt.format(d);
}

/** Vandaag (NL) als YYYY-MM-DD. */
export function nlVandaag(): string {
  return nlDatum(new Date());
}

/** YYYY-MM-DD plus/min `dagen`, puur op kalenderdatum (geen tijdzone-effecten). */
export function plusDagen(datum: string, dagen: number): string {
  const [y, m, d] = datum.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + dagen));
  return t.toISOString().slice(0, 10);
}

/** UTC-offset van Amsterdam (in minuten) op het gegeven moment, bv. 60 of 120. */
function amsterdamOffsetMinuten(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Zet een NL-wandkloktijd (datum YYYY-MM-DD + tijd HH:MM[:SS]) om naar een echt moment.
 * `new Date("2026-10-01T18:00")` op een UTC-server leest dat als 18:00 UTC = 20:00 NL; dit niet.
 */
export function nlMoment(datum: string, tijd: string): Date {
  const [y, m, d] = datum.split("-").map(Number);
  const [hh, mm, ss] = tijd.split(":").map(Number);
  const naiefUtc = Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0);
  // Twee iteraties dekken de zomertijdovergang.
  let offset = amsterdamOffsetMinuten(new Date(naiefUtc));
  offset = amsterdamOffsetMinuten(new Date(naiefUtc - offset * 60000));
  return new Date(naiefUtc - offset * 60000);
}

/** Eerste en laatste dag (YYYY-MM-DD) van een kalendermaand; `maand` is 1-12. */
export function maandGrenzen(jaar: number, maand: number): { start: string; eind: string } {
  const start = `${jaar}-${String(maand).padStart(2, "0")}-01`;
  const laatste = new Date(Date.UTC(jaar, maand, 0)).getUTCDate();
  const eind = `${jaar}-${String(maand).padStart(2, "0")}-${String(laatste).padStart(2, "0")}`;
  return { start, eind };
}

/**
 * Gewerkte uren tussen start en eind (HH:MM), minus pauze in minuten.
 * Eind vóór start = nachtdienst over middernacht (22:00–03:00 = 5 uur).
 */
export function dienstUren(start: string, eind: string, pauzeMinuten = 0): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  if (!/^\d{1,2}:\d{2}/.test(start) || !/^\d{1,2}:\d{2}/.test(eind)) return NaN;
  let duur = toMin(eind) - toMin(start);
  if (duur <= 0) duur += 24 * 60;
  return Math.max(0, (duur - pauzeMinuten) / 60);
}
