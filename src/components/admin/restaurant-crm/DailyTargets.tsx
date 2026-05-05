"use client";

import { Check, Phone, Send, MessageCircle, Star, Calendar } from "lucide-react";

interface DailyTargetsProps {
  callsToday: number;
  dmsToday: number;
  gesprekkenToday: number;
  interestToday: number;
  appointmentsToday: number;
}

const TARGETS = [
  { key: "calls", label: "Calls", target: 30, icon: Phone, color: "blue" },
  { key: "dms", label: "DMs", target: 20, icon: Send, color: "pink" },
  { key: "gesprekken", label: "Gesprekken", target: 5, icon: MessageCircle, color: "green" },
  { key: "interest", label: "Interesse", target: 3, icon: Star, color: "yellow" },
  { key: "appointments", label: "Afspraken", target: 1, icon: Calendar, color: "purple" },
];

const COLOR_MAP: Record<string, { bg: string; fill: string; text: string }> = {
  blue: { bg: "bg-blue-100", fill: "bg-blue-500", text: "text-blue-700" },
  pink: { bg: "bg-pink-100", fill: "bg-pink-500", text: "text-pink-700" },
  green: { bg: "bg-green-100", fill: "bg-green-500", text: "text-green-700" },
  yellow: { bg: "bg-amber-100", fill: "bg-amber-500", text: "text-amber-700" },
  purple: { bg: "bg-purple-100", fill: "bg-purple-500", text: "text-purple-700" },
};

export default function DailyTargets({ callsToday, dmsToday, gesprekkenToday, interestToday, appointmentsToday }: DailyTargetsProps) {
  const values: Record<string, number> = {
    calls: callsToday,
    dms: dmsToday,
    gesprekken: gesprekkenToday,
    interest: interestToday,
    appointments: appointmentsToday,
  };

  return (
    <div className="bg-white border border-neutral-100 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-neutral-900 mb-4">Dagelijkse targets</h3>
      <div className="space-y-3">
        {TARGETS.map(t => {
          const current = values[t.key] || 0;
          const pct = Math.min(100, Math.round((current / t.target) * 100));
          const done = current >= t.target;
          const colors = COLOR_MAP[t.color];
          const Icon = t.icon;

          return (
            <div key={t.key} className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${done ? "bg-green-100" : colors.bg}`}>
                {done ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Icon className={`w-3.5 h-3.5 ${colors.text}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-neutral-700">{t.label}</span>
                  <span className={`text-xs font-bold ${done ? "text-green-600" : "text-neutral-500"}`}>
                    {current}/{t.target}
                    {done && " Lekker bezig!"}
                  </span>
                </div>
                <div className={`h-1.5 rounded-full ${colors.bg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${done ? "bg-green-500" : colors.fill}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
