import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import { nlDatum, nlVandaag } from "@/lib/nl-tijd";
import { documentOpslagPad, MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";
import { bewaarTotVoorMedewerker, haalLaatsteDienstDatum, isMigratieFout, verwijderDiditSessieVanRecord } from "@/lib/id-check/db";
import { eerVolgensControles, idBewaarTot, kopieBijAccountVerwijderen, wavKopieBewaarTot, wavKopieRij } from "@/lib/id-check/controlerecord";

/**
 * Bewaartermijnen van ID-gegevens volgens de Wav (juridisch advies, 24-10-2026), voor de
 * retentie-cron (api/cron/retentie) en het verwijderen van een account:
 *
 * - controlerecords (`id_verificaties`), ID-bewijzen in `medewerker_documenten` (met of zonder
 *   kopie) en bewaarde kandidaatkopieën van werknemers krijgen bewaar_tot = 31-12 van (jaar laatste
 *   dienst + 5); zonder diensten vanaf het jaar van de beslissing/upload. Elke nacht opnieuw, zodat de
 *   termijn meeschuift zolang iemand werkt;
 * - records na die datum, en onbesliste controles van een verwijderd account, worden opgeruimd;
 * - Wav-kopieën van verwijderde accounts (`id_wav_kopieen`, migratie 20261024_id_wav_kopieen.sql)
 *   blijven tot bewaar_tot en gaan daarna met bestand en al weg (privacyverklaring 2.6, 10f).
 *
 * Net als de rest van de cron: niets schrijven of verwijderen zonder RETENTION_DELETE=1 (dry-run).
 */

const ROUTE = "lib/id-check/bewaartermijn";
const LIMIET = 5000;

type Telling = { id_verificaties: number; medewerker_documenten: number; kandidaat_documenten: number };

/** Laatste dienstdatum per medewerker (een paar tegelijk, één rij per medewerker). */
async function haalLaatsteDienstDatums(ids: readonly string[], vandaag: string): Promise<Map<string, string | null>> {
  const uitkomst = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 5) {
    const blok = ids.slice(i, i + 5);
    const datums = await Promise.all(blok.map((id) => haalLaatsteDienstDatum(id, vandaag)));
    blok.forEach((id, j) => uitkomst.set(id, datums[j]));
  }
  return uitkomst;
}

function datumNl(tijdstip: string | null | undefined): string | null {
  if (!tijdstip) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(tijdstip)) return tijdstip;
  const d = new Date(tijdstip);
  return Number.isNaN(d.getTime()) ? null : nlDatum(d);
}

/**
 * Stap A: bewaar_tot bijwerken. Geeft per tabel het aantal rijen waarvan de termijn verandert (in
 * dry-run: zou veranderen). `migratie: false` als id_verificaties de kolom nog niet heeft.
 */
export async function werkIdBewaartermijnenBij(input: { vandaag: string; dryRun: boolean }): Promise<Telling & { migratie: boolean }> {
  const { vandaag, dryRun } = input;
  const telling: Telling & { migratie: boolean } = { id_verificaties: 0, medewerker_documenten: 0, kandidaat_documenten: 0, migratie: true };

  const records = await supabaseAdmin
    .from("id_verificaties")
    .select("id, medewerker_id, beslist_op, aangemaakt_op, bewaar_tot")
    .not("medewerker_id", "is", null)
    .limit(LIMIET);
  if (records.error) {
    if (!isMigratieFout(records.error)) throw new Error(`Retentie kon id_verificaties niet lezen: ${records.error.message}`);
    telling.migratie = false;
  }

  const documenten = await supabaseAdmin
    .from("medewerker_documenten")
    .select("id, medewerker_id, reviewed_at, uploaded_at, bewaar_tot")
    .eq("document_type", "id_bewijs")
    .limit(LIMIET);
  if (documenten.error) throw new Error(`Retentie kon medewerker_documenten niet lezen: ${documenten.error.message}`);

  // Alleen kandidaatkopieën die bij het opschonen bewust zijn bewaard (Wav): die hebben een bewaar_tot.
  const kandidaat = await supabaseAdmin
    .from("kandidaat_documenten")
    .select("id, reviewed_at, uploaded_at, bewaar_tot, inschrijving:inschrijvingen!inschrijving_id(medewerker_id)")
    .eq("type", "id")
    .not("bewaar_tot", "is", null)
    .limit(LIMIET);
  if (kandidaat.error) throw new Error(`Retentie kon kandidaat_documenten niet lezen: ${kandidaat.error.message}`);

  type Rij = { tabel: keyof Telling; id: string; medewerkerId: string; beslisdatum: string; bewaarTot: string | null };
  const rijen: Rij[] = [];
  for (const r of (records.data ?? []) as {
    id: string;
    medewerker_id: string | null;
    beslist_op: string | null;
    aangemaakt_op: string;
    bewaar_tot: string | null;
  }[]) {
    if (!r.medewerker_id) continue;
    rijen.push({
      tabel: "id_verificaties",
      id: r.id,
      medewerkerId: r.medewerker_id,
      beslisdatum: datumNl(r.beslist_op ?? r.aangemaakt_op) ?? vandaag,
      bewaarTot: r.bewaar_tot,
    });
  }
  for (const d of (documenten.data ?? []) as {
    id: string;
    medewerker_id: string;
    reviewed_at: string | null;
    uploaded_at: string | null;
    bewaar_tot: string | null;
  }[]) {
    rijen.push({
      tabel: "medewerker_documenten",
      id: d.id,
      medewerkerId: d.medewerker_id,
      beslisdatum: datumNl(d.reviewed_at ?? d.uploaded_at) ?? vandaag,
      bewaarTot: d.bewaar_tot,
    });
  }
  for (const k of (kandidaat.data ?? []) as unknown as {
    id: string;
    reviewed_at: string | null;
    uploaded_at: string | null;
    bewaar_tot: string | null;
    inschrijving: { medewerker_id: string | null } | { medewerker_id: string | null }[] | null;
  }[]) {
    const inschrijving = Array.isArray(k.inschrijving) ? k.inschrijving[0] : k.inschrijving;
    if (!inschrijving?.medewerker_id) continue;
    rijen.push({
      tabel: "kandidaat_documenten",
      id: k.id,
      medewerkerId: inschrijving.medewerker_id,
      beslisdatum: datumNl(k.reviewed_at ?? k.uploaded_at) ?? vandaag,
      bewaarTot: k.bewaar_tot,
    });
  }

  const laatste = await haalLaatsteDienstDatums([...new Set(rijen.map((r) => r.medewerkerId))], vandaag);
  for (const rij of rijen) {
    const nieuw = idBewaarTot({ laatsteDienst: laatste.get(rij.medewerkerId) ?? null, beslisdatum: rij.beslisdatum });
    if (nieuw === rij.bewaarTot) continue;
    if (!dryRun) {
      const { error } = await supabaseAdmin.from(rij.tabel).update({ bewaar_tot: nieuw }).eq("id", rij.id);
      if (error) {
        captureRouteError(error, { route: ROUTE, action: "BEWAAR_TOT" });
        continue;
      }
    }
    telling[rij.tabel] += 1;
  }
  return telling;
}

/**
 * Verwijder de Didit-sessie (met beelden) als dat nog niet is gebeurd, als privacy erasure (het
 * account is weg of de termijn is voorbij). false = mislukt, de cron probeert het later opnieuw.
 */
async function diditSessieWeg(rij: { id: string; didit_session_id: string | null; sessie_verwijderd_op: string | null }): Promise<boolean> {
  if (!rij.didit_session_id || rij.sessie_verwijderd_op) return true;
  try {
    await verwijderDiditSessieVanRecord({ verificatieId: rij.id, sessionId: rij.didit_session_id, privacyErasure: true });
    return true;
  } catch (fout) {
    captureRouteError(fout, { route: ROUTE, action: "DIDIT_VERWIJDEREN" });
    return false;
  }
}

/**
 * Stap B: controlerecords opruimen. Verlopen records (bewaar_tot < vandaag) en onbesliste controles
 * waarvan het account weg is (geen beslissing = geen controlerecord, dus geen grondslag). Elke
 * verwijdering komt in de audit-log.
 */
export async function ruimIdControlerecordsOp(input: { vandaag: string; dryRun: boolean }): Promise<{
  verlopen: number;
  zonder_account: number;
  migratie: boolean;
}> {
  const { vandaag, dryRun } = input;
  const kolommen = "id, status, methode, bewaar_tot, didit_session_id, sessie_verwijderd_op";
  const verlopen = await supabaseAdmin.from("id_verificaties").select(kolommen).not("bewaar_tot", "is", null).lt("bewaar_tot", vandaag).limit(1000);
  if (verlopen.error) {
    if (isMigratieFout(verlopen.error)) return { verlopen: 0, zonder_account: 0, migratie: false };
    throw new Error(`Retentie kon id_verificaties niet lezen: ${verlopen.error.message}`);
  }
  const zonderAccount = await supabaseAdmin
    .from("id_verificaties")
    .select(kolommen)
    .is("medewerker_id", null)
    .not("status", "in", "(goedgekeurd,afgewezen)")
    .limit(1000);
  if (zonderAccount.error) throw new Error(`Retentie kon id_verificaties niet lezen: ${zonderAccount.error.message}`);

  type RecordRij = {
    id: string;
    status: string;
    methode: string;
    bewaar_tot: string | null;
    didit_session_id: string | null;
    sessie_verwijderd_op: string | null;
  };
  const telling = { verlopen: 0, zonder_account: 0, migratie: true };
  const groepen: [keyof typeof telling & ("verlopen" | "zonder_account"), RecordRij[]][] = [
    ["verlopen", (verlopen.data ?? []) as RecordRij[]],
    ["zonder_account", (zonderAccount.data ?? []) as RecordRij[]],
  ];
  const gezien = new Set<string>();
  for (const [soort, lijst] of groepen) {
    for (const rij of lijst) {
      if (gezien.has(rij.id)) continue;
      gezien.add(rij.id);
      if (!dryRun) {
        if (!(await diditSessieWeg(rij))) continue;
        const { error } = await supabaseAdmin.from("id_verificaties").delete().eq("id", rij.id);
        if (error) {
          captureRouteError(error, { route: ROUTE, action: "VERWIJDEREN" });
          continue;
        }
        await logAuditEvent({
          action: "retentie_id_controlerecord_verwijderd",
          targetTable: "id_verificaties",
          targetId: rij.id,
          summary:
            soort === "verlopen"
              ? "ID-controlerecord verwijderd na de Wav-bewaartermijn"
              : "Onbesliste ID-controle van een verwijderd account verwijderd",
          metadata: { status: rij.status, methode: rij.methode, bewaar_tot: rij.bewaar_tot },
        });
      }
      telling[soort] += 1;
    }
  }
  return telling;
}

/**
 * Stap C: Wav-kopieën van verwijderde accounts opruimen na bewaar_tot: eerst het bestand uit de
 * opslag, dan de rij (lukt het bestand niet, dan blijft de rij en probeert de cron het later opnieuw).
 * Een rij met medewerker_id bestaat alleen als het verwijderen van het account mislukte na het
 * vastleggen; het bestand hoort dan nog bij de documentrij (met een eigen termijn), dus alleen de rij
 * gaat weg. `migratie: false` als de tabel nog niet bestaat.
 */
export async function ruimWavKopieenOp(input: { vandaag: string; dryRun: boolean }): Promise<{ verwijderd: number; migratie: boolean }> {
  const { vandaag, dryRun } = input;
  const { data, error } = await supabaseAdmin
    .from("id_wav_kopieen")
    .select("id, medewerker_id, bestand_pad, bewaar_tot")
    .lt("bewaar_tot", vandaag)
    .limit(1000);
  if (error) {
    if (isMigratieFout(error)) return { verwijderd: 0, migratie: false };
    throw new Error(`Retentie kon id_wav_kopieen niet lezen: ${error.message}`);
  }

  let verwijderd = 0;
  for (const rij of (data ?? []) as { id: string; medewerker_id: string | null; bestand_pad: string; bewaar_tot: string }[]) {
    if (!dryRun) {
      const metBestand = !rij.medewerker_id;
      if (metBestand) {
        const { error: opslagFout } = await supabaseAdmin.storage.from(MEDEWERKER_DOCUMENTEN_BUCKET).remove([rij.bestand_pad]);
        if (opslagFout) {
          captureRouteError(opslagFout, { route: ROUTE, action: "WAV_KOPIE_OPSLAG" });
          continue;
        }
      }
      const { error: rijFout } = await supabaseAdmin.from("id_wav_kopieen").delete().eq("id", rij.id);
      if (rijFout) {
        captureRouteError(rijFout, { route: ROUTE, action: "WAV_KOPIE_VERWIJDEREN" });
        continue;
      }
      await logAuditEvent({
        action: "retentie_id_kopie_verwijderd",
        targetTable: "id_wav_kopieen",
        targetId: rij.id,
        summary: metBestand
          ? "Wav-kopie van het ID verwijderd na de bewaartermijn (account was al verwijderd)"
          : "Verwijzing naar een Wav-kopie verwijderd na de bewaartermijn (het account bestaat nog)",
        metadata: { bewaar_tot: rij.bewaar_tot, bestand: metBestand ? "verwijderd" : "hoort bij de documentrij" },
      });
    }
    verwijderd += 1;
  }
  return { verwijderd, migratie: true };
}

export type AccountVerwijderVoorbereiding =
  | {
      ok: true;
      /** Opslagpaden van ID-kopieën zonder grondslag (EER/Zwitserland, afgekeurd): weg ná het verwijderen. */
      teVerwijderenKopieen: string[];
      /** Aantal Wav-kopieën dat in id_wav_kopieen is vastgelegd en blijft. */
      bewaardeKopieen: number;
    }
  | { ok: false; status: number; fout: string };

type IdKopieRij = {
  id: string;
  file_path: string | null;
  file_url: string | null;
  verificatie_methode: string | null;
  review_status: string | null;
  reviewed_at: string | null;
  uploaded_at: string | null;
  expiry_date: string | null;
  bewaar_tot: string | null;
};

/**
 * ID-kopieën (id_bewijs mét bestand) vóór het verwijderen van een account: Wav-kopieën vastleggen in
 * id_wav_kopieen (het bestand blijft staan), de rest klaarzetten om ná het verwijderen uit de opslag
 * te halen. Geeft een fout (en dan gaat het verwijderen niet door) als een kopie verloren zou gaan:
 * lezen of vastleggen mislukt, de migratie ontbreekt, of de nationaliteit is onbekend.
 */
async function bereidIdKopieenVoor(medewerkerId: string): Promise<AccountVerwijderVoorbereiding> {
  const { data: docs, error } = await supabaseAdmin
    .from("medewerker_documenten")
    .select("id, file_path, file_url, verificatie_methode, review_status, reviewed_at, uploaded_at, expiry_date, bewaar_tot")
    .eq("medewerker_id", medewerkerId)
    .eq("document_type", "id_bewijs")
    .or("file_path.not.is.null,file_url.not.is.null");
  if (error) {
    captureRouteError(error, { route: ROUTE, action: "KOPIEEN_LEZEN" });
    return { ok: false, status: 500, fout: "De ID-documenten van deze werknemer konden niet worden gelezen. Probeer het opnieuw." };
  }
  const kopieen = (docs ?? []) as IdKopieRij[];
  if (kopieen.length === 0) return { ok: true, teVerwijderenKopieen: [], bewaardeKopieen: 0 };

  const { data: controles, error: controleFout } = await supabaseAdmin
    .from("id_verificaties")
    .select("id, eer, status")
    .eq("medewerker_id", medewerkerId)
    .order("aangemaakt_op", { ascending: false });
  if (controleFout && !isMigratieFout(controleFout)) {
    captureRouteError(controleFout, { route: ROUTE, action: "KOPIEEN_LEZEN" });
    return { ok: false, status: 500, fout: "De ID-controles van deze werknemer konden niet worden gelezen. Probeer het opnieuw." };
  }
  const rijen = (controleFout ? [] : (controles ?? [])) as { id: string; eer: boolean | null; status: string | null }[];
  const eer = eerVolgensControles(rijen);

  const bewaren: { doc: IdKopieRij; pad: string }[] = [];
  const teVerwijderen: string[] = [];
  for (const doc of kopieen) {
    const pad = documentOpslagPad(doc);
    const keuze = kopieBijAccountVerwijderen({ verificatieMethode: doc.verificatie_methode, reviewStatus: doc.review_status, eer });
    if (keuze === "beoordelen") {
      return {
        ok: false,
        status: 409,
        fout: "Deze werknemer heeft een kopie van zijn ID waarvan de nationaliteit niet bekend is. Beoordeel die eerst bij 'Oude ID-kopieën opschonen' (bewaren volgens de Wav of verwijderen) en verwijder daarna het account.",
      };
    }
    if (keuze === "bewaren") {
      if (!pad) {
        return {
          ok: false,
          status: 409,
          fout: "Deze werknemer heeft een Wav-kopie van zijn ID buiten de opslag van TopTalent (externe link). Die kan niet automatisch bewaard blijven; neem contact op met de beheerder.",
        };
      }
      bewaren.push({ doc, pad });
    } else if (pad) {
      teVerwijderen.push(pad);
    }
  }
  if (bewaren.length === 0) return { ok: true, teVerwijderenKopieen: teVerwijderen, bewaardeKopieen: 0 };

  // Bewaar-tot vastzetten met de laatste dienst: na het verwijderen kan de cron dat niet meer.
  let laatsteDienst: string | null = null;
  try {
    laatsteDienst = await haalLaatsteDienstDatum(medewerkerId);
  } catch (fout) {
    // Dan de datum op de documentrij (elke nacht met de laatste dienst bijgewerkt), zie wavKopieBewaarTot.
    captureRouteError(fout, { route: ROUTE, action: "LAATSTE_DIENST" });
  }
  const { data: medewerker } = await supabaseAdmin.from("medewerkers").select("naam").eq("id", medewerkerId).maybeSingle();
  const naam = (medewerker as { naam?: string | null } | null)?.naam ?? null;
  const record = rijen.find((r) => r.eer === false && r.status === "goedgekeurd") ?? rijen.find((r) => r.eer === false) ?? null;
  const vandaag = nlVandaag();
  const nu = new Date().toISOString();

  const { error: schrijfFout } = await supabaseAdmin.from("id_wav_kopieen").upsert(
    bewaren.map(({ doc, pad }) =>
      wavKopieRij({
        medewerkerId,
        idVerificatieId: record?.id ?? null,
        naam,
        pad,
        vervaldatum: doc.expiry_date,
        geuploadOp: doc.uploaded_at,
        bewaarTot: wavKopieBewaarTot({
          laatsteDienst,
          beslisdatum: datumNl(doc.reviewed_at ?? doc.uploaded_at) ?? vandaag,
          huidig: doc.bewaar_tot,
        }),
        nu,
      }),
    ),
    { onConflict: "bestand_pad" },
  );
  if (schrijfFout) {
    if (isMigratieFout(schrijfFout)) {
      return {
        ok: false,
        status: 503,
        fout: "Deze werknemer heeft een kopie van zijn ID die volgens de Wav bewaard moet blijven. Draai eerst migratie 20261024_id_wav_kopieen.sql en verwijder daarna het account.",
      };
    }
    captureRouteError(schrijfFout, { route: ROUTE, action: "WAV_KOPIE_VASTLEGGEN" });
    return { ok: false, status: 500, fout: "De Wav-kopie van het ID kon niet worden vastgelegd. Probeer het opnieuw." };
  }
  return { ok: true, teVerwijderenKopieen: teVerwijderen, bewaardeKopieen: bewaren.length };
}

/**
 * Vlak vóór het verwijderen van een account (AVG-verwijderverzoek). Gebruik dit (via
 * lib/medewerker/account-verwijderen) in elke route die een medewerker verwijdert.
 * - ID-kopieën: een Wav-kopie (buiten de EER) blijft tot bewaar_tot, vastgelegd in id_wav_kopieen;
 *   het bestand blijft staan. Andere kopieën komen in `teVerwijderenKopieen` (ná het verwijderen weg).
 *   Kan dat niet veilig, dan `ok: false` en mag het account NIET worden verwijderd;
 * - de bewaartermijn van de besliste controlerecords vastzetten met de laatste dienst (daarna zijn de
 *   diensten misschien weg en kan de cron het niet meer uitrekenen). Het record zelf blijft bestaan
 *   (medewerker_id wordt null, on delete set null);
 * - Didit-sessies die nog niet verwijderd zijn met `privacy_erasure` laten wissen (ook met
 *   DIDIT_SESSIE_VERWIJDEREN=0: een verwijderverzoek gaat voor).
 * Fouten bij de laatste twee blokkeren het verwijderen niet (Sentry); de cron ruimt onbesliste
 * controles later op.
 */
export async function bereidIdGegevensVoorAccountVerwijderen(medewerkerId: string): Promise<AccountVerwijderVoorbereiding> {
  const kopieen = await bereidIdKopieenVoor(medewerkerId);
  if (!kopieen.ok) return kopieen;

  try {
    const bewaarTot = await bewaarTotVoorMedewerker(medewerkerId);
    const { error } = await supabaseAdmin
      .from("id_verificaties")
      .update({ bewaar_tot: bewaarTot })
      .eq("medewerker_id", medewerkerId)
      .in("status", ["goedgekeurd", "afgewezen"]);
    if (error && !isMigratieFout(error)) captureRouteError(error, { route: ROUTE, action: "VASTLEGGEN" });

    const { data: sessies, error: leesFout } = await supabaseAdmin
      .from("id_verificaties")
      .select("id, didit_session_id, sessie_verwijderd_op")
      .eq("medewerker_id", medewerkerId)
      .not("didit_session_id", "is", null)
      .is("sessie_verwijderd_op", null);
    if (leesFout) throw leesFout;
    for (const rij of (sessies ?? []) as { id: string; didit_session_id: string | null; sessie_verwijderd_op: string | null }[]) {
      await diditSessieWeg(rij);
    }
  } catch (fout) {
    captureRouteError(fout, { route: ROUTE, action: "ACCOUNT_VERWIJDEREN" });
  }
  return kopieen;
}

/**
 * Ná het verwijderen van het account: ID-kopieën zonder grondslag (EER/Zwitserland, afgekeurd) uit
 * de opslag halen (de documentrijen zijn met het account weg). Mislukt dat, dan Sentry; het
 * verwijderen zelf is dan al gebeurd. Geeft het aantal verwijderde bestanden.
 */
export async function verwijderIdKopieBestanden(paden: readonly string[]): Promise<number> {
  if (paden.length === 0) return 0;
  const { data, error } = await supabaseAdmin.storage.from(MEDEWERKER_DOCUMENTEN_BUCKET).remove([...paden]);
  if (error) {
    captureRouteError(error, { route: ROUTE, action: "KOPIE_OPSLAG_VERWIJDEREN" });
    return 0;
  }
  return (data ?? []).length;
}
