import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  logEmail,
  sendDocumentenVerzoek,
  sendWelkomstmail,
} from "@/lib/candidate-onboarding";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";

const MAX_PER_RUN = 20;
const DELAY_MS = 500;

interface AutopilotCandidate {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  uitbetalingswijze: string;
  onboarding_status: string;
  onboarding_step: number;
  onboarding_auto: boolean;
  laatste_onboarding_actie: string | null;
  ai_screening_score: number | null;
  documenten_compleet: boolean;
  onboarding_portal_token: string | null;
  onboarding_portal_token_expires_at: string | null;
  created_at: string;
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    // Haal alle kandidaten op die in de autopilot zitten
    const { data: candidates, error } = await supabaseAdmin
      .from("inschrijvingen")
      .select(
        "id, voornaam, achternaam, email, uitbetalingswijze, onboarding_status, onboarding_step, onboarding_auto, laatste_onboarding_actie, ai_screening_score, documenten_compleet, onboarding_portal_token, onboarding_portal_token_expires_at, created_at"
      )
      .eq("onboarding_auto", true)
      .in("onboarding_status", [
        "nieuw",
        "in_beoordeling",
        "documenten_opvragen",
        "wacht_op_kandidaat",
        "goedgekeurd",
      ])
      .order("created_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) {
      captureRouteError(error, { route: "/api/cron/onboarding-autopilot", action: "GET" });
      // console.error("[ONBOARDING-AUTOPILOT] Query error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ message: "Geen kandidaten in autopilot", results: [] });
    }

    for (const kandidaat of candidates as AutopilotCandidate[]) {
      const dagenSindsActie = daysSince(kandidaat.laatste_onboarding_actie);
      const dagenSindsAanmelding = daysSince(kandidaat.created_at);

      try {
        // ── STAP 0: Nieuw → Wacht op AI screening resultaat ──
        if (kandidaat.onboarding_status === "nieuw" && kandidaat.onboarding_step === 0) {
          // AI screening draait automatisch bij inschrijving
          // Wacht minimaal 1 uur op resultaat
          if (dagenSindsAanmelding < 0.04) continue; // ~1 uur

          if (kandidaat.ai_screening_score && kandidaat.ai_screening_score >= 6) {
            // Score goed → stuur documentenverzoek
            await updateKandidaat(kandidaat.id, {
              onboarding_status: "documenten_opvragen",
              onboarding_step: 1,
              laatste_onboarding_actie: new Date().toISOString(),
            });

            const emailResult = await sendDocumentenVerzoek(kandidaat);
            const resendId = emailResult?.data?.id;
            await logEmail(kandidaat.id, "documenten_opvragen", kandidaat.email,
              `${kandidaat.voornaam}, we hebben je documenten nodig! 📄`, resendId);

            await updateKandidaat(kandidaat.id, {
              documenten_verzoek_verstuurd_op: new Date().toISOString(),
            });

            results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: nieuw → documenten_opvragen (score: ${kandidaat.ai_screening_score})`);
          } else if (kandidaat.ai_screening_score && kandidaat.ai_screening_score < 6) {
            // Score laag → markeer voor handmatige review
            await updateKandidaat(kandidaat.id, {
              onboarding_status: "in_beoordeling",
              onboarding_step: 0,
              laatste_onboarding_actie: new Date().toISOString(),
              onboarding_auto: false, // Admin moet handmatig overnemen
            });

            results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: score ${kandidaat.ai_screening_score} → handmatige review`);
          }
          // Geen score? Skip, AI screening is nog bezig
          continue;
        }

        // ── STAP 1: Documenten opvragen → wacht op upload ──
        if (kandidaat.onboarding_status === "documenten_opvragen" && kandidaat.onboarding_step === 1) {
          // Wacht minimaal 1 dag voordat we reminders sturen
          if (dagenSindsActie < 1) continue;

          // Check of er documenten zijn geupload
          const { count } = await supabaseAdmin
            .from("kandidaat_documenten")
            .select("*", { count: "exact", head: true })
            .eq("inschrijving_id", kandidaat.id);

          if (count && count > 0) {
            // Documenten geupload → stap 2
            await updateKandidaat(kandidaat.id, {
              onboarding_status: "wacht_op_kandidaat",
              onboarding_step: 2,
              laatste_onboarding_actie: new Date().toISOString(),
            });
            results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: documenten geupload → wacht_op_kandidaat`);
          } else if (dagenSindsActie >= 5) {
            // 5 dagen geen actie → deactiveer autopilot, admin alert
            await updateKandidaat(kandidaat.id, {
              onboarding_auto: false,
              onboarding_step: 1,
              laatste_onboarding_actie: new Date().toISOString(),
            });
            results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: 5 dagen geen documenten → handmatige follow-up`);
          }
          // Reminders worden al gestuurd door de bestaande document-reminders cron
          continue;
        }

        // ── STAP 2: Wacht op kandidaat → check beschikbaarheid ──
        if (kandidaat.onboarding_status === "wacht_op_kandidaat" && kandidaat.onboarding_step === 2) {
          if (dagenSindsActie < 1) continue;

          // Check of er voldoende documenten zijn (minimaal ID + CV)
          const { data: docs } = await supabaseAdmin
            .from("kandidaat_documenten")
            .select("document_type, review_status")
            .eq("inschrijving_id", kandidaat.id);

          const docTypes = (docs || []).map((d: { document_type: string }) => d.document_type);
          const heeftID = docTypes.includes("id");
          const heeftCV = docTypes.includes("cv");

          if (heeftID && heeftCV) {
            // Documenten compleet → goedkeuren
            await updateKandidaat(kandidaat.id, {
              onboarding_status: "goedgekeurd",
              onboarding_step: 3,
              documenten_compleet: true,
              goedgekeurd_op: new Date().toISOString(),
              laatste_onboarding_actie: new Date().toISOString(),
            });
            results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: documenten compleet → goedgekeurd`);
          } else if (dagenSindsActie >= 3) {
            // Wacht al 3 dagen, nog niet compleet → deactiveer
            await updateKandidaat(kandidaat.id, {
              onboarding_auto: false,
              laatste_onboarding_actie: new Date().toISOString(),
            });
            results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: documenten incompleet na 3 dagen → handmatig`);
          }
          continue;
        }

        // ── STAP 3: Goedgekeurd → Inzetbaar maken ──
        if (kandidaat.onboarding_status === "goedgekeurd" && kandidaat.onboarding_step === 3) {
          // Automatisch inzetbaar maken + welkomstmail sturen
          await updateKandidaat(kandidaat.id, {
            onboarding_status: "inzetbaar",
            onboarding_step: 4,
            inzetbaar_op: new Date().toISOString(),
            laatste_onboarding_actie: new Date().toISOString(),
            onboarding_auto: false, // Klaar, autopilot uit
          });

          const emailResult = await sendWelkomstmail(kandidaat);
          const resendId = emailResult?.data?.id;
          await logEmail(kandidaat.id, "inzetbaar", kandidaat.email,
            `🎉 ${kandidaat.voornaam}, je bent inzetbaar!`, resendId);

          results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: goedgekeurd → inzetbaar + welkomstmail`);
          continue;
        }
      } catch (err) {
        captureRouteError(err, { route: "/api/cron/onboarding-autopilot", action: "GET" });
        // console.error(`[ONBOARDING-AUTOPILOT] Error for ${kandidaat.id}:`, err);
        results.push(`${kandidaat.voornaam} ${kandidaat.achternaam}: ERROR - ${err}`);
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
    // console.error("[ONBOARDING-AUTOPILOT] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}

async function updateKandidaat(id: string, data: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("inschrijvingen")
    .update(data)
    .eq("id", id);

  if (error) {
    captureRouteError(error, { route: "/api/cron/onboarding-autopilot", action: "GET" });
    // console.error(`[ONBOARDING-AUTOPILOT] Update error for ${id}:`, error);
    throw error;
  }
}
