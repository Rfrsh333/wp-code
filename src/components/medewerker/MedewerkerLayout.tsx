"use client";

import PortalLayout from "@/components/portal/PortalLayout";
import type { PortalTab } from "@/components/portal/PortalLayout";

interface MedewerkerLayoutProps {
  children: React.ReactNode;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  userName: string;
  onLogout: () => void;
}

export default function MedewerkerLayout({
  children,
  tabs,
  activeTab,
  onTabChange,
  userName,
  onLogout,
}: MedewerkerLayoutProps) {
  return (
    <PortalLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      portalType="medewerker"
      userName={userName}
      onLogout={onLogout}
    >
      <div className="medewerker-mobile-optimized">
        {children}
      </div>
      <style jsx global>{`
        @media (max-width: 767px) {
          .medewerker-mobile-optimized button,
          .medewerker-mobile-optimized a {
            min-height: 44px;
          }
          .medewerker-mobile-optimized .text-2xl {
            font-size: 1.375rem;
          }
        }
      `}</style>
    </PortalLayout>
  );
}
