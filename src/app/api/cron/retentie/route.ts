import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withCronMonitor } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import { berekenBewaarTot } from "@/lib/compliance/arbeidstijden";
import { ruimIdControlerecordsOp, werkIdBewaartermijnenBij } from "@/lib/id-check/bewaartermijn";

/**
 * Retentie-cron (AVG art. 5 lid 1 sub e — opslagbeperking).
 *
 * Dwingt de bewaartermijnen voor (bijzondere) PII-documenten technisch af:
 * - vult ontbrekende `bewaar_tot` voor documenten van uit-dienst medewerkers (5 jaar), behalve
 *   ID-bewijzen;
 * - ID-gegevens volgens de Wav (juridisch advies 24-10-2026, lib/id-check/bewaartermijn): het
 *   controlerecord (`id_verificaties`), ID-bewijzen en bewaarde kandidaatkopieën van werknemers tot
 *   31-12 van (jaar laatste dienst + 5), elke nacht opnieuw uitgerekend;
 * - verwijdert documenten waarvan de bewaartermijn is verstreken, inclusief het
 *   opslag-object (voorheen bleef dat als verweesd object achter);
 * - verwijdert controlerecords na de Wav-termijn en onbesliste controles van verwijderde accounts.
 *
 * VEILIGHEID: standaard DRY-RUN — er wordt NIETS verwijderd tenzij de env-var
 * RETENTION_DELETE=1 is gezet. Zo kan de cron eerst draaien en rapporteren wat hij
 * zou opruimen voordat er onomkeerbaar data verdwijnt.
 */
// Let op: de twee tabellen noemen het opslagpad anders (`file_path` vs `bestand_pad`).
// Met één hardcoded veldnaam bleef het storage-object van de kandidaat-kant achter.
const DOC_TABELLEN = [
  { tabel: "medewerker_documenten", bucket: "medewerker-documenten", padVeld: "file_path" },
  {
    tabel: "kandidaat_documenten",
    bucket: process.env.SUPABASE_DOCUMENTS_BUCKET || "kandidaat-documenten",
    padVeld: "bestand_pad",
  },
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
    //    ID-bewijzen niet: die volgen de Wav-termijn (stap 1b).
    let bewaarTotGevuld = 0;
    const { data: zonderBewaartermijn, error: vulFout } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("id, medewerker:medewerkers!medewerker_id(datum_uit_dienst)")
      .is("bewaar_tot", null)
      .neq("document_type", "id_bewijs")
      .limit(1000);

    if (vulFout) {
      throw new Error(`Retentie kon medewerker_documenten niet lezen: ${vulFout.message}`);
    }

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

    // 1b) ID-gegevens: bewaar_tot volgens de Wav (31-12 van jaar laatste dienst + 5), vóór het
    //     verwijderen, zodat niemand die nog werkt zijn ID-bewijs kwijtraakt.
    const idBewaartermijnen = await werkIdBewaartermijnenBij({ vandaag, dryRun });

    // 2) Verwijder documenten waarvan de bewaartermijn is verstreken (DB-rij + opslag-object).
    const verwijderd: Record<string, number> = {};
    for (const { tabel, bucket, padVeld } of DOC_TABELLEN) {
      const { data: verlopen, error: leesFout } = await supabaseAdmin
        .from(tabel)
        .select(`id, ${padVeld}`)
        .not("bewaar_tot", "is", null)
        .lt("bewaar_tot", vandaag)
        .limit(1000);

      // Een ontbrekende kolom geeft hier een error én data=null; zonder deze check
      // rapporteert de cron stil "0 opgeruimd" terwijl hij niets kán zien.
      if (leesFout) {
        throw new Error(`Retentie kon ${tabel} niet lezen: ${leesFout.message}`);
      }

      let aantal = 0;
      for (const doc of verlopen || []) {
        const id = (doc as { id: string }).id;
        const filePath = (doc as Record<string, unknown>)[padVeld] as string | null | undefined;
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

    // 3) ID-controlerecords na de Wav-termijn, en onbesliste controles van verwijderde accounts.
    const idControlerecords = await ruimIdControlerecordsOp({ vandaag, dryRun });

    return NextResponse.json({
      success: true,
      dryRun,
      vandaag,
      bewaar_tot_gevuld: bewaarTotGevuld,
      id_bewaar_tot_bijgewerkt: idBewaartermijnen,
      verlopen_documenten: verwijderd,
      id_controlerecords_verwijderd: idControlerecords,
      hint: dryRun
        ? "DRY-RUN: er is niets verwijderd. Zet RETENTION_DELETE=1 om daadwerkelijk op te ruimen."
        : "Live: verlopen documenten zijn verwijderd.",
    });
  });
}
