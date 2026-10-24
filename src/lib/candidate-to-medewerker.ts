import { supabaseAdmin } from "@/lib/supabase";
import { normaliseerEmail } from "@/lib/email-normalisatie";
import { zoekOpEmail } from "@/lib/medewerker/zoek-op-email";
import { normaliseerKvkNummer } from "@/lib/medewerker/zzp-gegevens";
import { neemKandidaatDocumentenMee } from "@/lib/kandidaat-documenten-meenemen";

interface CandidateRecord {
  id: string;
  voornaam: string;
  tussenvoegsel?: string | null;
  achternaam: string;
  email: string;
  telefoon?: string | null;
  gewenste_functies?: string[] | null;
  interne_notitie?: string | null;
  kvk_nummer?: string | null;
}

const functieMapping: Record<string, string> = {
  "Bediening": "bediening",
  "Runner": "bediening",
  "Host(ess)": "bediening",
  "Event staff": "bediening",
  "Bartender": "bar",
  "Barista": "bar",
  "Keukenhulp": "keuken",
  "Zelfstandig werkend kok": "keuken",
};

function buildNaam(candidate: CandidateRecord) {
  return candidate.tussenvoegsel
    ? `${candidate.voornaam} ${candidate.tussenvoegsel} ${candidate.achternaam}`
    : `${candidate.voornaam} ${candidate.achternaam}`;
}

function mapFuncties(gewensteFuncties?: string[] | null) {
  const mapped = (gewensteFuncties || [])
    .map((functie) => functieMapping[functie] || "bediening");

  return Array.from(new Set(mapped.length > 0 ? mapped : ["bediening"]));
}

/** Resultaat van kandidaat → medewerker: bestond het account al, en is het al geactiveerd? */
export type MedewerkerUitKandidaat = {
  id: string;
  bestond: boolean;
  heeftWachtwoord: boolean;
  status: string;
};

export async function ensureMedewerkerFromCandidate(candidate: CandidateRecord): Promise<MedewerkerUitKandidaat> {
  // Hoofdletterongevoelig zoeken en klein opslaan: anders kan de medewerker nooit inloggen (B4).
  const email = normaliseerEmail(candidate.email);
  const existingByEmail = await zoekOpEmail<{ id: string; email: string; wachtwoord: string | null; status: string | null }>(
    "medewerkers",
    "id, email, wachtwoord, status",
    email,
  );

  if (existingByEmail?.id) {
    // Bestaand account (oud-medewerker of door de admin aangemaakt): niet als nieuw behandelen.
    // KvK-nummer aanvullen als dat nog leeg is (kolom bestaat pas na de checklist-migratie),
    // en goedgekeurde kandidaatdocumenten alsnog meenemen (idempotent).
    const kvkBestaand = normaliseerKvkNummer(candidate.kvk_nummer);
    if (kvkBestaand) {
      await supabaseAdmin
        .from("medewerkers")
        .update({ kvk_nummer: kvkBestaand })
        .eq("id", existingByEmail.id)
        .is("kvk_nummer", null);
    }
    await neemKandidaatDocumentenMee(candidate.id, existingByEmail.id);
    return {
      id: existingByEmail.id,
      bestond: true,
      heeftWachtwoord: !!existingByEmail.wachtwoord,
      status: existingByEmail.status ?? "",
    };
  }

  const payload = {
    naam: buildNaam(candidate),
    email,
    telefoon: candidate.telefoon || null,
    functie: mapFuncties(candidate.gewenste_functies),
    uurtarief: 15,
    status: "actief",
    notities: candidate.interne_notitie
      ? `Automatisch aangemaakt vanuit onboarding.\n\nKandidaatnotitie:\n${candidate.interne_notitie}`
      : "Automatisch aangemaakt vanuit onboarding.",
  };

  // KvK-nummer gaat mee (checklist vóór reageren, B1). Bestaat de kolom nog niet (migratie
  // 20261023_medewerker_checklist_reageren), dan zonder.
  const kvk = normaliseerKvkNummer(candidate.kvk_nummer);
  let { data, error } = await supabaseAdmin
    .from("medewerkers")
    .insert(kvk ? { ...payload, kvk_nummer: kvk } : payload)
    .select("id")
    .single();
  if (kvk && (error?.code === "42703" || error?.code === "PGRST204")) {
    ({ data, error } = await supabaseAdmin.from("medewerkers").insert(payload).select("id").single());
  }

  if (error || !data?.id) {
    throw new Error(error?.message || "Medewerker kon niet automatisch worden aangemaakt");
  }

  // Goedgekeurde kandidaatdocumenten (KvK, CV, …) mee naar het medewerkeraccount; nooit een ID-kopie.
  await neemKandidaatDocumentenMee(candidate.id, data.id);

  return { id: data.id, bestond: false, heeftWachtwoord: false, status: "actief" };
}
