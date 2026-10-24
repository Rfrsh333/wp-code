/**
 * ID-controle via Didit: pure regels (geen imports met side effects, los testbaar in
 * tests/unit/id-check-didit.spec.ts). De DB-kant staat in lib/id-check/db.ts, de Didit-API in
 * lib/id-check/didit-api.ts.
 *
 * Achtergrond (besluit Rachid, 24-10-2026): volgens de Autoriteit Persoonsgegevens mag TopTalent van
 * zzp'ers geen kopie van het ID maken. Didit controleert het ID; wij bewaren een minimaal
 * controlerecord (juridisch advies, Wav art. 15a): naam en geboortedatum zoals op het document,
 * nationaliteit, documentsoort, documentnummer, vervaldatum en de uitslag. Het documentnummer staat
 * niet in de minimale lijst van de jurist; Rachid neemt het bewust op als extra bewijs welk document
 * is gecontroleerd. Persoonsnummer/BSN, adres, beelden en de ruwe payload komen NOOIT in onze
 * database. Het record blijft tot 31-12 van (jaar laatste dienst + 5), zie berekenWavBewaarTot.
 *
 * Nooit automatisch afwijzen (art. 22 AVG): alles wat niet zeker goed is, gaat naar "handmatig" en
 * een mens beslist.
 */

/** Status van een ID-controle in onze tabel `id_verificaties`. */
export const ID_CHECK_STATUSSEN = [
  "gestart",
  "bezig",
  "handmatig",
  "videocall_gevraagd",
  "goedgekeurd",
  "afgewezen",
  "verlopen",
] as const;
export type IdCheckStatus = (typeof ID_CHECK_STATUSSEN)[number];

/** Definitieve statussen: daarna verandert een webhook niets meer. */
export const DEFINITIEVE_STATUSSEN: readonly IdCheckStatus[] = ["goedgekeurd", "afgewezen"];

export function isDefinitief(status: string | null | undefined): boolean {
  return !!status && (DEFINITIEVE_STATUSSEN as readonly string[]).includes(status);
}

/** Statussen die bij de admin in de lijst "ID-checks om te beoordelen" staan. */
export const OPEN_VOOR_ADMIN: readonly IdCheckStatus[] = ["handmatig", "videocall_gevraagd"];

// --- Didit-statussen -------------------------------------------------------------------------------

/**
 * Sessiestatussen van Didit (exacte strings, hoofdlettergevoelig, "Kyc Expired" met één hoofdletter K).
 * https://docs.didit.me/integration/verification-statuses
 */
export type DiditStatus =
  | "Not Started"
  | "In Progress"
  | "Approved"
  | "Declined"
  | "In Review"
  | "Awaiting User"
  | "Resubmitted"
  | "Expired"
  | "Abandoned"
  | "Kyc Expired";

/** Statussen waarbij Didit een beslissing (decision) meestuurt en wij moeten beoordelen. */
export const DIDIT_BESLIST: readonly string[] = ["Approved", "Declined", "In Review"];

/**
 * Onze status bij een Didit-status zonder beslissing, of null als de status een beoordeling vraagt
 * (Approved/Declined/In Review) of onbekend is.
 */
export function statusZonderBeslissing(diditStatus: string | null | undefined): IdCheckStatus | null {
  switch (diditStatus) {
    case "Not Started":
      return "gestart";
    case "In Progress":
    case "Resubmitted":
    case "Awaiting User":
      return "bezig";
    case "Expired":
    case "Abandoned":
    case "Kyc Expired":
      return "verlopen";
    default:
      return null;
  }
}

// --- EER + Zwitserland -----------------------------------------------------------------------------

/**
 * Nationaliteiten waarvoor geen werkvergunning nodig is: de 27 EU-landen, de overige EER-landen
 * (IJsland, Liechtenstein, Noorwegen) en Zwitserland. ISO 3166-1 alpha-3, zoals Didit `nationality`
 * teruggeeft (https://docs.didit.me/reference/data-models, ID verification).
 */
export const EER_EN_ZWITSERLAND = new Set([
  // EU
  "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "IRL",
  "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
  // Overige EER
  "ISL", "LIE", "NOR",
  // Zwitserland
  "CHE",
]);

/** Alpha-2 → alpha-3 voor dezelfde landen (voor het geval een veld toch alpha-2 bevat). */
const ALPHA2_NAAR_ALPHA3: Record<string, string> = {
  AT: "AUT", BE: "BEL", BG: "BGR", HR: "HRV", CY: "CYP", CZ: "CZE", DK: "DNK", EE: "EST", FI: "FIN",
  FR: "FRA", DE: "DEU", GR: "GRC", EL: "GRC", HU: "HUN", IE: "IRL", IT: "ITA", LV: "LVA", LT: "LTU",
  LU: "LUX", MT: "MLT", NL: "NLD", PL: "POL", PT: "PRT", RO: "ROU", SK: "SVK", SI: "SVN", ES: "ESP",
  SE: "SWE", IS: "ISL", LI: "LIE", NO: "NOR", CH: "CHE",
};

/** Landcode in hoofdletters, of null. Duitse paspoorten hebben in de MRZ "D" i.p.v. "DEU". */
export function normaliseerLandcode(code: string | null | undefined): string | null {
  const c = (code ?? "").replace(/</g, "").trim().toUpperCase();
  if (!c) return null;
  if (c === "D") return "DEU";
  if (c.length === 2 && ALPHA2_NAAR_ALPHA3[c]) return ALPHA2_NAAR_ALPHA3[c];
  return /^[A-Z]{3}$/.test(c) ? c : null;
}

/** true = EER of Zwitserland, false = andere nationaliteit, null = onbekend. */
export function isEerNationaliteit(nationaliteit: string | null | undefined): boolean | null {
  const code = normaliseerLandcode(nationaliteit);
  if (!code) return null;
  return EER_EN_ZWITSERLAND.has(code);
}

// --- Naam vergelijken ------------------------------------------------------------------------------

/**
 * Tussenvoegsels en vergelijkbare naamdelen die we bij het vergelijken weglaten, zodat
 * "Jan van der Berg", "Jan Berg, van der" en "JAN VAN DER BERG" hetzelfde zijn.
 */
const TUSSENVOEGSELS = new Set([
  "van", "von", "vom", "de", "der", "den", "des", "het", "ten", "ter", "te", "t", "in", "op", "aan",
  "bij", "uit", "voor", "vd", "zu", "zum", "zur", "di", "da", "del", "della", "dello", "dei", "degli",
  "delle", "do", "dos", "das", "du", "la", "le", "lo", "los", "las", "el", "al",
]);

/** Letters die NFD niet ontleedt. */
const LETTERS: Record<string, string> = { "ß": "ss", "ø": "o", "æ": "ae", "œ": "oe", "ł": "l", "đ": "d", "ð": "d", "þ": "th", "ı": "i", "ĳ": "ij" };

/** Woorden van een naam: kleine letters, zonder accenten, apostrofs en leestekens. */
export function naamWoorden(naam: string | null | undefined): string[] {
  const basis = (naam ?? "")
    .toLowerCase()
    .replace(/[ßøæœłđðþıĳ]/g, (l) => LETTERS[l] ?? l)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    // O'Brien, 't Hart, D’Souza: apostrof weg, de letters blijven aan elkaar.
    .replace(/['’`´]/g, "");
  return basis.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Naamwoorden zonder tussenvoegsels; blijft er niets over, dan alle woorden. */
function kern(woorden: string[]): string[] {
  const zonder = woorden.filter((w) => !TUSSENVOEGSELS.has(w));
  return zonder.length > 0 ? zonder : woorden;
}

export type DocumentNaam = {
  voornamen?: string | null;
  achternaam?: string | null;
};

/**
 * Komt de naam op het document overeen met de naam in ons systeem? Bewust streng (bij twijfel naar
 * de admin, nooit afwijzen), maar tolerant voor hoofdletters, accenten, tussenvoegsels en volgorde:
 * - elk woord van onze naam staat op het document (roepnaam + achternaam is genoeg);
 * - elk woord van de achternaam op het document staat in onze naam;
 * - minstens één voornaam van het document staat in onze naam.
 * Een roepnaam die niet in het paspoort staat ("Jan" bij "Johannes") geeft dus false → handmatig.
 */
export function naamKomtOvereen(document: DocumentNaam, onzeNaam: string | null | undefined): boolean {
  const voornamen = kern(naamWoorden(document.voornamen));
  const achternaam = kern(naamWoorden(document.achternaam));
  const onze = kern(naamWoorden(onzeNaam));
  if (voornamen.length === 0 || achternaam.length === 0 || onze.length === 0) return false;

  const opDocument = new Set([...voornamen, ...achternaam]);
  const onzeSet = new Set(onze);
  return (
    onze.every((w) => opDocument.has(w)) &&
    achternaam.every((w) => onzeSet.has(w)) &&
    voornamen.some((w) => onzeSet.has(w))
  );
}

// --- Beoordelen ------------------------------------------------------------------------------------

/** Documentsoorten die automatisch goedgekeurd mogen worden (Didit `document_type`). */
export const AUTOMATISCH_TOEGESTANE_DOCUMENTEN = new Set(["Passport", "Identity Card"]);

/** Waarom een controle bij de admin terechtkomt. */
export const HANDMATIG_REDENEN = {
  didit_in_review: "Didit twijfelt (In Review)",
  didit_declined: "Didit keurde af (Declined)",
  id_niet_goedgekeurd: "ID-stap niet goedgekeurd door Didit",
  geen_gegevens: "Geen ID-gegevens van Didit ontvangen",
  verlopen: "Document is verlopen",
  geen_vervaldatum: "Geen vervaldatum gevonden",
  naam_anders: "Naam komt niet overeen met ons systeem",
  niet_eer: "Nationaliteit buiten EER/Zwitserland",
  nationaliteit_onbekend: "Nationaliteit niet gevonden",
  documentsoort: "Geen paspoort of ID-kaart",
  opslaan_mislukt: "Automatisch goedkeuren lukte niet (opslaan mislukt)",
  kopie_nodig: "Buiten EER/Zwitserland: kopie van het ID nodig (Wav), na videocall vastgelegd",
} as const;
export type HandmatigReden = keyof typeof HANDMATIG_REDENEN;

export function handmatigRedenLabel(code: string): string {
  return (HANDMATIG_REDENEN as Record<string, string>)[code] ?? code;
}

/**
 * Wat we uit een Didit-`id_verifications[]`-item lezen. Alleen deze velden; al het andere (o.a.
 * `personal_number`, adres, geboorteplaats, MRZ, beelden) wordt genegeerd. `document_number` is al
 * gecontroleerd met veiligDocumentnummer (nooit gelijk aan het persoonsnummer/BSN).
 */
export type DiditIdVerificatie = {
  status?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  expiration_date?: string | null;
  date_of_birth?: string | null;
  issuing_state?: string | null;
  nationality?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
};

/**
 * Wat we bewaren over de uitslag: het controlerecord. Nooit het persoonsnummer/BSN, adres of beelden.
 */
export type IdCheckVelden = {
  vervaldatum: string | null;
  documentsoort: string | null;
  documentnummer: string | null;
  uitgifteland: string | null;
  nationaliteit: string | null;
  eer: boolean | null;
  naam_komt_overeen: boolean | null;
  /** Naam zoals op het document. */
  naam: string | null;
  geboortedatum: string | null;
};

export type IdCheckBeoordeling = {
  /** Nooit "afgewezen": afwijzen doet alleen een mens. */
  status: "goedgekeurd" | "handmatig";
  redenen: HandmatigReden[];
  velden: IdCheckVelden;
};

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function tekst(waarde: unknown, max = 100): string | null {
  return typeof waarde === "string" && waarde.trim() ? waarde.trim().slice(0, max) : null;
}

/** YYYY-MM-DD dat een bestaande kalenderdatum is, anders null. */
export function geldigeDatum(waarde: unknown): string | null {
  if (typeof waarde !== "string" || !DATUM.test(waarde)) return null;
  const d = new Date(`${waarde}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === waarde ? waarde : null;
}

// --- Documentnummer en BSN -------------------------------------------------------------------------

/**
 * 11-proef van een BSN: 9 cijfers (8 = met voorloopnul), som van cijfer × (9..2) min het laatste
 * cijfer is deelbaar door 11. Alleen om te voorkomen dat een BSN als documentnummer wordt opgeslagen.
 */
export function isBsn(waarde: unknown): boolean {
  if (typeof waarde !== "string") return false;
  const c = waarde.replace(/[\s.-]/g, "");
  if (!/^\d{8,9}$/.test(c)) return false;
  const n = c.padStart(9, "0");
  if (/^0+$/.test(n)) return false;
  let som = 0;
  for (let i = 0; i < 8; i++) som += Number(n[i]) * (9 - i);
  som -= Number(n[8]);
  return som % 11 === 0;
}

/** Documentnummer zoals op het document: hoofdletters, zonder spaties, streepjes, punten of '<'. */
export function normaliseerDocumentnummer(waarde: unknown): string | null {
  if (typeof waarde !== "string") return null;
  const c = waarde.toUpperCase().replace(/[\s<.\-/]/g, "");
  return /^[A-Z0-9]{5,20}$/.test(c) ? c : null;
}

/**
 * Het documentnummer dat we mogen opslaan, of null. Documentnummer en persoonsnummer zijn bij Didit
 * aparte velden (`document_number` vs `personal_number`); toch nooit iets opslaan dat het BSN kan
 * zijn: gelijk aan het persoonsnummer → null, en bij een Nederlands document (uitgifteland of
 * nationaliteit NLD) een documentnummer van alleen cijfers → null (Nederlandse paspoorten en
 * ID-kaarten hebben een documentnummer met letters; alleen cijfers is daar vrijwel zeker het BSN).
 */
export function veiligDocumentnummer(input: {
  documentnummer: unknown;
  persoonsnummer?: unknown;
  landen?: readonly (string | null | undefined)[];
}): string | null {
  const nummer = normaliseerDocumentnummer(input.documentnummer);
  if (!nummer) return null;
  const persoonsnummer = typeof input.persoonsnummer === "string" ? input.persoonsnummer.toUpperCase().replace(/[\s<.\-/]/g, "") : "";
  if (persoonsnummer && persoonsnummer === nummer) return null;
  const nederlands = (input.landen ?? []).some((l) => normaliseerLandcode(l) === "NLD");
  if (nederlands && /^\d+$/.test(nummer)) return null;
  return nummer;
}

/** Naam zoals op het document: voornamen + achternaam, anders de volledige naam. */
export function naamOpDocument(id: Pick<DiditIdVerificatie, "first_name" | "last_name" | "full_name"> | null): string | null {
  if (!id) return null;
  const delen = [id.first_name, id.last_name].map((d) => (d ?? "").trim()).filter(Boolean);
  const naam = delen.length > 0 ? delen.join(" ") : (id.full_name ?? "").trim();
  return naam ? naam.replace(/\s+/g, " ").slice(0, 200) : null;
}

/** Het eerste ID-item uit een Didit-beslissing (V3: `id_verifications[]`), alleen de velden die we lezen. */
export function idVerificatieUitBeslissing(beslissing: unknown): DiditIdVerificatie | null {
  if (!beslissing || typeof beslissing !== "object") return null;
  const lijst = (beslissing as { id_verifications?: unknown }).id_verifications;
  const item = Array.isArray(lijst) ? lijst[0] : null;
  if (!item || typeof item !== "object") return null;
  const i = item as Record<string, unknown>;
  const issuing_state = tekst(i.issuing_state, 3);
  const nationality = tekst(i.nationality, 3);
  return {
    status: tekst(i.status, 40),
    document_type: tekst(i.document_type, 60),
    // Alleen `document_number`; `personal_number` (bij NL-documenten het BSN) wordt alleen gebruikt
    // om te controleren dat het documentnummer niet toevallig hetzelfde is, en nooit teruggegeven.
    document_number: veiligDocumentnummer({
      documentnummer: i.document_number,
      persoonsnummer: i.personal_number,
      landen: [issuing_state, nationality],
    }),
    expiration_date: tekst(i.expiration_date, 10),
    date_of_birth: geldigeDatum(i.date_of_birth),
    issuing_state,
    nationality,
    first_name: tekst(i.first_name, 200),
    last_name: tekst(i.last_name, 200),
    full_name: tekst(i.full_name, 200),
  };
}

/**
 * Beoordeel een Didit-uitslag. Alleen automatisch goedgekeurd als ALLES klopt:
 * Didit zegt "Approved" (sessie én ID-stap), het is een paspoort of ID-kaart, het document is niet
 * verlopen, de naam klopt met ons systeem en de nationaliteit is EER of Zwitserland.
 * Anders "handmatig" met de redenen. Nooit "afgewezen".
 *
 * @param vandaag YYYY-MM-DD (Nederlandse tijd)
 */
export function beoordeelDiditUitslag(input: {
  diditStatus: string;
  id: DiditIdVerificatie | null;
  medewerkerNaam: string | null | undefined;
  vandaag: string;
}): IdCheckBeoordeling {
  const { diditStatus, id, medewerkerNaam, vandaag } = input;
  const redenen: HandmatigReden[] = [];

  const vervaldatum = id?.expiration_date && DATUM.test(id.expiration_date) ? id.expiration_date : null;
  const eer = isEerNationaliteit(id?.nationality);
  const naamOk = id ? naamKomtOvereen({ voornamen: id.first_name, achternaam: id.last_name }, medewerkerNaam) : null;
  const velden: IdCheckVelden = {
    vervaldatum,
    documentsoort: id?.document_type ?? null,
    documentnummer: id?.document_number ?? null,
    uitgifteland: normaliseerLandcode(id?.issuing_state),
    nationaliteit: normaliseerLandcode(id?.nationality),
    eer,
    naam_komt_overeen: naamOk,
    naam: naamOpDocument(id),
    geboortedatum: geldigeDatum(id?.date_of_birth),
  };

  if (diditStatus === "In Review") redenen.push("didit_in_review");
  else if (diditStatus === "Declined") redenen.push("didit_declined");
  else if (diditStatus !== "Approved") redenen.push("didit_in_review");

  if (!id) {
    redenen.push("geen_gegevens");
    return { status: "handmatig", redenen, velden };
  }

  if (diditStatus === "Approved" && id.status !== "Approved") redenen.push("id_niet_goedgekeurd");
  if (!id.document_type || !AUTOMATISCH_TOEGESTANE_DOCUMENTEN.has(id.document_type)) redenen.push("documentsoort");
  if (!vervaldatum) redenen.push("geen_vervaldatum");
  else if (vervaldatum < vandaag) redenen.push("verlopen");
  if (!naamOk) redenen.push("naam_anders");
  if (eer === null) redenen.push("nationaliteit_onbekend");
  else if (!eer) redenen.push("niet_eer");

  return { status: redenen.length === 0 ? "goedgekeurd" : "handmatig", redenen, velden };
}

/**
 * De kolommen die we na een Didit-beoordeling in `id_verificaties` schrijven. Bewust een witte lijst:
 * niets uit de payload komt hier ongezien in. Wel het controlerecord (naam en geboortedatum zoals
 * op het document, nationaliteit, documentsoort, documentnummer, vervaldatum); nooit het
 * persoonsnummer/BSN, adres, beelden of de ruwe payload.
 *
 * @param bewaarTot 31-12 van (jaar laatste dienst + 5), zie berekenWavBewaarTot
 */
export function verificatieUpdateNaBeoordeling(input: {
  beoordeling: IdCheckBeoordeling;
  diditStatus: string;
  eventId: string | null;
  nu: string;
  bewaarTot: string | null;
}): Record<string, unknown> {
  const { beoordeling, diditStatus, eventId, nu } = input;
  const goed = beoordeling.status === "goedgekeurd";
  return {
    status: beoordeling.status,
    didit_status: diditStatus.slice(0, 40),
    beslissing: goed ? "goedgekeurd" : null,
    beslist_door: goed ? BESLIST_DOOR_DIDIT : null,
    beslist_op: goed ? nu : null,
    handmatig_redenen: beoordeling.redenen,
    vervaldatum: beoordeling.velden.vervaldatum,
    documentsoort: beoordeling.velden.documentsoort,
    documentnummer: beoordeling.velden.documentnummer,
    uitgifteland: beoordeling.velden.uitgifteland,
    nationaliteit: beoordeling.velden.nationaliteit,
    eer: beoordeling.velden.eer,
    naam_komt_overeen: beoordeling.velden.naam_komt_overeen,
    naam: beoordeling.velden.naam,
    geboortedatum: beoordeling.velden.geboortedatum,
    bewaar_tot: input.bewaarTot,
    laatste_event_id: eventId ? eventId.slice(0, 100) : null,
    bijgewerkt_op: nu,
  };
}

/**
 * Kolommen van het controlerecord die pas bestaan na migratie 20261024_id_controlerecord_wav.sql.
 * Zolang die niet gedraaid is, schrijft de code zonder deze kolommen (zoals vóór het advies), zodat
 * de ID-controle blijft werken (lib/db-kolom-fallback).
 */
export const CONTROLERECORD_KOLOMMEN = ["naam", "geboortedatum", "nationaliteit", "documentnummer", "bewaar_tot"] as const;

/** Wie besliste bij een automatische goedkeuring (kolom beslist_door / beoordeeld_door). */
export const BESLIST_DOOR_DIDIT = "systeem (Didit)";

/** Bestandsnaam (kolom file_name is verplicht) voor een ID-bewijsrij zonder bestand. */
export function idBewijsZonderBestandNaam(methode: "didit" | "videocall" | "kopie_verwijderd"): string {
  if (methode === "didit") return "ID gecontroleerd via Didit (geen kopie)";
  if (methode === "videocall") return "ID gecontroleerd via videocall (geen kopie)";
  return "ID gecontroleerd, kopie verwijderd";
}

/**
 * Rij voor `medewerker_documenten`: een goedgekeurd ID-bewijs zonder bestand. Telt voor de checklist
 * vóór reageren (review_status goedgekeurd + vervaldatum, zie lib/medewerker/reageer-checklist).
 */
export function idBewijsRijZonderBestand(input: {
  medewerkerId: string;
  vervaldatum: string | null;
  methode: "didit" | "videocall";
  beoordeeldDoor: string;
  nu: string;
  opmerking?: string | null;
}): Record<string, unknown> {
  return {
    medewerker_id: input.medewerkerId,
    document_type: "id_bewijs",
    file_name: idBewijsZonderBestandNaam(input.methode),
    file_path: null,
    file_url: null,
    file_size: null,
    expiry_date: input.vervaldatum,
    review_status: "goedgekeurd",
    review_opmerking: input.opmerking ?? null,
    reviewed_at: input.nu,
    uploaded_at: input.nu,
    verificatie_methode: input.methode,
    beoordeeld_door: input.beoordeeldDoor.slice(0, 200),
  };
}

// --- Admin-invoer ----------------------------------------------------------------------------------

/** Geldige vervaldatum voor een handmatige goedkeuring: YYYY-MM-DD, een echte datum, niet vóór vandaag. */
export function controleerVervaldatum(datum: unknown, vandaag: string): string | null {
  const geldig = geldigeDatum(datum);
  if (!geldig) return "Vul een geldige vervaldatum in";
  if (geldig < vandaag) return "Dit ID is verlopen. Een verlopen ID kan niet worden goedgekeurd.";
  return null;
}

// --- Callback voor de app --------------------------------------------------------------------------

/**
 * Terugkeer-URL na de Didit-flow. Web: de documentenpagina (met trailing slash, de site gebruikt
 * trailingSlash: true). De app mag een eigen deeplink meegeven, maar alleen in het schema
 * `toptalent://` (anders zou dit een open redirect zijn). Didit plakt er zelf
 * `?verificationSessionId=…&status=…` achter.
 */
export function kiesCallback(gevraagd: unknown, siteUrl: string): string {
  if (typeof gevraagd === "string" && /^toptalent:\/\/[A-Za-z0-9/_-]{0,100}$/.test(gevraagd)) return gevraagd;
  return `${siteUrl.replace(/\/+$/, "")}/medewerker/documenten/`;
}
