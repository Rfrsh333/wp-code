import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildDocumentVerlooptHtml } from "@/lib/email-templates";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";
import { documentTypeLabel } from "@/lib/medewerker/documenten";
import { idVervalActieVoorMedewerker } from "@/lib/id-check/actief";
import { isMigratieFout } from "@/lib/id-check/db";
import { nlVandaag, plusDagen } from "@/lib/nl-tijd";
import {
  EERSTE_MIJLPAAL_DAGEN,
  idControleVervangtDocument,
  moetVervalMailSturen,
  nieuwsteGeldigeVersies,
  VERLOPEN_TERUGKIJKEN_DAGEN,
  vervalMailOnderwerp,
  vervalMijlpaal,
  vervalMijlpaalOpDeDag,
  vervalSleutel,
  type IdControleVoorVerval,
  type VervalBron,
  type VervalMailSoort,
  type VervalMijlpaal,
} from "@/lib/medewerker/verval-meldingen";

/**
 * Dagelijkse vervalmail voor documenten, certificeringen en werkvergunningen (regels in
 * lib/medewerker/verval-meldingen):
 * - per document hooguit één mail per mijlpaal (30 dagen, 7 dagen, net verlopen), vastgelegd in
 *   `document_verval_meldingen` (migratie 20261024_documenten_nawerk.sql). Zonder die tabel alleen
 *   op de dag van de mijlpaal zelf;
 * - alleen de nieuwste versie per documentsoort telt; bij het ID-bewijs ook niet als er een
 *   goedgekeurde ID-controle (Didit/videocall) van een later verlopend ID is;
 * - ID-bewijs met de ID-controle via Didit aan (en geen Wav-kopie nodig): opnieuw laten controleren,
 *   niet uploaden (idVervalActieVoorMedewerker).
 */

const ROUTE = "/api/cron/document-expiry";
const MELDINGEN = "document_verval_meldingen";

type Medewerker = { naam: string | null; email: string | null };

type Kandidaat = {
  bron: VervalBron;
  bronId: string;
  medewerkerId: string;
  vervaldatum: string;
  medewerker: Medewerker | null;
  soort: Exclude<VervalMailSoort, "id_controle">;
  /** Documentsoort of naam van de certificering, zoals in de mail. */
  label: string;
  /** Bij een medewerkerdocument: het documenttype (id_bewijs krijgt mogelijk de Didit-tekst). */
  documentType?: string;
};

function enkel<T>(waarde: unknown): T | null {
  const w = Array.isArray(waarde) ? waarde[0] : waarde;
  return (w as T | undefined) ?? null;
}

function datumTekst(datum: string): string {
  return new Date(`${datum.slice(0, 10)}T12:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

function blokken<T>(lijst: readonly T[], grootte = 100): T[][] {
  const uit: T[][] = [];
  for (let i = 0; i < lijst.length; i += grootte) uit.push(lijst.slice(i, i + grootte));
  return uit;
}

/** Bestaat document_verval_meldingen? Zo niet (migratie nog niet gedraaid), dan alleen mailen op de dag zelf. */
async function meldingenOpslagBeschikbaar(): Promise<boolean> {
  const { error } = await supabaseAdmin.from(MELDINGEN).select("id").limit(1);
  if (!error) return true;
  if (!isMigratieFout(error)) captureRouteError(error, { route: ROUTE, action: "MELDINGEN_LEZEN" });
  return false;
}

/** Al verstuurde mijlpalen per vervalSleutel. */
async function haalVerstuurd(kandidaten: readonly Kandidaat[]): Promise<Map<string, string[]>> {
  const verstuurd = new Map<string, string[]>();
  const ids = [...new Set(kandidaten.map((k) => k.bronId))];
  for (const blok of blokken(ids)) {
    const { data, error } = await supabaseAdmin.from(MELDINGEN).select("bron, bron_id, vervaldatum, mijlpaal").in("bron_id", blok);
    if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });
    for (const r of (data ?? []) as { bron: VervalBron; bron_id: string; vervaldatum: string; mijlpaal: string }[]) {
      const sleutel = vervalSleutel(r.bron, r.bron_id, r.vervaldatum);
      verstuurd.set(sleutel, [...(verstuurd.get(sleutel) ?? []), r.mijlpaal]);
    }
  }
  return verstuurd;
}

/** Medewerkerdocumenten met een vervaldatum in het venster, alleen de nieuwste geldige versie per soort. */
async function documentKandidaten(van: string, tot: string, vandaag: string): Promise<Kandidaat[]> {
  const { data, error } = await supabaseAdmin
    .from("medewerker_documenten")
    .select("id, document_type, expiry_date, medewerker_id, uploaded_at, review_status, medewerkers(naam, email)")
    .not("expiry_date", "is", null)
    .gte("expiry_date", van)
    .lte("expiry_date", tot)
    .limit(1000);
  if (error) {
    captureRouteError(error, { route: ROUTE, action: "DOCUMENTEN_LEZEN" });
    return [];
  }
  type Rij = {
    id: string;
    document_type: string;
    expiry_date: string;
    medewerker_id: string;
    uploaded_at: string | null;
    review_status: string | null;
    medewerkers: unknown;
  };
  const rijen = (data ?? []) as Rij[];
  if (rijen.length === 0) return [];

  // Alle versies van dezelfde soorten bij deze werknemers: is er een nieuwere, dan geen mail.
  const medewerkerIds = [...new Set(rijen.map((r) => r.medewerker_id))];
  const soorten = [...new Set(rijen.map((r) => r.document_type))];
  const versies: { id: string; medewerker_id: string; document_type: string; expiry_date: string | null; uploaded_at: string | null; review_status: string | null }[] = [];
  for (const blok of blokken(medewerkerIds)) {
    const res = await supabaseAdmin
      .from("medewerker_documenten")
      .select("id, medewerker_id, document_type, expiry_date, uploaded_at, review_status")
      .in("medewerker_id", blok)
      .in("document_type", soorten)
      .limit(5000);
    if (res.error) {
      captureRouteError(res.error, { route: ROUTE, action: "VERSIES_LEZEN" });
      return [];
    }
    versies.push(...((res.data ?? []) as typeof versies));
  }
  const nieuwste = new Set(nieuwsteGeldigeVersies(versies).map((d) => d.id));

  // Goedgekeurde ID-controles (Didit/videocall) van werknemers met een verlopend ID-bewijs.
  const metId = [...new Set(rijen.filter((r) => r.document_type === "id_bewijs").map((r) => r.medewerker_id))];
  const controles = new Map<string, IdControleVoorVerval[]>();
  for (const blok of blokken(metId)) {
    const res = await supabaseAdmin
      .from("id_verificaties")
      .select("medewerker_id, status, vervaldatum, beslist_op")
      .in("medewerker_id", blok)
      .eq("status", "goedgekeurd");
    if (res.error) {
      if (!isMigratieFout(res.error)) captureRouteError(res.error, { route: ROUTE, action: "ID_CONTROLES_LEZEN" });
      break;
    }
    for (const c of (res.data ?? []) as (IdControleVoorVerval & { medewerker_id: string })[]) {
      controles.set(c.medewerker_id, [...(controles.get(c.medewerker_id) ?? []), c]);
    }
  }

  return rijen
    .filter((r) => nieuwste.has(r.id))
    .filter((r) => r.document_type !== "id_bewijs" || !idControleVervangtDocument(r, controles.get(r.medewerker_id) ?? [], vandaag))
    .map((r) => ({
      bron: "medewerker_document" as const,
      bronId: r.id,
      medewerkerId: r.medewerker_id,
      vervaldatum: r.expiry_date.slice(0, 10),
      medewerker: enkel<Medewerker>(r.medewerkers),
      soort: "document" as const,
      label: r.document_type === "id_bewijs" ? "ID-bewijs" : documentTypeLabel(r.document_type),
      documentType: r.document_type,
    }));
}

/** Certificeringen met een vervaldatum in het venster, alleen de nieuwste per naam per werknemer. */
async function certificeringKandidaten(van: string, tot: string): Promise<Kandidaat[]> {
  const { data, error } = await supabaseAdmin
    .from("certificeringen")
    .select("id, naam, verloopt_op, medewerker_id, created_at, medewerkers(naam, email)")
    .not("verloopt_op", "is", null)
    .gte("verloopt_op", van)
    .lte("verloopt_op", tot)
    .limit(1000);
  if (error) {
    if (!isMigratieFout(error)) captureRouteError(error, { route: ROUTE, action: "CERTIFICERINGEN_LEZEN" });
    return [];
  }
  type Rij = { id: string; naam: string; verloopt_op: string; medewerker_id: string; created_at: string | null; medewerkers: unknown };
  const rijen = (data ?? []) as Rij[];
  if (rijen.length === 0) return [];

  const versies: { id: string; medewerker_id: string; naam: string; verloopt_op: string | null; created_at: string | null }[] = [];
  for (const blok of blokken([...new Set(rijen.map((r) => r.medewerker_id))])) {
    const res = await supabaseAdmin.from("certificeringen").select("id, medewerker_id, naam, verloopt_op, created_at").in("medewerker_id", blok).limit(5000);
    if (res.error) {
      captureRouteError(res.error, { route: ROUTE, action: "CERTIFICERINGEN_LEZEN" });
      return [];
    }
    versies.push(...((res.data ?? []) as typeof versies));
  }
  const nieuwste = new Set(
    nieuwsteGeldigeVersies(
      versies.map((v) => ({
        id: v.id,
        medewerker_id: v.medewerker_id,
        document_type: v.naam.trim().toLowerCase(),
        expiry_date: v.verloopt_op,
        uploaded_at: v.created_at,
      })),
    ).map((v) => v.id),
  );

  return rijen
    .filter((r) => nieuwste.has(r.id))
    .map((r) => ({
      bron: "certificering" as const,
      bronId: r.id,
      medewerkerId: r.medewerker_id,
      vervaldatum: r.verloopt_op.slice(0, 10),
      medewerker: enkel<Medewerker>(r.medewerkers),
      soort: "certificering" as const,
      label: r.naam,
    }));
}

/** medewerkers.werkvergunning_geldig_tot (kolom bestaat niet overal; dan niets). */
async function werkvergunningKandidaten(van: string, tot: string): Promise<Kandidaat[]> {
  const { data, error } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, email, werkvergunning_geldig_tot")
    .not("werkvergunning_geldig_tot", "is", null)
    .gte("werkvergunning_geldig_tot", van)
    .lte("werkvergunning_geldig_tot", tot)
    .limit(1000);
  if (error) {
    if (!isMigratieFout(error)) captureRouteError(error, { route: ROUTE, action: "WERKVERGUNNINGEN_LEZEN" });
    return [];
  }
  return ((data ?? []) as { id: string; naam: string | null; email: string | null; werkvergunning_geldig_tot: string }[]).map((m) => ({
    bron: "werkvergunning" as const,
    bronId: m.id,
    medewerkerId: m.id,
    vervaldatum: m.werkvergunning_geldig_tot.slice(0, 10),
    medewerker: { naam: m.naam, email: m.email },
    soort: "werkvergunning" as const,
    label: "Werkvergunning",
  }));
}

/** Leg de mijlpaal vast vóór het versturen (één mail, ook als twee runs tegelijk lopen). null = al geclaimd of fout. */
async function claimMijlpaal(k: Kandidaat, mijlpaal: VervalMijlpaal): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from(MELDINGEN)
    .insert({ medewerker_id: k.medewerkerId, bron: k.bron, bron_id: k.bronId, vervaldatum: k.vervaldatum, mijlpaal })
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code !== "23505") captureRouteError(error, { route: ROUTE, action: "MIJLPAAL_VASTLEGGEN" });
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

async function verstuur(k: Kandidaat, mijlpaal: VervalMijlpaal): Promise<boolean> {
  const email = k.medewerker?.email;
  if (!email) return false;
  // ID-bewijs met de ID-controle via Didit aan (en geen Wav-kopie nodig): opnieuw laten controleren
  // in het portaal (Didit of videocall), niet uploaden. Anders blijft het uploaden.
  const idControle = k.documentType === "id_bewijs" && (await idVervalActieVoorMedewerker(k.medewerkerId)) === "id_controle";
  const soort: VervalMailSoort = idControle ? "id_controle" : k.soort;
  const verlopen = mijlpaal === "verlopen";
  const resultaat = await sendEmail({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [email],
    subject: vervalMailOnderwerp({ soort, naam: k.label, mijlpaal }),
    html: buildDocumentVerlooptHtml({
      naam: k.medewerker?.naam || "",
      documentType: k.soort === "certificering" ? `Certificering: ${k.label}` : k.label,
      verloopDatum: datumTekst(k.vervaldatum),
      idControle,
      verlopen,
    }),
  });
  if (resultaat.error) {
    captureRouteError(new Error(`Vervalmail niet verstuurd: ${resultaat.error.message}`), { route: ROUTE, action: "VERSTUREN" });
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-document-expiry", async () => {
    try {
      const vandaag = nlVandaag();
      const van = plusDagen(vandaag, -VERLOPEN_TERUGKIJKEN_DAGEN);
      const tot = plusDagen(vandaag, EERSTE_MIJLPAAL_DAGEN);
      const opslag = await meldingenOpslagBeschikbaar();

      const kandidaten = [
        ...(await documentKandidaten(van, tot, vandaag)),
        ...(await certificeringKandidaten(van, tot)),
        ...(await werkvergunningKandidaten(van, tot)),
      ];
      const verstuurd = opslag ? await haalVerstuurd(kandidaten) : new Map<string, string[]>();

      let sent = 0;
      let overgeslagen = 0;
      // Eén werkvergunningmail per werknemer per run (document én profielveld).
      const werkvergunningGemaild = new Set<string>();
      for (const k of kandidaten) {
        const mijlpaal = opslag ? vervalMijlpaal(k.vervaldatum, vandaag) : vervalMijlpaalOpDeDag(k.vervaldatum, vandaag);
        if (!mijlpaal || !k.medewerker?.email) continue;
        if (opslag && !moetVervalMailSturen(mijlpaal, verstuurd.get(vervalSleutel(k.bron, k.bronId, k.vervaldatum)) ?? [])) {
          overgeslagen += 1;
          continue;
        }
        const isWerkvergunning = k.bron === "werkvergunning" || k.documentType === "werkvergunning";
        if (isWerkvergunning && werkvergunningGemaild.has(k.medewerkerId)) {
          // Al gemaild via de andere bron: deze mijlpaal ook vastleggen, anders volgt hij morgen alsnog.
          if (opslag) await claimMijlpaal(k, mijlpaal);
          continue;
        }

        let claim: string | null = null;
        try {
          if (opslag) {
            claim = await claimMijlpaal(k, mijlpaal);
            if (!claim) {
              overgeslagen += 1;
              continue;
            }
          }
          if (await verstuur(k, mijlpaal)) {
            sent += 1;
            claim = null;
            if (isWerkvergunning) werkvergunningGemaild.add(k.medewerkerId);
          }
        } catch (err) {
          captureRouteError(err, { route: ROUTE, action: "GET" });
        }
        // Niet verstuurd: de claim weer weg, zodat de cron het morgen opnieuw probeert.
        if (claim) {
          const { error } = await supabaseAdmin.from(MELDINGEN).delete().eq("id", claim);
          if (error) captureRouteError(error, { route: ROUTE, action: "MIJLPAAL_VRIJGEVEN" });
        }
      }

      return NextResponse.json({
        success: true,
        migratie: opslag,
        checked: kandidaten.length,
        sent,
        al_verstuurd: overgeslagen,
      });
    } catch (error) {
      captureRouteError(error, { route: ROUTE, action: "GET" });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  });
}
