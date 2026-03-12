"use client";

import { useState, useEffect, useCallback } from "react";

interface Forecast {
  verwachte_omzet_30d: number;
  verwachte_omzet_90d: number;
  verwachte_conversies_30d: number;
  pipeline_gezondheid: "uitstekend" | "goed" | "matig" | "slecht";
  bottlenecks: string[];
  kansen: string[];
  per_stage: { stage: string; count: number; avg_conversion: number; avg_value: number }[];
}

interface TopLead {
  id: string;
  bedrijfsnaam: string;
  branche: string | null;
  stad: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  engagement_score: number | null;
  conversion_pct: number;
  deal_value: number;
  close_days: number;
  churn_risk: string;
  best_channel: string;
  recommended_actions: string[];
}

interface ChurnAlert {
  id: string;
  bedrijfsnaam: string;
  stad: string | null;
  pipeline_stage: string;
  churn_risk: string;
  laatste_contact_datum: string | null;
  predicted_conversion_pct: number | null;
}

type Mode = "forecast" | "top_leads" | "churn";

interface Props {
  onSelectLead?: (id: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  nieuw: "bg-blue-500", benaderd: "bg-cyan-500", interesse: "bg-amber-500", offerte: "bg-purple-500",
};

const GEZONDHEID_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  uitstekend: { color: "text-green-600 bg-green-50 border-green-200", icon: "🚀", label: "Uitstekend" },
  goed: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: "✓", label: "Goed" },
  matig: { color: "text-amber-600 bg-amber-50 border-amber-200", icon: "⚠", label: "Matig" },
  slecht: { color: "text-red-600 bg-red-50 border-red-200", icon: "!", label: "Slecht" },
};

const CHURN_COLORS: Record<string, string> = {
  laag: "bg-green-100 text-green-700",
  midden: "bg-yellow-100 text-yellow-700",
  hoog: "bg-orange-100 text-orange-700",
  kritiek: "bg-red-100 text-red-700",
};

export default function PredictiveView({ onSelectLead }: Props) {
  const [mode, setMode] = useState<Mode>("forecast");
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [churnAlerts, setChurnAlerts] = useState<ChurnAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getToken = useCallback(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/predictions?view=forecast", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setForecast(json.data);
    }
    setIsLoading(false);
  }, [getToken]);

  const fetchTopLeads = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/predictions?view=top_leads&limit=15", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setTopLeads(json.data || []);
    }
    setIsLoading(false);
  }, [getToken]);

  const fetchChurnAlerts = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/predictions?view=churn_alerts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setChurnAlerts(json.data || []);
    }
    setIsLoading(false);
  }, [getToken]);

  useEffect(() => {
    if (mode === "forecast") fetchForecast();
    if (mode === "top_leads") fetchTopLeads();
    if (mode === "churn") fetchChurnAlerts();
  }, [mode, fetchForecast, fetchTopLeads, fetchChurnAlerts]);

  const gezondheid = forecast ? GEZONDHEID_CONFIG[forecast.pipeline_gezondheid] : null;

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "forecast" as Mode, label: "Pipeline Forecast" },
          { id: "top_leads" as Mode, label: "Top Kansen" },
          { id: "churn" as Mode, label: "Churn Alerts" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === tab.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
            {tab.id === "churn" && churnAlerts.length > 0 && mode !== "churn" && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{churnAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-[#F27501] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 mt-2">Voorspellingen berekenen...</p>
        </div>
      )}

      {/* === FORECAST === */}
      {mode === "forecast" && forecast && !isLoading && (
        <div className="space-y-6">
          {/* Pipeline Gezondheid */}
          {gezondheid && (
            <div className={`border rounded-xl p-4 ${gezondheid.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{gezondheid.icon}</span>
                <h3 className="font-semibold">Pipeline Gezondheid: {gezondheid.label}</h3>
              </div>
              <p className="text-sm opacity-80">
                {forecast.pipeline_gezondheid === "uitstekend" && "Je pipeline ziet er sterk uit! Goede doorstroom en veel kansen."}
                {forecast.pipeline_gezondheid === "goed" && "Solide pipeline met ruimte voor verbetering."}
                {forecast.pipeline_gezondheid === "matig" && "Let op: er zijn bottlenecks die aandacht nodig hebben."}
                {forecast.pipeline_gezondheid === "slecht" && "Actie nodig: pipeline heeft urgente aandacht nodig."}
              </p>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Verwachte Omzet 30 Dagen</p>
              <p className="text-3xl font-bold text-green-600 mt-1">&euro;{forecast.verwachte_omzet_30d.toLocaleString("nl-NL")}</p>
              <p className="text-xs text-neutral-400 mt-1">Gewogen op conversiekans</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Verwachte Omzet 90 Dagen</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">&euro;{forecast.verwachte_omzet_90d.toLocaleString("nl-NL")}</p>
              <p className="text-xs text-neutral-400 mt-1">Pipeline waarde</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Verwachte Conversies 30d</p>
              <p className="text-3xl font-bold text-[#F27501] mt-1">{forecast.verwachte_conversies_30d}</p>
              <p className="text-xs text-neutral-400 mt-1">Leads met &gt;50% kans</p>
            </div>
          </div>

          {/* Pipeline Funnel */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Pipeline per Stage</h3>
            <div className="space-y-3">
              {forecast.per_stage.map((stage) => {
                const maxCount = Math.max(...forecast.per_stage.map((s) => s.count), 1);
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-700 w-24 capitalize">{stage.stage}</span>
                    <div className="flex-1 bg-neutral-100 rounded-full h-8 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${STAGE_COLORS[stage.stage] || "bg-neutral-400"}`}
                        style={{ width: `${Math.max((stage.count / maxCount) * 100, 3)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-neutral-700">
                        {stage.count} leads
                      </span>
                    </div>
                    <div className="text-right w-28 flex-shrink-0">
                      <p className="text-xs font-medium text-neutral-700">{stage.avg_conversion}% conv.</p>
                      <p className="text-[10px] text-neutral-400">&euro;{stage.avg_value} gem.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottlenecks & Kansen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecast.bottlenecks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Bottlenecks</h3>
                <ul className="space-y-2">
                  {forecast.bottlenecks.map((b, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {forecast.kansen.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2">Kansen</h3>
                <ul className="space-y-2">
                  {forecast.kansen.map((k, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">&#10003;</span>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === TOP LEADS === */}
      {mode === "top_leads" && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Top Conversie Kansen</h3>
            <button
              onClick={fetchTopLeads}
              className="text-xs px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200"
            >
              Herbereken
            </button>
          </div>

          <div className="space-y-2">
            {topLeads.map((lead, i) => (
              <div key={lead.id} className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    i < 3 ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600"
                  }`}>
                    {i + 1}
                  </div>

                  {/* Lead info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium text-neutral-900 truncate cursor-pointer hover:text-[#F27501]"
                      onClick={() => onSelectLead?.(lead.id)}
                    >
                      {lead.bedrijfsnaam}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {lead.stad} &middot; {lead.branche} &middot; {lead.pipeline_stage}
                    </p>
                  </div>

                  {/* Conversion meter */}
                  <div className="w-20 flex-shrink-0">
                    <div className="flex items-end justify-center gap-0.5 mb-1">
                      <span className={`text-lg font-bold ${
                        lead.conversion_pct >= 60 ? "text-green-600" : lead.conversion_pct >= 30 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {lead.conversion_pct}
                      </span>
                      <span className="text-xs text-neutral-400 mb-0.5">%</span>
                    </div>
                    <div className="bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          lead.conversion_pct >= 60 ? "bg-green-500" : lead.conversion_pct >= 30 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${lead.conversion_pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Deal value */}
                  <div className="text-right w-24 flex-shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">&euro;{lead.deal_value.toLocaleString("nl-NL")}</p>
                    <p className="text-[10px] text-neutral-400">{lead.close_days}d tot close</p>
                  </div>

                  {/* Churn risk */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${CHURN_COLORS[lead.churn_risk] || ""}`}>
                    {lead.churn_risk}
                  </span>

                  {/* Best channel */}
                  <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full flex-shrink-0">
                    {lead.best_channel}
                  </span>
                </div>

                {/* Actions */}
                {lead.recommended_actions.length > 0 && (
                  <div className="mt-2 ml-12 flex flex-wrap gap-1">
                    {lead.recommended_actions.slice(0, 2).map((a, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 bg-neutral-50 text-neutral-600 rounded-full">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {topLeads.length === 0 && (
              <div className="text-center py-12 bg-neutral-50 rounded-xl">
                <p className="text-neutral-500">Geen actieve leads om te analyseren</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === CHURN ALERTS === */}
      {mode === "churn" && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              Churn Risico Alerts
              {churnAlerts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-red-500">({churnAlerts.length} leads)</span>
              )}
            </h3>
            <p className="text-xs text-neutral-400">Leads die dreigen af te haken</p>
          </div>

          {churnAlerts.length === 0 ? (
            <div className="text-center py-12 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 font-medium">Geen leads met hoog churn risico</p>
              <p className="text-xs text-green-500 mt-1">Bereken eerst voorspellingen via &quot;Top Kansen&quot;</p>
            </div>
          ) : (
            <div className="space-y-2">
              {churnAlerts.map((lead) => {
                const daysSince = lead.laatste_contact_datum
                  ? Math.floor((Date.now() - new Date(lead.laatste_contact_datum).getTime()) / 86400000)
                  : null;

                return (
                  <div
                    key={lead.id}
                    className={`border rounded-xl p-4 ${
                      lead.churn_risk === "kritiek" ? "border-red-300 bg-red-50" : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium text-neutral-900 cursor-pointer hover:text-[#F27501]"
                          onClick={() => onSelectLead?.(lead.id)}
                        >
                          {lead.bedrijfsnaam}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {lead.stad} &middot; {lead.pipeline_stage}
                          {daysSince !== null && ` · ${daysSince} dagen sinds contact`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${CHURN_COLORS[lead.churn_risk]}`}>
                          {lead.churn_risk === "kritiek" ? "KRITIEK" : "HOOG RISICO"}
                        </span>
                        {lead.predicted_conversion_pct !== null && (
                          <span className="text-xs text-neutral-400">{lead.predicted_conversion_pct}% kans</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => onSelectLead?.(lead.id)}
                        className="text-xs px-3 py-1 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50"
                      >
                        Bekijk Lead
                      </button>
                      {lead.churn_risk === "kritiek" && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          Neem vandaag nog contact op!
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
