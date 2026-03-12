"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Vaardigheid {
  id: string;
  categorie: string;
  vaardigheid: string;
}

interface VaardighedenSectionProps {
  vaardigheden: Vaardigheid[];
  onRefresh: () => void;
}

export default function VaardighedenSection({ vaardigheden, onRefresh }: VaardighedenSectionProps) {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [categorie, setCategorie] = useState("");
  const [vaardigheid, setVaardigheid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grouped = vaardigheden.reduce<Record<string, Vaardigheid[]>>((acc, v) => {
    if (!acc[v.categorie]) acc[v.categorie] = [];
    acc[v.categorie].push(v);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!categorie.trim() || !vaardigheid.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/medewerker/vaardigheden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorie: categorie.trim(), vaardigheid: vaardigheid.trim() }),
      });
      if (!res.ok) throw new Error("Toevoegen mislukt");
      toast.success("Vaardigheid toegevoegd");
      setCategorie("");
      setVaardigheid("");
      setShowAdd(false);
      onRefresh();
    } catch {
      toast.error("Kon vaardigheid niet toevoegen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/medewerker/vaardigheden?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      toast.error("Kon vaardigheid niet verwijderen");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900">Vaardigheden</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm font-medium text-[#F27501] hover:text-[#d96800] transition-colors"
        >
          + Toevoegen
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 bg-neutral-50 rounded-xl space-y-3">
          <input
            type="text"
            placeholder="Categorie (bijv. Bediening, Bar)"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Vaardigheid (bijv. Terras, Cocktails)"
            value={vaardigheid}
            onChange={(e) => setVaardigheid(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Annuleren</button>
            <button onClick={handleAdd} disabled={isSubmitting} className="px-4 py-2 text-sm bg-[#F27501] text-white rounded-lg font-medium hover:bg-[#d96800] disabled:opacity-50">
              {isSubmitting ? "Toevoegen..." : "Toevoegen"}
            </button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-neutral-500">Nog geen vaardigheden toegevoegd.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, skills]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F27501]/10 text-[#F27501] rounded-full text-sm font-medium">
                    {s.vaardigheid}
                    <button onClick={() => handleDelete(s.id)} className="hover:text-red-600 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
