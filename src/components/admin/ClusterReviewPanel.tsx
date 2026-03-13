"use client";

import { useEffect, useState } from "react";
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
    Authorization: `Bearer ${session.access_token}`,
  };
}

export default function ClusterReviewPanel() {
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/news/clusters", {
          headers: await getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Clusters konden niet geladen worden.");
        }
        const payload = (await response.json()) as { clusters: ClusterItem[] };
        setClusters(payload.clusters);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Onbekende fout");
      }
    };

    load();
  }, []);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-neutral-900">Cluster review</h1>
        <p className="mt-1 text-sm text-neutral-500">Trend- en opportunity view voor redactiewerk. Hoog scorende clusters horen naar draft generation of priority review te gaan.</p>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="space-y-4">
        {clusters.map((cluster) => (
          <article key={cluster.id} className="rounded-xl border border-neutral-100 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">{cluster.themeTitle}</h2>
                <p className="mt-2 text-sm text-neutral-600">{cluster.summary ?? "Nog geen AI-samenvatting beschikbaar."}</p>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-600">Trend: <strong>{cluster.trendScore}</strong></div>
                <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-600">Business: <strong>{cluster.businessRelevanceScore}</strong></div>
                <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-600">Worker: <strong>{cluster.workerRelevanceScore}</strong></div>
                <div className="rounded-lg bg-orange-100 px-3 py-2 text-[#F27501]">Editorial: <strong>{cluster.editorialPotentialScore}</strong></div>
              </div>
            </div>
          </article>
        ))}
        {!clusters.length ? <p className="text-sm text-neutral-500">Nog geen clusters gevonden. Zodra de clustering-job draait verschijnen ze hier.</p> : null}
      </div>
    </div>
  );
}
