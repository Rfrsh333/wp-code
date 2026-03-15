"use client";

import { motion } from "framer-motion";
import { CalendarDays, Euro, Star, TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react";

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

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: "easeOut" },
  }),
};

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
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Budget bijna bereikt</p>
            <p className="text-amber-700 text-xs mt-0.5">
              €{budgetGebruikt.toLocaleString("nl-NL")} van €{budgetTotaal.toLocaleString("nl-NL")} gebruikt ({budgetPct}%)
            </p>
          </div>
        </motion.div>
      )}

      {/* 2×2 widget grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Widget 1 — Volgende dienst */}
        <motion.button
          custom={0} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("rooster")}
          className="bg-[#1e3a5f] text-white rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Volgende dienst</span>
          </div>
          {volgendeDienst ? (
            <>
              <p className="font-bold text-sm leading-tight">{volgendeDienst.functie}</p>
              <p className="text-white/70 text-xs truncate">{volgendeDienst.locatie}</p>
              <span className="mt-auto self-start bg-[#F27501] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {volgendeDienst.start_tijd?.slice(0, 5)}
              </span>
            </>
          ) : (
            <p className="text-white/50 text-sm">Geen gepland</p>
          )}
        </motion.button>

        {/* Widget 2 — Openstaande facturen */}
        <motion.button
          custom={1} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("facturen")}
          className="bg-white border border-[var(--kp-border)] rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-[var(--kp-text-tertiary)] text-xs font-medium">
            <Euro className="w-3.5 h-3.5" />
            <span>Openstaand</span>
          </div>
          <p className="font-bold text-2xl text-[var(--kp-text-primary)]">
            €{openBedrag.toLocaleString("nl-NL")}
          </p>
          <div className="mt-auto flex items-center gap-1.5">
            {(stats?.openFacturenCount ?? 0) > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {stats?.openFacturenCount} factuur{stats?.openFacturenCount !== 1 ? "en" : ""}
              </span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--kp-text-tertiary)]" />
          </div>
        </motion.button>

        {/* Widget 3 — Uren goed te keuren */}
        <motion.button
          custom={2} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("uren")}
          className="bg-white border border-[var(--kp-border)] rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-[var(--kp-text-tertiary)] text-xs font-medium">
            <Star className="w-3.5 h-3.5" />
            <span>Uren goed te keuren</span>
          </div>
          <p className="font-bold text-2xl text-[var(--kp-text-primary)]">
            {stats?.pendingHoursCount ?? 0}
          </p>
          <p className="text-[var(--kp-text-tertiary)] text-xs">
            {stats?.pendingHoursTotal?.toFixed(1) ?? 0}u in behandeling
          </p>
          {(stats?.pendingHoursCount ?? 0) > 0 && (
            <span className="mt-auto self-start bg-[#F27501]/10 text-[#F27501] text-xs font-semibold px-2 py-0.5 rounded-full">
              Actie vereist
            </span>
          )}
        </motion.button>

        {/* Widget 4 — Deze maand */}
        <motion.button
          custom={3} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("kosten")}
          className="bg-white border border-[var(--kp-border)] rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-[var(--kp-text-tertiary)] text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Deze maand</span>
          </div>
          <p className="font-bold text-xl text-[#F27501]">
            €{maandBedrag.toLocaleString("nl-NL")}
          </p>
          {budgetTotaal > 0 && (
            <div className="mt-1 space-y-1">
              <div className="h-1.5 bg-[var(--kp-bg-page)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetWaarschuwing ? "bg-amber-500" : "bg-[#F27501]"}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              <p className="text-[var(--kp-text-tertiary)] text-[10px]">
                {budgetPct}% van €{budgetTotaal.toLocaleString("nl-NL")} budget
              </p>
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
}
