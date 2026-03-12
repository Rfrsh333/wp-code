"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
}

interface MatchResult {
  medewerker: {
    id: string;
    naam: string;
    email: string;
    telefoon: string | null;
    functie: string[];
    stad: string | null;
    admin_score_aanwezigheid: number | null;
    admin_score_vaardigheden: number | null;
    profile_photo_url: string | null;
  };
  score: number;
  breakdown: {
    functie_score: number;
    beschikbaarheid_score: number;
    admin_score: number;
    locatie_score: number;
  };
  beschikbaar: boolean;
}

interface PlanningSuggestie {
  aanbevolen_aantal: number;
  aanbevolen_functies: string[];
  tijdsadvies: string;
  onderbouwing: string;
  tips: string[];
}

export default function MatchingTab() {
  const [diensten, setDiensten] = useState<Dienst[]>([]);
  const [selectedDienst, setSelectedDienst] = useState<Dienst | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMedewerkers, setSelectedMedewerkers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [planningSuggestie, setPlanningSuggestie] = useState<PlanningSuggestie | null>(null);
  const [isLoadingPlanning, setIsLoadingPlanning] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  // Laad open diensten
  useEffect(() => {
    async function loadDiensten() {
      const token = await getToken();
      const res = await fetch("/api/admin/diensten", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const openDiensten = (json.data || []).filter(
          (d: Dienst) => d.status === "open" && new Date(d.datum) >= new Date(new Date().toISOString().split("T")[0])
        );
        setDiensten(openDiensten);
      }
      setIsLoading(false);
    }
    void loadDiensten();
  }, [getToken]);

  const findMatches = async (dienst: Dienst) => {
    setSelectedDienst(dienst);
    setIsMatching(true);
    setMatches([]);
    setSelectedMedewerkers(new Set());
    setPlanningSuggestie(null);
    setMessage(null);

    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/matching?dienst_id=${dienst.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      } else {
        setMessage({ type: "error", text: "Matching mislukt" });
      }
    } catch {
      setMessage({ type: "error", text: "Er ging iets mis" });
    } finally {
      setIsMatching(false);
    }
  };

  const inviteSelected = async () => {
    if (!selectedDienst || selectedMedewerkers.size === 0) return;
    setIsInviting(true);
    setMessage(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/admin/matching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dienst_id: selectedDienst.id,
          medewerker_ids: Array.from(selectedMedewerkers),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: "success",
          text: `${data.success} medewerker(s) uitgenodigd${data.errors.length > 0 ? `, ${data.errors.length} fout(en)` : ""}`,
        });
        // Refresh matches
        void findMatches(selectedDienst);
      } else {
        setMessage({ type: "error", text: "Uitnodigen mislukt" });
      }
    } catch {
      setMessage({ type: "error", text: "Er ging iets mis" });
    } finally {
      setIsInviting(false);
    }
  };

  const getPlanningSuggestie = async (dienst: Dienst) => {
    setIsLoadingPlanning(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/ai/planning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          klant_naam: dienst.klant_naam,
          locatie: dienst.locatie,
          datum: dienst.datum,
          functie: dienst.functie,
          start_tijd: dienst.start_tijd,
          eind_tijd: dienst.eind_tijd,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlanningSuggestie(data);
      }
    } catch {
      // Silently fail - planning is optional
    } finally {
      setIsLoadingPlanning(false);
    }
  };

  const toggleMedewerker = (id: string) => {
    setSelectedMedewerkers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 bg-green-50";
    if (score >= 40) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Auto-Matching</h2>

      {message && (
        <div
          className={`mb-4 p-4 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diensten lijst */}
        <div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-3">Open Diensten</h3>
          {diensten.length === 0 ? (
            <p className="text-neutral-500 text-sm">Geen open diensten gevonden.</p>
          ) : (
            <div className="space-y-2">
              {diensten.map((dienst) => (
                <button
                  key={dienst.id}
                  onClick={() => findMatches(dienst)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedDienst?.id === dienst.id
                      ? "border-[#F27501] bg-orange-50"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">{dienst.klant_naam}</p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(dienst.datum)} &middot; {dienst.start_tijd}-{dienst.eind_tijd}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium capitalize">
                        {dienst.functie}
                      </span>
                      <p className="text-xs text-neutral-500 mt-1">
                        {dienst.aantal_nodig} nodig
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{dienst.locatie}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Matches */}
        <div>
          {selectedDienst && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Matches voor {selectedDienst.klant_naam}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => getPlanningSuggestie(selectedDienst)}
                    disabled={isLoadingPlanning}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                    {isLoadingPlanning ? "Laden..." : "AI Suggestie"}
                  </button>
                  {selectedMedewerkers.size > 0 && (
                    <button
                      onClick={inviteSelected}
                      disabled={isInviting}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] transition-colors disabled:opacity-50"
                    >
                      {isInviting ? "Bezig..." : `Uitnodigen (${selectedMedewerkers.size})`}
                    </button>
                  )}
                </div>
              </div>

              {/* AI Planning Suggestie */}
              {planningSuggestie && (
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                    <p className="font-semibold text-purple-800 text-sm">AI Planning Suggestie</p>
                  </div>
                  <div className="space-y-1 text-sm text-purple-700">
                    <p>Aanbevolen: <strong>{planningSuggestie.aanbevolen_aantal}</strong> medewerker(s)</p>
                    <p>Functies: {planningSuggestie.aanbevolen_functies.join(", ")}</p>
                    <p>Tijdsadvies: {planningSuggestie.tijdsadvies}</p>
                    <p className="text-xs mt-2 text-purple-600">{planningSuggestie.onderbouwing}</p>
                    {planningSuggestie.tips.length > 0 && (
                      <ul className="mt-2 text-xs space-y-0.5">
                        {planningSuggestie.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-purple-400 mt-0.5">&#8226;</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {isMatching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-3 border-[#F27501] border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-neutral-500">Matches zoeken...</span>
                </div>
              ) : matches.length === 0 ? (
                <p className="text-neutral-500 text-sm py-4">Geen matches gevonden voor deze dienst.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {matches.map((match) => (
                    <div
                      key={match.medewerker.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        selectedMedewerkers.has(match.medewerker.id)
                          ? "border-[#F27501] bg-orange-50"
                          : "border-neutral-200 bg-white"
                      } ${!match.beschikbaar ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedMedewerkers.has(match.medewerker.id)}
                          onChange={() => toggleMedewerker(match.medewerker.id)}
                          className="mt-1 w-4 h-4 rounded accent-[#F27501]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-neutral-900 text-sm">
                                {match.medewerker.naam}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {match.medewerker.email}
                                {match.medewerker.stad && ` · ${match.medewerker.stad}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {!match.beschikbaar && (
                                <span className="text-xs text-red-500 font-medium">Niet beschikbaar</span>
                              )}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(match.score)}`}
                              >
                                {match.score}%
                              </span>
                            </div>
                          </div>

                          {/* Score breakdown */}
                          <div className="flex gap-2 mt-2">
                            {match.breakdown.functie_score > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                Functie {match.breakdown.functie_score}
                              </span>
                            )}
                            {match.breakdown.beschikbaarheid_score > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                                Beschikbaar {match.breakdown.beschikbaarheid_score}
                              </span>
                            )}
                            {match.breakdown.admin_score > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">
                                Score {match.breakdown.admin_score}
                              </span>
                            )}
                            {match.breakdown.locatie_score > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
                                Locatie {match.breakdown.locatie_score}
                              </span>
                            )}
                          </div>

                          {/* Functies */}
                          <div className="flex gap-1 mt-1.5">
                            {match.medewerker.functie.map((f) => (
                              <span
                                key={f}
                                className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                                  f === selectedDienst.functie
                                    ? "bg-[#F27501] text-white"
                                    : "bg-neutral-100 text-neutral-600"
                                }`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!selectedDienst && (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              <p className="text-sm">Selecteer een dienst om matches te zoeken</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
