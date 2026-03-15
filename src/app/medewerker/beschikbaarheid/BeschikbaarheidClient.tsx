"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Check } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

const DAGEN = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const TIJDBLOKKEN = [
  { id: "ochtend", label: "Ochtend", tijd: "06:00 - 12:00" },
  { id: "middag", label: "Middag", tijd: "12:00 - 18:00" },
  { id: "avond", label: "Avond", tijd: "18:00 - 24:00" },
  { id: "nacht", label: "Nacht", tijd: "00:00 - 06:00" },
];

export default function BeschikbaarheidClient() {
  const [beschikbaarheid, setBeschikbaarheid] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBeschikbaarheid();
  }, []);

  const fetchBeschikbaarheid = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/beschikbaarheid");
      if (res.ok) {
        const data = await res.json();
        setBeschikbaarheid(data.beschikbaarheid || {});
      }
    } catch (err) {
      console.error("Fetch beschikbaarheid error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTijdblok = (dag: string, tijdblokId: string) => {
    setBeschikbaarheid((prev) => {
      const dagBlokken = prev[dag] || [];
      const isSelected = dagBlokken.includes(tijdblokId);

      return {
        ...prev,
        [dag]: isSelected
          ? dagBlokken.filter((id) => id !== tijdblokId)
          : [...dagBlokken, tijdblokId],
      };
    });
  };

  const selectAlleDagen = (tijdblokId: string) => {
    setBeschikbaarheid((prev) => {
      const newBeschikbaarheid = { ...prev };
      DAGEN.forEach((dag) => {
        const dagBlokken = newBeschikbaarheid[dag] || [];
        if (!dagBlokken.includes(tijdblokId)) {
          newBeschikbaarheid[dag] = [...dagBlokken, tijdblokId];
        }
      });
      return newBeschikbaarheid;
    });
  };

  const handleOpslaan = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/medewerker/beschikbaarheid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beschikbaarheid }),
      });

      if (!res.ok) {
        toast.error("Opslaan mislukt");
        return;
      }

      toast.success("Beschikbaarheid opgeslagen! ✅");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
          <div className="px-4 py-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">
              Beschikbaarheid
            </h1>
            <p className="text-sm text-[var(--mp-text-secondary)] mt-1">
              Geef aan wanneer je beschikbaar bent om te werken
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Info card */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-[var(--mp-radius)] p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Tip: Meer beschikbaarheid = meer shifts!
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Hoe meer je beschikbaar bent, hoe meer kans je maakt op leuke diensten.
                    </p>
                  </div>
                </div>
              </div>

              {/* Beschikbaarheid grid */}
              <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
                {/* Desktop: table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[var(--mp-bg)] border-b border-[var(--mp-separator)]">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--mp-text-primary)]">
                          Dag
                        </th>
                        {TIJDBLOKKEN.map((tijdblok) => (
                          <th key={tijdblok.id} className="px-4 py-3 text-center">
                            <div className="text-sm font-semibold text-[var(--mp-text-primary)]">
                              {tijdblok.label}
                            </div>
                            <div className="text-xs text-[var(--mp-text-tertiary)] mt-0.5">
                              {tijdblok.tijd}
                            </div>
                            <button
                              onClick={() => selectAlleDagen(tijdblok.id)}
                              className="text-xs text-[var(--mp-accent)] hover:underline mt-1"
                            >
                              Selecteer alle dagen
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAGEN.map((dag, idx) => (
                        <tr
                          key={dag}
                          className={idx !== DAGEN.length - 1 ? "border-b border-[var(--mp-separator)]" : ""}
                        >
                          <td className="px-4 py-3 font-medium text-[var(--mp-text-primary)]">
                            {dag}
                          </td>
                          {TIJDBLOKKEN.map((tijdblok) => {
                            const isSelected = beschikbaarheid[dag]?.includes(tijdblok.id);
                            return (
                              <td key={tijdblok.id} className="px-4 py-3 text-center">
                                <button
                                  onClick={() => toggleTijdblok(dag, tijdblok.id)}
                                  className={`w-12 h-12 rounded-xl transition-all ${
                                    isSelected
                                      ? "bg-[var(--mp-accent)] text-white shadow-lg"
                                      : "bg-[var(--mp-bg)] text-[var(--mp-text-tertiary)] hover:bg-[var(--mp-accent)]/10"
                                  }`}
                                >
                                  {isSelected && <Check className="w-5 h-5 mx-auto" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: card view */}
                <div className="md:hidden divide-y divide-[var(--mp-separator)]">
                  {DAGEN.map((dag) => (
                    <div key={dag} className="p-4">
                      <h3 className="text-sm font-semibold text-[var(--mp-text-primary)] mb-3">
                        {dag}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {TIJDBLOKKEN.map((tijdblok) => {
                          const isSelected = beschikbaarheid[dag]?.includes(tijdblok.id);
                          return (
                            <button
                              key={tijdblok.id}
                              onClick={() => toggleTijdblok(dag, tijdblok.id)}
                              className={`p-3 rounded-xl transition-all text-left ${
                                isSelected
                                  ? "bg-[var(--mp-accent)] text-white shadow-lg"
                                  : "bg-[var(--mp-bg)] text-[var(--mp-text-secondary)]"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {isSelected && <Check className="w-4 h-4" />}
                                <span className="text-sm font-semibold">
                                  {tijdblok.label}
                                </span>
                              </div>
                              <div className={`text-xs ${isSelected ? "text-white/80" : "text-[var(--mp-text-tertiary)]"}`}>
                                {tijdblok.tijd}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opslaan button */}
              <div className="mt-6">
                <button
                  onClick={handleOpslaan}
                  disabled={saving}
                  className="w-full py-4 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Beschikbaarheid opslaan
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
