import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-onboarding-cleanup", async () => {

  const nowIso = new Date().toISOString();

  try {
    const { data: expiredCandidates } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id")
      .not("onboarding_portal_token", "is", null)
      .lt("onboarding_portal_token_expires_at", nowIso);

    const { error: cleanupError } = await supabaseAdmin
      .from("inschrijvingen")
      .update({
        onboarding_portal_token: null,
        onboarding_portal_token_expires_at: null,
      })
      .not("onboarding_portal_token", "is", null)
      .lt("onboarding_portal_token_expires_at", nowIso);

    if (cleanupError) {
      throw cleanupError;
    }

    const cleanedCount = expiredCandidates?.length || 0;

    await logAuditEvent({
      actorEmail: "cron",
      actorRole: "operations",
      action: "cleanup_expired_onboarding_tokens",
      targetTable: "inschrijvingen",
      summary: `${cleanedCount} verlopen onboarding links opgeschoond`,
      metadata: { cleanedCount },
    });

    return NextResponse.json({
      success: true,
      cleanedCount,
      cleanedAt: nowIso,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/cron/onboarding-cleanup", action: "GET" });
    // console.error("Onboarding cleanup cron error:", error);
    return NextResponse.json({ error: "Cleanup mislukt" }, { status: 500 });
  }
  });
}
