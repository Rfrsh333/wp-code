import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import { nlDatum } from "@/lib/nl-tijd";
import { bewaarTotVoorMedewerker, haalLaatsteDienstDatum, isMigratieFout, verwijderDiditSessieVanRecord } from "@/lib/id-check/db";
import { idBewaarTot } from "@/lib/id-check/controlerecord";

/**
 * Bewaartermijnen van ID-gegevens volgens de Wav (juridisch advies, 24-10-2026), voor de
 * retentie-cron (api/cron/retentie) en het verwijderen van een account:
 *
 * - controlerecords (`id_verificaties`), ID-bewijzen in `medewerker_documenten` (met of zonder
 *   kopie) en bewaarde kandidaatkopieën van werknemers krijgen bewaar_tot = 31-12 van (jaar laatste
 *   dienst + 5); zonder diensten vanaf het jaar van de beslissing/upload. Elke nacht opnieuw, zodat de
 *   termijn meeschuift zolang iemand werkt;
 * - records na die datum, en onbesliste controles van een verwijderd account, worden opgeruimd.
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
 * Vlak vóór het verwijderen van een account (AVG-verwijderverzoek):
 * - de bewaartermijn van de besliste controlerecords vastzetten met de laatste dienst (daarna zijn de
 *   diensten misschien weg en kan de cron het niet meer uitrekenen). Het record zelf blijft bestaan
 *   (medewerker_id wordt null, on delete set null);
 * - Didit-sessies die nog niet verwijderd zijn met `privacy_erasure` laten wissen (ook met
 *   DIDIT_SESSIE_VERWIJDEREN=0: een verwijderverzoek gaat voor).
 * Fouten blokkeren het verwijderen niet (Sentry); de cron ruimt onbesliste controles later op.
 */
export async function bereidIdGegevensVoorAccountVerwijderen(medewerkerId: string): Promise<void> {
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
}
