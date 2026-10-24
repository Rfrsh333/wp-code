import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import { nlVandaag } from "@/lib/nl-tijd";
import { MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";
import { haalLaatsteDienstDatum, isMigratieFout } from "@/lib/id-check/db";
import { eerVolgensControles } from "@/lib/id-check/controlerecord";
import {
  bewaardDocumentRij,
  bewaarRegel,
  eindeDienstverband,
  isWavVergunning,
  maakOpruimPlan,
  PROFIELFOTO_BUCKET,
  type OpruimDocument,
} from "@/lib/medewerker/bestanden-bij-verwijderen";

/**
 * Bestanden van een werknemer bij het verwijderen van zijn account (regels in
 * lib/medewerker/bestanden-bij-verwijderen). Gebruikt door lib/medewerker/account-verwijderen:
 *
 * 1. Vóór het verwijderen: alle paden verzamelen (documentrijen, de map van de werknemer, de
 *    profielfoto) en bestanden met een bewaartermijn (loonheffingsverklaring, contract, werk- of
 *    verblijfsvergunning van buiten de EER) vastleggen in `bewaarde_documenten` (migratie
 *    20261024_documenten_nawerk.sql). Lukt dat niet, dan gaat het verwijderen niet door: anders
 *    blijft zo'n bestand zonder verwijzing achter.
 * 2. Ná het geslaagde verwijderen: de rest uit de opslag halen. Een fout daarbij gaat naar Sentry;
 *    het account is dan al weg en dat blijft zo.
 * 3. De retentie-cron haalt bewaarde bestanden weg na bewaar_tot (ruimBewaardeDocumentenOp).
 */

const ROUTE = "lib/medewerker/account-bestanden";
const TABEL = "bewaarde_documenten";

export type BestandenVoorbereiding =
  | { ok: true; verwijderen: { bucket: string; paden: string[] }[]; bewaard: number }
  | { ok: false; status: number; fout: string };

/** Volledige paden van de bestanden direct in `<medewerkerId>/`; null als de map niet gelezen kon worden. */
async function mapInhoud(bucket: string, medewerkerId: string): Promise<string[] | null> {
  try {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(medewerkerId, { limit: 1000 });
    if (error) {
      captureRouteError(error, { route: ROUTE, action: "MAP_LEZEN" });
      return null;
    }
    return ((data ?? []) as { name: string; id: string | null }[])
      .filter((f) => !!f.id && !!f.name && f.name !== ".emptyFolderPlaceholder")
      .map((f) => `${medewerkerId}/${f.name}`);
  } catch (fout) {
    captureRouteError(fout, { route: ROUTE, action: "MAP_LEZEN" });
    return null;
  }
}

/** Paden die al elders zijn vastgelegd om te bewaren (Wav-kopieën, eerder bewaarde documenten). null = onbekend. */
async function beschermdePaden(medewerkerId: string): Promise<string[] | null> {
  const paden: string[] = [];
  for (const tabel of ["id_wav_kopieen", TABEL]) {
    const { data, error } = await supabaseAdmin.from(tabel).select("bestand_pad").eq("medewerker_id", medewerkerId);
    if (error) {
      if (isMigratieFout(error)) continue;
      captureRouteError(error, { route: ROUTE, action: "BESCHERMD_LEZEN" });
      return null;
    }
    paden.push(...((data ?? []) as { bestand_pad: string }[]).map((r) => r.bestand_pad));
  }
  return paden;
}

/**
 * Nationaliteit binnen de EER/Zwitserland volgens de ID-controles (zoals #38 voor de ID-kopie);
 * null = onbekend (geen controle die het weet, tabel ontbreekt of lezen mislukt: dan blijft een
 * vergunning bewaard).
 */
async function eerVanMedewerker(medewerkerId: string): Promise<boolean | null> {
  const { data, error } = await supabaseAdmin
    .from("id_verificaties")
    .select("eer, status")
    .eq("medewerker_id", medewerkerId)
    .order("aangemaakt_op", { ascending: false });
  if (error) {
    if (!isMigratieFout(error)) captureRouteError(error, { route: ROUTE, action: "CONTROLES_LEZEN" });
    return null;
  }
  return eerVolgensControles((data ?? []) as { eer: boolean | null; status: string | null }[]);
}

/**
 * Stap 1, vlak vóór het verwijderen. `ok: false` = het account mag NIET worden verwijderd (de
 * documenten konden niet worden gelezen, of een bestand met een bewaartermijn kon niet worden
 * vastgelegd).
 */
export async function bereidBestandenVoorAccountVerwijderen(medewerkerId: string): Promise<BestandenVoorbereiding> {
  const { data: docs, error } = await supabaseAdmin
    .from("medewerker_documenten")
    .select("id, document_type, file_path, file_url, uploaded_at, reviewed_at, review_status, bewaar_tot")
    .eq("medewerker_id", medewerkerId);
  if (error) {
    captureRouteError(error, { route: ROUTE, action: "DOCUMENTEN_LEZEN" });
    return { ok: false, status: 500, fout: "De documenten van deze werknemer konden niet worden gelezen. Probeer het opnieuw." };
  }

  const { data: profiel, error: profielFout } = await supabaseAdmin
    .from("medewerkers")
    .select("naam, profile_photo_path, datum_uit_dienst")
    .eq("id", medewerkerId)
    .maybeSingle();
  if (profielFout) captureRouteError(profielFout, { route: ROUTE, action: "PROFIEL_LEZEN" });
  const p = (profiel ?? {}) as { naam?: string | null; profile_photo_path?: string | null; datum_uit_dienst?: string | null };

  const [beschermd, documentenMap, fotoMap] = await Promise.all([
    beschermdePaden(medewerkerId),
    mapInhoud(MEDEWERKER_DOCUMENTEN_BUCKET, medewerkerId),
    mapInhoud(PROFIELFOTO_BUCKET, medewerkerId),
  ]);

  const documenten = (docs ?? []) as OpruimDocument[];
  const vandaag = nlVandaag();
  let laatsteDienst: string | null = null;
  if (documenten.some((d) => !!bewaarRegel(d.document_type))) {
    try {
      laatsteDienst = await haalLaatsteDienstDatum(medewerkerId, vandaag);
    } catch (fout) {
      // Dan telt de datum uit dienst of vandaag (vergunning: de datum op de documentrij of de
      // goedkeuring/upload, zoals bij de Wav-kopie).
      captureRouteError(fout, { route: ROUTE, action: "LAATSTE_DIENST" });
    }
  }
  const einde = eindeDienstverband({ laatsteDienst, datumUitDienst: p.datum_uit_dienst, vandaag });
  const eer = documenten.some((d) => isWavVergunning(d.document_type)) ? await eerVanMedewerker(medewerkerId) : null;

  const plan = maakOpruimPlan({
    medewerkerId,
    documenten,
    beschermd: beschermd ?? [],
    // Zonder volledige lijst van beschermde paden geen losse bestanden uit de map opruimen.
    mapInhoud: beschermd ? documentenMap : null,
    profielfoto: [...(p.profile_photo_path ? [p.profile_photo_path] : []), ...(fotoMap ?? [])],
    einde,
    eer,
    laatsteDienst,
    vandaag,
  });

  if (plan.bewaren.length > 0) {
    const nu = new Date().toISOString();
    const { error: schrijfFout } = await supabaseAdmin.from(TABEL).upsert(
      plan.bewaren.map((bestand) => bewaardDocumentRij({ medewerkerId, naam: p.naam ?? null, bestand, einde, nu })),
      { onConflict: "bucket,bestand_pad" },
    );
    if (schrijfFout) {
      if (isMigratieFout(schrijfFout)) {
        return {
          ok: false,
          status: 503,
          fout: "Deze werknemer heeft documenten die bewaard moeten blijven (loonheffingsverklaring, contract of vergunning). Draai eerst migratie 20261024_documenten_nawerk.sql en verwijder daarna het account.",
        };
      }
      captureRouteError(schrijfFout, { route: ROUTE, action: "BEWAREN_VASTLEGGEN" });
      return { ok: false, status: 500, fout: "De documenten die bewaard moeten blijven, konden niet worden vastgelegd. Probeer het opnieuw." };
    }
  }

  return { ok: true, verwijderen: plan.verwijderen, bewaard: plan.bewaren.length };
}

/**
 * Stap 2, ná het geslaagde verwijderen: de bestanden uit de opslag halen. Fouten gaan naar Sentry
 * en laten het verwijderen van het account niet mislukken. Geeft het aantal verwijderde bestanden.
 */
export async function verwijderAccountBestanden(verwijderen: readonly { bucket: string; paden: readonly string[] }[]): Promise<number> {
  let aantal = 0;
  for (const { bucket, paden } of verwijderen) {
    for (let i = 0; i < paden.length; i += 100) {
      try {
        const { data, error } = await supabaseAdmin.storage.from(bucket).remove(paden.slice(i, i + 100));
        if (error) {
          captureRouteError(error, { route: ROUTE, action: "OPSLAG_VERWIJDEREN" });
          continue;
        }
        aantal += (data ?? []).length;
      } catch (fout) {
        captureRouteError(fout, { route: ROUTE, action: "OPSLAG_VERWIJDEREN" });
      }
    }
  }
  return aantal;
}

/**
 * Retentie-cron: bewaarde documenten van verwijderde accounts na bewaar_tot opruimen (eerst het
 * bestand, dan de rij; lukt het bestand niet, dan blijft de rij en probeert de cron het later
 * opnieuw). Een rij met medewerker_id bestaat alleen als het verwijderen mislukte na het vastleggen:
 * het bestand hoort dan nog bij de documentrij, dus alleen de rij gaat weg. Niets zonder
 * RETENTION_DELETE=1 (dry-run). `migratie: false` als de tabel nog niet bestaat.
 */
export async function ruimBewaardeDocumentenOp(input: { vandaag: string; dryRun: boolean }): Promise<{ verwijderd: number; migratie: boolean }> {
  const { data, error } = await supabaseAdmin
    .from(TABEL)
    .select("id, medewerker_id, document_type, bucket, bestand_pad, bewaar_tot")
    .lt("bewaar_tot", input.vandaag)
    .limit(1000);
  if (error) {
    if (isMigratieFout(error)) return { verwijderd: 0, migratie: false };
    throw new Error(`Retentie kon ${TABEL} niet lezen: ${error.message}`);
  }

  let verwijderd = 0;
  for (const rij of (data ?? []) as {
    id: string;
    medewerker_id: string | null;
    document_type: string;
    bucket: string;
    bestand_pad: string;
    bewaar_tot: string;
  }[]) {
    if (!input.dryRun) {
      const metBestand = !rij.medewerker_id;
      if (metBestand) {
        const { error: opslagFout } = await supabaseAdmin.storage.from(rij.bucket).remove([rij.bestand_pad]);
        if (opslagFout) {
          captureRouteError(opslagFout, { route: ROUTE, action: "RETENTIE_OPSLAG" });
          continue;
        }
      }
      const { error: rijFout } = await supabaseAdmin.from(TABEL).delete().eq("id", rij.id);
      if (rijFout) {
        captureRouteError(rijFout, { route: ROUTE, action: "RETENTIE_VERWIJDEREN" });
        continue;
      }
      await logAuditEvent({
        action: "retentie_bewaard_document_verwijderd",
        targetTable: TABEL,
        targetId: rij.id,
        summary: metBestand
          ? `Bewaard document (${rij.document_type}) verwijderd na de bewaartermijn (account was al verwijderd)`
          : `Verwijzing naar een bewaard document (${rij.document_type}) verwijderd na de bewaartermijn (het account bestaat nog)`,
        metadata: { bewaar_tot: rij.bewaar_tot, bestand: metBestand ? "verwijderd" : "hoort bij de documentrij" },
      });
    }
    verwijderd += 1;
  }
  return { verwijderd, migratie: true };
}
