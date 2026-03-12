"use client";

import { useCallback, useEffect, useState } from "react";

interface Offerte {
  id: string;
  offerte_nummer: string;
  aanvraag_id: string | null;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  locatie: string;
  geldig_tot: string;
  status: string;
  token: string;
  ai_generated: boolean;
  tarieven: { functie: string; uurtarief: number; weekend_tarief: number; feestdag_tarief: number; aantal: number }[];
  korting_percentage: number;
  totaal_bedrag: number;
  accepted_at: string | null;
  accepted_naam: string | null;
  created_at: string;
}

interface Aanvraag {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  type_personeel: string[];
  aantal_personen: string;
  status: string;
  created_at: string;
}

export default function OffertesTab() {
  const [offertes, setOffertes] = useState<Offerte[]>([]);
  const [aanvragen, setAanvragen] = useState<Aanvraag[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [view, setView] = useState<"offertes" | "genereren">("offertes");
  const [copied, setCopied] = useState<string | null>(null);

  const getToken = async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  const fetchData = useCallback(async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const headers = { Authorization: `Bearer ${token}` };

      const [offertesRes, aanvragenRes] = await Promise.all([
        fetch("/api/admin/data?table=offertes&orderBy=created_at&order=desc&limit=100", { headers }),
        fetch("/api/admin/data?table=personeel_aanvragen&orderBy=created_at&order=desc&limit=50", { headers }),
      ]);

      if (offertesRes.ok) {
        const d = await offertesRes.json();
        setOffertes(d.data || []);
      }
      if (aanvragenRes.ok) {
        const d = await aanvragenRes.json();
        setAanvragen(d.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateOfferte = async (aanvraagId: string) => {
    setGenerating(aanvraagId);
    try {
      const token = document.cookie.match(/admin-token=([^;]+)/)?.[1] || "";
      const res = await fetch("/api/admin/ai/offerte-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aanvraag_id: aanvraagId }),
      });
      if (res.ok) {
        await fetchData();
        setView("offertes");
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setGenerating(null);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/offerte/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusBadge = (status: string, isVerlopen: boolean) => {
    if (status === "geaccepteerd") return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Geaccepteerd</span>;
    if (isVerlopen) return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Verlopen</span>;
    if (status === "verzonden") return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Verzonden</span>;
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">Concept</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  const accepted = offertes.filter(o => o.accepted_at).length;
  const pending = offertes.filter(o => !o.accepted_at && o.geldig_tot && new Date(o.geldig_tot) >= new Date()).length;
  const expired = offertes.filter(o => !o.accepted_at && o.geldig_tot && new Date(o.geldig_tot) < new Date()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Offertes</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView("offertes")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "offertes" ? "bg-[#1B2E4A] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
          >
            Alle offertes
          </button>
          <button
            onClick={() => setView("genereren")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "genereren" ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
          >
            + AI Offerte genereren
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Totaal", value: offertes.length, color: "bg-neutral-100 text-neutral-700" },
          { label: "Geaccepteerd", value: accepted, color: "bg-green-50 text-green-700" },
          { label: "In afwachting", value: pending, color: "bg-blue-50 text-blue-700" },
          { label: "Verlopen", value: expired, color: "bg-amber-50 text-amber-700" },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-xl p-4`}>
            <p className="text-sm font-medium opacity-70">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {view === "genereren" ? (
        /* Aanvragen lijst om offerte voor te genereren */
        <div className="bg-white rounded-xl border border-neutral-200">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h3 className="font-semibold text-neutral-900">Selecteer een aanvraag</h3>
            <p className="text-sm text-neutral-500">Kies een personeelaanvraag om automatisch een AI-offerte te genereren</p>
          </div>
          <div className="divide-y divide-neutral-100">
            {aanvragen.length === 0 ? (
              <p className="px-6 py-8 text-center text-neutral-400">Geen aanvragen gevonden</p>
            ) : (
              aanvragen.map(a => (
                <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50">
                  <div>
                    <p className="font-medium text-neutral-900">{a.bedrijfsnaam}</p>
                    <p className="text-sm text-neutral-500">
                      {a.contactpersoon} &middot; {a.type_personeel?.join(", ")} &middot; {a.aantal_personen} pers.
                    </p>
                    <p className="text-xs text-neutral-400">{new Date(a.created_at).toLocaleDateString("nl-NL")}</p>
                  </div>
                  <button
                    onClick={() => generateOfferte(a.id)}
                    disabled={generating === a.id}
                    className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-lg hover:bg-[#D96800] transition-colors disabled:opacity-50"
                  >
                    {generating === a.id ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Genereren...
                      </span>
                    ) : (
                      "Genereer offerte"
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Offertes overzicht */
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 text-left text-sm text-neutral-500">
                  <th className="px-6 py-3 font-medium">Nummer</th>
                  <th className="px-6 py-3 font-medium">Bedrijf</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium text-right">Bedrag/week</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Datum</th>
                  <th className="px-6 py-3 font-medium">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {offertes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                      Nog geen offertes. Gebruik &quot;AI Offerte genereren&quot; om te beginnen.
                    </td>
                  </tr>
                ) : (
                  offertes.map(o => {
                    const isVerlopen = !o.accepted_at && o.geldig_tot && new Date(o.geldig_tot) < new Date();
                    return (
                      <tr key={o.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-neutral-700">{o.offerte_nummer}</span>
                          {o.ai_generated && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-600 rounded">AI</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-neutral-900">{o.bedrijfsnaam}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{o.contactpersoon}</td>
                        <td className="px-6 py-4 text-right font-medium text-neutral-900">
                          {o.totaal_bedrag ? `€${o.totaal_bedrag.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-6 py-4">{statusBadge(o.status, !!isVerlopen)}</td>
                        <td className="px-6 py-4 text-sm text-neutral-500">
                          {new Date(o.created_at).toLocaleDateString("nl-NL")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {o.token && (
                              <button
                                onClick={() => copyLink(o.token)}
                                className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors"
                                title="Kopieer link"
                              >
                                {copied === o.token ? "Gekopieerd!" : "Link"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
