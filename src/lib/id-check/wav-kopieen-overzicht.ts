import type { AdminRole } from "@/lib/admin-auth";
import { eerVolgensControles, kopieBijAccountVerwijderen } from "@/lib/id-check/controlerecord";
import { documentOpslagPad } from "@/lib/medewerker/documenten";
import { isWavVergunning, vergunningBijAccountVerwijderen } from "@/lib/medewerker/bestanden-bij-verwijderen";

/**
 * Admin → Medewerkers → Wav-kopieën: één plek om de bewaarde kopie van het ID en de werk- of
 * verblijfsvergunning van een werknemer van buiten de EER/Zwitserland (Wet arbeid vreemdelingen)
 * terug te vinden, bijvoorbeeld als de Arbeidsinspectie vraagt wie er werkte. Pure regels (geen
 * server-imports, ook gebruikt in de UI), getest in tests/unit/documenten-nawerk.spec.ts; de DB-kant
 * staat in lib/id-check/wav-kopieen.ts.
 *
 * Drie bronnen:
 * - `bewaard`: id_wav_kopieen, ID-kopieën van verwijderde accounts (migratie 20261024_id_wav_kopieen.sql);
 * - `bewaard_document`: bewaarde_documenten, vergunningen van verwijderde accounts (migratie
 *   20261024_documenten_nawerk.sql). Loonheffingsverklaring en contract staan daar ook, maar niet hier;
 * - `medewerker`: medewerker_documenten van bestaande accounts, dezelfde selectie als bij het
 *   verwijderen van een account: een ID-kopie die blijft (kopieBijAccountVerwijderen) of een
 *   vergunning die blijft (vergunningBijAccountVerwijderen), met een bestand in de opslag.
 * Geen verwijderknop: opruimen gaat via de retentie-cron na bewaar_tot.
 */

/** Alleen eigenaar en operations, zoals de opschoontool voor oude ID-kopieën. */
export const WAV_KOPIE_ROLLEN: AdminRole[] = ["owner", "operations"];

/** Hoe lang de link naar een kopie geldig is (seconden). */
export const WAV_KOPIE_LINK_SECONDEN = 5 * 60;

export type WavKopieBron = "bewaard" | "bewaard_document" | "medewerker";

export type WavKopieItem = {
  sleutel: string;
  bron: WavKopieBron;
  id: string;
  /** id_bewijs, werkvergunning of verblijfsvergunning. */
  soort: string;
  medewerker_id: string | null;
  naam: string | null;
  account_bestaat: boolean;
  /** Vervaldatum van het document; onbekend bij een bewaarde vergunning van een verwijderd account. */
  vervaldatum: string | null;
  geupload_op: string | null;
  bewaar_tot: string | null;
  /** Account bestaat nog: de termijn schuift mee zolang de werknemer werkt. */
  bewaar_tot_voorlopig: boolean;
  /** false = het document is nog niet beoordeeld (wel bewaard volgens de Wav). */
  goedgekeurd: boolean;
};

export type WavDocumentRij = {
  id: string;
  medewerker_id: string;
  document_type?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  verificatie_methode?: string | null;
  review_status?: string | null;
  expiry_date?: string | null;
  uploaded_at?: string | null;
  bewaar_tot?: string | null;
};

export type WavBewaardRij = {
  id: string;
  medewerker_id: string | null;
  naam: string | null;
  bestand_pad: string;
  vervaldatum: string | null;
  geupload_op: string | null;
  bewaar_tot: string | null;
};

export type WavBewaardDocumentRij = {
  id: string;
  medewerker_id: string | null;
  document_type: string;
  naam: string | null;
  bestand_pad: string;
  geupload_op: string | null;
  bewaar_tot: string | null;
};

type Controle = { eer?: boolean | null; status?: string | null };

const SOORT_LABELS: Record<string, string> = {
  id_bewijs: "ID-bewijs",
  werkvergunning: "Werkvergunning",
  verblijfsvergunning: "Verblijfsvergunning",
};

export function wavSoortLabel(soort: string): string {
  return SOORT_LABELS[soort] ?? soort;
}

/**
 * Is deze documentrij een Wav-kopie van het ID? ID-bewijs met een bestand in de opslag van
 * TopTalent, en volgens kopieBijAccountVerwijderen te bewaren (kopie_wav, of buiten de EER volgens
 * `controles`, nieuwste eerst; afgekeurd telt nooit).
 */
export function isWavKopieDocument(doc: WavDocumentRij, controles: readonly Controle[]): boolean {
  if (doc.document_type !== "id_bewijs") return false;
  if (!documentOpslagPad(doc)) return false;
  return (
    kopieBijAccountVerwijderen({
      verificatieMethode: doc.verificatie_methode,
      reviewStatus: doc.review_status,
      eer: eerVolgensControles(controles),
    }) === "bewaren"
  );
}

/**
 * Hoort deze documentrij in de lijst? Een Wav-kopie van het ID (isWavKopieDocument) of een werk- of
 * verblijfsvergunning met een bestand die bij het verwijderen van het account blijft (niet afgekeurd,
 * werknemer niet uit de EER/Zwitserland volgens zijn controles; onbekend telt als bewaren).
 */
export function isWavDocument(doc: WavDocumentRij, controles: readonly Controle[]): boolean {
  if (doc.document_type === "id_bewijs") return isWavKopieDocument(doc, controles);
  if (!isWavVergunning(doc.document_type) || !documentOpslagPad(doc)) return false;
  return vergunningBijAccountVerwijderen({ reviewStatus: doc.review_status, eer: eerVolgensControles(controles) }) === "bewaren";
}

function sorteerNaam(a: WavKopieItem, b: WavKopieItem): number {
  if (!a.naam !== !b.naam) return a.naam ? -1 : 1;
  const opNaam = (a.naam ?? "").localeCompare(b.naam ?? "", "nl", { sensitivity: "base" });
  if (opNaam !== 0) return opNaam;
  return (b.geupload_op ?? "").localeCompare(a.geupload_op ?? "");
}

/**
 * De lijst voor de admin. `medewerkers` = bestaande accounts (id → naam). `bewaarTot` = per
 * documentrij de termijn zoals die nu zou gelden (anders bewaar_tot van de rij). Een bewaarde rij met
 * hetzelfde bestand als een documentrij (verwijderen mislukte na het vastleggen) telt één keer, als
 * documentrij. Uit bewaarde_documenten alleen vergunningen.
 */
export function wavKopieenOverzicht(input: {
  bewaard: readonly WavBewaardRij[];
  bewaardeDocumenten?: readonly WavBewaardDocumentRij[];
  documenten: readonly WavDocumentRij[];
  controles: ReadonlyMap<string, readonly Controle[]>;
  medewerkers: ReadonlyMap<string, string | null>;
  bewaarTot?: ReadonlyMap<string, string>;
}): WavKopieItem[] {
  const items: WavKopieItem[] = [];
  const paden = new Set<string>();

  for (const doc of input.documenten) {
    if (!isWavDocument(doc, input.controles.get(doc.medewerker_id) ?? [])) continue;
    paden.add(documentOpslagPad(doc) as string);
    items.push({
      sleutel: `medewerker:${doc.id}`,
      bron: "medewerker",
      id: doc.id,
      soort: doc.document_type as string,
      medewerker_id: doc.medewerker_id,
      naam: input.medewerkers.get(doc.medewerker_id) ?? null,
      account_bestaat: input.medewerkers.has(doc.medewerker_id),
      vervaldatum: doc.expiry_date ?? null,
      geupload_op: doc.uploaded_at ?? null,
      bewaar_tot: input.bewaarTot?.get(doc.id) ?? doc.bewaar_tot ?? null,
      bewaar_tot_voorlopig: true,
      goedgekeurd: doc.review_status === "goedgekeurd",
    });
  }

  const bewaardItem = (
    rij: { id: string; medewerker_id: string | null; naam: string | null; geupload_op: string | null; bewaar_tot: string | null },
    extra: { bron: "bewaard" | "bewaard_document"; soort: string; vervaldatum: string | null },
  ): WavKopieItem => {
    const bestaat = !!rij.medewerker_id && input.medewerkers.has(rij.medewerker_id);
    return {
      sleutel: `${extra.bron}:${rij.id}`,
      bron: extra.bron,
      id: rij.id,
      soort: extra.soort,
      medewerker_id: bestaat ? rij.medewerker_id : null,
      naam: rij.naam ?? (rij.medewerker_id ? (input.medewerkers.get(rij.medewerker_id) ?? null) : null),
      account_bestaat: bestaat,
      vervaldatum: extra.vervaldatum,
      geupload_op: rij.geupload_op,
      bewaar_tot: rij.bewaar_tot,
      bewaar_tot_voorlopig: false,
      goedgekeurd: true,
    };
  };

  for (const rij of input.bewaard) {
    if (paden.has(rij.bestand_pad)) continue;
    paden.add(rij.bestand_pad);
    items.push(bewaardItem(rij, { bron: "bewaard", soort: "id_bewijs", vervaldatum: rij.vervaldatum }));
  }
  for (const rij of input.bewaardeDocumenten ?? []) {
    if (!isWavVergunning(rij.document_type) || paden.has(rij.bestand_pad)) continue;
    paden.add(rij.bestand_pad);
    items.push(bewaardItem(rij, { bron: "bewaard_document", soort: rij.document_type, vervaldatum: null }));
  }

  return items.sort(sorteerNaam);
}

function normaliseer(tekst: string): string {
  return tekst
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Zoeken op naam: elk woord moet in de naam staan, hoofdletters en accenten maken niet uit. */
export function zoekWavKopieen<T extends { naam: string | null }>(items: readonly T[], zoekterm: string): T[] {
  const woorden = normaliseer(zoekterm).split(" ").filter(Boolean);
  if (woorden.length === 0) return [...items];
  return items.filter((item) => {
    const naam = normaliseer(item.naam ?? "");
    return woorden.every((w) => naam.includes(w));
  });
}

/** Geldig verzoek om een kopie te openen, of null. */
export function leesOpenVerzoek(body: unknown): { bron: WavKopieBron; id: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.actie !== "open") return null;
  if (b.bron !== "bewaard" && b.bron !== "bewaard_document" && b.bron !== "medewerker") return null;
  if (typeof b.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id)) return null;
  return { bron: b.bron, id: b.id };
}
