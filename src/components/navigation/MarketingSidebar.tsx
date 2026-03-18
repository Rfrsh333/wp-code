"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  marketingSidebarItems,
  marketingSidebarGroups,
} from "@/lib/navigation/marketing-sidebar-config";
import type {
  MarketingTab,
  MarketingSidebarBadgeMap,
} from "@/lib/navigation/marketing-sidebar-types";
import { cn } from "@/lib/utils";

interface MarketingSidebarProps {
  activeTab?: MarketingTab;
  badges?: MarketingSidebarBadgeMap;
  onTabSelect?: (tab: MarketingTab) => void;
  forceVisible?: boolean;
}

export default function MarketingSidebar({
  activeTab,
  badges = {},
  onTabSelect,
  forceVisible,
}: MarketingSidebarProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Overzicht": true,
    "Content": true,
    "Social Media": true,
    "Acquisitie": true,
    "Analyse": true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:w-[280px] bg-white border-r border-neutral-200/80 shadow-sm",
        forceVisible && "!flex"
      )}
    >
      {/* Logo & Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-100">
        <Image
          src="/logo.png"
          alt="TopTalent"
          width={40}
          height={40}
          className="shrink-0"
        />
        <div>
          <h1 className="text-lg font-bold text-neutral-900">TopTalent</h1>
          <p className="text-xs text-[#F27501] font-medium">Marketing</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {marketingSidebarGroups.map((group) => {
          const isExpanded = expandedGroups[group.label] ?? true;
          const groupItems = marketingSidebarItems.filter((item) =>
            group.itemIds.includes(item.id)
          );

          return (
            <div key={group.label}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {groupItems.map((item) => {
                    const isActive = item.tab === activeTab;
                    const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => item.tab && onTabSelect?.(item.tab)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          isActive
                            ? "bg-[#F27501] text-white shadow-md"
                            : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 text-left">{item.title}</span>
                        {badge !== undefined && badge > 0 && (
                          <span
                            className={cn(
                              "flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold",
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-[#F27501] text-white"
                            )}
                          >
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-neutral-100 p-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-50">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F27501] text-white text-sm font-bold">
            {userEmail?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">
              {userEmail || "Marketing User"}
            </p>
            <p className="text-xs text-neutral-500">Marketing Team</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            title="Uitloggen"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
