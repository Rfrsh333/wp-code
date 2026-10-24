import { nieuwstePerType } from "@/lib/medewerker/dienst-regels";

/**
 * Vervalmails (api/cron/document-expiry): pure regels, getest in tests/unit/documenten-nawerk.spec.ts.
 *
 * - Per document hooguit één mail per mijlpaal: 30 dagen vooraf, 7 dagen vooraf en net verlopen.
 *   Een latere mijlpaal dekt een gemiste eerdere: wie pas 5 dagen vooraf in beeld komt, krijgt
 *   alleen de 7-dagenmail. Welke mijlpaal al verstuurd is, staat in `document_verval_meldingen`
 *   (migratie 20261024_documenten_nawerk.sql); zolang die tabel er niet is, gaat een mail alleen op
 *   de dag zelf (30 of 7 dagen vooraf, de dag na de vervaldatum). De cron draait één keer per dag.
 * - Alleen de nieuwste versie per documentsoort per werknemer telt (afgekeurde versies niet
 *   meegerekend): is er al een nieuwer document van dezelfde soort, dan geen mail over het oude.
 * - ID-bewijs: ook geen mail als er een goedgekeurde ID-controle (Didit of videocall) is van een ID
 *   dat later verloopt en nog geldig is.
 */

export const VERVAL_MIJLPALEN = ["30_dagen", "7_dagen", "verlopen"] as const;
export type VervalMijlpaal = (typeof VERVAL_MIJLPALEN)[number];

/** Waar een vervaldatum vandaan komt (kolom `bron` in document_verval_meldingen). */
export type VervalBron = "medewerker_document" | "certificering" | "werkvergunning";

/** Hoeveel dagen vóór de vervaldatum de eerste mail gaat. */
export const EERSTE_MIJLPAAL_DAGEN = 30;
/** Hoeveel dagen vóór de vervaldatum de tweede mail gaat. */
export const TWEEDE_MIJLPAAL_DAGEN = 7;
/**
 * Een verlopen document krijgt zijn mail alleen in de eerste dagen na de vervaldatum (als de cron
 * een dag mist). Geen mails over documenten die al lang verlopen zijn.
 */
export const VERLOPEN_TERUGKIJKEN_DAGEN = 7;

const DATUM = /^(\d{4})-(\d{2})-(\d{2})/;

/** Kalenderdagen van `vandaag` tot `datum` (YYYY-MM-DD; negatief = verleden). null bij een ongeldige datum. */
export function dagenTot(datum: string | null | undefined, vandaag: string): number | null {
  const a = DATUM.exec(datum ?? "");
  const b = DATUM.exec(vandaag);
  if (!a || !b) return null;
  const ta = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const tb = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((ta - tb) / 86_400_000);
}

/**
 * De mijlpaal waarin een document vandaag zit: 8-30 dagen vooraf "30_dagen", 0-7 dagen "7_dagen",
 * 1-7 dagen na de vervaldatum "verlopen". Daarbuiten null. Een document is verlopen vanaf de dag
 * ná de vervaldatum (zoals bij aanmelden, lib/medewerker/dienst-regels).
 */
export function vervalMijlpaal(vervaldatum: string | null | undefined, vandaag: string): VervalMijlpaal | null {
  const dagen = dagenTot(vervaldatum, vandaag);
  if (dagen === null) return null;
  if (dagen < -VERLOPEN_TERUGKIJKEN_DAGEN || dagen > EERSTE_MIJLPAAL_DAGEN) return null;
  if (dagen < 0) return "verlopen";
  return dagen <= TWEEDE_MIJLPAAL_DAGEN ? "7_dagen" : "30_dagen";
}

/**
 * Zonder opslag van verstuurde mails (migratie nog niet gedraaid): alleen op de dag van de mijlpaal
 * zelf. Zo gaat elke mijlpaal één keer, zolang de cron één keer per dag draait.
 */
export function vervalMijlpaalOpDeDag(vervaldatum: string | null | undefined, vandaag: string): VervalMijlpaal | null {
  const dagen = dagenTot(vervaldatum, vandaag);
  if (dagen === EERSTE_MIJLPAAL_DAGEN) return "30_dagen";
  if (dagen === TWEEDE_MIJLPAAL_DAGEN) return "7_dagen";
  if (dagen === -1) return "verlopen";
  return null;
}

/** Nog mailen? Alleen als er voor dit document (en deze vervaldatum) nog geen mail van deze of een latere mijlpaal is. */
export function moetVervalMailSturen(mijlpaal: VervalMijlpaal, alVerstuurd: readonly string[]): boolean {
  const rang = VERVAL_MIJLPALEN.indexOf(mijlpaal);
  return !alVerstuurd.some((m) => VERVAL_MIJLPALEN.indexOf(m as VervalMijlpaal) >= rang);
}

/** Sleutel voor "al verstuurd": per bron, document en vervaldatum (een gecorrigeerde datum telt als nieuw). */
export function vervalSleutel(bron: VervalBron, bronId: string, vervaldatum: string): string {
  return `${bron}:${bronId}:${vervaldatum.slice(0, 10)}`;
}

export type VervalDocument = {
  id: string;
  medewerker_id: string;
  document_type: string;
  expiry_date: string | null;
  uploaded_at?: string | null;
  created_at?: string | null;
  review_status?: string | null;
};

/**
 * Per werknemer en documentsoort de nieuwste versie (op uploaded_at) die niet is afgekeurd. Alleen
 * die kan een vervalmail krijgen; een oude, al vervangen versie niet. Een nieuwere upload die nog
 * beoordeeld wordt, telt al als vervanging (de werknemer heeft gedaan wat de mail vraagt).
 */
export function nieuwsteGeldigeVersies<T extends VervalDocument>(documenten: readonly T[]): T[] {
  const perMedewerker = new Map<string, T[]>();
  for (const doc of documenten) {
    if (doc.review_status === "afgekeurd") continue;
    const lijst = perMedewerker.get(doc.medewerker_id) ?? [];
    lijst.push(doc);
    perMedewerker.set(doc.medewerker_id, lijst);
  }
  return [...perMedewerker.values()].flatMap((lijst) => nieuwstePerType(lijst));
}

export type IdControleVoorVerval = { status: string | null; vervaldatum: string | null; beslist_op: string | null };

/**
 * Heeft de werknemer zijn ID al op een andere manier vernieuwd? Ja bij een goedgekeurde ID-controle
 * (Didit of videocall) van een ID dat later verloopt dan dit ID-bewijs en vandaag nog geldig is.
 * Zonder vervaldatum telt een goedkeuring die na de upload van dit ID-bewijs kwam.
 */
export function idControleVervangtDocument(
  doc: { expiry_date: string | null; uploaded_at?: string | null },
  controles: readonly IdControleVoorVerval[],
  vandaag: string,
): boolean {
  const verloopt = doc.expiry_date?.slice(0, 10) ?? null;
  return controles.some((c) => {
    if (c.status !== "goedgekeurd") return false;
    const vervaldatum = c.vervaldatum?.slice(0, 10) ?? null;
    if (vervaldatum) return !!verloopt && vervaldatum > verloopt && vervaldatum >= vandaag;
    return !!c.beslist_op && !!doc.uploaded_at && new Date(c.beslist_op).getTime() > new Date(doc.uploaded_at).getTime();
  });
}

export type VervalMailSoort = "document" | "id_controle" | "certificering" | "werkvergunning";

/** Onderwerp van de vervalmail. `naam` = documentsoort of naam van de certificering. */
export function vervalMailOnderwerp(input: { soort: VervalMailSoort; naam?: string; mijlpaal: VervalMijlpaal }): string {
  const verlopen = input.mijlpaal === "verlopen";
  switch (input.soort) {
    case "id_controle":
      return verlopen ? "Je ID-bewijs is verlopen" : "Je ID-bewijs verloopt binnenkort";
    case "certificering":
      return verlopen ? `Certificering verlopen: ${input.naam ?? ""}` : `Certificering verloopt binnenkort: ${input.naam ?? ""}`;
    case "werkvergunning":
      return verlopen ? "Werkvergunning verlopen" : "Werkvergunning verloopt binnenkort";
    default:
      return verlopen ? `Document verlopen: ${input.naam ?? "Document"}` : `Document verloopt binnenkort: ${input.naam ?? "Document"}`;
  }
}
