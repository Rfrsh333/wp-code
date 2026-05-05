"use client";

import { useState } from "react";
import { Phone, PhoneMissed, PhoneCall, Mail, Instagram, Facebook, MessageCircle, MapPin, FileText, StickyNote, Send, MailOpen, Reply, AlertTriangle, Undo2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { CONTACT_LOG_CONFIG } from "./constants";
import type { CRMContactLog, ContactLogType } from "./types";

const ICON_MAP: Record<string, typeof Phone> = {
  Phone, PhoneMissed, PhoneCall, Mail, Instagram, Facebook,
  MessageCircle, MapPin, FileText, StickyNote, Send, MailOpen, Reply, AlertTriangle,
  Voicemail: Phone,
};

interface ContactTimelineProps {
  logs: CRMContactLog[];
  onRevert?: () => void;
}

export default function ContactTimeline({ logs, onRevert }: ContactTimelineProps) {
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const toast = useToast();

  if (logs.length === 0) {
    return <p className="text-sm text-neutral-400 italic">Nog geen contactmomenten</p>;
  }

  async function handleRevert(logId: string) {
    setRevertingId(logId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`/api/admin/crm/contact-logs/${logId}/revert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Terugdraaien mislukt");
        return;
      }
      toast.success("Actie teruggedraaid");
      onRevert?.();
    } catch {
      toast.error("Terugdraaien mislukt");
    } finally {
      setRevertingId(null);
      setConfirmId(null);
    }
  }

  const now = new Date();

  return (
    <div className="space-y-0">
      {logs.map((log, i) => {
        const config = CONTACT_LOG_CONFIG[log.type as ContactLogType];
        const IconComponent = ICON_MAP[config?.icon || "Phone"] || Phone;
        const isLast = i === logs.length - 1;
        const isReverted = log.is_reverted;
        const canRevert = log.action_key && !isReverted && log.previous_state &&
          (now.getTime() - new Date(log.created_at).getTime()) < 24 * 60 * 60 * 1000;

        return (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`p-1.5 rounded-full ${isReverted ? "bg-neutral-50" : "bg-neutral-100"}`}>
                <IconComponent className={`w-3.5 h-3.5 ${isReverted ? "text-neutral-300" : "text-neutral-600"}`} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-neutral-200 my-1" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isReverted ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
                  {config?.label || log.type}
                  {isReverted && <span className="ml-1.5 no-underline text-xs text-neutral-400 font-normal">(Teruggedraaid)</span>}
                </span>
                <div className="flex items-center gap-2">
                  {canRevert && (
                    confirmId === log.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRevert(log.id)}
                          disabled={revertingId === log.id}
                          className="px-2 py-0.5 text-[10px] bg-red-50 text-red-600 rounded font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          {revertingId === log.id ? "..." : "Bevestig"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-0.5 text-[10px] text-neutral-500 rounded hover:bg-neutral-100"
                        >
                          Annuleer
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(log.id)}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        title="Terugdraaien"
                      >
                        <Undo2 className="w-3 h-3" />
                      </button>
                    )
                  )}
                  <span className="text-xs text-neutral-400">
                    {new Date(log.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              {log.notes && <p className={`text-xs mt-0.5 ${isReverted ? "text-neutral-300" : "text-neutral-500"}`}>{log.notes}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
