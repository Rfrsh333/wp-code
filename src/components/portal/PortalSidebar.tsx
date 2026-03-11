"use client";

import Image from "next/image";
import type { PortalTab } from "./PortalLayout";

interface PortalSidebarProps {
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  portalLabel: string;
  userName: string;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function PortalSidebar({
  tabs,
  activeTab,
  onTabChange,
  portalLabel,
  userName,
  onLogout,
  collapsed,
  onToggleCollapse,
}: PortalSidebarProps) {
  return (
    <aside
      className={`hidden md:flex flex-col fixed top-0 left-0 h-screen bg-white border-r border-neutral-200 z-40 transition-all duration-300 ${
        collapsed ? "w-20" : "w-[280px]"
      }`}
    >
      {/* Logo & portal label */}
      <div className="p-5 border-b border-neutral-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#F27501] rounded-xl flex items-center justify-center flex-shrink-0">
          <Image src="/logo.svg" alt="TopTalent" width={24} height={24} className="invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-white font-bold text-sm">TT</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-neutral-900 text-sm truncate">TopTalent</p>
            <p className="text-xs text-neutral-500 truncate">{portalLabel}</p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#F27501]/10 text-[#F27501]"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
              title={collapsed ? tab.label : undefined}
            >
              <span className="flex-shrink-0 w-5 h-5">{tab.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="bg-[#F27501] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#F27501] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* User info & logout */}
      <div className="border-t border-neutral-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-neutral-600">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{userName}</p>
              <button
                onClick={onLogout}
                className="text-xs text-neutral-500 hover:text-red-600 transition-colors"
              >
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
