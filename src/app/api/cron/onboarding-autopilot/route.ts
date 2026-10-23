import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logEmail, sendDocumentenVerzoek } from "@/lib/candidate-onboarding";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import {
  AUTOPILOT_STATUSSEN,
  bepaalAutopilotActie,
  STAP_PER_STATUS,
  type AutopilotKandidaat,
} from "@/lib/onboarding-autopilot-regels";

/**
 * Onboarding-autopilot (dagelijks, vercel.json). Alleen vervolgmails en het gelijktrekken van de
 * status na een upload; nooit goedkeuren en nooit "inzetbaar" (B2). De regels staan in
 * lib/onboarding-autopilot-regels.ts; zie daar ook waarom hij voorheen vastliep (B3).
 */

const MAX_PER_STATUS = 25;
const DELAY_MS = 500;

type Kandidaat = AutopilotKandidaat & {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  uitbetalingswijze: string;
};

const VELDEN =
  "id, voornaam, achternaam, email, uitbetalingswijze, onboarding_status, ai_screening_score, laatste_onboarding_actie, onboarding_portal_token_expires_at, created_at";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateKandidaat(id: string, data: Record<string, unknown>, alleenVanuitStatus: string) {
  // Voorwaardelijk: heeft een admin intussen de status veranderd, dan doet de autopilot niets.
  const { data: bijgewerkt, error } = await supabaseAdmin
    .from("inschrijvingen")
    .update(data)
    .eq("id", id)
    .eq("onboarding_status", alleenVanuitStatus)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return !!bijgewerkt;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-onboarding-autopilot", async () => {
    const results: string[] = [];

    try {
      // Per status een eigen batch: zo kunnen kandidaten die wachten (bv. op een upload) de
      // nieuwe inschrijvingen niet uit de batch drukken.
      const batches = await Promise.all(
        AUTOPILOT_STATUSSEN.map((status) =>
          supabaseAdmin
            .from("inschrijvingen")
            .select(VELDEN)
            .eq("onboarding_auto", true)
            .eq("onboarding_status", status)
            .order("created_at", { ascending: true })
            .limit(MAX_PER_STATUS),
        ),
      );
      const fout = batches.find((b) => b.error)?.error;
      if (fout) {
        captureRouteError(fout, { route: "/api/cron/onboarding-autopilot", action: "GET" });
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      const kandidaten = batches.flatMap((b) => (b.data ?? []) as unknown as Kandidaat[]);

      if (kandidaten.length === 0) {
        return NextResponse.json({ message: "Geen kandidaten in autopilot", results: [] });
      }

      for (const kandidaat of kandidaten) {
        const naam = `${kandidaat.voornaam} ${kandidaat.achternaam}`;
        try {
          let aantalDocumenten = 0;
          if (kandidaat.onboarding_status === "documenten_opvragen") {
            const { count } = await supabaseAdmin
              .from("kandidaat_documenten")
              .select("id", { count: "exact", head: true })
              .eq("inschrijving_id", kandidaat.id)
              .neq("status", "afgekeurd");
            aantalDocumenten = count ?? 0;
          }

          const actie = bepaalAutopilotActie(kandidaat, { aantalDocumenten, nu: new Date() });
          const nu = new Date().toISOString();

          if (actie.soort === "wachten") continue;

          if (actie.soort === "documenten_opvragen") {
            // Eerst de mail; alleen als die lukt gaat de status mee (anders morgen opnieuw).
            const emailResult = await sendDocumentenVerzoek(kandidaat, undefined, { automatisch: true });
            if (emailResult.error) {
              captureRouteError(new Error(`Autopilot: documentenverzoek mislukt: ${emailResult.error.message}`), {
                route: "/api/cron/onboarding-autopilot",
                action: "MAIL",
              });
              results.push(`${naam}: documentenverzoek mislukt, morgen opnieuw`);
              continue;
            }
            await logEmail(kandidaat.id, "documenten_opvragen", kandidaat.email, `${kandidaat.voornaam}, de volgende stap: je documenten`, emailResult.data?.id);
            await updateKandidaat(
              kandidaat.id,
              {
                onboarding_status: "documenten_opvragen",
                onboarding_step: STAP_PER_STATUS.documenten_opvragen,
                laatste_onboarding_actie: nu,
                documenten_verzoek_verstuurd_op: nu,
                documenten_reminder_verstuurd_op: null,
              },
              "nieuw",
            );
            results.push(`${naam}: nieuw → documenten_opvragen (automatisch documentenverzoek)`);
          } else if (actie.soort === "documenten_ontvangen") {
            // Alleen de status gelijktrekken; goedkeuren doet een admin.
            await updateKandidaat(
              kandidaat.id,
              { onboarding_status: "wacht_op_kandidaat", onboarding_step: STAP_PER_STATUS.wacht_op_kandidaat, laatste_onboarding_actie: nu },
              "documenten_opvragen",
            );
            results.push(`${naam}: documenten ontvangen → wacht op beoordeling door TopTalent`);
          } else if (actie.soort === "handmatig") {
            await updateKandidaat(
              kandidaat.id,
              {
                onboarding_auto: false,
                laatste_onboarding_actie: nu,
                ...(actie.status ? { onboarding_status: actie.status, onboarding_step: STAP_PER_STATUS[actie.status] } : {}),
              },
              kandidaat.onboarding_status ?? "",
            );
            results.push(`${naam}: naar handmatig (${actie.reden})`);
          }
        } catch (err) {
          captureRouteError(err, { route: "/api/cron/onboarding-autopilot", action: "GET" });
          results.push(`${naam}: ERROR - ${err instanceof Error ? err.message : String(err)}`);
        }

        await sleep(DELAY_MS);
      }

      await logAuditEvent({
        action: "onboarding_autopilot_run",
        targetTable: "system",
        targetId: "cron",
        summary: `Autopilot: ${results.length} kandidaten verwerkt`,
        metadata: { processed: results.length, results },
      });

      return NextResponse.json({
        message: `Autopilot: ${results.length} kandidaten verwerkt`,
        results,
      });
    } catch (err) {
      captureRouteError(err, { route: "/api/cron/onboarding-autopilot", action: "GET" });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
