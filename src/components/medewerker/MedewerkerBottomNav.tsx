"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import BottomSheet from "./BottomSheet";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface MedewerkerBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  badges: {
    diensten?: number;
    uren?: number;
  };
}

const SECONDARY_TABS = [
  { id: "beschikbaarheid", label: "Beschikbaarheid", icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ) },
  { id: "financieel", label: "Financieel", icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) },
  { id: "documenten", label: "Documenten", icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ) },
  { id: "profiel", label: "Mijn Profiel", icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ) },
  { id: "referral", label: "Verwijs & Verdien", icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ) },
];

export default function MedewerkerBottomNav({ activeTab, onTabChange, badges }: MedewerkerBottomNavProps) {
  const [showMore, setShowMore] = useState(false);

  const primaryTabs: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "diensten",
      label: "Shifts",
      badge: badges.diensten,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "uren",
      label: "Uren",
      badge: badges.uren,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "more",
      label: "Meer",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  ];

  const isSecondaryActive = SECONDARY_TABS.some((t) => t.id === activeTab);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[80] md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="glass border-t border-[var(--mp-separator)]">
          <div className="flex items-center justify-around px-2 h-[var(--mp-nav-height)]">
            {primaryTabs.map((tab) => {
              const isActive = tab.id === "more" ? isSecondaryActive || showMore : tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "more") {
                      setShowMore(true);
                    } else {
                      onTabChange(tab.id);
                      setShowMore(false);
                    }
                  }}
                  className="relative flex flex-col items-center justify-center gap-0.5 w-16 py-1"
                >
                  <div className="relative">
                    <div className={`transition-colors ${isActive ? "text-[#F27501]" : "text-[var(--mp-text-tertiary)]"}`}>
                      {tab.icon}
                    </div>
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-[#FF453A] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-[#F27501]" : "text-[var(--mp-text-tertiary)]"}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -top-0.5 w-6 h-0.5 bg-[#F27501] rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <BottomSheet isOpen={showMore} onClose={() => setShowMore(false)} title="Meer opties">
        <div className="space-y-1">
          {SECONDARY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
                setShowMore(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-[#F27501]/10 text-[#F27501]"
                  : "text-[var(--mp-text-primary)] hover:bg-[var(--mp-bg)]"
              }`}
            >
              <span className={activeTab === tab.id ? "text-[#F27501]" : "text-[var(--mp-text-secondary)]"}>
                {tab.icon}
              </span>
              <span className="text-sm font-medium">{tab.label}</span>
              <svg className="w-4 h-4 ml-auto text-[var(--mp-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
