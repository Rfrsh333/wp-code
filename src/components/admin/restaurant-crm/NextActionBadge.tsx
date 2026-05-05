"use client";

import type { CRMLead } from "./types";

export interface NextAction {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pulse: boolean;
}

export function getNextAction(lead: CRMLead): NextAction {
  const { outreach_status, next_best_channel, status, next_followup_at } = lead;

  // Klant geworden / converted
  if (status === "klant_geworden" || outreach_status === "converted") {
    return { label: "KLANT", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", pulse: false };
  }

  // Verloren / geen interesse
  if (outreach_status === "not_interested" || status === "verloren" || status === "geen_interesse") {
    return { label: "GEEN ACTIE", color: "text-gray-500", bgColor: "bg-gray-50", borderColor: "border-gray-200", pulse: false };
  }

  // Check overdue follow-up
  const isOverdue = next_followup_at && new Date(next_followup_at) < new Date();

  if (isOverdue) {
    return { label: "FOLLOW-UP!", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-300", pulse: true };
  }

  // Interested → close deal
  if (outreach_status === "interested" || status === "in_onderhandeling") {
    return { label: "SLUIT DEAL", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-300", pulse: false };
  }

  // Testdienst/afspraak stages
  if (status === "afspraak_gepland" || status === "testdienst_ingepland" || status === "testdienst_afgerond") {
    return { label: "FOLLOW-UP!", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-300", pulse: false };
  }

  // Replied → call back
  if (outreach_status === "replied") {
    return { label: "BEL TERUG", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-300", pulse: true };
  }

  // Terugbellen status
  if (status === "terugbellen") {
    return { label: "BEL TERUG", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-300", pulse: true };
  }

  // Channel-based actions
  if (next_best_channel === "phone") {
    return { label: "BEL NU", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300", pulse: false };
  }

  if (next_best_channel === "instagram") {
    return { label: "STUUR DM", color: "text-pink-700", bgColor: "bg-pink-50", borderColor: "border-pink-300", pulse: false };
  }

  if (next_best_channel === "facebook") {
    return { label: "STUUR BERICHT", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-300", pulse: false };
  }

  if (next_best_channel === "email") {
    return { label: "STUUR EMAIL", color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-300", pulse: false };
  }

  // No action / none channel
  return { label: "GEEN ACTIE", color: "text-gray-500", bgColor: "bg-gray-50", borderColor: "border-gray-200", pulse: false };
}

export function getContactAttemptBadge(lead: CRMLead): { label: string; color: string; bgColor: string } {
  const total = lead.call_count + lead.email_count + lead.instagram_dm_count + lead.facebook_dm_count;
  if (total === 0) return { label: "Nieuw", color: "text-green-700", bgColor: "bg-green-50" };
  if (total <= 3) return { label: "Actief", color: "text-blue-700", bgColor: "bg-blue-50" };
  if (total <= 6) return { label: "Veel", color: "text-orange-700", bgColor: "bg-orange-50" };
  return { label: "Stop", color: "text-red-700", bgColor: "bg-red-50" };
}

interface NextActionBadgeProps {
  lead: CRMLead;
  size?: "sm" | "md" | "lg";
}

export default function NextActionBadge({ lead, size = "sm" }: NextActionBadgeProps) {
  const action = getNextAction(lead);

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base font-bold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${action.color} ${action.bgColor} ${action.borderColor} ${sizeClasses[size]} ${
        action.pulse ? "animate-pulse" : ""
      }`}
    >
      {action.label}
    </span>
  );
}
