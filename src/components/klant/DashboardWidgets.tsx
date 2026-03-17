"use client";

import { motion } from "framer-motion";
import { CalendarDays, Euro, Clock3, TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react";

interface DashboardStats {
  pendingHoursCount: number;
  pendingHoursTotal: number;
  approvedHoursThisMonth: number;
  activeDienstenCount: number;
  openFacturenCount: number;
}

interface UpcomingDienst {
  datum: string;
  start_tijd: string;
  locatie: string;
  functie: string;
}

interface Factuur {
  totaal: number;
  status: string;
}

interface DashboardWidgetsProps {
  stats: DashboardStats | null;
  volgendeDienst: UpcomingDienst | null;
  openFacturen: Factuur[];
  maandBedrag: number;
  budgetGebruikt?: number;
  budgetTotaal?: number;
  onTabChange: (tab: string) => void;
}

export default function DashboardWidgets({
  stats,
  volgendeDienst,
  openFacturen,
  maandBedrag,
  budgetGebruikt = 0,
  budgetTotaal = 3000,
  onTabChange,
}: DashboardWidgetsProps) {
  const openBedrag = openFacturen
    .filter((f) => f.status === "openstaand")
    .reduce((s, f) => s + f.totaal, 0);
  const budgetPct = budgetTotaal > 0 ? Math.min(100, Math.round((budgetGebruikt / budgetTotaal) * 100)) : 0;
  const budgetWaarschuwing = budgetPct >= 85;

  return (
    <div className="space-y-3 mb-6">
      {/* Budget alert */}
      {budgetWaarschuwing && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">Budget bijna bereikt</p>
            <p className="text-amber-700 text-sm mt-0.5">
              &euro;{budgetGebruikt.toLocaleString("nl-NL")} van &euro;{budgetTotaal.toLocaleString("nl-NL")} gebruikt ({budgetPct}%)
            </p>
          </div>
        </motion.div>
      )}

      {/* 2x2 widget grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Widget 1 — Volgende dienst */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.3 }}
          onClick={() => onTabChange("rooster")}
          className="bg-[#1e3a5f] text-white rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform min-h-[140px]"
        >
          <div className="flex items-center gap-2 text-white/70 text-sm font-semibold">
            <CalendarDays className="w-4 h-4" />
            <span>Volgende dienst</span>
          </div>
          {volgendeDienst ? (
            <>
              <p className="font-bold text-base leading-snug mt-1">{volgendeDienst.functie}</p>
              <p className="text-white/80 text-sm truncate">{volgendeDienst.locatie}</p>
              <span className="mt-auto self-start bg-[#F27501] text-white text-sm font-bold px-3 py-1.5 rounded-full">
                {volgendeDienst.start_tijd?.slice(0, 5)}
              </span>
            </>
          ) : (
            <p className="text-white/60 text-sm mt-1">Geen gepland</p>
          )}
        </motion.button>

        {/* Widget 2 — Openstaande facturen */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07, duration: 0.3 }}
          onClick={() => onTabChange("facturen")}
          className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform min-h-[140px]"
        >
          <div className="flex items-center gap-2 text-neutral-500 text-sm font-semibold">
            <Euro className="w-4 h-4" />
            <span>Openstaand</span>
          </div>
          <p className="font-bold text-2xl text-neutral-900 mt-1">
            &euro;{openBedrag.toLocaleString("nl-NL")}
          </p>
          <div className="mt-auto flex items-center gap-1.5">
            {(stats?.openFacturenCount ?? 0) > 0 && (
              <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">
                {stats?.openFacturenCount} factuur{stats?.openFacturenCount !== 1 ? "en" : ""}
              </span>
            )}
            <ArrowUpRight className="w-4 h-4 text-neutral-400" />
          </div>
        </motion.button>

        {/* Widget 3 — Uren goed te keuren */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.3 }}
          onClick={() => onTabChange("uren")}
          className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform min-h-[140px]"
        >
          <div className="flex items-center gap-2 text-neutral-500 text-sm font-semibold">
            <Clock3 className="w-4 h-4" />
            <span>Uren goed te keuren</span>
          </div>
          <p className="font-bold text-2xl text-neutral-900 mt-1">
            {stats?.pendingHoursCount ?? 0}
          </p>
          <p className="text-neutral-500 text-sm">
            {stats?.pendingHoursTotal?.toFixed(1) ?? 0}u in behandeling
          </p>
          {(stats?.pendingHoursCount ?? 0) > 0 && (
            <span className="mt-auto self-start bg-[#F27501]/15 text-[#F27501] text-sm font-bold px-2.5 py-1 rounded-full">
              Actie vereist
            </span>
          )}
        </motion.button>

        {/* Widget 4 — Deze maand */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21, duration: 0.3 }}
          onClick={() => onTabChange("kosten")}
          className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform min-h-[140px]"
        >
          <div className="flex items-center gap-2 text-neutral-500 text-sm font-semibold">
            <TrendingUp className="w-4 h-4" />
            <span>Deze maand</span>
          </div>
          <p className="font-bold text-2xl text-[#F27501] mt-1">
            &euro;{maandBedrag.toLocaleString("nl-NL")}
          </p>
          {budgetTotaal > 0 && (
            <div className="mt-auto space-y-1.5 w-full">
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetWaarschuwing ? "bg-amber-500" : "bg-[#F27501]"}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              <p className="text-neutral-500 text-xs">
                {budgetPct}% van &euro;{budgetTotaal.toLocaleString("nl-NL")} budget
              </p>
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
}
