"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Kandidaat {
  id: string;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  email: string;
  telefoon: string;
  stad: string;
  onboarding_status?: string;
  onboarding_auto?: boolean;
  onboarding_step?: string | null;
  ai_screening_score?: number | null;
  laatste_onboarding_actie?: string | null;
  created_at: string;
  documenten_compleet?: boolean;
}

interface PipelineViewProps {
  inschrijvingen: Kandidaat[];
  onSelectKandidaat: (id: string) => void;
  onRefresh: () => void;
}

const PIPELINE_COLUMNS = [
  { status: "nieuw", label: "Nieuw", color: "bg-blue-500", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { status: "in_beoordeling", label: "In beoordeling", color: "bg-yellow-500", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
  { status: "documenten_opvragen", label: "Documenten", color: "bg-orange-500", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  { status: "wacht_op_kandidaat", label: "Wacht op kandidaat", color: "bg-purple-500", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { status: "goedgekeurd", label: "Goedgekeurd", color: "bg-emerald-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  { status: "inzetbaar", label: "Inzetbaar", color: "bg-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
] as const;

export default function PipelineView({ inschrijvingen, onSelectKandidaat, onRefresh }: PipelineViewProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const toggleAutopilot = async (kandidaatId: string, currentValue: boolean | undefined) => {
    setTogglingId(kandidaatId);
    try {
      const headers = await getAuthHeader();
      await fetch("/api/admin/data", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "inschrijvingen",
          id: kandidaatId,
          data: { onboarding_auto: !currentValue },
        }),
      });
      onRefresh();
    } catch (err) {
      console.error("Toggle autopilot error:", err);
    }
    setTogglingId(null);
  };

  const daysSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const days = Math.floor((now - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const fullName = (k: Kandidaat) =>
    [k.voornaam, k.tussenvoegsel, k.achternaam].filter(Boolean).join(" ");

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {PIPELINE_COLUMNS.map((col) => {
          const items = inschrijvingen.filter((i) => (i.onboarding_status || "nieuw") === col.status);

          return (
            <div key={col.status} className="w-72 flex-shrink-0">
              {/* Column header */}
              <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl ${col.bgColor} border ${col.borderColor}`}>
                <div className={`w-3 h-3 rounded-full ${col.color}`} />
                <span className="text-sm font-semibold text-neutral-800">{col.label}</span>
                <span className="ml-auto text-xs font-bold text-neutral-500 bg-white px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              {/* Column items */}
              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                    Geen kandidaten
                  </div>
                ) : (
                  items.map((kandidaat) => {
                    const dagenInStap = daysSince(kandidaat.laatste_onboarding_actie || kandidaat.created_at);

                    return (
                      <div
                        key={kandidaat.id}
                        className="bg-white rounded-xl border border-neutral-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => onSelectKandidaat(kandidaat.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-neutral-900 leading-tight">
                              {fullName(kandidaat)}
                            </p>
                            <p className="text-xs text-neutral-500">{kandidaat.stad}</p>
                          </div>
                          {kandidaat.ai_screening_score != null && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                (kandidaat.ai_screening_score ?? 0) >= 8
                                  ? "bg-green-100 text-green-700"
                                  : (kandidaat.ai_screening_score ?? 0) >= 6
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {kandidaat.ai_screening_score}/10
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Dagen in stap */}
                          {dagenInStap !== null && dagenInStap > 0 && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                dagenInStap >= 5
                                  ? "bg-red-100 text-red-600"
                                  : dagenInStap >= 3
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {dagenInStap}d
                            </span>
                          )}

                          {/* Documenten compleet */}
                          {!!kandidaat.documenten_compleet && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600">
                              Docs OK
                            </span>
                          )}

                          {/* Autopilot indicator */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAutopilot(kandidaat.id, kandidaat.onboarding_auto);
                            }}
                            disabled={togglingId === kandidaat.id}
                            className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${
                              !!kandidaat.onboarding_auto
                                ? "bg-[#F27501]/10 text-[#F27501] hover:bg-[#F27501]/20"
                                : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                            }`}
                            title={!!kandidaat.onboarding_auto ? "Autopilot aan — klik om uit te zetten" : "Autopilot uit — klik om aan te zetten"}
                          >
                            {togglingId === kandidaat.id ? "..." : !!kandidaat.onboarding_auto ? "AUTO" : "HAND"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
