import { isGeldigIban } from "@/lib/medewerker/iban";
import { isGeldigBtwNummer, isGeldigKvkNummer } from "@/lib/medewerker/zzp-gegevens";
import { nieuwstePerType, teltVoorVerloop } from "@/lib/medewerker/dienst-regels";
import { OVEREENKOMST_VERSIE } from "@/content/overeenkomst-van-opdracht";
import { ZELFFACTURERING_VERSIE } from "@/content/zelffacturering-akkoord";

/**
 * B1: wat in orde moet zijn voordat een medewerker zich mag aanmelden voor een dienst of een
 * aanbieding/uitnodiging mag accepteren (beslissing Rachid, 23-10-2026). Pure regels, getest in
 * tests/unit/reageer-checklist.spec.ts. De DB-kant staat in lib/medewerker/checklist.ts.
 *
 * - geldig ID: een goedgekeurd ID-bewijs dat niet verlopen is (geen vervaldatum = niet verlopen);
 * - KvK-nummer: 8 cijfers;
 * - btw-nummer: Nederlands formaat (ook met KOR heb je een btw-id);
 * - IBAN: geldig (mod-97);
 * - akkoord op de overeenkomst van opdracht, op de huidige versie;
 * - stap 6 "Geld": akkoord op zelffacturering, op de huidige versie. Alleen als akkoord geven kan
 *   (ZELFFACTURERING_ACTIEF=1, tekst geen concept, termijn ingesteld, migratie gedraaid); de DB-kant
 *   geeft dat door met `opties.zelffacturering`. Anders verandert er niets aan de checklist.
 */

export const CHECKLIST_CODE = "checklist_onvolledig";

export type ChecklistCode = "id_bewijs" | "kvk_nummer" | "btw_nummer" | "iban" | "overeenkomst" | "zelffacturering";

/** Waar het punt geregeld wordt: web-pad + soort scherm (voor de app). */
export type ChecklistActie = { scherm: "profiel" | "documenten" | "overeenkomst" | "zelffacturering"; web_pad: string; label: string };

export type ChecklistPunt = {
  code: ChecklistCode;
  label: string;
  /** Wat er mis is, in gewone taal. Leeg als het punt in orde is. */
  uitleg: string;
  ok: boolean;
  actie: ChecklistActie;
};

export type ChecklistMedewerker = {
  kvk_nummer?: string | null;
  /** Ontsleuteld. */
  btw_nummer?: string | null;
  /** Ontsleuteld. */
  iban?: string | null;
  overeenkomst_akkoord_op?: string | null;
  overeenkomst_akkoord_versie?: string | null;
  zelffacturering_akkoord_op?: string | null;
  zelffacturering_akkoord_versie?: string | null;
};

export type ChecklistOpties = {
  /** true = punt "Akkoord zelffacturering" meenemen (vlag aan én migratie gedraaid). */
  zelffacturering?: boolean;
  /**
   * ID-controle via Didit staat aan (ID_CHECK_DIDIT_ACTIEF=1 + sleutels): dan gaat het ID-punt over
   * "Controleer je ID" in plaats van uploaden. `status` = status van de nieuwste ID-controle
   * (lib/id-check/regels), of null. Of het punt in orde is, blijft afhangen van een goedgekeurd,
   * geldig `id_bewijs` in medewerker_documenten.
   */
  idCheck?: { status: string | null };
};

export type ChecklistDocument = {
  document_type: string;
  expiry_date: string | null;
  review_status?: string | null;
  uploaded_at?: string | null;
};

const PROFIEL: ChecklistActie = { scherm: "profiel", web_pad: "/medewerker/profiel", label: "Naar je profiel" };
const DOCUMENTEN: ChecklistActie = { scherm: "documenten", web_pad: "/medewerker/documenten", label: "Naar je documenten" };
/** Zelfde scherm (de app kent "documenten"), andere knoptekst als de ID-controle via Didit aan staat. */
const ID_CHECK: ChecklistActie = { scherm: "documenten", web_pad: "/medewerker/documenten", label: "Controleer je ID" };
const OVEREENKOMST: ChecklistActie = { scherm: "overeenkomst", web_pad: "/medewerker/overeenkomst", label: "Overeenkomst lezen" };
const ZELFFACTURERING: ChecklistActie = { scherm: "zelffacturering", web_pad: "/medewerker/zelffacturering", label: "Lezen en akkoord geven" };

/** Goedgekeurde ID-bewijzen (ook zonder bestand, via Didit of videocall). */
function goedgekeurdeIds(documenten: readonly ChecklistDocument[]): ChecklistDocument[] {
  // Zelfde regel als de verloopblokkade (teltVoorVerloop): zonder kolom review_status (waarde
  // undefined) is goedkeuring niet vast te stellen en telt het document, anders blokkeert iedereen.
  return documenten.filter((d) => d.document_type === "id_bewijs").filter(teltVoorVerloop);
}

/** Is er een goedgekeurd, niet verlopen ID-bewijs? (geen vervaldatum = niet verlopen) */
export function heeftGeldigId(documenten: readonly ChecklistDocument[], vandaag: string): boolean {
  return goedgekeurdeIds(documenten).some((d) => !d.expiry_date || d.expiry_date >= vandaag);
}

/** Uitleg bij de ID-controle via Didit (opties.idCheck), of "" als het ID in orde is. */
function idCheckUitleg(documenten: readonly ChecklistDocument[], vandaag: string, status: string | null): string {
  if (heeftGeldigId(documenten, vandaag)) return "";
  if (status === "handmatig") return "We controleren je ID. Je hoeft niets te doen.";
  if (status === "videocall_gevraagd") return "Je hebt een videocall aangevraagd. We nemen contact met je op.";
  if (status === "bezig") return "Je ID-controle is nog niet klaar. Rond hem af of begin opnieuw.";
  if (status === "afgewezen") return "Je ID-controle is niet goedgekeurd. Probeer het opnieuw of kies een videocall.";
  if (goedgekeurdeIds(documenten).length > 0) return "Je ID-bewijs is verlopen. Controleer je nieuwe ID.";
  return "Controleer je ID met je telefoon. Het duurt een paar minuten.";
}

/** Uitleg bij het ID-bewijs, of "" als er een goedgekeurd, geldig ID is. */
function idUitleg(documenten: readonly ChecklistDocument[], vandaag: string): string {
  const ids = documenten.filter((d) => d.document_type === "id_bewijs");
  if (heeftGeldigId(documenten, vandaag)) return "";
  if (goedgekeurdeIds(documenten).length > 0) return "Je ID-bewijs is verlopen. Upload een nieuw, geldig ID-bewijs.";
  const nieuwste = nieuwstePerType(ids)[0];
  if (nieuwste?.review_status === "afgekeurd") return "Je ID-bewijs is afgekeurd. Upload een nieuw, goed leesbaar ID-bewijs.";
  if (nieuwste) return "Je ID-bewijs wordt nog gecontroleerd door TopTalent.";
  return "Upload een geldig ID-bewijs (paspoort of ID-kaart) met de vervaldatum.";
}

/** De volledige checklist, in vaste volgorde, met per punt of het in orde is. */
export function reageerChecklist(
  medewerker: ChecklistMedewerker,
  documenten: readonly ChecklistDocument[],
  vandaag: string,
  opties: ChecklistOpties = {},
): ChecklistPunt[] {
  const id = opties.idCheck ? idCheckUitleg(documenten, vandaag, opties.idCheck.status) : idUitleg(documenten, vandaag);
  const kvk = isGeldigKvkNummer(medewerker.kvk_nummer)
    ? ""
    : medewerker.kvk_nummer
      ? "Je KvK-nummer klopt niet: het bestaat uit 8 cijfers."
      : "Vul je KvK-nummer in.";
  const btw = isGeldigBtwNummer(medewerker.btw_nummer)
    ? ""
    : medewerker.btw_nummer
      ? "Je btw-nummer klopt niet. Het ziet eruit als NL123456789B01."
      : "Vul je btw-nummer in (ook met de KOR heb je een btw-id).";
  const iban = medewerker.iban && isGeldigIban(medewerker.iban)
    ? ""
    : medewerker.iban
      ? "Je IBAN klopt niet. Controleer het nummer."
      : "Vul het IBAN in waarop je je uitbetaling wilt ontvangen.";
  const akkoord =
    medewerker.overeenkomst_akkoord_op && medewerker.overeenkomst_akkoord_versie === OVEREENKOMST_VERSIE
      ? ""
      : medewerker.overeenkomst_akkoord_op
        ? "De overeenkomst van opdracht is gewijzigd. Lees de nieuwe versie en ga akkoord."
        : "Lees de overeenkomst van opdracht en ga akkoord.";

  const punten: ChecklistPunt[] = [
    { code: "id_bewijs", label: "Geldig ID-bewijs", uitleg: id, ok: !id, actie: opties.idCheck ? ID_CHECK : DOCUMENTEN },
    { code: "kvk_nummer", label: "KvK-nummer", uitleg: kvk, ok: !kvk, actie: PROFIEL },
    { code: "btw_nummer", label: "Btw-nummer", uitleg: btw, ok: !btw, actie: PROFIEL },
    { code: "iban", label: "IBAN", uitleg: iban, ok: !iban, actie: PROFIEL },
    { code: "overeenkomst", label: "Overeenkomst van opdracht", uitleg: akkoord, ok: !akkoord, actie: OVEREENKOMST },
  ];

  if (opties.zelffacturering) {
    const zf =
      medewerker.zelffacturering_akkoord_op && medewerker.zelffacturering_akkoord_versie === ZELFFACTURERING_VERSIE
        ? ""
        : medewerker.zelffacturering_akkoord_op
          ? "De afspraken over zelffacturering zijn gewijzigd. Lees de nieuwe versie en ga akkoord."
          : "Geef TopTalent akkoord om de facturen voor je diensten namens jou op te maken (zelffacturering).";
    punten.push({ code: "zelffacturering", label: "Akkoord zelffacturering", uitleg: zf, ok: !zf, actie: ZELFFACTURERING });
  }
  return punten;
}

/** Wat er nog ontbreekt voordat de medewerker mag reageren (lege lijst = alles in orde). */
export function ontbrekendVoorReageren(
  medewerker: ChecklistMedewerker,
  documenten: readonly ChecklistDocument[],
  vandaag: string,
  opties: ChecklistOpties = {},
): ChecklistPunt[] {
  return reageerChecklist(medewerker, documenten, vandaag, opties).filter((p) => !p.ok);
}

const ZINSDEEL: Record<ChecklistCode, string> = {
  id_bewijs: "een geldig ID-bewijs",
  kvk_nummer: "je KvK-nummer",
  btw_nummer: "je btw-nummer",
  iban: "je IBAN",
  overeenkomst: "je akkoord op de overeenkomst van opdracht",
  zelffacturering: "je akkoord op zelffacturering",
};

/** Melding bij een geweigerde aanmelding (403 checklist_onvolledig). */
export function checklistMelding(ontbrekend: readonly ChecklistPunt[]): string {
  if (ontbrekend.length === 0) return "";
  const labels = ontbrekend.map((p) => ZINSDEEL[p.code] ?? p.label);
  const lijst = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} en ${labels[labels.length - 1]}`;
  return `Je kunt je nog niet aanmelden. Regel eerst: ${lijst}. Je ziet wat er nog moet gebeuren op je dashboard.`;
}
