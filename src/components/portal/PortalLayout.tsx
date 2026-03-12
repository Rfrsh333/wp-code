"use client";

import { useState } from "react";
import PortalSidebar from "./PortalSidebar";
import PortalBottomNav from "./PortalBottomNav";

export interface PortalTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  group?: string;
}

interface PortalLayoutProps {
  children: React.ReactNode;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  portalType: "admin" | "medewerker" | "klant";
  userName: string;
  onLogout: () => void;
}

export default function PortalLayout({
  children,
  tabs,
  activeTab,
  onTabChange,
  portalType,
  userName,
  onLogout,
}: PortalLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const portalLabels = {
    admin: "Admin Portal",
    medewerker: "Medewerker Portal",
    klant: "Klant Portal",
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop sidebar - hidden on mobile */}
      <PortalSidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        portalLabel={portalLabels[portalType]}
        userName={userName}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 pb-20 md:pb-0 ${sidebarCollapsed ? "md:ml-20" : "md:ml-[280px]"}`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav - hidden on desktop */}
      <PortalBottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  );
}
