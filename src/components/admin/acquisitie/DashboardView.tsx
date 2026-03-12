"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

let _recharts: typeof import("recharts") | null = null;

// Lazy wrapper die recharts laadt en dan pas rendert
function RechartsLoader({ children }: { children: (rc: typeof import("recharts")) => React.ReactNode }) {
  const [rc, setRc] = useState<typeof import("recharts") | null>(_recharts);

  useEffect(() => {
    if (_recharts) return;
    import("recharts").then((mod) => {
      _recharts = mod;
      setRc(mod);
    });
  }, []);

  if (!rc) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children(rc)}</>;
}

type Periode = "week" | "maand" | "kwartaal" | "jaar" | "custom";

interface DashboardData {
  periode: { van: string; tot: string; type: string };
  funnel: {
    stages: { stage: string; count: number }[];
    conversions: { van: string; naar: string; percentage: number }[];
    totaalLeads: number;
    afgewezen: number;
  };
  revenue: {
    forecast: number;
    gerealiseerd: number;
    perBranche: Record<string, { count: number; waarde: number }>;
    brancheWaarden: Record<string, number>;
    offertLeads: number;
    klantLeads: number;
  };
  activiteiten: {
    chart: { week: string; emails: number; telefoon: number; whatsapp: number; bezoek: number }[];
    totaal: number;
    emails: number;
    telefoon: number;
    whatsapp: number;
    bezoek: number;
  };
  responseRates: {
    uitgaandEmails: number;
    inkomendReacties: number;
    positieveReacties: number;
    responseRate: number;
    positiefRate: number;
  };
  bestPerforming: {
    topBranches: { branche: string; benaderd: number; reactie: number; klant: number; conversieRate: number; reactieRate: number }[];
    topSteden: { stad: string; totaal: number; klant: number; conversieRate: number }[];
    besteDagen: { dag: number; dagNaam: string; contacten: number; positief: number; successRate: number }[];
    besteUren: { uur: number; contacten: number; positief: number; successRate: number }[];
  };
  velocity: {
    gemDoorlooptijdDagen: number;
    geconverteerdeLeads: number;
    nieuwInPeriode: number;
  };
  campagnes: { naam: string; status: string; verzonden: number; geopend: number; geklikt: number; beantwoord: number; openRate: number; replyRate: number }[];
}

const STAGE_LABELS: Record<string, string> = {
  nieuw: "Nieuw",
  benaderd: "Benaderd",
  interesse: "Interesse",
  offerte: "Offerte",
  klant: "Klant",
  afgewezen: "Afgewezen",
};

const STAGE_COLORS: Record<string, string> = {
  nieuw: "#94a3b8",
  benaderd: "#60a5fa",
  interesse: "#fbbf24",
  offerte: "#f97316",
  klant: "#22c55e",
  afgewezen: "#ef4444",
};

const FUNNEL_COLORS = ["#94a3b8", "#60a5fa", "#fbbf24", "#f97316", "#22c55e"];

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

interface TodoLead {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  branche: string | null;
  stad: string | null;
  telefoon: string | null;
  email: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  engagement_score: number;
  auto_sequence_next_action: string | null;
  auto_sequence_active: boolean;
}

interface DashboardProps {
  onSelectLead?: (leadId: string) => void;
}

export default function DashboardView({ onSelectLead }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [todoLeads, setTodoLeads] = useState<TodoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<Periode>("maand");
  const [customVan, setCustomVan] = useState("");
  const [customTot, setCustomTot] = useState("");

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();

      const params = new URLSearchParams({ periode });
      if (periode === "custom" && customVan && customTot) {
        params.set("van", customVan);
        params.set("tot", customTot);
      }

      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const dashRes = await fetch(`/api/admin/acquisitie/dashboard?${params}`, { headers });

      if (dashRes.ok) {
        setData(await dashRes.json());
      }

      // Todo leads (optioneel, geen error als het faalt)
      try {
        const todoRes = await fetch("/api/admin/ai/next-action", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_today" }),
        });
        if (todoRes.ok) {
          const todoData = await todoRes.json();
          setTodoLeads(todoData.data || []);
        }
      } catch { /* ignore */ }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [getToken, periode, customVan, customTot]);

  useEffect(() => {
    // Kleine delay zodat de supabase sessie geladen kan worden
    const timer = setTimeout(() => fetchData(), 100);
    return () => clearTimeout(timer);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-1/4 mb-4" />
            <div className="h-48 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-neutral-500">Kon dashboard data niet laden</div>;
  }

  const funnelStages = data.funnel.stages.filter((s) => s.stage !== "afgewezen");

  return (
    <div className="space-y-6">
      {/* Periode filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-neutral-600">Periode:</span>
        {(["week", "maand", "kwartaal", "jaar", "custom"] as Periode[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periode === p ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {p === "week" ? "Week" : p === "maand" ? "Maand" : p === "kwartaal" ? "Kwartaal" : p === "jaar" ? "Jaar" : "Custom"}
          </button>
        ))}
        {periode === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customVan} onChange={(e) => setCustomVan(e.target.value)} className="px-2 py-1 border rounded text-sm" />
            <span className="text-neutral-400">t/m</span>
            <input type="date" value={customTot} onChange={(e) => setCustomTot(e.target.value)} className="px-2 py-1 border rounded text-sm" />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Totaal Leads" value={data.funnel.totaalLeads} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <KPICard label="Nieuw deze periode" value={data.velocity.nieuwInPeriode} color="blue" icon="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        <KPICard label="Pipeline waarde" value={formatEuro(data.revenue.forecast)} color="orange" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <KPICard label="Klanten gewonnen" value={data.revenue.klantLeads} color="green" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </div>

      {/* Vandaag te doen */}
      {todoLeads.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-lg font-semibold text-neutral-900">Vandaag te doen</h3>
              <span className="text-xs bg-[#F27501] text-white px-2 py-0.5 rounded-full">{todoLeads.length}</span>
            </div>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {todoLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => onSelectLead?.(lead.id)}
                className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-orange-50 cursor-pointer transition-colors"
              >
                {/* Actie icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  lead.auto_sequence_next_action?.includes("Bellen") ? "bg-green-100 text-green-600" :
                  lead.auto_sequence_next_action?.includes("Email") ? "bg-blue-100 text-blue-600" :
                  lead.auto_sequence_next_action?.includes("WhatsApp") ? "bg-purple-100 text-purple-600" :
                  "bg-neutral-100 text-neutral-500"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {lead.auto_sequence_next_action?.includes("Bellen") ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    ) : lead.auto_sequence_next_action?.includes("Email") ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    )}
                  </svg>
                </div>
                {/* Lead info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900 truncate">{lead.bedrijfsnaam}</p>
                    {lead.ai_score && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        lead.ai_score >= 70 ? "bg-green-100 text-green-700" :
                        lead.ai_score >= 40 ? "bg-yellow-100 text-yellow-700" :
                        "bg-neutral-100 text-neutral-500"
                      }`}>{lead.ai_score}</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">
                    {lead.auto_sequence_next_action || "Actie gepland"}
                    {lead.stad && ` • ${lead.stad}`}
                    {lead.branche && ` • ${lead.branche}`}
                  </p>
                </div>
                {/* Quick actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {lead.telefoon && (
                    <a href={`tel:${lead.telefoon}`} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600" title="Bel">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </a>
                  )}
                  {lead.auto_sequence_active && (
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Autopilot actief" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1: Funnel + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Sales Funnel</h3>
          <div className="h-64">
            <RechartsLoader>
              {(rc) => (
                <rc.ResponsiveContainer width="100%" height="100%">
                  <rc.FunnelChart>
                    <rc.Tooltip formatter={(value) => [String(value), "Leads"]} />
                    <rc.Funnel dataKey="count" data={funnelStages.map((s) => ({ ...s, name: STAGE_LABELS[s.stage] || s.stage }))} isAnimationActive>
                      {funnelStages.map((s, i) => (
                        <rc.Cell key={s.stage} fill={FUNNEL_COLORS[i] || "#94a3b8"} />
                      ))}
                      <rc.LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                      <rc.LabelList position="center" fill="#fff" stroke="none" dataKey="count" />
                    </rc.Funnel>
                  </rc.FunnelChart>
                </rc.ResponsiveContainer>
              )}
            </RechartsLoader>
          </div>
          {/* Conversiepercentages */}
          <div className="mt-4 flex flex-wrap gap-2">
            {data.funnel.conversions.map((c) => (
              <div key={c.van} className="flex items-center gap-1 text-xs bg-neutral-50 rounded-lg px-2 py-1">
                <span className="text-neutral-500">{STAGE_LABELS[c.van]}</span>
                <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-neutral-500">{STAGE_LABELS[c.naar]}</span>
                <span className={`font-semibold ${c.percentage > 20 ? "text-green-600" : c.percentage > 10 ? "text-yellow-600" : "text-red-500"}`}>
                  {c.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Omzet Overzicht</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-sm text-orange-600 font-medium">Pipeline (offerte)</p>
              <p className="text-2xl font-bold text-orange-700">{formatEuro(data.revenue.forecast)}</p>
              <p className="text-xs text-orange-500 mt-1">{data.revenue.offertLeads} leads in offerte</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-green-600 font-medium">Gerealiseerd</p>
              <p className="text-2xl font-bold text-green-700">{formatEuro(data.revenue.gerealiseerd)}</p>
              <p className="text-xs text-green-500 mt-1">{data.revenue.klantLeads} klanten</p>
            </div>
          </div>
          {/* Revenue per branche */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-600">Verwacht per branche</p>
            {Object.entries(data.revenue.perBranche).map(([branche, info]) => (
              <div key={branche} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 capitalize">{branche}</span>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-400">{info.count} leads</span>
                  <span className="font-semibold text-neutral-900">{formatEuro(info.waarde)}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.revenue.perBranche).length === 0 && (
              <p className="text-sm text-neutral-400 italic">Geen leads in offerte fase</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Activiteiten chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Activiteiten</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Emails ({data.activiteiten.emails})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Telefoon ({data.activiteiten.telefoon})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> WhatsApp ({data.activiteiten.whatsapp})</span>
          </div>
        </div>
        {data.activiteiten.chart.length > 0 ? (
          <div className="h-64">
            <RechartsLoader>
              {(rc) => (
                <rc.ResponsiveContainer width="100%" height="100%">
                  <rc.BarChart data={data.activiteiten.chart}>
                    <rc.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <rc.XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fontSize: 12 }} />
                    <rc.YAxis tick={{ fontSize: 12 }} />
                    <rc.Tooltip labelFormatter={(label) => `Week van ${formatWeek(label as string)}`} />
                    <rc.Bar dataKey="emails" name="Emails" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <rc.Bar dataKey="telefoon" name="Telefoon" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <rc.Bar dataKey="whatsapp" name="WhatsApp" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <rc.Bar dataKey="bezoek" name="Bezoek" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </rc.BarChart>
                </rc.ResponsiveContainer>
              )}
            </RechartsLoader>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-neutral-400">
            Nog geen activiteiten in deze periode
          </div>
        )}
      </div>

      {/* Row 3: Response Rates + Pipeline Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Rates */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Response Rates</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricCircle label="Response" value={data.responseRates.responseRate} color="blue" />
            <MetricCircle label="Positief" value={data.responseRates.positiefRate} color="green" />
            <MetricCircle label="Emails" value={data.responseRates.uitgaandEmails} isAbsolute color="gray" />
          </div>
          {/* Campagne response rates */}
          {data.campagnes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-neutral-600 mb-2">Per campagne</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {data.campagnes.map((c) => (
                  <div key={c.naam} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700 truncate max-w-[180px]">{c.naam}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-blue-500">{c.openRate}% open</span>
                      <span className="text-green-500">{c.replyRate}% reply</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Velocity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Pipeline Snelheid</h3>
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-[#F27501]">{data.velocity.gemDoorlooptijdDagen || "–"}</p>
              <p className="text-sm text-neutral-500 mt-1">dagen gemiddeld van nieuw → klant</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-neutral-900">{data.velocity.geconverteerdeLeads}</p>
              <p className="text-xs text-neutral-500">Geconverteerd totaal</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-neutral-900">{data.velocity.nieuwInPeriode}</p>
              <p className="text-xs text-neutral-500">Nieuw deze periode</p>
            </div>
          </div>
          {/* Stage verdeling als mini donut */}
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-600 mb-2">Verdeling per stage</p>
            <div className="h-32">
              <RechartsLoader>
                {(rc) => (
                  <rc.ResponsiveContainer width="100%" height="100%">
                    <rc.PieChart>
                      <rc.Pie
                        data={data.funnel.stages.map((s) => ({ name: STAGE_LABELS[s.stage], value: s.count, fill: STAGE_COLORS[s.stage] }))}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                      >
                        {data.funnel.stages.map((s) => (
                          <rc.Cell key={s.stage} fill={STAGE_COLORS[s.stage]} />
                        ))}
                      </rc.Pie>
                      <rc.Tooltip formatter={(value, name) => [String(value), String(name)]} />
                    </rc.PieChart>
                  </rc.ResponsiveContainer>
                )}
              </RechartsLoader>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Best Performing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Branches */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Top Branches</h3>
          <div className="space-y-3">
            {data.bestPerforming.topBranches.length > 0 ? data.bestPerforming.topBranches.map((b, i) => (
              <div key={b.branche} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? "bg-yellow-500" : i === 1 ? "bg-neutral-400" : i === 2 ? "bg-amber-700" : "bg-neutral-300"}`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900 capitalize">{b.branche}</p>
                  <p className="text-xs text-neutral-500">{b.benaderd} benaderd, {b.klant} klant</p>
                </div>
                <span className="text-sm font-semibold text-green-600">{b.conversieRate}%</span>
              </div>
            )) : (
              <p className="text-sm text-neutral-400 italic">Nog geen data</p>
            )}
          </div>
        </div>

        {/* Top Steden */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Top Steden</h3>
          <div className="space-y-3">
            {data.bestPerforming.topSteden.length > 0 ? data.bestPerforming.topSteden.map((s, i) => (
              <div key={s.stad} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? "bg-yellow-500" : i === 1 ? "bg-neutral-400" : i === 2 ? "bg-amber-700" : "bg-neutral-300"}`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900 capitalize">{s.stad}</p>
                  <p className="text-xs text-neutral-500">{s.totaal} leads, {s.klant} klant</p>
                </div>
                <span className="text-sm font-semibold text-blue-600">{s.conversieRate}%</span>
              </div>
            )) : (
              <p className="text-sm text-neutral-400 italic">Nog geen data</p>
            )}
          </div>
        </div>

        {/* Beste Dagen/Uren */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Beste Tijden</h3>
          {data.bestPerforming.besteDagen.length > 0 ? (
            <>
              <p className="text-xs font-medium text-neutral-500 mb-2">Beste dagen</p>
              <div className="space-y-1 mb-4">
                {data.bestPerforming.besteDagen.slice(0, 3).map((d) => (
                  <div key={d.dag} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{d.dagNaam}</span>
                    <span className="text-green-600 font-medium">{d.successRate}% succesvol</span>
                  </div>
                ))}
              </div>
              {data.bestPerforming.besteUren.length > 0 && (
                <>
                  <p className="text-xs font-medium text-neutral-500 mb-2">Beste uren</p>
                  <div className="space-y-1">
                    {data.bestPerforming.besteUren.slice(0, 3).map((u) => (
                      <div key={u.uur} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-700">{u.uur}:00 - {u.uur + 1}:00</span>
                        <span className="text-green-600 font-medium">{u.successRate}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-400 italic">Nog geen outreach data voor analyse</p>
          )}
        </div>
      </div>
    </div>
  );
}

// === Sub-components ===

function KPICard({ label, value, icon, color = "neutral" }: { label: string; value: string | number; icon: string; color?: string }) {
  const bgColors: Record<string, string> = {
    neutral: "bg-neutral-50",
    blue: "bg-blue-50",
    orange: "bg-orange-50",
    green: "bg-green-50",
  };
  const iconColors: Record<string, string> = {
    neutral: "text-neutral-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };
  const textColors: Record<string, string> = {
    neutral: "text-neutral-900",
    blue: "text-blue-900",
    orange: "text-orange-900",
    green: "text-green-900",
  };

  return (
    <div className={`${bgColors[color]} rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <svg className={`w-5 h-5 ${iconColors[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
    </div>
  );
}

function MetricCircle({ label, value, color = "blue", isAbsolute = false }: { label: string; value: number; color?: string; isAbsolute?: boolean }) {
  const colors: Record<string, { ring: string; text: string; bg: string }> = {
    blue: { ring: "stroke-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
    green: { ring: "stroke-green-500", text: "text-green-700", bg: "bg-green-50" },
    gray: { ring: "stroke-neutral-400", text: "text-neutral-700", bg: "bg-neutral-50" },
  };
  const c = colors[color] || colors.blue;
  const pct = isAbsolute ? 100 : Math.min(value, 100);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={`${c.bg} rounded-xl p-3 flex flex-col items-center`}>
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" className="stroke-neutral-200" />
          <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" className={c.ring} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${c.text}`}>
          {isAbsolute ? value : `${value}%`}
        </span>
      </div>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
