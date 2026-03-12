"use client";

import { useState } from "react";
import type { PortalTab } from "./PortalLayout";

interface PortalBottomNavProps {
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function PortalBottomNav({ tabs, activeTab, onTabChange }: PortalBottomNavProps) {
  const [showMore, setShowMore] = useState(false);
  const hasMore = tabs.length > 4;
  const visibleTabs = hasMore ? tabs.slice(0, 4) : tabs.slice(0, 5);
  const extraTabs = hasMore ? tabs.slice(4) : [];
  const isExtraActive = extraTabs.some((t) => t.id === activeTab);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); setShowMore(false); }}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl min-w-0 flex-1 transition-colors ${
                activeTab === tab.id ? "text-[#F27501]" : "text-neutral-400"
              }`}
            >
              <div className="relative">
                <span className="w-5 h-5 block">{tab.icon}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#F27501] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium truncate max-w-full">{tab.label}</span>
            </button>
          ))}
          {hasMore && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl min-w-0 flex-1 transition-colors ${
                isExtraActive || showMore ? "text-[#F27501]" : "text-neutral-400"
              }`}
            >
              <span className="w-5 h-5 block">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </span>
              <span className="text-[10px] font-medium">Meer</span>
            </button>
          )}
        </div>
      </nav>

      {/* More sheet */}
      {showMore && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setShowMore(false)} />
          <div className="md:hidden fixed bottom-[68px] left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50 safe-area-pb">
            <div className="p-4">
              <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-4" />
              <div className="space-y-1">
                {extraTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { onTabChange(tab.id); setShowMore(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id ? "bg-[#F27501]/10 text-[#F27501]" : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="w-5 h-5">{tab.icon}</span>
                    <span className="flex-1 text-left">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="bg-[#F27501] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {tab.badge > 99 ? "99+" : tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
