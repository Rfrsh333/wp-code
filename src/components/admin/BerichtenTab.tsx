"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

interface Bericht {
  id: string;
  van_type: string;
  van_id: string;
  aan_type: string;
  aan_id: string;
  onderwerp: string | null;
  inhoud: string;
  gelezen: boolean;
  gelezen_at: string | null;
  created_at: string;
  medewerker_naam?: string;
}

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  functie?: string[];
}

interface BerichtTemplate {
  id: string;
  naam: string;
  onderwerp: string | null;
  inhoud: string;
  categorie: string;
}

export default function BerichtenTab() {
  const toast = useToast();
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBericht, setSelectedBericht] = useState<Bericht | null>(null);
  const [showNieuw, setShowNieuw] = useState(false);
  const [nieuwForm, setNieuwForm] = useState({ aan_id: "", onderwerp: "", inhoud: "" });
  const [isSending, setIsSending] = useState(false);
  const [zoekterm, setZoekterm] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkFilter, setBulkFilter] = useState<"alle" | "functie">("alle");
  const [bulkFunctie, setBulkFunctie] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<BerichtTemplate[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ naam: "", onderwerp: "", inhoud: "", categorie: "algemeen" });

  const getAuthHeaders = useCallback(() => {
    // Auth gaat via httpOnly cookies (verifyAdmin server-side) — geen token nodig in headers
    return { "Content-Type": "application/json" };
  }, []);

  useEffect(() => {
    fetchBerichten();
    fetchMedewerkers();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/berichten?templates=true", { headers: getAuthHeaders() });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch { /* non-critical */ }
  };

  const saveTemplate = async () => {
    if (!templateForm.naam || !templateForm.inhoud) return;
    try {
      await fetch("/api/admin/berichten", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "save_template", ...templateForm }),
      });
      toast.success("Template opgeslagen");
      setShowTemplateForm(false);
      setTemplateForm({ naam: "", onderwerp: "", inhoud: "", categorie: "algemeen" });
      fetchTemplates();
    } catch {
      toast.error("Kon template niet opslaan");
    }
  };

  const applyTemplate = (t: BerichtTemplate) => {
    setNieuwForm(prev => ({ ...prev, onderwerp: t.onderwerp || "", inhoud: t.inhoud }));
  };

  const bulkVerstuur = async () => {
    const targets = bulkFilter === "alle"
      ? medewerkers.map(m => m.id)
      : bulkFilter === "functie"
        ? medewerkers.filter(m => m.functie?.includes(bulkFunctie)).map(m => m.id)
        : [...bulkSelected];

    if (targets.length === 0 || !nieuwForm.inhoud.trim()) {
      toast.error("Selecteer ontvangers en vul een bericht in");
      return;
    }
    setIsSending(true);
    try {
      await fetch("/api/admin/berichten", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "bulk_send",
          aan_ids: targets,
          onderwerp: nieuwForm.onderwerp,
          inhoud: nieuwForm.inhoud,
        }),
      });
      toast.success(`Bericht verstuurd naar ${targets.length} medewerkers`);
      setShowBulk(false);
      setNieuwForm({ aan_id: "", onderwerp: "", inhoud: "" });
      fetchBerichten();
    } catch {
      toast.error("Bulk versturen mislukt");
    } finally {
      setIsSending(false);
    }
  };

  const fetchBerichten = async () => {
    try {
      const res = await fetch("/api/admin/berichten", { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setBerichten(data.berichten || []);
    } catch {
      toast.error("Kon berichten niet laden");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMedewerkers = async () => {
    try {
      const res = await fetch("/api/admin/medewerkers", { headers: getAuthHeaders() });
      const data = await res.json();
      setMedewerkers(data.medewerkers || []);
    } catch {
      // non-critical
    }
  };

  const markeerGelezen = async (id: string) => {
    try {
      await fetch(`/api/admin/berichten/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ gelezen: true }),
      });
      setBerichten((prev) =>
        prev.map((b) => (b.id === id ? { ...b, gelezen: true } : b))
      );
    } catch {
      // silent
    }
  };

  const openBericht = (bericht: Bericht) => {
    setSelectedBericht(bericht);
    if (!bericht.gelezen && bericht.aan_type === "admin") {
      markeerGelezen(bericht.id);
    }
  };

  const verstuurBericht = async () => {
    if (!nieuwForm.aan_id || !nieuwForm.inhoud.trim()) {
      toast.error("Selecteer een medewerker en vul een bericht in");
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/berichten", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(nieuwForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Bericht verzonden");
      setShowNieuw(false);
      setNieuwForm({ aan_id: "", onderwerp: "", inhoud: "" });
      fetchBerichten();
    } catch {
      toast.error("Kon bericht niet versturen");
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const getMedewerkerNaam = (id: string) =>
    medewerkers.find((m) => m.id === id)?.naam || id;

  // Group berichten by medewerker (conversation view)
  const gesprekken = berichten.reduce<Record<string, Bericht[]>>((acc, b) => {
    const key = b.van_type === "medewerker" ? b.van_id : b.aan_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const gesprekLijst = Object.entries(gesprekken)
    .map(([medewerkerId, msgs]) => ({
      medewerkerId,
      naam: getMedewerkerNaam(medewerkerId),
      laatste: msgs[0],
      ongelezen: msgs.filter((m) => m.aan_type === "admin" && !m.gelezen).length,
      berichten: msgs,
    }))
    .sort((a, b) => new Date(b.laatste.created_at).getTime() - new Date(a.laatste.created_at).getTime());

  const filteredGesprekken = zoekterm
    ? gesprekLijst.filter((g) => g.naam.toLowerCase().includes(zoekterm.toLowerCase()))
    : gesprekLijst;

  const totalOngelezen = gesprekLijst.reduce((sum, g) => sum + g.ongelezen, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Conversation detail
  if (selectedBericht) {
    const gesprek = gesprekken[selectedBericht.van_type === "medewerker" ? selectedBericht.van_id : selectedBericht.aan_id] || [];
    const medewerkerId = selectedBericht.van_type === "medewerker" ? selectedBericht.van_id : selectedBericht.aan_id;

    return (
      <div>
        <button
          onClick={() => setSelectedBericht(null)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug
        </button>
        <h3 className="text-lg font-bold text-neutral-900 mb-4">
          Gesprek met {getMedewerkerNaam(medewerkerId)}
        </h3>
        <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto">
          {[...gesprek].reverse().map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl p-4 max-w-[80%] ${
                b.van_type === "admin"
                  ? "bg-[#F27501] text-white ml-auto"
                  : "bg-white border border-neutral-200"
              }`}
            >
              {b.onderwerp && (
                <p className={`text-xs font-semibold mb-1 ${b.van_type === "admin" ? "text-orange-100" : "text-neutral-400"}`}>
                  {b.onderwerp}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{b.inhoud}</p>
              <p className={`text-xs mt-2 ${b.van_type === "admin" ? "text-orange-200" : "text-neutral-400"}`}>
                {formatDate(b.created_at)}
              </p>
            </div>
          ))}
        </div>

        {/* Quick reply */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200">
          <textarea
            value={nieuwForm.inhoud}
            onChange={(e) => setNieuwForm({ ...nieuwForm, aan_id: medewerkerId, inhoud: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
            placeholder="Typ een antwoord..."
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={verstuurBericht}
              disabled={isSending || !nieuwForm.inhoud.trim()}
              className="px-4 py-2 bg-[#F27501] hover:bg-[#d96800] text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {isSending ? "Verzenden..." : "Verstuur"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // New message form
  if (showNieuw) {
    return (
      <div>
        <button
          onClick={() => setShowNieuw(false)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Annuleren
        </button>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Nieuw bericht</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Medewerker</label>
              <select
                value={nieuwForm.aan_id}
                onChange={(e) => setNieuwForm({ ...nieuwForm, aan_id: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-[#F27501]"
              >
                <option value="">Selecteer medewerker...</option>
                {medewerkers.map((m) => (
                  <option key={m.id} value={m.id}>{m.naam} ({m.email})</option>
                ))}
              </select>
            </div>
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Template</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                      className="px-3 py-1 text-xs border border-neutral-200 rounded-lg hover:bg-neutral-50">{t.naam}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Onderwerp (optioneel)</label>
              <input
                type="text"
                value={nieuwForm.onderwerp}
                onChange={(e) => setNieuwForm({ ...nieuwForm, onderwerp: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-[#F27501]"
                placeholder="Onderwerp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Bericht</label>
              <textarea
                value={nieuwForm.inhoud}
                onChange={(e) => setNieuwForm({ ...nieuwForm, inhoud: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-[#F27501] resize-none"
                placeholder="Typ je bericht..."
              />
            </div>
            <button
              onClick={verstuurBericht}
              disabled={isSending}
              className="px-6 py-3 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {isSending ? "Verzenden..." : "Verstuur bericht"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bulk bericht view
  if (showBulk) {
    const functieOptions = [...new Set(medewerkers.flatMap(m => m.functie || []))];
    const targetCount = bulkFilter === "alle"
      ? medewerkers.length
      : bulkFilter === "functie"
        ? medewerkers.filter(m => m.functie?.includes(bulkFunctie)).length
        : bulkSelected.size;

    return (
      <div>
        <button onClick={() => setShowBulk(false)} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Terug
        </button>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Bulk bericht</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ontvangers</label>
              <div className="flex gap-2 mb-2">
                {(["alle", "functie"] as const).map(f => (
                  <button key={f} type="button" onClick={() => setBulkFilter(f)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${bulkFilter === f ? "bg-[#F27501] text-white border-[#F27501]" : "border-neutral-200 hover:bg-neutral-50"}`}>
                    {f === "alle" ? "Alle medewerkers" : "Per functie"}
                  </button>
                ))}
              </div>
              {bulkFilter === "functie" && (
                <select value={bulkFunctie} onChange={e => setBulkFunctie(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm">
                  <option value="">Selecteer functie...</option>
                  {functieOptions.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
              <p className="text-xs text-neutral-500 mt-1">{targetCount} ontvangers</p>
            </div>
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Template gebruiken</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                      className="px-3 py-1 text-xs border border-neutral-200 rounded-lg hover:bg-neutral-50">{t.naam}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Onderwerp</label>
              <input type="text" value={nieuwForm.onderwerp} onChange={e => setNieuwForm({ ...nieuwForm, onderwerp: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl text-sm" placeholder="Onderwerp" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bericht</label>
              <textarea value={nieuwForm.inhoud} onChange={e => setNieuwForm({ ...nieuwForm, inhoud: e.target.value })}
                rows={6} className="w-full px-4 py-3 border rounded-xl text-sm resize-none" placeholder="Typ je bericht..." />
            </div>
            <div className="flex gap-2">
              <button onClick={bulkVerstuur} disabled={isSending || targetCount === 0}
                className="px-6 py-3 bg-[#F27501] text-white font-semibold rounded-xl disabled:opacity-50">
                {isSending ? "Verzenden..." : `Verstuur naar ${targetCount} medewerkers`}
              </button>
              <button onClick={() => { setShowTemplateForm(true); setTemplateForm({ naam: "", onderwerp: nieuwForm.onderwerp, inhoud: nieuwForm.inhoud, categorie: "algemeen" }); }}
                className="px-4 py-3 border border-neutral-200 text-sm rounded-xl hover:bg-neutral-50">
                Opslaan als template
              </button>
            </div>
          </div>
        </div>

        {/* Template opslaan modal */}
        {showTemplateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Template opslaan</h3>
              <div className="space-y-3">
                <input type="text" value={templateForm.naam} onChange={e => setTemplateForm({ ...templateForm, naam: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="Template naam" />
                <select value={templateForm.categorie} onChange={e => setTemplateForm({ ...templateForm, categorie: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm">
                  <option value="algemeen">Algemeen</option>
                  <option value="shifts">Shifts</option>
                  <option value="administratie">Administratie</option>
                  <option value="welkom">Welkom</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowTemplateForm(false)} className="flex-1 py-2 border rounded-xl text-sm">Annuleren</button>
                <button onClick={saveTemplate} className="flex-1 py-2 bg-[#F27501] text-white rounded-xl text-sm font-medium">Opslaan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Gesprekken lijst
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-neutral-900">Berichten</h2>
          {totalOngelezen > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{totalOngelezen}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="px-4 py-2 border border-[#F27501] text-[#F27501] text-sm font-semibold rounded-xl hover:bg-[#F27501]/5"
          >
            Bulk bericht
          </button>
          <button
            onClick={() => setShowNieuw(true)}
            className="px-4 py-2 bg-[#F27501] hover:bg-[#d96800] text-white text-sm font-semibold rounded-xl"
          >
            Nieuw bericht
          </button>
        </div>
      </div>

      {/* Zoeken */}
      <div className="mb-4">
        <input
          type="text"
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
          placeholder="Zoek medewerker..."
          className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-[#F27501]"
        />
      </div>

      {filteredGesprekken.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-neutral-500">Geen gesprekken gevonden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGesprekken.map((gesprek) => (
            <button
              key={gesprek.medewerkerId}
              onClick={() => openBericht(gesprek.laatste)}
              className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-shadow hover:shadow-md ${
                gesprek.ongelezen > 0 ? "border-[#F27501]/30" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F27501]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#F27501]">
                    {gesprek.naam.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm truncate ${gesprek.ongelezen > 0 ? "font-bold text-neutral-900" : "font-medium text-neutral-700"}`}>
                      {gesprek.naam}
                    </p>
                    <span className="text-xs text-neutral-400 ml-2 flex-shrink-0">
                      {formatDate(gesprek.laatste.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 truncate">
                    {gesprek.laatste.van_type === "admin" ? "Jij: " : ""}
                    {gesprek.laatste.inhoud}
                  </p>
                </div>
                {gesprek.ongelezen > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {gesprek.ongelezen}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
