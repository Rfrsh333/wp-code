import { documentOpslagPad, MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";
import { kopieBijAccountVerwijderen, wavKopieBewaarTot } from "@/lib/id-check/controlerecord";
import { nlDatum } from "@/lib/nl-tijd";

/**
 * Wat er met de bestanden van een werknemer gebeurt als zijn account wordt verwijderd. Pure regels,
 * getest in tests/unit/documenten-nawerk.spec.ts; de DB-/opslagkant staat in
 * lib/medewerker/account-bestanden.ts. Houd dit in de pas met de privacyverklaring (paragraaf 6 en
 * 10f, versie 2.7) en de pagina Account verwijderen.
 *
 * Bestanden die bij een werknemer horen:
 * - bucket `medewerker-documenten`, map `<medewerker_id>/`: documenten uit `medewerker_documenten`
 *   (`<soort>_<tijd>.<ext>`, kopieën uit de inschrijving als `onboarding_<id>.<ext>`):
 *   - ID-bewijs: volgens de Wav-regeling van lib/id-check/bewaartermijn (Wav-kopie blijft tot
 *     bewaar_tot in id_wav_kopieen, andere kopieën weg). Hier niet aangeraakt;
 *   - loonheffingsverklaring, contract, en werk- of verblijfsvergunning van een werknemer van buiten
 *     de EER/Zwitserland: blijven, met de termijn uit BEWAREN_NA_ACCOUNT_VERWIJDEREN, vastgelegd in
 *     `bewaarde_documenten`;
 *   - de rest (VOG, KvK-uittreksel, VSH, overig, vergunning van een EER/Zwitserse werknemer): weg;
 * - bucket `medewerker-photos`, map `<medewerker_id>/`: de profielfoto. Weg.
 * Niet hier: zelffacturen en SEPA-bestanden (bucket `uitbetalingen`, 7 jaar fiscale bewaarplicht,
 * blijven), kandidaatdocumenten (bucket `kandidaat-documenten`, horen bij de inschrijving).
 */

export const PROFIELFOTO_BUCKET = "medewerker-photos";

/**
 * - `na_einde`: `jaren` na het einde van het dienstverband; met `totEindeJaar` tot en met 31-12 van
 *   (jaar einde + jaren), anders tot dezelfde dag `jaren` later;
 * - `wav`: zoals de Wav-kopie van het ID (id_wav_kopieen): 31-12 van (jaar laatste dienst + 5),
 *   zonder diensten vanaf de goedkeuring/upload, nooit eerder dan bewaar_tot op de documentrij.
 */
export type BewaarRegel =
  | { termijn: "na_einde"; jaren: number; totEindeJaar: boolean; grond: string }
  | { termijn: "wav"; grond: string };

/** Werk- en verblijfsvergunning: bewaard volgens de Wav als de werknemer van buiten de EER/Zwitserland komt. */
export const WAV_VERGUNNINGEN = ["werkvergunning", "verblijfsvergunning"] as const;

const WAV_GROND =
  "Werk- of verblijfsvergunning van buiten de EER/Zwitserland: tot 31 december van het vijfde jaar na het jaar waarin het werk via TopTalent eindigde (Wav)";

/**
 * Documentsoorten waarvan het bestand het verwijderen van het account (kan) overleven, met de termijn
 * uit de privacyverklaring (paragraaf 6, Bewaartermijnen, en 10f).
 */
export const BEWAREN_NA_ACCOUNT_VERWIJDEREN: Readonly<Record<string, BewaarRegel>> = {
  loonheffingsverklaring: { termijn: "na_einde", jaren: 5, totEindeJaar: false, grond: "Loonbelastingverklaringen: 5 jaar na einde dienstverband" },
  contract: {
    termijn: "na_einde",
    jaren: 7,
    totEindeJaar: true,
    grond: "Arbeidsovereenkomst of overeenkomst van opdracht: 7 jaar (fiscale bewaarplicht), tot 31 december van het zevende jaar na het einde",
  },
  werkvergunning: { termijn: "wav", grond: WAV_GROND },
  verblijfsvergunning: { termijn: "wav", grond: WAV_GROND },
};

/** De bewaarregel van een documentsoort, of null (dan gaat het bestand weg). */
export function bewaarRegel(documentType: string | null | undefined): BewaarRegel | null {
  if (!documentType || !Object.prototype.hasOwnProperty.call(BEWAREN_NA_ACCOUNT_VERWIJDEREN, documentType)) return null;
  return BEWAREN_NA_ACCOUNT_VERWIJDEREN[documentType];
}

export function isWavVergunning(documentType: string | null | undefined): boolean {
  return (WAV_VERGUNNINGEN as readonly string[]).includes(documentType ?? "");
}

/**
 * Werk- of verblijfsvergunning bij het verwijderen van een account: net als de ID-kopie
 * (kopieBijAccountVerwijderen, #38). Afgekeurd of EER/Zwitserland: weg (een EER-werknemer heeft geen
 * vergunning nodig). Buiten de EER: bewaren. Eén verschil: is de nationaliteit onbekend, dan ook
 * bewaren, niet eerst beoordelen. Een vergunning hoort alleen bij iemand van buiten de EER, en de
 * opschoontool beoordeelt alleen ID-kopieën.
 */
export function vergunningBijAccountVerwijderen(input: { reviewStatus: string | null | undefined; eer: boolean | null }): "bewaren" | "verwijderen" {
  const keuze = kopieBijAccountVerwijderen({ verificatieMethode: null, reviewStatus: input.reviewStatus, eer: input.eer });
  return keuze === "verwijderen" ? "verwijderen" : "bewaren";
}

export type BestandKeuze = "id_regeling" | "bewaren" | "verwijderen";

/**
 * Per documentsoort: ID-bewijs volgt de Wav-regeling, loonheffingsverklaring en contract blijven,
 * een vergunning blijft bij een werknemer van buiten de EER (`eer` volgens zijn controles), de rest
 * gaat weg.
 */
export function bestandBijAccountVerwijderen(
  documentType: string | null | undefined,
  context: { eer: boolean | null; reviewStatus?: string | null } = { eer: null },
): BestandKeuze {
  if (documentType === "id_bewijs") return "id_regeling";
  const regel = bewaarRegel(documentType);
  if (!regel) return "verwijderen";
  if (regel.termijn === "wav") return vergunningBijAccountVerwijderen({ reviewStatus: context.reviewStatus, eer: context.eer });
  return "bewaren";
}

const DATUM = /^(\d{4})-(\d{2})-(\d{2})/;

function geldig(datum: string | null | undefined): string | null {
  const m = DATUM.exec(datum ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function datumNl(tijdstip: string | null | undefined): string | null {
  if (!tijdstip) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(tijdstip)) return tijdstip;
  const d = new Date(tijdstip);
  return Number.isNaN(d.getTime()) ? null : nlDatum(d);
}

/**
 * Einde dienstverband voor de bewaartermijn: de laatste dienst of de datum uit dienst (de laatste
 * van de twee, niet na vandaag). Zonder een van beide: vandaag, de dag van verwijderen.
 */
export function eindeDienstverband(input: { laatsteDienst: string | null | undefined; datumUitDienst: string | null | undefined; vandaag: string }): string {
  const kandidaten = [geldig(input.laatsteDienst), geldig(input.datumUitDienst)].filter((d): d is string => !!d && d <= input.vandaag);
  return kandidaten.sort().at(-1) ?? input.vandaag;
}

/** `einde` plus `jaren` kalenderjaren (29 februari wordt 28 februari). */
export function bewaarTotNaEinde(einde: string, jaren: number): string {
  const m = DATUM.exec(einde);
  if (!m) throw new Error("Ongeldige datum voor de bewaartermijn");
  const jaar = Number(m[1]) + jaren;
  const maand = Number(m[2]);
  const laatsteDag = new Date(Date.UTC(jaar, maand, 0)).getUTCDate();
  const dag = Math.min(Number(m[3]), laatsteDag);
  return `${jaar}-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

/** 31-12 van (jaar van `einde` + `jaren`). */
export function bewaarTotEindeJaar(einde: string, jaren: number): string {
  const m = DATUM.exec(einde);
  if (!m) throw new Error("Ongeldige datum voor de bewaartermijn");
  return `${Number(m[1]) + jaren}-12-31`;
}

/**
 * Bewaar-tot voor een document van een werknemer die uit dienst is (retentie-cron, stap 1; het
 * account bestaat nog): de regel van de soort (contract 31-12 van jaar uit dienst + 7,
 * loonheffingsverklaring 5 jaar), anders 5 jaar na de datum uit dienst zoals voorheen. null voor
 * ID-bewijs en vergunningen: die volgen elke nacht de Wav-termijn (lib/id-check/bewaartermijn).
 */
export function bewaarTotBijUitDienst(documentType: string | null | undefined, datumUitDienst: string): string | null {
  if (documentType === "id_bewijs") return null;
  const regel = bewaarRegel(documentType);
  if (regel?.termijn === "wav") return null;
  if (!regel) return bewaarTotNaEinde(datumUitDienst, 5);
  return regel.totEindeJaar ? bewaarTotEindeJaar(datumUitDienst, regel.jaren) : bewaarTotNaEinde(datumUitDienst, regel.jaren);
}

export type OpruimDocument = {
  id: string;
  document_type: string | null;
  file_path?: string | null;
  file_url?: string | null;
  uploaded_at?: string | null;
  reviewed_at?: string | null;
  review_status?: string | null;
  bewaar_tot?: string | null;
};

/** Bewaar-tot van één document volgens zijn regel. */
export function bewaarTotVoorDocument(
  regel: BewaarRegel,
  input: { einde: string; laatsteDienst: string | null; vandaag: string; doc: OpruimDocument },
): string {
  if (regel.termijn === "wav") {
    // Zelfde berekening als de Wav-kopie bij het verwijderen (lib/id-check/bewaartermijn).
    return wavKopieBewaarTot({
      laatsteDienst: input.laatsteDienst,
      beslisdatum: datumNl(input.doc.reviewed_at ?? input.doc.uploaded_at) ?? input.vandaag,
      huidig: input.doc.bewaar_tot,
    });
  }
  return regel.totEindeJaar ? bewaarTotEindeJaar(input.einde, regel.jaren) : bewaarTotNaEinde(input.einde, regel.jaren);
}

export type BewaarBestand = { pad: string; documentType: string; geuploadOp: string | null; bewaarTot: string };

export type OpruimPlan = {
  /** Na het verwijderen van het account uit de opslag halen, per bucket. */
  verwijderen: { bucket: string; paden: string[] }[];
  /** Vóór het verwijderen vastleggen in bewaarde_documenten; het bestand blijft. */
  bewaren: BewaarBestand[];
};

/** Bestandsnamen in de map van de werknemer die zeker bij een soort zonder bewaartermijn horen. */
function isVerwijderbareNaam(bestandsnaam: string): boolean {
  const soort = /^([a-z_]+)_\d+\.[a-z0-9]+$/i.exec(bestandsnaam)?.[1];
  return !!soort && soort !== "id_bewijs" && !bewaarRegel(soort);
}

/**
 * Welke bestanden weg mogen en welke blijven. Nooit weg: ID-bewijzen (die regelt de Wav-regeling),
 * bewaarde soorten en alles in `beschermd` (Wav-kopieën en eerder vastgelegde bestanden).
 *
 * `eer` = nationaliteit binnen de EER/Zwitserland volgens de controles van de werknemer
 * (eerVolgensControles; null = onbekend). `laatsteDienst` = null als die er niet is of niet kon
 * worden opgezocht.
 *
 * `mapInhoud` = volledige paden in `<medewerker_id>/` van medewerker-documenten, of null als de map
 * niet gelezen kon worden of `beschermd` onvolledig is. Daaruit gaan alleen losse bestanden weg
 * waarvan de naam zeker bij een soort zonder bewaartermijn hoort (`vog_<tijd>.pdf` e.d.); een
 * onbekende naam (zoals een kopie uit de inschrijving zonder documentrij) of een vergunning blijft staan.
 */
export function maakOpruimPlan(input: {
  medewerkerId: string;
  documenten: readonly OpruimDocument[];
  beschermd: readonly string[];
  mapInhoud: readonly string[] | null;
  profielfoto: readonly string[];
  einde: string;
  eer: boolean | null;
  laatsteDienst: string | null;
  vandaag: string;
}): OpruimPlan {
  const beschermd = new Set(input.beschermd);
  const bewaren: BewaarBestand[] = [];
  const weg = new Set<string>();

  for (const doc of input.documenten) {
    const pad = documentOpslagPad(doc);
    if (!pad) continue;
    const keuze = bestandBijAccountVerwijderen(doc.document_type, { eer: input.eer, reviewStatus: doc.review_status });
    if (keuze === "verwijderen") {
      weg.add(pad);
      continue;
    }
    beschermd.add(pad);
    const regel = keuze === "bewaren" ? bewaarRegel(doc.document_type) : null;
    if (regel && !bewaren.some((b) => b.pad === pad)) {
      bewaren.push({
        pad,
        documentType: doc.document_type as string,
        geuploadOp: doc.uploaded_at ?? null,
        bewaarTot: bewaarTotVoorDocument(regel, { einde: input.einde, laatsteDienst: input.laatsteDienst, vandaag: input.vandaag, doc }),
      });
    }
  }

  const map = `${input.medewerkerId}/`;
  for (const pad of input.mapInhoud ?? []) {
    if (!pad.startsWith(map)) continue;
    const naam = pad.slice(map.length);
    if (naam.includes("/") || !isVerwijderbareNaam(naam)) continue;
    weg.add(pad);
  }
  for (const pad of beschermd) weg.delete(pad);

  const fotos = [...new Set(input.profielfoto.filter((p) => !!p && p.startsWith(map)))];
  const verwijderen = [
    { bucket: MEDEWERKER_DOCUMENTEN_BUCKET, paden: [...weg] },
    { bucket: PROFIELFOTO_BUCKET, paden: fotos },
  ].filter((b) => b.paden.length > 0);
  return { verwijderen, bewaren };
}

/** Rij voor `bewaarde_documenten` (migratie 20261024_documenten_nawerk.sql). Alleen deze velden. */
export function bewaardDocumentRij(input: {
  medewerkerId: string;
  naam: string | null;
  bestand: BewaarBestand;
  einde: string;
  nu: string;
}): Record<string, unknown> {
  return {
    medewerker_id: input.medewerkerId,
    document_type: input.bestand.documentType,
    naam: input.naam ? input.naam.slice(0, 200) : null,
    bucket: MEDEWERKER_DOCUMENTEN_BUCKET,
    bestand_pad: input.bestand.pad,
    geupload_op: input.bestand.geuploadOp,
    einde_dienstverband: input.einde,
    bewaar_tot: input.bestand.bewaarTot,
    bijgewerkt_op: input.nu,
  };
}
