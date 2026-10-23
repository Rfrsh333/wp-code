import { dienstUren, nlMoment } from "@/lib/nl-tijd";
import {
  euro,
  MARGE_PER_UUR,
  richtlijnBereikTekst,
  richtlijnVoorFunctie,
  WETTELIJK_MINIMUMUURLOON,
} from "@/lib/pricing/richtlijntarieven";

/**
 * Pure regels voor "uitgebreid reageren" op een dienst (besluiten Rachid 23-10-2026). Geen
 * database, geen Next: ook in de browser te gebruiken en getest in tests/unit/reactie-regels.spec.ts.
 * De DB-kant staat in lib/medewerker/aanmelden.ts (meldAan) en lib/medewerker/reactie-voorwaarden.ts.
 *
 * Bij reageren kan de medewerker (allemaal optioneel):
 * - een eigen uurtarief voorstellen (tegenbod): wat HIJ per uur krijgt. De werkgever betaalt voor
 *   hem dat bedrag + € 4 marge. Zonder voorstel geldt het tarief van de dienst;
 * - eigen begin- en eindtijd voorstellen, binnen de dienst;
 * - een motivatie meegeven (max. 500 tekens);
 * - "automatisch intrekken" kiezen: 12, 24 of 48 uur voor de dienststart vervalt de reactie als
 *   hij nog niet gekozen is.
 * Heeft de dienst een kledingvoorschrift, dan is akkoord daarop verplicht.
 *
 * Na acceptatie gelden tarief en tijden per aanmelding: voor verdiensten, kosten, facturen,
 * vooringevulde uren en alle overzichten (zie de functies `...VoorAanmelding` hieronder).
 */

export const MOTIVATIE_MAX = 500;
export const KLEDINGVOORSCHRIFT_MAX = 500;
export const PAUZE_MAX_MINUTEN = 240;
export const AUTO_INTREKKEN_OPTIES = [12, 24, 48] as const;
export type AutoIntrekkenUren = (typeof AUTO_INTREKKEN_OPTIES)[number];

/** Grens tegen tikfouten, gelijk aan de aanvraag (uurtariefFout): geen echte min/max (besluit Rachid). */
export const TEGENBOD_TIKFOUT_GRENS = 1000;

/** `dienst_aanmeldingen.annuleer_reden` als de cron een verlopen reactie intrekt. */
export const ANNULEER_REDEN_AUTOMATISCH = "automatisch_ingetrokken";

/** Foutcodes in het antwoord van de aanmeldroutes (API-contract voor de app). */
export const REACTIE_FOUTCODES = {
  ongeldigUurtarief: "ongeldig_uurtarief",
  ongeldigeTijden: "ongeldige_tijden",
  motivatieTeLang: "motivatie_te_lang",
  ongeldigIntrekmoment: "ongeldig_intrekmoment",
  intrekmomentVoorbij: "intrekmoment_voorbij",
  kledingAkkoordVereist: "kledingvoorschrift_akkoord_vereist",
  nietBeschikbaar: "uitgebreid_reageren_niet_beschikbaar",
  reactieIngetrokken: "reactie_ingetrokken",
  reactieGewijzigd: "reactie_gewijzigd",
} as const;
export type ReactieFoutcode = (typeof REACTIE_FOUTCODES)[keyof typeof REACTIE_FOUTCODES];

/** Op centen, ook voor invoer als 19,955 (19.955 * 100 = 1995.4999… in floats). */
const rond = (n: number) => {
  const r = Math.round(Number(`${n}e2`)) / 100;
  return Number.isFinite(r) ? r : Math.round(n * 100) / 100;
};
const TIJD = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

/** "14:00:00" → "14:00"; ongeldig → null. */
export function korteTijd(t: unknown): string | null {
  return typeof t === "string" && TIJD.test(t.trim()) ? t.trim().slice(0, 5) : null;
}

const naarMinuten = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Minuten na de dienststart (0–1439), rekening houdend met diensten over middernacht. */
function naStart(tijd: string, dienstStart: string): number {
  return (((naarMinuten(tijd) - naarMinuten(dienstStart)) % 1440) + 1440) % 1440;
}

/** Duur van de dienst in minuten; eind ≤ start = over middernacht (eind = start → 24 uur). */
function dienstDuurMinuten(start: string, eind: string): number {
  return naStart(eind, start) || 1440;
}

// --- Tarief per aanmelding ----------------------------------------------------------------

/** Wat de medewerker bij het tarief van de dienst krijgt (klanttarief − € 4, nooit negatief). */
export function medewerkerTariefVanDienst(dienstUurtarief: number | null | undefined): number {
  return Math.max(0, rond((dienstUurtarief || 0) - MARGE_PER_UUR));
}

function geldigTegenbod(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * Wat de werkgever per uur betaalt voor déze aanmelding: tegenbod + € 4, anders het tarief van de
 * dienst. Alle geldberekeningen aan de klantkant (kosten, facturen, uren goedkeuren) gebruiken dit.
 */
export function klantUurtariefVoorAanmelding(
  dienstUurtarief: number | null | undefined,
  voorgesteldUurtarief: number | null | undefined,
): number {
  if (geldigTegenbod(voorgesteldUurtarief)) return rond(voorgesteldUurtarief + MARGE_PER_UUR);
  return dienstUurtarief || 0;
}

/** Wat de medewerker per uur krijgt voor déze aanmelding: zijn tegenbod, anders dienst − € 4. */
export function medewerkerUurtariefVoorAanmelding(
  dienstUurtarief: number | null | undefined,
  voorgesteldUurtarief: number | null | undefined,
): number {
  if (geldigTegenbod(voorgesteldUurtarief)) return rond(voorgesteldUurtarief);
  return medewerkerTariefVanDienst(dienstUurtarief);
}

// --- Tijden per aanmelding ----------------------------------------------------------------

export type VoorgesteldeTijden = {
  voorgestelde_start_tijd?: string | null;
  voorgestelde_eind_tijd?: string | null;
};

/** De tijden die voor deze aanmelding gelden: eigen tijden (beide gevuld) of die van de dienst. */
export function geldendeTijden(
  dienst: { start_tijd: string | null | undefined; eind_tijd: string | null | undefined },
  voorstel?: VoorgesteldeTijden | null,
): { start_tijd: string; eind_tijd: string; eigen_tijden: boolean } {
  const start = korteTijd(voorstel?.voorgestelde_start_tijd);
  const eind = korteTijd(voorstel?.voorgestelde_eind_tijd);
  if (start && eind) return { start_tijd: start, eind_tijd: eind, eigen_tijden: true };
  return {
    start_tijd: korteTijd(dienst.start_tijd) ?? (dienst.start_tijd || ""),
    eind_tijd: korteTijd(dienst.eind_tijd) ?? (dienst.eind_tijd || ""),
    eigen_tijden: false,
  };
}

/**
 * Liggen de voorgestelde tijden binnen de dienst? Begin vóór eind, en beide binnen
 * [dienststart, dienst-eind], ook bij diensten over middernacht (22:00–06:00 → 23:00–04:00 mag).
 */
export function binnenDienst(dienstStart: string, dienstEind: string, start: string, eind: string): boolean {
  const duur = dienstDuurMinuten(dienstStart, dienstEind);
  const van = naStart(start, dienstStart);
  const tot = naStart(eind, dienstStart) || 1440;
  return van < tot && tot <= duur;
}

/**
 * Mogen deze eigen tijden worden voorgesteld? Binnen de dienst, én de begintijd op dezelfde
 * kalenderdag als de dienststart. Bij een nachtdienst (22:00–06:00) kan 23:00–04:00 wel, 00:30–04:00
 * niet: die uren vallen op de volgende dag, terwijl datum, check-in (op de dienstdatum) en toeslag
 * met de dienstdatum rekenen. Een eindtijd na middernacht is gewoon een nachtdienst, net als bij de dienst.
 */
export function eigenTijdenToegestaan(dienstStart: string, dienstEind: string, start: string, eind: string): boolean {
  return binnenDienst(dienstStart, dienstEind, start, eind) && naarMinuten(start) >= naarMinuten(dienstStart);
}

/** Uren en ± verdiensten voor een tijdvak (pauze eraf), zonder toeslag: een schatting. */
export function geschatteVerdiensten(input: {
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten?: number | null;
  uurtarief: number;
}): { uren: number; bedrag: number } {
  const uren = dienstUren(input.start_tijd, input.eind_tijd, Math.max(0, input.pauze_minuten || 0));
  if (!Number.isFinite(uren)) return { uren: 0, bedrag: 0 };
  return { uren: rond(uren), bedrag: rond(uren * Math.max(0, input.uurtarief || 0)) };
}

/**
 * Vooringevulde uren voor het invullen van uren: de geldende tijden van de aanmelding en de pauze
 * van de dienst (de medewerker kan alles nog aanpassen).
 */
export function vooringevuldeUren(
  dienst: { start_tijd: string | null | undefined; eind_tijd: string | null | undefined; pauze_minuten?: number | null },
  voorstel?: VoorgesteldeTijden | null,
): { start: string; eind: string; pauze: number } {
  const t = geldendeTijden(dienst, voorstel);
  return { start: t.start_tijd, eind: t.eind_tijd, pauze: Math.max(0, dienst.pauze_minuten || 0) };
}

// --- Automatisch intrekken ----------------------------------------------------------------

/** Moment waarop een reactie vervalt: dienststart (NL-tijd) min het gekozen aantal uur. */
export function intrekMoment(datum: string, startTijd: string, uren: number): Date {
  return new Date(nlMoment(datum, startTijd).getTime() - uren * 60 * 60 * 1000);
}

type IntrekRij = { status?: string | null; auto_intrekken_uren?: number | null };
type IntrekDienst = { datum?: string | null; start_tijd?: string | null } | null | undefined;

/**
 * Lazy check: is deze open reactie voorbij haar intrekmoment? Dan is ze voor de werkgever niet
 * meer te accepteren en telt ze niet als open reactie, ook als de cron nog niet heeft gedraaid.
 */
export function isAutomatischIngetrokken(rij: IntrekRij, dienst: IntrekDienst, nu: Date = new Date()): boolean {
  if (rij.status !== "aangemeld") return false;
  const uren = Number(rij.auto_intrekken_uren);
  if (!(AUTO_INTREKKEN_OPTIES as readonly number[]).includes(uren)) return false;
  if (!dienst?.datum || !korteTijd(dienst.start_tijd)) return false;
  return intrekMoment(dienst.datum, dienst.start_tijd as string, uren).getTime() <= nu.getTime();
}

/** Status zoals die voor iedereen geldt: een verlopen reactie telt als `geannuleerd`. */
export function effectieveAanmeldStatus(rij: IntrekRij & { status: string }, dienst: IntrekDienst, nu: Date = new Date()): string {
  return isAutomatischIngetrokken(rij, dienst, nu) ? "geannuleerd" : rij.status;
}

// --- Kledingvoorschrift en pauze op de dienst ---------------------------------------------

/** Kledingvoorschrift voor mails: het nieuwe veld, met de oude `notities` als fallback. */
export function kledingVoorMail(dienst: { kledingvoorschrift?: string | null; notities?: string | null }): string | null {
  return dienst.kledingvoorschrift?.trim() || dienst.notities?.trim() || null;
}

export type VeldResultaat<T> = { ok: true; waarde: T } | { ok: false; error: string };

/** Kledingvoorschrift uit een aanvraag: leeg → null, max. 500 tekens. */
export function parseKledingvoorschrift(waarde: unknown): VeldResultaat<string | null> {
  if (waarde == null || waarde === "") return { ok: true, waarde: null };
  if (typeof waarde !== "string") return { ok: false, error: "Kledingvoorschrift moet tekst zijn" };
  const tekst = waarde.trim();
  if (!tekst) return { ok: true, waarde: null };
  if (tekst.length > KLEDINGVOORSCHRIFT_MAX) {
    return { ok: false, error: `Kledingvoorschrift mag maximaal ${KLEDINGVOORSCHRIFT_MAX} tekens zijn` };
  }
  return { ok: true, waarde: tekst };
}

/** Pauze in minuten uit een aanvraag: leeg → null, geheel getal 0–240 en korter dan de dienst. */
export function parsePauzeMinuten(waarde: unknown, dienst?: { start_tijd: string; eind_tijd: string }): VeldResultaat<number | null> {
  if (waarde == null || waarde === "") return { ok: true, waarde: null };
  const n = typeof waarde === "number" ? waarde : typeof waarde === "string" ? Number(waarde.trim()) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > PAUZE_MAX_MINUTEN) {
    return { ok: false, error: `Pauze moet een aantal minuten tussen 0 en ${PAUZE_MAX_MINUTEN} zijn` };
  }
  if (dienst && n > 0) {
    const duur = dienstUren(dienst.start_tijd, dienst.eind_tijd) * 60;
    if (Number.isFinite(duur) && n >= duur) return { ok: false, error: "De pauze is langer dan de dienst" };
  }
  return { ok: true, waarde: n };
}

// --- Reactie valideren ----------------------------------------------------------------------

/** Wat een client bij reageren mag meesturen (naast dienst_id); alles optioneel. */
export type ReactieInvoer = {
  voorgesteld_uurtarief?: unknown;
  voorgestelde_start_tijd?: unknown;
  voorgestelde_eind_tijd?: unknown;
  motivatie?: unknown;
  kleding_akkoord?: unknown;
  auto_intrekken_uren?: unknown;
};

/**
 * De reactievelden uit een request-body. Ze staan naast `dienst_id` op het hoogste niveau; bij de
 * actie-route (`{ action: "aanmelden" }`) mogen ze ook in `data` staan (zoals bij de andere acties).
 */
export function reactieUitBody(body: unknown): ReactieInvoer {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const data = (b.data && typeof b.data === "object" ? b.data : {}) as Record<string, unknown>;
  const veld = (k: keyof ReactieInvoer) => (b[k] !== undefined ? b[k] : data[k]);
  return {
    voorgesteld_uurtarief: veld("voorgesteld_uurtarief"),
    voorgestelde_start_tijd: veld("voorgestelde_start_tijd"),
    voorgestelde_eind_tijd: veld("voorgestelde_eind_tijd"),
    motivatie: veld("motivatie"),
    kleding_akkoord: veld("kleding_akkoord"),
    auto_intrekken_uren: veld("auto_intrekken_uren"),
  };
}

/** Wat er bij een reactie in dienst_aanmeldingen komt. */
export type ReactieVoorwaarden = {
  voorgesteld_uurtarief: number | null;
  voorgestelde_start_tijd: string | null;
  voorgestelde_eind_tijd: string | null;
  motivatie: string | null;
  kleding_akkoord_op: string | null;
  auto_intrekken_uren: AutoIntrekkenUren | null;
};

export const LEGE_VOORWAARDEN: ReactieVoorwaarden = {
  voorgesteld_uurtarief: null,
  voorgestelde_start_tijd: null,
  voorgestelde_eind_tijd: null,
  motivatie: null,
  kleding_akkoord_op: null,
  auto_intrekken_uren: null,
};

/** Heeft de reactie iets anders dan "alleen dienst_id"? (Dan zijn de nieuwe kolommen nodig.) */
export function heeftVoorwaarden(v: ReactieVoorwaarden): boolean {
  return Object.values(v).some((w) => w !== null);
}

export type ReactieDienst = {
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  uurtarief: number | null;
  kledingvoorschrift?: string | null;
};

export type ReactieFout = { ok: false; status: number; code: ReactieFoutcode; error: string; kledingvoorschrift?: string };

/** Bedrag uit een getal of tekst ("17,50"), net als parseUurtarief in het klantportaal. */
function parseBedrag(waarde: unknown): number {
  if (typeof waarde === "number") return waarde;
  if (typeof waarde !== "string" || !waarde.trim()) return NaN;
  return Number(waarde.trim().replace(",", "."));
}

/**
 * Controleert de optionele velden van een reactie tegen de dienst en geeft terug wat er wordt
 * opgeslagen. Een oude app stuurt alleen dienst_id: dan zijn alle voorwaarden null, behalve bij een
 * dienst met kledingvoorschrift (dan verplicht akkoord → 422 met code, zie de PR voor de afweging).
 */
export function valideerReactie(
  invoer: ReactieInvoer,
  dienst: ReactieDienst,
  nu: Date = new Date(),
): { ok: true; voorwaarden: ReactieVoorwaarden } | ReactieFout {
  const fout = (status: number, code: ReactieFoutcode, error: string): ReactieFout => ({ ok: false, status, code, error });

  // 1. Tegenbod (wat de medewerker per uur krijgt). Gelijk aan het dienst-tarief = geen tegenbod.
  let tarief: number | null = null;
  if (invoer.voorgesteld_uurtarief != null && invoer.voorgesteld_uurtarief !== "") {
    const n = parseBedrag(invoer.voorgesteld_uurtarief);
    // Eerst op centen afronden: 0,004 wordt 0 en is dus geen geldig bedrag (de DB eist > 0).
    const bedrag = Number.isFinite(n) ? rond(n) : NaN;
    if (!Number.isFinite(bedrag) || bedrag <= 0) return fout(400, REACTIE_FOUTCODES.ongeldigUurtarief, "Vul een geldig uurtarief in");
    if (bedrag > TEGENBOD_TIKFOUT_GRENS) return fout(400, REACTIE_FOUTCODES.ongeldigUurtarief, "Dit uurtarief is onrealistisch hoog");
    tarief = Math.abs(bedrag - medewerkerTariefVanDienst(dienst.uurtarief)) < 0.005 ? null : bedrag;
  }

  // 2. Eigen tijden: beide of geen, binnen de dienst. Precies de hele dienst = geen eigen tijden.
  let start: string | null = null;
  let eind: string | null = null;
  const startGegeven = invoer.voorgestelde_start_tijd != null && invoer.voorgestelde_start_tijd !== "";
  const eindGegeven = invoer.voorgestelde_eind_tijd != null && invoer.voorgestelde_eind_tijd !== "";
  if (startGegeven || eindGegeven) {
    start = korteTijd(invoer.voorgestelde_start_tijd);
    eind = korteTijd(invoer.voorgestelde_eind_tijd);
    if (!start || !eind) return fout(400, REACTIE_FOUTCODES.ongeldigeTijden, "Geef een begin- én eindtijd op (uu:mm)");
    const dStart = korteTijd(dienst.start_tijd);
    const dEind = korteTijd(dienst.eind_tijd);
    if (!dStart || !dEind || !binnenDienst(dStart, dEind, start, eind)) {
      return fout(
        400,
        REACTIE_FOUTCODES.ongeldigeTijden,
        `Je tijden moeten binnen de dienst vallen (${dStart ?? "?"}–${dEind ?? "?"}) en de begintijd moet vóór de eindtijd liggen`,
      );
    }
    if (!eigenTijdenToegestaan(dStart, dEind, start, eind)) {
      return fout(
        400,
        REACTIE_FOUTCODES.ongeldigeTijden,
        `Een eigen begintijd na middernacht kan niet; kies een begintijd vanaf ${dStart} of reageer op de hele dienst`,
      );
    }
    if (start === dStart && eind === dEind) {
      start = null;
      eind = null;
    }
  }

  // 3. Motivatie
  let motivatie: string | null = null;
  if (invoer.motivatie != null && invoer.motivatie !== "") {
    if (typeof invoer.motivatie !== "string") return fout(400, REACTIE_FOUTCODES.motivatieTeLang, "Motivatie moet tekst zijn");
    const tekst = invoer.motivatie.trim();
    if (tekst.length > MOTIVATIE_MAX) {
      return fout(400, REACTIE_FOUTCODES.motivatieTeLang, `Je motivatie mag maximaal ${MOTIVATIE_MAX} tekens zijn`);
    }
    motivatie = tekst || null;
  }

  // 4. Automatisch intrekken (12/24/48 uur vóór de start); uit = null/0/false.
  let intrekken: AutoIntrekkenUren | null = null;
  const ruw = invoer.auto_intrekken_uren;
  if (ruw != null && ruw !== "" && ruw !== false && ruw !== 0 && ruw !== "0") {
    const n = typeof ruw === "number" ? ruw : typeof ruw === "string" ? Number(ruw) : NaN;
    if (!(AUTO_INTREKKEN_OPTIES as readonly number[]).includes(n)) {
      return fout(400, REACTIE_FOUTCODES.ongeldigIntrekmoment, "Kies 12, 24 of 48 uur voor automatisch intrekken");
    }
    const dStart = korteTijd(dienst.start_tijd);
    if (!dStart || intrekMoment(dienst.datum, dStart, n).getTime() <= nu.getTime()) {
      return fout(
        400,
        REACTIE_FOUTCODES.intrekmomentVoorbij,
        `De dienst begint binnen ${n} uur. Kies een korter moment of zet automatisch intrekken uit.`,
      );
    }
    intrekken = n as AutoIntrekkenUren;
  }

  // 5. Kledingvoorschrift: akkoord verplicht als de dienst er een heeft (tijdstip opslaan).
  const voorschrift = dienst.kledingvoorschrift?.trim() || null;
  let kledingAkkoordOp: string | null = null;
  if (voorschrift) {
    if (invoer.kleding_akkoord !== true) {
      return {
        ok: false,
        status: 422,
        code: REACTIE_FOUTCODES.kledingAkkoordVereist,
        error: `Deze dienst heeft een kledingvoorschrift: "${voorschrift}". Ga akkoord met het kledingvoorschrift om te reageren. Zie je die optie niet, werk dan de app bij.`,
        kledingvoorschrift: voorschrift,
      };
    }
    kledingAkkoordOp = nu.toISOString();
  }

  return {
    ok: true,
    voorwaarden: {
      voorgesteld_uurtarief: tarief,
      voorgestelde_start_tijd: start,
      voorgestelde_eind_tijd: eind,
      motivatie,
      kleding_akkoord_op: kledingAkkoordOp,
      auto_intrekken_uren: intrekken,
    },
  };
}

// --- Zachte waarschuwing bij het tegenbod ------------------------------------------------

export type TegenbodAdvies = {
  /** Wat de werkgever per uur betaalt bij dit tegenbod (tegenbod + € 4). */
  klantUurtarief: number;
  onderMinimumloon: boolean;
  hogerDanDienst: boolean;
  bovenRichtlijn: boolean;
  /** Zachte waarschuwing (nooit een blokkade), of null. */
  waarschuwing: string | null;
};

/**
 * Zachte waarschuwing bij een tegenbod, zoals bij de aanvraag van de werkgever: onder het wettelijk
 * minimumloon, of hoger dan de dienst / boven de richtlijn voor de functie. Geen harde min of max.
 */
export function tegenbodAdvies(
  tegenbod: number,
  opties: { functie?: string | null; dienstUurtarief?: number | null } = {},
): TegenbodAdvies {
  const geldig = Number.isFinite(tegenbod) && tegenbod > 0;
  const klantUurtarief = geldig ? rond(tegenbod + MARGE_PER_UUR) : 0;
  const dienstTarief = medewerkerTariefVanDienst(opties.dienstUurtarief);
  const onderMinimumloon = geldig && tegenbod < WETTELIJK_MINIMUMUURLOON;
  const hogerDanDienst = geldig && opties.dienstUurtarief != null && tegenbod > dienstTarief + 0.004;
  const richtlijn = richtlijnVoorFunctie(opties.functie);
  const bovenRichtlijn = geldig && !!richtlijn && klantUurtarief > richtlijn.max;

  const delen: string[] = [];
  if (onderMinimumloon) {
    delen.push(
      `Let op: ${euro(tegenbod)} per uur is minder dan het wettelijk minimumloon van ${euro(WETTELIJK_MINIMUMUURLOON)} bruto per uur (21 jaar en ouder). Je mag het voorstellen, maar kijk of het voor jou klopt.`,
    );
  }
  if (hogerDanDienst) {
    delen.push(
      `Je vraagt ${euro(rond(tegenbod - dienstTarief))} per uur meer dan het tarief van deze dienst. De werkgever ziet wat hij dan per uur betaalt en kiest zelf; een hoger tarief kan je kans kleiner maken.`,
    );
  }
  if (bovenRichtlijn && richtlijn) {
    delen.push(`Dit ligt boven de gebruikelijke tarieven voor ${richtlijn.label.toLowerCase()} (${richtlijnBereikTekst(richtlijn)} per uur voor de werkgever).`);
  }
  return { klantUurtarief, onderMinimumloon, hogerDanDienst, bovenRichtlijn, waarschuwing: delen.length ? delen.join(" ") : null };
}

// --- Reactie zoals de werkgever hem ziet --------------------------------------------------

export type ReactieWeergaveBron = {
  status: string;
  voorgesteld_uurtarief?: number | null;
  voorgestelde_start_tijd?: string | null;
  voorgestelde_eind_tijd?: string | null;
  motivatie?: string | null;
  kleding_akkoord_op?: string | null;
  auto_intrekken_uren?: number | null;
  annuleer_reden?: string | null;
};

export type ReactieWeergaveDienst = {
  datum: string | null;
  start_tijd: string | null;
  eind_tijd: string | null;
  uurtarief: number | null;
  pauze_minuten?: number | null;
};

/**
 * De velden per reactie die de werkgever (en admin) ziet om te kiezen: wat hij per uur betaalt,
 * de tijden, de geschatte kosten, motivatie, akkoord kleding en of de reactie al is ingetrokken.
 * Het tegenbod zelf (wat de medewerker krijgt) staat er bewust niet in; dat krijgt alleen de admin.
 */
export function reactieVoorWerkgever(bron: ReactieWeergaveBron, dienst: ReactieWeergaveDienst, nu: Date = new Date()) {
  const tijden = geldendeTijden(dienst, bron);
  const klantUurtarief = klantUurtariefVoorAanmelding(dienst.uurtarief, bron.voorgesteld_uurtarief);
  const schatting = geschatteVerdiensten({
    start_tijd: tijden.start_tijd,
    eind_tijd: tijden.eind_tijd,
    pauze_minuten: dienst.pauze_minuten,
    uurtarief: klantUurtarief,
  });
  const uren = Number(bron.auto_intrekken_uren);
  const heeftIntrekken = (AUTO_INTREKKEN_OPTIES as readonly number[]).includes(uren);
  const dStart = korteTijd(dienst.start_tijd);
  const ingetrokken =
    isAutomatischIngetrokken(bron, dienst, nu) ||
    (bron.status === "geannuleerd" && bron.annuleer_reden === ANNULEER_REDEN_AUTOMATISCH);
  return {
    motivatie: bron.motivatie?.trim() || null,
    start_tijd: tijden.start_tijd,
    eind_tijd: tijden.eind_tijd,
    eigen_tijden: tijden.eigen_tijden,
    klant_uurtarief: klantUurtarief,
    dienst_uurtarief: dienst.uurtarief || 0,
    eigen_tarief: geldigTegenbod(bron.voorgesteld_uurtarief),
    geschatte_uren: schatting.uren,
    geschatte_kosten: schatting.bedrag,
    kleding_akkoord_op: bron.kleding_akkoord_op ?? null,
    auto_intrekken_uren: heeftIntrekken ? (uren as AutoIntrekkenUren) : null,
    // Alleen zolang de reactie nog open is; na kiezen of afwijzen vervalt er niets meer.
    intrekken_op:
      heeftIntrekken && bron.status === "aangemeld" && !ingetrokken && dienst.datum && dStart
        ? intrekMoment(dienst.datum, dStart, uren).toISOString()
        : null,
    automatisch_ingetrokken: ingetrokken,
  };
}

export type ReactieVoorWerkgever = ReturnType<typeof reactieVoorWerkgever>;

/**
 * Accepteren met wat de werkgever zag: stuurt de client `klant_uurtarief`, `start_tijd` of
 * `eind_tijd` mee, dan moeten die nog gelden (de medewerker kan intussen hebben ingetrokken en
 * opnieuw gereageerd met een ander voorstel). Niet meegestuurd (oude app) = geen controle.
 */
export function wijktAfVanGezien(
  huidig: Pick<ReactieVoorWerkgever, "klant_uurtarief" | "start_tijd" | "eind_tijd">,
  gezien: { klant_uurtarief?: unknown; start_tijd?: unknown; eind_tijd?: unknown } | null | undefined,
): boolean {
  if (!gezien) return false;
  if (gezien.klant_uurtarief != null && gezien.klant_uurtarief !== "") {
    const n = Number(gezien.klant_uurtarief);
    if (!Number.isFinite(n) || Math.abs(n - huidig.klant_uurtarief) > 0.004) return true;
  }
  if (gezien.start_tijd != null && korteTijd(gezien.start_tijd) !== huidig.start_tijd) return true;
  if (gezien.eind_tijd != null && korteTijd(gezien.eind_tijd) !== huidig.eind_tijd) return true;
  return false;
}
