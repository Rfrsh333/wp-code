"use client";

import { ChevronRight } from "lucide-react";
import type { AdminTab, SidebarBadgeMap, SidebarGroupConfig, SidebarItemDefinition } from "@/lib/navigation/sidebar-types";
import { getSidebarHref } from "@/lib/navigation/sidebar-config";
import { cn } from "@/lib/utils";
import SidebarItem from "@/components/navigation/SidebarItem";

interface SidebarGroupProps {
  group: SidebarGroupConfig;
  items: SidebarItemDefinition[];
  open: boolean;
  collapsed: boolean;
  showDivider: boolean;
  activeItemIds: Set<string>;
  badges: SidebarBadgeMap;
  pinnedIds: Set<string>;
  onTogglePin: (itemId: string) => void;
  onToggleGroup: (groupId: string) => void;
  onTabSelect?: (tab: AdminTab) => void;
  registerFocusable: (
    key: string
  ) => (element: HTMLAnchorElement | HTMLButtonElement | null) => void;
  onArrowKey: (event: React.KeyboardEvent<HTMLElement>, key: string) => void;
}

export default function SidebarGroup({
  group,
  items,
  open,
  collapsed,
  showDivider,
  activeItemIds,
  badges,
  pinnedIds,
  onTogglePin,
  onToggleGroup,
  onTabSelect,
  registerFocusable,
  onArrowKey,
}: SidebarGroupProps) {
  return (
    <section className={cn(showDivider && "border-t border-neutral-200/80 pt-5")}>
      {!collapsed ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onToggleGroup(group.id)}
          ref={registerFocusable(`group:${group.id}`) as React.Ref<HTMLButtonElement>}
          onKeyDown={(event) => onArrowKey(event, `group:${group.id}`)}
          className={cn(
            "mb-2 flex w-full items-center gap-2 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400 transition",
            "hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F27501]/10"
          )}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          <span>{group.label}</span>
        </button>
      ) : null}

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          collapsed ? "grid-rows-[1fr] opacity-100" : open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"
        )}
      >
        <div className="overflow-hidden">
          <div className={cn("space-y-1", !collapsed && "pl-3")}>
            {items.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                href={getSidebarHref(item)}
                active={activeItemIds.has(item.id)}
                collapsed={collapsed}
                badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                pinned={pinnedIds.has(item.id)}
                onTogglePin={onTogglePin}
                onSelect={item.kind === "tab" && onTabSelect ? () => onTabSelect(item.tab!) : undefined}
                focusRef={registerFocusable(`item:${item.id}`)}
                onKeyDown={(event) => onArrowKey(event, `item:${item.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
