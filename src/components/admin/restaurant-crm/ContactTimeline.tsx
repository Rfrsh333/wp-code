"use client";

import { Phone, PhoneMissed, PhoneCall, Mail, Instagram, Facebook, MessageCircle, MapPin, FileText, StickyNote, Send, MailOpen, Reply, AlertTriangle } from "lucide-react";
import { CONTACT_LOG_CONFIG } from "./constants";
import type { CRMContactLog, ContactLogType } from "./types";

const ICON_MAP: Record<string, typeof Phone> = {
  Phone, PhoneMissed, PhoneCall, Mail, Instagram, Facebook,
  MessageCircle, MapPin, FileText, StickyNote, Send, MailOpen, Reply, AlertTriangle,
  Voicemail: Phone,
};

interface ContactTimelineProps {
  logs: CRMContactLog[];
}

export default function ContactTimeline({ logs }: ContactTimelineProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-neutral-400 italic">Nog geen contactmomenten</p>;
  }

  return (
    <div className="space-y-0">
      {logs.map((log, i) => {
        const config = CONTACT_LOG_CONFIG[log.type as ContactLogType];
        const IconComponent = ICON_MAP[config?.icon || "Phone"] || Phone;
        const isLast = i === logs.length - 1;

        return (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="p-1.5 bg-neutral-100 rounded-full">
                <IconComponent className="w-3.5 h-3.5 text-neutral-600" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-neutral-200 my-1" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-800">{config?.label || log.type}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(log.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {log.notes && <p className="text-xs text-neutral-500 mt-0.5">{log.notes}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
