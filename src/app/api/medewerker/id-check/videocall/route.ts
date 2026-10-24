import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { checkRedisRateLimit, idCheckRateLimit } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import { isDiditActiefVoorMedewerker } from "@/lib/id-check/actief";
import { IdCheckMigratieOntbreekt, vraagVideocallAan } from "@/lib/id-check/db";

/**
 * POST — "Liever een videocall": de medewerker laat zijn ID liever in een videocall zien dan via
 * Didit. Er komt een verzoek in `id_verificaties` (status videocall_gevraagd, zichtbaar in Admin →
 * Medewerkers → ID-checks) en een bericht in de admin-inbox, zodat TopTalent kan reageren en een
 * moment kan afspreken. Eén open verzoek per medewerker; nogmaals klikken maakt geen tweede.
 *
 * 200 { success: true, status: "videocall_gevraagd" } · 429 te vaak · 503 functie uit / migratie ontbreekt
 */
export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);
    if (!(await isDiditActiefVoorMedewerker(medewerker.id))) {
      return NextResponse.json({ error: "De ID-controle via Didit staat (nog) niet aan." }, { status: 503 });
    }

    const limiet = await checkRedisRateLimit(`id-check:videocall:${medewerker.id}`, idCheckRateLimit);
    if (!limiet.success) {
      return NextResponse.json({ error: "Je hebt het te vaak geprobeerd. Probeer het over een uur opnieuw." }, { status: 429 });
    }

    const { nieuw } = await vraagVideocallAan(medewerker.id);
    if (nieuw) {
      const { error: berichtFout } = await supabaseAdmin.from("berichten").insert({
        van_type: "medewerker",
        van_id: medewerker.id,
        aan_type: "admin",
        aan_id: "admin",
        onderwerp: "Verzoek: ID-controle via videocall",
        inhoud:
          `${medewerker.naam} (${medewerker.email}) wil het ID liever in een videocall laten zien dan via Didit.` +
          "\n\nSpreek een moment af. Zet het na de videocall op goedgekeurd via Admin → Medewerkers → ID-checks (vul de vervaldatum in). Maak geen foto of schermafbeelding van het ID.",
      });
      if (berichtFout) captureRouteError(berichtFout, { route: "/api/medewerker/id-check/videocall", action: "BERICHT" });

      await logAuditEvent({
        actorEmail: medewerker.email,
        action: "medewerker_id_videocall_gevraagd",
        targetTable: "id_verificaties",
        targetId: medewerker.id,
        summary: "Medewerker vroeg een ID-controle via videocall aan",
      });
    }

    return NextResponse.json({ success: true, status: "videocall_gevraagd" });
  } catch (error) {
    if (error instanceof IdCheckMigratieOntbreekt) {
      return NextResponse.json({ error: "De ID-controle is nog niet beschikbaar." }, { status: 503 });
    }
    captureRouteError(error, { route: "/api/medewerker/id-check/videocall", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
