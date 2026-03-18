"use client";

import { type ReactNode, useState } from "react";
import { Bell, ChevronRight, Menu, X } from "lucide-react";
import Image from "next/image";
import MarketingSidebar from "@/components/navigation/MarketingSidebar";
import type {
  MarketingTab,
  MarketingSidebarBadgeMap,
  MarketingSidebarItemDefinition,
} from "@/lib/navigation/marketing-sidebar-types";
import {
  marketingSidebarItems,
  marketingSidebarGroups,
} from "@/lib/navigation/marketing-sidebar-config";

interface MarketingShellProps {
  children: ReactNode;
  activeTab?: MarketingTab;
  badges?: MarketingSidebarBadgeMap;
  onTabSelect?: (tab: MarketingTab) => void;
}

function getPageTitle(activeTab?: MarketingTab): string {
  if (!activeTab) return "Dashboard";
  const item = marketingSidebarItems.find(
    (i) => i.kind === "tab" && i.tab === activeTab
  );
  return item?.title || "Dashboard";
}

function getGroupLabel(activeTab?: MarketingTab): string | null {
  if (!activeTab) return null;
  const item = marketingSidebarItems.find(
    (i) => i.kind === "tab" && i.tab === activeTab
  );
  if (!item) return null;
  const group = marketingSidebarGroups.find((g) => g.itemIds.includes(item.id));
  return group?.label || null;
}

export default function MarketingShell({
  children,
  activeTab,
  badges = {},
  onTabSelect,
}: MarketingShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pageTitle = getPageTitle(activeTab);
  const groupLabel = getGroupLabel(activeTab);

  const totalBadges = Object.values(badges).reduce(
    (sum, v) => sum + (v || 0),
    0
  );

  const handleTabSelect = (tab: MarketingTab) => {
    setMobileSidebarOpen(false);
    onTabSelect?.(tab);
  };

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-neutral-950 lg:flex">
      {/* Sidebar — desktop */}
      <MarketingSidebar
        activeTab={activeTab}
        badges={badges}
        onTabSelect={onTabSelect}
      />

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[320px] animate-in slide-in-from-left duration-200">
            <MarketingSidebar
              activeTab={activeTab}
              badges={badges}
              onTabSelect={handleTabSelect}
              forceVisible
            />
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 shadow-lg"
          >
            <X className="h-5 w-5 text-neutral-700" />
          </button>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-neutral-200/80 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-xl p-2 text-neutral-600 hover:bg-neutral-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Image
              src="/favicon-icon.png"
              alt="TopTalent"
              width={32}
              height={32}
              className="shrink-0"
            />
          </div>
          {totalBadges > 0 && (
            <span className="relative rounded-xl p-2 text-neutral-400">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {totalBadges > 99 ? "99+" : totalBadges}
              </span>
            </span>
          )}
        </div>

        {/* Desktop header bar */}
        <div className="hidden lg:flex items-center justify-between border-b border-neutral-200/80 bg-white/60 backdrop-blur-sm px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>Marketing</span>
            {groupLabel && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>{groupLabel}</span>
              </>
            )}
            {pageTitle !== "Dashboard" && pageTitle !== groupLabel && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-medium text-neutral-900">{pageTitle}</span>
              </>
            )}
          </div>
          {totalBadges > 0 && (
            <span className="relative text-neutral-400">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {totalBadges > 99 ? "99+" : totalBadges}
              </span>
            </span>
          )}
        </div>

        <div className="px-4 py-4 pb-20 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
