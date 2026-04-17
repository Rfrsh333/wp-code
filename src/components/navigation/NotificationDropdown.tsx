"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Users, UserPlus, MessageSquare, Calculator, FileText } from "lucide-react";
import type { SidebarBadgeMap, SidebarBadgeKey } from "@/lib/navigation/sidebar-types";
import type { AdminTab } from "@/lib/navigation/sidebar-types";

interface NotificationDropdownProps {
  badges: SidebarBadgeMap;
  totalBadges: number;
  onNavigate?: (tab: AdminTab) => void;
  size?: "sm" | "md";
}

const badgeConfig: {
  key: SidebarBadgeKey;
  label: string;
  tab: AdminTab;
  icon: typeof Bell;
}[] = [
  { key: "aanvragenNieuw", label: "Personeel aanvragen", tab: "aanvragen", icon: Users },
  { key: "inschrijvingenNieuw", label: "Nieuwe inschrijvingen", tab: "inschrijvingen", icon: UserPlus },
  { key: "contactNieuw", label: "Contactberichten", tab: "contact", icon: MessageSquare },
  { key: "calculatorTotaal", label: "Calculator aanvragen", tab: "calculator", icon: Calculator },
  { key: "offertesConcepten", label: "Offerte concepten", tab: "offertes", icon: FileText },
];

export default function NotificationDropdown({
  badges,
  totalBadges,
  onNavigate,
  size = "md",
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const activeItems = badgeConfig.filter((item) => (badges[item.key] ?? 0) > 0);
  const iconSize = size === "sm" ? "h-5 w-5" : "h-4.5 w-4.5";
  const badgeOffset = size === "sm" ? "right-1 top-1" : "-right-1.5 -top-1.5";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
        aria-label={`${totalBadges} meldingen`}
      >
        <Bell className={iconSize} />
        {totalBadges > 0 && (
          <span
            className={`absolute ${badgeOffset} flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white`}
          >
            {totalBadges > 99 ? "99+" : totalBadges}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-900">Meldingen</p>
          </div>

          {activeItems.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-neutral-400">Geen nieuwe meldingen</p>
            </div>
          ) : (
            <div className="py-1">
              {activeItems.map((item) => {
                const count = badges[item.key] ?? 0;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.(item.tab);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[#F27501]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                    </div>
                    <span className="flex-shrink-0 bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
