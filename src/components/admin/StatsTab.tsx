"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const RechartsLineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const RechartsBarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });

interface Stats {
  omzetPerMaand: { maand: string; omzet: number }[];
  besteMedewerkers: { naam: string; gemiddelde_score: number; aantal_beoordelingen: number }[];
  totalen: { medewerkers: number; klanten: number; diensten: number; uren: number; omzet: number };
  bezettingsgraad?: number;
  topKlanten?: { naam: string; omzet: number; diensten: number }[];
  responstijd?: number;
}

export default function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await globalThis.fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      setStats(await res.json());
      setIsLoading(false);
    };
    fetch();
  }, []);

  if (isLoading || !stats) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div></div>;

  const bezettingsgraad = stats.bezettingsgraad ?? 0;
  const responstijd = stats.responstijd ?? 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Dashboard & Rapportages</h2>

      {/* Totalen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Medewerkers", value: stats.totalen.medewerkers, color: "text-blue-600" },
          { label: "Klanten", value: stats.totalen.klanten, color: "text-green-600" },
          { label: "Diensten", value: stats.totalen.diensten, color: "text-purple-600" },
          { label: "Uren gewerkt", value: stats.totalen.uren, color: "text-orange-600" },
          { label: "Omzet (6 mnd)", value: `€${stats.totalen.omzet.toLocaleString("nl-NL")}`, color: "text-[#F27501]" },
        ].map(t => (
          <div key={t.label} className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-neutral-500">{t.label}</p>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Extra KPI's */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Bezettingsgraad</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${bezettingsgraad}%`,
                  backgroundColor: bezettingsgraad > 80 ? "#22c55e" : bezettingsgraad > 50 ? "#F27501" : "#ef4444",
                }}
              />
            </div>
            <span className="text-xl font-bold text-neutral-900">{bezettingsgraad}%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Gem. responstijd</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{responstijd > 0 ? `${responstijd}u` : "—"}</p>
          <p className="text-xs text-neutral-400">medewerker reactie op aanbieding</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Gem. omzet/medewerker</p>
          <p className="text-2xl font-bold text-[#F27501] mt-1">
            {stats.totalen.medewerkers > 0
              ? `€${Math.round(stats.totalen.omzet / stats.totalen.medewerkers).toLocaleString("nl-NL")}`
              : "—"}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Omzet lijn grafiek */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">Omzet per maand</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={stats.omzetPerMaand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="maand" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [`€${Number(value).toLocaleString("nl-NL")}`, "Omzet"]} />
                <Line type="monotone" dataKey="omzet" stroke="#F27501" strokeWidth={2} dot={{ fill: "#F27501", r: 4 }} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top klanten */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">Top klanten (omzet)</h3>
          {stats.topKlanten && stats.topKlanten.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={stats.topKlanten} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `€${(Number(v) / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="naam" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value) => [`€${Number(value).toLocaleString("nl-NL")}`, "Omzet"]} />
                  <Bar dataKey="omzet" fill="#F27501" radius={[0, 4, 4, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">Nog geen klantgegevens</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Beste medewerkers */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">Beste medewerkers</h3>
          {stats.besteMedewerkers.length === 0 ? (
            <p className="text-neutral-500 text-sm">Nog geen beoordelingen</p>
          ) : (
            <div className="space-y-3">
              {stats.besteMedewerkers.map((m, i) => (
                <div key={m.naam} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-white" : "bg-neutral-100 text-neutral-600"}`}>{i + 1}</span>
                    <span className="font-medium">{m.naam}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium">{m.gemiddelde_score}</span>
                    <span className="text-neutral-400 text-sm">({m.aantal_beoordelingen})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bezettingsgraad gauge */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">Samenvatting</h3>
          <div className="space-y-4">
            {[
              { label: "Actieve medewerkers", value: stats.totalen.medewerkers, max: stats.totalen.medewerkers + 10, color: "#3b82f6" },
              { label: "Actieve klanten", value: stats.totalen.klanten, max: stats.totalen.klanten + 5, color: "#22c55e" },
              { label: "Bezettingsgraad", value: bezettingsgraad, max: 100, color: "#F27501", suffix: "%" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-neutral-600">{item.label}</span>
                  <span className="text-sm font-bold">{item.value}{item.suffix || ""}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(item.value / item.max) * 100}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
