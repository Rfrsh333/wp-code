"use client";

import { useEffect, useState } from "react";
import { X, Phone, Globe, MapPin, Star, ExternalLink, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge, OutreachBadge, ChannelBadge, InstantlyBadge } from "./StatusBadge";
import QuickActions from "./QuickActions";
import ContactTimeline from "./ContactTimeline";
import { CALL_SCRIPT, DM_TEMPLATE } from "./constants";
import type { CRMLead, CRMContactLog } from "./types";

interface LeadDetailPanelProps {
  lead: CRMLead;
  onClose: () => void;
  onUpdate: (lead: CRMLead) => void;
}

export default function LeadDetailPanel({ lead, onClose, onUpdate }: LeadDetailPanelProps) {
  const [logs, setLogs] = useState<CRMContactLog[]>([]);
  const [showScript, setShowScript] = useState(false);
  const [showDMTemplate, setShowDMTemplate] = useState(false);
  const [noteText, setNoteText] = useState("");
  const toast = useToast();

  useEffect(() => {
    fetchLogs();
  }, [lead.id]);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function fetchLogs() {
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/contact-logs?lead_id=${lead.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLogs(await res.json());
  }

  async function handleQuickAction(action: string, updates: Record<string, unknown>, logType: string, logNotes?: string) {
    const token = await getToken();

    // Update lead
    const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      toast.error("Actie mislukt");
      return;
    }

    const updatedLead = await res.json();

    // Create contact log
    await fetch("/api/admin/crm/contact-logs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, type: logType, notes: logNotes || null }),
    });

    // Create followup if next_followup_at was set
    if (updates.next_followup_at) {
      await fetch("/api/admin/crm/followups", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, scheduled_at: updates.next_followup_at, type: "bellen" }),
      });
    }

    onUpdate({ ...lead, ...updatedLead });
    fetchLogs();
    toast.success(`${action} geregistreerd`);
  }

  async function addNote() {
    if (!noteText.trim()) return;
    const token = await getToken();
    await fetch("/api/admin/crm/notes", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, content: noteText }),
    });
    // Also log as contact log
    await fetch("/api/admin/crm/contact-logs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, type: "notitie", notes: noteText }),
    });
    setNoteText("");
    fetchLogs();
    toast.success("Notitie opgeslagen");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Gekopieerd");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{lead.company_name}</h2>
              <p className="text-sm text-neutral-500">{lead.city} {lead.address && `• ${lead.address}`}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatusBadge status={lead.status} />
            <OutreachBadge status={lead.outreach_status} />
            <ChannelBadge channel={lead.next_best_channel} />
            {lead.instantly_email_status && lead.instantly_email_status !== "not_sent" && (
              <InstantlyBadge status={lead.instantly_email_status} />
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">{lead.phone}</span>
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors">
                <Globe className="w-4 h-4" />
                <span className="text-sm truncate">{lead.website.replace(/https?:\/\//, "")}</span>
              </a>
            )}
            {lead.google_maps_url && (
              <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {lead.rating && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-sm font-medium">{lead.rating} ({lead.review_count} reviews)</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">Acties</h3>
            <QuickActions lead={lead} onAction={handleQuickAction} />
          </div>

          {/* Call Script */}
          <div>
            <button
              onClick={() => setShowScript(!showScript)}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 mb-2"
            >
              {showScript ? "Verberg" : "Toon"} belscript
            </button>
            {showScript && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-600 uppercase">Opening</span>
                    <button onClick={() => copyToClipboard(CALL_SCRIPT.opening)} className="text-xs text-blue-500 hover:text-blue-700">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-blue-900 whitespace-pre-line">{CALL_SCRIPT.opening}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-600 uppercase">Bij interesse</span>
                    <button onClick={() => copyToClipboard(CALL_SCRIPT.interest)} className="text-xs text-blue-500 hover:text-blue-700">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-blue-900 whitespace-pre-line">{CALL_SCRIPT.interest}</p>
                </div>
              </div>
            )}
          </div>

          {/* DM Template */}
          {(lead.instagram_available || lead.facebook_available) && (
            <div>
              <button
                onClick={() => setShowDMTemplate(!showDMTemplate)}
                className="text-sm font-semibold text-pink-700 hover:text-pink-800 mb-2"
              >
                {showDMTemplate ? "Verberg" : "Toon"} DM template
              </button>
              {showDMTemplate && (
                <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-pink-600 uppercase">Template</span>
                    <button onClick={() => copyToClipboard(DM_TEMPLATE)} className="text-xs text-pink-500 hover:text-pink-700">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-pink-900 whitespace-pre-line">{DM_TEMPLATE}</p>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.call_count}</p>
              <p className="text-xs text-neutral-500">Calls</p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.email_count}</p>
              <p className="text-xs text-neutral-500">Emails</p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.instagram_dm_count}</p>
              <p className="text-xs text-neutral-500">IG DMs</p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.facebook_dm_count}</p>
              <p className="text-xs text-neutral-500">FB</p>
            </div>
          </div>

          {/* Instantly info */}
          {lead.instantly_campaign_name && (
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-cyan-600 uppercase mb-1">Instantly Campagne</p>
              <p className="text-sm text-cyan-900">{lead.instantly_campaign_name}</p>
              {lead.instantly_email_status && <InstantlyBadge status={lead.instantly_email_status} />}
            </div>
          )}

          {/* Add Note */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">Notitie toevoegen</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addNote()}
                placeholder="Schrijf een notitie..."
                className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button onClick={addNote} disabled={!noteText.trim()} className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50">
                Opslaan
              </button>
            </div>
          </div>

          {/* Contact Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Contactgeschiedenis</h3>
            <ContactTimeline logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
