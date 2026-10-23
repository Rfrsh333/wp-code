import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";
import { medewerkerDocumentType, meeTeNemenDocumenten } from "@/lib/kandidaat-documenten";

/**
 * Goedgekeurde kandidaatdocumenten mee naar het medewerkeraccount (besluit Rachid, 23-10-2026):
 * het bestand wordt gekopieerd naar de bucket `medewerker-documenten` en er komt een rij in
 * `medewerker_documenten` met type, vervaldatum en review_status "goedgekeurd".
 *
 * Idempotent: het doelpad is vast per kandidaatdocument (`<medewerker>/onboarding_<id>.<ext>`);
 * bestaat dat al, dan wordt het overgeslagen. Fouten blokkeren het aanmaken van het account niet
 * (Sentry); de medewerker kan een document altijd zelf opnieuw uploaden.
 */

const KANDIDAAT_BUCKET = "kandidaat-documenten";
const ROUTE = "lib/kandidaat-documenten-meenemen";

type KandidaatDoc = {
  id: string;
  type: string;
  bestandsnaam: string;
  bestand_pad: string;
  mime_type: string | null;
  bestand_grootte: number | null;
  status: string | null;
  vervaldatum?: string | null;
};

const isOntbrekendeKolom = (e: { code?: string } | null) => e?.code === "42703" || e?.code === "PGRST204";

async function haalKandidaatDocumenten(inschrijvingId: string): Promise<KandidaatDoc[]> {
  const basis = "id, type, bestandsnaam, bestand_pad, mime_type, bestand_grootte, status";
  const metDatum = await supabaseAdmin.from("kandidaat_documenten").select(`${basis}, vervaldatum`).eq("inschrijving_id", inschrijvingId);
  if (!isOntbrekendeKolom(metDatum.error)) return (metDatum.data ?? []) as KandidaatDoc[];
  const zonder = await supabaseAdmin.from("kandidaat_documenten").select(basis).eq("inschrijving_id", inschrijvingId);
  return (zonder.data ?? []) as KandidaatDoc[];
}

async function kopieerBestand(bron: string, doel: string, mime: string | null): Promise<boolean> {
  const kopie = await supabaseAdmin.storage
    .from(KANDIDAAT_BUCKET)
    .copy(bron, doel, { destinationBucket: MEDEWERKER_DOCUMENTEN_BUCKET });
  if (!kopie.error) return true;
  // Het doelpad is vast per kandidaatdocument: bestaat het al (eerdere, half afgebroken run),
  // dan is het bestand er en kan de rij alsnog worden aangemaakt.
  if (/already exists|duplicate/i.test(kopie.error.message ?? "")) return true;

  // Terugval (bv. oudere storage-server zonder kopiëren tussen buckets): downloaden en uploaden.
  const download = await supabaseAdmin.storage.from(KANDIDAAT_BUCKET).download(bron);
  if (download.error || !download.data) return false;
  const upload = await supabaseAdmin.storage
    .from(MEDEWERKER_DOCUMENTEN_BUCKET)
    .upload(doel, Buffer.from(await download.data.arrayBuffer()), {
      contentType: mime || "application/octet-stream",
      // Vast doelpad: overschrijven is veilig en maakt een herhaalde run idempotent.
      upsert: true,
    });
  return !upload.error;
}

export async function neemKandidaatDocumentenMee(inschrijvingId: string, medewerkerId: string): Promise<{ meegenomen: number }> {
  let meegenomen = 0;
  try {
    const documenten = meeTeNemenDocumenten(await haalKandidaatDocumenten(inschrijvingId));
    for (const doc of documenten) {
      const ext = doc.bestand_pad.split(".").pop()?.toLowerCase() || "bin";
      const doel = `${medewerkerId}/onboarding_${doc.id}.${ext}`;

      const { data: bestaand } = await supabaseAdmin
        .from("medewerker_documenten")
        .select("id")
        .eq("medewerker_id", medewerkerId)
        .eq("file_path", doel)
        .limit(1);
      if ((bestaand ?? []).length > 0) continue;

      if (!(await kopieerBestand(doc.bestand_pad, doel, doc.mime_type))) {
        captureRouteError(new Error(`Kandidaatdocument ${doc.id} kon niet worden gekopieerd`), { route: ROUTE, action: "KOPIE" });
        continue;
      }

      const rij: Record<string, unknown> = {
        medewerker_id: medewerkerId,
        document_type: medewerkerDocumentType(doc.type),
        file_name: doc.bestandsnaam.slice(0, 200),
        file_path: doel,
        file_url: null,
        file_size: doc.bestand_grootte,
        expiry_date: doc.vervaldatum ?? null,
        review_status: "goedgekeurd",
        review_opmerking: "Goedgekeurd tijdens de onboarding (kandidaatdocument).",
      };
      let { error } = await supabaseAdmin.from("medewerker_documenten").insert(rij);
      // file_url was NOT NULL vóór migratie 20261001_medewerker_portaal (zelfde terugval als de uploadroute).
      if (error?.code === "23502") ({ error } = await supabaseAdmin.from("medewerker_documenten").insert({ ...rij, file_url: doel }));
      if (error && isOntbrekendeKolom(error)) {
        // Database zonder review-kolommen: zonder die velden opslaan.
        const zonderReview = Object.fromEntries(Object.entries(rij).filter(([k]) => !k.startsWith("review_")));
        ({ error } = await supabaseAdmin.from("medewerker_documenten").insert({ ...zonderReview, file_url: doel }));
      }
      if (error) {
        await supabaseAdmin.storage.from(MEDEWERKER_DOCUMENTEN_BUCKET).remove([doel]);
        captureRouteError(error, { route: ROUTE, action: "INSERT" });
        continue;
      }
      meegenomen += 1;
    }
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "MEENEMEN" });
  }
  return { meegenomen };
}
