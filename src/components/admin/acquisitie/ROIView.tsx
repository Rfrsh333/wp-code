"use client";

import { useState, useEffect, useCallback } from "react";

interface Dashboard {
  periode: { start: string; eind: string };
  totaleKosten: number;
  totaleOpbrengsten: number;
  maandOpbrengsten: number;
  aantalDeals: number;
  roi: number;
  cac: number;
  pipelineWaarde: number;
  perKanaal: { kanaal: string; kosten: number; deals: number; opbrengsten: number; roi: number; cac: number }[];
  perRep: { id: string; naam: string; deals: number; opbrengsten: number; kosten: number; roi: number }[];
  perCategorie: { categorie: string; bedrag: number }[];
  trend: { maand: string; kosten: number; opbrengsten: number }[];
  recenteDeals: Deal[];
  recenteKosten: Kost[];
}

interface Kost {
  id: string;
  categorie: string;
  omschrijving: string;
  bedrag: number;
  periode_start: string;
  kanaal: string | null;
  is_maandelijks: boolean;
}

interface Deal {
  id: string;
  bedrijfsnaam: string;
  deal_waarde: number;
  deal_type: string;
  contract_duur_maanden: number;
  totale_waarde: number;
  kanaal: string | null;
  gesloten_op: string;
  acquisitie_leads?: { bedrijfsnaam: string; branche: string; stad: string } | null;
  acquisitie_sales_reps?: { naam: string } | null;
}

type Mode = "dashboard" | "kosten" | "deals";

const KANALEN = ["email", "whatsapp", "telefoon", "bezoek", "linkedin", "google_maps", "advertenties", "referral", "overig"];
const CATEGORIEEN = ["personeel", "tooling", "advertenties", "events", "telefoon", "reiskosten", "overig"];
const DEAL_TYPES = ["nieuw", "upsell", "verlenging"];

export default function ROIView() {
  const [mode, setMode] = useState<Mode>("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [kostenLijst, setKostenLijst] = useState<Kost[]>([]);
  const [dealsLijst, setDealsLijst] = useState<Deal[]>([]);
  const [periode, setPeriode] = useState("kwartaal");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Kosten form
  const [showKostForm, setShowKostForm] = useState(false);
  const [kostForm, setKostForm] = useState({
    categorie: "tooling", omschrijving: "", bedrag: "", periode_start: new Date().toISOString().split("T")[0],
    kanaal: "", is_maandelijks: false, notities: "",
  });

  // Deal form
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealForm, setDealForm] = useState({
    bedrijfsnaam: "", deal_waarde: "", deal_type: "nieuw", contract_duur_maanden: "12",
    kanaal: "", gesloten_op: new Date().toISOString().split("T")[0], notities: "",
  });

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
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/acquisitie/roi?view=dashboard&periode=${periode}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setDashboard(json.data);
    }
    setIsLoading(false);
  }, [getToken, periode]);

  const fetchKosten = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/roi?view=kosten", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const j = await res.json(); setKostenLijst(j.data || []); }
  }, [getToken]);

  const fetchDeals = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/roi?view=deals", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const j = await res.json(); setDealsLijst(j.data || []); }
  }, [getToken]);

  useEffect(() => {
    if (mode === "dashboard") fetchDashboard();
    if (mode === "kosten") fetchKosten();
    if (mode === "deals") fetchDeals();
  }, [mode, fetchDashboard, fetchKosten, fetchDeals]);

  const saveKost = async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/roi", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "add_kosten", ...kostForm, bedrag: parseFloat(kostForm.bedrag) }),
    });
    if (res.ok) {
      showMsg("success", "Kosten geregistreerd");
      setShowKostForm(false);
      setKostForm({ categorie: "tooling", omschrijving: "", bedrag: "", periode_start: new Date().toISOString().split("T")[0], kanaal: "", is_maandelijks: false, notities: "" });
      fetchKosten();
      fetchDashboard();
    }
  };

  const saveDeal = async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/roi", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "add_deal", ...dealForm }),
    });
    if (res.ok) {
      showMsg("success", "Deal geregistreerd");
      setShowDealForm(false);
      setDealForm({ bedrijfsnaam: "", deal_waarde: "", deal_type: "nieuw", contract_duur_maanden: "12", kanaal: "", gesloten_op: new Date().toISOString().split("T")[0], notities: "" });
      fetchDeals();
      fetchDashboard();
    }
  };

  const deleteKost = async (id: string) => {
    if (!confirm("Kosten verwijderen?")) return;
    const token = await getToken();
    await fetch("/api/admin/acquisitie/roi", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_kosten", id }),
    });
    fetchKosten();
    fetchDashboard();
  };

  const deleteDeal = async (id: string) => {
    if (!confirm("Deal verwijderen?")) return;
    const token = await getToken();
    await fetch("/api/admin/acquisitie/roi", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_deal", id }),
    });
    fetchDeals();
    fetchDashboard();
  };

  const fmt = (n: number) => n.toLocaleString("nl-NL");

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([
            { id: "dashboard" as Mode, label: "ROI Dashboard" },
            { id: "kosten" as Mode, label: "Kosten" },
            { id: "deals" as Mode, label: "Deals" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === tab.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {mode === "dashboard" && (
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="text-xs border border-neutral-200 rounded-lg px-3 py-1.5">
            <option value="maand">Deze Maand</option>
            <option value="kwartaal">Dit Kwartaal</option>
            <option value="jaar">Dit Jaar</option>
          </select>
        )}
      </div>

      {/* === DASHBOARD === */}
      {mode === "dashboard" && dashboard && !isLoading && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">ROI</p>
              <p className={`text-3xl font-bold ${dashboard.roi >= 100 ? "text-green-600" : dashboard.roi >= 0 ? "text-amber-600" : "text-red-600"}`}>
                {dashboard.roi}%
              </p>
              <p className="text-[10px] text-neutral-400">Return on Investment</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Totale Opbrengsten</p>
              <p className="text-3xl font-bold text-green-600">&euro;{fmt(dashboard.totaleOpbrengsten)}</p>
              <p className="text-[10px] text-neutral-400">{dashboard.aantalDeals} deals</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Totale Kosten</p>
              <p className="text-3xl font-bold text-red-600">&euro;{fmt(dashboard.totaleKosten)}</p>
              <p className="text-[10px] text-neutral-400">Alle acquisitie kosten</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">CAC</p>
              <p className="text-3xl font-bold text-neutral-900">&euro;{fmt(dashboard.cac)}</p>
              <p className="text-[10px] text-neutral-400">Cost per Acquisition</p>
            </div>
          </div>

          {/* Extra metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600">Maandelijkse Opbrengsten</p>
              <p className="text-2xl font-bold text-green-700">&euro;{fmt(dashboard.maandOpbrengsten)}/mnd</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600">Pipeline Waarde</p>
              <p className="text-2xl font-bold text-blue-700">&euro;{fmt(dashboard.pipelineWaarde)}</p>
              <p className="text-[10px] text-blue-400">Gewogen op conversiekans</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs text-purple-600">Winst</p>
              <p className={`text-2xl font-bold ${dashboard.totaleOpbrengsten - dashboard.totaleKosten >= 0 ? "text-green-700" : "text-red-700"}`}>
                &euro;{fmt(dashboard.totaleOpbrengsten - dashboard.totaleKosten)}
              </p>
            </div>
          </div>

          {/* Trend chart (simple bar visualization) */}
          {dashboard.trend.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">Maandelijkse Trend</h3>
              <div className="flex items-end gap-3 h-40">
                {dashboard.trend.map((t) => {
                  const maxVal = Math.max(...dashboard.trend.map((tr) => Math.max(tr.kosten, tr.opbrengsten)), 1);
                  return (
                    <div key={t.maand} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: "120px" }}>
                        <div className="flex-1 bg-red-200 rounded-t transition-all" style={{ height: `${Math.max((t.kosten / maxVal) * 120, 2)}px` }} title={`Kosten: €${fmt(t.kosten)}`} />
                        <div className="flex-1 bg-green-400 rounded-t transition-all" style={{ height: `${Math.max((t.opbrengsten / maxVal) * 120, 2)}px` }} title={`Opbrengsten: €${fmt(t.opbrengsten)}`} />
                      </div>
                      <span className="text-[10px] text-neutral-500">{t.maand}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 rounded" /><span className="text-[10px] text-neutral-500">Kosten</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded" /><span className="text-[10px] text-neutral-500">Opbrengsten</span></div>
              </div>
            </div>
          )}

          {/* Per Kanaal */}
          {dashboard.perKanaal.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">ROI per Kanaal</h3>
              <div className="space-y-3">
                {dashboard.perKanaal.map((k) => (
                  <div key={k.kanaal} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-700 w-28 capitalize truncate">{k.kanaal}</span>
                    <div className="flex-1 bg-neutral-100 rounded-full h-6 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${k.roi >= 100 ? "bg-green-500" : k.roi >= 0 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.min(Math.max(k.roi + 50, 5), 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-neutral-700">
                        {k.roi}% ROI
                      </span>
                    </div>
                    <div className="text-right w-32 flex-shrink-0">
                      <p className="text-xs text-neutral-700">{k.deals} deals &middot; &euro;{fmt(k.opbrengsten)}</p>
                      <p className="text-[10px] text-neutral-400">Kosten: &euro;{fmt(k.kosten)} &middot; CAC: &euro;{fmt(k.cac)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per Sales Rep */}
          {dashboard.perRep.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Performance per Sales Rep</h3>
              <div className="space-y-3">
                {dashboard.perRep.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50">
                    <span className="text-sm font-medium text-neutral-700 w-32 truncate">{r.naam || "Onbekend"}</span>
                    <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">{r.deals}</p>
                        <p className="text-[10px] text-neutral-400">Deals</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-green-600">&euro;{fmt(r.opbrengsten)}</p>
                        <p className="text-[10px] text-neutral-400">Opbrengsten</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${r.roi >= 100 ? "text-green-600" : "text-amber-600"}`}>{r.roi}%</p>
                        <p className="text-[10px] text-neutral-400">ROI</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kosten per categorie */}
          {dashboard.perCategorie.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Kosten per Categorie</h3>
              <div className="space-y-2">
                {dashboard.perCategorie.map((c) => {
                  const pct = dashboard.totaleKosten > 0 ? Math.round((c.bedrag / dashboard.totaleKosten) * 100) : 0;
                  return (
                    <div key={c.categorie} className="flex items-center gap-3">
                      <span className="text-sm text-neutral-700 w-28 capitalize">{c.categorie}</span>
                      <div className="flex-1 bg-neutral-100 rounded-full h-4 overflow-hidden">
                        <div className="bg-red-300 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-neutral-600 w-24 text-right">&euro;{fmt(c.bedrag)} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading && mode === "dashboard" && (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-[#F27501] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* === KOSTEN === */}
      {mode === "kosten" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Kosten Registratie</h3>
            <button onClick={() => setShowKostForm(true)} className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-xl hover:bg-[#d96800]">
              + Kosten
            </button>
          </div>

          {showKostForm && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={kostForm.categorie} onChange={(e) => setKostForm({ ...kostForm, categorie: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  {CATEGORIEEN.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
                <select value={kostForm.kanaal} onChange={(e) => setKostForm({ ...kostForm, kanaal: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  <option value="">Kanaal (optioneel)</option>
                  {KANALEN.map((k) => <option key={k} value={k} className="capitalize">{k}</option>)}
                </select>
              </div>
              <input placeholder="Omschrijving *" value={kostForm.omschrijving} onChange={(e) => setKostForm({ ...kostForm, omschrijving: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Bedrag (EUR) *" value={kostForm.bedrag} onChange={(e) => setKostForm({ ...kostForm, bedrag: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <input type="date" value={kostForm.periode_start} onChange={(e) => setKostForm({ ...kostForm, periode_start: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={kostForm.is_maandelijks} onChange={(e) => setKostForm({ ...kostForm, is_maandelijks: e.target.checked })} className="w-4 h-4 rounded" />
                  Maandelijks
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={saveKost} disabled={!kostForm.omschrijving || !kostForm.bedrag} className="px-4 py-2 bg-[#F27501] text-white text-sm rounded-lg disabled:opacity-50">Toevoegen</button>
                <button onClick={() => setShowKostForm(false)} className="px-3 py-1.5 text-neutral-600 text-sm hover:bg-neutral-100 rounded-lg">Annuleren</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {kostenLijst.map((k) => (
              <div key={k.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{k.omschrijving}</p>
                  <p className="text-xs text-neutral-500">
                    {k.categorie} {k.kanaal && `· ${k.kanaal}`} · {new Date(k.periode_start).toLocaleDateString("nl-NL")}
                    {k.is_maandelijks && " · maandelijks"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600">&euro;{Number(k.bedrag).toLocaleString("nl-NL")}</span>
                  <button onClick={() => deleteKost(k.id)} className="text-xs text-red-400 hover:text-red-600">Verwijder</button>
                </div>
              </div>
            ))}
            {kostenLijst.length === 0 && !showKostForm && (
              <div className="text-center py-12 bg-neutral-50 rounded-xl">
                <p className="text-neutral-500">Nog geen kosten geregistreerd</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === DEALS === */}
      {mode === "deals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Deals</h3>
            <button onClick={() => setShowDealForm(true)} className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-xl hover:bg-[#d96800]">
              + Deal
            </button>
          </div>

          {showDealForm && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Bedrijfsnaam *" value={dealForm.bedrijfsnaam} onChange={(e) => setDealForm({ ...dealForm, bedrijfsnaam: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <select value={dealForm.deal_type} onChange={(e) => setDealForm({ ...dealForm, deal_type: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  {DEAL_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Maandwaarde (EUR) *" value={dealForm.deal_waarde} onChange={(e) => setDealForm({ ...dealForm, deal_waarde: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <input type="number" placeholder="Contract maanden" value={dealForm.contract_duur_maanden} onChange={(e) => setDealForm({ ...dealForm, contract_duur_maanden: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <input type="date" value={dealForm.gesloten_op} onChange={(e) => setDealForm({ ...dealForm, gesloten_op: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
              </div>
              <select value={dealForm.kanaal} onChange={(e) => setDealForm({ ...dealForm, kanaal: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2">
                <option value="">Kanaal (optioneel)</option>
                {KANALEN.map((k) => <option key={k} value={k} className="capitalize">{k}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={saveDeal} disabled={!dealForm.bedrijfsnaam || !dealForm.deal_waarde} className="px-4 py-2 bg-[#F27501] text-white text-sm rounded-lg disabled:opacity-50">Toevoegen</button>
                <button onClick={() => setShowDealForm(false)} className="px-3 py-1.5 text-neutral-600 text-sm hover:bg-neutral-100 rounded-lg">Annuleren</button>
              </div>
              {dealForm.deal_waarde && dealForm.contract_duur_maanden && (
                <p className="text-xs text-neutral-400">
                  Totale waarde: &euro;{(parseFloat(dealForm.deal_waarde || "0") * parseInt(dealForm.contract_duur_maanden || "12")).toLocaleString("nl-NL")}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {dealsLijst.map((d) => (
              <div key={d.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{d.bedrijfsnaam}</p>
                  <p className="text-xs text-neutral-500">
                    {d.deal_type} · {d.kanaal || "—"} · {new Date(d.gesloten_op).toLocaleDateString("nl-NL")}
                    {d.acquisitie_sales_reps?.naam && ` · ${d.acquisitie_sales_reps.naam}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">&euro;{Number(d.deal_waarde).toLocaleString("nl-NL")}/mnd</p>
                    <p className="text-[10px] text-neutral-400">{d.contract_duur_maanden} mnd · &euro;{Number(d.totale_waarde).toLocaleString("nl-NL")} totaal</p>
                  </div>
                  <button onClick={() => deleteDeal(d.id)} className="text-xs text-red-400 hover:text-red-600">Verwijder</button>
                </div>
              </div>
            ))}
            {dealsLijst.length === 0 && !showDealForm && (
              <div className="text-center py-12 bg-neutral-50 rounded-xl">
                <p className="text-neutral-500">Nog geen deals geregistreerd</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
