"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SourceItem {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl: string;
  rssUrl: string | null;
  trustLevel: string;
  fetchFrequency: string;
  region: string | null;
  categoryFocus: string[];
}

interface SourceFormState {
  name: string;
  sourceType: "rss" | "scrape" | "manual";
  sourceUrl: string;
  rssUrl: string;
  trustLevel: "medium" | "high" | "verified" | "low";
  fetchFrequency: "hourly" | "every_6_hours" | "daily" | "weekly";
  region: string;
  categoryFocus: string;
}

const initialForm: SourceFormState = {
  name: "",
  sourceType: "rss",
  sourceUrl: "",
  rssUrl: "",
  trustLevel: "high",
  fetchFrequency: "daily",
  region: "nl",
  categoryFocus: "horeca_nieuws, arbeidsmarkt",
};

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

export default function SourceManagementPanel() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [form, setForm] = useState<SourceFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      setError(null);
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/news/sources", { headers });
      if (!response.ok) {
        throw new Error("Bronnen konden niet geladen worden.");
      }
      const payload = (await response.json()) as { sources: SourceItem[] };
      setSources(payload.sources);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Onbekende fout");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/news/sources", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.name,
          sourceType: form.sourceType,
          sourceUrl: form.sourceUrl,
          rssUrl: form.rssUrl || null,
          trustLevel: form.trustLevel,
          fetchFrequency: form.fetchFrequency,
          region: form.region || null,
          categoryFocus: form.categoryFocus
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        throw new Error("Bron kon niet opgeslagen worden.");
      }

      setForm(initialForm);
      await loadSources();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Onbekende fout");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-neutral-900">Curated sources</h2>
          <p className="mt-1 text-sm text-neutral-500">Voeg RSS- of scrape-bronnen toe per niche, regio en trust level.</p>
        </div>
        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="rounded-xl border border-neutral-100 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-neutral-900">{source.name}</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                  {source.sourceType}
                </span>
                <span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#F27501]">
                  {source.trustLevel}
                </span>
              </div>
              <p className="mt-2 break-all text-sm text-neutral-600">{source.sourceUrl}</p>
              <p className="mt-2 text-xs text-neutral-500">
                Focus: {source.categoryFocus.join(", ")} | Ritme: {source.fetchFrequency} | Regio: {source.region ?? "onbekend"}
              </p>
            </div>
          ))}
          {!sources.length && !isLoading ? (
            <p className="text-sm text-neutral-500">Nog geen bronnen gevonden. Gebruik het formulier rechts om de eerste curated source toe te voegen.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-neutral-900">Nieuwe bron</h2>
          <p className="mt-1 text-sm text-neutral-500">MVP-invoer voor source management. Later kan dit uitgebreid worden met rule profiles en health checks.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required placeholder="Bronnaam" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-0 focus:border-[#F27501]" />
          <select value={form.sourceType} onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value as SourceFormState["sourceType"] }))} className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#F27501]">
            <option value="rss">RSS</option>
            <option value="scrape">Scrape</option>
            <option value="manual">Manual</option>
          </select>
          <input value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} required placeholder="https://example.com" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#F27501]" />
          <input value={form.rssUrl} onChange={(event) => setForm((current) => ({ ...current, rssUrl: event.target.value }))} placeholder="RSS URL (optioneel)" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#F27501]" />
          <input value={form.categoryFocus} onChange={(event) => setForm((current) => ({ ...current, categoryFocus: event.target.value }))} placeholder="horeca_nieuws, arbeidsmarkt" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#F27501]" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.trustLevel} onChange={(event) => setForm((current) => ({ ...current, trustLevel: event.target.value as SourceFormState["trustLevel"] }))} className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#F27501]">
              <option value="verified">Verified</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={form.fetchFrequency} onChange={(event) => setForm((current) => ({ ...current, fetchFrequency: event.target.value as SourceFormState["fetchFrequency"] }))} className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#F27501]">
              <option value="hourly">Hourly</option>
              <option value="every_6_hours">Elke 6 uur</option>
              <option value="daily">Dagelijks</option>
              <option value="weekly">Wekelijks</option>
            </select>
          </div>
          <input value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} placeholder="Regio" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#F27501]" />
          <button disabled={isSaving} className="w-full rounded-xl bg-[#F27501] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d96800] disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? "Opslaan..." : "Bron opslaan"}
          </button>
        </form>
      </section>
    </div>
  );
}
