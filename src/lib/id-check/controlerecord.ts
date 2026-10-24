import { berekenWavBewaarTot } from "@/lib/compliance/arbeidstijden";
import {
  controleerVervaldatum,
  geldigeDatum,
  isEerNationaliteit,
  normaliseerDocumentnummer,
  normaliseerLandcode,
} from "@/lib/id-check/regels";

/**
 * Controlerecord van een ID-controle volgens het juridisch advies (24-10-2026). Pure regels, getest
 * in tests/unit/id-controlerecord.spec.ts; de DB-kant staat in lib/id-check/db.ts (videocall,
 * bewaartermijn) en lib/id-check/opschonen.ts (oude kopieën).
 *
 * - Minimaal record (Wav art. 15a: de Arbeidsinspectie kan binnen 48 uur identificatie vragen, ook
 *   over eerdere werkers): naam en geboortedatum zoals op het document, nationaliteit, documentsoort,
 *   vervaldatum en de uitslag, plus het documentnummer (toegevoegd door Rachid als extra bewijs
 *   welk document is gezien; niet in de minimale lijst van de jurist). Nooit het BSN of beelden.
 * - Bewaren tot 31-12 van (jaar laatste dienst + 5); zonder diensten vanaf het jaar van de beslissing.
 * - Videocall volstaat alleen voor EER/Zwitserland. Daarbuiten vraagt de Wav (art. 15) een kopie van
 *   het ID, dus een admin kan een niet-EER-ID niet via een videocall goedkeuren. TopTalent bewaart
 *   die kopie zelf, beveiligd, en geeft hem niet aan horecazaken (privacyverklaring 2.6, 10f).
 * - Oude kopieën: EER/Zwitserland heeft geen grondslag (weg, record blijft), niet-EER mag blijven
 *   (Wav-termijn), kandidaten die nooit werknemer werden: weg zonder record.
 * - Account verwijderd: een Wav-kopie blijft tot bewaar_tot (tabel id_wav_kopieen), een kopie van
 *   een EER/Zwitserse werknemer gaat mee weg (kopieBijAccountVerwijderen).
 */

// --- Documentsoort en nationaliteit ----------------------------------------------------------------

/** Wat een admin kan kiezen. Waarden zoals Didit `document_type`, zodat de kolom één taal spreekt. */
export const DOCUMENTSOORTEN = [
  { value: "Passport", label: "Paspoort" },
  { value: "Identity Card", label: "ID-kaart" },
  { value: "Residence Permit", label: "Verblijfsdocument" },
] as const;
export type Documentsoort = (typeof DOCUMENTSOORTEN)[number]["value"];

export function isDocumentsoort(waarde: unknown): waarde is Documentsoort {
  return typeof waarde === "string" && DOCUMENTSOORTEN.some((d) => d.value === waarde);
}

/** Nederlands label, ook voor Didit-waarden die een admin niet kan kiezen. */
export function documentsoortLabel(waarde: string | null | undefined): string {
  if (!waarde) return "onbekend";
  if (waarde === "Driver's License") return "Rijbewijs";
  return DOCUMENTSOORTEN.find((d) => d.value === waarde)?.label ?? waarde;
}

/**
 * Landcodes voor het invulveld (datalist). Elke ISO 3166-1 alpha-3-code mag; dit zijn de EER-landen,
 * Zwitserland en een paar nationaliteiten die vaak voorkomen. De code staat in de MRZ van het document.
 */
export const LANDEN: readonly { code: string; naam: string }[] = [
  { code: "NLD", naam: "Nederland" },
  { code: "BEL", naam: "België" },
  { code: "DEU", naam: "Duitsland" },
  { code: "FRA", naam: "Frankrijk" },
  { code: "ESP", naam: "Spanje" },
  { code: "ITA", naam: "Italië" },
  { code: "PRT", naam: "Portugal" },
  { code: "POL", naam: "Polen" },
  { code: "ROU", naam: "Roemenië" },
  { code: "BGR", naam: "Bulgarije" },
  { code: "GRC", naam: "Griekenland" },
  { code: "HUN", naam: "Hongarije" },
  { code: "LTU", naam: "Litouwen" },
  { code: "LVA", naam: "Letland" },
  { code: "EST", naam: "Estland" },
  { code: "CZE", naam: "Tsjechië" },
  { code: "SVK", naam: "Slowakije" },
  { code: "SVN", naam: "Slovenië" },
  { code: "HRV", naam: "Kroatië" },
  { code: "AUT", naam: "Oostenrijk" },
  { code: "IRL", naam: "Ierland" },
  { code: "LUX", naam: "Luxemburg" },
  { code: "DNK", naam: "Denemarken" },
  { code: "SWE", naam: "Zweden" },
  { code: "FIN", naam: "Finland" },
  { code: "CYP", naam: "Cyprus" },
  { code: "MLT", naam: "Malta" },
  { code: "ISL", naam: "IJsland" },
  { code: "LIE", naam: "Liechtenstein" },
  { code: "NOR", naam: "Noorwegen" },
  { code: "CHE", naam: "Zwitserland" },
  { code: "GBR", naam: "Verenigd Koninkrijk" },
  { code: "TUR", naam: "Turkije" },
  { code: "MAR", naam: "Marokko" },
  { code: "SUR", naam: "Suriname" },
  { code: "UKR", naam: "Oekraïne" },
  { code: "SYR", naam: "Syrië" },
  { code: "USA", naam: "Verenigde Staten" },
  { code: "BRA", naam: "Brazilië" },
  { code: "IND", naam: "India" },
];

export function landNaam(code: string | null | undefined): string {
  const c = normaliseerLandcode(code);
  if (!c) return "onbekend";
  return LANDEN.find((l) => l.code === c)?.naam ?? c;
}

/** Tekst bij een niet-EER-nationaliteit in een videocall (admin). Zoals privacyverklaring 2.6, 10f. */
export const KOPIE_NODIG_TEKST =
  "Nationaliteit buiten de EER/Zwitserland: een videocall is niet genoeg. De Wav (art. 15) vraagt dan een kopie van het ID. Die bewaart TopTalent zelf, beveiligd; horecazaken krijgen hem niet. Leg vast dat er een kopie nodig is; de werknemer kan zijn ID dan uploaden bij Documenten.";

/**
 * Moet deze werknemer een kopie van zijn ID aanleveren (Wav art. 15)? Ja als zijn nieuwste controle
 * (Didit of videocall) een nationaliteit buiten de EER/Zwitserland heeft en niet is afgewezen of
 * verlopen. Dan mag hij, ook met de ID-controle via Didit aan, een ID-bewijs uploaden. TopTalent
 * bewaart die kopie zelf (niet voor horecazaken), tot bewaar_tot.
 */
export function kopieNodig(laatste: { eer?: boolean | null; status?: string | null } | null | undefined): boolean {
  return !!laatste && laatste.eer === false && laatste.status !== "afgewezen" && laatste.status !== "verlopen";
}

/** Wat een werknemer moet doen als zijn ID-bewijs verloopt of bijna verloopt. */
export type IdVervalActie = "id_controle" | "upload";

/**
 * Verloopt het ID-bewijs: met de ID-controle via Didit aan laat de werknemer zijn nieuwe ID opnieuw
 * controleren bij Documenten (Didit of een videocall), zonder upload. Upload blijft als de functie
 * voor hem uit staat, of als er een kopie nodig is (buiten de EER, Wav art. 15: kopieNodig).
 */
export function idVervalActie(input: { diditActief: boolean; kopieNodig: boolean }): IdVervalActie {
  return input.diditActief && !input.kopieNodig ? "id_controle" : "upload";
}

// --- Invoer van de admin ---------------------------------------------------------------------------

/** Geboortedatum: echte datum, niet in de toekomst, niet vóór 1900. Foutmelding of null. */
export function controleerGeboortedatum(datum: unknown, vandaag: string): string | null {
  const geldig = geldigeDatum(datum);
  if (!geldig || geldig < "1900-01-01") return "Vul een geldige geboortedatum in";
  if (geldig >= vandaag) return "De geboortedatum ligt niet in het verleden";
  return null;
}

/** Naam zoals op het document. */
export function controleerNaam(naam: unknown): { naam: string } | { fout: string } {
  const n = typeof naam === "string" ? naam.trim().replace(/\s+/g, " ") : "";
  if (n.length < 2) return { fout: "Vul de naam in zoals op het document" };
  if (n.length > 200) return { fout: "De naam is te lang (maximaal 200 tekens)" };
  return { naam: n };
}

/**
 * Documentnummer zoals een admin het overneemt. Nooit het BSN: bij een Nederlandse nationaliteit is
 * een nummer van alleen cijfers vrijwel zeker het BSN (Nederlandse documentnummers bevatten letters).
 */
export function controleerDocumentnummer(waarde: unknown, nationaliteit: string | null): { nummer: string } | { fout: string } {
  const nummer = normaliseerDocumentnummer(waarde);
  if (!nummer) return { fout: "Vul het documentnummer in zoals op het document (5 tot 20 letters en cijfers)" };
  if (normaliseerLandcode(nationaliteit) === "NLD" && /^\d+$/.test(nummer)) {
    return {
      fout: "Dit lijkt een BSN. Vul het documentnummer in (bij Nederlandse documenten staan daar letters in), nooit het BSN.",
    };
  }
  return { nummer };
}

export type Controle<T> = { ok: true; waarden: T } | { ok: false; fout: string; code?: "kopie_nodig" };

/**
 * goedgekeurd/afgewezen, of kopie_nodig: nationaliteit buiten de EER, dus de videocall volstaat niet;
 * de controle blijft open (status handmatig) tot er een kopie is.
 */
export type VideocallUitslag = "goedgekeurd" | "afgewezen" | "kopie_nodig";

/** Wat een admin na een videocall vastlegt. Datum en beoordelaar vult de server zelf in. */
export type VideocallRecord = {
  uitslag: VideocallUitslag;
  naam: string;
  geboortedatum: string;
  nationaliteit: string;
  eer: boolean;
  documentsoort: Documentsoort;
  /** Verplicht bij goedkeuren; bij afwijzen alleen als het is ingevuld. */
  documentnummer: string | null;
  vervaldatum: string;
  /** Verplicht bij afwijzen (de werknemer ziet deze tekst), anders een optionele opmerking. */
  reden: string | null;
};

/**
 * Regels voor "ID gecontroleerd via videocall" (advies punt 2): uitslag, documentsoort, nationaliteit
 * en vervaldatum zijn verplicht; naam en geboortedatum (voorgevuld uit het profiel) ook. Goedkeuren
 * kan alleen met een niet-verlopen document, een documentnummer en een EER/Zwitserse nationaliteit;
 * afwijzen alleen met een reden. "Kopie nodig" alleen bij een nationaliteit buiten de EER.
 */
export function controleerVideocallInvoer(invoer: Record<string, unknown>, vandaag: string): Controle<VideocallRecord> {
  const uitslag = invoer.uitslag;
  if (uitslag !== "goedgekeurd" && uitslag !== "afgewezen" && uitslag !== "kopie_nodig") {
    return { ok: false, fout: "Kies een uitslag: goedgekeurd of afgewezen" };
  }

  const naam = controleerNaam(invoer.naam);
  if ("fout" in naam) return { ok: false, fout: naam.fout };
  const geboortedatumFout = controleerGeboortedatum(invoer.geboortedatum, vandaag);
  if (geboortedatumFout) return { ok: false, fout: geboortedatumFout };

  const nationaliteit = normaliseerLandcode(typeof invoer.nationaliteit === "string" ? invoer.nationaliteit : null);
  if (!nationaliteit) return { ok: false, fout: "Vul de nationaliteit in (landcode van 3 letters, zoals NLD)" };
  const eer = isEerNationaliteit(nationaliteit) === true;

  if (!isDocumentsoort(invoer.documentsoort)) return { ok: false, fout: "Kies de documentsoort" };

  const vervaldatum = geldigeDatum(invoer.vervaldatum);
  if (!vervaldatum) return { ok: false, fout: "Vul een geldige vervaldatum in" };

  const reden = typeof invoer.reden === "string" && invoer.reden.trim() ? invoer.reden.trim().slice(0, 2000) : null;

  let documentnummer: string | null = null;
  const nummerIngevuld = typeof invoer.documentnummer === "string" && invoer.documentnummer.trim() !== "";
  if (uitslag === "goedgekeurd" || nummerIngevuld) {
    const nummer = controleerDocumentnummer(invoer.documentnummer, nationaliteit);
    if ("fout" in nummer) return { ok: false, fout: nummer.fout };
    documentnummer = nummer.nummer;
  }

  if (uitslag === "goedgekeurd") {
    const vervalFout = controleerVervaldatum(vervaldatum, vandaag);
    if (vervalFout) return { ok: false, fout: vervalFout };
    if (!eer) return { ok: false, fout: KOPIE_NODIG_TEKST, code: "kopie_nodig" };
  } else if (uitslag === "kopie_nodig") {
    if (eer) return { ok: false, fout: "Bij een nationaliteit binnen de EER/Zwitserland is geen kopie nodig: keur goed of wijs af" };
  } else if (!reden || reden.length < 3) {
    return { ok: false, fout: "Geef een reden voor het afwijzen (de werknemer ziet deze tekst)" };
  }

  return {
    ok: true,
    waarden: {
      uitslag,
      naam: naam.naam,
      geboortedatum: geldigeDatum(invoer.geboortedatum)!,
      nationaliteit,
      eer,
      documentsoort: invoer.documentsoort,
      documentnummer,
      vervaldatum,
      reden,
    },
  };
}

// --- Bewaartermijn ---------------------------------------------------------------------------------

/**
 * Bewaar-tot van een controlerecord of Wav-kopie: 31-12 van (jaar laatste dienst + 5), zonder
 * diensten vanaf het jaar van de beslissing. Datums als YYYY-MM-DD (Nederlandse tijd).
 */
export function idBewaarTot(input: { laatsteDienst: string | null | undefined; beslisdatum: string }): string {
  return berekenWavBewaarTot(input.laatsteDienst || input.beslisdatum);
}

/** Statussen van dienst_aanmeldingen die tellen als "gewerkt" (ingepland of voltooid). */
export const GEWERKTE_AANMELDING_STATUSSEN = ["geaccepteerd", "bevestigd", "voltooid"] as const;

/** Uit rijen `dienst_aanmeldingen` + `diensten(datum)`: de laatste dienstdatum per medewerker. */
export function laatsteDienstPerMedewerker(
  rijen: readonly { medewerker_id: string | null; diensten: { datum: string | null } | { datum: string | null }[] | null }[],
): Map<string, string> {
  const laatste = new Map<string, string>();
  for (const rij of rijen) {
    if (!rij.medewerker_id) continue;
    const diensten = Array.isArray(rij.diensten) ? rij.diensten : rij.diensten ? [rij.diensten] : [];
    for (const d of diensten) {
      const datum = d.datum?.slice(0, 10);
      if (!datum || !geldigeDatum(datum)) continue;
      const huidig = laatste.get(rij.medewerker_id);
      if (!huidig || datum > huidig) laatste.set(rij.medewerker_id, datum);
    }
  }
  return laatste;
}

// --- Controlerecord --------------------------------------------------------------------------------

/**
 * De velden van het controlerecord in `id_verificaties` (witte lijst). Nooit BSN, adres of beelden.
 * Zonder `bewaarTot` geen bewaar_tot (dan rekent de aanroeper die zelf uit).
 */
export function controlerecordVelden(input: {
  naam: string | null;
  geboortedatum: string | null;
  nationaliteit: string | null;
  documentsoort: string | null;
  documentnummer: string | null;
  vervaldatum: string | null;
  bewaarTot?: string;
}): Record<string, unknown> {
  const nationaliteit = normaliseerLandcode(input.nationaliteit);
  const velden: Record<string, unknown> = {
    naam: input.naam,
    geboortedatum: input.geboortedatum,
    nationaliteit,
    eer: isEerNationaliteit(nationaliteit),
    documentsoort: input.documentsoort,
    documentnummer: input.documentnummer,
    vervaldatum: input.vervaldatum,
  };
  if (input.bewaarTot) velden.bewaar_tot = input.bewaarTot;
  return velden;
}

/** Is dit een volledig controlerecord (alle velden uit het advies, goedgekeurd)? */
export function isVolledigRecord(rij: {
  status?: string | null;
  naam?: string | null;
  geboortedatum?: string | null;
  nationaliteit?: string | null;
  documentsoort?: string | null;
  vervaldatum?: string | null;
}): boolean {
  return (
    rij.status === "goedgekeurd" && !!rij.naam && !!rij.geboortedatum && !!rij.nationaliteit && !!rij.documentsoort && !!rij.vervaldatum
  );
}

// --- Oude kopieën opschonen ------------------------------------------------------------------------

export type OpschoonBron = "medewerker" | "kandidaat";

export const OPSCHOON_REDENEN = {
  eer_geen_grondslag: "EER/Zwitserland: geen grondslag voor een kopie. Kopie verwijderd; goedkeuring en vervaldatum blijven.",
  eer_niet_goedgekeurd: "EER/Zwitserland en de kopie was niet goedgekeurd: kopie en documentregel verwijderd.",
  wav_niet_eer: "Buiten de EER/Zwitserland: kopie bewaard volgens de Wav (tot 31-12 van het jaar van de laatste dienst + 5).",
  dubbel_in_werknemerdossier: "Buiten de EER/Zwitserland, maar de werknemer heeft de kopie al in zijn dossier: deze kandidaatkopie (dubbel) verwijderd.",
  kandidaat_nooit_werknemer: "Kandidaat is nooit werknemer geworden: kopie verwijderd, geen controlerecord.",
} as const;
export type OpschoonReden = keyof typeof OPSCHOON_REDENEN;

export type OpschoonBeslissing = {
  /** Wat er met het bestand in Storage gebeurt. */
  kopie: "verwijderen" | "bewaren";
  /**
   * Wat er met de documentregel gebeurt: `houden` (medewerker: zonder bestand of als Wav-kopie;
   * kandidaat: met bewaar_tot) of `verwijderen`.
   */
  rij: "houden" | "verwijderen";
  /** Controlerecord in id_verificaties schrijven. */
  record: boolean;
  reden: OpschoonReden;
};

/**
 * Wat er met een oude ID-kopie gebeurt (advies punten 3 en 4).
 *
 * - Kandidaat die nooit werknemer werd: kopie en regel weg, geen record.
 * - EER/Zwitserland: kopie weg. Een goedgekeurde medewerkerkopie blijft als regel zonder bestand
 *   (goedkeuring + vervaldatum), zodat de werknemer niet geblokkeerd raakt.
 * - Buiten de EER: kopie blijft (Wav), behalve een kandidaatkopie waarvan de werknemer al een eigen
 *   kopie in zijn dossier heeft (dubbel).
 * - Record alleen voor een werknemer, als de kopie goedgekeurd was en er nog geen volledig record is.
 */
export function beslisOpschoning(input: {
  bron: OpschoonBron;
  /** Medewerkerkopie, of een kandidaat die werknemer werd. */
  werknemer: boolean;
  /** Uit de nationaliteit die de admin invult; null alleen bij een kandidaat die nooit werknemer werd. */
  eer: boolean | null;
  goedgekeurd: boolean;
  heeftVolledigRecord: boolean;
  /** Kandidaat: de werknemer heeft al een ID-kopie in medewerker_documenten. */
  werknemerHeeftEigenKopie?: boolean;
}): OpschoonBeslissing {
  const werknemer = input.bron === "medewerker" || input.werknemer;
  if (!werknemer) return { kopie: "verwijderen", rij: "verwijderen", record: false, reden: "kandidaat_nooit_werknemer" };
  if (input.eer === null) throw new Error("Nationaliteit ontbreekt");

  const record = input.goedgekeurd && !input.heeftVolledigRecord;
  if (input.eer) {
    if (input.bron === "kandidaat") return { kopie: "verwijderen", rij: "verwijderen", record, reden: "eer_geen_grondslag" };
    return input.goedgekeurd
      ? { kopie: "verwijderen", rij: "houden", record, reden: "eer_geen_grondslag" }
      : { kopie: "verwijderen", rij: "verwijderen", record: false, reden: "eer_niet_goedgekeurd" };
  }
  if (input.bron === "kandidaat" && input.werknemerHeeftEigenKopie) {
    return { kopie: "verwijderen", rij: "verwijderen", record, reden: "dubbel_in_werknemerdossier" };
  }
  return { kopie: "bewaren", rij: "houden", record, reden: "wav_niet_eer" };
}

/** Moet een admin bij het opschonen naam, geboortedatum en documentnummer invullen? */
export function opschoonRecordNodig(input: { werknemer: boolean; goedgekeurd: boolean; heeftVolledigRecord: boolean }): boolean {
  return input.werknemer && input.goedgekeurd && !input.heeftVolledigRecord;
}

export type OpschoonWaarden = {
  documentsoort: Documentsoort;
  nationaliteit: string;
  eer: boolean;
  vervaldatum: string;
  naam: string | null;
  geboortedatum: string | null;
  documentnummer: string | null;
};

/**
 * Invoer bij "Kopie opschonen". Voor een werknemer: documentsoort, nationaliteit en vervaldatum (mag
 * in het verleden liggen: ook een oud document hoort in het record). Komt er een record, dan ook
 * naam, geboortedatum en documentnummer. Een kandidaat die nooit werknemer werd: niets (geen record).
 */
export function controleerOpschoonInvoer(
  invoer: Record<string, unknown>,
  context: { werknemer: boolean; recordNodig: boolean },
  vandaag: string,
): Controle<OpschoonWaarden | null> {
  if (!context.werknemer) return { ok: true, waarden: null };

  if (!isDocumentsoort(invoer.documentsoort)) return { ok: false, fout: "Kies de documentsoort" };
  const nationaliteit = normaliseerLandcode(typeof invoer.nationaliteit === "string" ? invoer.nationaliteit : null);
  if (!nationaliteit) return { ok: false, fout: "Vul de nationaliteit in (landcode van 3 letters, zoals NLD)" };
  const vervaldatum = geldigeDatum(invoer.vervaldatum);
  if (!vervaldatum) return { ok: false, fout: "Vul een geldige vervaldatum in" };

  const waarden: OpschoonWaarden = {
    documentsoort: invoer.documentsoort,
    nationaliteit,
    eer: isEerNationaliteit(nationaliteit) === true,
    vervaldatum,
    naam: null,
    geboortedatum: null,
    documentnummer: null,
  };
  if (!context.recordNodig) return { ok: true, waarden };

  const naam = controleerNaam(invoer.naam);
  if ("fout" in naam) return { ok: false, fout: naam.fout };
  const geboortedatumFout = controleerGeboortedatum(invoer.geboortedatum, vandaag);
  if (geboortedatumFout) return { ok: false, fout: geboortedatumFout };
  const nummer = controleerDocumentnummer(invoer.documentnummer, nationaliteit);
  if ("fout" in nummer) return { ok: false, fout: nummer.fout };
  return {
    ok: true,
    waarden: { ...waarden, naam: naam.naam, geboortedatum: geldigeDatum(invoer.geboortedatum), documentnummer: nummer.nummer },
  };
}

/**
 * Rij voor `id_verificaties` bij het opschonen: het record van een goedgekeurde kopie (methode
 * "kopie"). Wie opschoonde en wanneer staan in beslist_door/beslist_op; de oorspronkelijke
 * goedkeuringsdatum in de reden.
 */
export function opschoonRecordRij(input: {
  medewerkerId: string;
  medewerkerDocumentId: string | null;
  waarden: OpschoonWaarden;
  door: string;
  nu: string;
  bewaarTot: string;
  kopieGoedgekeurdOp: string | null;
}): Record<string, unknown> {
  const oorspronkelijk = input.kopieGoedgekeurdOp ? ` (kopie goedgekeurd op ${input.kopieGoedgekeurdOp.slice(0, 10)})` : "";
  return {
    medewerker_id: input.medewerkerId,
    methode: "kopie",
    status: "goedgekeurd",
    beslissing: "goedgekeurd",
    beslist_door: input.door.slice(0, 200),
    beslist_op: input.nu,
    reden: `Vastgelegd bij het opschonen van de oude ID-kopie${oorspronkelijk}.`,
    handmatig_redenen: [],
    ...controlerecordVelden({
      naam: input.waarden.naam,
      geboortedatum: input.waarden.geboortedatum,
      nationaliteit: input.waarden.nationaliteit,
      documentsoort: input.waarden.documentsoort,
      documentnummer: input.waarden.documentnummer,
      vervaldatum: input.waarden.vervaldatum,
      bewaarTot: input.bewaarTot,
    }),
    medewerker_document_id: input.medewerkerDocumentId,
    aangemaakt_op: input.nu,
    bijgewerkt_op: input.nu,
  };
}

// --- Wav-kopie bij het verwijderen van een account -------------------------------------------------

/**
 * Nationaliteit binnen de EER/Zwitserland volgens de controles van een werknemer (Didit, videocall of
 * opgeschoonde kopie): `eer` van de nieuwste controle die hem kent, afgewezen controles niet
 * meegerekend. null = geen enkele controle weet het. `rijen` nieuwste eerst.
 */
export function eerVolgensControles(rijen: readonly { eer?: boolean | null; status?: string | null }[]): boolean | null {
  for (const r of rijen) {
    if (r.status === "afgewezen") continue;
    if (r.eer === true || r.eer === false) return r.eer;
  }
  return null;
}

export type KopieBijVerwijderen = "bewaren" | "verwijderen" | "beoordelen";

/**
 * Wat er met een ID-kopie (id_bewijs mét bestand) gebeurt als het account wordt verwijderd
 * (privacyverklaring 2.6, 10f):
 * - afgekeurde kopie: verwijderen (geen geldige kopie, dus niets om te bewaren);
 * - Wav-kopie (`kopie_wav`, buiten de EER vastgesteld bij de upload of het opschonen): bewaren tot
 *   bewaar_tot;
 * - nog niet beoordeelde kopie (oude upload): volgens de nationaliteit uit de controles. Buiten de
 *   EER bewaren, EER/Zwitserland verwijderen (geen grondslag). Onbekend: eerst beoordelen in de
 *   opschoontool, anders verdwijnt misschien een Wav-kopie of blijft een kopie zonder grondslag.
 */
export function kopieBijAccountVerwijderen(input: {
  verificatieMethode: string | null | undefined;
  reviewStatus: string | null | undefined;
  eer: boolean | null;
}): KopieBijVerwijderen {
  if (input.reviewStatus === "afgekeurd") return "verwijderen";
  if (input.verificatieMethode === "kopie_wav" || input.eer === false) return "bewaren";
  if (input.eer === true) return "verwijderen";
  return "beoordelen";
}

/**
 * Bewaar-tot van een Wav-kopie bij het verwijderen van het account: 31-12 van (jaar laatste dienst +
 * 5), zonder diensten vanaf de goedkeuring/upload. Staat er op de documentrij al een latere datum
 * (de retentie-cron rekent elke nacht), dan die: een kopie mag nooit eerder weg dan beloofd.
 */
export function wavKopieBewaarTot(input: { laatsteDienst: string | null; beslisdatum: string; huidig: string | null | undefined }): string {
  const berekend = idBewaarTot({ laatsteDienst: input.laatsteDienst, beslisdatum: input.beslisdatum });
  const huidig = geldigeDatum(input.huidig);
  return huidig && huidig > berekend ? huidig : berekend;
}

/** Rij voor `id_wav_kopieen` (migratie 20261024_id_wav_kopieen.sql). Alleen deze velden. */
export function wavKopieRij(input: {
  medewerkerId: string;
  idVerificatieId: string | null;
  naam: string | null;
  pad: string;
  vervaldatum: string | null;
  geuploadOp: string | null;
  bewaarTot: string;
  nu: string;
}): Record<string, unknown> {
  return {
    medewerker_id: input.medewerkerId,
    id_verificatie_id: input.idVerificatieId,
    naam: input.naam ? input.naam.slice(0, 200) : null,
    bestand_pad: input.pad,
    vervaldatum: geldigeDatum(input.vervaldatum),
    geupload_op: input.geuploadOp,
    bewaar_tot: input.bewaarTot,
    bijgewerkt_op: input.nu,
  };
}

/**
 * Een goedgekeurde Wav-kopie bewaart TopTalent tot bewaar_tot (privacyverklaring 2.6): die kan de
 * werknemer niet zelf verwijderen. Een kopie die nog beoordeeld wordt of is afgekeurd wel.
 */
export function isBewaardeWavKopie(doc: { document_type?: unknown; verificatie_methode?: unknown; review_status?: unknown }): boolean {
  return doc.document_type === "id_bewijs" && doc.verificatie_methode === "kopie_wav" && doc.review_status === "goedgekeurd";
}
