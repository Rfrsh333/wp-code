"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";

interface MaandOverzicht {
  maand: string;
  totaal_uren: number;
  totaal_verdiensten: number;
  aantal_diensten: number;
}

type TabId = "overzicht" | "details" | "btw";

export default function FinancieelOverzicht() {
  const toast = useToast();
  const [overzicht, setOverzicht] = useState<MaandOverzicht[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaand, setSelectedMaand] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overzicht");
  const [selectedKwartaal, setSelectedKwartaal] = useState<string>("");

  useEffect(() => {
    fetchOverzicht();
  }, []);

  const fetchOverzicht = async () => {
    try {
      const res = await fetch("/api/medewerker/financieel");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setOverzicht(data.overzicht || []);
    } catch {
      toast.error("Kon financieel overzicht niet laden");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate last 12 months (including empty ones)
  const last12Months = useMemo(() => {
    const months: { key: string; label: string; shortLabel: string }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
      const shortLabel = d.toLocaleDateString("nl-NL", { month: "short" }).toUpperCase().replace(".", "");
      months.push({ key, label, shortLabel });
    }
    return months;
  }, []);

  const dataMap = useMemo(() => {
    const map = new Map<string, MaandOverzicht>();
    for (const m of overzicht) map.set(m.maand, m);
    return map;
  }, [overzicht]);

  const chartData = last12Months.map((m) => ({
    ...m,
    data: dataMap.get(m.key) || { maand: m.key, totaal_uren: 0, totaal_verdiensten: 0, aantal_diensten: 0 },
  }));

  const maxVerdiensten = Math.max(...chartData.map((m) => m.data.totaal_verdiensten), 1);

  const totalVerdiensten = overzicht.reduce((sum, m) => sum + m.totaal_verdiensten, 0);
  const totalUren = overzicht.reduce((sum, m) => sum + m.totaal_uren, 0);

  // Inkomsten laatste 30 dagen
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthKey = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}`;
  const last30 = (dataMap.get(currentMonthKey)?.totaal_verdiensten || 0) +
    (currentMonthKey !== prevMonthKey ? (dataMap.get(prevMonthKey)?.totaal_verdiensten || 0) * (thirtyDaysAgo.getDate() / 30) : 0);

  const selectedData = selectedMaand ? dataMap.get(selectedMaand) : null;
  const selectedLabel = selectedMaand
    ? last12Months.find((m) => m.key === selectedMaand)?.label || selectedMaand
    : null;

  // BTW kwartalen berekenen
  const kwartalen = useMemo(() => {
    const result: { key: string; label: string; maanden: string[] }[] = [];
    const seen = new Set<string>();
    // Genereer kwartalen van alle overzicht data + huidige
    const nowYear = new Date().getFullYear();
    const nowQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    // Voeg huidige + afgelopen kwartalen toe (3 jaar terug)
    for (let y = nowYear; y >= nowYear - 3; y--) {
      const maxQ = y === nowYear ? nowQuarter : 4;
      for (let q = maxQ; q >= 1; q--) {
        const key = `${y}-Q${q}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const startMonth = (q - 1) * 3 + 1;
        const maanden = [
          `${y}-${String(startMonth).padStart(2, "0")}`,
          `${y}-${String(startMonth + 1).padStart(2, "0")}`,
          `${y}-${String(startMonth + 2).padStart(2, "0")}`,
        ];
        result.push({ key, label: `${y}-Q${q}`, maanden });
      }
    }
    return result;
  }, []);

  // Stel default kwartaal in
  useEffect(() => {
    if (kwartalen.length > 0 && !selectedKwartaal) {
      setSelectedKwartaal(kwartalen[0].key);
    }
  }, [kwartalen, selectedKwartaal]);

  const kwartaalData = useMemo(() => {
    const kw = kwartalen.find((k) => k.key === selectedKwartaal);
    if (!kw) return { inkomsten: 0, btw: 0, uren: 0, diensten: 0 };
    let inkomsten = 0;
    let uren = 0;
    let diensten = 0;
    for (const m of kw.maanden) {
      const d = dataMap.get(m);
      if (d) {
        inkomsten += d.totaal_verdiensten;
        uren += d.totaal_uren;
        diensten += d.aantal_diensten;
      }
    }
    const btw = inkomsten * 0.21;
    return { inkomsten, btw, uren, diensten };
  }, [selectedKwartaal, kwartalen, dataMap]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overzicht", label: "Overzicht" },
    { id: "details", label: "Per maand" },
    { id: "btw", label: "Omzetbelasting" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Financieel overzicht</h2>
        <span className="text-sm text-neutral-500">Laatste 12 maanden</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
        </div>
      ) : activeTab === "overzicht" ? (
        <>
          {/* Staafdiagram */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="text-base font-semibold text-neutral-900 mb-6">Inkomstenoverzicht (excl. btw)</h3>
            <div className="flex items-end gap-2 h-48 mb-4">
              {chartData.map((m) => {
                const height = maxVerdiensten > 0
                  ? Math.max((m.data.totaal_verdiensten / maxVerdiensten) * 100, m.data.totaal_verdiensten > 0 ? 4 : 0)
                  : 0;
                const isSelected = selectedMaand === m.key;
                const hasData = m.data.totaal_verdiensten > 0;

                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group">
                    {/* Tooltip on hover */}
                    <div className="relative">
                      {hasData && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="bg-neutral-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                            €{m.data.totaal_verdiensten.toFixed(0)}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => hasData ? setSelectedMaand(isSelected ? null : m.key) : null}
                      className={`w-full rounded-t-lg transition-all duration-200 ${
                        hasData ? "cursor-pointer" : "cursor-default"
                      } ${
                        isSelected
                          ? "bg-[#F27501]"
                          : hasData
                            ? "bg-[#F27501]/60 hover:bg-[#F27501]/80"
                            : "bg-neutral-100"
                      }`}
                      style={{ height: `${height}%`, minHeight: hasData ? "8px" : "4px" }}
                      title={hasData ? `€${m.data.totaal_verdiensten.toFixed(2)}` : "Geen inkomsten"}
                    />
                  </div>
                );
              })}
            </div>
            {/* Maand labels */}
            <div className="flex gap-2">
              {chartData.map((m) => (
                <div key={m.key} className="flex-1 text-center">
                  <span className={`text-[10px] font-medium ${
                    selectedMaand === m.key ? "text-[#F27501]" : "text-neutral-400"
                  }`}>
                    {m.shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Geselecteerde maand detail */}
          {selectedMaand && selectedData && (
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 border-2 border-[#F27501]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-neutral-900 capitalize">{selectedLabel}</h3>
                <button
                  onClick={() => setSelectedMaand(null)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#F27501]/5 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-1">Verdiensten</p>
                  <p className="text-xl font-bold text-[#F27501]">€{selectedData.totaal_verdiensten.toFixed(2)}</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-1">Gewerkte uren</p>
                  <p className="text-xl font-bold text-neutral-900">{selectedData.totaal_uren.toFixed(1)}</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-1">Diensten</p>
                  <p className="text-xl font-bold text-neutral-900">{selectedData.aantal_diensten}</p>
                </div>
              </div>
              {selectedData.totaal_uren > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Gemiddeld uurtarief</span>
                  <span className="text-sm font-semibold text-neutral-900">
                    €{(selectedData.totaal_verdiensten / selectedData.totaal_uren).toFixed(2)}/uur
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Inkomsten laatste 30 dagen */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="text-base font-medium text-neutral-700 mb-2">Inkomsten laatste 30 dagen</h3>
            <p className="text-3xl font-bold text-neutral-900">€{last30.toFixed(2)}</p>
            <p className="text-sm text-neutral-500 mt-1">Het bedrag dat je verdiend hebt over de afgelopen 30 dagen.</p>
          </div>

          {/* Totalen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-neutral-500 mb-1">Totaal verdiend</p>
              <p className="text-2xl font-bold text-[#F27501]">€{totalVerdiensten.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-neutral-500 mb-1">Totaal uren</p>
              <p className="text-2xl font-bold text-neutral-900">{totalUren.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-neutral-500 mb-1">Gemiddeld/uur</p>
              <p className="text-2xl font-bold text-neutral-900">
                €{totalUren > 0 ? (totalVerdiensten / totalUren).toFixed(2) : "0.00"}
              </p>
            </div>
          </div>
        </>
      ) : activeTab === "details" ? (
        /* Per maand tab - detail tabel */
        <>
          {overzicht.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <p className="text-neutral-500">Nog geen verdiensten geregistreerd.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overzicht.map((m) => {
                const label = (() => {
                  const [year, month] = m.maand.split("-");
                  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
                })();
                const isOpen = selectedMaand === m.maand;

                return (
                  <div key={m.maand} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setSelectedMaand(isOpen ? null : m.maand)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F27501]/10 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-neutral-900 capitalize">{label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-[#F27501]">€{m.totaal_verdiensten.toFixed(2)}</span>
                        <svg className={`w-5 h-5 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 border-t border-neutral-100">
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-neutral-500 mb-0.5">Verdiensten</p>
                            <p className="text-lg font-bold text-[#F27501]">€{m.totaal_verdiensten.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-0.5">Uren</p>
                            <p className="text-lg font-bold text-neutral-900">{m.totaal_uren.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-0.5">Diensten</p>
                            <p className="text-lg font-bold text-neutral-900">{m.aantal_diensten}</p>
                          </div>
                        </div>
                        {m.totaal_uren > 0 && (
                          <div className="mt-3 pt-3 border-t border-neutral-50 flex justify-between text-sm">
                            <span className="text-neutral-500">Gemiddeld uurtarief</span>
                            <span className="font-semibold">€{(m.totaal_verdiensten / m.totaal_uren).toFixed(2)}/uur</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* BTW / Omzetbelasting tab */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Linkerkant - illustratie + info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Belastingen</h3>
              <div className="flex justify-center my-6">
                <div className="w-32 h-32 bg-[#F27501]/5 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-neutral-600 text-center leading-relaxed mb-4">
                Werk je naast je TopTalent-klussen ergens anders als freelancer? Dan heeft dit invloed op je btw-aangifte.
              </p>
              <div className="bg-[#F27501]/5 border border-[#F27501]/20 rounded-xl p-4 mb-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-[#F27501] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 mb-1">Let op</p>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Dit overzicht is enkel een indicatie en is niet toegespitst op jouw persoonlijke situatie.
                      Neem voor een belastingadvies contact op met een belastingadviseur.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rechterkant - kwartaal overzicht */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-neutral-900">Totale omzetbelasting</h3>
                <select
                  value={selectedKwartaal}
                  onChange={(e) => setSelectedKwartaal(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                >
                  {kwartalen.map((k) => (
                    <option key={k.key} value={k.key}>{k.label}</option>
                  ))}
                </select>
              </div>

              {selectedKwartaal && (
                <div>
                  <p className="text-sm font-medium text-neutral-500 mb-4">
                    Over {selectedKwartaal}
                  </p>

                  {/* Inkomsten sectie */}
                  <div className="border-b border-neutral-100 pb-4 mb-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Inkomsten</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Leveringen/Diensten belast met 21% btw</span>
                        <span className="font-medium text-neutral-900">€{kwartaalData.inkomsten.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Btw</span>
                        <span className="font-medium text-neutral-900">€{kwartaalData.btw.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kosten sectie */}
                  <div className="border-b border-neutral-100 pb-4 mb-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Kosten</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Directe betalingen</span>
                        <span className="font-medium text-neutral-900">€{kwartaalData.inkomsten.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Vervangingskosten</span>
                        <span className="font-medium text-neutral-900">€0,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Subtotaal */}
                  <div className="border-b border-neutral-100 pb-4 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-neutral-900">SUBTOTAAL</span>
                      <span className="font-bold text-neutral-900">€{kwartaalData.inkomsten.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* BTW */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-neutral-700">Btw (21%)</span>
                      <span className="font-bold text-[#F27501]">€{kwartaalData.btw.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Samenvatting kaarten */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-neutral-50 rounded-xl p-3">
                      <p className="text-xs text-neutral-500 mb-0.5">Gewerkte uren</p>
                      <p className="text-lg font-bold text-neutral-900">{kwartaalData.uren.toFixed(1)}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-xl p-3">
                      <p className="text-xs text-neutral-500 mb-0.5">Diensten</p>
                      <p className="text-lg font-bold text-neutral-900">{kwartaalData.diensten}</p>
                    </div>
                  </div>

                  {/* BTW aangifte knop */}
                  <a
                    href="https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/btw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#F27501] text-white font-semibold rounded-xl hover:bg-[#d96800] transition-colors"
                  >
                    Btw-aangifte doen
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
