import { supabaseAdmin } from "@/lib/supabase";

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
  const existingByEmail = await supabaseAdmin
    .from("medewerkers")
    .select("id")
    .eq("email", candidate.email)
    .maybeSingle();

  if (existingByEmail.data?.id) {
    return existingByEmail.data.id;
  }

  const payload = {
    naam: buildNaam(candidate),
    email: candidate.email,
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
