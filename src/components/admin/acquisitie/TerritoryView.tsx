"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface SalesRep {
  id: string;
  naam: string;
  email: string | null;
  telefoon: string | null;
  regios: string[];
  branches: string[];
  max_leads: number;
  actieve_leads_count: number;
  gewonnen_leads_count: number;
  conversie_rate: number;
  actief: boolean;
  kleur: string;
}

interface Lead {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  adres: string | null;
  stad: string | null;
  telefoon: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  branche?: string | null;
  volgende_actie_datum?: string | null;
}

type Mode = "reps" | "assign" | "route";

interface Props {
  onSelectLead?: (id: string) => void;
}

export default function TerritoryView({ onSelectLead }: Props) {
  const [mode, setMode] = useState<Mode>("reps");
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [unassigned, setUnassigned] = useState<Lead[]>([]);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [repLeads, setRepLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editRep, setEditRep] = useState<SalesRep | null>(null);
  const [formNaam, setFormNaam] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefoon, setFormTelefoon] = useState("");
  const [formRegios, setFormRegios] = useState("");
  const [formBranches, setFormBranches] = useState("");
  const [formMax, setFormMax] = useState("50");
  const [formKleur, setFormKleur] = useState("#F27501");

  // Route state
  const [routeLeads, setRouteLeads] = useState<Lead[]>([]);
  const [routeUrl, setRouteUrl] = useState<string | null>(null);
  const [selectedForRoute, setSelectedForRoute] = useState<Set<string>>(new Set());

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchReps = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/territory?view=reps", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setReps(data.data || []);
    }
    setLoading(false);
  }, [getToken]);

  const fetchUnassigned = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/territory?view=unassigned", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUnassigned(data.data || []);
    }
  }, [getToken]);

  const fetchRepLeads = async (repId: string) => {
    setSelectedRep(repId);
    const token = await getToken();
    const res = await fetch(`/api/admin/acquisitie/territory?view=rep_leads&rep_id=${repId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRepLeads(data.data || []);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchReps();
    fetchUnassigned();
  }, [fetchReps, fetchUnassigned]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const apiPost = async (body: Record<string, unknown>) => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/territory", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res;
  };

  const saveRep = async () => {
    const data = {
      action: editRep ? "update_rep" : "create_rep",
      id: editRep?.id,
      naam: formNaam,
      email: formEmail || null,
      telefoon: formTelefoon || null,
      regios: formRegios.split(",").map((s) => s.trim()).filter(Boolean),
      branches: formBranches.split(",").map((s) => s.trim()).filter(Boolean),
      max_leads: parseInt(formMax) || 50,
      kleur: formKleur,
    };
    const res = await apiPost(data);
    if (res.ok) {
      setMessage({ type: "success", text: editRep ? "Rep bijgewerkt" : "Rep aangemaakt" });
      setShowForm(false);
      resetForm();
      fetchReps();
    } else {
      setMessage({ type: "error", text: "Opslaan mislukt" });
    }
  };

  const deleteRep = async (id: string) => {
    if (!confirm("Sales rep verwijderen? Alle leads worden ontkoppeld.")) return;
    await apiPost({ action: "delete_rep", id });
    fetchReps();
  };

  const autoAssign = async () => {
    setMessage(null);
    const res = await apiPost({ action: "auto_assign" });
    if (res.ok) {
      const data = await res.json();
      setMessage({ type: "success", text: `${data.assigned} van ${data.total} leads toegewezen` });
      fetchReps();
      fetchUnassigned();
    }
  };

  const assignLead = async (leadId: string, repId: string | null) => {
    await apiPost({ action: "assign", lead_id: leadId, rep_id: repId });
    fetchUnassigned();
    if (selectedRep) fetchRepLeads(selectedRep);
    fetchReps();
  };

  const optimizeRoute = async () => {
    const ids = Array.from(selectedForRoute);
    if (ids.length < 2) {
      setMessage({ type: "error", text: "Selecteer minimaal 2 leads voor een route" });
      return;
    }
    const res = await apiPost({ action: "optimize_route", lead_ids: ids });
    if (res.ok) {
      const data = await res.json();
      setRouteLeads(data.data || []);
      setRouteUrl(data.maps_url);
      if (!data.optimized && data.message) {
        setMessage({ type: "success", text: data.message });
      }
    }
  };

  const openEditForm = (rep: SalesRep) => {
    setEditRep(rep);
    setFormNaam(rep.naam);
    setFormEmail(rep.email || "");
    setFormTelefoon(rep.telefoon || "");
    setFormRegios(rep.regios.join(", "));
    setFormBranches(rep.branches.join(", "));
    setFormMax(String(rep.max_leads));
    setFormKleur(rep.kleur || "#F27501");
    setShowForm(true);
  };

  const resetForm = () => {
    setEditRep(null);
    setFormNaam("");
    setFormEmail("");
    setFormTelefoon("");
    setFormRegios("");
    setFormBranches("");
    setFormMax("50");
    setFormKleur("#F27501");
  };

  const toggleRouteSelection = (id: string) => {
    setSelectedForRoute((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-1/3 mb-4" />
            <div className="h-20 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex items-center gap-3">
        {(["reps", "assign", "route"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === m ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {m === "reps" ? "Sales Reps" : m === "assign" ? "Toewijzen" : "Route Planner"}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Sales Reps beheer */}
      {mode === "reps" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">Sales Team</h3>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-[#F27501] text-white rounded-xl text-sm hover:bg-[#d96800]">
              + Nieuwe rep
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 mb-4 space-y-3">
              <h4 className="font-medium">{editRep ? "Rep bewerken" : "Nieuwe sales rep"}</h4>
              <div className="grid grid-cols-2 gap-3">
                <input value={formNaam} onChange={(e) => setFormNaam(e.target.value)} placeholder="Naam *" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={formTelefoon} onChange={(e) => setFormTelefoon(e.target.value)} placeholder="Telefoon" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={formMax} onChange={(e) => setFormMax(e.target.value)} placeholder="Max leads" type="number" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={formRegios} onChange={(e) => setFormRegios(e.target.value)} placeholder="Regio's (komma-gescheiden): Utrecht, Amsterdam" className="px-3 py-2 border rounded-lg text-sm col-span-2" />
                <input value={formBranches} onChange={(e) => setFormBranches(e.target.value)} placeholder="Branches: restaurant, hotel, cafe" className="px-3 py-2 border rounded-lg text-sm col-span-2" />
                <div className="flex items-center gap-2">
                  <input type="color" value={formKleur} onChange={(e) => setFormKleur(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <span className="text-xs text-neutral-500">Kleur</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveRep} className="px-4 py-2 bg-[#F27501] text-white rounded-lg text-sm">Opslaan</button>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 bg-neutral-200 text-neutral-600 rounded-lg text-sm">Annuleren</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reps.map((rep) => (
              <div key={rep.id} className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100" style={{ borderLeftColor: rep.kleur, borderLeftWidth: 4 }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-neutral-900">{rep.naam}</h4>
                    <p className="text-xs text-neutral-500">{rep.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditForm(rep)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteRep(rep.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-neutral-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-neutral-900">{rep.actieve_leads_count}</p>
                    <p className="text-[10px] text-neutral-500">Actief</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-700">{rep.gewonnen_leads_count}</p>
                    <p className="text-[10px] text-neutral-500">Gewonnen</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-700">{rep.conversie_rate}%</p>
                    <p className="text-[10px] text-neutral-500">Conversie</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Capaciteit: {rep.actieve_leads_count}/{rep.max_leads}</span>
                  <div className="flex-1 mx-2 bg-neutral-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${rep.actieve_leads_count >= rep.max_leads ? "bg-red-500" : "bg-[#F27501]"}`}
                      style={{ width: `${Math.min((rep.actieve_leads_count / rep.max_leads) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {rep.regios.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rep.regios.map((r, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{r}</span>
                    ))}
                    {rep.branches.map((b, i) => (
                      <span key={`b${i}`} className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">{b}</span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => { setMode("assign"); fetchRepLeads(rep.id); }}
                  className="mt-3 w-full text-xs py-1.5 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200"
                >
                  Bekijk leads →
                </button>
              </div>
            ))}

            {reps.length === 0 && (
              <div className="col-span-full text-center py-12 text-neutral-400">
                Nog geen sales reps. Maak er een aan om te beginnen.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toewijzen */}
      {mode === "assign" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ongeassignde leads */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-neutral-900">Ongeassignd ({unassigned.length})</h4>
              <button onClick={autoAssign} className="text-xs px-3 py-1.5 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800]">
                Auto-verdeel
              </button>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {unassigned.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate cursor-pointer hover:text-[#F27501]" onClick={() => onSelectLead?.(lead.id)}>{lead.bedrijfsnaam}</p>
                    <p className="text-xs text-neutral-500">{lead.stad} • {lead.branche} • Score: {lead.ai_score || "-"}</p>
                  </div>
                  <select
                    onChange={(e) => { if (e.target.value) assignLead(lead.id, e.target.value); }}
                    className="text-xs px-2 py-1 border rounded-lg ml-2 flex-shrink-0"
                    defaultValue=""
                  >
                    <option value="" disabled>Wijs toe →</option>
                    {reps.filter((r) => r.actief).map((r) => (
                      <option key={r.id} value={r.id}>{r.naam} ({r.actieve_leads_count}/{r.max_leads})</option>
                    ))}
                  </select>
                </div>
              ))}
              {unassigned.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">Alle leads zijn toegewezen</p>
              )}
            </div>
          </div>

          {/* Rep leads */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
            <div className="flex items-center gap-2 mb-4">
              <h4 className="font-semibold text-neutral-900">Leads van</h4>
              <select
                value={selectedRep || ""}
                onChange={(e) => { if (e.target.value) fetchRepLeads(e.target.value); }}
                className="text-sm px-2 py-1 border rounded-lg"
              >
                <option value="" disabled>Selecteer rep</option>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>{r.naam} ({r.actieve_leads_count})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {repLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate cursor-pointer hover:text-[#F27501]" onClick={() => onSelectLead?.(lead.id)}>{lead.bedrijfsnaam}</p>
                    <p className="text-xs text-neutral-500">{lead.stad} • {lead.pipeline_stage} • Score: {lead.ai_score || "-"}</p>
                  </div>
                  <button
                    onClick={() => assignLead(lead.id, null)}
                    className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                  >
                    Ontkoppel
                  </button>
                </div>
              ))}
              {selectedRep && repLeads.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">Geen actieve leads</p>
              )}
              {!selectedRep && (
                <p className="text-sm text-neutral-400 text-center py-4">Selecteer een sales rep</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route Planner */}
      {mode === "route" && (
        <div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-neutral-900">Route Planner</h4>
                <p className="text-xs text-neutral-500">Selecteer leads voor een bezoekroute, wij optimaliseren de volgorde</p>
              </div>
              <div className="flex gap-2">
                <select
                  onChange={(e) => { if (e.target.value) fetchRepLeads(e.target.value); setSelectedRep(e.target.value); }}
                  className="text-sm px-2 py-1 border rounded-lg"
                  defaultValue=""
                >
                  <option value="" disabled>Filter op rep</option>
                  {reps.map((r) => <option key={r.id} value={r.id}>{r.naam}</option>)}
                </select>
                <button
                  onClick={optimizeRoute}
                  disabled={selectedForRoute.size < 2}
                  className="px-4 py-2 bg-[#F27501] text-white rounded-xl text-sm hover:bg-[#d96800] disabled:opacity-50"
                >
                  Optimaliseer route ({selectedForRoute.size})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {(selectedRep ? repLeads : unassigned).map((lead) => (
                <label
                  key={lead.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedForRoute.has(lead.id) ? "bg-orange-50 border border-orange-200" : "bg-neutral-50 hover:bg-neutral-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedForRoute.has(lead.id)}
                    onChange={() => toggleRouteSelection(lead.id)}
                    className="accent-[#F27501]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate cursor-pointer hover:text-[#F27501]" onClick={() => onSelectLead?.(lead.id)}>{lead.bedrijfsnaam}</p>
                    <p className="text-xs text-neutral-500 truncate">{lead.adres}, {lead.stad}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Route resultaat */}
          {routeLeads.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-neutral-900">Geoptimaliseerde Route</h4>
                {routeUrl && (
                  <a
                    href={routeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Open in Google Maps
                  </a>
                )}
              </div>
              <div className="space-y-3">
                {routeLeads.map((lead, i) => (
                  <div key={lead.id} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#F27501] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 cursor-pointer hover:text-[#F27501]" onClick={() => onSelectLead?.(lead.id)}>{lead.bedrijfsnaam}</p>
                      <p className="text-xs text-neutral-500">{lead.adres}, {lead.stad}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {lead.contactpersoon && <p className="text-xs text-neutral-600">{lead.contactpersoon}</p>}
                      {lead.telefoon && (
                        <a href={`tel:${lead.telefoon}`} className="text-xs text-blue-600 hover:underline">{lead.telefoon}</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
