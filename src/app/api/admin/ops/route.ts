import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [
    expiredLinksResult,
    staleCandidatesResult,
    inzetbaarWithoutProfileResult,
    pendingDocumentsResult,
    bouncedEmailsResult,
    openTasksResult,
    overdueTasksResult,
    testCandidatesResult,
    auditResult,
  ] = await Promise.allSettled([
    supabaseAdmin
      .from("inschrijvingen")
      .select("id", { count: "exact", head: true })
      .not("onboarding_portal_token", "is", null)
      .lt("onboarding_portal_token_expires_at", nowIso),
    supabaseAdmin
      .from("inschrijvingen")
      .select("id", { count: "exact", head: true })
      .in("onboarding_status", ["documenten_opvragen", "wacht_op_kandidaat"])
      .lt("created_at", threeDaysAgoIso),
    supabaseAdmin
      .from("inschrijvingen")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_status", "inzetbaar")
      .is("medewerker_id", null),
    supabaseAdmin
      .from("kandidaat_documenten")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "in_review"),
    supabaseAdmin
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "bounced"),
    supabaseAdmin
      .from("kandidaat_taken")
      .select("id", { count: "exact", head: true })
      .is("completed_at", null),
    supabaseAdmin
      .from("kandidaat_taken")
      .select("id", { count: "exact", head: true })
      .is("completed_at", null)
      .lt("due_at", nowIso),
    supabaseAdmin
      .from("inschrijvingen")
      .select("id", { count: "exact", head: true })
      .eq("is_test_candidate", true),
    supabaseAdmin
      .from("audit_log")
      .select("id, actor_email, actor_role, action, target_table, target_id, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return NextResponse.json({
    health: {
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      redisConfigured: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      cronConfigured: Boolean(process.env.CRON_SECRET),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    counters: {
      expiredUploadLinks: expiredLinksResult.status === "fulfilled" ? expiredLinksResult.value.count || 0 : 0,
      candidatesWaitingTooLong: staleCandidatesResult.status === "fulfilled" ? staleCandidatesResult.value.count || 0 : 0,
      inzetbaarWithoutProfile: inzetbaarWithoutProfileResult.status === "fulfilled" ? inzetbaarWithoutProfileResult.value.count || 0 : 0,
      pendingDocumentReviews: pendingDocumentsResult.status === "fulfilled" ? pendingDocumentsResult.value.count || 0 : 0,
      bouncedEmails: bouncedEmailsResult.status === "fulfilled" ? bouncedEmailsResult.value.count || 0 : 0,
      openTasks: openTasksResult.status === "fulfilled" ? openTasksResult.value.count || 0 : 0,
      overdueTasks: overdueTasksResult.status === "fulfilled" ? overdueTasksResult.value.count || 0 : 0,
      testCandidates: testCandidatesResult.status === "fulfilled" ? testCandidatesResult.value.count || 0 : 0,
    },
    recentAudit: auditResult.status === "fulfilled" ? auditResult.value.data || [] : [],
    requestedBy: email,
  });
}
