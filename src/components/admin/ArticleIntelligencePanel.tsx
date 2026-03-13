"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ArticleOverviewItem {
  id: string;
  title: string;
  canonicalUrl: string;
  sourceName: string;
  publishedAt: string | null;
  analysis: {
    isRelevant: boolean;
    primaryAudience: string | null;
    category: string | null;
    impactLevel: string | null;
    urgencyLevel: string | null;
    confidenceScore: number;
    summary: string | null;
  } | null;
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

export default function ArticleIntelligencePanel() {
  const [articles, setArticles] = useState<ArticleOverviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/news/articles", {
          headers: await getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Artikeloverzicht kon niet geladen worden.");
        }

        const payload = (await response.json()) as { articles: ArticleOverviewItem[] };
        setArticles(payload.articles);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Onbekende fout");
      }
    };

    load();
  }, []);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-neutral-900">Article intelligence</h2>
        <p className="mt-1 text-sm text-neutral-500">Laatste genormaliseerde artikelen met AI-relevantie, doelgroep en impactscore.</p>
      </div>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-4">
        {articles.map((article) => (
          <article key={article.id} className="rounded-xl border border-neutral-100 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F27501]">{article.sourceName}</p>
                <h3 className="mt-2 text-lg font-semibold text-neutral-900">{article.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{article.analysis?.summary ?? "Nog geen analyse beschikbaar."}</p>
              </div>
              <div className="grid min-w-[240px] grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700">
                  Relevantie: <strong>{article.analysis ? (article.analysis.isRelevant ? "ja" : "nee") : "-"}</strong>
                </div>
                <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700">
                  Confidence: <strong>{article.analysis?.confidenceScore ?? 0}</strong>
                </div>
                <div className="rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700">
                  Doelgroep: <strong>{article.analysis?.primaryAudience ?? "-"}</strong>
                </div>
                <div className="rounded-lg bg-orange-100 px-3 py-2 text-[#F27501]">
                  Impact: <strong>{article.analysis?.impactLevel ?? "-"}</strong>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!articles.length ? <p className="text-sm text-neutral-500">Nog geen genormaliseerde artikelen of analyses gevonden.</p> : null}
      </div>
    </div>
  );
}
