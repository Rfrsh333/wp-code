"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Werkervaring {
  id: string;
  werkgever: string;
  functie: string;
  categorie: string;
  locatie: string | null;
  start_datum: string;
  eind_datum: string | null;
}

interface WerkervaringSectionProps {
  werkervaring: Werkervaring[];
  onRefresh: () => void;
}

export default function WerkervaringSection({ werkervaring, onRefresh }: WerkervaringSectionProps) {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    werkgever: "",
    functie: "",
    categorie: "",
    locatie: "",
    start_datum: "",
    eind_datum: "",
  });

  const formatPeriod = (start: string, end: string | null) => {
    const s = new Date(start).toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
    const e = end ? new Date(end).toLocaleDateString("nl-NL", { month: "short", year: "numeric" }) : "heden";
    return `${s} - ${e}`;
  };

  const handleAdd = async () => {
    if (!form.werkgever || !form.functie || !form.categorie || !form.start_datum) {
      toast.warning("Vul verplichte velden in");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/medewerker/werkervaring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          locatie: form.locatie || null,
          eind_datum: form.eind_datum || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Werkervaring toegevoegd");
      setForm({ werkgever: "", functie: "", categorie: "", locatie: "", start_datum: "", eind_datum: "" });
      setShowAdd(false);
      onRefresh();
    } catch {
      toast.error("Kon werkervaring niet toevoegen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Werkervaring verwijderen?")) return;
    try {
      const res = await fetch(`/api/medewerker/werkervaring?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      toast.error("Kon werkervaring niet verwijderen");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900">Werkervaring</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm font-medium text-[#F27501] hover:text-[#d96800] transition-colors"
        >
          + Toevoegen
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 bg-neutral-50 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Werkgever *" value={form.werkgever} onChange={(e) => setForm({ ...form, werkgever: e.target.value })}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
            <input type="text" placeholder="Functie *" value={form.functie} onChange={(e) => setForm({ ...form, functie: e.target.value })}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
            <input type="text" placeholder="Categorie * (bijv. Bediening)" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
            <input type="text" placeholder="Locatie" value={form.locatie} onChange={(e) => setForm({ ...form, locatie: e.target.value })}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Startdatum *</label>
              <input type="date" value={form.start_datum} onChange={(e) => setForm({ ...form, start_datum: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Einddatum (leeg = heden)</label>
              <input type="date" value={form.eind_datum} onChange={(e) => setForm({ ...form, eind_datum: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Annuleren</button>
            <button onClick={handleAdd} disabled={isSubmitting} className="px-4 py-2 text-sm bg-[#F27501] text-white rounded-lg font-medium hover:bg-[#d96800] disabled:opacity-50">
              {isSubmitting ? "Toevoegen..." : "Toevoegen"}
            </button>
          </div>
        </div>
      )}

      {werkervaring.length === 0 ? (
        <p className="text-sm text-neutral-500">Nog geen werkervaring toegevoegd.</p>
      ) : (
        <div className="space-y-4">
          {werkervaring.map((w, i) => (
            <div key={w.id}>
              {i > 0 && <div className="border-t border-neutral-100 mb-4" />}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-neutral-900">{w.werkgever}{w.locatie ? ` - ${w.locatie}` : ""}</h4>
                  <p className="text-sm text-neutral-500">
                    {formatPeriod(w.start_datum, w.eind_datum)} · {w.categorie}
                  </p>
                  <p className="text-sm text-neutral-600 mt-0.5">{w.functie}</p>
                </div>
                <button onClick={() => handleDelete(w.id)} className="text-neutral-400 hover:text-red-500 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
