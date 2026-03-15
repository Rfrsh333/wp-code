"use client";

import MedewerkerPortalLayout from "./MedewerkerPortalLayout";

interface PortalTab {
  id: string;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface MedewerkerLayoutProps {
  children: React.ReactNode;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  userName: string;
  onLogout: () => void;
  ongelezen?: number;
}

export default function MedewerkerLayout({
  children,
  tabs,
  activeTab,
  onTabChange,
  userName,
  onLogout,
  ongelezen = 0,
}: MedewerkerLayoutProps) {
  return (
    <MedewerkerPortalLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      userName={userName}
      onLogout={onLogout}
      ongelezen={ongelezen}
    >
      {children}
    </MedewerkerPortalLayout>
  );
}
