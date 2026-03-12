"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface MedewerkerDetail {
  profiel: {
    id: string;
    naam: string;
    email: string;
    telefoon: string | null;
    functie: string[];
    uurtarief: number;
    status: string;
    notities: string | null;
    created_at: string;
    profile_photo_url: string | null;
    geboortedatum: string | null;
    stad: string | null;
    bsn_geverifieerd: boolean;
    factuur_adres: string | null;
    factuur_postcode: string | null;
    factuur_stad: string | null;
    btw_nummer: string | null;
    iban: string | null;
    admin_score_aanwezigheid: number | null;
    admin_score_vaardigheden: number | null;
  };
  werkervaring: {
    id: string;
    werkgever: string;
    functie: string;
    categorie: string;
    locatie: string | null;
    start_datum: string;
    eind_datum: string | null;
  }[];
  vaardigheden: {
    id: string;
    categorie: string;
    vaardigheid: string;
  }[];
  documenten: {
    id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    file_size: number;
    uploaded_at: string;
  }[];
  diensten: {
    id: string;
    status: string;
    aangemeld_op: string;
    diensten: {
      id: string;
      klant_naam: string;
      locatie: string;
      datum: string;
      start_tijd: string;
      eind_tijd: string;
      functie: string;
      uurtarief: number;
    } | null;
  }[];
  financieel: {
    maand: string;
    uren: number;
    verdiensten: number;
    diensten: number;
  }[];
  stats: {
    opkomst_percentage: number;
    totaal_uren: number;
    totaal_verdiensten: number;
    totaal_diensten: number;
  };
}

type TabId = "profiel" | "diensten" | "financieel" | "documenten" | "ai-screening";

interface Props {
  medewerkerId: string;
  onBack: () => void;
}

export default function MedewerkerDetailView({ medewerkerId, onBack }: Props) {
  const [data, setData] = useState<MedewerkerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("profiel");
  const [aiScreening, setAiScreening] = useState<{
    score: number;
    samenvatting: string;
    sterke_punten: string[];
    aandachtspunten: string[];
    aanbeveling: string;
  } | null>(null);
  const [isScreeningLoading, setIsScreeningLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/medewerkers/${medewerkerId}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (!res.ok) {
      setError("Kon medewerker gegevens niet ophalen");
      setIsLoading(false);
      return;
    }
    const json = await res.json();
    setData(json);
    setIsLoading(false);
  }, [medewerkerId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  const formatMonth = (key: string) => {
    const [year, month] = key.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  };

  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "profiel", label: "Profiel", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { id: "diensten", label: "Diensten", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "financieel", label: "Financieel", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "documenten", label: "Documenten", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "ai-screening", label: "AI Screening", icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500 mb-4">{error || "Geen data gevonden"}</p>
        <button onClick={onBack} className="text-[#F27501] hover:underline font-medium">
          Terug naar overzicht
        </button>
      </div>
    );
  }

  const { profiel, werkervaring, vaardigheden, documenten, diensten, financieel, stats } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-neutral-900">Profiel: {profiel.naam}</h2>
        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
          profiel.status === "actief" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
        }`}>
          {profiel.status === "actief" ? "Actief" : "Inactief"}
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Opkomst</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.opkomst_percentage}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Totaal uren</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.totaal_uren.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Verdiensten</p>
          <p className="text-2xl font-bold text-green-600">&euro;{stats.totaal_verdiensten.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Diensten</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.totaal_diensten}</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "profiel" && (
        <div className="space-y-6">
          {/* Personal info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start gap-5">
              {profiel.profile_photo_url ? (
                <img
                  src={profiel.profile_photo_url}
                  alt={profiel.naam}
                  className="w-20 h-20 rounded-full object-cover border-2 border-neutral-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#F27501]/10 flex items-center justify-center text-[#F27501] text-2xl font-bold">
                  {profiel.naam.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-neutral-900">{profiel.naam}</h3>
                <div className="mt-1 space-y-1 text-sm text-neutral-600">
                  {profiel.geboortedatum && (
                    <p>{calculateAge(profiel.geboortedatum)} jaar{profiel.stad && `, ${profiel.stad}`}</p>
                  )}
                  <p>{profiel.email}</p>
                  {profiel.telefoon && <p>{profiel.telefoon}</p>}
                  <p>Sinds {formatDate(profiel.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profiel.functie?.map((f) => (
                    <span key={f} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">
                      {f}
                    </span>
                  ))}
                </div>
                {profiel.bsn_geverifieerd && (
                  <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    BSN geverifieerd
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">Uurtarief</p>
                <p className="text-xl font-bold text-neutral-900">&euro;{profiel.uurtarief.toFixed(2)}</p>
              </div>
            </div>
            {profiel.notities && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-sm font-medium text-neutral-700 mb-1">Notities</p>
                <p className="text-sm text-neutral-600">{profiel.notities}</p>
              </div>
            )}
            {(profiel.admin_score_aanwezigheid || profiel.admin_score_vaardigheden) && (
              <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-6">
                {profiel.admin_score_aanwezigheid && (
                  <div>
                    <p className="text-xs text-neutral-500">Aanwezigheid</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className="w-4 h-4" viewBox="0 0 24 24" fill={s <= profiel.admin_score_aanwezigheid! ? "#F27501" : "#e5e7eb"} stroke="none">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}
                {profiel.admin_score_vaardigheden && (
                  <div>
                    <p className="text-xs text-neutral-500">Vaardigheden</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className="w-4 h-4" viewBox="0 0 24 24" fill={s <= profiel.admin_score_vaardigheden! ? "#F27501" : "#e5e7eb"} stroke="none">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vaardigheden */}
          {vaardigheden.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4">Vaardigheden</h4>
              <div className="space-y-3">
                {Object.entries(
                  vaardigheden.reduce<Record<string, string[]>>((acc, v) => {
                    if (!acc[v.categorie]) acc[v.categorie] = [];
                    acc[v.categorie].push(v.vaardigheid);
                    return acc;
                  }, {})
                ).map(([cat, skills]) => (
                  <div key={cat}>
                    <p className="text-sm font-medium text-neutral-500 capitalize mb-1.5">{cat}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <span key={s} className="px-2.5 py-1 bg-[#F27501]/10 text-[#F27501] rounded-lg text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Werkervaring */}
          {werkervaring.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4">Werkervaring</h4>
              <div className="space-y-4">
                {werkervaring.map((we) => (
                  <div key={we.id} className="flex gap-3 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{we.werkgever}</p>
                      <p className="text-sm text-neutral-600">{we.functie} &middot; {we.categorie}</p>
                      {we.locatie && <p className="text-sm text-neutral-500">{we.locatie}</p>}
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {new Date(we.start_datum).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
                        {" - "}
                        {we.eind_datum
                          ? new Date(we.eind_datum).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })
                          : "heden"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facturatie */}
          {(profiel.factuur_adres || profiel.btw_nummer || profiel.iban) && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4">Facturatie & Betaling</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {profiel.factuur_adres && (
                  <div>
                    <p className="text-neutral-500">Adres</p>
                    <p className="text-neutral-900 font-medium">
                      {profiel.factuur_adres}
                      {profiel.factuur_postcode && `, ${profiel.factuur_postcode}`}
                      {profiel.factuur_stad && ` ${profiel.factuur_stad}`}
                    </p>
                  </div>
                )}
                {profiel.btw_nummer && (
                  <div>
                    <p className="text-neutral-500">BTW-nummer</p>
                    <p className="text-neutral-900 font-medium font-mono">{profiel.btw_nummer}</p>
                  </div>
                )}
                {profiel.iban && (
                  <div>
                    <p className="text-neutral-500">IBAN</p>
                    <p className="text-neutral-900 font-medium font-mono">{profiel.iban}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "diensten" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Datum</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Klant</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Locatie</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Tijd</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Functie</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {diensten.map((d) => {
                const dienst = d.diensten;
                if (!dienst) return null;
                return (
                  <tr key={d.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-3 text-sm text-neutral-900">{formatDate(dienst.datum)}</td>
                    <td className="px-6 py-3 text-sm text-neutral-900">{dienst.klant_naam}</td>
                    <td className="px-6 py-3 text-sm text-neutral-600">{dienst.locatie}</td>
                    <td className="px-6 py-3 text-sm text-neutral-600">{dienst.start_tijd} - {dienst.eind_tijd}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">
                        {dienst.functie}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        d.status === "geaccepteerd" ? "bg-green-100 text-green-700" :
                        d.status === "aangemeld" ? "bg-blue-100 text-blue-700" :
                        d.status === "afgewezen" ? "bg-red-100 text-red-700" :
                        "bg-neutral-100 text-neutral-500"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {diensten.length === 0 && (
            <div className="text-center py-12 text-neutral-500">Nog geen diensten</div>
          )}
        </div>
      )}

      {activeTab === "financieel" && (
        <div className="space-y-6">
          {/* Bar chart */}
          {financieel.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4">Verdiensten per maand</h4>
              <div className="flex items-end gap-2 h-48">
                {financieel.slice(0, 12).reverse().map((m) => {
                  const maxVerdiensten = Math.max(...financieel.map((f) => f.verdiensten));
                  const heightPct = maxVerdiensten > 0 ? (m.verdiensten / maxVerdiensten) * 100 : 0;
                  const [, month] = m.maand.split("-");
                  const monthLabel = new Date(2000, parseInt(month) - 1).toLocaleDateString("nl-NL", { month: "short" });
                  return (
                    <div key={m.maand} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-neutral-500 font-medium">&euro;{Math.round(m.verdiensten)}</span>
                      <div
                        className="w-full bg-[#F27501]/80 rounded-t-md min-h-[4px]"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      />
                      <span className="text-xs text-neutral-400">{monthLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Maand</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-neutral-600">Diensten</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-neutral-600">Uren</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-neutral-600">Verdiensten</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {financieel.map((m) => (
                  <tr key={m.maand} className="hover:bg-neutral-50">
                    <td className="px-6 py-3 text-sm text-neutral-900 font-medium capitalize">{formatMonth(m.maand)}</td>
                    <td className="px-6 py-3 text-sm text-neutral-600 text-right">{m.diensten}</td>
                    <td className="px-6 py-3 text-sm text-neutral-600 text-right">{m.uren.toFixed(1)}</td>
                    <td className="px-6 py-3 text-sm text-neutral-900 font-medium text-right">&euro;{m.verdiensten.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {financieel.length === 0 && (
              <div className="text-center py-12 text-neutral-500">Nog geen financiele gegevens</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "documenten" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {documenten.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{doc.file_name}</p>
                    <p className="text-xs text-neutral-500">
                      {doc.document_type} &middot; {(doc.file_size / 1024).toFixed(0)} KB &middot; {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F27501] hover:text-[#d96800] text-sm font-medium"
                >
                  Bekijken
                </a>
              </div>
            ))}
          </div>
          {documenten.length === 0 && (
            <div className="text-center py-12 text-neutral-500">Nog geen documenten geupload</div>
          )}
        </div>
      )}

      {activeTab === "ai-screening" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-800">AI Screening</h3>
            <button
              onClick={async () => {
                setIsScreeningLoading(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  // Find inschrijving by email
                  const { data: inschr } = await supabase
                    .from("inschrijvingen")
                    .select("id")
                    .eq("email", profiel.email)
                    .maybeSingle();
                  if (!inschr) {
                    setAiScreening(null);
                    return;
                  }
                  const res = await fetch("/api/admin/ai/screening", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({ inschrijving_id: inschr.id }),
                  });
                  if (res.ok) {
                    const result = await res.json();
                    setAiScreening(result);
                  }
                } catch {
                  // silently fail
                } finally {
                  setIsScreeningLoading(false);
                }
              }}
              disabled={isScreeningLoading}
              className="px-4 py-2 bg-[#F27501] text-white text-sm rounded-xl hover:bg-[#d96800] transition-colors disabled:opacity-50"
            >
              {isScreeningLoading ? "Screenen..." : aiScreening ? "Opnieuw screenen" : "AI Screening starten"}
            </button>
          </div>

          {aiScreening ? (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                  aiScreening.score >= 8 ? "bg-green-100 text-green-700" :
                  aiScreening.score >= 6 ? "bg-blue-100 text-blue-700" :
                  aiScreening.score >= 4 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {aiScreening.score}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Score: {aiScreening.score}/10</p>
                  <p className="text-sm text-neutral-600">{aiScreening.samenvatting}</p>
                </div>
              </div>

              {aiScreening.sterke_punten.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-green-700 mb-1">Sterke punten</p>
                  <ul className="space-y-1">
                    {aiScreening.sterke_punten.map((punt, i) => (
                      <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {punt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiScreening.aandachtspunten.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-amber-700 mb-1">Aandachtspunten</p>
                  <ul className="space-y-1">
                    {aiScreening.aandachtspunten.map((punt, i) => (
                      <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {punt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-blue-700 mb-1">Aanbeveling</p>
                <p className="text-sm text-blue-600">{aiScreening.aanbeveling}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-neutral-400">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
              </svg>
              <p className="text-sm">Klik op &quot;AI Screening starten&quot; om deze medewerker te evalueren</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
