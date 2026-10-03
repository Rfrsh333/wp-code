import { berekenToeslagRegel } from "@/lib/toeslag";
import { roundCurrency } from "@/lib/reiskosten";
import { nlMoment, plusDagen } from "@/lib/nl-tijd";

/**
 * Eén definitie van "verdiend" voor dashboard, Uren en Financieel (pure functies, getest).
 *
 * Keuze (1-10-2026): een uren-registratie telt als verdiend zodra de klant óf TopTalent hem
 * heeft goedgekeurd — `klant_goedgekeurd`, `goedgekeurd` — en ook nadat hij is gefactureerd
 * (`gefactureerd`, de volgende stap van beide). Voorheen telde het dashboard
 * klant_goedgekeurd+gefactureerd, Uren hetzelfde maar op aanmaakdatum, en Financieel alleen
 * `goedgekeurd`; drie schermen gaven dus drie verschillende bedragen.
 * De maand is die van de dienstdatum (zoals dashboard en Financieel al deden).
 *
 * Het bedrag per regel is ongewijzigd de bestaande formule van dashboard/Financieel:
 * uren × (klanttarief − €4 marge, min. 0) + toeslag (lib/toeslag). Alleen Uren rekende
 * zonder toeslag; die volgt nu dezelfde formule.
 */
export const VERDIEND_STATUSSEN = ["klant_goedgekeurd", "goedgekeurd", "gefactureerd"] as const;

export function isVerdiend(status: string | null | undefined): boolean {
  return (VERDIEND_STATUSSEN as readonly string[]).includes(status ?? "");
}

/** Bestaande marge-regel: medewerkerloon = klanttarief − €4, nooit negatief. */
export function medewerkerUurtarief(klantUurtarief: number | null | undefined): number {
  return Math.max(0, (klantUurtarief || 0) - 4);
}

export type UrenRegel = {
  status: string;
  gewerkte_uren: number | null;
  start_tijd?: string | null;
  eind_tijd?: string | null;
  datum: string | null;
  klant_uurtarief: number | null;
};

/** Verdiensten van één registratie (uren × medewerkertarief + toeslag), zelfde formule als voorheen. */
export function verdienstenVanRegel(regel: UrenRegel): number {
  const uren = regel.gewerkte_uren || 0;
  const tarief = medewerkerUurtarief(regel.klant_uurtarief);
  const toeslag = berekenToeslagRegel(uren, tarief, regel.datum, regel.start_tijd, regel.eind_tijd);
  return uren * tarief + toeslag.bedrag;
}

/** Som van verdiende uren/bedragen voor dienstdatums binnen [start, eind] (YYYY-MM-DD, inclusief). */
export function telVerdiend(regels: UrenRegel[], periode: { start: string; eind: string }): { bedrag: number; uren: number } {
  let bedrag = 0;
  let uren = 0;
  for (const r of regels) {
    if (!isVerdiend(r.status) || !r.datum) continue;
    if (r.datum < periode.start || r.datum > periode.eind) continue;
    bedrag += verdienstenVanRegel(r);
    uren += r.gewerkte_uren || 0;
  }
  return { bedrag: roundCurrency(bedrag), uren: roundCurrency(uren) };
}

/** Eindmoment van een dienst (NL-tijd); eind ≤ start = nachtdienst, eindigt de volgende dag. */
export function dienstEindMoment(datum: string, startTijd: string, eindTijd: string): Date {
  const overMiddernacht = eindTijd.slice(0, 5) <= startTijd.slice(0, 5);
  return nlMoment(overMiddernacht ? plusDagen(datum, 1) : datum, eindTijd);
}

type UrenDienst = {
  datum: string | null;
  start_tijd: string | null;
  eind_tijd: string | null;
  check_in_at: string | null;
  qr_verplicht: boolean | null;
  heeft_uren: boolean;
};

/** Ingeplande dienst die voorbij is en waarvoor nog geen uren zijn ingediend. */
function isAfgelopenZonderUren(d: UrenDienst, nu: Date): boolean {
  if (d.heeft_uren || !d.datum || !d.start_tijd || !d.eind_tijd) return false;
  return dienstEindMoment(d.datum, d.start_tijd, d.eind_tijd).getTime() <= nu.getTime();
}

/**
 * Laat de backend het indienen toe? Zelfde regel als `uren_indienen` in
 * api/medewerker/diensten: ingecheckt, of de klant heeft QR expliciet uitgezet
 * (onbekend/null = verplicht).
 */
function magIndienenZonderBlokkade(d: Pick<UrenDienst, "check_in_at" | "qr_verplicht">): boolean {
  return !!d.check_in_at || d.qr_verplicht === false;
}

/**
 * Moet de medewerker voor deze ingeplande dienst nog uren registreren?
 * Dienst is afgelopen, er zijn nog geen uren, en hij is ingecheckt (of de klant eist geen QR).
 */
export function isTeRegistreren(d: UrenDienst, nu: Date = new Date()): boolean {
  return isAfgelopenZonderUren(d, nu) && magIndienenZonderBlokkade(d);
}

/**
 * Afgelopen dienst zonder uren waarvoor indienen geblokkeerd is omdat de QR-check-in ontbreekt
 * en de klant QR verplicht stelt. De medewerker kan zelf niets indienen (de backend weigert);
 * de app toont de dienst met uitleg in plaats van hem te verbergen.
 */
export function wachtOpCheckin(d: UrenDienst, nu: Date = new Date()): boolean {
  return isAfgelopenZonderUren(d, nu) && !magIndienenZonderBlokkade(d);
}
