"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface DashboardSummary {
  volgendeShift: {
    klant_naam: string;
    locatie: string;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    functie: string;
  } | null;
  openAanbiedingen: number;
  verlopenDocumenten: number;
  ongelezen: number;
  totaalDiensten: number;
  totaalUren: number;
}

interface DashboardHomeProps {
  naam: string;
  onNavigate: (tab: string) => void;
}

export default function DashboardHome({ naam, onNavigate }: DashboardHomeProps) {
  const toast = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/medewerker/dashboard-summary");
        const data = await res.json();
        if (res.ok) setSummary(data);
      } catch {
        toast.error("Kon dashboard niet laden");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [toast]);

  const firstName = naam.split(" ")[0];
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  })();

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welkomstbericht */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">{greeting}, {firstName}!</h2>
        <p className="text-neutral-500 mt-1">Hier is je overzicht voor vandaag.</p>
      </div>

      {/* Eerstvolgende shift */}
      {summary?.volgendeShift ? (
        <div className="bg-gradient-to-br from-[#F27501] to-[#d96800] rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold uppercase tracking-wide opacity-90">Eerstvolgende dienst</span>
          </div>
          <h3 className="text-xl font-bold mb-1">{summary.volgendeShift.klant_naam}</h3>
          <p className="text-white/80 text-sm">{summary.volgendeShift.locatie}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="bg-white/20 rounded-lg px-3 py-1">{formatDate(summary.volgendeShift.datum)}</span>
            <span className="bg-white/20 rounded-lg px-3 py-1">{summary.volgendeShift.start_tijd?.slice(0, 5)} - {summary.volgendeShift.eind_tijd?.slice(0, 5)}</span>
            <span className="bg-white/20 rounded-lg px-3 py-1">{summary.volgendeShift.functie}</span>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center">
          <p className="text-neutral-500">Geen aankomende diensten gepland.</p>
          <button
            onClick={() => onNavigate("diensten")}
            className="mt-3 px-4 py-2 bg-[#F27501] text-white rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors"
          >
            Bekijk beschikbare shifts
          </button>
        </div>
      )}

      {/* Meldingen */}
      {(summary && (summary.openAanbiedingen > 0 || summary.verlopenDocumenten > 0 || summary.ongelezen > 0)) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Meldingen</h3>
          {summary.openAanbiedingen > 0 && (
            <button onClick={() => onNavigate("diensten")} className="w-full flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-left hover:bg-orange-100 transition-colors">
              <span className="text-xl">📋</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-800">{summary.openAanbiedingen} openstaande aanbieding{summary.openAanbiedingen !== 1 ? "en" : ""}</p>
                <p className="text-xs text-orange-600">Reageer op nieuwe dienstaanbiedingen</p>
              </div>
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          {summary.verlopenDocumenten > 0 && (
            <button onClick={() => onNavigate("documenten")} className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left hover:bg-red-100 transition-colors">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">{summary.verlopenDocumenten} document{summary.verlopenDocumenten !== 1 ? "en" : ""} verlopen of bijna verlopen</p>
                <p className="text-xs text-red-600">Upload nieuwe documenten</p>
              </div>
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          {summary.ongelezen > 0 && (
            <button onClick={() => onNavigate("berichten")} className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-left hover:bg-blue-100 transition-colors">
              <span className="text-xl">💬</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">{summary.ongelezen} ongelezen bericht{summary.ongelezen !== 1 ? "en" : ""}</p>
              </div>
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      )}

      {/* Snelknoppen */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Snel naar</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { tab: "diensten", label: "Shifts bekijken", icon: "📋", color: "bg-orange-50 border-orange-200" },
            { tab: "uren", label: "Uren invullen", icon: "🕐", color: "bg-blue-50 border-blue-200" },
            { tab: "beschikbaarheid", label: "Beschikbaarheid", icon: "📅", color: "bg-green-50 border-green-200" },
            { tab: "profiel", label: "Mijn profiel", icon: "👤", color: "bg-purple-50 border-purple-200" },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className={`flex items-center gap-3 ${item.color} border rounded-xl px-4 py-3 hover:shadow-sm transition-all text-left`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium text-neutral-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
            <p className="text-2xl font-bold text-[#F27501]">{summary.totaalDiensten}</p>
            <p className="text-xs text-neutral-500">Diensten gewerkt</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
            <p className="text-2xl font-bold text-[#F27501]">{summary.totaalUren}</p>
            <p className="text-xs text-neutral-500">Uren gewerkt</p>
          </div>
        </div>
      )}
    </div>
  );
}
