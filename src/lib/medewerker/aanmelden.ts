import { supabaseAdmin } from "@/lib/supabase";
import { INGEPLAND_STATUSSEN, isIngepland } from "@/lib/dienst-status";
import { herberekenPlekken } from "@/lib/plekken";
import { nlVandaag } from "@/lib/nl-tijd";
import {
  annuleerUitkomst,
  HERACTIVEERBAAR,
  heeftVrijePlek,
  inzetbaarheidsMelding,
  KRITIEKE_DOCUMENTEN,
  urenTotDienststart,
  VRIJ_AFMELDBAAR,
} from "@/lib/medewerker/dienst-regels";

/**
 * Eén plek voor "medewerker komt op een dienst": zelf aanmelden (Ontdekken), een aanbieding
 * accepteren of een uitnodiging aannemen. Voorheen had elke route zijn eigen (half) werkende
 * variant: geen capaciteitscheck, dubbele rijen, genegeerde insert-fouten en losse +1/-1 op
 * plekken_beschikbaar.
 */

export type AanmeldResultaat = { ok: true; aanmeldingId: string } | { ok: false; status: number; error: string };

/** Verlopen ID-bewijs/werkvergunning blokkeert inzet (zelfde regels als de oude `aanmelden`-actie). */
export async function controleerInzetbaarheid(medewerkerId: string): Promise<string | null> {
  const vandaag = nlVandaag();
  const [{ data: documenten }, { data: mw }] = await Promise.all([
    supabaseAdmin
      .from("medewerker_documenten")
      .select("document_type, expiry_date, uploaded_at")
      .eq("medewerker_id", medewerkerId)
      .in("document_type", [...KRITIEKE_DOCUMENTEN])
      .order("uploaded_at", { ascending: false })
      .limit(100),
    supabaseAdmin.from("medewerkers").select("werkvergunning_geldig_tot").eq("id", medewerkerId).maybeSingle(),
  ]);

  return inzetbaarheidsMelding({
    vandaag,
    // Alle versies ophalen: inzetbaarheidsMelding beoordeelt alleen het nieuwste document per type.
    documenten: (documenten ?? []) as { document_type: string; expiry_date: string | null; uploaded_at: string | null }[],
    werkvergunningGeldigTot: (mw as { werkvergunning_geldig_tot?: string | null } | null)?.werkvergunning_geldig_tot,
  });
}

/** Aantal ingeplande medewerkers op een dienst (live geteld). */
export async function telIngepland(dienstId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id", { count: "exact", head: true })
    .eq("dienst_id", dienstId)
    .in("status", [...INGEPLAND_STATUSSEN]);
  return count ?? 0;
}

/**
 * Zet plekken_beschikbaar opnieuw (gedeelde herberekenPlekken) en houdt `open`/`vol` gelijk.
 * Andere dienststatussen (bv. geannuleerd/afgerond) blijven onaangeroerd.
 */
export async function werkBezettingBij(dienstId: string): Promise<void> {
  await herberekenPlekken(dienstId);
  const { data } = await supabaseAdmin
    .from("diensten")
    .select("status, plekken_beschikbaar")
    .eq("id", dienstId)
    .maybeSingle();
  if (!data || !["open", "vol"].includes(data.status ?? "")) return;
  const gewenst = (data.plekken_beschikbaar ?? 1) > 0 ? "open" : "vol";
  if (gewenst !== data.status) {
    await supabaseAdmin.from("diensten").update({ status: gewenst }).eq("id", dienstId).in("status", ["open", "vol"]);
  }
}

/**
 * Meld een medewerker aan op een dienst met de gegeven status.
 * - `aangemeld`: sollicitatie, de klant kiest nog; vereist wel een vrije plek.
 * - `geaccepteerd`/`bevestigd`: direct ingepland (aanbieding/uitnodiging); vereist een vrije plek.
 * Een bestaande geannuleerde/afgewezen rij wordt hergebruikt (unieke index dienst+medewerker).
 */
export async function meldAan(
  medewerkerId: string,
  dienstId: string,
  status: "aangemeld" | "geaccepteerd" | "bevestigd",
  opties: { bestaandeAanmeldingId?: string } = {},
): Promise<AanmeldResultaat> {
  const melding = await controleerInzetbaarheid(medewerkerId);
  if (melding) return { ok: false, status: 403, error: melding };

  const { data: dienst } = await supabaseAdmin
    .from("diensten")
    .select("id, status, plekken_beschikbaar, plekken_totaal, aantal_nodig")
    .eq("id", dienstId)
    .maybeSingle();
  if (!dienst) return { ok: false, status: 404, error: "Dienst niet gevonden" };

  const ingepland = await telIngepland(dienstId);
  if (!heeftVrijePlek(dienst, ingepland)) {
    return { ok: false, status: 409, error: "Deze dienst zit vol" };
  }

  const { data: bestaand } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, status")
    .eq("dienst_id", dienstId)
    .eq("medewerker_id", medewerkerId);

  const rijen = (bestaand ?? []) as { id: string; status: string }[];
  // Bij direct inplannen (aanbieding/uitnodiging) wordt een lopende sollicitatie of uitnodiging
  // opgewaardeerd in plaats van als "al aangemeld" geweigerd.
  const eigenRij = opties.bestaandeAanmeldingId
    ? rijen.find((r) => r.id === opties.bestaandeAanmeldingId)
    : status !== "aangemeld"
      ? rijen.find((r) => (VRIJ_AFMELDBAAR as readonly string[]).includes(r.status))
      : undefined;
  const actief = rijen.find(
    (r) => r.id !== eigenRij?.id && !(HERACTIVEERBAAR as readonly string[]).includes(r.status),
  );
  if (actief) return { ok: false, status: 409, error: "Je bent al aangemeld voor deze dienst" };

  const hergebruik = eigenRij ?? rijen.find((r) => (HERACTIVEERBAAR as readonly string[]).includes(r.status));

  let aanmeldingId: string;
  if (hergebruik) {
    const { data, error } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status })
      .eq("id", hergebruik.id)
      .eq("status", hergebruik.status)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: "Aanmelden mislukt" };
    if (!data) return { ok: false, status: 409, error: "Je aanmelding is intussen gewijzigd, probeer het opnieuw" };
    aanmeldingId = data.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .insert({ dienst_id: dienstId, medewerker_id: medewerkerId, status })
      .select("id")
      .single();
    if (error?.code === "23505") return { ok: false, status: 409, error: "Je bent al aangemeld voor deze dienst" };
    if (error || !data) return { ok: false, status: 500, error: "Aanmelden mislukt" };
    aanmeldingId = data.id;
  }

  // Ingepland boven capaciteit (gelijktijdige acceptatie)? Terugdraaien.
  if (status !== "aangemeld") {
    const naInplannen = await telIngepland(dienstId);
    if (naInplannen > (dienst.plekken_totaal ?? dienst.aantal_nodig ?? 1)) {
      await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ status: hergebruik?.status ?? "geannuleerd" })
        .eq("id", aanmeldingId);
      await werkBezettingBij(dienstId);
      return { ok: false, status: 409, error: "Deze dienst zit vol" };
    }
  }

  await werkBezettingBij(dienstId);
  return { ok: true, aanmeldingId };
}

/**
 * Plan een vervanger (een open sollicitatie `aangemeld` op dezelfde dienst) in als `geaccepteerd`.
 * Controleert de capaciteit vooraf en telt na de update opnieuw: bij overboeking (gelijktijdige
 * acceptatie) gaat de vervanger terug naar `aangemeld` en volgt een 409. De bezetting wordt
 * daarna altijd herberekend.
 */
export async function planVervangerIn(
  dienstId: string,
  vervangerAanmeldingId: string,
  vervangingVoor: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: dienst } = await supabaseAdmin
    .from("diensten")
    .select("id, status, plekken_beschikbaar, plekken_totaal, aantal_nodig")
    .eq("id", dienstId)
    .maybeSingle();
  if (!dienst) return { ok: false, status: 404, error: "Dienst niet gevonden" };
  if (dienst.status === "geannuleerd") return { ok: false, status: 409, error: "Deze dienst is geannuleerd" };

  const totaal = dienst.plekken_totaal ?? dienst.aantal_nodig ?? 1;
  if ((await telIngepland(dienstId)) >= totaal) {
    return { ok: false, status: 409, error: "Alle plekken voor deze dienst zijn al bezet" };
  }

  const { data: bijgewerkt, error } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .update({ vervanging_voor: vervangingVoor, status: "geaccepteerd" })
    .eq("id", vervangerAanmeldingId)
    .eq("dienst_id", dienstId)
    .eq("status", "aangemeld")
    .select("id")
    .maybeSingle();
  if (error || !bijgewerkt) {
    return { ok: false, status: 409, error: "Vervanger kon niet worden ingepland" };
  }

  if ((await telIngepland(dienstId)) > totaal) {
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ vervanging_voor: null, status: "aangemeld" })
      .eq("id", vervangerAanmeldingId)
      .eq("status", "geaccepteerd");
    await werkBezettingBij(dienstId);
    return { ok: false, status: 409, error: "Alle plekken voor deze dienst zijn intussen bezet" };
  }

  await werkBezettingBij(dienstId);
  return { ok: true };
}

export type AfmeldResultaat =
  | { ok: true; uitkomst: "teruggetrokken" | "geannuleerd" | "vervanging_gezocht"; dienstId: string }
  | { ok: false; status: number; error: string };

/**
 * Medewerker meldt zich af voor een dienst (eigen aanmelding, op id óf dienst).
 * - nog niet ingepland (aangemeld/uitgenodigd): vrij terugtrekken;
 * - ingepland: de 48-uurregel van de annuleer-flow (Nederlandse tijd), daarbinnen vervanger zoeken;
 * - dienst al begonnen of andere status: geweigerd.
 */
export async function meldAf(
  medewerkerId: string,
  doel: { aanmeldingId?: string; dienstId?: string },
): Promise<AfmeldResultaat> {
  if (!doel.aanmeldingId && !doel.dienstId) return { ok: false, status: 400, error: "Aanmelding ontbreekt" };

  let query = supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst_id, status, dienst:diensten(datum, start_tijd)")
    .eq("medewerker_id", medewerkerId);
  query = doel.aanmeldingId ? query.eq("id", doel.aanmeldingId) : query.eq("dienst_id", doel.dienstId!);
  const { data } = await query;

  type Rij = { id: string; dienst_id: string; status: string; dienst: { datum: string; start_tijd: string } | { datum: string; start_tijd: string }[] | null };
  const rijen = (data ?? []) as Rij[];
  const rij = rijen.find((r) => !(HERACTIVEERBAAR as readonly string[]).includes(r.status));
  if (!rij) return { ok: false, status: 404, error: "Aanmelding niet gevonden" };

  const dienst = Array.isArray(rij.dienst) ? rij.dienst[0] : rij.dienst;
  let nieuweStatus: string;
  let uitkomst: "teruggetrokken" | "geannuleerd" | "vervanging_gezocht";

  if ((VRIJ_AFMELDBAAR as readonly string[]).includes(rij.status)) {
    nieuweStatus = rij.status === "uitgenodigd" ? "afgewezen" : "geannuleerd";
    uitkomst = "teruggetrokken";
  } else if (isIngepland(rij.status)) {
    if (!dienst?.datum || !dienst.start_tijd) return { ok: false, status: 400, error: "Dienst niet gevonden" };
    const keuze = annuleerUitkomst(urenTotDienststart(dienst.datum, dienst.start_tijd));
    if (keuze === "begonnen") {
      return { ok: false, status: 400, error: "Deze dienst is al begonnen. Neem contact op met TopTalent." };
    }
    nieuweStatus = keuze === "direct" ? "geannuleerd" : "vervanging_gezocht";
    uitkomst = keuze === "direct" ? "geannuleerd" : "vervanging_gezocht";
  } else {
    return { ok: false, status: 400, error: "Deze aanmelding kan niet (meer) worden afgemeld" };
  }

  const { data: bijgewerkt, error } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .update({ status: nieuweStatus })
    .eq("id", rij.id)
    .eq("status", rij.status)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: "Afmelden mislukt" };
  if (!bijgewerkt) return { ok: false, status: 409, error: "Je aanmelding is intussen gewijzigd, ververs de pagina" };

  await werkBezettingBij(rij.dienst_id);
  return { ok: true, uitkomst, dienstId: rij.dienst_id };
}
