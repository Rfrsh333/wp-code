"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
  stad: string | null;
  branche: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  predicted_deal_value: number | null;
  predicted_conversion_pct: number | null;
  laatste_contact_datum: string | null;
}

interface Props {
  onSelectLead: (id: string) => void;
  onRefresh: () => void;
}

const STAGES = [
  { id: "nieuw", label: "Nieuw", color: "border-blue-400 bg-blue-50", headerBg: "bg-blue-100" },
  { id: "benaderd", label: "Benaderd", color: "border-amber-400 bg-amber-50", headerBg: "bg-amber-100" },
  { id: "interesse", label: "Interesse", color: "border-purple-400 bg-purple-50", headerBg: "bg-purple-100" },
  { id: "offerte", label: "Offerte", color: "border-cyan-400 bg-cyan-50", headerBg: "bg-cyan-100" },
  { id: "klant", label: "Klant", color: "border-green-400 bg-green-50", headerBg: "bg-green-100" },
  { id: "afgewezen", label: "Afgewezen", color: "border-red-400 bg-red-50", headerBg: "bg-red-100" },
];

// Gemiddelde branche waarden als fallback wanneer predicted_deal_value ontbreekt
const BRANCHE_WAARDEN: Record<string, number> = {
  restaurant: 3500, cafe: 2000, hotel: 5000, catering: 4000,
  events: 3000, bar: 1800, fastfood: 2500, bezorging: 2000,
};
const DEFAULT_WAARDE = 3000;

function getLeadWaarde(lead: Lead): number {
  if (lead.predicted_deal_value) return lead.predicted_deal_value;
  return BRANCHE_WAARDEN[(lead.branche || "").toLowerCase()] || DEFAULT_WAARDE;
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export default function PipelineView({ onSelectLead, onRefresh }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/leads?limit=500", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setLeads(json.data || []);
    }
    setIsLoading(false);
  }, [getToken]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const moveToStage = async (leadId: string, newStage: string) => {
    const token = await getToken();
    await fetch("/api/admin/acquisitie/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "update", id: leadId, data: { pipeline_stage: newStage } }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage: newStage } : l))
    );
    onRefresh();
  };

  const getScoreBadge = (score: number | null) => {
    if (!score) return "";
    if (score >= 70) return "bg-green-200 text-green-800";
    if (score >= 40) return "bg-amber-200 text-amber-800";
    return "bg-red-200 text-red-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Bereken totalen
  const activeLeads = leads.filter((l) => l.pipeline_stage !== "afgewezen");
  const totaalPipelineWaarde = activeLeads.reduce((sum, l) => sum + getLeadWaarde(l), 0);
  const gewogenWaarde = activeLeads.reduce((sum, l) => {
    const pct = l.predicted_conversion_pct || 10;
    return sum + getLeadWaarde(l) * (pct / 100);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Pipeline totalen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500 font-medium">Totaal in pipeline</p>
          <p className="text-xl font-bold text-neutral-900">{leads.length} <span className="text-sm font-normal text-neutral-400">leads</span></p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500 font-medium">Pipeline waarde</p>
          <p className="text-xl font-bold text-[#F27501]">{formatEuro(totaalPipelineWaarde)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500 font-medium">Gewogen waarde</p>
          <p className="text-xl font-bold text-green-600">{formatEuro(gewogenWaarde)}</p>
          <p className="text-[10px] text-neutral-400">op basis van conversiekans</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500 font-medium">Gem. dealwaarde</p>
          <p className="text-xl font-bold text-neutral-900">
            {activeLeads.length > 0 ? formatEuro(totaalPipelineWaarde / activeLeads.length) : "–"}
          </p>
        </div>
      </div>

      {/* Kanban kolommen */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.pipeline_stage === stage.id);
          const stageWaarde = stageLeads.reduce((sum, l) => sum + getLeadWaarde(l), 0);

          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 w-72 border-t-4 rounded-xl bg-white ${stage.color}`}
            >
              {/* Stage header met waarde */}
              <div className="p-3 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-800 text-sm">{stage.label}</h3>
                  <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>
                <p className="text-sm font-semibold text-neutral-700 mt-1">
                  {formatEuro(stageWaarde)}
                </p>
              </div>

              {/* Lead kaarten */}
              <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                {stageLeads.map((lead) => {
                  const waarde = getLeadWaarde(lead);
                  return (
                    <div
                      key={lead.id}
                      className="p-3 bg-white rounded-lg border border-neutral-200 hover:border-[#F27501] transition-colors cursor-pointer shadow-sm"
                      onClick={() => onSelectLead(lead.id)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-neutral-900 text-sm truncate flex-1">{lead.bedrijfsnaam}</p>
                        {lead.ai_score != null && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ml-1 flex-shrink-0 ${getScoreBadge(lead.ai_score)}`}>
                            {lead.ai_score}
                          </span>
                        )}
                      </div>
                      {lead.contactpersoon && (
                        <p className="text-xs text-neutral-500 mt-0.5">{lead.contactpersoon}</p>
                      )}
                      {/* Waarde + stad */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-neutral-400">{lead.stad || "-"}</span>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                          {formatEuro(waarde)}/mnd
                        </span>
                      </div>
                      {/* Conversiekans indicator */}
                      {lead.predicted_conversion_pct != null && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
                            <span>Conversiekans</span>
                            <span className="font-medium">{lead.predicted_conversion_pct}%</span>
                          </div>
                          <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                lead.predicted_conversion_pct >= 60 ? "bg-green-500" :
                                lead.predicted_conversion_pct >= 30 ? "bg-amber-500" : "bg-red-400"
                              }`}
                              style={{ width: `${Math.min(lead.predicted_conversion_pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Stage move buttons */}
                      <div className="flex gap-1 mt-2">
                        {STAGES.filter((s) => s.id !== stage.id).slice(0, 3).map((s) => (
                          <button
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); moveToStage(lead.id, s.id); }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 hover:bg-neutral-200 truncate"
                            title={`Verplaats naar ${s.label}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {stageLeads.length === 0 && (
                  <p className="text-xs text-neutral-400 text-center py-4">Geen leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
