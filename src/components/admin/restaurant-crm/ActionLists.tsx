"use client";

import { Phone, MessageCircle, ClipboardCheck, AlertTriangle, ChevronRight } from "lucide-react";
import type { CRMLead } from "./types";

interface ActionListsProps {
  phoneTodo: number;
  repliedCount: number;
  closingCount: number;
  overdueCount: number;
  onNavigate: (filter: string) => void;
}

const LISTS = [
  {
    key: "phone",
    label: "Bel nu",
    description: "Leads om te bellen",
    icon: Phone,
    color: "blue",
    filter: "next_best_channel=phone",
    countKey: "phoneTodo" as const,
  },
  {
    key: "replied",
    label: "Replies opvolgen",
    description: "Leads die gereageerd hebben",
    icon: MessageCircle,
    color: "purple",
    filter: "outreach_status=replied",
    countKey: "repliedCount" as const,
  },
  {
    key: "closing",
    label: "Testdiensten & afspraken",
    description: "Leads in closing stages",
    icon: ClipboardCheck,
    color: "teal",
    filter: "status=afspraak_gepland,testdienst_ingepland,testdienst_afgerond,in_onderhandeling",
    countKey: "closingCount" as const,
  },
  {
    key: "overdue",
    label: "Verlopen follow-ups",
    description: "Follow-ups die verlopen zijn",
    icon: AlertTriangle,
    color: "red",
    filter: "followup_overdue=true",
    countKey: "overdueCount" as const,
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200" },
  red: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
};

export default function ActionLists({ phoneTodo, repliedCount, closingCount, overdueCount, onNavigate }: ActionListsProps) {
  const counts: Record<string, number> = {
    phoneTodo,
    repliedCount,
    closingCount,
    overdueCount,
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">Actie-lijsten</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LISTS.map(list => {
          const count = counts[list.countKey];
          const colors = COLOR_MAP[list.color];
          const Icon = list.icon;

          return (
            <button
              key={list.key}
              onClick={() => onNavigate(list.filter)}
              className={`flex flex-col items-start p-4 rounded-xl border border-neutral-100 bg-white hover:ring-2 ${colors.ring} transition-all text-left group`}
            >
              <div className={`p-2 rounded-lg ${colors.bg} mb-2`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <span className="text-2xl font-bold text-neutral-900">{count}</span>
              <span className="text-xs font-medium text-neutral-700">{list.label}</span>
              <span className="text-[10px] text-neutral-400 mt-0.5">{list.description}</span>
              <div className="flex items-center gap-1 mt-2 text-xs text-neutral-400 group-hover:text-neutral-600">
                <span>Bekijk</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
