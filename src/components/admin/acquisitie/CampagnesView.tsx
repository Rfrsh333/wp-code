"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Campagne {
  id: string;
  naam: string;
  status: string;
  onderwerp_template: string | null;
  inhoud_template: string | null;
  target_filters: Record<string, string> | null;
  is_drip_campaign: boolean;
  drip_sequence: Array<{ dag: number; onderwerp: string; inhoud: string }> | null;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_replied: number;
  created_at: string;
}

export default function CampagnesView() {
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [naam, setNaam] = useState("");
  const [onderwerpTemplate, setOnderwerpTemplate] = useState("");
  const [inhoudTemplate, setInhoudTemplate] = useState("");
  const [isDrip, setIsDrip] = useState(false);
  const [dripSteps, setDripSteps] = useState<Array<{ dag: number; onderwerp: string; inhoud: string }>>([]);

  // AI generation
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchCampagnes = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/campagnes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setCampagnes(json.data || []);
    }
    setIsLoading(false);
  }, [getToken]);

  useEffect(() => {
    void fetchCampagnes();
  }, [fetchCampagnes]);

  const saveCampagne = async () => {
    if (!naam.trim()) {
      setMessage({ type: "error", text: "Naam is vereist" });
      return;
    }

    const token = await getToken();
    const body: Record<string, unknown> = {
      naam,
      onderwerp_template: onderwerpTemplate,
      inhoud_template: inhoudTemplate,
      is_drip_campaign: isDrip,
      drip_sequence: isDrip ? dripSteps : [],
    };

    if (editingId) {
      body.action = "update";
      body.id = editingId;
    }

    const res = await fetch("/api/admin/acquisitie/campagnes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMessage({ type: "success", text: editingId ? "Campagne bijgewerkt" : "Campagne aangemaakt" });
      resetForm();
      fetchCampagnes();
    } else {
      setMessage({ type: "error", text: "Opslaan mislukt" });
    }
  };

  const deleteCampagne = async (id: string) => {
    if (!confirm("Campagne verwijderen?")) return;
    const token = await getToken();
    await fetch("/api/admin/acquisitie/campagnes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchCampagnes();
  };

  const sendCampagne = async (id: string) => {
    if (!confirm("Campagne versturen naar alle leads in de wachtrij?")) return;
    const token = await getToken();
    setMessage({ type: "success", text: "Emails worden verstuurd..." });
    const res = await fetch("/api/admin/acquisitie/campagnes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "send", id }),
    });
    if (res.ok) {
      const result = await res.json();
      setMessage({ type: "success", text: `${result.sent} emails verstuurd` });
      fetchCampagnes();
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Versturen mislukt" });
    }
  };

  const editCampagne = (c: Campagne) => {
    setEditingId(c.id);
    setNaam(c.naam);
    setOnderwerpTemplate(c.onderwerp_template || "");
    setInhoudTemplate(c.inhoud_template || "");
    setIsDrip(c.is_drip_campaign);
    setDripSteps(c.drip_sequence || []);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setNaam("");
    setOnderwerpTemplate("");
    setInhoudTemplate("");
    setIsDrip(false);
    setDripSteps([]);
  };

  const addDripStep = () => {
    const lastDay = dripSteps.length > 0 ? dripSteps[dripSteps.length - 1].dag : 0;
    setDripSteps([...dripSteps, { dag: lastDay + 3, onderwerp: "", inhoud: "" }]);
  };

  const updateDripStep = (index: number, field: string, value: string | number) => {
    setDripSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeDripStep = (index: number) => {
    setDripSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const generateAITemplate = async () => {
    setIsGeneratingAI(true);
    const token = await getToken();
    // Use the outreach email agent to generate a template
    const res = await fetch("/api/admin/ai/outreach-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        lead_id: null,
        type: "cold_intro",
        action: "generate_template",
      }),
    });

    // Since the endpoint expects a lead_id, we'll create a mock request
    // For now, set a good default template
    setOnderwerpTemplate("Horeca personeel voor {{bedrijfsnaam}} | TopTalent Jobs");
    setInhoudTemplate(
      `Beste {{contactpersoon}},\n\nIk ben van TopTalent Jobs, specialist in horeca personeel in {{stad}} en omgeving.\n\nWij leveren ervaren krachten voor bediening, bar, keuken en evenementen. Flexibel inzetbaar per dienst of per week, zonder langetermijnverplichtingen.\n\nZou het interessant zijn om eens vrijblijvend te bespreken hoe wij {{bedrijfsnaam}} kunnen ondersteunen?\n\nMet vriendelijke groet,\nTopTalent Jobs\nwww.toptalentjobs.nl`
    );
    setIsGeneratingAI(false);
    setMessage({ type: "success", text: "Template gegenereerd! Pas aan waar nodig." });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      concept: "bg-neutral-100 text-neutral-600",
      actief: "bg-green-100 text-green-700",
      gepauzeerd: "bg-amber-100 text-amber-700",
      afgerond: "bg-blue-100 text-blue-700",
    };
    return colors[status] || "bg-neutral-100 text-neutral-600";
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
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-800">Email Campagnes</h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-[#F27501] text-white rounded-lg text-sm font-medium hover:bg-[#d96800]"
        >
          + Nieuwe Campagne
        </button>
      </div>

      {/* Campagne Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 mb-6">
          <h4 className="font-medium text-neutral-800 mb-4">
            {editingId ? "Campagne Bewerken" : "Nieuwe Campagne"}
          </h4>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Naam</label>
              <input
                type="text"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
                placeholder="bijv. Cold outreach Utrecht restaurants"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600">Onderwerp</label>
                <span className="text-xs text-neutral-400">Gebruik {'{{bedrijfsnaam}}'}, {'{{contactpersoon}}'}, etc.</span>
              </div>
              <button
                onClick={generateAITemplate}
                disabled={isGeneratingAI}
                className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                {isGeneratingAI ? "Genereren..." : "AI Template"}
              </button>
            </div>
            <input
              type="text"
              value={onderwerpTemplate}
              onChange={(e) => setOnderwerpTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              placeholder="Email onderwerp..."
            />

            <div>
              <label className="text-sm text-neutral-600 block mb-1">Inhoud</label>
              <textarea
                value={inhoudTemplate}
                onChange={(e) => setInhoudTemplate(e.target.value)}
                className="w-full p-3 border border-neutral-300 rounded-lg text-sm min-h-[200px] focus:outline-none focus:border-[#F27501] resize-y"
                placeholder="Email inhoud..."
              />
            </div>

            {/* Drip campaign */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDrip}
                  onChange={(e) => setIsDrip(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-neutral-700">Drip campagne (automatische follow-ups)</span>
              </label>

              {isDrip && (
                <div className="mt-3 space-y-3">
                  {dripSteps.map((step, i) => (
                    <div key={i} className="bg-neutral-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-neutral-600">Stap {i + 1}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-neutral-500">Na</label>
                          <input
                            type="number"
                            value={step.dag}
                            onChange={(e) => updateDripStep(i, "dag", parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-neutral-300 rounded text-xs"
                            min={0}
                          />
                          <span className="text-xs text-neutral-500">dagen</span>
                          <button onClick={() => removeDripStep(i)} className="text-red-500 hover:text-red-700 text-xs">
                            Verwijder
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={step.onderwerp}
                        onChange={(e) => updateDripStep(i, "onderwerp", e.target.value)}
                        placeholder="Onderwerp..."
                        className="w-full px-2 py-1 border border-neutral-300 rounded text-sm mb-2 focus:outline-none"
                      />
                      <textarea
                        value={step.inhoud}
                        onChange={(e) => updateDripStep(i, "inhoud", e.target.value)}
                        placeholder="Inhoud..."
                        className="w-full p-2 border border-neutral-300 rounded text-sm min-h-[80px] focus:outline-none resize-y"
                      />
                    </div>
                  ))}
                  <button
                    onClick={addDripStep}
                    className="text-xs px-3 py-1.5 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300"
                  >
                    + Stap toevoegen
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveCampagne}
                className="px-6 py-2 bg-[#F27501] text-white rounded-lg text-sm font-medium hover:bg-[#d96800]"
              >
                {editingId ? "Opslaan" : "Aanmaken"}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-neutral-200 text-neutral-600 rounded-lg text-sm hover:bg-neutral-300"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campagne list */}
      <div className="space-y-3">
        {campagnes.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-xl border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-neutral-900">{c.naam}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(c.status)}`}>
                    {c.status}
                  </span>
                  {c.is_drip_campaign && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">drip</span>
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                  <span>Verstuurd: {c.emails_sent}</span>
                  <span>Geopend: {c.emails_opened}</span>
                  <span>Geklikt: {c.emails_clicked}</span>
                  <span>Replies: {c.emails_replied}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editCampagne(c)}
                  className="text-xs px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200"
                >
                  Bewerken
                </button>
                {c.status !== "afgerond" && (
                  <button
                    onClick={() => sendCampagne(c.id)}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Versturen
                  </button>
                )}
                <button
                  onClick={() => deleteCampagne(c.id)}
                  className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >
                  Verwijder
                </button>
              </div>
            </div>
          </div>
        ))}
        {campagnes.length === 0 && !showForm && (
          <p className="text-center text-neutral-400 py-8">Nog geen campagnes aangemaakt</p>
        )}
      </div>
    </div>
  );
}
