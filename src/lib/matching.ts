import { supabaseAdmin } from "@/lib/supabase";
import { isAutomatischIngetrokken } from "@/lib/medewerker/reactie-regels";
import { haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";
import { valideerLeeftijdVoorDienst, valideerVSHVoorFunctie } from "@/lib/compliance/arbeidstijden";
import { normaliseerBeschikbaarheid } from "@/lib/medewerker/beschikbaarheid";
import { beschikbaarheidPerMedewerker } from "@/lib/medewerker/beschikbaarheid-bron";
import { haalKritiekeDocumenten } from "@/lib/medewerker/kritieke-documenten";
import { haalChecklist } from "@/lib/medewerker/checklist";
import { inzetbaarheidsMelding } from "@/lib/medewerker/dienst-regels";
import { nlVandaag } from "@/lib/nl-tijd";

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  telefoon: string | null;
  functie: string[];
  status: string;
  stad: string | null;
  admin_score_aanwezigheid: number | null;
  admin_score_vaardigheden: number | null;
  profile_photo_url: string | null;
  badge: string | null;
  gemiddelde_score: number | null;
  geboortedatum?: string | null;
}

interface Beschikbaarheid {
  email?: string;
  beschikbaarheid: Record<string, string[]> | string | null;
  beschikbaar_vanaf: string | null;
  max_uren_per_week: number | null;
}

interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  aantal_nodig: number;
}

export interface MatchResult {
  medewerker: Medewerker;
  score: number;
  breakdown: {
    functie_score: number;
    beschikbaarheid_score: number;
    admin_score: number;
    locatie_score: number;
    badge_bonus: number;
  };
  beschikbaar: boolean;
  compliance_blokkade?: string;
}

// Dag naam mapping (0=zondag in JS)
const dagNamen: Record<number, string> = {
  0: "zo",
  1: "ma",
  2: "di",
  3: "wo",
  4: "do",
  5: "vr",
  6: "za",
};

// Tijdslot mapping
function getTijdslot(tijd: string): string {
  const uur = parseInt(tijd.split(":")[0]);
  if (uur < 12) return "ochtend";
  if (uur < 17) return "middag";
  return "avond";
}

/**
 * Bereken match score voor een medewerker bij een dienst
 */
function calculateMatchScore(
  medewerker: Medewerker,
  dienst: Dienst,
  beschikbaarheid: Beschikbaarheid | null,
  heeftVSH: boolean = true
): MatchResult {
  const breakdown = {
    functie_score: 0,
    beschikbaarheid_score: 0,
    admin_score: 0,
    locatie_score: 0,
    badge_bonus: 0,
  };

  // 1. Functie match (40%)
  const functies = Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie];
  if (functies.includes(dienst.functie)) {
    breakdown.functie_score = 40;
  }

  // 2. Beschikbaarheid (30%)
  let isBeschikbaar = true;
  // Dagnotatie: korte sleutels (ma…zo). Oudere portaaldata met "Maandag"… wordt bij lezen omgezet.
  const weekBeschikbaarheid = normaliseerBeschikbaarheid(beschikbaarheid?.beschikbaarheid);
  if (weekBeschikbaarheid) {
    const dienstDatum = new Date(dienst.datum);
    const dagNaam = dagNamen[dienstDatum.getDay()] as keyof typeof weekBeschikbaarheid;
    const tijdslot = getTijdslot(dienst.start_tijd);
    const dagBeschikbaarheid = weekBeschikbaarheid[dagNaam];

    if (dagBeschikbaarheid && dagBeschikbaarheid.length > 0) {
      if (dagBeschikbaarheid.includes(tijdslot) || dagBeschikbaarheid.includes("hele_dag")) {
        breakdown.beschikbaarheid_score = 30;
      } else {
        isBeschikbaar = false;
      }
    } else {
      // Geen beschikbaarheid opgegeven voor deze dag
      isBeschikbaar = false;
    }
  } else {
    // Geen beschikbaarheid data - neem aan beschikbaar, maar lagere score
    breakdown.beschikbaarheid_score = 15;
  }

  // Check beschikbaar_vanaf
  if (beschikbaarheid?.beschikbaar_vanaf) {
    const vanaf = new Date(beschikbaarheid.beschikbaar_vanaf);
    const dienstDatum = new Date(dienst.datum);
    if (dienstDatum < vanaf) {
      isBeschikbaar = false;
      breakdown.beschikbaarheid_score = 0;
    }
  }

  // 3. Admin scores (20%)
  const aanwezigheid = medewerker.admin_score_aanwezigheid ?? 5;
  const vaardigheden = medewerker.admin_score_vaardigheden ?? 5;
  const gemiddeldScore = (aanwezigheid + vaardigheden) / 2;
  breakdown.admin_score = Math.round((gemiddeldScore / 10) * 20);

  // 4. Locatie match (10%)
  if (medewerker.stad && dienst.locatie) {
    const medewerkerStad = medewerker.stad.toLowerCase().trim();
    const dienstLocatie = dienst.locatie.toLowerCase().trim();
    if (dienstLocatie.includes(medewerkerStad) || medewerkerStad.includes(dienstLocatie)) {
      breakdown.locatie_score = 10;
    }
  }

  // 5. Badge bonus (extra punten bovenop de 100)
  const badge = medewerker.badge || "starter";
  if (badge === "toptalent") breakdown.badge_bonus = 10;
  else if (badge === "star") breakdown.badge_bonus = 5;
  else if (badge === "rising") breakdown.badge_bonus = 2;

  const totalScore =
    breakdown.functie_score +
    breakdown.beschikbaarheid_score +
    breakdown.admin_score +
    breakdown.locatie_score +
    breakdown.badge_bonus;

  // C-11/C-12: Leeftijdsvalidatie (Alcoholwet + nachtwerk-verbod)
  let compliance_blokkade: string | undefined;
  if (medewerker.geboortedatum) {
    const leeftijdsCheck = valideerLeeftijdVoorDienst(
      medewerker.geboortedatum,
      dienst.datum,
      dienst.functie,
      dienst.start_tijd,
      dienst.eind_tijd,
    );
    if (!leeftijdsCheck.toegestaan) {
      compliance_blokkade = leeftijdsCheck.reden;
    }
  }

  // C-13: VSH-certificering check bij bar-functies
  if (!compliance_blokkade) {
    const vshCheck = valideerVSHVoorFunctie(dienst.functie, heeftVSH);
    if (!vshCheck.toegestaan) {
      compliance_blokkade = vshCheck.reden;
    }
  }

  return {
    medewerker,
    score: totalScore,
    breakdown,
    beschikbaar: isBeschikbaar && breakdown.functie_score > 0 && !compliance_blokkade,
    compliance_blokkade,
  };
}

/**
 * Vind beste matches voor een dienst
 */
export async function findMatchesForDienst(dienstId: string): Promise<{
  dienst: Dienst;
  matches: MatchResult[];
}> {
  // Haal dienst op
  const { data: dienst, error: dienstError } = await supabaseAdmin
    .from("diensten")
    .select("id, klant_naam, locatie, datum, start_tijd, eind_tijd, functie, aantal_nodig")
    .eq("id", dienstId)
    .single();

  if (dienstError || !dienst) {
    throw new Error("Dienst niet gevonden");
  }

  // Haal actieve medewerkers op (incl. geboortedatum voor compliance checks)
  const { data: medewerkers } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, email, telefoon, functie, status, stad, admin_score_aanwezigheid, admin_score_vaardigheden, profile_photo_url, badge, gemiddelde_score, geboortedatum")
    .eq("status", "actief");

  if (!medewerkers || medewerkers.length === 0) {
    return { dienst, matches: [] };
  }

  // Haal beschikbaarheid op voor alle medewerkers: inschrijving (e-mail of medewerker_id),
  // anders het rooster op de medewerker zelf (medewerkers zonder inschrijving).
  const beschikbaarheidMap = await beschikbaarheidPerMedewerker(medewerkers);

  // Haal bestaande aanmeldingen op voor deze dienst
  const { data: bestaandeAanmeldingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, medewerker_id, status")
    .eq("dienst_id", dienstId)
    .in("status", ["aangemeld", "geaccepteerd"]);

  // Een automatisch ingetrokken reactie (voorbij het intrekmoment, cron nog niet gedraaid) telt
  // niet meer als aangemeld: die medewerker mag weer worden voorgesteld.
  const voorwaarden = await haalVoorwaarden((bestaandeAanmeldingen || []).map((a) => a.id));
  const alAangemeldIds = new Set(
    (bestaandeAanmeldingen || [])
      .filter((a) => !isAutomatischIngetrokken({ status: a.status, auto_intrekken_uren: voorwaarden.get(a.id)?.auto_intrekken_uren }, dienst))
      .map((a) => a.medewerker_id),
  );

  // C-23 / B10: verlopen ID-bewijs, werkvergunning of verblijfsvergunning blokkeert. Zelfde regel
  // als meldAan (inzetbaarheidsMelding): per type alleen het nieuwste goedgekeurde document.
  // Voorheen telde hier elke verlopen versie, ook als er al een nieuw, geldig document was.
  const today = nlVandaag();
  const medewerkerIds = medewerkers.map((m) => m.id);
  const [kritiekeDocumenten, { data: werkvergunningen }] = await Promise.all([
    haalKritiekeDocumenten(medewerkerIds),
    supabaseAdmin
      .from("medewerkers")
      .select("id, werkvergunning_geldig_tot")
      .not("werkvergunning_geldig_tot", "is", null),
  ]);
  const werkvergunningPerId = new Map(
    ((werkvergunningen ?? []) as { id: string; werkvergunning_geldig_tot: string | null }[]).map((w) => [
      w.id,
      w.werkvergunning_geldig_tot,
    ]),
  );
  const verlopenIDSet = new Set(
    medewerkerIds.filter(
      (id) =>
        inzetbaarheidsMelding({
          vandaag: today,
          documenten: kritiekeDocumenten.get(id) ?? [],
          werkvergunningGeldigTot: werkvergunningPerId.get(id) ?? null,
        }) !== null,
    ),
  );

  // C-13: Haal geldige VSH-certificeringen op
  const { data: vshCerts } = await supabaseAdmin
    .from("certificeringen")
    .select("medewerker_id")
    .in("medewerker_id", medewerkerIds)
    .ilike("naam", "%sociale hygi%")
    .or(`verloopt_op.is.null,verloopt_op.gte.${today}`);

  const vshSet = new Set((vshCerts || []).map((c) => c.medewerker_id));

  // Bereken scores (C-23: filter verlopen ID-bewijzen)
  const matches = medewerkers
    .filter((m) => !alAangemeldIds.has(m.id))
    .filter((m) => !verlopenIDSet.has(m.id))
    .map((m) => calculateMatchScore(m, dienst, (beschikbaarheidMap.get(m.id) as Beschikbaarheid | undefined) || null, vshSet.has(m.id)))
    .filter((m) => m.score > 0)
    .sort((a, b) => {
      // Beschikbare medewerkers eerst, dan op score
      if (a.beschikbaar !== b.beschikbaar) return a.beschikbaar ? -1 : 1;
      return b.score - a.score;
    });

  return { dienst, matches };
}

/**
 * Bulk-uitnodigen van medewerkers voor een dienst
 */
export async function inviteMedewerkersForDienst(
  dienstId: string,
  medewerkerIds: string[]
): Promise<{ success: number; errors: string[] }> {
  const errors: string[] = [];
  let success = 0;

  for (const medewerkerId of medewerkerIds) {
    // B1: een uitnodiging vanuit de matching zet direct een aanmelding neer; die mag de checklist
    // (ID, KvK, btw, IBAN, akkoord overeenkomst) niet omzeilen.
    let checklist: Awaited<ReturnType<typeof haalChecklist>>;
    try {
      checklist = await haalChecklist(medewerkerId);
    } catch (fout) {
      errors.push(`Medewerker ${medewerkerId} niet uitgenodigd: checklist kon niet worden gecontroleerd (${fout instanceof Error ? fout.message : "onbekende fout"})`);
      continue;
    }
    if (!checklist.compleet) {
      errors.push(
        `Medewerker ${medewerkerId} niet uitgenodigd: checklist onvolledig (${checklist.ontbrekend.map((p) => p.label).join(", ")})`,
      );
      continue;
    }

    const { error } = await supabaseAdmin.from("dienst_aanmeldingen").insert({
      dienst_id: dienstId,
      medewerker_id: medewerkerId,
      status: "aangemeld",
    });

    if (error) {
      errors.push(`Fout bij uitnodigen medewerker ${medewerkerId}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, errors };
}
