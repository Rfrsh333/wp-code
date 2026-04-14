"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  stad: string | null;
  branche: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  engagement_score: number;
  volgende_actie_datum: string | null;
  volgende_actie_notitie: string | null;
  laatste_contact_datum: string | null;
  personalisatie_notities: string | null;
}

interface Props {
  onSelectLead: (id: string) => void;
}

export default function BellijstView({ onSelectLead }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [minScore, setMinScore] = useState("50");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick log state
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logInhoud, setLogInhoud] = useState("");
  const [logResultaat, setLogResultaat] = useState("");

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();

    // Fetch leads sorted by AI score, filtered to have a phone number
    const params = new URLSearchParams({
      sort: "ai_score",
      dir: "desc",
      limit: "100",
    });
    if (minScore) params.set("min_score", minScore);

    const res = await fetch(`/api/admin/acquisitie/leads?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const json = await res.json();
      // Filter to only leads with phone numbers and not yet klant/afgewezen
      const filtered = (json.data || []).filter(
        (l: Lead) => l.telefoon && l.pipeline_stage !== "klant" && l.pipeline_stage !== "afgewezen"
      );
      setLeads(filtered);
    }
    setIsLoading(false);
  }, [getToken, minScore]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const logCall = async (leadId: string) => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/contactmomenten", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        lead_id: leadId,
        type: "telefoon",
        richting: "uitgaand",
        inhoud: logInhoud,
        resultaat: logResultaat || "neutraal",
      }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Gesprek gelogd" });
      setLoggingId(null);
      setLogInhoud("");
      setLogResultaat("");
      fetchLeads();
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-neutral-100 text-neutral-500";
    if (score >= 70) return "bg-green-100 text-green-700";
    if (score >= 50) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-500";
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
      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-neutral-800">Bellijst</h3>
          <span className="text-sm text-neutral-500">{leads.length} leads met telefoon</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600">Min score:</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="w-20 px-2 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none"
            min={0}
            max={100}
          />
        </div>
      </div>

      <div className="space-y-2">
        {leads.map((lead, index) => (
          <div key={lead.id} className="bg-white p-4 rounded-xl border border-neutral-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-bold text-neutral-500">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className="font-medium text-neutral-900 cursor-pointer hover:text-[#F27501]"
                      onClick={() => onSelectLead(lead.id)}
                    >
                      {lead.bedrijfsnaam}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreColor(lead.ai_score)}`}>
                      {lead.ai_score || "-"}
                    </span>
                    {lead.engagement_score >= 50 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium animate-pulse">HOT</span>
                    )}
                    <span className="text-xs text-neutral-400">{lead.pipeline_stage}</span>
                  </div>
                  {lead.contactpersoon && (
                    <p className="text-sm text-neutral-600 mt-0.5">{lead.contactpersoon}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                    <span>{lead.stad || "-"}</span>
                    <span>{lead.branche || "-"}</span>
                    {lead.laatste_contact_datum && (
                      <span>Laatste contact: {new Date(lead.laatste_contact_datum).toLocaleDateString("nl-NL")}</span>
                    )}
                  </div>
                  {lead.personalisatie_notities && (
                    <p className="text-xs text-purple-600 mt-1 italic">{lead.personalisatie_notities}</p>
                  )}
                  {lead.volgende_actie_notitie && (
                    <p className="text-xs text-amber-600 mt-1">
                      Actie: {lead.volgende_actie_notitie}
                      {lead.volgende_actie_datum && ` (${new Date(lead.volgende_actie_datum).toLocaleDateString("nl-NL")})`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${lead.telefoon}`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {lead.telefoon}
                </a>
                <button
                  onClick={() => setLoggingId(loggingId === lead.id ? null : lead.id)}
                  className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-xs hover:bg-neutral-200"
                >
                  Log gesprek
                </button>
              </div>
            </div>

            {/* Quick log form */}
            {loggingId === lead.id && (
              <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={logResultaat}
                    onChange={(e) => setLogResultaat(e.target.value)}
                    className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                  >
                    <option value="">Resultaat...</option>
                    <option value="positief">Positief</option>
                    <option value="neutraal">Neutraal</option>
                    <option value="negatief">Negatief</option>
                    <option value="geen_antwoord">Geen antwoord</option>
                    <option value="voicemail">Voicemail</option>
                  </select>
                </div>
                <textarea
                  value={logInhoud}
                  onChange={(e) => setLogInhoud(e.target.value)}
                  placeholder="Gespreksnotities..."
                  className="w-full p-2 border border-neutral-300 rounded-lg text-sm min-h-[60px] focus:outline-none focus:border-[#F27501]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => logCall(lead.id)}
                    className="px-4 py-1.5 bg-[#F27501] text-white rounded-lg text-xs hover:bg-[#d96800]"
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => { setLoggingId(null); setLogInhoud(""); setLogResultaat(""); }}
                    className="px-3 py-1.5 bg-neutral-200 text-neutral-600 rounded-lg text-xs hover:bg-neutral-300"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {leads.length === 0 && (
          <p className="text-center text-neutral-400 py-8">
            Geen leads met telefoon gevonden{minScore ? ` (min score: ${minScore})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
