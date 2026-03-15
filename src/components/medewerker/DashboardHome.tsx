"use client";

import { motion } from "framer-motion";
import { staggerChildren, staggerChild } from "@/lib/design-system/animations";
import InstallBanner from "./InstallBanner";
import { useMedewerkerDashboard } from "@/hooks/queries/useMedewerkerQueries";

interface DashboardHomeProps {
  naam: string;
  onNavigate: (tab: string) => void;
}

export default function DashboardHome({ naam, onNavigate }: DashboardHomeProps) {
  const { data: summary, isLoading } = useMedewerkerDashboard();

  const firstName = naam.split(" ")[0];
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  })();

  const today = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerChildren}
      initial="initial"
      animate="animate"
    >
      {/* Greeting */}
      <motion.div variants={staggerChild}>
        <h2 className="text-3xl font-bold text-[var(--mp-text-primary)]">{greeting}, {firstName}!</h2>
        <p className="text-[var(--mp-text-tertiary)] text-sm mt-1 capitalize">{today}</p>
      </motion.div>

      {/* Volgende dienst - glassmorphism card */}
      <motion.div variants={staggerChild}>
        {summary?.volgendeShift ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F27501] to-[#d96800] p-6 text-white shadow-lg">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Eerstvolgende dienst</span>
              </div>
              <h3 className="text-xl font-bold mb-1">{summary.volgendeShift.klant_naam}</h3>
              <p className="text-white/70 text-sm mb-4">{summary.volgendeShift.locatie}</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-sm font-medium">
                  {formatDate(summary.volgendeShift.datum)}
                </span>
                <span className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-sm font-medium">
                  {summary.volgendeShift.start_tijd?.slice(0, 5)} - {summary.volgendeShift.eind_tijd?.slice(0, 5)}
                </span>
                <span className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-sm font-medium capitalize">
                  {summary.volgendeShift.functie}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] border-2 border-dashed border-[var(--mp-separator)] rounded-3xl p-6 text-center">
            <p className="text-[var(--mp-text-secondary)]">Geen aankomende diensten gepland.</p>
            <button
              onClick={() => onNavigate("diensten")}
              className="mt-3 px-5 py-2.5 bg-[#F27501] text-white rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors"
            >
              Bekijk beschikbare shifts
            </button>
          </div>
        )}
      </motion.div>

      {/* Stats pills - horizontal scroll */}
      {summary && (
        <motion.div variants={staggerChild}>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            <div className="flex-shrink-0 bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl px-5 py-3 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] min-w-[130px]">
              <p className="text-2xl font-bold text-[#F27501]">{summary.totaalDiensten}</p>
              <p className="text-xs text-[var(--mp-text-tertiary)]">Diensten gewerkt</p>
            </div>
            <div className="flex-shrink-0 bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl px-5 py-3 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] min-w-[130px]">
              <p className="text-2xl font-bold text-[#F27501]">{summary.totaalUren}</p>
              <p className="text-xs text-[var(--mp-text-tertiary)]">Uren gewerkt</p>
            </div>
            {summary.openAanbiedingen > 0 && (
              <div className="flex-shrink-0 bg-[#F27501]/10 dark:bg-[#F27501]/20 rounded-2xl px-5 py-3 min-w-[130px]">
                <p className="text-2xl font-bold text-[#F27501]">{summary.openAanbiedingen}</p>
                <p className="text-xs text-[#F27501]/70">Open aanbiedingen</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Action-required alerts */}
      {summary && (summary.openAanbiedingen > 0 || summary.verlopenDocumenten > 0 || summary.ongelezen > 0) && (
        <motion.div variants={staggerChild} className="space-y-2">
          <h3 className="text-xs font-bold text-[var(--mp-text-tertiary)] uppercase tracking-wider">Actie vereist</h3>
          {summary.openAanbiedingen > 0 && (
            <button onClick={() => onNavigate("diensten")} className="w-full flex items-center gap-3 bg-[#F27501]/5 dark:bg-[#F27501]/10 border border-[#F27501]/20 rounded-2xl px-4 py-3.5 text-left hover:bg-[#F27501]/10 transition-colors">
              <div className="w-9 h-9 bg-[#F27501]/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--mp-text-primary)]">{summary.openAanbiedingen} aanbieding{summary.openAanbiedingen !== 1 ? "en" : ""}</p>
                <p className="text-xs text-[var(--mp-text-tertiary)]">Reageer op nieuwe shifts</p>
              </div>
              <svg className="w-4 h-4 text-[var(--mp-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          {summary.verlopenDocumenten > 0 && (
            <button onClick={() => onNavigate("documenten")} className="w-full flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-4 py-3.5 text-left hover:bg-red-100 dark:hover:bg-red-500/15 transition-colors">
              <div className="w-9 h-9 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--mp-text-primary)]">{summary.verlopenDocumenten} document{summary.verlopenDocumenten !== 1 ? "en" : ""}</p>
                <p className="text-xs text-[var(--mp-text-tertiary)]">Verlopen of bijna verlopen</p>
              </div>
              <svg className="w-4 h-4 text-[var(--mp-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          {summary.ongelezen > 0 && (
            <button onClick={() => onNavigate("berichten")} className="w-full flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl px-4 py-3.5 text-left hover:bg-blue-100 dark:hover:bg-blue-500/15 transition-colors">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--mp-text-primary)]">{summary.ongelezen} ongelezen bericht{summary.ongelezen !== 1 ? "en" : ""}</p>
              </div>
              <svg className="w-4 h-4 text-[var(--mp-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </motion.div>
      )}

      {/* Quick-nav 2x2 grid */}
      <motion.div variants={staggerChild}>
        <h3 className="text-xs font-bold text-[var(--mp-text-tertiary)] uppercase tracking-wider mb-3">Snel naar</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { tab: "diensten", label: "Shifts bekijken", icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ), color: "text-[#F27501] bg-[#F27501]/10" },
            { tab: "uren", label: "Uren invullen", icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ), color: "text-blue-500 bg-blue-500/10" },
            { tab: "beschikbaarheid", label: "Beschikbaarheid", icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ), color: "text-green-500 bg-green-500/10" },
            { tab: "profiel", label: "Digitale ID", icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            ), color: "text-purple-500 bg-purple-500/10" },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className="flex flex-col items-start gap-3 bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-4 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                {item.icon}
              </div>
              <span className="text-sm font-medium text-[var(--mp-text-primary)]">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Install Banner */}
      <motion.div variants={staggerChild}>
        <InstallBanner />
      </motion.div>
    </motion.div>
  );
}
