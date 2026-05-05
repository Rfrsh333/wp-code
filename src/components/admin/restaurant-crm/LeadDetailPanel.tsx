"use client";

import { useEffect, useState } from "react";
import { X, Phone, Globe, MapPin, Star, ExternalLink, Instagram, Facebook, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge, OutreachBadge, ChannelBadge, InstantlyBadge } from "./StatusBadge";
import NextActionBadge from "./NextActionBadge";
import QuickActions from "./QuickActions";
import ContactTimeline from "./ContactTimeline";
import DMTemplatePanel from "./DMTemplatePanel";
import SalesScriptPanel from "./SalesScriptPanel";
import ClosingPanel from "./ClosingPanel";
import TestShiftPanel from "./TestShiftPanel";
import { calculateNextBestChannel } from "./outreach-helpers";
import DuplicatesView from "./DuplicatesView";
import type { CRMLead, CRMContactLog, CRMLeadCampaign, CRMLeadList } from "./types";

interface LeadDetailPanelProps {
  lead: CRMLead;
  onClose: () => void;
  onUpdate: (lead: CRMLead) => void;
}

type AccordionSection = "actions" | "script" | "dm" | "closing" | "testshifts" | "campaigns" | "leadlists" | "duplicates" | "timeline" | "notes";

export default function LeadDetailPanel({ lead, onClose, onUpdate }: LeadDetailPanelProps) {
  const [logs, setLogs] = useState<CRMContactLog[]>([]);
  const [noteText, setNoteText] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [showFollowup, setShowFollowup] = useState(false);
  const [openSections, setOpenSections] = useState<Set<AccordionSection>>(new Set(["actions", "script"]));
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [leadCampaigns, setLeadCampaigns] = useState<CRMLeadCampaign[]>([]);
  const [leadList, setLeadList] = useState<CRMLeadList | null>(null);
  const toast = useToast();

  function toggleSection(s: AccordionSection) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

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

  async function fetchCampaigns() {
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/leads/${lead.id}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLeadCampaigns(await res.json());
  }

  async function fetchLeadList() {
    if (!lead.lead_list_id) { setLeadList(null); return; }
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/lead-lists/${lead.lead_list_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLeadList(await res.json());
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(); fetchCampaigns(); fetchLeadList(); }, [lead.id]);

  async function handleQuickAction(action: string, updates: Record<string, unknown>, logType: string, logNotes?: string) {
    const token = await getToken();

    // Capture previous state for undo
    const previousState: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (key in lead) {
        previousState[key] = (lead as unknown as Record<string, unknown>)[key];
      }
    }

    const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) { toast.error("Actie mislukt"); return; }
    const updatedLead = await res.json();

    // Create contact log with snapshot for undo
    const logRes = await fetch("/api/admin/crm/contact-logs/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: lead.id,
        type: logType,
        notes: logNotes || null,
        action_key: `${logType}_${Date.now()}`,
        previous_state: previousState,
        new_state: updates,
      }),
    });

    if (updates.next_followup_at) {
      await fetch("/api/admin/crm/followups/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, scheduled_at: updates.next_followup_at, type: "bellen" }),
      });
    }

    onUpdate({ ...lead, ...updatedLead });
    fetchLogs();

    // Toast with undo option
    let logId: string | null = null;
    if (logRes.ok) {
      const logData = await logRes.json();
      logId = logData.id;
    }

    if (logId) {
      toast.success(`Actie geregistreerd`, {
        action: async () => {
          const t = await getToken();
          const revertRes = await fetch(`/api/admin/crm/contact-logs/${logId}/revert`, {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
          });
          if (revertRes.ok) {
            const revertedLead = await revertRes.json();
            onUpdate({ ...lead, ...revertedLead });
            fetchLogs();
            toast.success("Actie teruggedraaid");
          } else {
            toast.error("Terugdraaien mislukt");
          }
        },
        actionLabel: "Ongedaan maken",
      });
    } else {
      toast.success(`Actie geregistreerd`);
    }
  }

  async function handleDMSent(channel: "instagram" | "facebook") {
    const now = new Date().toISOString();
    const isInstagram = channel === "instagram";
    const updates: Record<string, unknown> = {
      status: "dm_gestuurd",
      last_contacted_at: now,
      outreach_status: lead.outreach_status === "not_started" ? "contacted" : lead.outreach_status,
      ...(isInstagram
        ? { last_instagram_dm_at: now, instagram_dm_count: lead.instagram_dm_count + 1 }
        : { last_facebook_dm_at: now, facebook_dm_count: lead.facebook_dm_count + 1 }
      ),
    };
    const updatedLead = { ...lead, ...updates } as CRMLead;
    updates.next_best_channel = calculateNextBestChannel(updatedLead);

    await handleQuickAction(
      isInstagram ? "Instagram DM gestuurd" : "Facebook bericht gestuurd",
      updates,
      isInstagram ? "dm_instagram" : "dm_facebook"
    );
  }

  async function handleReply(newStatus: "in_gesprek" | "gewonnen") {
    const updates: Record<string, unknown> = {
      outreach_status: newStatus === "gewonnen" ? "interested" : "replied",
      status: newStatus === "gewonnen" ? "in_gesprek" : "in_gesprek",
      last_contacted_at: new Date().toISOString(),
      next_best_channel: "phone",
    };
    await handleQuickAction("Reply ontvangen", updates, "notitie", `Reply ontvangen - ${newStatus === "gewonnen" ? "geïnteresseerd" : "in gesprek"}`);
    setShowReplyModal(false);
  }

  async function planFollowup() {
    if (!followupDate) return;
    const token = await getToken();
    await fetch("/api/admin/crm/followups/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, scheduled_at: followupDate, type: "bellen" }),
    });
    await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ next_followup_at: followupDate }),
    });
    onUpdate({ ...lead, next_followup_at: followupDate });
    setFollowupDate("");
    setShowFollowup(false);
    toast.success("Follow-up gepland");
  }

  async function addNote() {
    if (!noteText.trim()) return;
    const token = await getToken();
    await fetch("/api/admin/crm/notes/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, content: noteText }),
    });
    await fetch("/api/admin/crm/contact-logs/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, type: "notitie", notes: noteText }),
    });
    setNoteText("");
    fetchLogs();
    toast.success("Notitie opgeslagen");
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
              <p className="text-sm text-neutral-500">{lead.city}{lead.address ? ` • ${lead.address}` : ""}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Big NextActionBadge */}
          <div className="mt-2 mb-1">
            <NextActionBadge lead={lead} size="lg" />
          </div>
          {lead.instantly_last_reply_text && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Laatste reply</p>
              <p className="text-sm text-amber-900">{lead.instantly_last_reply_text.substring(0, 200)}{lead.instantly_last_reply_text.length > 200 ? "..." : ""}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={lead.status} />
            <OutreachBadge status={lead.outreach_status} />
            <ChannelBadge channel={lead.next_best_channel} />
            {lead.instantly_email_status && lead.instantly_email_status !== "not_sent" && (
              <InstantlyBadge status={lead.instantly_email_status} />
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 1. Contact info + social links */}
          <div className="grid grid-cols-2 gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">{lead.phone}</span>
              </a>
            )}
            {lead.instagram_url && (
              <a href={lead.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl text-pink-700 hover:from-purple-100 hover:to-pink-100 transition-colors">
                <Instagram className="w-4 h-4" />
                <span className="text-sm font-medium truncate">Instagram</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            )}
            {lead.facebook_url && (
              <a href={lead.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl text-indigo-700 hover:bg-indigo-100 transition-colors">
                <Facebook className="w-4 h-4" />
                <span className="text-sm font-medium truncate">Facebook</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors">
                <Globe className="w-4 h-4" />
                <span className="text-sm truncate">{lead.website.replace(/https?:\/\/(www\.)?/, "")}</span>
              </a>
            )}
            {lead.google_maps_url && (
              <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Google Maps</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            )}
            {lead.rating && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-sm font-medium">{lead.rating} ({lead.review_count} reviews)</span>
              </div>
            )}
          </div>

          {/* Source info */}
          {(lead.source_type || lead.lead_list_id) && (
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Bron</p>
              <div className="text-sm text-neutral-700 space-y-0.5">
                {lead.source_type && <p>Type: {lead.source_type}</p>}
                {lead.source_reference_id && <p>Referentie: {lead.source_reference_id}</p>}
              </div>
            </div>
          )}

          {/* 2. Stats bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.call_count}</p>
              <p className="text-[10px] text-neutral-500">Calls</p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.email_count}</p>
              <p className="text-[10px] text-neutral-500">Emails</p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.instagram_dm_count}</p>
              <p className="text-[10px] text-neutral-500">IG DMs</p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-lg font-bold text-neutral-900">{lead.facebook_dm_count}</p>
              <p className="text-[10px] text-neutral-500">FB</p>
            </div>
          </div>

          {/* 3. Quick Actions */}
          <SectionAccordion title="Quick Actions" section="actions" open={openSections.has("actions")} onToggle={toggleSection}>
            <QuickActions lead={lead} onAction={handleQuickAction} />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setShowReplyModal(true)}
                className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100"
              >
                Reply ontvangen
              </button>
              <button
                onClick={() => setShowFollowup(!showFollowup)}
                className="px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded-lg font-medium hover:bg-orange-100"
              >
                Plan follow-up
              </button>
            </div>
            {showFollowup && (
              <div className="mt-2 flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={followupDate}
                  onChange={e => setFollowupDate(e.target.value)}
                  className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={planFollowup} disabled={!followupDate} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  Plannen
                </button>
              </div>
            )}
          </SectionAccordion>

          {/* 4. Call Script & Closing */}
          <SectionAccordion title="Belscript & Closing" section="script" open={openSections.has("script")} onToggle={toggleSection}>
            <SalesScriptPanel />
          </SectionAccordion>

          {/* 5. DM Templates */}
          {(lead.instagram_available || lead.facebook_available) && (
            <SectionAccordion title="DM Templates" section="dm" open={openSections.has("dm")} onToggle={toggleSection}>
              <DMTemplatePanel lead={lead} onMarkSent={handleDMSent} />
            </SectionAccordion>
          )}

          {/* 5b. Closing Panel */}
          <SectionAccordion title="Closing & Deal Info" section="closing" open={openSections.has("closing")} onToggle={toggleSection}>
            <ClosingPanel lead={lead} onUpdate={onUpdate} />
          </SectionAccordion>

          {/* 5c. Test Shifts */}
          <SectionAccordion title="Testdiensten" section="testshifts" open={openSections.has("testshifts")} onToggle={toggleSection}>
            <TestShiftPanel lead={lead} onUpdate={onUpdate} />
          </SectionAccordion>

          {/* 6. Campagnes */}
          <SectionAccordion title={`Campagnes${leadCampaigns.length > 0 ? ` (${leadCampaigns.length})` : ""}`} section="campaigns" open={openSections.has("campaigns")} onToggle={toggleSection}>
            {leadCampaigns.length === 0 ? (
              <p className="text-sm text-neutral-500">Geen campagnes gekoppeld</p>
            ) : (
              <div className="space-y-2">
                {leadCampaigns.map(lc => (
                  <div key={lc.id} className="bg-cyan-50 border border-cyan-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-cyan-900">{(lc.campaign as unknown as { name: string })?.name || "Campagne"}</p>
                      <InstantlyBadge status={lc.email_status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-cyan-700 mt-2">
                      <div>
                        <span className="text-cyan-500">Opens:</span> {lc.open_count}
                      </div>
                      <div>
                        <span className="text-cyan-500">Replies:</span> {lc.reply_count}
                      </div>
                      <div>
                        <span className="text-cyan-500">Clicks:</span> {lc.click_count}
                      </div>
                    </div>
                    {lc.last_event_at && (
                      <p className="text-[10px] text-cyan-500 mt-1">
                        Laatste event: {new Date(lc.last_event_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionAccordion>

          {/* 6b. Leadlijsten */}
          <SectionAccordion title="Leadlijsten" section="leadlists" open={openSections.has("leadlists")} onToggle={toggleSection}>
            {leadList ? (
              <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-3">
                <p className="text-sm font-medium text-neutral-900">{leadList.name}</p>
                {leadList.description && <p className="text-xs text-neutral-500 mt-0.5">{leadList.description}</p>}
                <div className="flex gap-3 mt-2 text-xs text-neutral-500">
                  <span>{leadList.lead_count} leads</span>
                  <span>{leadList.source}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Niet in een leadlijst</p>
            )}
          </SectionAccordion>

          {/* 6c. Duplicate detectie */}
          <SectionAccordion title="Duplicaat detectie" section="duplicates" open={openSections.has("duplicates")} onToggle={toggleSection}>
            <DuplicatesView
              leadId={lead.id}
              leadName={lead.company_name}
              onMergeComplete={() => {
                fetchLogs();
                fetchCampaigns();
              }}
            />
          </SectionAccordion>

          {/* 7. Notes */}
          <SectionAccordion title="Notities" section="notes" open={openSections.has("notes")} onToggle={toggleSection}>
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
          </SectionAccordion>

          {/* 8. Timeline */}
          <SectionAccordion title="Contactgeschiedenis" section="timeline" open={openSections.has("timeline")} onToggle={toggleSection}>
            <ContactTimeline logs={logs} onRevert={async () => {
              fetchLogs();
              // Re-fetch the lead to get updated state
              const token = await getToken();
              const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const updatedLead = await res.json();
                onUpdate({ ...lead, ...updatedLead });
              }
            }} />
          </SectionAccordion>
        </div>
      </div>

      {/* Reply modal */}
      {showReplyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-3">Reply ontvangen</h3>
            <p className="text-sm text-neutral-600 mb-4">Wat is de status na de reply?</p>
            <div className="space-y-2">
              <button
                onClick={() => handleReply("in_gesprek")}
                className="w-full p-3 text-left rounded-lg border border-neutral-200 hover:bg-purple-50 hover:border-purple-200"
              >
                <span className="font-medium text-sm">In gesprek</span>
                <p className="text-xs text-neutral-500">Lead heeft gereageerd, nog geen concrete interesse</p>
              </button>
              <button
                onClick={() => handleReply("gewonnen")}
                className="w-full p-3 text-left rounded-lg border border-neutral-200 hover:bg-green-50 hover:border-green-200"
              >
                <span className="font-medium text-sm">Geïnteresseerd</span>
                <p className="text-xs text-neutral-500">Lead toont concrete interesse, bellen voor follow-up</p>
              </button>
            </div>
            <button onClick={() => setShowReplyModal(false)} className="mt-3 w-full py-2 text-sm text-neutral-500 hover:text-neutral-700">
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionAccordion({ title, section, open, onToggle, children }: {
  title: string;
  section: AccordionSection;
  open: boolean;
  onToggle: (s: AccordionSection) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-neutral-100 rounded-xl overflow-hidden">
      <button
        onClick={() => onToggle(section)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <span className="text-sm font-semibold text-neutral-700">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}
