"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface KlantTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface KlantBottomNavProps {
  tabs: KlantTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const PRIMAIRE_TAB_IDS = ["overzicht", "aanvragen", "rooster", "uren"];

export default function KlantBottomNav({ tabs, activeTab, onTabChange }: KlantBottomNavProps) {
  const [showMore, setShowMore] = useState(false);

  const primaireTabs = tabs.filter((t) => PRIMAIRE_TAB_IDS.includes(t.id));
  const extraTabs = tabs.filter((t) => !PRIMAIRE_TAB_IDS.includes(t.id));
  const isExtraActive = extraTabs.some((t) => t.id === activeTab);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--kp-border)] z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around" style={{ height: 49 }}>
          {primaireTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { onTabChange(tab.id); setShowMore(false); }}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--kp-primary)] rounded-b-full" />
                )}
                <div className="relative">
                  <span className={`w-5 h-5 block ${isActive ? "text-[var(--kp-primary)]" : "text-[var(--kp-text-tertiary)]"}`}>
                    {tab.icon}
                  </span>
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-[var(--kp-accent)] text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-[var(--kp-primary)]" : "text-[var(--kp-text-tertiary)]"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Meer knop */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
          >
            {(isExtraActive || showMore) && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--kp-primary)] rounded-b-full" />
            )}
            <span className={`w-5 h-5 block ${isExtraActive || showMore ? "text-[var(--kp-primary)]" : "text-[var(--kp-text-tertiary)]"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </span>
            <span className={`text-[10px] font-medium ${isExtraActive || showMore ? "text-[var(--kp-primary)]" : "text-[var(--kp-text-tertiary)]"}`}>
              Meer
            </span>
          </button>
        </div>
      </nav>

      {/* Meer sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="md:hidden fixed bottom-[49px] left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <div className="p-4">
                <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-4" />
                <div className="space-y-1">
                  {extraTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { onTabChange(tab.id); setShowMore(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-[var(--kp-primary-light)] text-[var(--kp-primary)]"
                          : "text-[var(--kp-text-secondary)] hover:bg-neutral-50"
                      }`}
                    >
                      <span className="w-5 h-5">{tab.icon}</span>
                      <span className="flex-1 text-left">{tab.label}</span>
                      {tab.badge != null && tab.badge > 0 && (
                        <span className="bg-[var(--kp-accent)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {tab.badge > 99 ? "99+" : tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
