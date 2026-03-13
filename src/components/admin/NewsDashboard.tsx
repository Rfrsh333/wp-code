"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ArticleIntelligencePanel from "@/components/admin/ArticleIntelligencePanel";
import AdminShell from "@/components/navigation/AdminShell";

interface DashboardMetrics {
  activeSources: number;
  liveClusters: number;
  draftQueue: number;
  publishedCount: number;
}

interface DashboardItem {
  id: string;
  title?: string;
  name?: string;
  reviewStatus?: string;
  themeTitle?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface DashboardPayload {
  metrics: DashboardMetrics;
  sources: DashboardItem[];
  clusters: DashboardItem[];
  drafts: DashboardItem[];
  publishedDrafts: DashboardItem[];
}

const emptyPayload: DashboardPayload = {
  metrics: {
    activeSources: 0,
    liveClusters: 0,
    draftQueue: 0,
    publishedCount: 0,
  },
  sources: [],
  clusters: [],
  drafts: [],
  publishedDrafts: [],
};

function formatDate(value?: string) {
  if (!value) {
    return "Nog niet";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export default function NewsDashboard() {
  const [data, setData] = useState<DashboardPayload>(emptyPayload);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationState, setOperationState] = useState<{
    isRunning: boolean;
    action: string | null;
    message: string | null;
  }>({
    isRunning: false,
    action: null,
    message: null,
  });

  const load = async () => {
    try {
      setError(null);
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/news/overview", { headers });

      if (!response.ok) {
        throw new Error("Nieuwsdashboard kon niet geladen worden.");
      }

      const payload = (await response.json()) as DashboardPayload;
      setData(payload);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "Onbekende fout");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runOperation = async (
    action:
      | "seed_sources"
      | "run_ingestion"
      | "run_extraction"
      | "run_analysis"
      | "run_clustering"
      | "generate_drafts"
      | "generate_images"
      | "run_publish_queue",
  ) => {
    try {
      setOperationState({
        isRunning: true,
        action,
        message: null,
      });

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/news/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action,
          limit: action === "run_extraction" ? 12 : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Content operatie kon niet worden uitgevoerd.");
      }

      const payload = (await response.json()) as { result: Record<string, unknown> };
      const resultText = JSON.stringify(payload.result);
      setOperationState({
        isRunning: false,
        action,
        message: resultText,
      });
      await load();
    } catch (operationError) {
      setOperationState({
        isRunning: false,
        action,
        message: operationError instanceof Error ? operationError.message : "Onbekende fout",
      });
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#F27501]">
              Content Intelligence
            </span>
            <h1 className="mt-3 text-3xl font-bold text-neutral-900">Editorial control center</h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Monitor bronnen, prioriteer nieuws, review AI-drafts en publiceer editorial content zonder de bestaande siteflow te verstoren.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => runOperation("seed_sources")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Seed bronnen
            </button>
            <button
              type="button"
              onClick={() => runOperation("run_ingestion")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Run ingest
            </button>
            <button
              type="button"
              onClick={() => runOperation("run_extraction")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Extract artikelen
            </button>
            <button
              type="button"
              onClick={() => runOperation("run_analysis")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Analyseer content
            </button>
            <button
              type="button"
              onClick={() => runOperation("run_clustering")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cluster nieuws
            </button>
            <button
              type="button"
              onClick={() => runOperation("generate_drafts")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Genereer drafts
            </button>
            <button
              type="button"
              onClick={() => runOperation("generate_images")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Genereer images
            </button>
            <button
              type="button"
              onClick={() => runOperation("run_publish_queue")}
              disabled={operationState.isRunning}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Publiceer queue
            </button>
            <Link href="/admin/news/sources" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#F27501] hover:text-[#F27501]">
              Bronnen beheren
            </Link>
            <Link href="/admin/news/clusters" className="rounded-xl bg-[#F27501] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d96800]">
              Clusters bekijken
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
        ) : null}
        {operationState.message ? (
          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-900">
            <strong className="mr-2 uppercase">{operationState.action}</strong>
            <span className="break-all">{operationState.message}</span>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Actieve bronnen", value: data.metrics.activeSources },
            { label: "Live clusters", value: data.metrics.liveClusters },
            { label: "Review queue", value: data.metrics.draftQueue },
            { label: "Gepubliceerd", value: data.metrics.publishedCount },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-sm text-neutral-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-neutral-900">{isLoading ? "..." : metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-neutral-900 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Workflow</p>
              <h2 className="mt-2 text-2xl font-semibold">Editorial pipeline</h2>
              <p className="mt-2 max-w-3xl text-sm text-neutral-300">
                Draai de stappen in volgorde voor de beste outputkwaliteit. Regelgeving en compliance-content blijft altijd menselijk reviewbaar voordat publicatie plaatsvindt.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-neutral-200 md:grid-cols-4">
              <div className="rounded-2xl bg-white/5 px-4 py-3">1. Ingest</div>
              <div className="rounded-2xl bg-white/5 px-4 py-3">2. Analyse</div>
              <div className="rounded-2xl bg-white/5 px-4 py-3">3. Cluster & draft</div>
              <div className="rounded-2xl bg-white/5 px-4 py-3">4. Image & publish</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Bronnen</h2>
              <Link href="/admin/news/sources" className="text-sm font-medium text-[#F27501]">Beheer</Link>
            </div>
            <div className="space-y-3">
              {data.sources.slice(0, 5).map((source) => (
                <div key={source.id} className="rounded-xl border border-neutral-100 px-4 py-3">
                  <p className="font-medium text-neutral-900">{source.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">Laatste update: {formatDate(source.updatedAt)}</p>
                </div>
              ))}
              {!data.sources.length && !isLoading ? (
                <p className="text-sm text-neutral-500">Nog geen bronnen opgeslagen. Voeg eerst source records toe via Supabase of de admin API.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Clusters</h2>
              <Link href="/admin/news/clusters" className="text-sm font-medium text-[#F27501]">Openen</Link>
            </div>
            <div className="space-y-3">
              {data.clusters.slice(0, 5).map((cluster) => (
                <div key={cluster.id} className="rounded-xl border border-neutral-100 px-4 py-3">
                  <p className="font-medium text-neutral-900">{cluster.themeTitle}</p>
                  <p className="mt-1 text-xs text-neutral-500">Bijgewerkt: {formatDate(cluster.updatedAt)}</p>
                </div>
              ))}
              {!data.clusters.length && !isLoading ? (
                <p className="text-sm text-neutral-500">Nog geen clusters beschikbaar. De clustering-job vult dit scherm zodra de pipeline draait.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Drafts</h2>
              <Link href="/admin/news/drafts" className="text-sm font-medium text-[#F27501]">Review</Link>
            </div>
            <div className="space-y-3">
              {data.drafts.slice(0, 5).map((draft) => (
                <div key={draft.id} className="rounded-xl border border-neutral-100 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-neutral-900">{draft.title}</p>
                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                      {draft.reviewStatus ?? "draft"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">Bijgewerkt: {formatDate(draft.updatedAt)}</p>
                </div>
              ))}
              {!data.drafts.length && !isLoading ? (
                <p className="text-sm text-neutral-500">Nog geen editorial drafts. Zodra de draft generation-job draait verschijnen ze hier.</p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="mt-8">
          <ArticleIntelligencePanel />
        </div>
      </div>
    </AdminShell>
  );
}
