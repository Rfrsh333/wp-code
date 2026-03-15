"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MedewerkerBottomNav from "./MedewerkerBottomNav";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

interface PortalTab {
  id: string;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface MedewerkerPortalLayoutProps {
  children: React.ReactNode;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  userName: string;
  onLogout: () => void;
  ongelezen?: number;
}

export default function MedewerkerPortalLayout({
  children,
  tabs,
  activeTab,
  onTabChange,
  userName,
  onLogout,
  ongelezen = 0,
}: MedewerkerPortalLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Group tabs for sidebar
  const groups = tabs.reduce<Record<string, PortalTab[]>>((acc, tab) => {
    const group = tab.group || "OVERIG";
    if (!acc[group]) acc[group] = [];
    acc[group].push(tab);
    return acc;
  }, {});

  const dienstenBadge = tabs.find((t) => t.id === "diensten")?.badge;
  const urenBadge = tabs.find((t) => t.id === "uren")?.badge;

  return (
    <div className="min-h-screen bg-[var(--mp-bg)] transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 flex-col w-60 glass border-r border-[var(--mp-separator)]">
        {/* Logo */}
        <div className="p-5 border-b border-[var(--mp-separator)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#F27501] rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">TT</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--mp-text-primary)]">TopTalent</p>
              <p className="text-[10px] text-[var(--mp-text-tertiary)]">Medewerker Portaal</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {Object.entries(groups).map(([group, groupTabs]) => (
            <div key={group} className="mb-4">
              <p className="text-[10px] font-bold text-[var(--mp-text-tertiary)] uppercase tracking-wider px-3 mb-1.5">
                {group}
              </p>
              {groupTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                    activeTab === tab.id
                      ? "bg-[#F27501]/10 text-[#F27501]"
                      : "text-[var(--mp-text-secondary)] hover:bg-[var(--mp-bg)] hover:text-[var(--mp-text-primary)]"
                  }`}
                >
                  <span className={`${activeTab === tab.id ? "text-[#F27501]" : ""}`}>
                    {tab.icon}
                  </span>
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className="min-w-[20px] h-5 bg-[#FF453A] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-[var(--mp-separator)] space-y-3">
          <div className="flex items-center justify-between">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F27501]/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-[#F27501]">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--mp-text-primary)] truncate">{userName}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-[var(--mp-text-tertiary)] hover:text-[var(--mp-danger)] transition-colors"
              title="Uitloggen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[70] glass border-b border-[var(--mp-separator)]">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#F27501] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">TT</span>
            </div>
            <span className="text-sm font-bold text-[var(--mp-text-primary)]">TopTalent</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell count={ongelezen} onClick={() => onTabChange("berichten")} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-60 pt-12 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8 max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MedewerkerBottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        badges={{
          diensten: dienstenBadge,
          uren: urenBadge,
          berichten: ongelezen,
        }}
      />
    </div>
  );
}
