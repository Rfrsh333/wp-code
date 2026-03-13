"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  functie: string[];
}

interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
}

interface Aanbieding {
  id: string;
  dienst_id: string;
  medewerker_id: string;
  status: string;
  aangeboden_at: string;
  reactie_at: string | null;
  medewerker_naam?: string;
}

interface Props {
  dienst: Dienst;
  onClose: () => void;
}

export default function ShiftAanbiedingenPanel({ dienst, onClose }: Props) {
  const toast = useToast();
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [aanbiedingen, setAanbiedingen] = useState<Aanbieding[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notitie, setNotitie] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [medRes, aanbRes] = await Promise.all([
        fetch("/api/admin/medewerkers", { headers: getAuthHeaders() }),
        fetch(`/api/admin/aanbiedingen?dienst_id=${dienst.id}`, { headers: getAuthHeaders() }),
      ]);
      const medData = await medRes.json();
      const aanbData = await aanbRes.json();
      setMedewerkers(medData.medewerkers || []);
      setAanbiedingen(aanbData.aanbiedingen || []);
    } catch {
      toast.error("Kon data niet laden");
    } finally {
      setIsLoading(false);
    }
  };

  const verstuurAanbiedingen = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecteer minimaal één medewerker");
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/aanbiedingen", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          dienst_id: dienst.id,
          medewerker_ids: Array.from(selectedIds),
          notitie: notitie || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Aanbieding verstuurd naar ${selectedIds.size} medewerker(s)`);
      setSelectedIds(new Set());
      setNotitie("");
      fetchData();
    } catch {
      toast.error("Kon aanbiedingen niet versturen");
    } finally {
      setIsSending(false);
    }
  };

  const toggleMedewerker = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // Filter medewerkers by matching functie
  const matchendeMedewerkers = medewerkers.filter((m) =>
    m.functie?.some((f) => f.toLowerCase() === dienst.functie.toLowerCase())
  );
  const overigeMedewerkers = medewerkers.filter(
    (m) => !m.functie?.some((f) => f.toLowerCase() === dienst.functie.toLowerCase())
  );

  // Already offered medewerker IDs
  const alAangeboden = new Set(aanbiedingen.map((a) => a.medewerker_id));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aangeboden": return { label: "Wacht op reactie", classes: "bg-yellow-100 text-yellow-700" };
      case "geaccepteerd": return { label: "Geaccepteerd", classes: "bg-green-100 text-green-700" };
      case "afgewezen": return { label: "Afgewezen", classes: "bg-red-100 text-red-700" };
      case "verlopen": return { label: "Verlopen", classes: "bg-neutral-100 text-neutral-500" };
      default: return { label: status, classes: "bg-neutral-100 text-neutral-500" };
    }
  };

  const getMedewerkerNaam = (id: string) =>
    medewerkers.find((m) => m.id === id)?.naam || id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 pt-20 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Dienst aanbieden</h3>
              <p className="text-sm text-neutral-500 mt-1">
                {dienst.klant_naam} · {dienst.functie} · {dienst.datum} · {dienst.start_tijd?.slice(0, 5)} - {dienst.eind_tijd?.slice(0, 5)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-3 border-[#F27501] border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Bestaande aanbiedingen */}
              {aanbiedingen.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-neutral-700 mb-3">Huidige aanbiedingen</h4>
                  <div className="space-y-2">
                    {aanbiedingen.map((a) => {
                      const badge = getStatusBadge(a.status);
                      return (
                        <div key={a.id} className="flex items-center justify-between bg-neutral-50 rounded-xl p-3">
                          <span className="text-sm font-medium">{getMedewerkerNaam(a.medewerker_id)}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.classes}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs text-neutral-400">{formatDate(a.aangeboden_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Medewerkers selectie */}
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">
                Selecteer medewerkers {selectedIds.size > 0 && `(${selectedIds.size} geselecteerd)`}
              </h4>

              {matchendeMedewerkers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-green-600 font-medium mb-2">Matching functie: {dienst.functie}</p>
                  <div className="space-y-1">
                    {matchendeMedewerkers.map((m) => {
                      const isAangeboden = alAangeboden.has(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            isAangeboden
                              ? "border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                              : selectedIds.has(m.id)
                              ? "border-[#F27501] bg-orange-50"
                              : "border-neutral-200 hover:border-neutral-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m.id)}
                            onChange={() => !isAangeboden && toggleMedewerker(m.id)}
                            disabled={isAangeboden}
                            className="rounded border-neutral-300 text-[#F27501] focus:ring-[#F27501]"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{m.naam}</p>
                            <p className="text-xs text-neutral-500">{m.email}</p>
                          </div>
                          {isAangeboden && <span className="text-xs text-neutral-400">Al aangeboden</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {overigeMedewerkers.length > 0 && (
                <details className="mb-4">
                  <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700 mb-2">
                    Overige medewerkers ({overigeMedewerkers.length})
                  </summary>
                  <div className="space-y-1">
                    {overigeMedewerkers.map((m) => {
                      const isAangeboden = alAangeboden.has(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            isAangeboden
                              ? "border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                              : selectedIds.has(m.id)
                              ? "border-[#F27501] bg-orange-50"
                              : "border-neutral-200 hover:border-neutral-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m.id)}
                            onChange={() => !isAangeboden && toggleMedewerker(m.id)}
                            disabled={isAangeboden}
                            className="rounded border-neutral-300 text-[#F27501] focus:ring-[#F27501]"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{m.naam}</p>
                            <p className="text-xs text-neutral-500">{m.email} · {(m.functie || []).join(", ")}</p>
                          </div>
                          {isAangeboden && <span className="text-xs text-neutral-400">Al aangeboden</span>}
                        </label>
                      );
                    })}
                  </div>
                </details>
              )}

              {/* Notitie */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notitie (optioneel)</label>
                <textarea
                  value={notitie}
                  onChange={(e) => setNotitie(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#F27501]"
                  placeholder="Extra info voor de medewerker..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-neutral-300 rounded-xl text-sm font-medium hover:bg-neutral-50">
            Sluiten
          </button>
          <button
            onClick={verstuurAanbiedingen}
            disabled={isSending || selectedIds.size === 0}
            className="px-6 py-2 bg-[#F27501] hover:bg-[#d96800] text-white text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {isSending ? "Verzenden..." : `Aanbieden (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
