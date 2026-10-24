import { documentOpslagPad, MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";

/**
 * Wat er met de bestanden van een werknemer gebeurt als zijn account wordt verwijderd. Pure regels,
 * getest in tests/unit/documenten-nawerk.spec.ts; de DB-/opslagkant staat in
 * lib/medewerker/account-bestanden.ts.
 *
 * Bestanden die bij een werknemer horen:
 * - bucket `medewerker-documenten`, map `<medewerker_id>/`: documenten uit `medewerker_documenten`
 *   (`<soort>_<tijd>.<ext>`, kopieën uit de inschrijving als `onboarding_<id>.<ext>`):
 *   - ID-bewijs: volgens de Wav-regeling van lib/id-check/bewaartermijn (Wav-kopie blijft tot
 *     bewaar_tot in id_wav_kopieen, andere kopieën weg). Hier niet aangeraakt;
 *   - loonheffingsverklaring en contract: blijven, met de termijn uit de privacyverklaring
 *     (BEWAREN_NA_ACCOUNT_VERWIJDEREN), vastgelegd in `bewaarde_documenten`;
 *   - de rest (VOG, KvK-uittreksel, VSH, werk- en verblijfsvergunning, overig): weg;
 * - bucket `medewerker-photos`, map `<medewerker_id>/`: de profielfoto. Weg.
 * Niet hier: zelffacturen en SEPA-bestanden (bucket `uitbetalingen`, 7 jaar fiscale bewaarplicht,
 * blijven), kandidaatdocumenten (bucket `kandidaat-documenten`, horen bij de inschrijving).
 */

export const PROFIELFOTO_BUCKET = "medewerker-photos";

export type BewaarRegel = { jaren: number; grond: string };

/**
 * Documentsoorten waarvan het bestand het verwijderen van het account overleeft, met de termijn uit
 * de privacyverklaring (paragraaf 6, Bewaartermijnen). De loonbelastingverklaring staat ook op de
 * pagina Account verwijderen bij wat bewaard blijft.
 */
export const BEWAREN_NA_ACCOUNT_VERWIJDEREN: Readonly<Record<string, BewaarRegel>> = {
  loonheffingsverklaring: { jaren: 5, grond: "Loonbelastingverklaringen: 5 jaar na einde dienstverband" },
  contract: { jaren: 2, grond: "Arbeidsovereenkomst en personeelsdossier: 2 jaar na einde dienstverband" },
};

export type BestandKeuze = "id_regeling" | "bewaren" | "verwijderen";

/** Per documentsoort: ID-bewijs volgt de Wav-regeling, sommige soorten blijven, de rest gaat weg. */
export function bestandBijAccountVerwijderen(documentType: string | null | undefined): BestandKeuze {
  if (documentType === "id_bewijs") return "id_regeling";
  if (documentType && Object.prototype.hasOwnProperty.call(BEWAREN_NA_ACCOUNT_VERWIJDEREN, documentType)) return "bewaren";
  return "verwijderen";
}

const DATUM = /^(\d{4})-(\d{2})-(\d{2})/;

function geldig(datum: string | null | undefined): string | null {
  const m = DATUM.exec(datum ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
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

export type OpruimDocument = {
  id: string;
  document_type: string | null;
  file_path?: string | null;
  file_url?: string | null;
  uploaded_at?: string | null;
};

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
  return !!soort && bestandBijAccountVerwijderen(soort) === "verwijderen";
}

/**
 * Welke bestanden weg mogen en welke blijven. Nooit weg: ID-bewijzen (die regelt de Wav-regeling),
 * bewaarde soorten en alles in `beschermd` (Wav-kopieën en eerder vastgelegde bestanden).
 *
 * `mapInhoud` = volledige paden in `<medewerker_id>/` van medewerker-documenten, of null als de map
 * niet gelezen kon worden of `beschermd` onvolledig is. Daaruit gaan alleen losse bestanden weg
 * waarvan de naam zeker bij een soort zonder bewaartermijn hoort (`vog_<tijd>.pdf` e.d.); een
 * onbekende naam (zoals een kopie uit de inschrijving zonder documentrij) blijft staan.
 */
export function maakOpruimPlan(input: {
  medewerkerId: string;
  documenten: readonly OpruimDocument[];
  beschermd: readonly string[];
  mapInhoud: readonly string[] | null;
  profielfoto: readonly string[];
  einde: string;
}): OpruimPlan {
  const beschermd = new Set(input.beschermd);
  const bewaren: BewaarBestand[] = [];
  const weg = new Set<string>();

  for (const doc of input.documenten) {
    const pad = documentOpslagPad(doc);
    if (!pad) continue;
    const keuze = bestandBijAccountVerwijderen(doc.document_type);
    if (keuze === "verwijderen") {
      weg.add(pad);
      continue;
    }
    beschermd.add(pad);
    if (keuze === "bewaren") {
      const regel = BEWAREN_NA_ACCOUNT_VERWIJDEREN[doc.document_type as string];
      if (!bewaren.some((b) => b.pad === pad)) {
        bewaren.push({
          pad,
          documentType: doc.document_type as string,
          geuploadOp: doc.uploaded_at ?? null,
          bewaarTot: bewaarTotNaEinde(input.einde, regel.jaren),
        });
      }
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
