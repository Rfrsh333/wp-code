"use client";

import { Phone, Calendar, ClipboardCheck, Trophy } from "lucide-react";
import NextActionBadge from "./NextActionBadge";
import type { CRMLead } from "./types";

interface HotLeadsProps {
  leads: CRMLead[];
  onSelectLead: (lead: CRMLead) => void;
  onQuickAction: (lead: CRMLead, action: string) => void;
}

export default function HotLeads({ leads, onSelectLead, onQuickAction }: HotLeadsProps) {
  if (leads.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        Hot Leads
        <span className="text-sm font-normal text-orange-600">({leads.length})</span>
      </h3>
      <div className="space-y-2">
        {leads.map(lead => (
          <div
            key={lead.id}
            className="flex items-center gap-3 bg-white/80 rounded-xl p-3 hover:bg-white transition-colors cursor-pointer"
            onClick={() => onSelectLead(lead)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-neutral-900 truncate">{lead.company_name}</span>
                {lead.city && <span className="text-xs text-neutral-500">{lead.city}</span>}
              </div>
              {lead.last_contacted_at && (
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Laatste: {new Date(lead.last_contacted_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
            <NextActionBadge lead={lead} size="sm" />
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                  title="Bel nu"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => onQuickAction(lead, "afspraak")}
                className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100"
                title="Plan afspraak"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onQuickAction(lead, "testdienst")}
                className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
                title="Testdienst"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onQuickAction(lead, "klant")}
                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                title="Markeer klant"
              >
                <Trophy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
