"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarRange,
  Gauge,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminTab, SidebarBadgeMap } from "@/lib/navigation/sidebar-types";

interface MobileBottomNavProps {
  activeTab?: AdminTab;
  badges?: SidebarBadgeMap;
  onTabSelect?: (tab: AdminTab) => void;
  onOpenSidebar?: () => void;
}

const bottomNavItems = [
  { id: "overzicht", label: "Home", icon: Gauge, tab: "overzicht" as AdminTab },
  { id: "aanvragen", label: "Aanvragen", icon: BriefcaseBusiness, tab: "aanvragen" as AdminTab, badgeKey: "aanvragenNieuw" as const },
  { id: "inschrijvingen", label: "Kandidaten", icon: Users, tab: "inschrijvingen" as AdminTab, badgeKey: "inschrijvingenNieuw" as const },
  { id: "planning", label: "Planning", icon: CalendarRange, tab: "planning" as AdminTab },
  { id: "meer", label: "Meer", icon: MoreHorizontal, tab: null },
] as const;

export default function MobileBottomNav({
  activeTab,
  badges,
  onTabSelect,
  onOpenSidebar,
}: MobileBottomNavProps) {
  const router = useRouter();

  const handleTap = useCallback(
    (item: (typeof bottomNavItems)[number]) => {
      if (item.tab === null) {
        onOpenSidebar?.();
        return;
      }
      onTabSelect?.(item.tab);
      if (item.tab === "overzicht") {
        router.push("/admin");
      } else {
        router.push(`/admin?tab=${item.tab}`);
      }
    },
    [onTabSelect, onOpenSidebar, router]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around px-1">
        {bottomNavItems.map((item) => {
          const isActive = item.tab !== null && activeTab === item.tab;
          const Icon = item.icon;
          const badgeCount = item.id !== "meer" && "badgeKey" in item && item.badgeKey
            ? badges?.[item.badgeKey]
            : undefined;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTap(item)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-[#F27501]"
                  : "text-neutral-400 active:text-neutral-600"
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5", isActive && "text-[#F27501]")} />
                {badgeCount && badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#F27501]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
