"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/navigation/Sidebar";
import type { AdminTab, SidebarBadgeMap } from "@/lib/navigation/sidebar-types";

interface AdminShellProps {
  children: ReactNode;
  activeTab?: AdminTab;
  badges?: SidebarBadgeMap;
  onTabSelect?: (tab: AdminTab) => void;
}

export default function AdminShell({
  children,
  activeTab,
  badges,
  onTabSelect,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#f3f5f7] text-neutral-950 lg:flex">
      <Sidebar activeTab={activeTab} badges={badges} onTabSelect={onTabSelect} />
      <main className="min-w-0 flex-1">
        <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
