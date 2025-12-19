"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Stats {
  omzetPerMaand: { maand: string; omzet: number }[];
  besteMedewerkers: { naam: string; gemiddelde_score: number; aantal_beoordelingen: number }[];
  totalen: { medewerkers: number; klanten: number; diensten: number; uren: number; omzet: number };
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

  const maxOmzet = Math.max(...stats.omzetPerMaand.map(o => o.omzet), 1);

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Dashboard</h2>

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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Omzet grafiek */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">Omzet per maand</h3>
          <div className="flex items-end gap-2 h-40">
            {stats.omzetPerMaand.map(o => (
              <div key={o.maand} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-[#F27501] rounded-t" style={{ height: `${(o.omzet / maxOmzet) * 100}%`, minHeight: o.omzet > 0 ? 4 : 0 }}></div>
                <p className="text-xs text-neutral-500 mt-2">{o.maand}</p>
                <p className="text-xs font-medium">€{o.omzet > 0 ? (o.omzet / 1000).toFixed(1) + "k" : "0"}</p>
              </div>
            ))}
          </div>
        </div>

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
      </div>
    </div>
  );
}
