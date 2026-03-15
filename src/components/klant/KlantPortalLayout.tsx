"use client";

import { motion, AnimatePresence } from "framer-motion";
import KlantBottomNav, { KlantTab } from "./KlantBottomNav";

interface KlantPortalLayoutProps {
  children: React.ReactNode;
  tabs: KlantTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  bedrijfsnaam: string;
  contactpersoon: string;
  onLogout: () => void;
}

export type { KlantTab };

export default function KlantPortalLayout({
  children,
  tabs,
  activeTab,
  onTabChange,
  bedrijfsnaam,
  contactpersoon,
  onLogout,
}: KlantPortalLayoutProps) {
  return (
    <div className="klant-portal min-h-screen bg-[var(--kp-bg-page)] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] min-h-screen bg-[#1e3a5f] fixed left-0 top-0 bottom-0 z-30">
        {/* Logo + bedrijfsnaam */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F27501] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">TT</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm leading-tight truncate">{bedrijfsnaam}</p>
              <p className="text-blue-300 text-xs">Klant Portaal</p>
            </div>
          </div>
        </div>

        {/* Navigatie */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm mb-1 transition-colors ${
                  isActive
                    ? "bg-white/15 text-white font-semibold"
                    : "text-blue-200 hover:bg-white/[0.08] hover:text-white font-medium"
                }`}
              >
                <span className="w-5 h-5 flex-shrink-0">{tab.icon}</span>
                <span className="flex-1 text-left truncate">{tab.label}</span>
                {tab.badge != null && tab.badge > 0 && (
                  <span className="bg-[#F27501] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer: gebruiker + logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-blue-200 text-xs mb-2 truncate">{contactpersoon}</p>
          <button
            onClick={onLogout}
            className="text-blue-300 hover:text-white text-xs transition-colors"
          >
            Uitloggen &rarr;
          </button>
        </div>
      </aside>

      {/* Hoofdcontent */}
      <main className="flex-1 md:ml-[260px] pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="p-4 md:p-6 max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobiele bottom nav */}
      <KlantBottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  );
}
