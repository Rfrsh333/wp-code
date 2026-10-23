import { supabaseAdmin } from "@/lib/supabase";
import { normaliseerEmail } from "@/lib/email-normalisatie";
import { zoekOpEmail } from "@/lib/medewerker/zoek-op-email";

interface CandidateRecord {
  id: string;
  voornaam: string;
  tussenvoegsel?: string | null;
  achternaam: string;
  email: string;
  telefoon?: string | null;
  gewenste_functies?: string[] | null;
  interne_notitie?: string | null;
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

export async function ensureMedewerkerFromCandidate(candidate: CandidateRecord) {
  // Hoofdletterongevoelig zoeken en klein opslaan: anders kan de medewerker nooit inloggen (B4).
  const email = normaliseerEmail(candidate.email);
  const existingByEmail = await zoekOpEmail<{ id: string; email: string }>("medewerkers", "id, email", email);

  if (existingByEmail?.id) {
    return existingByEmail.id;
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

  const { data, error } = await supabaseAdmin
    .from("medewerkers")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "Medewerker kon niet automatisch worden aangemaakt");
  }

  return data.id;
}
