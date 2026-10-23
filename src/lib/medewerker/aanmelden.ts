import { supabaseAdmin } from "@/lib/supabase";
import { INGEPLAND_STATUSSEN, isIngepland } from "@/lib/dienst-status";
import { DIENST_STATUS_IN_CONTROLE } from "@/lib/klant-controle-regels";
import { herberekenPlekken } from "@/lib/plekken";
import { nlVandaag } from "@/lib/nl-tijd";
import { haalDemoIds, zelfdeWereld } from "@/lib/demo";
import { haalKritiekeDocumenten } from "@/lib/medewerker/kritieke-documenten";
import { checklistMelding, CHECKLIST_CODE, type ChecklistPunt } from "@/lib/medewerker/reageer-checklist";
import { haalChecklist } from "@/lib/medewerker/checklist";
import { isOntbrekendeKolom, leesMetKolomFallback } from "@/lib/db-kolom-fallback";
import {
  heeftVoorwaarden,
  isAutomatischIngetrokken,
  LEGE_VOORWAARDEN,
  medewerkerTariefVanDienst,
  REACTIE_FOUTCODES,
  valideerReactie,
  type ReactieFoutcode,
  type ReactieInvoer,
  type ReactieVoorwaarden,
} from "@/lib/medewerker/reactie-regels";
import { haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";
import {
  annuleerUitkomst,
  HERACTIVEERBAAR,
  heeftVrijePlek,
  inzetbaarheidsMelding,
  kiesTeHoudenAanmelding,
  urenTotDienststart,
  VRIJ_AFMELDBAAR,
} from "@/lib/medewerker/dienst-regels";

/**
 * Eén plek voor "medewerker komt op een dienst": zelf aanmelden (Ontdekken), een aanbieding
 * accepteren of een uitnodiging aannemen. Voorheen had elke route zijn eigen (half) werkende
 * variant: geen capaciteitscheck, dubbele rijen, genegeerde insert-fouten en losse +1/-1 op
 * plekken_beschikbaar.
 */

export type AanmeldResultaat =
  | { ok: true; aanmeldingId: string }
  | {
      ok: false;
      status: number;
      error: string;
      /**
       * B1: `checklist_onvolledig` met de lijst van wat er nog ontbreekt. Uitgebreid reageren:
       * een code uit REACTIE_FOUTCODES (lib/medewerker/reactie-regels), bij het kledingvoorschrift
       * met de tekst erbij zodat de app hem kan tonen.
       */
      code?: typeof CHECKLIST_CODE | ReactieFoutcode;
      ontbrekend?: ChecklistPunt[];
      kledingvoorschrift?: string;
    };

/** JSON-body voor een mislukte aanmelding; geeft bij B1 ook code + ontbrekend mee. */
export function aanmeldFoutBody(resultaat: Extract<AanmeldResultaat, { ok: false }>) {
  if (resultaat.code === CHECKLIST_CODE) {
    return { error: resultaat.error, code: resultaat.code, ontbrekend: resultaat.ontbrekend ?? [] };
  }
  if (resultaat.code) {
    return {
      error: resultaat.error,
      code: resultaat.code,
      ...(resultaat.kledingvoorschrift ? { kledingvoorschrift: resultaat.kledingvoorschrift } : {}),
    };
  }
  return { error: resultaat.error };
}

const NIET_BESCHIKBAAR: Extract<AanmeldResultaat, { ok: false }> = {
  ok: false,
  status: 503,
  code: REACTIE_FOUTCODES.nietBeschikbaar,
  error:
    "Een eigen tarief, eigen tijden, motivatie of automatisch intrekken kan nog niet worden opgeslagen. Reageer zonder deze opties of probeer het later opnieuw.",
};

/**
 * Bij direct inplannen (aanbieding of uitnodiging accepteren) gelden de voorwaarden van de dienst:
 * een eerder tegenbod of eigen tijden op dezelfde rij vervallen. Motivatie en kleding-akkoord blijven.
 */
const RESET_BIJ_INPLANNEN = {
  voorgesteld_uurtarief: null,
  voorgestelde_start_tijd: null,
  voorgestelde_eind_tijd: null,
  auto_intrekken_uren: null,
  annuleer_reden: null,
};

/** Verlopen ID-bewijs/werkvergunning blokkeert inzet; alleen goedgekeurde documenten tellen (B10). */
export async function controleerInzetbaarheid(medewerkerId: string): Promise<string | null> {
  const vandaag = nlVandaag();
  const [documenten, { data: mw }] = await Promise.all([
    haalKritiekeDocumenten([medewerkerId]),
    supabaseAdmin.from("medewerkers").select("werkvergunning_geldig_tot").eq("id", medewerkerId).maybeSingle(),
  ]);

  return inzetbaarheidsMelding({
    vandaag,
    // Alle versies: inzetbaarheidsMelding beoordeelt alleen het nieuwste goedgekeurde document per type.
    documenten: documenten.get(medewerkerId) ?? [],
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
 * Een bestaande geannuleerde/afgewezen rij wordt hergebruikt (unieke index dienst+medewerker),
 * ook een open reactie die al voorbij haar intrekmoment is (lazy check, lib/medewerker/reactie-regels).
 *
 * `opties.reactie` (alleen bij `aangemeld`): tegenbod, eigen tijden, motivatie, kleding-akkoord en
 * automatisch intrekken. Leeg = zoals voorheen (alleen dienst_id); een dienst met kledingvoorschrift
 * vraagt wel altijd een akkoord.
 */
export async function meldAan(
  medewerkerId: string,
  dienstId: string,
  status: "aangemeld" | "geaccepteerd" | "bevestigd",
  opties: { bestaandeAanmeldingId?: string; reactie?: ReactieInvoer } = {},
): Promise<AanmeldResultaat> {
  // B1: eerst de checklist (ID, KvK, btw, IBAN, akkoord overeenkomst). Geldt voor zelf aanmelden
  // én voor het accepteren van een aanbieding of uitnodiging: alle routes lopen via meldAan.
  const checklist = await haalChecklist(medewerkerId);
  if (!checklist.compleet) {
    return {
      ok: false,
      status: 403,
      error: checklistMelding(checklist.ontbrekend),
      code: CHECKLIST_CODE,
      ontbrekend: checklist.ontbrekend,
    };
  }

  const melding = await controleerInzetbaarheid(medewerkerId);
  if (melding) return { ok: false, status: 403, error: melding };

  // kledingvoorschrift bestaat pas na migratie 20261023_uitgebreid_reageren.sql; zonder die kolom
  // heeft geen enkele dienst een voorschrift.
  const basisKolommen = "id, klant_id, status, plekken_beschikbaar, plekken_totaal, aantal_nodig, datum, start_tijd, eind_tijd, uurtarief";
  const { data: dienstRij } = await leesMetKolomFallback((metNieuw) =>
    supabaseAdmin
      .from("diensten")
      .select(metNieuw ? `${basisKolommen}, kledingvoorschrift` : basisKolommen)
      .eq("id", dienstId)
      .maybeSingle(),
  );
  const dienst = dienstRij as unknown as {
    id: string;
    klant_id: string | null;
    status: string | null;
    plekken_beschikbaar: number | null;
    plekken_totaal: number | null;
    aantal_nodig: number | null;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    uurtarief: number | null;
    kledingvoorschrift?: string | null;
  } | null;
  if (!dienst) return { ok: false, status: 404, error: "Dienst niet gevonden" };
  // Eerste dienst van een nieuwe klant die TopTalent nog controleert (lib/klant-controle-regels):
  // voor medewerkers bestaat hij nog niet.
  if (dienst.status === DIENST_STATUS_IN_CONTROLE) return { ok: false, status: 404, error: "Dienst niet gevonden" };
  // Demo-medewerkers alleen op diensten van demo-klanten en andersom (lib/demo.ts). Zelfde
  // antwoord als een onbekende dienst: de andere wereld bestaat voor deze medewerker niet.
  if (!zelfdeWereld(await haalDemoIds(), medewerkerId, dienst.klant_id as string | null)) {
    return { ok: false, status: 404, error: "Dienst niet gevonden" };
  }

  // Uitgebreid reageren: alleen bij zelf aanmelden. Een aanbieding of uitnodiging accepteren
  // gebeurt tegen de voorwaarden van de dienst.
  let voorwaarden: ReactieVoorwaarden = LEGE_VOORWAARDEN;
  if (status === "aangemeld") {
    const check = valideerReactie(opties.reactie ?? {}, dienst);
    if (!check.ok) {
      return { ok: false, status: check.status, error: check.error, code: check.code, kledingvoorschrift: check.kledingvoorschrift };
    }
    voorwaarden = check.voorwaarden;
  }

  const ingepland = await telIngepland(dienstId);
  if (!heeftVrijePlek(dienst, ingepland)) {
    return { ok: false, status: 409, error: "Deze dienst zit vol" };
  }

  const { data: bestaand } = await leesMetKolomFallback((metNieuw) =>
    supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(metNieuw ? "id, status, auto_intrekken_uren" : "id, status")
      .eq("dienst_id", dienstId)
      .eq("medewerker_id", medewerkerId),
  );

  const rijen = (bestaand ?? []) as unknown as { id: string; status: string; auto_intrekken_uren?: number | null }[];
  // Een open reactie voorbij haar intrekmoment telt als ingetrokken, ook als de cron nog niet draaide.
  const heractiveerbaar = (r: (typeof rijen)[number]) =>
    (HERACTIVEERBAAR as readonly string[]).includes(r.status) || isAutomatischIngetrokken(r, dienst);
  // Bij direct inplannen (aanbieding/uitnodiging) wordt een lopende sollicitatie of uitnodiging
  // opgewaardeerd in plaats van als "al aangemeld" geweigerd.
  const eigenRij = opties.bestaandeAanmeldingId
    ? rijen.find((r) => r.id === opties.bestaandeAanmeldingId)
    : status !== "aangemeld"
      ? rijen.find((r) => (VRIJ_AFMELDBAAR as readonly string[]).includes(r.status))
      : undefined;
  const actief = rijen.find((r) => r.id !== eigenRij?.id && !heractiveerbaar(r));
  if (actief) return { ok: false, status: 409, error: "Je bent al aangemeld voor deze dienst" };

  const hergebruik = eigenRij ?? rijen.find(heractiveerbaar);
  const metVoorwaarden = heeftVoorwaarden(voorwaarden);

  let aanmeldingId: string;
  if (hergebruik) {
    // Hergebruikte rij: de voorwaarden van een eerdere reactie worden altijd overschreven (null
    // als er nu niets is voorgesteld), zodat een oud tegenbod nooit stil blijft gelden.
    const nieuweVelden = status === "aangemeld" ? { ...voorwaarden, annuleer_reden: null } : RESET_BIJ_INPLANNEN;
    const werkBij = (velden: Record<string, unknown>) =>
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .update(velden)
        .eq("id", hergebruik.id)
        .eq("status", hergebruik.status)
        .select("id")
        .maybeSingle();
    let { data, error } = await werkBij({ status, ...nieuweVelden });
    if (isOntbrekendeKolom(error)) {
      // Migratie nog niet gedraaid: een voorstel kan niet worden opgeslagen, dus weigeren in plaats
      // van de medewerker stil tegen andere voorwaarden aan te melden. Zonder voorstel: zoals voorheen.
      if (metVoorwaarden) return NIET_BESCHIKBAAR;
      ({ data, error } = await werkBij({ status }));
    }
    if (error) return { ok: false, status: 500, error: "Aanmelden mislukt" };
    if (!data) return { ok: false, status: 409, error: "Je aanmelding is intussen gewijzigd, probeer het opnieuw" };
    aanmeldingId = data.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .insert({ dienst_id: dienstId, medewerker_id: medewerkerId, status, ...(metVoorwaarden ? voorwaarden : {}) })
      .select("id")
      .single();
    if (metVoorwaarden && isOntbrekendeKolom(error)) return NIET_BESCHIKBAAR;
    if (error?.code === "23505") return { ok: false, status: 409, error: "Je bent al aangemeld voor deze dienst" };
    if (error || !data) return { ok: false, status: 500, error: "Aanmelden mislukt" };
    aanmeldingId = data.id;

    // Zonder unieke index (migratie 20261001_portaal_sessies.sql niet gedraaid of geblokkeerd door
    // bestaande dubbelen) kunnen twee gelijktijdige aanmeldingen allebei een rij invoegen. Alle
    // aanvragen kiezen dezelfde rij om te houden (oudste op aangemeld_at, dan id); wie niet die
    // rij is, verwijdert zijn eigen insert weer.
    const { data: rijenNa } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, aangemeld_at")
      .eq("dienst_id", dienstId)
      .eq("medewerker_id", medewerkerId);
    const houden = kiesTeHoudenAanmelding((rijenNa ?? []) as { id: string; aangemeld_at: string | null }[]);
    if (houden && houden !== aanmeldingId) {
      await supabaseAdmin.from("dienst_aanmeldingen").delete().eq("id", aanmeldingId);
      await werkBezettingBij(dienstId);
      return { ok: false, status: 409, error: "Je bent al aangemeld voor deze dienst" };
    }
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
 *
 * Uitgebreid reageren: hier kiest een collega, niet de werkgever. Een reactie met eigen tijden of
 * een tegenbod boven het tarief van de dienst kost de werkgever meer of dekt de dienst niet
 * helemaal; die kan alleen de werkgever (of TopTalent) kiezen. Een automatisch ingetrokken reactie
 * kan niemand meer kiezen.
 */
export async function planVervangerIn(
  dienstId: string,
  vervangerAanmeldingId: string,
  vervangingVoor: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string; code?: ReactieFoutcode }> {
  const { data: dienst } = await supabaseAdmin
    .from("diensten")
    .select("id, status, plekken_beschikbaar, plekken_totaal, aantal_nodig, datum, start_tijd, uurtarief")
    .eq("id", dienstId)
    .maybeSingle();
  if (!dienst) return { ok: false, status: 404, error: "Dienst niet gevonden" };
  if (dienst.status === "geannuleerd") return { ok: false, status: 409, error: "Deze dienst is geannuleerd" };

  const voorstel = (await haalVoorwaarden([vervangerAanmeldingId])).get(vervangerAanmeldingId);
  if (voorstel) {
    if (isAutomatischIngetrokken({ status: "aangemeld", auto_intrekken_uren: voorstel.auto_intrekken_uren }, dienst)) {
      return {
        ok: false,
        status: 409,
        code: REACTIE_FOUTCODES.reactieIngetrokken,
        error: "De reactie van deze collega is automatisch ingetrokken en kan niet meer worden gekozen.",
      };
    }
    const eigenTijden = !!voorstel.voorgestelde_start_tijd && !!voorstel.voorgestelde_eind_tijd;
    const duurder =
      voorstel.voorgesteld_uurtarief != null &&
      voorstel.voorgesteld_uurtarief > medewerkerTariefVanDienst(dienst.uurtarief as number | null) + 0.004;
    if (eigenTijden || duurder) {
      return {
        ok: false,
        status: 409,
        error:
          "Deze collega heeft eigen tijden of een hoger tarief voorgesteld. Zo'n reactie kan alleen de werkgever kiezen; neem contact op met TopTalent.",
      };
    }
  }

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
