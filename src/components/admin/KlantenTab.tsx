"use client";

import { useState, useEffect, useCallback } from "react";

let _recharts: typeof import("recharts") | null = null;

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

interface Klant {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  stad: string | null;
  loyalty_tier: string;
  totaal_diensten: number;
  totaal_omzet: number;
  laatste_dienst_datum: string | null;
  churn_risico: string;
  notities: string | null;
  gemiddelde_beoordeling: number;
}

interface KlantStats {
  totaal_klanten: number;
  actieve_klanten: number;
  churn_hoog: number;
  churn_middel: number;
  tiers: { standaard: number; silver: number; gold: number; platinum: number };
  totaal_omzet: number;
}

interface KlantDetail {
  klant: Klant;
  diensten: { id: string; datum: string; functie: string; locatie: string; start_tijd: string; eind_tijd: string; status: string }[];
  maandGrafiek: { maand: string; aantal: number; functies: Record<string, number> }[];
  seizoen: { huidige_maand: number; vorig_jaar_zelfde_maand: number; verschil_percentage: number | null };
  forecast: { verwacht_komende_maand: number; per_functie: { functie: string; verwacht: number }[] };
  beoordelingen: { score: number; opmerking: string | null; created_at: string }[];
}

interface RetentionAnalysis {
  risico_niveau: "hoog" | "middel" | "laag";
  reden: string;
  aanbevolen_actie: string;
  email_suggestie?: { onderwerp: string; inhoud: string };
}

const TIER_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  standaard: { label: "Standaard", icon: "🔵", color: "text-neutral-600", bg: "bg-neutral-100" },
  silver: { label: "Silver", icon: "🥈", color: "text-neutral-500", bg: "bg-neutral-200" },
  gold: { label: "Gold", icon: "🥇", color: "text-yellow-600", bg: "bg-yellow-50" },
  platinum: { label: "Platinum", icon: "💎", color: "text-purple-600", bg: "bg-purple-50" },
};

const CHURN_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  laag: { label: "Laag", color: "text-green-700", bg: "bg-green-100" },
  middel: { label: "Middel", color: "text-orange-700", bg: "bg-orange-100" },
  hoog: { label: "Hoog", color: "text-red-700", bg: "bg-red-100" },
};

export default function KlantenTab() {
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [stats, setStats] = useState<KlantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKlant, setSelectedKlant] = useState<string | null>(null);
  const [klantDetail, setKlantDetail] = useState<KlantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retentionAnalysis, setRetentionAnalysis] = useState<RetentionAnalysis | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [filter, setFilter] = useState<"alle" | "hoog" | "middel" | "laag">("alle");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"omzet" | "diensten" | "churn" | "laatste">("omzet");

  const fetchKlanten = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/klanten/analytics");
      const data = await res.json();
      if (res.ok) {
        setKlanten(data.klanten || []);
        setStats(data.stats || null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchKlanten(); }, [fetchKlanten]);

  const fetchDetail = useCallback(async (klantId: string) => {
    setDetailLoading(true);
    setRetentionAnalysis(null);
    try {
      const res = await fetch(`/api/admin/klanten/${klantId}/detail`);
      const data = await res.json();
      if (res.ok) setKlantDetail(data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  }, []);

  const analyzeRetention = useCallback(async (klantId: string) => {
    setRetentionLoading(true);
    try {
      const res = await fetch("/api/admin/ai/klant-retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ klant_id: klantId }),
      });
      const data = await res.json();
      if (res.ok) setRetentionAnalysis(data.analysis);
    } catch { /* ignore */ }
    setRetentionLoading(false);
  }, []);

  const openDetail = (klantId: string) => {
    setSelectedKlant(klantId);
    fetchDetail(klantId);
  };

  // Filter & sort
  const filtered = klanten
    .filter(k => filter === "alle" || k.churn_risico === filter)
    .filter(k => !search || k.bedrijfsnaam.toLowerCase().includes(search.toLowerCase()) || k.contactpersoon?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "omzet") return (b.totaal_omzet || 0) - (a.totaal_omzet || 0);
      if (sortBy === "diensten") return (b.totaal_diensten || 0) - (a.totaal_diensten || 0);
      if (sortBy === "churn") {
        const order = { hoog: 0, middel: 1, laag: 2 };
        return (order[a.churn_risico as keyof typeof order] ?? 2) - (order[b.churn_risico as keyof typeof order] ?? 2);
      }
      // laatste
      if (!a.laatste_dienst_datum) return 1;
      if (!b.laatste_dienst_datum) return -1;
      return new Date(b.laatste_dienst_datum).getTime() - new Date(a.laatste_dienst_datum).getTime();
    });

  const maandNamen: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mrt", "04": "Apr", "05": "Mei", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Dec",
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  // Detail view
  if (selectedKlant && klantDetail) {
    const k = klantDetail.klant;
    const tier = TIER_CONFIG[k.loyalty_tier] || TIER_CONFIG.standaard;
    const churn = CHURN_CONFIG[k.churn_risico] || CHURN_CONFIG.laag;

    return (
      <div>
        {/* Back button */}
        <button
          onClick={() => { setSelectedKlant(null); setKlantDetail(null); }}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug naar overzicht
        </button>

        {/* Klant header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-neutral-900">{k.bedrijfsnaam}</h2>
                <span className={`${tier.bg} ${tier.color} px-3 py-1 rounded-full text-sm font-medium`}>
                  {tier.icon} {tier.label}
                </span>
                <span className={`${churn.bg} ${churn.color} px-3 py-1 rounded-full text-sm font-medium`}>
                  Churn: {churn.label}
                </span>
              </div>
              <p className="text-neutral-500 text-sm mt-1">
                {k.contactpersoon && `${k.contactpersoon} · `}
                {k.stad && `${k.stad} · `}
                {k.email}
              </p>
            </div>
            <button
              onClick={() => analyzeRetention(k.id)}
              disabled={retentionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] disabled:opacity-50 text-sm font-medium"
            >
              {retentionLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              AI Retention Analyse
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-neutral-900">{k.totaal_diensten || 0}</p>
              <p className="text-xs text-neutral-500">Totaal diensten</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-neutral-900">€{(Number(k.totaal_omzet) || 0).toLocaleString("nl-NL", { minimumFractionDigits: 0 })}</p>
              <p className="text-xs text-neutral-500">Totaal omzet</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-neutral-900">{k.gemiddelde_beoordeling ? `★ ${Number(k.gemiddelde_beoordeling).toFixed(1)}` : "—"}</p>
              <p className="text-xs text-neutral-500">Gem. beoordeling</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-neutral-900">
                {k.laatste_dienst_datum ? `${Math.floor((Date.now() - new Date(k.laatste_dienst_datum).getTime()) / (1000 * 60 * 60 * 24))}d` : "—"}
              </p>
              <p className="text-xs text-neutral-500">Sinds laatste dienst</p>
            </div>
          </div>
        </div>

        {/* AI Retention Analysis */}
        {retentionAnalysis && (
          <div className={`rounded-2xl p-5 shadow-sm mb-4 ${
            retentionAnalysis.risico_niveau === "hoog" ? "bg-red-50 border border-red-200" :
            retentionAnalysis.risico_niveau === "middel" ? "bg-orange-50 border border-orange-200" :
            "bg-green-50 border border-green-200"
          }`}>
            <h3 className="font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Retention Analyse
            </h3>
            <p className="text-sm text-neutral-700 mb-2">{retentionAnalysis.reden}</p>
            <p className="text-sm font-medium text-neutral-900 mb-3">Aanbeveling: {retentionAnalysis.aanbevolen_actie}</p>
            {retentionAnalysis.email_suggestie && (
              <div className="bg-white rounded-xl p-4 border border-neutral-200">
                <p className="text-xs font-medium text-neutral-500 mb-1">Email suggestie</p>
                <p className="text-sm font-medium text-neutral-900 mb-2">Onderwerp: {retentionAnalysis.email_suggestie.onderwerp}</p>
                <p className="text-sm text-neutral-700 whitespace-pre-line">{retentionAnalysis.email_suggestie.inhoud}</p>
              </div>
            )}
          </div>
        )}

        {/* Diensten grafiek */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Diensten per maand</h3>
          <RechartsLoader>
            {(rc) => {
              const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } = rc;
              const chartData = klantDetail.maandGrafiek.map(m => ({
                maand: maandNamen[m.maand.split("-")[1]] || m.maand,
                aantal: m.aantal,
              }));

              return (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="maand" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="aantal" fill="#F27501" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            }}
          </RechartsLoader>
        </div>

        {/* Seizoen & Forecast */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-3">Seizoenspatroon</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Deze maand</span>
                <span className="text-sm font-bold">{klantDetail.seizoen.huidige_maand} diensten</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Vorig jaar zelfde maand</span>
                <span className="text-sm font-bold">{klantDetail.seizoen.vorig_jaar_zelfde_maand} diensten</span>
              </div>
              {klantDetail.seizoen.verschil_percentage !== null && (
                <div className={`text-sm font-medium mt-2 ${klantDetail.seizoen.verschil_percentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {klantDetail.seizoen.verschil_percentage >= 0 ? "↑" : "↓"} {Math.abs(klantDetail.seizoen.verschil_percentage)}% t.o.v. vorig jaar
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-3">Forecast komende maand</h3>
            <p className="text-3xl font-bold text-[#F27501] mb-2">{klantDetail.forecast.verwacht_komende_maand} diensten</p>
            <div className="space-y-1">
              {klantDetail.forecast.per_functie.map((f, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-500">{f.functie}</span>
                  <span className="font-medium">{f.verwacht}x</span>
                </div>
              ))}
              {klantDetail.forecast.per_functie.length === 0 && (
                <p className="text-sm text-neutral-400">Geen data beschikbaar</p>
              )}
            </div>
          </div>
        </div>

        {/* Recente beoordelingen */}
        {klantDetail.beoordelingen.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="font-bold text-neutral-900 mb-3">Recente beoordelingen (door klant)</h3>
            <div className="space-y-3">
              {klantDetail.beoordelingen.map((b, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-neutral-50 last:border-0">
                  <span className="text-lg">{"★".repeat(Math.round(b.score))}</span>
                  <div className="flex-1">
                    {b.opmerking && <p className="text-sm text-neutral-700">{b.opmerking}</p>}
                    <p className="text-xs text-neutral-400 mt-1">{new Date(b.created_at).toLocaleDateString("nl-NL")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recente diensten */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-900 mb-3">Recente diensten ({klantDetail.diensten.length})</h3>
          {klantDetail.diensten.length === 0 ? (
            <p className="text-sm text-neutral-400">Geen diensten gevonden</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {klantDetail.diensten.slice(0, 20).map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{d.functie}</p>
                    <p className="text-xs text-neutral-500">{d.locatie} · {d.start_tijd} - {d.eind_tijd}</p>
                  </div>
                  <span className="text-sm text-neutral-500">{new Date(d.datum).toLocaleDateString("nl-NL")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detail loading
  if (selectedKlant && detailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Overzicht
  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Klanten</h2>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-neutral-900">{stats.totaal_klanten}</p>
            <p className="text-xs text-neutral-500">Totaal klanten</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{stats.actieve_klanten}</p>
            <p className="text-xs text-neutral-500">Actief (30d)</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-red-600">{stats.churn_hoog}</p>
            <p className="text-xs text-neutral-500">Hoog churn risico</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{stats.churn_middel}</p>
            <p className="text-xs text-neutral-500">Middel churn risico</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-neutral-900">€{stats.totaal_omzet.toLocaleString("nl-NL", { minimumFractionDigits: 0 })}</p>
            <p className="text-xs text-neutral-500">Totaal omzet</p>
          </div>
        </div>
      )}

      {/* Tier badges */}
      {stats && (
        <div className="flex gap-2 mb-4">
          {(["platinum", "gold", "silver", "standaard"] as const).map(tier => {
            const cfg = TIER_CONFIG[tier];
            return (
              <span key={tier} className={`${cfg.bg} ${cfg.color} px-3 py-1.5 rounded-full text-sm font-medium`}>
                {cfg.icon} {cfg.label}: {stats.tiers[tier]}
              </span>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Zoek klant..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] w-64"
        />
        <div className="flex gap-1">
          {(["alle", "hoog", "middel", "laag"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#F27501] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {f === "alle" ? "Alle" : f.charAt(0).toUpperCase() + f.slice(1)} risico
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 ml-auto"
        >
          <option value="omzet">Sorteer: Omzet</option>
          <option value="diensten">Sorteer: Diensten</option>
          <option value="churn">Sorteer: Churn risico</option>
          <option value="laatste">Sorteer: Laatste dienst</option>
        </select>
      </div>

      {/* Klanten tabel */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="text-left px-5 py-3.5 text-sm font-semibold text-neutral-600">Klant</th>
              <th className="text-left px-5 py-3.5 text-sm font-semibold text-neutral-600">Tier</th>
              <th className="text-right px-5 py-3.5 text-sm font-semibold text-neutral-600">Diensten</th>
              <th className="text-right px-5 py-3.5 text-sm font-semibold text-neutral-600">Omzet</th>
              <th className="text-right px-5 py-3.5 text-sm font-semibold text-neutral-600">Beoordeling</th>
              <th className="text-left px-5 py-3.5 text-sm font-semibold text-neutral-600">Laatste dienst</th>
              <th className="text-center px-5 py-3.5 text-sm font-semibold text-neutral-600">Churn</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(k => {
              const tier = TIER_CONFIG[k.loyalty_tier] || TIER_CONFIG.standaard;
              const churn = CHURN_CONFIG[k.churn_risico] || CHURN_CONFIG.laag;
              const dagenGeleden = k.laatste_dienst_datum
                ? Math.floor((Date.now() - new Date(k.laatste_dienst_datum).getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <tr
                  key={k.id}
                  onClick={() => openDetail(k.id)}
                  className="border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-neutral-900">{k.bedrijfsnaam}</p>
                    <p className="text-xs text-neutral-500">{k.contactpersoon} {k.stad ? `· ${k.stad}` : ""}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`${tier.bg} ${tier.color} px-2 py-0.5 rounded-full text-xs font-medium`}>
                      {tier.icon} {tier.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-medium text-neutral-900">{k.totaal_diensten || 0}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-medium text-neutral-900">
                    €{(Number(k.totaal_omzet) || 0).toLocaleString("nl-NL", { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-neutral-600">
                    {k.gemiddelde_beoordeling ? `★ ${Number(k.gemiddelde_beoordeling).toFixed(1)}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {k.laatste_dienst_datum ? (
                      <div>
                        <p className="text-sm text-neutral-900">{new Date(k.laatste_dienst_datum).toLocaleDateString("nl-NL")}</p>
                        <p className="text-xs text-neutral-500">{dagenGeleden}d geleden</p>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`${churn.bg} ${churn.color} px-2 py-0.5 rounded-full text-xs font-medium`}>
                      {churn.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Geen klanten gevonden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
