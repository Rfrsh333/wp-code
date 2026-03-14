"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SourceHealthItem {
  id: string;
  name: string;
  healthStatus: string;
  consecutiveErrorCount: number;
  avgFetchTimeMs: number | null;
  articlesFoundLastRun: number | null;
  lastFetchedAt: string | null;
  lastErrorMessage: string | null;
}

interface HealthData {
  sourceHealth: SourceHealthItem[];
  sourcesSummary: {
    total: number;
    healthy: number;
    degraded: number;
    failing: number;
    dead: number;
  };
  jobMetrics: {
    totalRuns24h: number;
    successfulRuns24h: number;
    failedRuns24h: number;
    avgDurationMs: number | null;
    recentFailures: Array<{
      jobName: string;
      errorMessage: string | null;
      createdAt: string;
    }>;
  };
  costEstimate: {
    aiCallsToday: number;
    estimatedCostUsd: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  degraded: "bg-yellow-100 text-yellow-800",
  failing: "bg-orange-100 text-orange-800",
  dead: "bg-red-100 text-red-800",
};

const STATUS_DOTS: Record<string, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  failing: "bg-orange-500",
  dead: "bg-red-500",
};

function formatMs(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Nooit";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}u geleden`;
  const days = Math.floor(hours / 24);
  return `${days}d geleden`;
}

export default function PipelineHealthPanel() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch("/api/admin/news/health", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) throw new Error("Health data kon niet geladen worden.");
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Onbekende fout");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-sm text-neutral-500">Pipeline health laden...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error ?? "Geen health data beschikbaar."}
      </div>
    );
  }

  const successRate = data.jobMetrics.totalRuns24h > 0
    ? Math.round((data.jobMetrics.successfulRuns24h / data.jobMetrics.totalRuns24h) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Pipeline Health</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${successRate >= 90 ? "bg-green-100 text-green-800" : successRate >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
          {successRate}% success rate
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs text-neutral-500">Jobs (24u)</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{data.jobMetrics.totalRuns24h}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {data.jobMetrics.successfulRuns24h} ok / {data.jobMetrics.failedRuns24h} failed
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs text-neutral-500">Gem. duur</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{formatMs(data.jobMetrics.avgDurationMs)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs text-neutral-500">AI calls</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{data.costEstimate.aiCallsToday}</p>
          <p className="mt-1 text-xs text-neutral-500">~${data.costEstimate.estimatedCostUsd}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs text-neutral-500">Bronnen gezondheid</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />{data.sourcesSummary.healthy}</span>
            <span className="flex items-center gap-1 text-xs"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />{data.sourcesSummary.degraded}</span>
            <span className="flex items-center gap-1 text-xs"><span className="inline-block h-2 w-2 rounded-full bg-orange-500" />{data.sourcesSummary.failing}</span>
            <span className="flex items-center gap-1 text-xs"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />{data.sourcesSummary.dead}</span>
          </div>
        </div>
      </div>

      {/* Source health table */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-neutral-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-neutral-900">Bron status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                <th className="px-5 py-2 font-medium">Bron</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Fouten</th>
                <th className="px-3 py-2 font-medium">Snelheid</th>
                <th className="px-3 py-2 font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Laatste fetch</th>
              </tr>
            </thead>
            <tbody>
              {data.sourceHealth.map((source) => (
                <tr key={source.id} className="border-b border-neutral-50">
                  <td className="px-5 py-2.5 font-medium text-neutral-900">{source.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[source.healthStatus] ?? "bg-neutral-100 text-neutral-600"}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOTS[source.healthStatus] ?? "bg-neutral-400"}`} />
                      {source.healthStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{source.consecutiveErrorCount}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{formatMs(source.avgFetchTimeMs)}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{source.articlesFoundLastRun ?? "-"}</td>
                  <td className="px-3 py-2.5 text-neutral-500">{formatTimeAgo(source.lastFetchedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent failures */}
      {data.jobMetrics.recentFailures.length > 0 ? (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="border-b border-neutral-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-red-700">Recente fouten</h3>
          </div>
          <div className="divide-y divide-neutral-50">
            {data.jobMetrics.recentFailures.slice(0, 5).map((failure, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">{failure.jobName}</span>
                  <span className="text-xs text-neutral-500">{formatTimeAgo(failure.createdAt)}</span>
                </div>
                {failure.errorMessage ? (
                  <p className="mt-1 text-xs text-red-600 line-clamp-2">{failure.errorMessage}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
