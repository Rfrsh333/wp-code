"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Aanvraag {
  id: string;
  created_at: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  type_personeel: string[];
  aantal_personen: string;
  locatie: string;
  status: string;
  ai_response_draft: string | null;
  ai_response_sent: boolean | null;
}

interface Inschrijving {
  id: string;
  created_at: string;
  voornaam: string;
  achternaam: string;
  email: string;
  stad: string;
  horeca_ervaring: string | null;
  gewenste_functies: string[] | null;
  ai_screening_score: number | null;
  ai_screening_notes: string | null;
  ai_screening_date: string | null;
}

interface ScreeningResult {
  score: number;
  samenvatting: string;
  sterke_punten: string[];
  aandachtspunten: string[];
  aanbeveling: string;
}

type SubTab = "leads" | "screening";

export default function AITab() {
  const [subTab, setSubTab] = useState<SubTab>("leads");
  const [aanvragen, setAanvragen] = useState<Aanvraag[]>([]);
  const [inschrijvingen, setInschrijvingen] = useState<Inschrijving[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAanvraag, setSelectedAanvraag] = useState<Aanvraag | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScreening, setIsScreening] = useState<string | null>(null);
  const [screeningResult, setScreeningResult] = useState<{ id: string; result: ScreeningResult } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const token = await getToken();

      // Load aanvragen via admin API
      const aanvragenRes = await fetch("/api/admin/data?table=personeel_aanvragen", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (aanvragenRes.ok) {
        const json = await aanvragenRes.json();
        setAanvragen((json.data as Aanvraag[]) || []);
      }

      // Load inschrijvingen via admin API
      const inschrRes = await fetch("/api/admin/data?table=inschrijvingen", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (inschrRes.ok) {
        const json = await inschrRes.json();
        setInschrijvingen((json.data as Inschrijving[]) || []);
      }

      setIsLoading(false);
    }
    void load();
  }, [getToken]);

  const generateResponse = async (aanvraag: Aanvraag) => {
    setSelectedAanvraag(aanvraag);
    setIsGenerating(true);
    setMessage(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/admin/ai/lead-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ aanvraag_id: aanvraag.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmailDraft(data.draft);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Genereren mislukt" });
      }
    } catch {
      setMessage({ type: "error", text: "Er ging iets mis" });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!selectedAanvraag || !emailDraft.trim()) return;
    setIsSending(true);
    setMessage(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/admin/ai/lead-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          aanvraag_id: selectedAanvraag.id,
          email_content: emailDraft,
          action: "send",
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `Email verstuurd naar ${selectedAanvraag.email}` });
        setAanvragen((prev) =>
          prev.map((a) =>
            a.id === selectedAanvraag.id ? { ...a, ai_response_sent: true } : a
          )
        );
        setSelectedAanvraag(null);
        setEmailDraft("");
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Versturen mislukt" });
      }
    } catch {
      setMessage({ type: "error", text: "Er ging iets mis" });
    } finally {
      setIsSending(false);
    }
  };

  const screenKandidaat = async (inschrijving: Inschrijving) => {
    setIsScreening(inschrijving.id);
    setMessage(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/admin/ai/screening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inschrijving_id: inschrijving.id }),
      });

      if (res.ok) {
        const result = await res.json();
        setScreeningResult({ id: inschrijving.id, result });
        setInschrijvingen((prev) =>
          prev.map((i) =>
            i.id === inschrijving.id
              ? {
                  ...i,
                  ai_screening_score: result.score,
                  ai_screening_notes: JSON.stringify(result),
                  ai_screening_date: new Date().toISOString(),
                }
              : i
          )
        );
        setMessage({ type: "success", text: `Screening score: ${result.score}/10` });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Screening mislukt" });
      }
    } catch {
      setMessage({ type: "error", text: "Er ging iets mis" });
    } finally {
      setIsScreening(null);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-700";
    if (score >= 6) return "bg-blue-100 text-blue-700";
    if (score >= 4) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const parseScreeningNotes = (notes: string | null): ScreeningResult | null => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">AI Agents</h2>

      {/* Sub tabs */}
      <div className="flex gap-2 mb-6">
        {(
          [
            { id: "leads" as SubTab, label: "Lead Follow-Up", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
            { id: "screening" as SubTab, label: "Kandidaat Screening", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              subTab === tab.id
                ? "bg-[#F27501] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

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

      {/* Lead Follow-Up Tab */}
      {subTab === "leads" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aanvragen lijst */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-3">Personeel Aanvragen</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {aanvragen.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    selectedAanvraag?.id === a.id
                      ? "border-[#F27501] bg-orange-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 text-sm">{a.bedrijfsnaam}</p>
                      <p className="text-xs text-neutral-500">{a.contactpersoon} &middot; {a.email}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {a.type_personeel?.join(", ")} &middot; {a.aantal_personen} personen
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.ai_response_sent && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Verstuurd
                        </span>
                      )}
                      <button
                        onClick={() => generateResponse(a)}
                        disabled={isGenerating}
                        className="text-xs px-3 py-1.5 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] transition-colors disabled:opacity-50"
                      >
                        {isGenerating && selectedAanvraag?.id === a.id ? "Bezig..." : "AI Reactie"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {aanvragen.length === 0 && (
                <p className="text-neutral-500 text-sm">Geen aanvragen gevonden.</p>
              )}
            </div>
          </div>

          {/* Email editor */}
          <div>
            {selectedAanvraag && emailDraft ? (
              <div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-3">
                  Email naar {selectedAanvraag.bedrijfsnaam}
                </h3>
                <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 text-xs text-neutral-500">
                    Aan: {selectedAanvraag.email}
                  </div>
                  <textarea
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    className="w-full p-4 text-sm min-h-[300px] focus:outline-none resize-y border-0"
                    placeholder="Email tekst..."
                  />
                  <div className="flex justify-between items-center px-4 py-3 bg-neutral-50 border-t border-neutral-200">
                    <button
                      onClick={() => {
                        setSelectedAanvraag(null);
                        setEmailDraft("");
                      }}
                      className="text-xs text-neutral-500 hover:text-neutral-700"
                    >
                      Annuleren
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => generateResponse(selectedAanvraag)}
                        disabled={isGenerating}
                        className="text-xs px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors disabled:opacity-50"
                      >
                        Opnieuw genereren
                      </button>
                      <button
                        onClick={sendEmail}
                        disabled={isSending}
                        className="text-xs px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isSending ? "Versturen..." : "Verstuur email"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Klik &quot;AI Reactie&quot; bij een aanvraag om een email te genereren</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screening Tab */}
      {subTab === "screening" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kandidaten lijst */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-3">Kandidaten</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {inschrijvingen.map((i) => (
                <div
                  key={i.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    screeningResult?.id === i.id
                      ? "border-[#F27501] bg-orange-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 text-sm">
                        {i.voornaam} {i.achternaam}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {i.stad} &middot; {i.horeca_ervaring || "Geen ervaring"}
                      </p>
                      {i.gewenste_functies && (
                        <div className="flex gap-1 mt-1">
                          {i.gewenste_functies.map((f) => (
                            <span
                              key={f}
                              className="text-xs px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded capitalize"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {i.ai_screening_score !== null && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreBadge(i.ai_screening_score)}`}
                        >
                          {i.ai_screening_score}/10
                        </span>
                      )}
                      <button
                        onClick={() => screenKandidaat(i)}
                        disabled={isScreening === i.id}
                        className="text-xs px-3 py-1.5 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] transition-colors disabled:opacity-50"
                      >
                        {isScreening === i.id
                          ? "Bezig..."
                          : i.ai_screening_score !== null
                            ? "Opnieuw"
                            : "Screen"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {inschrijvingen.length === 0 && (
                <p className="text-neutral-500 text-sm">Geen inschrijvingen gevonden.</p>
              )}
            </div>
          </div>

          {/* Screening resultaat */}
          <div>
            {screeningResult ? (
              <div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-3">Screening Resultaat</h3>
                <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
                  {/* Score */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${getScoreBadge(screeningResult.result.score)}`}
                    >
                      {screeningResult.result.score}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">
                        Score: {screeningResult.result.score}/10
                      </p>
                      <p className="text-sm text-neutral-600">{screeningResult.result.samenvatting}</p>
                    </div>
                  </div>

                  {/* Sterke punten */}
                  {screeningResult.result.sterke_punten.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-green-700 mb-1">Sterke punten</p>
                      <ul className="space-y-1">
                        {screeningResult.result.sterke_punten.map((punt, idx) => (
                          <li key={idx} className="text-sm text-neutral-600 flex items-start gap-2">
                            <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {punt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Aandachtspunten */}
                  {screeningResult.result.aandachtspunten.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-amber-700 mb-1">Aandachtspunten</p>
                      <ul className="space-y-1">
                        {screeningResult.result.aandachtspunten.map((punt, idx) => (
                          <li key={idx} className="text-sm text-neutral-600 flex items-start gap-2">
                            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            {punt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Aanbeveling */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-blue-700 mb-1">Aanbeveling</p>
                    <p className="text-sm text-blue-600">{screeningResult.result.aanbeveling}</p>
                  </div>
                </div>
              </div>
            ) : (
              (() => {
                // Show latest screening if available
                const latest = inschrijvingen.find((i) => i.ai_screening_notes);
                const parsed = latest ? parseScreeningNotes(latest.ai_screening_notes) : null;

                if (latest && parsed) {
                  return (
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-3">
                        Laatste Screening: {latest.voornaam} {latest.achternaam}
                      </h3>
                      <div className="bg-white border border-neutral-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${getScoreBadge(parsed.score)}`}
                          >
                            {parsed.score}
                          </div>
                          <p className="text-sm text-neutral-600">{parsed.samenvatting}</p>
                        </div>
                        <p className="text-xs text-neutral-400">
                          Gescreend op{" "}
                          {latest.ai_screening_date
                            ? new Date(latest.ai_screening_date).toLocaleDateString("nl-NL")
                            : "onbekend"}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                    <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">Klik &quot;Screen&quot; bij een kandidaat om een AI screening te starten</p>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
