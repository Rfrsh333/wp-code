"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { X, Phone, PhoneMissed, PhoneCall, MessageCircle, ChevronRight, Clock, SkipForward, Square, Voicemail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { calculateNextBestChannel } from "./outreach-helpers";
import { CALL_SCRIPTS, CLOSING_SCRIPTS } from "./sales-templates";
import type { CRMLead } from "./types";

interface CallingSessionModalProps {
  onClose: () => void;
}

interface SessionStats {
  totalCalls: number;
  gesprekken: number;
  geenGehoor: number;
  afspraken: number;
}

export default function CallingSessionModal({ onClose }: CallingSessionModalProps) {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [actionTaken, setActionTaken] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [stats, setStats] = useState<SessionStats>({ totalCalls: 0, gesprekken: 0, geenGehoor: 0, afspraken: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchPhoneLeads();
    timerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function fetchPhoneLeads() {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/leads?per_page=100&next_best_channel=phone&sort_by=updated_at", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      toast.error("Fout bij laden leads");
    } finally {
      setLoading(false);
    }
  }

  const lead = leads[currentIndex];

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function performAction(action: string, updates: Record<string, unknown>, logType: string, logNotes?: string) {
    if (!lead) return;
    const token = await getToken();

    await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    await fetch("/api/admin/crm/contact-logs/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, type: logType, notes: logNotes || note || null }),
    });

    if (updates.next_followup_at) {
      await fetch("/api/admin/crm/followups/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, scheduled_at: updates.next_followup_at, type: "bellen" }),
      });
    }

    setStats(prev => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      ...(action === "gesproken" ? { gesprekken: prev.gesprekken + 1 } : {}),
      ...(action === "geen_gehoor" ? { geenGehoor: prev.geenGehoor + 1 } : {}),
    }));

    setActionTaken(true);
    setNote("");
    setFollowupDate("");
    setTimeout(goNext, 1500);
  }

  function goNext() {
    setActionTaken(false);
    setNote("");
    setFollowupDate("");
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setShowSummary(true);
    }
  }

  function handleNoAnswer() {
    if (!lead) return;
    const updates: Record<string, unknown> = {
      status: "gebeld_geen_gehoor",
      last_call_at: new Date().toISOString(),
      call_count: lead.call_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: lead.outreach_status === "not_started" ? "contacted" : lead.outreach_status,
    };
    const updatedLead = { ...lead, ...updates, status: "gebeld_geen_gehoor" as const, last_call_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    performAction("geen_gehoor", updates, "geen_gehoor");
  }

  function handleVoicemail() {
    if (!lead) return;
    const updates: Record<string, unknown> = {
      status: "voicemail",
      last_call_at: new Date().toISOString(),
      call_count: lead.call_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: lead.outreach_status === "not_started" ? "contacted" : lead.outreach_status,
    };
    const updatedLead = { ...lead, ...updates, last_call_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    performAction("voicemail", updates, "voicemail");
  }

  function handleSpoken() {
    if (!lead) return;
    const updates: Record<string, unknown> = {
      status: "in_gesprek",
      last_call_at: new Date().toISOString(),
      call_count: lead.call_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: "replied",
      next_best_channel: "phone",
    };
    if (followupDate) updates.next_followup_at = followupDate;
    performAction("gesproken", updates, "gesproken", note);
  }

  function handleCalled() {
    if (!lead) return;
    const updates: Record<string, unknown> = {
      last_call_at: new Date().toISOString(),
      call_count: lead.call_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: lead.outreach_status === "not_started" ? "in_progress" : lead.outreach_status,
    };
    const updatedLead = { ...lead, ...updates, last_call_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    performAction("gebeld", updates, "gebeld");
  }

  function handleClose() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stats.totalCalls > 0) {
      setShowSummary(true);
    } else {
      onClose();
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Leads laden...</div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-neutral-600 mb-4">Geen leads om te bellen</p>
          <button onClick={onClose} className="px-6 py-3 bg-neutral-900 text-white rounded-xl">Sluiten</button>
        </div>
      </div>
    );
  }

  // Summary screen
  if (showSummary) {
    return (
      <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Sessie afgerond!</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-blue-700">{stats.totalCalls}</p>
              <p className="text-sm text-blue-600">Calls</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-green-700">{stats.gesprekken}</p>
              <p className="text-sm text-green-600">Gesprekken</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-yellow-700">{stats.geenGehoor}</p>
              <p className="text-sm text-yellow-600">Geen gehoor</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-neutral-700">{formatTime(sessionTime)}</p>
              <p className="text-sm text-neutral-500">Duur</p>
            </div>
          </div>
          <button onClick={onClose} className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-medium text-lg hover:bg-neutral-800">
            Sluiten
          </button>
        </div>
      </div>
    );
  }

  // Get last contact log note
  const lastNote = ""; // Will use contact timeline if needed

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-500">
            Lead {currentIndex + 1}/{leads.length}
          </span>
          <div className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / leads.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(sessionTime)}
          </span>
          <span className="text-sm text-neutral-500">{stats.totalCalls} calls</span>
          <button onClick={handleClose} className="p-2 hover:bg-neutral-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Lead info (60%) */}
        <div className="w-3/5 p-8 overflow-y-auto">
          <div className="max-w-xl">
            {/* Company name */}
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">{lead.company_name}</h1>
            {lead.city && <p className="text-lg text-neutral-500 mb-4">{lead.city}{lead.address ? ` - ${lead.address}` : ""}</p>}

            {/* Phone - big and clickable */}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-3 px-6 py-4 bg-blue-50 text-blue-700 rounded-2xl text-2xl font-bold hover:bg-blue-100 transition-colors mb-6"
              >
                <Phone className="w-6 h-6" />
                {lead.phone}
              </a>
            )}

            {/* Lead stats */}
            <div className="flex gap-4 mb-6 text-sm text-neutral-500">
              <span>Pogingen: {lead.call_count + lead.email_count + lead.instagram_dm_count + lead.facebook_dm_count}</span>
              <span>Calls: {lead.call_count}</span>
              {lead.last_contacted_at && (
                <span>Laatste: {new Date(lead.last_contacted_at).toLocaleDateString("nl-NL")}</span>
              )}
            </div>

            {/* Call script */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-700 uppercase">Belscript</h3>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Opening</p>
                <p className="text-sm text-blue-900 whitespace-pre-line">{CALL_SCRIPTS.opening}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Aanbod</p>
                <p className="text-sm text-blue-900 whitespace-pre-line">{CALL_SCRIPTS.aanbod}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-600 uppercase mb-1">Interesse</p>
                <p className="text-sm text-green-900 whitespace-pre-line">{CALL_SCRIPTS.interesse}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions (40%) */}
        <div className="w-2/5 bg-neutral-50 border-l border-neutral-100 p-6 flex flex-col">
          {/* Quick actions */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 uppercase">Resultaat</h3>
            <button
              onClick={handleCalled}
              disabled={actionTaken}
              className="w-full flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Phone className="w-5 h-5" />
              <span className="font-medium">Gebeld</span>
            </button>
            <button
              onClick={handleNoAnswer}
              disabled={actionTaken}
              className="w-full flex items-center gap-3 p-4 bg-yellow-50 text-yellow-700 rounded-xl hover:bg-yellow-100 transition-colors disabled:opacity-50"
            >
              <PhoneMissed className="w-5 h-5" />
              <span className="font-medium">Geen gehoor</span>
            </button>
            <button
              onClick={handleVoicemail}
              disabled={actionTaken}
              className="w-full flex items-center gap-3 p-4 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <Voicemail className="w-5 h-5" />
              <span className="font-medium">Voicemail</span>
            </button>
            <button
              onClick={handleSpoken}
              disabled={actionTaken}
              className="w-full flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <PhoneCall className="w-5 h-5" />
              <span className="font-medium">Gesproken</span>
            </button>
          </div>

          {/* Note input */}
          <div className="mb-4">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Notitie..."
              className="w-full border border-neutral-200 rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Follow-up planner */}
          <div className="mb-4">
            <label className="text-xs text-neutral-500 mb-1 block">Follow-up plannen:</label>
            <input
              type="datetime-local"
              value={followupDate}
              onChange={e => setFollowupDate(e.target.value)}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Action taken feedback */}
          {actionTaken && (
            <div className="bg-green-100 text-green-700 rounded-xl p-3 text-center text-sm font-medium mb-4 animate-pulse">
              Opgeslagen! Volgende lead...
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-auto flex gap-2">
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-300"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex >= leads.length - 1}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Volgende
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
