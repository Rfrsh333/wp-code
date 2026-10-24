/**
 * ID-controle via Didit: pure regels (geen imports met side effects, los testbaar in
 * tests/unit/id-check-didit.spec.ts). De DB-kant staat in lib/id-check/db.ts, de Didit-API in
 * lib/id-check/didit-api.ts.
 *
 * Achtergrond (besluit Rachid, 24-10-2026): volgens de Autoriteit Persoonsgegevens mag TopTalent van
 * zzp'ers geen kopie van het ID maken. Didit controleert het ID; wij bewaren alleen de uitslag en
 * een paar velden (vervaldatum, documentsoort, uitgifteland, EER ja/nee, naam klopt ja/nee). Naam,
 * geboortedatum, documentnummer, persoonsnummer/BSN en beelden komen NOOIT in onze database.
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
} as const;
export type HandmatigReden = keyof typeof HANDMATIG_REDENEN;

export function handmatigRedenLabel(code: string): string {
  return (HANDMATIG_REDENEN as Record<string, string>)[code] ?? code;
}

/**
 * Wat we uit een Didit-`id_verifications[]`-item lezen. Alleen deze velden; al het andere (o.a.
 * `personal_number`, `document_number`, `date_of_birth`, adres, beelden) wordt genegeerd.
 */
export type DiditIdVerificatie = {
  status?: string | null;
  document_type?: string | null;
  expiration_date?: string | null;
  issuing_state?: string | null;
  nationality?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

/** Wat we bewaren over de uitslag. Geen naam, geboortedatum, documentnummer of persoonsnummer. */
export type IdCheckVelden = {
  vervaldatum: string | null;
  documentsoort: string | null;
  uitgifteland: string | null;
  eer: boolean | null;
  naam_komt_overeen: boolean | null;
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

/** Het eerste ID-item uit een Didit-beslissing (V3: `id_verifications[]`), alleen de velden die we lezen. */
export function idVerificatieUitBeslissing(beslissing: unknown): DiditIdVerificatie | null {
  if (!beslissing || typeof beslissing !== "object") return null;
  const lijst = (beslissing as { id_verifications?: unknown }).id_verifications;
  const item = Array.isArray(lijst) ? lijst[0] : null;
  if (!item || typeof item !== "object") return null;
  const i = item as Record<string, unknown>;
  return {
    status: tekst(i.status, 40),
    document_type: tekst(i.document_type, 60),
    expiration_date: tekst(i.expiration_date, 10),
    issuing_state: tekst(i.issuing_state, 3),
    nationality: tekst(i.nationality, 3),
    first_name: tekst(i.first_name, 200),
    last_name: tekst(i.last_name, 200),
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
    uitgifteland: normaliseerLandcode(id?.issuing_state),
    eer,
    naam_komt_overeen: naamOk,
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
 * niets uit de payload komt hier ongezien in (geen naam, geboortedatum, documentnummer,
 * persoonsnummer/BSN, adres of beelden).
 */
export function verificatieUpdateNaBeoordeling(input: {
  beoordeling: IdCheckBeoordeling;
  diditStatus: string;
  eventId: string | null;
  nu: string;
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
    uitgifteland: beoordeling.velden.uitgifteland,
    eer: beoordeling.velden.eer,
    naam_komt_overeen: beoordeling.velden.naam_komt_overeen,
    laatste_event_id: eventId ? eventId.slice(0, 100) : null,
    bijgewerkt_op: nu,
  };
}

/** Wie besliste bij een automatische goedkeuring (kolom beslist_door / beoordeeld_door). */
export const BESLIST_DOOR_DIDIT = "systeem (Didit)";

/** Bestandsnaam (kolom file_name is verplicht) voor een ID-bewijsrij zonder bestand. */
export function idBewijsZonderBestandNaam(methode: "didit" | "videocall"): string {
  return methode === "didit" ? "ID gecontroleerd via Didit (geen kopie)" : "ID gecontroleerd via videocall (geen kopie)";
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
  if (typeof datum !== "string" || !DATUM.test(datum)) return "Vul een geldige vervaldatum in";
  const d = new Date(`${datum}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== datum) return "Vul een geldige vervaldatum in";
  if (datum < vandaag) return "Dit ID is verlopen. Een verlopen ID kan niet worden goedgekeurd.";
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
