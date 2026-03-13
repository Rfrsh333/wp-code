"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface Aanbieding {
  id: string;
  dienst_id: string;
  status: string;
  aangeboden_at: string;
  verlopen_at: string | null;
  notitie: string | null;
  dienst: {
    klant_naam: string;
    locatie: string;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    functie: string;
    uurtarief: number | null;
  } | null;
}

export default function AanbiedingenSection() {
  const toast = useToast();
  const [aanbiedingen, setAanbiedingen] = useState<Aanbieding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAanbiedingen();
  }, []);

  const fetchAanbiedingen = async () => {
    try {
      const res = await fetch("/api/medewerker/aanbiedingen");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setAanbiedingen(data.aanbiedingen || []);
    } catch {
      // silent - section is optional
    } finally {
      setIsLoading(false);
    }
  };

  const reageer = async (id: string, actie: "geaccepteerd" | "afgewezen") => {
    try {
      const res = await fetch("/api/medewerker/aanbiedingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: actie }),
      });
      if (!res.ok) throw new Error();
      toast.success(actie === "geaccepteerd" ? "Dienst geaccepteerd!" : "Aanbieding afgewezen");
      fetchAanbiedingen();
    } catch {
      toast.error("Kon niet reageren op aanbieding");
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const openAanbiedingen = aanbiedingen.filter((a) => a.status === "aangeboden");

  if (isLoading || openAanbiedingen.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-neutral-900">Shift Aanbiedingen</h3>
        <span className="bg-[#F27501] text-white text-xs font-bold px-2.5 py-1 rounded-full">
          {openAanbiedingen.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {openAanbiedingen.map((aanbieding) => {
          const d = aanbieding.dienst;
          if (!d) return null;

          const isVerlopen = aanbieding.verlopen_at && new Date(aanbieding.verlopen_at) < new Date();

          return (
            <div
              key={aanbieding.id}
              className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-5 shadow-sm border-2 border-[#F27501]/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-neutral-900 capitalize">{d.functie}</h4>
                  <p className="text-sm text-neutral-600">{d.klant_naam}</p>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#F27501]/10 text-[#F27501]">
                  Nieuw
                </span>
              </div>

              <div className="space-y-1.5 mb-4 text-sm text-neutral-600">
                <p>📍 {d.locatie}</p>
                <p>📅 {formatDate(d.datum)} · {d.start_tijd.slice(0, 5)} - {d.eind_tijd.slice(0, 5)}</p>
                {d.uurtarief && <p>💰 <span className="font-semibold text-neutral-900">€{d.uurtarief.toFixed(2)}/uur</span></p>}
              </div>

              {aanbieding.notitie && (
                <p className="text-sm text-neutral-500 italic mb-4 bg-neutral-50 rounded-lg p-3">
                  &ldquo;{aanbieding.notitie}&rdquo;
                </p>
              )}

              {isVerlopen ? (
                <p className="text-sm text-red-500 font-medium text-center">Verlopen</p>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => reageer(aanbieding.id, "afgewezen")}
                    className="flex-1 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition-colors text-sm"
                  >
                    Afwijzen
                  </button>
                  <button
                    onClick={() => reageer(aanbieding.id, "geaccepteerd")}
                    className="flex-1 py-3 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    Accepteren
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
