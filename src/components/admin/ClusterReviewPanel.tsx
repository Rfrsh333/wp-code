"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ClusterItem {
  id: string;
  slug: string;
  themeTitle: string;
  summary: string | null;
  trendScore: number;
  businessRelevanceScore: number;
  workerRelevanceScore: number;
  editorialPotentialScore: number;
  updatedAt: string;
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Geen adminsessie gevonden.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export default function ClusterReviewPanel() {
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyClusterId, setBusyClusterId] = useState<string | null>(null);
  const [draftResults, setDraftResults] = useState<Record<string, { status: string; draftId?: string; reason?: string }>>({});

  const loadClusters = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/news/clusters", {
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Clusters konden niet geladen worden (${response.status}).`);
      }
      const payload = (await response.json()) as { clusters: ClusterItem[] };
      setClusters(payload.clusters ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Onbekende fout");
    }
  }, []);

  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  const generateDraft = async (clusterId: string) => {
    setBusyClusterId(clusterId);
    setDraftResults((prev) => {
      const next = { ...prev };
      delete next[clusterId];
      return next;
    });

    try {
      const response = await fetch("/api/admin/news/clusters", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ clusterId, action: "generate_draft" }),
      });

      if (!response.ok) {
        let reason = `Server error (${response.status})`;
        try {
          const errPayload = await response.json();
          reason = errPayload.error ?? reason;
        } catch {
          // Response is niet JSON (bijv. 504 timeout)
        }
        setDraftResults((prev) => ({
          ...prev,
          [clusterId]: { status: "error", reason },
        }));
        return;
      }

      const payload = await response.json();
      setDraftResults((prev) => ({
        ...prev,
        [clusterId]: payload,
      }));
    } catch (actionError) {
      setDraftResults((prev) => ({
        ...prev,
        [clusterId]: { status: "error", reason: actionError instanceof Error ? actionError.message : "Onbekende fout" },
      }));
    } finally {
      setBusyClusterId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-neutral-900">Cluster review</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Trend- en opportunity view voor redactiewerk. Klik op &quot;Draft genereren&quot; om een concept artikel te maken.
        </p>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="space-y-4">
        {clusters.map((cluster) => {
          const result = draftResults[cluster.id];
          const isBusy = busyClusterId === cluster.id;

          return (
            <article key={cluster.id} className="rounded-xl border border-neutral-100 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-neutral-900">{cluster.themeTitle}</h2>
                  <p className="mt-2 text-sm text-neutral-600">{cluster.summary ?? "Nog geen AI-samenvatting beschikbaar."}</p>

                  {result?.status === "generated" && result.draftId ? (
                    <div className="mt-3 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Draft gegenereerd
                      </span>
                      <Link
                        href={`/admin/news/drafts/${result.draftId}`}
                        className="text-xs font-medium text-[#F27501] hover:underline"
                      >
                        Bekijk draft &rarr;
                      </Link>
                    </div>
                  ) : null}

                  {result?.status === "skipped" ? (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {result.reason ?? "Overgeslagen"}
                      </span>
                      {result.draftId ? (
                        <Link
                          href={`/admin/news/drafts/${result.draftId}`}
                          className="ml-3 text-xs font-medium text-[#F27501] hover:underline"
                        >
                          Bestaande draft bekijken &rarr;
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  {result?.status === "error" ? (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {result.reason ?? "Fout bij genereren"}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="grid min-w-[220px] grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-600">Trend: <strong>{cluster.trendScore}</strong></div>
                    <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-600">Business: <strong>{cluster.businessRelevanceScore}</strong></div>
                    <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-600">Worker: <strong>{cluster.workerRelevanceScore}</strong></div>
                    <div className="rounded-lg bg-orange-100 px-3 py-2 text-[#F27501]">Editorial: <strong>{cluster.editorialPotentialScore}</strong></div>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy || busyClusterId !== null}
                    onClick={() => generateDraft(cluster.id)}
                    className="rounded-xl bg-[#F27501] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D96800] disabled:opacity-50"
                  >
                    {isBusy ? "Bezig met genereren..." : "Draft genereren"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!clusters.length ? <p className="text-sm text-neutral-500">Nog geen clusters gevonden. Zodra de clustering-job draait verschijnen ze hier.</p> : null}
      </div>
    </div>
  );
}
