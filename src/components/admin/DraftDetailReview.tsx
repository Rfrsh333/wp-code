"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatEditorialLabel } from "@/lib/content/presentation";

interface DraftDetail {
  id: string;
  title: string;
  reviewStatus: string;
  excerpt: string;
  primaryAudience: string | null;
  secondaryAudience: string[];
  bodyMarkdown: string;
  keyTakeaways: string[];
  impactSummary: string | null;
  actionSteps: string[];
  sourceList: Array<{ title: string; url: string; sourceName: string }>;
  seoTitle: string | null;
  metaDescription: string | null;
  reviewNotes: string | null;
  factCheckFlags: string[];
  heroImageId: string | null;
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

export default function DraftDetailReview() {
  const params = useParams<{ id: string }>();
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/news/drafts/${params.id}`, {
        headers: await getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Draft detail kon niet geladen worden.");
      }

      const payload = (await response.json()) as {
        draft: DraftDetail;
        heroImageUrl: string | null;
      };
      setDraft(payload.draft);
      setHeroImageUrl(payload.heroImageUrl);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Onbekende fout");
    }
  }, [params.id]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const runAction = async (
    action: "approve" | "reject" | "queue_publish" | "publish_now" | "generate_image",
  ) => {
    setBusyAction(action);
    try {
      const response = await fetch("/api/admin/news/drafts", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          draftId: params.id,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error("Actie kon niet worden uitgevoerd.");
      }

      await loadDraft();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Onbekende fout");
    } finally {
      setBusyAction(null);
    }
  };

  if (!draft) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {error ? <p className="text-sm text-red-700">{error}</p> : <p className="text-sm text-neutral-500">Draft laden...</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/news/drafts" className="text-sm font-medium text-[#F27501]">← Terug naar drafts</Link>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">{draft.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold uppercase tracking-wide text-neutral-700">
              {draft.reviewStatus}
            </span>
            <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold uppercase tracking-wide text-[#F27501]">
              {formatEditorialLabel(draft.primaryAudience)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => runAction("approve")} disabled={busyAction !== null} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 disabled:opacity-60">Goedkeuren</button>
          <button onClick={() => runAction("generate_image")} disabled={busyAction !== null} className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-[#F27501] disabled:opacity-60">Hero image</button>
          <button onClick={() => runAction("queue_publish")} disabled={busyAction !== null} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-60">In queue</button>
          <button onClick={() => runAction("publish_now")} disabled={busyAction !== null} className="rounded-xl bg-[#F27501] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Publiceer nu</button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {heroImageUrl ? (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt={draft.title} className="h-auto w-full object-cover" />
            </div>
          ) : null}

          <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
            <p className="text-lg leading-8 text-neutral-600">{draft.excerpt}</p>
            <div className="mt-8 whitespace-pre-wrap text-base leading-8 text-neutral-800">
              {draft.bodyMarkdown}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-neutral-900">Belangrijkste punten</h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700">
              {draft.keyTakeaways.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-neutral-900">Actiestappen</h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700">
              {draft.actionSteps.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-neutral-900">SEO & review</h2>
            <p className="mt-4 text-sm text-neutral-700"><strong>SEO titel:</strong> {draft.seoTitle ?? "-"}</p>
            <p className="mt-3 text-sm text-neutral-700"><strong>Meta:</strong> {draft.metaDescription ?? "-"}</p>
            <p className="mt-3 text-sm text-neutral-700"><strong>Review notes:</strong> {draft.reviewNotes ?? "-"}</p>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-neutral-900">Bronnen</h2>
            <ul className="mt-4 space-y-4 text-sm text-neutral-700">
              {draft.sourceList.map((source) => (
                <li key={`${source.sourceName}-${source.url}`}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#F27501] hover:underline">
                    {source.sourceName}
                  </a>
                  <p className="mt-1">{source.title}</p>
                </li>
              ))}
            </ul>
          </section>

          {draft.factCheckFlags.length > 0 ? (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-lg font-semibold text-amber-900">Fact-check flags</h2>
              <ul className="mt-4 space-y-2 text-sm text-amber-900">
                {draft.factCheckFlags.map((flag) => <li key={flag}>{flag}</li>)}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
