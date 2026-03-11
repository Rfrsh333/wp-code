"use client";

import type { PortalTab } from "./PortalLayout";

interface PortalBottomNavProps {
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function PortalBottomNav({ tabs, activeTab, onTabChange }: PortalBottomNavProps) {
  // Show max 5 tabs on mobile, take first 5
  const visibleTabs = tabs.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl min-w-0 flex-1 transition-colors ${
              activeTab === tab.id
                ? "text-[#F27501]"
                : "text-neutral-400"
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
      </div>
    </nav>
  );
}
