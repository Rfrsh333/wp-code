import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  logEmail,
  sendDocumentenReminder,
} from "@/lib/candidate-onboarding";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";

const MAX_REMINDERS_PER_RUN = 10;
const REMINDER_DELAY_MS = 1000;
const REMINDER_INTERVAL_DAYS = 3;

type ReminderCandidate = {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  uitbetalingswijze: string;
  onboarding_portal_token: string | null;
  onboarding_portal_token_expires_at: string | null;
  documenten_verzoek_verstuurd_op: string | null;
  documenten_reminder_verstuurd_op: string | null;
};

function getThresholdIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
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

  return withCronMonitor("cron-document-reminders", async () => {

  const nowIso = new Date().toISOString();
  const thresholdIso = getThresholdIso(REMINDER_INTERVAL_DAYS);

  const { data: candidates, error } = await supabaseAdmin
    .from("inschrijvingen")
    .select(`
      id,
      voornaam,
      achternaam,
      email,
      uitbetalingswijze,
      onboarding_portal_token,
      onboarding_portal_token_expires_at,
      documenten_verzoek_verstuurd_op,
      documenten_reminder_verstuurd_op
    `)
    .eq("onboarding_status", "documenten_opvragen")
    .not("documenten_verzoek_verstuurd_op", "is", null)
    .lt("documenten_verzoek_verstuurd_op", thresholdIso)
    .or(`documenten_reminder_verstuurd_op.is.null,documenten_reminder_verstuurd_op.lt.${thresholdIso}`)
    .order("documenten_verzoek_verstuurd_op", { ascending: true })
    .limit(MAX_REMINDERS_PER_RUN);

  if (error) {
    captureRouteError(error, { route: "/api/cron/document-reminders", action: "GET" });
    // console.error("[CRON] document-reminders query error:", error);
    return NextResponse.json({ error: "Kandidaten ophalen mislukt" }, { status: 500 });
  }

  const results: Array<Record<string, string | null>> = [];
  let sent = 0;
  let failed = 0;

  for (const candidate of (candidates || []) as ReminderCandidate[]) {
    const tokenExpiresAt = candidate.onboarding_portal_token_expires_at
      ? new Date(candidate.onboarding_portal_token_expires_at)
      : null;

    const hasValidToken = Boolean(
      candidate.onboarding_portal_token &&
      tokenExpiresAt &&
      tokenExpiresAt > new Date()
    );

    if (!hasValidToken) {
      results.push({
        kandidaat_id: candidate.id,
        email: candidate.email,
        status: "skipped_no_valid_token",
      });
      continue;
    }

    try {
      const emailResult = await sendDocumentenReminder(
        candidate,
        candidate.onboarding_portal_token || undefined
      );
      const subject = `${candidate.voornaam}, vergeet je documenten niet! 📄`;

      await logEmail(
        candidate.id,
        "documenten_reminder",
        candidate.email,
        subject,
        emailResult.data?.id
      );

      await supabaseAdmin
        .from("inschrijvingen")
        .update({
          documenten_reminder_verstuurd_op: nowIso,
          laatste_contact_op: nowIso,
        })
        .eq("id", candidate.id);

      await logAuditEvent({
        actorEmail: "cron",
        actorRole: "operations",
        action: "send_documenten_reminder",
        targetTable: "inschrijvingen",
        targetId: candidate.id,
        summary: `Documenten reminder verstuurd naar ${candidate.email}`,
        metadata: {
          resendEmailId: emailResult.data?.id || null,
        },
      });

      results.push({
        kandidaat_id: candidate.id,
        email: candidate.email,
        status: "sent",
      });
      sent += 1;
    } catch (sendError) {
      captureRouteError(sendError, { route: "/api/cron/document-reminders", action: "GET" });
      // console.error("[CRON] document-reminders send error:", sendError);
      results.push({
        kandidaat_id: candidate.id,
        email: candidate.email,
        status: "failed",
      });
      failed += 1;
    }

    await sleep(REMINDER_DELAY_MS);
  }

  return NextResponse.json({
    success: true,
    total_kandidaten: candidates?.length || 0,
    processed: results.length,
    sent,
    failed,
    results,
  });
  });
}
