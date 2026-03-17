"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface DraftItem {
  id: string;
  title: string;
  reviewStatus: string;
  excerpt: string;
  primaryAudience: string | null;
  factCheckFlags?: string[];
  heroImageId?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return null;
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

export default function DraftReviewPanel() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<Record<string, "finding" | "branding" | "done" | "not_found">>({});

  const loadDrafts = async () => {
    try {
      const response = await fetch("/api/admin/news/drafts", {
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Drafts konden niet geladen worden.");
      }
      const payload = (await response.json()) as { drafts: DraftItem[] };
      setDrafts(payload.drafts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Onbekende fout");
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const runImageFlow = async (draftId: string) => {
    setBusyDraftId(draftId);
    setImageStatus((prev) => ({ ...prev, [draftId]: "finding" }));
    try {
      const headers = await getAuthHeaders();
      const findRes = await fetch("/api/admin/news/drafts", {
        method: "POST",
        headers,
        body: JSON.stringify({ draftId, action: "find_source_image" }),
      });
      if (!findRes.ok) throw new Error("Bronafbeelding zoeken mislukt.");
      const findData = await findRes.json();

      if (!findData.imageUrl) {
        setImageStatus((prev) => ({ ...prev, [draftId]: "not_found" }));
        setBusyDraftId(null);
        return;
      }

      setImageStatus((prev) => ({ ...prev, [draftId]: "branding" }));
      const brandRes = await fetch("/api/admin/news/drafts", {
        method: "POST",
        headers,
        body: JSON.stringify({ draftId, action: "brand_and_upload_image", imageUrl: findData.imageUrl }),
      });
      if (!brandRes.ok) {
        const errorData = await brandRes.json().catch(() => ({ error: "Afbeelding branden/uploaden mislukt" }));
        throw new Error(errorData.error || "Afbeelding branden/uploaden mislukt");
      }

      setImageStatus((prev) => ({ ...prev, [draftId]: "done" }));
      await loadDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Afbeelding genereren mislukt");
    } finally {
      setBusyDraftId(null);
    }
  };

  const updateStatus = async (
    draftId: string,
    action: "approve" | "reject" | "queue_publish" | "publish_now" | "delete",
  ) => {
    setBusyDraftId(draftId);
    try {
      const response = await fetch("/api/admin/news/drafts", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ draftId, action }),
      });

      if (!response.ok) {
        throw new Error("Draftstatus kon niet bijgewerkt worden.");
      }

      await loadDrafts();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Onbekende fout");
    } finally {
      setBusyDraftId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-neutral-900">Draft review</h1>
        <p className="mt-1 text-sm text-neutral-500">Menselijke review blijft verplicht voor publicatie, zeker bij regelgeving, vergunningen en arbeidsrecht.</p>
      </div>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-4">
        {drafts.map((draft) => (
          <article key={draft.id} className="rounded-xl border border-neutral-100 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    <Link href={`/admin/news/drafts/${draft.id}`} className="hover:text-[#F27501]">
                      {draft.title}
                    </Link>
                  </h2>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                    {draft.reviewStatus}
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{draft.excerpt}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                  <span>Aangemaakt: {formatDate(draft.createdAt)}</span>
                  {draft.publishedAt ? (
                    <span className="text-emerald-600 font-medium">Gepubliceerd: {formatDate(draft.publishedAt)}</span>
                  ) : (
                    <span>Laatst bijgewerkt: {formatDate(draft.updatedAt)}</span>
                  )}
                  <span>Publiek: {draft.primaryAudience ?? "onbekend"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                    {draft.heroImageId ? "hero image klaar" : "geen hero image"}
                  </span>
                  {imageStatus[draft.id] === "not_found" ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                      geen bronafbeelding
                    </span>
                  ) : null}
                  {draft.factCheckFlags && draft.factCheckFlags.length > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                      fact-check nodig
                    </span>
                  ) : null}
                </div>
                {draft.factCheckFlags && draft.factCheckFlags.length > 0 ? (
                  <p className="mt-3 text-xs text-amber-800">
                    {draft.factCheckFlags[0]}
                  </p>
                ) : null}
                <div className="mt-3">
                  <Link href={`/admin/news/drafts/${draft.id}`} className="text-sm font-medium text-[#F27501]">
                    Open detail review
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={busyDraftId === draft.id} onClick={() => updateStatus(draft.id, "approve")} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60">
                  Goedkeuren
                </button>
                <button disabled={busyDraftId === draft.id} onClick={() => updateStatus(draft.id, "reject")} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60">
                  Afwijzen
                </button>
                <button disabled={busyDraftId === draft.id} onClick={() => runImageFlow(draft.id)} className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-[#F27501] transition hover:bg-orange-100 disabled:opacity-60">
                  {imageStatus[draft.id] === "finding" ? "Zoeken..." : imageStatus[draft.id] === "branding" ? "Branden..." : "Hero image"}
                </button>
                <button disabled={busyDraftId === draft.id} onClick={() => updateStatus(draft.id, "queue_publish")} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-[#F27501] hover:text-[#F27501] disabled:opacity-60">
                  In queue
                </button>
                <button disabled={busyDraftId === draft.id} onClick={() => updateStatus(draft.id, "publish_now")} className="rounded-xl bg-[#F27501] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#d96800] disabled:opacity-60">
                  Publiceer nu
                </button>
                <button disabled={busyDraftId === draft.id} onClick={() => { if (confirm("Weet je zeker dat je deze draft wilt verwijderen?")) updateStatus(draft.id, "delete"); }} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-400 transition hover:border-red-300 hover:text-red-600 disabled:opacity-60">
                  Verwijderen
                </button>
              </div>
            </div>
          </article>
        ))}
        {!drafts.length ? <p className="text-sm text-neutral-500">Nog geen drafts om te reviewen.</p> : null}
      </div>
    </div>
  );
}
