"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  aantal_nodig: number;
  status: string;
  aanmeldingen_count?: number;
}

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  functie: string[];
  beschikbaarheid?: Record<string, string[]>;
}

interface Aanmelding {
  id: string;
  dienst_id: string;
  medewerker_id: string;
  status: string;
  medewerker?: { naam: string; email: string; telefoon: string | null };
}

const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const DAG_LABELS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

const functieLabels: Record<string, string> = {
  bediening: "Bediening",
  bar: "Bar",
  keuken: "Keuken",
  afwas: "Afwas",
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  return `${start.toLocaleDateString("nl-NL", opts)} - ${end.toLocaleDateString("nl-NL", { ...opts, year: "numeric" })}`;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function PlanningTab() {
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [diensten, setDiensten] = useState<Dienst[]>([]);
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDienst, setSelectedDienst] = useState<Dienst | null>(null);
  const [aanmeldingen, setAanmeldingen] = useState<Aanmelding[]>([]);
  const [selectedDag, setSelectedDag] = useState<number>(0);
  const [toewijzingLoading, setToewijzingLoading] = useState<string | null>(null);

  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  }, []);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeader();
      const weekParam = formatDateISO(weekStart);
      const [dienstenRes, medewerkersRes] = await Promise.all([
        fetch(`/api/admin/diensten?week=${weekParam}`, { headers }),
        fetch("/api/admin/medewerkers", { headers }),
      ]);
      const dienstenData = await dienstenRes.json();
      const medewerkersData = await medewerkersRes.json();

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startStr = formatDateISO(weekStart);
      const endStr = formatDateISO(weekEnd);

      const weekDiensten = (dienstenData.data || []).filter((d: Dienst) =>
        d.datum >= startStr && d.datum <= endStr
      );
      setDiensten(weekDiensten);
      setMedewerkers(medewerkersData.medewerkers || []);
    } catch {
      toast.error("Kon planningsdata niet laden");
    } finally {
      setIsLoading(false);
    }
  }, [weekStart, getAuthHeader, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateWeek = (direction: number) => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * 7);
      return d;
    });
    setSelectedDienst(null);
  };

  const goToToday = () => {
    setWeekStart(getWeekStart(new Date()));
    setSelectedDienst(null);
  };

  const selectDienst = async (dienst: Dienst) => {
    setSelectedDienst(dienst);
    const dagIdx = weekDates.findIndex(d => formatDateISO(d) === dienst.datum);
    if (dagIdx >= 0) setSelectedDag(dagIdx);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/diensten", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "get_aanmeldingen", dienst_id: dienst.id }),
      });
      const data = await res.json();
      setAanmeldingen(data.data || []);
    } catch {
      setAanmeldingen([]);
    }
  };

  const toewijzenMedewerker = async (medewerkerId: string) => {
    if (!selectedDienst) return;
    setToewijzingLoading(medewerkerId);
    try {
      const headers = await getAuthHeader();
      await fetch("/api/admin/diensten", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_aanmelding",
          id: null,
          dienst_id: selectedDienst.id,
          data: { medewerker_id: medewerkerId, status: "geaccepteerd" },
        }),
      });
      toast.success("Medewerker toegewezen");
      await selectDienst(selectedDienst);
      fetchData();
    } catch {
      toast.error("Toewijzen mislukt");
    } finally {
      setToewijzingLoading(null);
    }
  };

  const getDienstenVoorDag = (dateStr: string) =>
    diensten.filter(d => d.datum === dateStr);

  const getShiftColor = (dienst: Dienst) => {
    const gevuld = aanmeldingen?.filter(a => a.dienst_id === dienst.id && a.status === "geaccepteerd").length || dienst.aanmeldingen_count || 0;
    if (gevuld >= dienst.aantal_nodig) return "border-green-300 bg-green-50";
    if (gevuld > 0) return "border-orange-300 bg-orange-50";
    return "border-red-300 bg-red-50";
  };

  const beschikbareMedewerkers = medewerkers.filter(m => {
    if (!selectedDienst) return false;
    const passendefunctie = m.functie?.includes(selectedDienst.functie);
    if (!passendefunctie) return false;
    const reedsToegewezen = aanmeldingen.some(a => a.medewerker_id === m.id && a.status === "geaccepteerd");
    return !reedsToegewezen;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-neutral-900">Planningsbord</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            Vandaag
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-neutral-600 ml-2">{formatWeekLabel(weekStart)}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Weekgrid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, i) => {
                const dateStr = formatDateISO(date);
                const dagDiensten = getDienstenVoorDag(dateStr);
                const isVandaag = formatDateISO(new Date()) === dateStr;
                return (
                  <div key={dateStr} className="min-w-0">
                    <div className={`text-center py-2 rounded-t-lg text-sm font-semibold ${isVandaag ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-700"}`}>
                      <div>{DAGEN[i]}</div>
                      <div className="text-xs font-normal opacity-80">{date.getDate()}</div>
                    </div>
                    <div className="bg-white border border-neutral-200 border-t-0 rounded-b-lg min-h-[200px] p-1 space-y-1">
                      {dagDiensten.length === 0 ? (
                        <div className="text-xs text-neutral-400 text-center py-4">Geen shifts</div>
                      ) : (
                        dagDiensten.map(dienst => (
                          <button
                            key={dienst.id}
                            onClick={() => selectDienst(dienst)}
                            className={`w-full text-left p-2 rounded-lg border-2 transition-all text-xs hover:shadow-sm ${
                              selectedDienst?.id === dienst.id
                                ? "border-[#F27501] bg-[#F27501]/5 ring-1 ring-[#F27501]"
                                : getShiftColor(dienst)
                            }`}
                          >
                            <div className="font-semibold truncate">{dienst.klant_naam}</div>
                            <div className="text-neutral-500">{dienst.start_tijd?.slice(0, 5)} - {dienst.eind_tijd?.slice(0, 5)}</div>
                            <div className="text-neutral-400">{functieLabels[dienst.functie] || dienst.functie}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-green-300 bg-green-50" /> Vol</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-orange-300 bg-orange-50" /> Deels gevuld</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-red-300 bg-red-50" /> Leeg</span>
            </div>
          </div>

          {/* Detail sidebar */}
          <div className="w-80 flex-shrink-0">
            {selectedDienst ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sticky top-4">
                <h3 className="font-bold text-neutral-900 mb-1">{selectedDienst.klant_naam}</h3>
                <p className="text-sm text-neutral-500 mb-3">{selectedDienst.locatie}</p>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Datum</span>
                    <span>{new Date(selectedDienst.datum + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tijd</span>
                    <span>{selectedDienst.start_tijd?.slice(0, 5)} - {selectedDienst.eind_tijd?.slice(0, 5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Functie</span>
                    <span>{functieLabels[selectedDienst.functie] || selectedDienst.functie}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Nodig</span>
                    <span>{aanmeldingen.filter(a => a.status === "geaccepteerd").length} / {selectedDienst.aantal_nodig}</span>
                  </div>
                </div>

                {/* Toegewezen medewerkers */}
                {aanmeldingen.filter(a => a.status === "geaccepteerd").length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">Toegewezen</h4>
                    <div className="space-y-1">
                      {aanmeldingen.filter(a => a.status === "geaccepteerd").map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-sm bg-green-50 rounded-lg px-3 py-1.5">
                          <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold text-green-800">
                            {a.medewerker?.naam?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium">{a.medewerker?.naam || "Onbekend"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beschikbare medewerkers */}
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                    Beschikbaar ({beschikbareMedewerkers.length})
                  </h4>
                  {beschikbareMedewerkers.length === 0 ? (
                    <p className="text-xs text-neutral-400">Geen beschikbare medewerkers voor deze functie</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {beschikbareMedewerkers.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold text-neutral-600 flex-shrink-0">
                              {m.naam.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-medium block truncate">{m.naam}</span>
                              <span className="text-xs text-neutral-400">{m.functie?.join(", ")}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => toewijzenMedewerker(m.id)}
                            disabled={toewijzingLoading === m.id}
                            className="text-xs px-2 py-1 bg-[#F27501] text-white rounded-md hover:bg-[#d96800] disabled:opacity-50 flex-shrink-0"
                          >
                            {toewijzingLoading === m.id ? "..." : "Toewijzen"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
                <svg className="w-10 h-10 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-neutral-500">Klik op een shift om details te zien en medewerkers toe te wijzen</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
