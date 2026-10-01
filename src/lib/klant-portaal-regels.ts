import { dienstUren } from "@/lib/nl-tijd";

/**
 * Pure regels voor het klantportaal (geen database, geen Next): los testbaar in tests/unit.
 */

// --- Aanmeldingen: welke statuswijziging mag de klant doen? ----------------------------

/**
 * Overgangen die een klant via het portaal mag maken.
 * - Een nieuwe aanmelding (`aangemeld`) accepteren of afwijzen.
 * - Al het andere (uitnodigingen, geannuleerd, al beoordeeld) is aan medewerker of admin;
 *   voorheen kon de klant elke status zetten, ook geannuleerd → geaccepteerd.
 */
const KLANT_OVERGANGEN: Record<string, readonly string[]> = {
  aangemeld: ["geaccepteerd", "afgewezen"],
};

export type KlantAanmeldingActie = "geaccepteerd" | "afgewezen";

export function magKlantAanmeldingWijzigen(van: string | null | undefined, naar: string): naar is KlantAanmeldingActie {
  return (KLANT_OVERGANGEN[van ?? ""] ?? []).includes(naar);
}

// --- Uren aanpassen ------------------------------------------------------------------------

const TIJD = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export type UrenAanpassingResultaat =
  | { ok: true; startTijd: string; eindTijd: string; pauzeMinuten: number; uren: number }
  | { ok: false; error: string };

/**
 * Valideert een urenaanpassing van de klant en rekent de uren server-side uit
 * (de client-berekening werd blind vertrouwd en ging mis bij nachtdiensten).
 */
export function valideerUrenAanpassing(input: {
  startTijd?: unknown;
  eindTijd?: unknown;
  pauzeMinuten?: unknown;
}): UrenAanpassingResultaat {
  const startTijd = typeof input.startTijd === "string" ? input.startTijd.trim() : "";
  const eindTijd = typeof input.eindTijd === "string" ? input.eindTijd.trim() : "";
  if (!TIJD.test(startTijd) || !TIJD.test(eindTijd)) {
    return { ok: false, error: "Vul een geldige start- en eindtijd in (UU:MM)" };
  }
  if (startTijd.slice(0, 5) === eindTijd.slice(0, 5)) {
    return { ok: false, error: "Start- en eindtijd mogen niet gelijk zijn" };
  }

  const pauzeRaw = input.pauzeMinuten === "" || input.pauzeMinuten == null ? 0 : Number(input.pauzeMinuten);
  if (!Number.isFinite(pauzeRaw) || pauzeRaw < 0 || !Number.isInteger(pauzeRaw)) {
    return { ok: false, error: "Pauze moet een heel aantal minuten van 0 of meer zijn" };
  }

  const uren = dienstUren(startTijd.slice(0, 5), eindTijd.slice(0, 5), pauzeRaw);
  if (!Number.isFinite(uren) || uren <= 0) {
    return { ok: false, error: "De pauze is langer dan de dienst" };
  }
  if (uren > 24) {
    return { ok: false, error: "Een dienst kan niet langer dan 24 uur zijn" };
  }

  return {
    ok: true,
    startTijd: startTijd.slice(0, 5),
    eindTijd: eindTijd.slice(0, 5),
    pauzeMinuten: pauzeRaw,
    uren: Math.round(uren * 100) / 100,
  };
}

// --- Aanvraag: uurtarief ----------------------------------------------------------------

/** Parse een uurtarief uit formulierinvoer ("14,50" en "14.50"); NaN als het geen getal is. */
export function parseUurtarief(waarde: unknown): number {
  if (typeof waarde === "number") return waarde;
  if (typeof waarde !== "string" || !waarde.trim()) return NaN;
  return Number(waarde.trim().replace(",", "."));
}

export function uurtariefFout(tarief: number, minimum: number): string | null {
  if (!Number.isFinite(tarief) || tarief <= 0) return "Uurtarief moet een geldig bedrag zijn";
  if (tarief > 1000) return "Uurtarief is onrealistisch hoog";
  if (minimum > 0 && tarief < minimum) {
    return `Het minimale uurtarief is € ${minimum.toFixed(2).replace(".", ",")}`;
  }
  return null;
}

// --- Favorieten uitnodigen ----------------------------------------------------------------

/**
 * Kies bij een aanvraag met meerdere functies de dienst waarvoor een favoriet wordt uitgenodigd:
 * de eerste dienst waarvan de functie bij de medewerker past; bij één dienst altijd die.
 * Geen match bij meerdere diensten → null (dan niet uitnodigen i.p.v. gokken).
 */
export function kiesDienstVoorFavoriet(
  medewerkerFuncties: string | string[] | null | undefined,
  diensten: { id: string; functie: string | null }[],
): string | null {
  if (diensten.length === 0) return null;
  if (diensten.length === 1) return diensten[0].id;
  const lijst = (Array.isArray(medewerkerFuncties) ? medewerkerFuncties : [medewerkerFuncties ?? ""])
    .map((f) => String(f).trim().toLowerCase())
    .filter(Boolean);
  const match = diensten.find((d) => lijst.includes(String(d.functie ?? "").trim().toLowerCase()));
  return match?.id ?? null;
}

// --- Instellingen: bedrijfsgegevens --------------------------------------------------------

/** Velden die de klant zelf mag wijzigen (whitelist; nooit status, email, wachtwoord, klant-id). */
export const KLANT_PROFIEL_VELDEN = [
  "contactpersoon",
  "telefoon",
  "adres",
  "postcode",
  "stad",
  "kvk_nummer",
  "btw_nummer",
] as const;

export type KlantProfielVeld = (typeof KLANT_PROFIEL_VELDEN)[number];

export function schoonProfielUpdate(
  body: Record<string, unknown>,
): { ok: true; update: Partial<Record<KlantProfielVeld, string | null>> } | { ok: false; error: string } {
  const update: Partial<Record<KlantProfielVeld, string | null>> = {};
  for (const veld of KLANT_PROFIEL_VELDEN) {
    if (!(veld in body)) continue;
    const raw = body[veld];
    if (raw !== null && typeof raw !== "string") return { ok: false, error: `Ongeldige waarde voor ${veld}` };
    const waarde = typeof raw === "string" ? raw.trim() : "";
    if (waarde.length > 200) return { ok: false, error: `${veld} is te lang` };
    update[veld] = waarde || null;
  }
  if ("contactpersoon" in update && !update.contactpersoon) {
    return { ok: false, error: "Contactpersoon is verplicht" };
  }
  if (update.kvk_nummer && !/^\d{8}$/.test(update.kvk_nummer.replace(/\s/g, ""))) {
    return { ok: false, error: "KvK-nummer moet 8 cijfers zijn" };
  }
  if (update.kvk_nummer) update.kvk_nummer = update.kvk_nummer.replace(/\s/g, "");
  if (update.postcode && !/^\d{4}\s?[A-Za-z]{2}$/.test(update.postcode)) {
    return { ok: false, error: "Ongeldige postcode (bijv. 1234 AB)" };
  }
  if (update.postcode) update.postcode = update.postcode.toUpperCase().replace(/^(\d{4})\s?/, "$1 ");
  if (Object.keys(update).length === 0) return { ok: false, error: "Geen wijzigingen" };
  return { ok: true, update };
}
