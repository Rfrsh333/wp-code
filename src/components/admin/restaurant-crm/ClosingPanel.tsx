"use client";

import { useEffect, useState } from "react";
import { User, Briefcase, Phone, AlertTriangle, Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { PERSONEELSBEHOEFTE_OPTIONS, TYPE_BEHOEFTE_OPTIONS, URGENTIE_CONFIG } from "./constants";
import type { CRMLead, CRMObjection } from "./types";

interface ClosingPanelProps {
  lead: CRMLead;
  onUpdate: (lead: CRMLead) => void;
}

export default function ClosingPanel({ lead, onUpdate }: ClosingPanelProps) {
  const [objections, setObjections] = useState<CRMObjection[]>([]);
  const [newObjection, setNewObjection] = useState("");
  const [showObjectionSuggestions, setShowObjectionSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchObjections();
  }, []);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function fetchObjections() {
    const token = await getToken();
    const res = await fetch("/api/admin/crm/objections", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setObjections(await res.json());
  }

  async function updateField(updates: Partial<CRMLead>) {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate({ ...lead, ...updated });
      }
    } catch {
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  function addBezwaar() {
    if (!newObjection.trim()) return;
    const current = lead.bezwaren || [];
    updateField({ bezwaren: [...current, newObjection.trim()] } as Partial<CRMLead>);
    setNewObjection("");
  }

  function removeBezwaar(index: number) {
    const current = lead.bezwaren || [];
    updateField({ bezwaren: current.filter((_, i) => i !== index) } as Partial<CRMLead>);
  }

  function toggleBehoefte(item: string) {
    const current = lead.personeelsbehoefte || [];
    const updated = current.includes(item)
      ? current.filter(b => b !== item)
      : [...current, item];
    updateField({ personeelsbehoefte: updated } as Partial<CRMLead>);
  }

  return (
    <div className="space-y-5">
      {/* Beslisser info */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          Beslisser
        </h4>
        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            placeholder="Naam beslisser"
            defaultValue={lead.beslisser || ""}
            onBlur={e => e.target.value !== (lead.beslisser || "") && updateField({ beslisser: e.target.value || null } as Partial<CRMLead>)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm w-full"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Functie"
              defaultValue={lead.beslisser_functie || ""}
              onBlur={e => e.target.value !== (lead.beslisser_functie || "") && updateField({ beslisser_functie: e.target.value || null } as Partial<CRMLead>)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Mobiel"
              defaultValue={lead.beslisser_mobiel || ""}
              onBlur={e => e.target.value !== (lead.beslisser_mobiel || "") && updateField({ beslisser_mobiel: e.target.value || null } as Partial<CRMLead>)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Behoefte assessment */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          Behoefte
        </h4>
        <div className="space-y-3">
          {/* Personeelsbehoefte checkboxes */}
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">Type personeel nodig:</p>
            <div className="flex flex-wrap gap-1.5">
              {PERSONEELSBEHOEFTE_OPTIONS.map(option => (
                <button
                  key={option}
                  onClick={() => toggleBehoefte(option)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    (lead.personeelsbehoefte || []).includes(option)
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Urgentie */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Urgentie:</p>
              <select
                value={lead.urgentie || ""}
                onChange={e => updateField({ urgentie: e.target.value || null } as Partial<CRMLead>)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecteer...</option>
                {Object.entries(URGENTIE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Type behoefte:</p>
              <select
                value={lead.type_behoefte || ""}
                onChange={e => updateField({ type_behoefte: e.target.value || null } as Partial<CRMLead>)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecteer...</option>
                {TYPE_BEHOEFTE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Startdatum en aantal */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Gewenste startdatum:</p>
              <input
                type="date"
                value={lead.gewenste_startdatum || ""}
                onChange={e => updateField({ gewenste_startdatum: e.target.value || null } as Partial<CRMLead>)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Aantal mensen:</p>
              <input
                type="number"
                min="1"
                value={lead.aantal_mensen || ""}
                onChange={e => updateField({ aantal_mensen: e.target.value ? parseInt(e.target.value) : null } as Partial<CRMLead>)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bezwaren tracker */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Bezwaren
        </h4>
        {(lead.bezwaren || []).length > 0 && (
          <div className="space-y-1.5 mb-2">
            {(lead.bezwaren || []).map((bezwaar, i) => {
              const suggestion = objections.find(o => o.objection === bezwaar);
              return (
                <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-red-800">{bezwaar}</span>
                    <button onClick={() => removeBezwaar(i)} className="text-red-400 hover:text-red-600 text-xs ml-2">x</button>
                  </div>
                  {suggestion && (
                    <p className="text-xs text-red-600 mt-1 italic">Tip: {suggestion.suggested_response}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newObjection}
              onChange={e => setNewObjection(e.target.value)}
              onFocus={() => setShowObjectionSuggestions(true)}
              onKeyDown={e => e.key === "Enter" && addBezwaar()}
              placeholder="Bezwaar toevoegen..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
            {showObjectionSuggestions && objections.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {objections.map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      setNewObjection(obj.objection);
                      setShowObjectionSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 border-b border-neutral-50 last:border-0"
                  >
                    {obj.objection}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={addBezwaar} disabled={!newObjection.trim()} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {showObjectionSuggestions && (
          <div className="fixed inset-0 z-[5]" onClick={() => setShowObjectionSuggestions(false)} />
        )}
      </div>

      {/* Afspraak details */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          Afspraak
        </h4>
        <div className="space-y-2">
          <input
            type="datetime-local"
            value={lead.afspraak_datum ? new Date(lead.afspraak_datum).toISOString().slice(0, 16) : ""}
            onChange={e => updateField({ afspraak_datum: e.target.value ? new Date(e.target.value).toISOString() : null } as Partial<CRMLead>)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Afspraak notities..."
            defaultValue={lead.afspraak_notities || ""}
            onBlur={e => e.target.value !== (lead.afspraak_notities || "") && updateField({ afspraak_notities: e.target.value || null } as Partial<CRMLead>)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm min-h-[60px]"
          />
        </div>
      </div>

      {/* Quick status buttons */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-neutral-100">
        <button
          onClick={() => updateField({ status: "afspraak_gepland", outreach_status: "interested" } as Partial<CRMLead>)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"
        >
          Afspraak gepland
        </button>
        <button
          onClick={() => updateField({ status: "testdienst_ingepland", outreach_status: "interested" } as Partial<CRMLead>)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100"
        >
          Testdienst inplannen
        </button>
        <button
          onClick={() => updateField({ status: "klant_geworden", outreach_status: "converted", next_best_channel: "none" } as Partial<CRMLead>)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        >
          Klant gewonnen
        </button>
        <button
          onClick={() => updateField({ status: "verloren", outreach_status: "not_interested", next_best_channel: "none" } as Partial<CRMLead>)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
        >
          Verloren
        </button>
      </div>

      {saving && <p className="text-xs text-neutral-400 text-center">Opslaan...</p>}
    </div>
  );
}
