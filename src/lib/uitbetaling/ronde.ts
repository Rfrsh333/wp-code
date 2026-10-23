import { randomUUID } from "crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabase";
import { encryptField } from "@/lib/encryption";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { getFactuurConfig } from "@/lib/factuur-config";
import { nlDatum, nlVandaag } from "@/lib/nl-tijd";
import type { AdminRole } from "@/lib/admin-auth";
import { ZelffactuurPDF } from "@/lib/pdf/zelffactuur-pdf";
import { ZELFFACTURERING_VERSIE } from "@/content/zelffacturering-akkoord";
import { bankConfig, uitbetaalTermijnWerkdagen, UITBETALING_BUCKET } from "@/lib/uitbetaling/config";
import { maakSepaXml, SepaFout, sepaTijdstip } from "@/lib/uitbetaling/sepa";
import {
  BLOKKADE_LABELS,
  bouwZelffactuur,
  centenNaarEuro,
  leverancierBlokkades,
  volgendVolgnummer,
  type ZelffactuurModel,
} from "@/lib/uitbetaling/regels";
import { haalLeveranciers, haalUrenMetStatus, isMigratieGedraaid, type Leverancier, type UrenItem } from "@/lib/uitbetaling/db";

/**
 * Een uitbetaalronde aanmaken en afronden. Er gaat hier NOOIT geld weg: het resultaat is een
 * SEPA-bestand dat een admin downloadt en Rachid zelf in de bank uploadt.
 *
 * Veiligheid:
 * - alle bedragen worden hier opnieuw berekend uit de database; de browser stuurt alleen uren-id's;
 * - elke uren-id moet nú uitbetaalbaar zijn (goedgekeurd door de admin, klantfactuur betaald, nog
 *   niet uitbetaald) en de medewerker moet een geldig akkoord, IBAN, NAW, KvK en btw-id hebben;
 * - maximaal één ronde tegelijk in opbouw (unique index op status 'concept'), en elke uren-id kan
 *   maar in één zelffactuur (unique index), dus dubbel uitbetalen kan niet, ook niet bij twee admins;
 * - mislukt iets halverwege, dan wordt de ronde in opbouw volledig opgeruimd (ook de PDF's). Een
 *   ronde in opbouw is nergens zichtbaar.
 */

type Actor = { email?: string; role?: AdminRole };

export type RondeFout = { ok: false; status: number; error: string; code: string; details?: unknown };
export type RondeAangemaakt = {
  ok: true;
  ronde: { id: string; bericht_id: string; uitvoer_datum: string; aantal_betalingen: number; totaal_centen: number };
  facturen: { id: string; factuur_nummer: string; medewerker_id: string; incl_centen: number }[];
};

/** Een ronde in opbouw die zo lang blijft staan, is achtergebleven na een crash of time-out. */
const CONCEPT_VERLOPEN_MS = 15 * 60 * 1000;

const fout = (status: number, code: string, error: string, details?: unknown): RondeFout => ({ ok: false, status, code, error, details });

function berichtId(nu: Date): string {
  const stempel = sepaTijdstip(nu).replace(/\D/g, "");
  return `TT-UR-${stempel}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function afnemer() {
  const c = getFactuurConfig();
  return { naam: c.bedrijfsnaam, adres: c.adres, postcode_stad: c.postcodeStad, kvk: c.kvk, btw: c.btw };
}

function pdfPad(medewerkerId: string, factuurNummer: string): string {
  return `facturen/${medewerkerId}/${factuurNummer}.pdf`;
}

/** Ruimt een ronde in opbouw op: PDF's/SEPA uit storage, regels, zelffacturen en de ronde zelf. */
export async function ruimConceptRondeOp(rondeId: string, extraPaden: readonly string[] = []): Promise<void> {
  try {
    const { data: rijen } = await supabaseAdmin.from("uitbetalingen").select("id, pdf_pad").eq("ronde_id", rondeId);
    const paden = [...new Set([...extraPaden, ...((rijen ?? []).map((r) => r.pdf_pad).filter(Boolean) as string[]), `sepa/${rondeId}.xml`])];
    if (paden.length > 0) await supabaseAdmin.storage.from(UITBETALING_BUCKET).remove(paden);
    const ids = (rijen ?? []).map((r) => r.id as string);
    if (ids.length > 0) {
      await supabaseAdmin.from("uitbetaling_regels").delete().in("uitbetaling_id", ids);
      await supabaseAdmin.from("uitbetalingen").delete().in("id", ids);
    }
    await supabaseAdmin.from("uitbetaalrondes").delete().eq("id", rondeId).eq("status", "concept");
  } catch (e) {
    // Niet fataal: een achtergebleven concept-ronde wordt bij de volgende poging opgeruimd.
    captureRouteError(e, { route: "lib/uitbetaling/ronde", action: "OPRUIMEN" });
  }
}

async function ruimVerlopenConceptenOp(): Promise<void> {
  const grens = new Date(Date.now() - CONCEPT_VERLOPEN_MS).toISOString();
  const { data } = await supabaseAdmin.from("uitbetaalrondes").select("id").eq("status", "concept").lt("aangemaakt_op", grens);
  for (const r of data ?? []) await ruimConceptRondeOp(r.id as string);
}

async function hoogsteVolgnummer(medewerkerId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("uitbetalingen")
    .select("volgnummer")
    .eq("medewerker_id", medewerkerId)
    .order("volgnummer", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.volgnummer as number | undefined) ?? null;
}

type Voorbereid = { model: ZelffactuurModel; leverancier: Leverancier; items: UrenItem[] };

/** Controleert de selectie en bouwt per medewerker de zelffactuur (nog niets opgeslagen). */
async function bereidVoor(urenIds: readonly string[], factuurDatum: string): Promise<{ ok: true; voorbereid: Voorbereid[] } | RondeFout> {
  const { items } = await haalUrenMetStatus({ urenIds }, { termijnWerkdagen: uitbetaalTermijnWerkdagen() });
  const perId = new Map(items.map((i) => [i.uren_registratie_id, i]));
  const nietUitbetaalbaar = urenIds.filter((id) => perId.get(id)?.status !== "uitbetaalbaar");
  if (nietUitbetaalbaar.length > 0) {
    return fout(409, "niet_uitbetaalbaar", "Een deel van de selectie is niet (meer) uitbetaalbaar. Ververs het overzicht.", {
      uren_ids: nietUitbetaalbaar,
    });
  }

  const perMedewerker = new Map<string, UrenItem[]>();
  for (const id of urenIds) {
    const item = perId.get(id)!;
    perMedewerker.set(item.medewerker_id, [...(perMedewerker.get(item.medewerker_id) ?? []), item]);
  }

  const { perId: leveranciers, akkoordKolommen } = await haalLeveranciers([...perMedewerker.keys()]);
  if (!akkoordKolommen) return fout(503, "migratie_ontbreekt", "De migratie voor zelffacturering is nog niet gedraaid.");

  const geblokkeerd: { medewerker_id: string; naam: string | null; blokkades: string[] }[] = [];
  const voorbereid: Voorbereid[] = [];
  for (const [medewerkerId, regelItems] of perMedewerker) {
    const l = leveranciers.get(medewerkerId);
    const blokkades = l ? leverancierBlokkades(l, ZELFFACTURERING_VERSIE) : (["naam"] as const);
    if (!l || blokkades.length > 0) {
      geblokkeerd.push({ medewerker_id: medewerkerId, naam: l?.naam ?? null, blokkades: blokkades.map((b) => BLOKKADE_LABELS[b]) });
      continue;
    }
    const model = bouwZelffactuur({
      medewerkerId,
      volgnummer: volgendVolgnummer(await hoogsteVolgnummer(medewerkerId)),
      factuurDatum,
      kor: l.kor,
      regels: regelItems.map((i) => i.regel),
    });
    if (model.totalen.incl_centen <= 0) {
      geblokkeerd.push({ medewerker_id: medewerkerId, naam: l.naam, blokkades: ["Totaalbedrag is € 0"] });
      continue;
    }
    voorbereid.push({ model, leverancier: l, items: regelItems });
  }
  if (geblokkeerd.length > 0) {
    return fout(422, "medewerker_geblokkeerd", "Voor een of meer medewerkers kan nog geen zelffactuur worden gemaakt.", { medewerkers: geblokkeerd });
  }
  voorbereid.sort((a, b) => (a.leverancier.naam ?? "").localeCompare(b.leverancier.naam ?? "", "nl"));
  return { ok: true, voorbereid };
}

export async function maakUitbetaalronde(input: { urenIds: readonly string[]; uitvoerDatum: string; actor: Actor }): Promise<RondeAangemaakt | RondeFout> {
  const bank = bankConfig();
  if (!bank.ok) return fout(503, "bank_niet_ingesteld", `De TopTalent-rekening is niet (goed) ingesteld: ${bank.fouten.join(", ")}.`);
  if (!(await isMigratieGedraaid())) return fout(503, "migratie_ontbreekt", "De migratie voor zelffacturering is nog niet gedraaid.");

  const vandaag = nlVandaag();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.uitvoerDatum) || input.uitvoerDatum < vandaag) {
    return fout(400, "ongeldige_uitvoerdatum", "Kies een uitvoerdatum van vandaag of later.");
  }
  const urenIds = [...new Set(input.urenIds)];
  if (urenIds.length === 0) return fout(400, "lege_selectie", "Selecteer minstens één dienst.");

  const voor = await bereidVoor(urenIds, vandaag);
  if (!voor.ok) return voor;

  // SEPA-bestand eerst opbouwen: een ongeldig IBAN of naam stopt de ronde vóór er iets is opgeslagen.
  const nu = new Date();
  const id = berichtId(nu);
  let xml: string;
  try {
    xml = maakSepaXml({
      berichtId: id,
      aangemaaktOp: nu,
      uitvoerDatum: input.uitvoerDatum,
      debiteur: { naam: bank.naam, iban: bank.iban, bic: bank.bic },
      betalingen: voor.voorbereid.map((v) => ({
        endToEndId: v.model.factuur_nummer,
        naam: v.leverancier.naam ?? "",
        iban: v.leverancier.iban ?? "",
        bedragCenten: v.model.totalen.incl_centen,
        omschrijving: v.model.factuur_nummer,
      })),
    });
  } catch (e) {
    if (e instanceof SepaFout) return fout(422, "sepa_ongeldig", `Het SEPA-bestand kan niet worden gemaakt: ${e.message}.`);
    throw e;
  }

  await ruimVerlopenConceptenOp();
  const { data: ronde, error: rondeFout } = await supabaseAdmin
    .from("uitbetaalrondes")
    .insert({ bericht_id: id, status: "concept", uitvoer_datum: input.uitvoerDatum, aangemaakt_door: input.actor.email ?? null })
    .select("id")
    .single();
  if (rondeFout?.code === "23505") return fout(409, "ronde_bezig", "Er wordt al een uitbetaalronde aangemaakt. Probeer het over een minuut opnieuw.");
  if (rondeFout || !ronde) throw rondeFout;
  const rondeId = ronde.id as string;

  const geuploade: string[] = [];
  const facturen: RondeAangemaakt["facturen"] = [];
  try {
    const afn = afnemer();
    for (const v of voor.voorbereid) {
      const { model, leverancier: l } = v;
      const akkoordDatum = l.akkoord_op ? nlDatum(new Date(l.akkoord_op)) : null;
      const { data: uitbetaling, error } = await supabaseAdmin
        .from("uitbetalingen")
        .insert({
          ronde_id: rondeId,
          medewerker_id: model.medewerker_id,
          volgnummer: model.volgnummer,
          factuur_nummer: model.factuur_nummer,
          factuur_datum: model.factuur_datum,
          status: "in_uitbetaalronde",
          bedrag_excl: centenNaarEuro(model.totalen.excl_centen),
          btw_percentage: model.totalen.btw_percentage,
          btw_bedrag: centenNaarEuro(model.totalen.btw_centen),
          bedrag_incl: centenNaarEuro(model.totalen.incl_centen),
          kor: model.totalen.kor,
          leverancier_naam: l.naam,
          leverancier_adres: l.adres,
          leverancier_postcode: l.postcode,
          leverancier_stad: l.stad,
          leverancier_kvk: l.kvk_nummer,
          leverancier_btw: encryptField(l.btw_nummer),
          afnemer: afn,
          akkoord_versie: l.akkoord_versie,
          akkoord_op: l.akkoord_op,
          iban_versleuteld: encryptField(l.iban),
          iban_laatste4: (l.iban ?? "").slice(-4),
        })
        .select("id")
        .single();
      if (error || !uitbetaling) throw error ?? new Error("Zelffactuur niet opgeslagen");

      const { error: regelFout } = await supabaseAdmin.from("uitbetaling_regels").insert(
        v.items.map((i) => ({
          uitbetaling_id: uitbetaling.id,
          uren_registratie_id: i.uren_registratie_id,
          klant_factuur_id: i.klant_factuur_id,
          datum: i.regel.datum,
          werkgever: i.regel.werkgever,
          omschrijving: i.regel.omschrijving,
          uren: i.regel.uren,
          uurtarief: centenNaarEuro(i.regel.uurtarief_centen),
          uren_bedrag: centenNaarEuro(i.regel.uren_centen),
          toeslag_omschrijving: i.regel.toeslag_omschrijving,
          toeslag_bedrag: centenNaarEuro(i.regel.toeslag_centen),
          reiskosten_km: i.regel.reiskosten_km,
          reiskosten_bedrag: centenNaarEuro(i.regel.reiskosten_centen),
          bedrag: centenNaarEuro(i.regel.bedrag_centen),
        })),
      );
      if (regelFout) throw regelFout;

      const pdf = await renderToBuffer(
        ZelffactuurPDF({
          data: {
            factuur_nummer: model.factuur_nummer,
            factuur_datum: model.factuur_datum,
            leverancier: { naam: l.naam ?? "", adres: l.adres, postcode: l.postcode, stad: l.stad, kvk_nummer: l.kvk_nummer, btw_nummer: l.btw_nummer },
            afnemer: afn,
            regels: model.regels,
            excl_centen: model.totalen.excl_centen,
            btw_percentage: model.totalen.btw_percentage,
            btw_centen: model.totalen.btw_centen,
            incl_centen: model.totalen.incl_centen,
            kor: model.totalen.kor,
            akkoord: { versie: l.akkoord_versie, op: akkoordDatum },
          },
        }),
      );
      const pad = pdfPad(model.medewerker_id, model.factuur_nummer);
      const { error: uploadFout } = await supabaseAdmin.storage
        .from(UITBETALING_BUCKET)
        .upload(pad, pdf, { contentType: "application/pdf", upsert: true });
      if (uploadFout) throw uploadFout;
      geuploade.push(pad);
      const { error: padFout } = await supabaseAdmin.from("uitbetalingen").update({ pdf_pad: pad }).eq("id", uitbetaling.id);
      if (padFout) throw padFout;

      facturen.push({ id: uitbetaling.id as string, factuur_nummer: model.factuur_nummer, medewerker_id: model.medewerker_id, incl_centen: model.totalen.incl_centen });
    }

    const sepaPad = `sepa/${rondeId}.xml`;
    const { error: sepaFout } = await supabaseAdmin.storage
      .from(UITBETALING_BUCKET)
      .upload(sepaPad, Buffer.from(xml, "utf8"), { contentType: "application/xml", upsert: true });
    if (sepaFout) throw sepaFout;
    geuploade.push(sepaPad);

    const totaalCenten = voor.voorbereid.reduce((t, v) => t + v.model.totalen.incl_centen, 0);
    const { data: klaar, error: klaarFout } = await supabaseAdmin
      .from("uitbetaalrondes")
      .update({ status: "aangemaakt", sepa_pad: sepaPad, aantal_betalingen: facturen.length, totaal_bedrag: centenNaarEuro(totaalCenten) })
      .eq("id", rondeId)
      .eq("status", "concept")
      .select("id")
      .maybeSingle();
    if (klaarFout || !klaar) throw klaarFout ?? new Error("Ronde kon niet worden afgerond");

    await logAuditEvent({
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: "uitbetaalronde_aangemaakt",
      targetTable: "uitbetaalrondes",
      targetId: rondeId,
      summary: `Uitbetaalronde ${id} aangemaakt: ${facturen.length} zelffactuur/zelffacturen, totaal € ${centenNaarEuro(totaalCenten).toFixed(2)}`,
      metadata: {
        bericht_id: id,
        uitvoer_datum: input.uitvoerDatum,
        aantal: facturen.length,
        totaal: centenNaarEuro(totaalCenten),
        factuurnummers: facturen.map((f) => f.factuur_nummer),
        uren_ids: urenIds,
      },
    });

    return {
      ok: true,
      ronde: { id: rondeId, bericht_id: id, uitvoer_datum: input.uitvoerDatum, aantal_betalingen: facturen.length, totaal_centen: totaalCenten },
      facturen,
    };
  } catch (e) {
    await ruimConceptRondeOp(rondeId, geuploade);
    const code = (e as { code?: string } | null)?.code;
    if (code === "23505") {
      return fout(409, "al_uitbetaald", "Een deel van deze uren is intussen al in een andere ronde opgenomen. Ververs het overzicht.");
    }
    throw e;
  }
}

export type VerwerktResultaat =
  | { ok: true; uitbetalingen: { id: string; medewerker_id: string | null; factuur_nummer: string; bedrag_incl: number; iban_laatste4: string | null }[] }
  | RondeFout;

/** Admin markeert een ronde als "verwerkt in bank": de zelffacturen staan daarna op uitbetaald. */
export async function markeerRondeVerwerkt(rondeId: string, actor: Actor): Promise<VerwerktResultaat> {
  const { data: ronde, error } = await supabaseAdmin
    .from("uitbetaalrondes")
    .select("id, bericht_id, status, sepa_gedownload_op")
    .eq("id", rondeId)
    .maybeSingle();
  if (error) throw error;
  if (!ronde) return fout(404, "niet_gevonden", "Ronde niet gevonden.");
  if (ronde.status === "verwerkt") return fout(409, "al_verwerkt", "Deze ronde is al als verwerkt gemarkeerd.");
  if (ronde.status !== "aangemaakt") return fout(409, "niet_klaar", "Deze ronde is nog niet klaar.");
  if (!ronde.sepa_gedownload_op) return fout(409, "sepa_niet_gedownload", "Download eerst het SEPA-bestand en upload het in de bank.");

  const nu = new Date().toISOString();
  const { data: bijgewerkt, error: updateFout } = await supabaseAdmin
    .from("uitbetaalrondes")
    .update({ status: "verwerkt", verwerkt_door: actor.email ?? null, verwerkt_op: nu })
    .eq("id", rondeId)
    .eq("status", "aangemaakt")
    .select("id")
    .maybeSingle();
  if (updateFout) throw updateFout;
  if (!bijgewerkt) return fout(409, "al_verwerkt", "Deze ronde is intussen al verwerkt.");

  const { data: uitbetalingen, error: uFout } = await supabaseAdmin
    .from("uitbetalingen")
    .update({ status: "uitbetaald", uitbetaald_op: nu })
    .eq("ronde_id", rondeId)
    .eq("status", "in_uitbetaalronde")
    .select("id, medewerker_id, factuur_nummer, bedrag_incl, iban_laatste4");
  if (uFout) throw uFout;

  await logAuditEvent({
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "uitbetaalronde_verwerkt",
    targetTable: "uitbetaalrondes",
    targetId: rondeId,
    summary: `Uitbetaalronde ${ronde.bericht_id} gemarkeerd als verwerkt in de bank (${uitbetalingen?.length ?? 0} zelffacturen op uitbetaald)`,
    metadata: { bericht_id: ronde.bericht_id, factuurnummers: (uitbetalingen ?? []).map((u) => u.factuur_nummer) },
  });

  return {
    ok: true,
    uitbetalingen: (uitbetalingen ?? []).map((u) => ({
      id: u.id as string,
      medewerker_id: (u.medewerker_id as string | null) ?? null,
      factuur_nummer: u.factuur_nummer as string,
      bedrag_incl: Number(u.bedrag_incl),
      iban_laatste4: (u.iban_laatste4 as string | null) ?? null,
    })),
  };
}
