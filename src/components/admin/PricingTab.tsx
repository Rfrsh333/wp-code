"use client";

import { useCallback, useEffect, useState } from "react";

interface PricingRule {
  id: string;
  naam: string;
  type: string;
  conditie: Record<string, unknown>;
  waarde: number;
  actief: boolean;
  prioriteit: number;
  created_at: string;
}

interface TariefOverview {
  functie: string;
  basis: number;
  weekend: number;
  feestdag: number;
  piek: number;
}

export default function PricingTab() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [tarieven, setTarieven] = useState<TariefOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({ naam: "", type: "multiplier", waarde: "1.10", conditie: "{}", prioriteit: "0" });
  // Live calculator
  const [calcFunctie, setCalcFunctie] = useState("bediening");
  const [calcDatum, setCalcDatum] = useState(new Date().toISOString().split("T")[0]);
  const [calcUren, setCalcUren] = useState("10");
  const [calcResult, setCalcResult] = useState<{ basistarieven: number; eindtarief: number; toegepaste_rules: { naam: string; effect: string }[]; bespaar_suggestie?: string } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const getToken = async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  const fetchData = useCallback(async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch("/api/admin/pricing", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setTarieven(data.tarieven || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const adminAction = async (body: Record<string, unknown>) => {
    const token = await getToken();
    await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    fetchData();
  };

  const toggleRule = (id: string) => adminAction({ action: "toggle", rule_id: id });
  const deleteRule = (id: string) => { if (confirm("Weet je het zeker?")) adminAction({ action: "delete", rule_id: id }); };

  const createRule = () => {
    try {
      const conditie = JSON.parse(newRule.conditie);
      adminAction({
        action: "create",
        naam: newRule.naam,
        type: newRule.type,
        waarde: newRule.waarde,
        conditie,
        prioriteit: parseInt(newRule.prioriteit) || 0,
      });
      setShowForm(false);
      setNewRule({ naam: "", type: "multiplier", waarde: "1.10", conditie: "{}", prioriteit: "0" });
    } catch {
      alert("Ongeldige JSON in conditie veld");
    }
  };

  const calculateTarief = async () => {
    setCalcLoading(true);
    try {
      const res = await fetch(`/api/pricing/calculate?functie=${calcFunctie}&datum=${calcDatum}&urenPerWeek=${calcUren}`);
      if (res.ok) {
        const data = await res.json();
        setCalcResult(data);
      }
    } catch (err) {
      console.error("Calc error:", err);
    } finally {
      setCalcLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Smart Pricing</h2>
          <p className="text-sm text-neutral-500 mt-1">Dynamische tarieven op basis van dag, seizoen, volume en loyalty. Regels worden automatisch toegepast op offertes en de kosten calculator.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-lg hover:bg-[#D96800] transition-colors flex-shrink-0"
        >
          {showForm ? "Annuleren" : "+ Nieuwe regel"}
        </button>
      </div>

      {/* Live Tarief Calculator */}
      <div className="bg-gradient-to-r from-[#1B2E4A] to-[#2A4365] rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-4">Live tarief berekenen</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-white/60 mb-1">Functie</label>
            <select value={calcFunctie} onChange={e => setCalcFunctie(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none">
              {["bediening", "bar", "keuken", "afwas", "gastheer", "runner"].map(f => (
                <option key={f} value={f} className="text-neutral-900">{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Datum</label>
            <input type="date" value={calcDatum} onChange={e => setCalcDatum(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Uren/week</label>
            <input type="number" value={calcUren} onChange={e => setCalcUren(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none" />
          </div>
          <div className="flex items-end">
            <button onClick={calculateTarief} disabled={calcLoading} className="w-full px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-lg hover:bg-[#D96800] transition-colors disabled:opacity-50">
              {calcLoading ? "Berekenen..." : "Bereken"}
            </button>
          </div>
        </div>
        {calcResult && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-white/60 text-sm">Basistarief</span>
                <span className="ml-2 text-lg">&euro;{calcResult.basistarieven.toFixed(2)}/uur</span>
              </div>
              <div>
                <span className="text-white/60 text-sm">Eindtarief</span>
                <span className="ml-2 text-2xl font-bold">&euro;{calcResult.eindtarief.toFixed(2)}/uur</span>
              </div>
            </div>
            {calcResult.toegepaste_rules.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-white/50 mb-1">Toegepaste regels:</p>
                {calcResult.toegepaste_rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.effect.startsWith("-") ? "bg-green-500/20 text-green-300" : "bg-orange-500/20 text-orange-300"}`}>
                      {r.effect}
                    </span>
                    <span className="text-white/80">{r.naam}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">Geen extra regels van toepassing — basistarief wordt gehanteerd.</p>
            )}
            {calcResult.bespaar_suggestie && (
              <p className="text-xs text-green-300 mt-2 italic">{calcResult.bespaar_suggestie}</p>
            )}
          </div>
        )}
      </div>

      {/* Tarieven overzicht */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900">Tarieven per functie</h3>
          <p className="text-sm text-neutral-500">Dynamische tarieven op basis van actieve pricing regels</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 text-left text-sm text-neutral-500">
                <th className="px-6 py-3 font-medium">Functie</th>
                <th className="px-6 py-3 font-medium text-right">Basis</th>
                <th className="px-6 py-3 font-medium text-right">Weekend</th>
                <th className="px-6 py-3 font-medium text-right">Feestdag</th>
                <th className="px-6 py-3 font-medium text-right">Piekmaand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tarieven.map(t => (
                <tr key={t.functie} className="hover:bg-neutral-50">
                  <td className="px-6 py-3 font-medium text-neutral-900 capitalize">{t.functie}</td>
                  <td className="px-6 py-3 text-right text-neutral-700">&euro;{t.basis.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-orange-600 font-medium">&euro;{t.weekend.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-red-600 font-medium">&euro;{t.feestdag.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-amber-600 font-medium">&euro;{t.piek.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nieuwe regel formulier */}
      {showForm && (
        <div className="bg-white rounded-xl border-2 border-[#F27501]/20 p-6 space-y-4">
          <h3 className="font-semibold text-neutral-900">Nieuwe pricing regel</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Naam</label>
              <input
                type="text"
                value={newRule.naam}
                onChange={e => setNewRule({ ...newRule, naam: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
                placeholder="Bijv. Avond toeslag"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
              <select
                value={newRule.type}
                onChange={e => setNewRule({ ...newRule, type: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
              >
                <option value="multiplier">Multiplier (toeslag)</option>
                <option value="discount">Discount (korting)</option>
                <option value="surcharge">Surcharge</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Waarde</label>
              <input
                type="number"
                step="0.01"
                value={newRule.waarde}
                onChange={e => setNewRule({ ...newRule, waarde: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
                placeholder="1.10 = +10%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Prioriteit</label>
              <input
                type="number"
                value={newRule.prioriteit}
                onChange={e => setNewRule({ ...newRule, prioriteit: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Conditie (JSON)</label>
              <input
                type="text"
                value={newRule.conditie}
                onChange={e => setNewRule({ ...newRule, conditie: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
                placeholder='{"dag": ["za", "zo"]}'
              />
              <p className="text-xs text-neutral-400 mt-1">
                Opties: dag (ma-zo), feestdag (true), last_minute (true), maand ([1-12]), min_uren_week (getal), loyalty_tier, functie
              </p>
            </div>
          </div>
          <button
            onClick={createRule}
            disabled={!newRule.naam}
            className="px-4 py-2 bg-[#1B2E4A] text-white text-sm font-medium rounded-lg hover:bg-[#2A4365] transition-colors disabled:opacity-50"
          >
            Regel opslaan
          </button>
        </div>
      )}

      {/* Pricing regels */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900">Actieve pricing regels</h3>
        </div>
        <div className="divide-y divide-neutral-100">
          {rules.length === 0 ? (
            <p className="px-6 py-8 text-center text-neutral-400">Geen pricing regels gevonden</p>
          ) : (
            rules.map(rule => {
              const pct = Math.round((rule.waarde - 1) * 100);
              const isDiscount = pct < 0;
              return (
                <div key={rule.id} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${rule.actief ? "bg-green-500" : "bg-neutral-300"}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${rule.actief ? "left-5" : "left-1"}`} />
                    </button>
                    <div>
                      <p className={`font-medium ${rule.actief ? "text-neutral-900" : "text-neutral-400"}`}>{rule.naam}</p>
                      <p className="text-xs text-neutral-400 font-mono">{JSON.stringify(rule.conditie)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isDiscount ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {pct >= 0 ? `+${pct}%` : `${pct}%`}
                    </span>
                    <span className="text-xs text-neutral-400">P:{rule.prioriteit}</span>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
