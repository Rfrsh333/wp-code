import type { AdminRole } from "@/lib/admin-auth";
import { eerVolgensControles, kopieBijAccountVerwijderen } from "@/lib/id-check/controlerecord";
import { documentOpslagPad } from "@/lib/medewerker/documenten";

/**
 * Admin → Medewerkers → Wav-kopieën: één plek om de bewaarde kopie van het ID van een werknemer van
 * buiten de EER/Zwitserland (Wet arbeid vreemdelingen, art. 15) terug te vinden, bijvoorbeeld als de
 * Arbeidsinspectie vraagt wie er werkte. Pure regels (geen server-imports, ook gebruikt in de UI),
 * getest in tests/unit/documenten-nawerk.spec.ts; de DB-kant staat in lib/id-check/wav-kopieen.ts.
 *
 * Twee bronnen:
 * - `bewaard`: id_wav_kopieen, de kopieën van verwijderde accounts (migratie 20261024_id_wav_kopieen.sql);
 * - `medewerker`: medewerker_documenten van bestaande accounts, dezelfde selectie als bij het
 *   verwijderen van een account (kopieBijAccountVerwijderen = "bewaren"): ID-bewijs met een bestand in
 *   de opslag, niet afgekeurd, en kopie_wav of een nationaliteit buiten de EER volgens de controles.
 * Geen verwijderknop: opruimen gaat via de retentie-cron na bewaar_tot.
 */

/** Alleen eigenaar en operations, zoals de opschoontool voor oude ID-kopieën. */
export const WAV_KOPIE_ROLLEN: AdminRole[] = ["owner", "operations"];

/** Hoe lang de link naar een kopie geldig is (seconden). */
export const WAV_KOPIE_LINK_SECONDEN = 5 * 60;

export type WavKopieBron = "bewaard" | "medewerker";

export type WavKopieItem = {
  sleutel: string;
  bron: WavKopieBron;
  id: string;
  medewerker_id: string | null;
  naam: string | null;
  account_bestaat: boolean;
  vervaldatum: string | null;
  geupload_op: string | null;
  bewaar_tot: string | null;
  /** Account bestaat nog: de termijn schuift mee zolang de werknemer werkt. */
  bewaar_tot_voorlopig: boolean;
  /** false = de kopie is nog niet beoordeeld (wel bewaard volgens de Wav). */
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

type Controle = { eer?: boolean | null; status?: string | null };

/**
 * Is deze documentrij een Wav-kopie? ID-bewijs met een bestand in de opslag van TopTalent, en
 * volgens kopieBijAccountVerwijderen te bewaren (kopie_wav, of buiten de EER volgens `controles`,
 * nieuwste eerst; afgekeurd telt nooit).
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

function sorteerNaam(a: WavKopieItem, b: WavKopieItem): number {
  if (!a.naam !== !b.naam) return a.naam ? -1 : 1;
  const opNaam = (a.naam ?? "").localeCompare(b.naam ?? "", "nl", { sensitivity: "base" });
  if (opNaam !== 0) return opNaam;
  return (b.geupload_op ?? "").localeCompare(a.geupload_op ?? "");
}

/**
 * De lijst voor de admin. `medewerkers` = bestaande accounts (id → naam). `bewaarTot` = per
 * documentrij de termijn zoals die nu zou gelden (anders bewaar_tot van de rij). Een rij in
 * id_wav_kopieen met hetzelfde bestand als een documentrij (verwijderen mislukte na het vastleggen)
 * telt één keer, als documentrij.
 */
export function wavKopieenOverzicht(input: {
  bewaard: readonly WavBewaardRij[];
  documenten: readonly WavDocumentRij[];
  controles: ReadonlyMap<string, readonly Controle[]>;
  medewerkers: ReadonlyMap<string, string | null>;
  bewaarTot?: ReadonlyMap<string, string>;
}): WavKopieItem[] {
  const items: WavKopieItem[] = [];
  const paden = new Set<string>();

  for (const doc of input.documenten) {
    if (!isWavKopieDocument(doc, input.controles.get(doc.medewerker_id) ?? [])) continue;
    paden.add(documentOpslagPad(doc) as string);
    items.push({
      sleutel: `medewerker:${doc.id}`,
      bron: "medewerker",
      id: doc.id,
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

  for (const rij of input.bewaard) {
    if (paden.has(rij.bestand_pad)) continue;
    const bestaat = !!rij.medewerker_id && input.medewerkers.has(rij.medewerker_id);
    items.push({
      sleutel: `bewaard:${rij.id}`,
      bron: "bewaard",
      id: rij.id,
      medewerker_id: bestaat ? rij.medewerker_id : null,
      naam: rij.naam ?? (rij.medewerker_id ? (input.medewerkers.get(rij.medewerker_id) ?? null) : null),
      account_bestaat: bestaat,
      vervaldatum: rij.vervaldatum,
      geupload_op: rij.geupload_op,
      bewaar_tot: rij.bewaar_tot,
      bewaar_tot_voorlopig: false,
      goedgekeurd: true,
    });
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
  if (b.bron !== "bewaard" && b.bron !== "medewerker") return null;
  if (typeof b.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id)) return null;
  return { bron: b.bron, id: b.id };
}
