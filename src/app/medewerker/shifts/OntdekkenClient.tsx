"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Search } from "lucide-react";
import ShiftCard from "@/components/medewerker/ShiftCard";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

interface Shift {
  id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  omschrijving?: string;
  uurtarief: number;
  plekken_beschikbaar: number;
  plekken_totaal: number;
  klant: {
    bedrijfsnaam: string;
    bedrijf_foto_url?: string;
    rating?: number;
  };
  tags?: string[];
  is_speciaal?: boolean;
}

export default function OntdekkenClient() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedShifts, setSavedShifts] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/shifts/beschikbaar");
      if (!res.ok) {
        toast.error("Shifts ophalen mislukt");
        return;
      }
      const data = await res.json();
      setShifts(data.shifts || []);
    } catch (err) {
      console.error("Fetch shifts error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (shiftId: string) => {
    try {
      const res = await fetch("/api/medewerker/shifts/aanmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dienst_id: shiftId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Aanmelden mislukt");
        return;
      }

      toast.success("Aanmelding geslaagd! 🎉");
      await fetchShifts(); // Refresh om beschikbare plekken te updaten
    } catch (err) {
      console.error("Apply error:", err);
      toast.error("Er ging iets mis");
    }
  };

  const handleSave = (shiftId: string) => {
    setSavedShifts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
        toast.success("Shift verwijderd uit opgeslagen");
      } else {
        newSet.add(shiftId);
        toast.success("Shift opgeslagen");
      }
      return newSet;
    });
  };

  return (
    <MedewerkerResponsiveLayout>
    <div className="min-h-screen bg-[var(--mp-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">
              Ontdekken
            </h1>
            <button
              onClick={() => setFilterOpen(true)}
              className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center transition-colors active:scale-95"
              aria-label="Filters"
            >
              <SlidersHorizontal className="w-5 h-5 text-[var(--mp-text-primary)]" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--mp-text-tertiary)]" />
            <input
              type="text"
              placeholder="Zoek op locatie of bedrijf..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] border border-transparent focus:border-[var(--mp-accent)] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Shifts Feed */}
      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--mp-bg)] mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-[var(--mp-text-tertiary)]" />
            </div>
            <p className="text-[var(--mp-text-secondary)] text-sm">
              Geen shifts beschikbaar op dit moment
            </p>
          </div>
        ) : (
          shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onApply={handleApply}
              onSave={handleSave}
              saved={savedShifts.has(shift.id)}
            />
          ))
        )}
      </div>

      {/* Filter Bottom Sheet */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/50"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--mp-card)] rounded-t-[var(--mp-radius)] max-h-[90vh] overflow-y-auto animate-sheet-up safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-4">
              <div className="w-12 h-1 rounded-full bg-[var(--mp-separator)]" />
            </div>

            <div className="px-4 pb-6">
              <h2 className="text-xl font-bold text-[var(--mp-text-primary)] mb-4">
                Filters
              </h2>

              {/* Filter options - placeholder */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Datum
                  </label>
                  <select className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none">
                    <option>Vandaag</option>
                    <option>Deze week</option>
                    <option>Volgende week</option>
                    <option>Deze maand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Locatie
                  </label>
                  <input
                    type="text"
                    placeholder="Bijv. Utrecht, Amsterdam..."
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Uurtarief (min)
                  </label>
                  <input
                    type="number"
                    placeholder="€16"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  />
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setFilterOpen(false)}
                  className="flex-1 py-3.5 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setFilterOpen(false);
                    toast.success("Filters toegepast");
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
                >
                  Toon resultaten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </MedewerkerResponsiveLayout>
  );
}
