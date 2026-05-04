"use client";

import { useState } from "react";
import { Phone, PhoneMissed, PhoneCall, Mail, Instagram, Facebook, MessageCircle, Star, Clock } from "lucide-react";
import type { CRMLead } from "./types";
import { calculateNextBestChannel } from "./outreach-helpers";

interface QuickActionsProps {
  lead: CRMLead;
  onAction: (action: string, updates: Record<string, unknown>, logType: string, logNotes?: string) => Promise<void>;
  compact?: boolean;
}

export default function QuickActions({ lead, onAction, compact }: QuickActionsProps) {
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [followupDate, setFollowupDate] = useState("");

  async function handleCall() {
    const updates: Record<string, unknown> = {
      last_call_at: new Date().toISOString(),
      call_count: lead.call_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: lead.outreach_status === "not_started" ? "in_progress" : lead.outreach_status,
    };
    // Recalculate next best channel after call
    const updatedLead = { ...lead, ...updates, last_call_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    await onAction("gebeld", updates, "gebeld");
  }

  async function handleNoAnswer() {
    const updates: Record<string, unknown> = {
      status: "gebeld_geen_gehoor",
      last_call_at: new Date().toISOString(),
      call_count: lead.call_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: lead.outreach_status === "not_started" ? "contacted" : lead.outreach_status,
    };
    // Next channel: instagram if available, else email, else phone
    const updatedLead = { ...lead, ...updates, status: "gebeld_geen_gehoor" as const, last_call_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    await onAction("geen_gehoor", updates, "geen_gehoor");
  }

  async function handleSpoken() {
    setShowNoteModal("gesproken");
  }

  async function submitSpoken() {
    const updates: Record<string, unknown> = {
      status: "in_gesprek",
      last_call_at: new Date().toISOString(),
      call_count: lead.call_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: "replied",
      next_best_channel: "phone",
    };
    if (followupDate) updates.next_followup_at = followupDate;
    await onAction("gesproken", updates, "gesproken", note);
    setShowNoteModal(null);
    setNote("");
    setFollowupDate("");
  }

  async function handleEmailSent() {
    const updates: Record<string, unknown> = {
      status: "email_gestuurd",
      last_email_at: new Date().toISOString(),
      email_count: lead.email_count + 1,
      last_contacted_at: new Date().toISOString(),
      instantly_email_status: "sent",
      outreach_status: lead.outreach_status === "not_started" ? "contacted" : lead.outreach_status,
    };
    const updatedLead = { ...lead, ...updates, last_email_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    await onAction("email_gestuurd", updates, "email");
  }

  async function handleInstagramDM() {
    const updates: Record<string, unknown> = {
      status: "dm_gestuurd",
      last_instagram_dm_at: new Date().toISOString(),
      instagram_dm_count: lead.instagram_dm_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: lead.outreach_status === "not_started" ? "contacted" : lead.outreach_status,
    };
    const updatedLead = { ...lead, ...updates, last_instagram_dm_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    await onAction("dm_instagram", updates, "dm_instagram");
  }

  async function handleFacebookDM() {
    const updates: Record<string, unknown> = {
      status: "dm_gestuurd",
      last_facebook_dm_at: new Date().toISOString(),
      facebook_dm_count: lead.facebook_dm_count + 1,
      last_contacted_at: new Date().toISOString(),
      outreach_status: lead.outreach_status === "not_started" ? "contacted" : lead.outreach_status,
    };
    const updatedLead = { ...lead, ...updates, last_facebook_dm_at: new Date().toISOString() };
    updates.next_best_channel = calculateNextBestChannel(updatedLead as CRMLead);
    await onAction("dm_facebook", updates, "dm_facebook");
  }

  async function handleReplied() {
    const updates: Record<string, unknown> = {
      outreach_status: "replied",
      last_contacted_at: new Date().toISOString(),
      next_best_channel: "phone",
    };
    await onAction("gereageerd", updates, "notitie", "Lead heeft gereageerd");
  }

  async function handleInterested() {
    const updates: Record<string, unknown> = {
      outreach_status: "interested",
      status: "in_gesprek",
      next_best_channel: "phone",
    };
    await onAction("geïnteresseerd", updates, "notitie", "Lead is geïnteresseerd");
  }

  const btnBase = compact
    ? "px-2 py-1 text-xs rounded-md font-medium transition-colors"
    : "px-3 py-1.5 text-sm rounded-lg font-medium transition-colors";

  return (
    <>
      <div className={compact ? "flex flex-wrap gap-1" : "flex flex-wrap gap-2"}>
        {lead.phone_available && (
          <>
            <button onClick={handleCall} className={`${btnBase} bg-blue-50 text-blue-700 hover:bg-blue-100`}>
              <Phone className="w-3.5 h-3.5 inline mr-1" />Gebeld
            </button>
            <button onClick={handleNoAnswer} className={`${btnBase} bg-yellow-50 text-yellow-700 hover:bg-yellow-100`}>
              <PhoneMissed className="w-3.5 h-3.5 inline mr-1" />Geen gehoor
            </button>
            <button onClick={handleSpoken} className={`${btnBase} bg-green-50 text-green-700 hover:bg-green-100`}>
              <PhoneCall className="w-3.5 h-3.5 inline mr-1" />Gesproken
            </button>
          </>
        )}
        {lead.email_available && (
          <button onClick={handleEmailSent} className={`${btnBase} bg-cyan-50 text-cyan-700 hover:bg-cyan-100`}>
            <Mail className="w-3.5 h-3.5 inline mr-1" />Email
          </button>
        )}
        {lead.instagram_available && (
          <>
            <a href={lead.instagram_url!} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-pink-50 text-pink-700 hover:bg-pink-100`}>
              <Instagram className="w-3.5 h-3.5 inline mr-1" />Open IG
            </a>
            <button onClick={handleInstagramDM} className={`${btnBase} bg-pink-50 text-pink-700 hover:bg-pink-100`}>
              DM gestuurd
            </button>
          </>
        )}
        {lead.facebook_available && (
          <>
            <a href={lead.facebook_url!} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>
              <Facebook className="w-3.5 h-3.5 inline mr-1" />Open FB
            </a>
            <button onClick={handleFacebookDM} className={`${btnBase} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>
              Bericht gestuurd
            </button>
          </>
        )}
        <button onClick={handleReplied} className={`${btnBase} bg-purple-50 text-purple-700 hover:bg-purple-100`}>
          <MessageCircle className="w-3.5 h-3.5 inline mr-1" />Gereageerd
        </button>
        <button onClick={handleInterested} className={`${btnBase} bg-green-50 text-green-700 hover:bg-green-100`}>
          <Star className="w-3.5 h-3.5 inline mr-1" />Interesse
        </button>
      </div>

      {/* Note modal for "Gesproken" */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Gesproken - notitie toevoegen</h3>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Wat is er besproken?"
              className="w-full border border-neutral-200 rounded-lg p-3 text-sm min-h-[100px] mb-3"
            />
            <div className="mb-4">
              <label className="text-sm text-neutral-600 mb-1 block">Follow-up plannen (optioneel)</label>
              <input
                type="datetime-local"
                value={followupDate}
                onChange={e => setFollowupDate(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg p-2 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowNoteModal(null); setNote(""); }} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">
                Annuleren
              </button>
              <button onClick={submitSpoken} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
