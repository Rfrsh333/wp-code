"use client";

import { useState, useEffect, useCallback } from "react";

interface Concurrent {
  id: string;
  naam: string;
  website: string | null;
  type: string;
  regios: string[];
  branches: string[];
  sterke_punten: string[];
  zwakke_punten: string[];
  prijsindicatie: string | null;
  usps: string | null;
  onze_voordelen: string | null;
  battle_card: BattleCard | null;
  notities: string | null;
  actief: boolean;
}

interface BattleCard {
  elevator_pitch: string;
  differentiators: string[];
  objection_handling: { bezwaar: string; antwoord: string }[];
  prijsstrategie: string;
  win_themes: string[];
  vermijd: string[];
}

interface WinLoss {
  id: string;
  lead_id: string | null;
  concurrent_id: string | null;
  resultaat: string;
  reden: string | null;
  reden_detail: string | null;
  deal_waarde: number | null;
  branche: string | null;
  stad: string | null;
  contactpersoon_feedback: string | null;
  learnings: string | null;
  created_at: string;
  acquisitie_leads?: { bedrijfsnaam: string; branche: string; stad: string } | null;
  acquisitie_concurrenten?: { naam: string } | null;
}

interface DashboardData {
  winRate: number;
  totalDeals: number;
  gewonnen: number;
  verloren: number;
  gewonnenWaarde: number;
  verlorenWaarde: number;
  topRedenVerloren: { reden: string; count: number }[];
  concurrentStats: (Concurrent & { gewonnen: number; verloren: number; winRate: number | null })[];
  recentWinLoss: WinLoss[];
}

interface Learnings {
  trends: string[];
  aanbevelingen: string[];
  sterke_punten: string[];
  verbeterpunten: string[];
}

type Mode = "dashboard" | "concurrenten" | "win_loss" | "battle_cards";

interface Props {
  onSelectLead?: (id: string) => void;
}

const REDENEN = ["prijs", "service", "snelheid", "relatie", "kwaliteit", "beschikbaarheid", "reputatie", "anders"];
const TYPES = [
  { value: "uitzendbureau", label: "Uitzendbureau" },
  { value: "detacheerder", label: "Detacheerder" },
  { value: "payroller", label: "Payroller" },
  { value: "zzp_platform", label: "ZZP Platform" },
];

export default function CompetitiveView({ onSelectLead }: Props) {
  const [mode, setMode] = useState<Mode>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [concurrenten, setConcurrenten] = useState<Concurrent[]>([]);
  const [winLossRecords, setWinLossRecords] = useState<WinLoss[]>([]);
  const [learnings, setLearnings] = useState<Learnings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    naam: "", website: "", type: "uitzendbureau", regios: "",
    branches: "", sterke_punten: "", zwakke_punten: "",
    prijsindicatie: "", usps: "", onze_voordelen: "", notities: "",
  });

  // Win/Loss form
  const [showWlForm, setShowWlForm] = useState(false);
  const [wlForm, setWlForm] = useState({
    concurrent_id: "", resultaat: "gewonnen", reden: "",
    reden_detail: "", deal_waarde: "", contactpersoon_feedback: "", learnings: "",
  });

  // Battle card
  const [selectedBattleCard, setSelectedBattleCard] = useState<{ naam: string; card: BattleCard } | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchDashboard = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/competitive?view=dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setDashboard(json.data);
    }
  }, [getToken]);

  const fetchConcurrenten = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/competitive?view=concurrenten", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setConcurrenten(json.data || []);
    }
  }, [getToken]);

  const fetchWinLoss = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/competitive?view=win_loss", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setWinLossRecords(json.data || []);
    }
  }, [getToken]);

  const fetchLearnings = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/competitive?view=learnings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setLearnings(json.data);
    }
    setIsLoading(false);
  }, [getToken]);

  useEffect(() => {
    if (mode === "dashboard") { fetchDashboard(); fetchConcurrenten(); }
    if (mode === "concurrenten") fetchConcurrenten();
    if (mode === "win_loss") { fetchWinLoss(); fetchConcurrenten(); }
    if (mode === "battle_cards") fetchConcurrenten();
  }, [mode, fetchDashboard, fetchConcurrenten, fetchWinLoss]);

  // Concurrent CRUD
  const saveConcurrent = async () => {
    const token = await getToken();
    const payload = {
      action: editingId ? "update_concurrent" : "create_concurrent",
      ...(editingId ? { id: editingId } : {}),
      naam: formData.naam,
      website: formData.website || null,
      type: formData.type,
      regios: formData.regios.split(",").map((s) => s.trim()).filter(Boolean),
      branches: formData.branches.split(",").map((s) => s.trim()).filter(Boolean),
      sterke_punten: formData.sterke_punten.split(",").map((s) => s.trim()).filter(Boolean),
      zwakke_punten: formData.zwakke_punten.split(",").map((s) => s.trim()).filter(Boolean),
      prijsindicatie: formData.prijsindicatie || null,
      usps: formData.usps || null,
      onze_voordelen: formData.onze_voordelen || null,
      notities: formData.notities || null,
    };

    const res = await fetch("/api/admin/acquisitie/competitive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showMsg("success", editingId ? "Concurrent bijgewerkt" : "Concurrent toegevoegd");
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchConcurrenten();
    } else {
      showMsg("error", "Fout bij opslaan");
    }
  };

  const deleteConcurrent = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze concurrent wilt verwijderen?")) return;
    const token = await getToken();
    await fetch("/api/admin/acquisitie/competitive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_concurrent", id }),
    });
    fetchConcurrenten();
  };

  const editConcurrent = (c: Concurrent) => {
    setEditingId(c.id);
    setFormData({
      naam: c.naam,
      website: c.website || "",
      type: c.type,
      regios: c.regios?.join(", ") || "",
      branches: c.branches?.join(", ") || "",
      sterke_punten: c.sterke_punten?.join(", ") || "",
      zwakke_punten: c.zwakke_punten?.join(", ") || "",
      prijsindicatie: c.prijsindicatie || "",
      usps: c.usps || "",
      onze_voordelen: c.onze_voordelen || "",
      notities: c.notities || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ naam: "", website: "", type: "uitzendbureau", regios: "", branches: "", sterke_punten: "", zwakke_punten: "", prijsindicatie: "", usps: "", onze_voordelen: "", notities: "" });
  };

  // Battle card
  const generateBattleCard = async (concurrentId: string) => {
    setIsGenerating(concurrentId);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/competitive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "generate_battle_card", concurrent_id: concurrentId }),
    });
    if (res.ok) {
      const json = await res.json();
      const c = concurrenten.find((cc) => cc.id === concurrentId);
      if (c) setSelectedBattleCard({ naam: c.naam, card: json.data });
      fetchConcurrenten();
    }
    setIsGenerating(null);
  };

  // Win/Loss
  const saveWinLoss = async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/competitive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "register_win_loss",
        concurrent_id: wlForm.concurrent_id || null,
        resultaat: wlForm.resultaat,
        reden: wlForm.reden || null,
        reden_detail: wlForm.reden_detail || null,
        deal_waarde: wlForm.deal_waarde ? parseFloat(wlForm.deal_waarde) : null,
        contactpersoon_feedback: wlForm.contactpersoon_feedback || null,
        learnings: wlForm.learnings || null,
      }),
    });
    if (res.ok) {
      showMsg("success", "Win/Loss geregistreerd");
      setShowWlForm(false);
      setWlForm({ concurrent_id: "", resultaat: "gewonnen", reden: "", reden_detail: "", deal_waarde: "", contactpersoon_feedback: "", learnings: "" });
      fetchWinLoss();
      fetchDashboard();
    }
  };

  const prijsKleur = (p: string | null) => {
    if (p === "goedkoop") return "text-green-600 bg-green-50";
    if (p === "premium") return "text-red-600 bg-red-50";
    return "text-yellow-600 bg-yellow-50";
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "dashboard" as Mode, label: "Dashboard", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          { id: "concurrenten" as Mode, label: "Concurrenten", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
          { id: "win_loss" as Mode, label: "Win/Loss", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
          { id: "battle_cards" as Mode, label: "Battle Cards", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === tab.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* === DASHBOARD === */}
      {mode === "dashboard" && dashboard && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Win Rate</p>
              <p className={`text-2xl font-bold ${dashboard.winRate >= 50 ? "text-green-600" : "text-red-600"}`}>{dashboard.winRate}%</p>
              <p className="text-xs text-neutral-400">{dashboard.gewonnen}W / {dashboard.verloren}L</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Totaal Deals</p>
              <p className="text-2xl font-bold text-neutral-900">{dashboard.totalDeals}</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Gewonnen Waarde</p>
              <p className="text-2xl font-bold text-green-600">&euro;{dashboard.gewonnenWaarde.toLocaleString("nl-NL")}</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Verloren Waarde</p>
              <p className="text-2xl font-bold text-red-600">&euro;{dashboard.verlorenWaarde.toLocaleString("nl-NL")}</p>
            </div>
          </div>

          {/* Per concurrent */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Win Rate per Concurrent</h3>
            {dashboard.concurrentStats.length === 0 ? (
              <p className="text-sm text-neutral-500">Nog geen concurrenten geregistreerd</p>
            ) : (
              <div className="space-y-3">
                {dashboard.concurrentStats.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-700 w-36 truncate">{c.naam}</span>
                    <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden flex">
                      {(c.gewonnen + c.verloren) > 0 ? (
                        <>
                          <div className="bg-green-500 h-full transition-all" style={{ width: `${c.winRate || 0}%` }} />
                          <div className="bg-red-400 h-full transition-all" style={{ width: `${100 - (c.winRate || 0)}%` }} />
                        </>
                      ) : (
                        <div className="h-full w-full bg-neutral-100" />
                      )}
                    </div>
                    <span className="text-xs text-neutral-500 w-20 text-right">
                      {c.gewonnen + c.verloren > 0 ? `${c.winRate}% (${c.gewonnen}W/${c.verloren}L)` : "Geen data"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top redenen verloren */}
          {dashboard.topRedenVerloren.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Top Redenen Verloren</h3>
              <div className="space-y-2">
                {dashboard.topRedenVerloren.map((r) => (
                  <div key={r.reden} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-700 flex-1 capitalize">{r.reden}</span>
                    <div className="w-32 bg-neutral-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-red-400 h-full" style={{ width: `${Math.min((r.count / (dashboard.verloren || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500 w-8 text-right">{r.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent win/loss */}
          {dashboard.recentWinLoss.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Recente Deals</h3>
              <div className="space-y-2">
                {dashboard.recentWinLoss.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.resultaat === "gewonnen" ? "bg-green-500" : r.resultaat === "verloren" ? "bg-red-500" : "bg-yellow-500"}`} />
                    <span className="text-neutral-600 flex-1 truncate">
                      {r.acquisitie_leads?.bedrijfsnaam || "Onbekend"} vs {r.acquisitie_concurrenten?.naam || "-"}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.resultaat === "gewonnen" ? "bg-green-50 text-green-700" : r.resultaat === "verloren" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                    }`}>{r.resultaat}</span>
                    {r.reden && <span className="text-xs text-neutral-400 capitalize">{r.reden}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Learnings */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-900">AI Win/Loss Analyse</h3>
              <button
                onClick={fetchLearnings}
                disabled={isLoading}
                className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? "Analyseren..." : "Analyseer"}
              </button>
            </div>
            {learnings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {learnings.trends.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-purple-700 mb-1">Trends</p>
                    <ul className="text-xs text-purple-600 space-y-1">
                      {learnings.trends.map((t, i) => <li key={i}>• {t}</li>)}
                    </ul>
                  </div>
                )}
                {learnings.aanbevelingen.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-purple-700 mb-1">Aanbevelingen</p>
                    <ul className="text-xs text-purple-600 space-y-1">
                      {learnings.aanbevelingen.map((a, i) => <li key={i}>• {a}</li>)}
                    </ul>
                  </div>
                )}
                {learnings.sterke_punten.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1">Onze Sterke Punten</p>
                    <ul className="text-xs text-green-600 space-y-1">
                      {learnings.sterke_punten.map((s, i) => <li key={i}>✓ {s}</li>)}
                    </ul>
                  </div>
                )}
                {learnings.verbeterpunten.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-700 mb-1">Verbeterpunten</p>
                    <ul className="text-xs text-amber-600 space-y-1">
                      {learnings.verbeterpunten.map((v, i) => <li key={i}>! {v}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-purple-500">Klik op &quot;Analyseer&quot; voor AI-powered inzichten uit je win/loss data</p>
            )}
          </div>
        </div>
      )}

      {/* === CONCURRENTEN === */}
      {mode === "concurrenten" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Concurrenten ({concurrenten.length})</h3>
            <button
              onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
              className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-xl hover:bg-[#d96800]"
            >
              + Concurrent
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-neutral-900">{editingId ? "Concurrent Bewerken" : "Nieuwe Concurrent"}</h4>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Naam *" value={formData.naam} onChange={(e) => setFormData({ ...formData, naam: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <input placeholder="Website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select value={formData.prijsindicatie} onChange={(e) => setFormData({ ...formData, prijsindicatie: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  <option value="">Prijsindicatie...</option>
                  <option value="goedkoop">Goedkoop</option>
                  <option value="marktconform">Marktconform</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <input placeholder="Regio's (komma-gescheiden)" value={formData.regios} onChange={(e) => setFormData({ ...formData, regios: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <input placeholder="Branches (komma-gescheiden)" value={formData.branches} onChange={(e) => setFormData({ ...formData, branches: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <input placeholder="Sterke punten (komma-gescheiden)" value={formData.sterke_punten} onChange={(e) => setFormData({ ...formData, sterke_punten: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <input placeholder="Zwakke punten (komma-gescheiden)" value={formData.zwakke_punten} onChange={(e) => setFormData({ ...formData, zwakke_punten: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <textarea placeholder="Hun USPs" value={formData.usps} onChange={(e) => setFormData({ ...formData, usps: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <textarea placeholder="Onze voordelen t.o.v. deze concurrent" value={formData.onze_voordelen} onChange={(e) => setFormData({ ...formData, onze_voordelen: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <textarea placeholder="Interne notities" value={formData.notities} onChange={(e) => setFormData({ ...formData, notities: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <div className="flex gap-2">
                <button onClick={saveConcurrent} disabled={!formData.naam} className="px-4 py-2 bg-[#F27501] text-white text-sm rounded-lg hover:bg-[#d96800] disabled:opacity-50">
                  {editingId ? "Opslaan" : "Toevoegen"}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 text-neutral-600 text-sm hover:bg-neutral-100 rounded-lg">
                  Annuleren
                </button>
              </div>
            </div>
          )}

          {/* Concurrent cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {concurrenten.map((c) => (
              <div key={c.id} className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">{c.naam}</h4>
                    <p className="text-xs text-neutral-500">
                      {TYPES.find((t) => t.value === c.type)?.label}
                      {c.website && <> &middot; <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{c.website}</a></>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editConcurrent(c)} className="text-xs px-2 py-1 text-neutral-500 hover:bg-neutral-100 rounded">Bewerk</button>
                    <button onClick={() => deleteConcurrent(c.id)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">Verwijder</button>
                  </div>
                </div>

                {c.prijsindicatie && (
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${prijsKleur(c.prijsindicatie)}`}>
                    {c.prijsindicatie}
                  </span>
                )}

                <div className="flex flex-wrap gap-1">
                  {c.regios?.map((r) => (
                    <span key={r} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{r}</span>
                  ))}
                  {c.branches?.map((b) => (
                    <span key={b} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">{b}</span>
                  ))}
                </div>

                {c.sterke_punten?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase">Sterk</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {c.sterke_punten.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{s}</span>)}
                    </div>
                  </div>
                )}
                {c.zwakke_punten?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase">Zwak</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {c.zwakke_punten.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{s}</span>)}
                    </div>
                  </div>
                )}

                {c.onze_voordelen && (
                  <div className="bg-[#FFF7ED] p-2 rounded-lg">
                    <p className="text-[10px] text-[#F27501] uppercase font-medium">Ons Voordeel</p>
                    <p className="text-xs text-neutral-700 mt-0.5">{c.onze_voordelen}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (c.battle_card) setSelectedBattleCard({ naam: c.naam, card: c.battle_card });
                    else generateBattleCard(c.id);
                  }}
                  disabled={isGenerating === c.id}
                  className="w-full text-xs py-1.5 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
                >
                  {isGenerating === c.id ? "Genereren..." : c.battle_card ? "Battle Card Bekijken" : "AI Battle Card Genereren"}
                </button>
              </div>
            ))}
          </div>

          {concurrenten.length === 0 && !showForm && (
            <div className="text-center py-12 bg-neutral-50 rounded-xl">
              <p className="text-neutral-500 mb-2">Nog geen concurrenten geregistreerd</p>
              <button onClick={() => setShowForm(true)} className="text-sm text-[#F27501] hover:underline">
                Voeg je eerste concurrent toe
              </button>
            </div>
          )}
        </div>
      )}

      {/* === WIN/LOSS === */}
      {mode === "win_loss" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Win/Loss Registratie</h3>
            <button
              onClick={() => setShowWlForm(true)}
              className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-xl hover:bg-[#d96800]"
            >
              + Registreer Deal
            </button>
          </div>

          {/* Win/Loss form */}
          {showWlForm && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-neutral-900">Deal Registreren</h4>
              <div className="grid grid-cols-2 gap-3">
                <select value={wlForm.resultaat} onChange={(e) => setWlForm({ ...wlForm, resultaat: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  <option value="gewonnen">Gewonnen</option>
                  <option value="verloren">Verloren</option>
                  <option value="lopend">Lopend</option>
                </select>
                <select value={wlForm.concurrent_id} onChange={(e) => setWlForm({ ...wlForm, concurrent_id: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  <option value="">Concurrent (optioneel)</option>
                  {concurrenten.map((c) => <option key={c.id} value={c.id}>{c.naam}</option>)}
                </select>
                <select value={wlForm.reden} onChange={(e) => setWlForm({ ...wlForm, reden: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  <option value="">Reden...</option>
                  {REDENEN.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
                <input type="number" placeholder="Deal waarde (EUR)" value={wlForm.deal_waarde} onChange={(e) => setWlForm({ ...wlForm, deal_waarde: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              </div>
              <textarea placeholder="Detail: waarom gewonnen/verloren?" value={wlForm.reden_detail} onChange={(e) => setWlForm({ ...wlForm, reden_detail: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <textarea placeholder="Feedback van prospect" value={wlForm.contactpersoon_feedback} onChange={(e) => setWlForm({ ...wlForm, contactpersoon_feedback: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <textarea placeholder="Wat leren we hiervan?" value={wlForm.learnings} onChange={(e) => setWlForm({ ...wlForm, learnings: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <div className="flex gap-2">
                <button onClick={saveWinLoss} className="px-4 py-2 bg-[#F27501] text-white text-sm rounded-lg hover:bg-[#d96800]">
                  Registreren
                </button>
                <button onClick={() => setShowWlForm(false)} className="px-4 py-2 text-neutral-600 text-sm hover:bg-neutral-100 rounded-lg">
                  Annuleren
                </button>
              </div>
            </div>
          )}

          {/* Win/Loss lijst */}
          <div className="space-y-2">
            {winLossRecords.map((r) => (
              <div key={r.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  r.resultaat === "gewonnen" ? "bg-green-100" : r.resultaat === "verloren" ? "bg-red-100" : "bg-yellow-100"
                }`}>
                  <span className="text-lg">{r.resultaat === "gewonnen" ? "W" : r.resultaat === "verloren" ? "L" : "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {r.acquisitie_leads?.bedrijfsnaam ? (
                      <span
                        className="text-sm font-medium text-neutral-900 cursor-pointer hover:text-[#F27501] truncate"
                        onClick={() => r.lead_id && onSelectLead?.(r.lead_id)}
                      >
                        {r.acquisitie_leads.bedrijfsnaam}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-400">Geen lead gekoppeld</span>
                    )}
                    {r.acquisitie_concurrenten?.naam && (
                      <span className="text-xs text-neutral-400">vs {r.acquisitie_concurrenten.naam}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.reden && <span className="text-xs text-neutral-500 capitalize">{r.reden}</span>}
                    {r.deal_waarde && <span className="text-xs text-neutral-400">&euro;{Number(r.deal_waarde).toLocaleString("nl-NL")}</span>}
                    <span className="text-xs text-neutral-300">{new Date(r.created_at).toLocaleDateString("nl-NL")}</span>
                  </div>
                  {r.reden_detail && <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{r.reden_detail}</p>}
                </div>
              </div>
            ))}
            {winLossRecords.length === 0 && !showWlForm && (
              <div className="text-center py-12 bg-neutral-50 rounded-xl">
                <p className="text-neutral-500 mb-2">Nog geen win/loss registraties</p>
                <button onClick={() => setShowWlForm(true)} className="text-sm text-[#F27501] hover:underline">
                  Registreer je eerste deal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === BATTLE CARDS === */}
      {mode === "battle_cards" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">Battle Cards</h3>
          <p className="text-sm text-neutral-500">AI-gegenereerde verkoopkaarten per concurrent. Gebruik deze in gesprekken met prospects.</p>

          {/* Battle card selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {concurrenten.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  if (c.battle_card) setSelectedBattleCard({ naam: c.naam, card: c.battle_card });
                  else generateBattleCard(c.id);
                }}
                disabled={isGenerating === c.id}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  selectedBattleCard?.naam === c.naam
                    ? "border-[#F27501] bg-[#FFF7ED]"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <p className="text-sm font-medium text-neutral-900">{c.naam}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isGenerating === c.id ? "Genereren..." : c.battle_card ? "Battle card beschikbaar" : "Klik om te genereren"}
                </p>
              </button>
            ))}
          </div>

          {/* Selected battle card */}
          {selectedBattleCard && (
            <div className="bg-white border-2 border-[#F27501] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-neutral-900">Battle Card: {selectedBattleCard.naam}</h4>
                <button onClick={() => setSelectedBattleCard(null)} className="text-neutral-400 hover:text-neutral-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Elevator pitch */}
              <div className="bg-[#FFF7ED] p-3 rounded-xl">
                <p className="text-xs font-semibold text-[#F27501] uppercase mb-1">Elevator Pitch</p>
                <p className="text-sm text-neutral-800">{selectedBattleCard.card.elevator_pitch}</p>
              </div>

              {/* Differentiators */}
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase mb-2">Onze Differentiators</p>
                <ul className="space-y-1">
                  {selectedBattleCard.card.differentiators.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Objection handling */}
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Bezwaren Weerleggen</p>
                <div className="space-y-2">
                  {selectedBattleCard.card.objection_handling.map((o, i) => (
                    <div key={i} className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-blue-800">&quot;{o.bezwaar}&quot;</p>
                      <p className="text-xs text-blue-700 mt-1">{o.antwoord}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prijsstrategie */}
              <div className="bg-yellow-50 p-3 rounded-xl">
                <p className="text-xs font-semibold text-yellow-800 uppercase mb-1">Prijsstrategie</p>
                <p className="text-sm text-yellow-700">{selectedBattleCard.card.prijsstrategie}</p>
              </div>

              {/* Win themes */}
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase mb-2">Win Themes</p>
                <div className="flex flex-wrap gap-2">
                  {selectedBattleCard.card.win_themes.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full">{t}</span>
                  ))}
                </div>
              </div>

              {/* Vermijd */}
              {selectedBattleCard.card.vermijd?.length > 0 && (
                <div className="bg-red-50 p-3 rounded-xl">
                  <p className="text-xs font-semibold text-red-700 uppercase mb-1">Vermijd</p>
                  <ul className="space-y-1">
                    {selectedBattleCard.card.vermijd.map((v, i) => (
                      <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                        <span className="flex-shrink-0">&#10007;</span> {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {concurrenten.length === 0 && (
            <div className="text-center py-12 bg-neutral-50 rounded-xl">
              <p className="text-neutral-500">Voeg eerst concurrenten toe in het &quot;Concurrenten&quot; tabblad</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
