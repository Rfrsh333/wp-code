import { SITE_URL } from "@/lib/constants";
import { functieGroepen } from "@/lib/medewerker/push-doelgroep-regels";

/**
 * Sfeerfoto's bij diensten (zoals YoungOnes een foto bij elke klus toont). Pure regels, getest in
 * tests/unit/sfeerfotos.spec.ts. De DB-kant (bedrijfsfoto's ophalen) staat in lib/sfeerfotos-opslag.ts.
 *
 * Welke foto hoort bij een dienst (voorrang):
 *   1. diensten.afbeelding_url: de foto die de werkgever bij deze dienst koos (eigen upload of een
 *      standaardfoto uit de catalogus);
 *   2. klanten.foto_url: de vaste bedrijfsfoto van de werkgever;
 *   3. een standaardfoto die bij de functie past, binnen de categorie gekozen op de dienst-id.
 *
 * De foto's staan in public/images/sfeer/{groot,klein}/<id>.jpg (1200×800 en 480×320, Unsplash
 * License; bronnen in public/images/sfeer/bronnen.json). De API geeft absolute URL's (de app heeft
 * een volledige URL nodig), op basis van de site-URL uit lib/constants.
 */

export const SFEER_CATEGORIEEN = [
  { id: "bediening", label: "Bediening" },
  { id: "bar", label: "Bar" },
  { id: "barista", label: "Koffie & barista" },
  { id: "keuken", label: "Keuken" },
  { id: "afwas", label: "Afwas & spoelkeuken" },
  { id: "catering", label: "Catering & events" },
  { id: "schoonmaak", label: "Schoonmaak & housekeeping" },
  { id: "algemeen", label: "Horeca algemeen" },
] as const;

export type SfeerCategorie = (typeof SFEER_CATEGORIEEN)[number]["id"];

type CatalogusRegel = { id: string; categorie: SfeerCategorie; label: string };

/** Volgorde binnen een categorie bepaalt de verdeling over diensten: niet zomaar omgooien. */
const CATALOGUS: readonly CatalogusRegel[] = [
  { id: "bediening-1", categorie: "bediening", label: "Bediening bij kaarslicht" },
  { id: "bediening-2", categorie: "bediening", label: "Gerecht gaat naar de gast" },
  { id: "bediening-3", categorie: "bediening", label: "Uitserveren op het terras" },
  { id: "bar-1", categorie: "bar", label: "Drankje op ijs aan de bar" },
  { id: "bar-2", categorie: "bar", label: "Cocktail in de avond" },
  { id: "bar-3", categorie: "bar", label: "Bartender schenkt in" },
  { id: "barista-1", categorie: "barista", label: "Latte art in de maak" },
  { id: "barista-2", categorie: "barista", label: "Cappuccino op tafel" },
  { id: "barista-3", categorie: "barista", label: "Verse koffie met latte art" },
  { id: "keuken-1", categorie: "keuken", label: "Chef dresseert een bord" },
  { id: "keuken-2", categorie: "keuken", label: "Volle bak in de keuken" },
  { id: "keuken-3", categorie: "keuken", label: "Kok aan het werk" },
  { id: "afwas-1", categorie: "afwas", label: "Stapel schone borden" },
  { id: "afwas-2", categorie: "afwas", label: "Afwasrek met bestek" },
  { id: "afwas-3", categorie: "afwas", label: "Doorkijk naar de spoelkeuken" },
  { id: "catering-1", categorie: "catering", label: "Warm buffet" },
  { id: "catering-2", categorie: "catering", label: "Borrelplanken op een event" },
  { id: "catering-3", categorie: "catering", label: "Lunchbuffet met salades" },
  { id: "schoonmaak-1", categorie: "schoonmaak", label: "Frisse hotelkamer" },
  { id: "schoonmaak-2", categorie: "schoonmaak", label: "Bed opmaken in het hotel" },
  { id: "algemeen-1", categorie: "algemeen", label: "Gedekte restaurantzaal" },
  { id: "algemeen-2", categorie: "algemeen", label: "Café in de avond" },
  { id: "algemeen-3", categorie: "algemeen", label: "Sfeervol restaurant" },
];

const PER_ID = new Map(CATALOGUS.map((r) => [r.id, r]));

export type FotoMaat = "groot" | "klein";

/** Eén standaardfoto zoals GET /api/sfeerfotos hem geeft (absolute URL's). */
export type Sfeerfoto = { id: string; categorie: SfeerCategorie; label: string; groot: string; klein: string };

/** `foto` op elke dienst die de medewerker of werkgever ophaalt. Bij een upload is klein = groot. */
export type FotoBron = "dienst" | "bedrijf" | "standaard";
export type DienstFoto = { groot: string; klein: string; bron: FotoBron };

const STANDAARD_SITE = "https://www.toptalentjobs.nl";
/** Onze eigen hosts: een catalogus-URL met een van deze hosts (of relatief) is geldig. */
const EIGEN_HOSTS = ["www.toptalentjobs.nl", "toptalentjobs.nl"];

/** Origin van de site (zonder slash aan het eind); een ongeldige env-waarde valt terug op productie. */
export function siteOrigin(basis: string = SITE_URL): string {
  // Een env-regel met commentaar erachter ("https://…n# Google Calendar") is wel een geldige URL.
  if (/[\s#]/.test(basis.trim())) return STANDAARD_SITE;
  try {
    const url = new URL(basis);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : STANDAARD_SITE;
  } catch {
    return STANDAARD_SITE;
  }
}

/** Pad binnen de site, bv. "/images/sfeer/klein/bar-1.jpg". */
export function sfeerPad(id: string, maat: FotoMaat): string {
  return `/images/sfeer/${maat}/${id}.jpg`;
}

function naarSfeerfoto(r: CatalogusRegel, basis?: string): Sfeerfoto {
  const origin = siteOrigin(basis);
  return { id: r.id, categorie: r.categorie, label: r.label, groot: origin + sfeerPad(r.id, "groot"), klein: origin + sfeerPad(r.id, "klein") };
}

/** De hele catalogus, op categorie (volgorde van SFEER_CATEGORIEEN). */
export function sfeerfotoCatalogus(basis?: string): Sfeerfoto[] {
  return SFEER_CATEGORIEEN.flatMap((c) => CATALOGUS.filter((r) => r.categorie === c.id)).map((r) => naarSfeerfoto(r, basis));
}

export function sfeerfotoOpId(id: unknown, basis?: string): Sfeerfoto | null {
  if (typeof id !== "string") return null;
  const r = PER_ID.get(id.trim());
  return r ? naarSfeerfoto(r, basis) : null;
}

const SFEER_PAD = /^\/images\/sfeer\/(groot|klein)\/([a-z]+-\d+)\.jpg$/;

/**
 * Id van een catalogusfoto uit een URL (groot of klein), of null. Geldig: een relatief pad, of een
 * absolute URL op onze eigen site (SITE_URL, www.toptalentjobs.nl of toptalentjobs.nl). Een
 * willekeurige andere host met hetzelfde pad telt niet.
 */
export function sfeerfotoIdUitUrl(url: unknown, basis?: string): string | null {
  if (typeof url !== "string" || !url.trim() || url.length > 500) return null;
  const waarde = url.trim();
  let pad: string;
  if (waarde.startsWith("/") && !waarde.startsWith("//")) {
    pad = waarde.split(/[?#]/)[0];
  } else {
    let u: URL;
    try {
      u = new URL(waarde);
    } catch {
      return null;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const hosts = new Set([...EIGEN_HOSTS, new URL(siteOrigin(basis)).host]);
    if (!hosts.has(u.host)) return null;
    pad = u.pathname;
  }
  const m = SFEER_PAD.exec(pad);
  return m && PER_ID.has(m[2]) ? m[2] : null;
}

function schoon(functie: string): string {
  return functie.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Categorie van de standaardfoto bij een functienaam. De functiegroepen komen uit
 * lib/medewerker/push-doelgroep-regels (bediening, bar, keuken, afwas); daarbovenop eigen
 * categorieën voor barista (in de push-regels bar én bediening), catering/events en schoonmaak.
 * Onbekend of leeg: algemeen.
 */
export function sfeerCategorieVoorFunctie(functie: string | null | undefined): SfeerCategorie {
  if (typeof functie !== "string" || !functie.trim()) return "algemeen";
  const f = schoon(functie);
  if (/barista|koffie/.test(f)) return "barista";
  if (/schoonma|housekeeping|cleaning|cleaner|kamermeisje|interieurverzorg/.test(f)) return "schoonmaak";
  // Event staff valt in de push-regels onder bediening; voor de foto past catering & events beter.
  if (/catering|cateraar|event|evenement|festival|banquet|sitecrew|site crew|partycrew/.test(f)) return "catering";

  // Eerst de hele naam, dan de delen van een samengestelde naam ("bediening, bar", "host / runner").
  for (const deel of [f, ...f.split(/\s*[,/&+]\s*|\s+-\s+/)]) {
    const groep = functieGroepen(deel)[0];
    if (groep) return groep;
  }
  // Losse woorden die nog niet in de functiegroepen staan, bv. "keukenmedewerker".
  if (/afwas|spoel/.test(f)) return "afwas";
  if (/keuken|kok\b|chef|cuisin/.test(f)) return "keuken";
  if (/\bbar(?!ista)|cocktail|tap\b/.test(f)) return "bar";
  if (/bediening|ober|serveer|runner|gastheer|gastvrouw|host/.test(f)) return "bediening";
  return "algemeen";
}

/** FNV-1a (32 bit): klein, snel en overal hetzelfde (server, browser, app). */
function hash(tekst: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Standaardfoto bij een functie. `sleutel` (de dienst-id) kiest binnen de categorie, zodat niet
 * alle bedieningsdiensten dezelfde foto hebben; dezelfde sleutel geeft altijd dezelfde foto.
 */
export function standaardFotoVoor(functie: string | null | undefined, sleutel: string | null | undefined, basis?: string): Sfeerfoto {
  const categorie = sfeerCategorieVoorFunctie(functie);
  const lijst = CATALOGUS.filter((r) => r.categorie === categorie);
  const index = sleutel ? hash(sleutel) % lijst.length : 0;
  return naarSfeerfoto(lijst[index], basis);
}

/**
 * Foto uit een opgeslagen URL (diensten.afbeelding_url of klanten.foto_url): een catalogusfoto
 * krijgt zijn kleine versie, een upload is groot = klein. Alleen http(s); anders null.
 */
export function fotoUitUrl(url: string | null | undefined, bron: Exclude<FotoBron, "standaard">, basis?: string): DienstFoto | null {
  if (typeof url !== "string" || !url.trim()) return null;
  const id = sfeerfotoIdUitUrl(url, basis);
  if (id) {
    const f = sfeerfotoOpId(id, basis)!;
    return { groot: f.groot, klein: f.klein, bron };
  }
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return { groot: u.href, klein: u.href, bron };
  } catch {
    return null;
  }
}

export type DienstFotoInvoer = {
  id: string;
  functie?: string | null;
  afbeelding_url?: string | null;
};

/** De foto van een dienst (voorrang: dienst → bedrijf → standaard per functie). */
export function fotoVoorDienst(dienst: DienstFotoInvoer, bedrijfsfotoUrl?: string | null, basis?: string): DienstFoto {
  const eigen = fotoUitUrl(dienst.afbeelding_url, "dienst", basis);
  if (eigen) return eigen;
  const bedrijf = fotoUitUrl(bedrijfsfotoUrl, "bedrijf", basis);
  if (bedrijf) return bedrijf;
  const s = standaardFotoVoor(dienst.functie, dienst.id, basis);
  return { groot: s.groot, klein: s.klein, bron: "standaard" };
}

/**
 * Is `url` een eigen upload van deze klant in de bucket dienst-afbeeldingen (map `diensten` voor
 * een dienstfoto, `bedrijven` voor de bedrijfsfoto)? Host moet die van Supabase zijn; voorheen
 * telde elke URL waarin het pad voorkwam, ook op een andere host.
 */
export function isEigenUpload(
  url: unknown,
  opties: { klantId: string; map: "diensten" | "bedrijven"; supabaseUrl: string | null | undefined },
): boolean {
  return opslagPadVanUpload(url, opties) !== null;
}

/** Pad in de bucket (bv. "bedrijven/<klantId>/<hash>.jpg") van een eigen upload, of null. */
export function opslagPadVanUpload(
  url: unknown,
  opties: { klantId: string; map: "diensten" | "bedrijven"; supabaseUrl: string | null | undefined },
): string | null {
  if (typeof url !== "string" || !opties.klantId || !opties.supabaseUrl) return null;
  let u: URL;
  let supabase: URL;
  try {
    u = new URL(url.trim());
    supabase = new URL(opties.supabaseUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.host !== supabase.host) return null;
  const prefix = `/storage/v1/object/public/dienst-afbeeldingen/`;
  if (!u.pathname.startsWith(prefix)) return null;
  let pad: string;
  try {
    pad = decodeURIComponent(u.pathname.slice(prefix.length));
  } catch {
    return null;
  }
  const map = `${opties.map}/${opties.klantId}/`;
  if (!pad.startsWith(map) || pad.includes("..") || !/^[a-z0-9]+\.(jpg|png|webp)$/i.test(pad.slice(map.length))) return null;
  return pad;
}

/**
 * Foto die de werkgever bij een aanvraag meestuurt (POST /api/klant/aanvraag):
 * - `sfeerfoto_id`: een standaardfoto uit de catalogus;
 * - `afbeelding_url`: een catalogus-URL (groot of klein) of een eigen upload van déze klant
 *   (map diensten/<klantId>/ in de bucket, via /api/klant/dienst-afbeelding).
 * Niets meegestuurd: null, de dienst volgt dan de bedrijfsfoto of de standaardfoto per functie.
 * Ongeldig: ook null, met een waarschuwing voor het antwoord (de dienst gaat wel door).
 * Opgeslagen wordt de absolute URL van de grote versie, zodat ook oudere clients die
 * `afbeelding_url` direct tonen een werkende foto hebben.
 */
export function kiesDienstAfbeelding(
  invoer: { sfeerfoto_id?: unknown; afbeelding_url?: unknown },
  opties: { klantId: string; supabaseUrl: string | null | undefined; basis?: string },
): { url: string | null; waarschuwing: string | null } {
  const ongeldig = "De gekozen foto kon niet worden gebruikt. De dienst krijgt uw bedrijfsfoto of een standaardfoto die bij de functie past.";
  if (invoer.sfeerfoto_id != null && invoer.sfeerfoto_id !== "") {
    const foto = sfeerfotoOpId(invoer.sfeerfoto_id, opties.basis);
    return foto ? { url: foto.groot, waarschuwing: null } : { url: null, waarschuwing: ongeldig };
  }
  const url = typeof invoer.afbeelding_url === "string" ? invoer.afbeelding_url.trim() : "";
  if (!url) return { url: null, waarschuwing: null };
  const id = sfeerfotoIdUitUrl(url, opties.basis);
  if (id) return { url: sfeerfotoOpId(id, opties.basis)!.groot, waarschuwing: null };
  if (isEigenUpload(url, { klantId: opties.klantId, map: "diensten", supabaseUrl: opties.supabaseUrl })) {
    return { url, waarschuwing: null };
  }
  return { url: null, waarschuwing: ongeldig };
}

const OPSLAG_HOST = "nntxpyoyrpquzghsnwxj.supabase.co";

/**
 * Bron voor next/image in het portaal: een catalogusfoto als relatief pad (werkt ook lokaal en op
 * een preview, en valt onder CSP img-src 'self'); een upload van onze Supabase-opslag via de
 * optimizer (remotePatterns); al het andere ongeoptimaliseerd (anders gooit next/image een fout).
 */
export function webFotoSrc(url: string, maat: FotoMaat = "klein"): { src: string; unoptimized: boolean } {
  const id = sfeerfotoIdUitUrl(url);
  if (id) return { src: sfeerPad(id, maat), unoptimized: false };
  try {
    const u = new URL(url);
    // Zelfde host en pad als images.remotePatterns in next.config.ts.
    const opslag = u.protocol === "https:" && u.host === OPSLAG_HOST && u.pathname.startsWith("/storage/v1/object/");
    return { src: url, unoptimized: !opslag };
  } catch {
    return { src: url, unoptimized: true };
  }
}
