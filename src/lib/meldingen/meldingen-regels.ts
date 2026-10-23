/**
 * Meldingencentrum (stap 5): pure regels, zonder imports, los testbaar
 * (tests/unit/meldingen-regels.spec.ts). Opslag: meldingen-opslag.ts. Tabel: migratie
 * 20261023_meldingencentrum.sql.
 *
 * Elke push wordt ook een melding (lib/push-notifications.ts). De categorie bepaalt de tab:
 * Alles / Diensten / Uren & geld (account-meldingen staan alleen onder Alles).
 */

export const MELDING_CATEGORIEEN = ["diensten", "uren_geld", "account"] as const;
export type MeldingCategorie = (typeof MELDING_CATEGORIEEN)[number];
export type MeldingUserType = "medewerker" | "klant";

export const MELDING_BEWAARDAGEN = 90;
export const MELDING_TITEL_MAX = 200;
export const MELDING_TEKST_MAX = 1000;
export const MELDING_URL_MAX = 500;
/** Rijen per insert bij grote broadcasts. */
export const MELDING_INSERT_BLOK = 500;
export const MELDING_LIMIET_STANDAARD = 20;
export const MELDING_LIMIET_MAX = 50;

/** Wat er van een push (of een gebeurtenis zonder push) in de melding komt. PushPayload past hierop. */
export type MeldingInvoer = {
  title: string;
  body: string;
  url?: string | null;
  tag?: string | null;
  categorie?: MeldingCategorie | null;
};

export type MeldingRij = {
  user_type: MeldingUserType;
  user_id: string;
  categorie: MeldingCategorie;
  titel: string;
  tekst: string;
  url: string | null;
};

export function isMeldingCategorie(v: unknown): v is MeldingCategorie {
  return typeof v === "string" && (MELDING_CATEGORIEEN as readonly string[]).includes(v);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

// Tag eerst (die is het meest specifiek), dan het pad, dan "diensten".
const TAG_UREN_GELD = /(^|[-_])(uren|hours|factuur|facturen|invoice|betaling|uitbetaling|payout)([-_]|$)/i;
const TAG_ACCOUNT = /(^|[-_])(checklist|document|documenten|account|gepauzeerd|pauze|contract|overeenkomst|profiel)([-_]|$)/i;
const TAG_DIENSTEN =
  /(^|[-_])(dienst|diensten|shift|aanmelding|uitnodiging|ingepland|afgewezen|geannuleerd|vervanging|aanbieding|assigned|confirmed|review|beoordeling)([-_]|$)/i;

const PAD_UREN_GELD = [/^\/medewerker\/(uren|financieel)(\/|$)/, /^\/klant\/(facturen|kosten)(\/|$)/];
const PAD_ACCOUNT = [
  /^\/medewerker\/(account|profiel|documenten|contracten|overeenkomst|gepauzeerd|instellingen|checklist)(\/|$)/,
  /^\/klant\/instellingen(\/|$)/,
];
const TAB_UREN_GELD = ["uren", "facturen", "kosten"];
const TAB_ACCOUNT = ["instellingen"];

/** decodeURIComponent gooit bij een kapotte %-reeks; dan de ruwe waarde. */
function veiligDecoderen(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** Pad en `tab`-parameter uit een relatieve url (zonder URL-API, die in tests en oude webviews ontbreekt). */
function padEnTab(url: string): { pad: string; tab: string | null } {
  const [voorHash] = url.split("#");
  const [pad, query = ""] = voorHash.split("?");
  const tab = query
    .split("&")
    .map((p) => p.split("="))
    .find(([k]) => k === "tab")?.[1];
  return { pad: pad || "/", tab: tab ? veiligDecoderen(tab) : null };
}

/** Categorie van een melding: meegegeven, anders uit de tag, anders uit het pad, anders diensten. */
export function categorieVoorMelding(invoer: Pick<MeldingInvoer, "categorie" | "tag" | "url">): MeldingCategorie {
  if (isMeldingCategorie(invoer.categorie)) return invoer.categorie;

  const tag = (invoer.tag ?? "").trim();
  if (tag) {
    if (TAG_UREN_GELD.test(tag)) return "uren_geld";
    if (TAG_ACCOUNT.test(tag)) return "account";
    if (TAG_DIENSTEN.test(tag)) return "diensten";
  }

  const url = veiligeMeldingUrl(invoer.url);
  if (url) {
    const { pad, tab } = padEnTab(url);
    if (tab && TAB_UREN_GELD.includes(tab)) return "uren_geld";
    if (tab && TAB_ACCOUNT.includes(tab)) return "account";
    if (PAD_UREN_GELD.some((r) => r.test(pad))) return "uren_geld";
    if (PAD_ACCOUNT.some((r) => r.test(pad))) return "account";
  }
  return "diensten";
}

/** Alleen relatieve paden binnen de site (geen //host, geen javascript:, geen witruimte). */
export function veiligeMeldingUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (!u.startsWith("/") || u.startsWith("//") || u.startsWith("/\\")) return null;
  if (u.length > MELDING_URL_MAX || /\s/.test(u)) return null;
  return u;
}

// Losse surrogaten (half emoji-teken) en \0 weigert Postgres; dan zou een heel blok mislukken.
const LOSSE_SURROGAAT = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Inkorten op tekens (code points, zoals char_length in Postgres), nooit midden in een emoji. */
function knip(tekst: string, max: number): string {
  const tekens = Array.from(tekst.replace(/\u0000/g, "").replace(LOSSE_SURROGAAT, "").trim());
  return tekens.length <= max ? tekens.join("") : `${tekens.slice(0, max - 1).join("").trimEnd()}…`;
}

/** Eén rij per (unieke, geldige) ontvanger. Zonder titel geen melding. */
export function maakMeldingRijen(userIds: readonly string[], userType: MeldingUserType, invoer: MeldingInvoer): MeldingRij[] {
  const titel = knip(String(invoer.title ?? ""), MELDING_TITEL_MAX);
  if (!titel) return [];
  const tekst = knip(String(invoer.body ?? ""), MELDING_TEKST_MAX);
  const categorie = categorieVoorMelding(invoer);
  const url = veiligeMeldingUrl(invoer.url);
  const ids = [...new Set(userIds.filter(isUuid).map((id) => id.toLowerCase()))];
  return ids.map((user_id) => ({ user_type: userType, user_id, categorie, titel, tekst, url }));
}

export function inBlokken<T>(lijst: readonly T[], grootte = MELDING_INSERT_BLOK): T[][] {
  const uit: T[][] = [];
  for (let i = 0; i < lijst.length; i += grootte) uit.push(lijst.slice(i, i + grootte));
  return uit;
}

// --- Cursor (keyset op created_at + id, nieuwste eerst) ------------------------------------------

const TIJDSTEMPEL = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/;

// btoa/atob bestaan in de browser en in Node ≥ 16; de inhoud is ASCII (tijdstempel + uuid).
function naarBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function vanBase64Url(s: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    return atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  } catch {
    return null;
  }
}

/** Ondoorzichtige cursor voor `voor`: created_at (exact zoals de database hem gaf) + id. */
export function maakCursor(createdAt: string, id: string): string {
  return naarBase64Url(`${createdAt}|${id}`);
}

export function leesCursor(cursor: string | null | undefined): { createdAt: string; id: string } | null {
  if (!cursor || cursor.length > 200) return null;
  const tekst = vanBase64Url(cursor);
  if (!tekst) return null;
  const [createdAt, id, ...rest] = tekst.split("|");
  if (rest.length > 0 || !createdAt || !TIJDSTEMPEL.test(createdAt) || !isUuid(id)) return null;
  if (Number.isNaN(new Date(createdAt.replace(" ", "T")).getTime())) return null;
  return { createdAt, id };
}

/** PostgREST-filter voor "ouder dan de cursor" (waarden tussen aanhalingstekens: ze bevatten : . +). */
export function cursorFilter(c: { createdAt: string; id: string }): string {
  return `created_at.lt."${c.createdAt}",and(created_at.eq."${c.createdAt}",id.lt.${c.id})`;
}

// --- Queryparameters van GET /api/meldingen -------------------------------------------------------

export type MeldingenVraag = { categorie: MeldingCategorie | null; cursor: { createdAt: string; id: string } | null; limiet: number };

export function leesMeldingenVraag(p: {
  categorie?: string | null;
  voor?: string | null;
  limiet?: string | null;
}): { ok: true; vraag: MeldingenVraag } | { ok: false; fout: string } {
  const categorieRuw = p.categorie?.trim() || "";
  if (categorieRuw && categorieRuw !== "alles" && !isMeldingCategorie(categorieRuw)) {
    return { ok: false, fout: "Onbekende categorie" };
  }
  const categorie = isMeldingCategorie(categorieRuw) ? categorieRuw : null;

  let cursor: MeldingenVraag["cursor"] = null;
  if (p.voor) {
    cursor = leesCursor(p.voor);
    if (!cursor) return { ok: false, fout: "Ongeldige cursor" };
  }

  let limiet = MELDING_LIMIET_STANDAARD;
  if (p.limiet != null && p.limiet !== "") {
    const n = Number(p.limiet);
    if (!Number.isInteger(n) || n < 1) return { ok: false, fout: "Ongeldige limiet" };
    limiet = Math.min(n, MELDING_LIMIET_MAX);
  }
  return { ok: true, vraag: { categorie, cursor, limiet } };
}

/**
 * `rol` (query of body): welke sessie telt als iemand in hetzelfde browserprofiel zowel als
 * medewerker als werkgever is ingelogd. Leeg = eerst medewerker, dan klant (zoals push-subscription).
 */
export function leesRol(v: unknown): { ok: true; rol: MeldingUserType | null } | { ok: false } {
  if (v == null || v === "") return { ok: true, rol: null };
  if (v === "medewerker" || v === "klant") return { ok: true, rol: v };
  return { ok: false };
}

export type OngelezenTelling = { totaal: number; per_categorie: Record<MeldingCategorie, number> };

export function legeTelling(): OngelezenTelling {
  return { totaal: 0, per_categorie: { diensten: 0, uren_geld: 0, account: 0 } };
}

export function telling(per: Partial<Record<MeldingCategorie, number | null | undefined>>): OngelezenTelling {
  const per_categorie = {
    diensten: Math.max(0, per.diensten ?? 0),
    uren_geld: Math.max(0, per.uren_geld ?? 0),
    account: Math.max(0, per.account ?? 0),
  };
  return { totaal: per_categorie.diensten + per_categorie.uren_geld + per_categorie.account, per_categorie };
}

/** Grens voor het opruimen: alles van vóór dit moment mag weg. */
export function opruimGrens(nu: Date = new Date(), dagen = MELDING_BEWAARDAGEN): string {
  return new Date(nu.getTime() - dagen * 24 * 60 * 60 * 1000).toISOString();
}

// --- Weergave (portaal) ---------------------------------------------------------------------------

const TZ = "Europe/Amsterdam";

function nlDag(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "zojuist", "5 min geleden", "3 uur geleden", "gisteren 14:05", "4 dagen geleden", "12 okt", "12 okt 2025". */
export function meldingTijd(iso: string, nu: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sec = Math.max(0, Math.floor((nu.getTime() - d.getTime()) / 1000));
  if (sec < 60) return "zojuist";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min geleden`;
  const uur = Math.floor(min / 60);
  const vandaag = nlDag(nu);
  const gisteren = nlDag(new Date(nu.getTime() - 24 * 60 * 60 * 1000));
  const dag = nlDag(d);
  if (uur < 24 && dag === vandaag) return `${uur} uur geleden`;
  if (dag === gisteren) {
    const tijd = new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
    return `gisteren ${tijd}`;
  }
  if (uur < 24) return `${uur} uur geleden`;
  const dagen = Math.floor(uur / 24);
  if (dagen < 7) return `${dagen} dagen geleden`;
  const zelfdeJaar = dag.slice(0, 4) === vandaag.slice(0, 4);
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, day: "numeric", month: "short", ...(zelfdeJaar ? {} : { year: "numeric" }) })
    .format(d)
    .replace(".", "");
}

/** Tekst op de actieknop van een kaart, afgeleid uit waar de melding naartoe gaat. */
export function actieLabel(url: string | null | undefined): string | null {
  const veilig = veiligeMeldingUrl(url);
  if (!veilig) return null;
  const { pad, tab } = padEnTab(veilig);
  // Klantportaal: alleen de tab zegt waar het heen gaat (/klant/uren/ zonder tab = overzicht).
  const deel = tab || (pad.startsWith("/klant/") ? "" : pad.split("/").filter(Boolean)[1] || "");
  const labels: Record<string, string> = {
    shifts: "Naar Ontdekken",
    diensten: "Naar diensten",
    uren: "Naar uren",
    facturen: "Naar facturen",
    kosten: "Naar kosten",
    beoordelingen: "Beoordelen",
    contracten: "Naar contracten",
    documenten: "Naar documenten",
    financieel: "Naar financieel",
  };
  return labels[deel] ?? "Bekijken";
}

/**
 * Klantportaal = één pagina met tabs. Een melding-url als /klant/uren?tab=uren of
 * /klant/dashboard?tab=facturen wordt daar een tabwissel (geen herlaad). Anders null.
 */
export function klantTabUitUrl(url: string | null | undefined): string | null {
  const veilig = veiligeMeldingUrl(url);
  if (!veilig) return null;
  const { pad, tab } = padEnTab(veilig);
  if (!/^\/klant\/(uren|dashboard)\/?$/.test(pad)) return null;
  return tab || "overzicht";
}
