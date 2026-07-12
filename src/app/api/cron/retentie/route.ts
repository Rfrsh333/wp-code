import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withCronMonitor } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import { berekenBewaarTot } from "@/lib/compliance/arbeidstijden";

/**
 * Retentie-cron (AVG art. 5 lid 1 sub e — opslagbeperking).
 *
 * Dwingt de bewaartermijnen voor (bijzondere) PII-documenten technisch af:
 * - vult ontbrekende `bewaar_tot` voor documenten van uit-dienst medewerkers (5 jaar);
 * - verwijdert documenten waarvan de bewaartermijn is verstreken, inclusief het
 *   opslag-object (voorheen bleef dat als verweesd object achter).
 *
 * VEILIGHEID: standaard DRY-RUN — er wordt NIETS verwijderd tenzij de env-var
 * RETENTION_DELETE=1 is gezet. Zo kan de cron eerst draaien en rapporteren wat hij
 * zou opruimen voordat er onomkeerbaar data verdwijnt.
 */
const DOC_TABELLEN = [
  { tabel: "medewerker_documenten", bucket: "medewerker-documenten" },
  { tabel: "kandidaat_documenten", bucket: process.env.SUPABASE_DOCUMENTS_BUCKET || "kandidaat-documenten" },
] as const;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-retentie", async () => {
    const vandaag = new Date().toISOString().split("T")[0];
    const dryRun = process.env.RETENTION_DELETE !== "1";

    // 1) Vul ontbrekende bewaar_tot voor documenten van uit-dienst medewerkers (datum_uit_dienst + 5 jaar).
    let bewaarTotGevuld = 0;
    const { data: zonderBewaartermijn } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("id, medewerker:medewerkers!medewerker_id(datum_uit_dienst)")
      .is("bewaar_tot", null)
      .limit(1000);

    for (const d of zonderBewaartermijn || []) {
      const mw = (d as { medewerker?: { datum_uit_dienst?: string | null } | null }).medewerker;
      const uitDienst = mw?.datum_uit_dienst;
      if (!uitDienst) continue;
      if (!dryRun) {
        await supabaseAdmin
          .from("medewerker_documenten")
          .update({ bewaar_tot: berekenBewaarTot(uitDienst) })
          .eq("id", (d as { id: string }).id);
      }
      bewaarTotGevuld += 1;
    }

    // 2) Verwijder documenten waarvan de bewaartermijn is verstreken (DB-rij + opslag-object).
    const verwijderd: Record<string, number> = {};
    for (const { tabel, bucket } of DOC_TABELLEN) {
      const { data: verlopen } = await supabaseAdmin
        .from(tabel)
        .select("id, file_path")
        .not("bewaar_tot", "is", null)
        .lt("bewaar_tot", vandaag)
        .limit(1000);

      let aantal = 0;
      for (const doc of verlopen || []) {
        const id = (doc as { id: string }).id;
        const filePath = (doc as { file_path?: string | null }).file_path;
        if (!dryRun) {
          if (filePath) {
            await supabaseAdmin.storage.from(bucket).remove([filePath]);
          }
          await supabaseAdmin.from(tabel).delete().eq("id", id);
          await logAuditEvent({
            action: "retentie_document_verwijderd",
            targetTable: tabel,
            targetId: id,
            summary: `Document verwijderd na verstreken bewaartermijn (${tabel})`,
            metadata: { file_path: filePath || null },
          });
        }
        aantal += 1;
      }
      verwijderd[tabel] = aantal;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      vandaag,
      bewaar_tot_gevuld: bewaarTotGevuld,
      verlopen_documenten: verwijderd,
      hint: dryRun
        ? "DRY-RUN: er is niets verwijderd. Zet RETENTION_DELETE=1 om daadwerkelijk op te ruimen."
        : "Live: verlopen documenten zijn verwijderd.",
    });
  });
}
