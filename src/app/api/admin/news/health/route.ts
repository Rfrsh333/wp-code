import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";

interface SourceHealthItem {
  id: string;
  name: string;
  healthStatus: string;
  consecutiveErrorCount: number;
  avgFetchTimeMs: number | null;
  articlesFoundLastRun: number | null;
  lastFetchedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

interface JobRunMetrics {
  totalRuns24h: number;
  successfulRuns24h: number;
  failedRuns24h: number;
  avgDurationMs: number | null;
  recentFailures: Array<{
    jobName: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

interface PipelineHealthResponse {
  sourceHealth: SourceHealthItem[];
  sourcesSummary: {
    total: number;
    healthy: number;
    degraded: number;
    failing: number;
    dead: number;
  };
  jobMetrics: JobRunMetrics;
  costEstimate: {
    aiCallsToday: number;
    estimatedCostUsd: number;
  };
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Source health
    const { data: sources } = await supabaseAdmin
      .from("sources")
      .select("id, name, health_status, consecutive_error_count, avg_fetch_time_ms, articles_found_last_run, last_fetched_at, last_error_at, last_error_message")
      .eq("is_active", true)
      .order("health_status", { ascending: true })
      .order("name", { ascending: true });

    const sourceHealth: SourceHealthItem[] = (sources ?? []).map((s) => ({
      id: String(s.id),
      name: String(s.name),
      healthStatus: String(s.health_status ?? "healthy"),
      consecutiveErrorCount: Number(s.consecutive_error_count ?? 0),
      avgFetchTimeMs: (s.avg_fetch_time_ms as number | null) ?? null,
      articlesFoundLastRun: (s.articles_found_last_run as number | null) ?? null,
      lastFetchedAt: (s.last_fetched_at as string | null) ?? null,
      lastErrorAt: (s.last_error_at as string | null) ?? null,
      lastErrorMessage: (s.last_error_message as string | null) ?? null,
    }));

    const sourcesSummary = {
      total: sourceHealth.length,
      healthy: sourceHealth.filter((s) => s.healthStatus === "healthy").length,
      degraded: sourceHealth.filter((s) => s.healthStatus === "degraded").length,
      failing: sourceHealth.filter((s) => s.healthStatus === "failing").length,
      dead: sourceHealth.filter((s) => s.healthStatus === "dead").length,
    };

    // Job run metrics (last 24h)
    const { data: jobRuns } = await supabaseAdmin
      .from("job_runs")
      .select("id, job_name, status, error_message, started_at, finished_at, created_at")
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: false });

    const runs = jobRuns ?? [];
    const completedRuns = runs.filter((r) => r.status === "completed");
    const failedRuns = runs.filter((r) => r.status === "failed");

    const durations = completedRuns
      .filter((r) => r.started_at && r.finished_at)
      .map((r) => new Date(r.finished_at as string).getTime() - new Date(r.started_at as string).getTime());

    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const jobMetrics: JobRunMetrics = {
      totalRuns24h: runs.length,
      successfulRuns24h: completedRuns.length,
      failedRuns24h: failedRuns.length,
      avgDurationMs,
      recentFailures: failedRuns.slice(0, 10).map((r) => ({
        jobName: String(r.job_name),
        errorMessage: (r.error_message as string | null) ?? null,
        createdAt: String(r.created_at),
      })),
    };

    // AI cost estimate (based on classify + draft generation job counts)
    const aiJobs = runs.filter((r) =>
      String(r.job_name).includes("classify") ||
      String(r.job_name).includes("draft") ||
      String(r.job_name).includes("quality"),
    );

    // Rough estimate: ~$0.002 per classification, ~$0.02 per draft generation
    const classifyCount = aiJobs.filter((r) => String(r.job_name).includes("classify")).length;
    const draftCount = aiJobs.filter((r) =>
      String(r.job_name).includes("draft") || String(r.job_name).includes("quality"),
    ).length;

    const costEstimate = {
      aiCallsToday: aiJobs.length,
      estimatedCostUsd: Math.round((classifyCount * 0.002 + draftCount * 0.02) * 100) / 100,
    };

    const response: PipelineHealthResponse = {
      sourceHealth,
      sourcesSummary,
      jobMetrics,
      costEstimate,
    };

    return NextResponse.json(response);
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/news/health", action: "GET" });
    // console.error("[health] Error:", error);
    return NextResponse.json({ error: "Failed to load health data" }, { status: 500 });
  }
}
