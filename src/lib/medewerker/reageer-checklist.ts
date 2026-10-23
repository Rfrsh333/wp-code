import { isGeldigIban } from "@/lib/medewerker/iban";
import { isGeldigBtwNummer, isGeldigKvkNummer } from "@/lib/medewerker/zzp-gegevens";
import { nieuwstePerType } from "@/lib/medewerker/dienst-regels";
import { OVEREENKOMST_VERSIE } from "@/content/overeenkomst-van-opdracht";

/**
 * B1: wat in orde moet zijn voordat een medewerker zich mag aanmelden voor een dienst of een
 * aanbieding/uitnodiging mag accepteren (beslissing Rachid, 23-10-2026). Pure regels, getest in
 * tests/unit/reageer-checklist.spec.ts. De DB-kant staat in lib/medewerker/checklist.ts.
 *
 * - geldig ID: een goedgekeurd ID-bewijs dat niet verlopen is (geen vervaldatum = niet verlopen);
 * - KvK-nummer: 8 cijfers;
 * - btw-nummer: Nederlands formaat (ook met KOR heb je een btw-id);
 * - IBAN: geldig (mod-97);
 * - akkoord op de overeenkomst van opdracht, op de huidige versie.
 */

export const CHECKLIST_CODE = "checklist_onvolledig";

export type ChecklistCode = "id_bewijs" | "kvk_nummer" | "btw_nummer" | "iban" | "overeenkomst";

/** Waar het punt geregeld wordt: web-pad + soort scherm (voor de app). */
export type ChecklistActie = { scherm: "profiel" | "documenten" | "overeenkomst"; web_pad: string; label: string };

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
};

export type ChecklistDocument = {
  document_type: string;
  expiry_date: string | null;
  review_status?: string | null;
  uploaded_at?: string | null;
};

const PROFIEL: ChecklistActie = { scherm: "profiel", web_pad: "/medewerker/profiel", label: "Naar je profiel" };
const DOCUMENTEN: ChecklistActie = { scherm: "documenten", web_pad: "/medewerker/documenten", label: "Naar je documenten" };
const OVEREENKOMST: ChecklistActie = { scherm: "overeenkomst", web_pad: "/medewerker/overeenkomst", label: "Overeenkomst lezen" };

/** Uitleg bij het ID-bewijs, of "" als er een goedgekeurd, geldig ID is. */
function idUitleg(documenten: readonly ChecklistDocument[], vandaag: string): string {
  const ids = documenten.filter((d) => d.document_type === "id_bewijs");
  const goedgekeurd = ids.filter((d) => d.review_status === "goedgekeurd");
  const geldig = goedgekeurd.filter((d) => !d.expiry_date || d.expiry_date >= vandaag);
  if (geldig.length > 0) return "";
  if (goedgekeurd.length > 0) return "Je ID-bewijs is verlopen. Upload een nieuw, geldig ID-bewijs.";
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
): ChecklistPunt[] {
  const id = idUitleg(documenten, vandaag);
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

  return [
    { code: "id_bewijs", label: "Geldig ID-bewijs", uitleg: id, ok: !id, actie: DOCUMENTEN },
    { code: "kvk_nummer", label: "KvK-nummer", uitleg: kvk, ok: !kvk, actie: PROFIEL },
    { code: "btw_nummer", label: "Btw-nummer", uitleg: btw, ok: !btw, actie: PROFIEL },
    { code: "iban", label: "IBAN", uitleg: iban, ok: !iban, actie: PROFIEL },
    { code: "overeenkomst", label: "Overeenkomst van opdracht", uitleg: akkoord, ok: !akkoord, actie: OVEREENKOMST },
  ];
}

/** Wat er nog ontbreekt voordat de medewerker mag reageren (lege lijst = alles in orde). */
export function ontbrekendVoorReageren(
  medewerker: ChecklistMedewerker,
  documenten: readonly ChecklistDocument[],
  vandaag: string,
): ChecklistPunt[] {
  return reageerChecklist(medewerker, documenten, vandaag).filter((p) => !p.ok);
}

const ZINSDEEL: Record<ChecklistCode, string> = {
  id_bewijs: "een geldig ID-bewijs",
  kvk_nummer: "je KvK-nummer",
  btw_nummer: "je btw-nummer",
  iban: "je IBAN",
  overeenkomst: "je akkoord op de overeenkomst van opdracht",
};

/** Melding bij een geweigerde aanmelding (403 checklist_onvolledig). */
export function checklistMelding(ontbrekend: readonly ChecklistPunt[]): string {
  if (ontbrekend.length === 0) return "";
  const labels = ontbrekend.map((p) => ZINSDEEL[p.code] ?? p.label);
  const lijst = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} en ${labels[labels.length - 1]}`;
  return `Je kunt je nog niet aanmelden. Regel eerst: ${lijst}. Je ziet wat er nog moet gebeuren op je dashboard.`;
}
