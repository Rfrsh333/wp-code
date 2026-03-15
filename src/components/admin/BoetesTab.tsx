"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

interface Boete {
  id: string;
  medewerker_id: string;
  dienst_id: string | null;
  bedrag: number;
  reden: string;
  status: "openstaand" | "betaald" | "ingetrokken";
  created_at: string;
  afgehandeld_at: string | null;
  afgehandeld_door: string | null;
  mollie_payment_id: string | null;
  mollie_checkout_url: string | null;
  medewerker: { naam: string; email: string } | null;
  dienst: { datum: string; locatie: string; functie: string; klant_naam: string } | null;
}

interface VervangingMonitor {
  id: string;
  dienst_id: string;
  status: string;
  created_at: string;
  vervalt_op: string | null;
  medewerker: { naam: string } | null;
  dienst: { datum: string; start_tijd: string; eind_tijd: string; locatie: string; functie: string; klant_naam: string } | null;
}

type FilterStatus = "alle" | "openstaand" | "betaald" | "ingetrokken";
type ViewTab = "boetes" | "vervangingen";

export default function BoetesTab() {
  const toast = useToast();
  const [boetes, setBoetes] = useState<Boete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("alle");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("boetes");
  const [vervangingen, setVervangingen] = useState<VervangingMonitor[]>([]);

  const fetchVervangingen = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/boetes?type=vervangingen", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setVervangingen(data.vervangingen || []);
    } catch {
      // silent
    }
  }, []);

  const fetchBoetes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/boetes", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setBoetes(data.boetes || []);
    } catch {
      toast.error("Kon boetes niet laden");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoetes(); fetchVervangingen(); }, [fetchBoetes, fetchVervangingen]);

  const doAction = async (action: string, params: Record<string, string>) => {
    const key = params.boete_id || params.medewerker_id || "";
    setActionLoading(key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/boetes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action, ...params }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Actie mislukt");
      } else {
        toast.success("Actie uitgevoerd");
        fetchBoetes();
      }
    } catch {
      toast.error("Netwerkfout");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBoetes = filter === "alle" ? boetes : boetes.filter((b) => b.status === filter);

  const statusKleur: Record<string, string> = {
    openstaand: "bg-red-100 text-red-700",
    betaald: "bg-green-100 text-green-700",
    ingetrokken: "bg-neutral-200 text-neutral-600",
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  const getUrenTotStart = (datum: string, startTijd: string) => {
    const start = new Date(`${datum}T${startTijd}`);
    return Math.max(0, (start.getTime() - Date.now()) / (1000 * 60 * 60));
  };

  return (
    <div>
      {/* View tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setViewTab("boetes")}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
            viewTab === "boetes" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Boetes ({boetes.filter((b) => b.status === "openstaand").length} open)
        </button>
        <button
          onClick={() => setViewTab("vervangingen")}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
            viewTab === "vervangingen" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Vervangings-monitor ({vervangingen.filter((v) => v.status === "open").length} actief)
        </button>
      </div>

      {viewTab === "vervangingen" && (
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Vervangings-monitor</h2>
          {vervangingen.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p className="text-lg font-medium">Geen actieve vervangingsverzoeken</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vervangingen.map((v) => {
                const mw = Array.isArray(v.medewerker) ? v.medewerker[0] : v.medewerker;
                const dienst = Array.isArray(v.dienst) ? v.dienst[0] : v.dienst;
                const uren = dienst ? getUrenTotStart(dienst.datum, dienst.start_tijd) : 0;
                const isUrgent = uren < 6 && uren > 0;

                return (
                  <div key={v.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${isUrgent ? "border-red-300 bg-red-50" : "border-neutral-100"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-900">{mw?.naam || "Onbekend"}</p>
                        {dienst && (
                          <p className="text-sm text-neutral-500 mt-0.5">
                            {dienst.functie} · {dienst.klant_naam} · {dienst.locatie}
                          </p>
                        )}
                        {dienst && (
                          <p className="text-sm text-neutral-400 mt-0.5">
                            {formatDate(dienst.datum)} · {dienst.start_tijd?.slice(0, 5)} - {dienst.eind_tijd?.slice(0, 5)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          v.status === "open"
                            ? isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            : v.status === "geaccepteerd" ? "bg-green-100 text-green-700"
                            : "bg-neutral-200 text-neutral-600"
                        }`}>
                          {v.status}
                        </span>
                        {uren > 0 && v.status === "open" && (
                          <p className={`text-xs mt-1 ${isUrgent ? "text-red-600 font-bold" : "text-neutral-400"}`}>
                            {isUrgent ? "⚠️ " : ""}Dienst begint over {Math.floor(uren)}u
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewTab === "boetes" && (<>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Boetes</h2>
        <div className="flex gap-2">
          {(["alle", "openstaand", "betaald", "ingetrokken"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === f ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "alle" && ` (${boetes.filter((b) => b.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {filteredBoetes.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p className="text-lg font-medium">Geen boetes gevonden</p>
          <p className="text-sm mt-1">Er zijn geen boetes met de geselecteerde filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Medewerker</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Dienst</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Bedrag</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Reden</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredBoetes.map((boete) => {
                const mw = Array.isArray(boete.medewerker) ? boete.medewerker[0] : boete.medewerker;
                const dienst = Array.isArray(boete.dienst) ? boete.dienst[0] : boete.dienst;
                const loading = actionLoading === boete.id || actionLoading === boete.medewerker_id;

                return (
                  <tr key={boete.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-sm text-neutral-900">{mw?.naam || "Onbekend"}</p>
                      <p className="text-xs text-neutral-500">{mw?.email || ""}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {dienst ? (
                        <>
                          <p>{dienst.functie} - {dienst.klant_naam}</p>
                          <p className="text-xs text-neutral-400">{dienst.locatie} · {formatDate(dienst.datum)}</p>
                        </>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-neutral-900">€{boete.bedrag.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{boete.reden}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">{formatDate(boete.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusKleur[boete.status] || ""}`}>
                        {boete.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {boete.status === "openstaand" && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => doAction("mark_paid", { boete_id: boete.id })}
                            disabled={loading}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Betaald
                          </button>
                          <button
                            onClick={() => doAction("kwijtschelden", { boete_id: boete.id })}
                            disabled={loading}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50"
                          >
                            Kwijtschelden
                          </button>
                          <button
                            onClick={() => doAction("unpause_account", { medewerker_id: boete.medewerker_id })}
                            disabled={loading}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            Account vrijgeven
                          </button>
                        </div>
                      )}
                      {boete.status !== "openstaand" && boete.afgehandeld_door && (
                        <span className="text-xs text-neutral-400">door {boete.afgehandeld_door}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>)}
    </div>
  );
}
