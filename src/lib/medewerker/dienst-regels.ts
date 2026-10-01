import { nlMoment } from "@/lib/nl-tijd";

/**
 * Pure regels voor aanmelden/afmelden in het medewerkerportaal (geen DB-toegang, wel getest).
 * De DB-kant staat in `lib/medewerker/aanmelden.ts`.
 */

/** Binnen dit aantal uur vóór de start annuleert een medewerker niet meer zelf, maar zoekt hij een vervanger. */
export const ANNULEER_GRENS_UREN = 48;

/** Statussen van een eigen aanmelding waarvoor nog niemand is ingepland: vrij terugtrekken. */
export const VRIJ_AFMELDBAAR = ["aangemeld", "uitgenodigd"] as const;

/** Een eerdere aanmelding met deze status mag opnieuw worden geactiveerd (zelfde rij, i.v.m. unieke index). */
export const HERACTIVEERBAAR = ["geannuleerd", "afgewezen", "vervangen"] as const;

/** Uren tussen nu en de dienststart, waarbij de dienststart als Nederlandse tijd wordt gelezen. */
export function urenTotDienststart(datum: string, startTijd: string, nu: Date = new Date()): number {
  return (nlMoment(datum, startTijd).getTime() - nu.getTime()) / (1000 * 60 * 60);
}

export type AnnuleerUitkomst = "direct" | "vervanging" | "begonnen";

/**
 * Wat er gebeurt als een ingeplande medewerker annuleert (gelijk aan de bestaande annuleer-flow):
 * meer dan 48 uur vooraf → direct geannuleerd; daarbinnen → vervanger zoeken; gestart → niet meer.
 * Er is in deze flow geen automatische boete (boetes zijn een admin-actie bij een no-show).
 */
export function annuleerUitkomst(urenTotStart: number): AnnuleerUitkomst {
  if (urenTotStart > ANNULEER_GRENS_UREN) return "direct";
  if (urenTotStart > 0) return "vervanging";
  return "begonnen";
}

type DienstCapaciteit = {
  status?: string | null;
  plekken_beschikbaar?: number | null;
  plekken_totaal?: number | null;
  aantal_nodig?: number | null;
};

/** Totaal aantal plekken van een dienst (zelfde fallback als herbereken_plekken in de database). */
export function plekkenTotaal(dienst: DienstCapaciteit): number {
  return dienst.plekken_totaal ?? dienst.aantal_nodig ?? 1;
}

/**
 * Is er nog een plek vrij? `ingeplandAantal` (live geteld) heeft voorrang op de opgeslagen
 * `plekken_beschikbaar`, die achter kan lopen zolang de DB-trigger nog niet bestaat.
 */
export function heeftVrijePlek(dienst: DienstCapaciteit, ingeplandAantal?: number): boolean {
  if (dienst.status && !["open", "vol"].includes(dienst.status)) return false;
  if (typeof ingeplandAantal === "number") return ingeplandAantal < plekkenTotaal(dienst);
  if (dienst.status === "vol") return false;
  return dienst.plekken_beschikbaar == null || dienst.plekken_beschikbaar > 0;
}

/** Documenttypen die bij verlopen een aanmelding blokkeren. */
export const KRITIEKE_DOCUMENTEN = ["id_bewijs", "werkvergunning", "verblijfsvergunning"] as const;

const DOCUMENT_LABELS: Record<string, string> = {
  id_bewijs: "ID-bewijs",
  werkvergunning: "werkvergunning",
  verblijfsvergunning: "verblijfsvergunning",
};

type DocumentVersie = { document_type: string; uploaded_at?: string | null; created_at?: string | null };

/**
 * Alleen het nieuwste document per documenttype (op uploaded_at, anders created_at).
 * Een oud, verlopen ID-bewijs telt niet meer zodra er een nieuwer exemplaar is geüpload.
 * Documenten zonder datum verliezen van documenten met datum; bij gelijke datum wint de eerste.
 */
export function nieuwstePerType<T extends DocumentVersie>(documenten: readonly T[]): T[] {
  const perType = new Map<string, T>();
  const moment = (d: DocumentVersie) => d.uploaded_at ?? d.created_at ?? "";
  for (const doc of documenten) {
    const huidig = perType.get(doc.document_type);
    if (!huidig || moment(doc) > moment(huidig)) perType.set(doc.document_type, doc);
  }
  return [...perType.values()];
}

/**
 * Melding als de medewerker niet ingezet mag worden (verlopen ID/werkvergunning), anders null.
 * `vandaag` is YYYY-MM-DD (NL); datums vóór vandaag zijn verlopen. Per documenttype telt alleen
 * het nieuwste document (zie nieuwstePerType).
 */
export function inzetbaarheidsMelding(input: {
  vandaag: string;
  documenten: { document_type: string; expiry_date: string | null; uploaded_at?: string | null }[];
  werkvergunningGeldigTot?: string | null;
}): string | null {
  const verlopen = nieuwstePerType(input.documenten)
    .filter((d) => (KRITIEKE_DOCUMENTEN as readonly string[]).includes(d.document_type))
    .filter((d) => !!d.expiry_date && d.expiry_date < input.vandaag)
    .map((d) => DOCUMENT_LABELS[d.document_type] ?? d.document_type);
  if (verlopen.length > 0) {
    const uniek = [...new Set(verlopen)].join(", ");
    return `Je kunt je niet aanmelden: je ${uniek} is verlopen. Upload een nieuw document bij Documenten.`;
  }
  if (input.werkvergunningGeldigTot && input.werkvergunningGeldigTot < input.vandaag) {
    return "Je werkvergunning is verlopen. Neem contact op met TopTalent om je werkvergunning te vernieuwen.";
  }
  return null;
}

/**
 * Aantal documenten dat verlopen is of binnen `grens` (YYYY-MM-DD, inclusief) verloopt,
 * waarbij per documenttype alleen het nieuwste document meetelt.
 */
export function telVerlopendeDocumenten(
  documenten: readonly { document_type: string; expiry_date: string | null; uploaded_at?: string | null }[],
  grens: string,
): number {
  return nieuwstePerType(documenten).filter((d) => !!d.expiry_date && d.expiry_date <= grens).length;
}
