"use client";

import type { SidebarBadgeMap, SidebarItemDefinition } from "@/lib/navigation/sidebar-types";
import { getSidebarHref } from "@/lib/navigation/sidebar-config";
import SidebarItem from "@/components/navigation/SidebarItem";

interface SidebarFavoritesProps {
  items: SidebarItemDefinition[];
  activeItemIds: Set<string>;
  badges: SidebarBadgeMap;
  collapsed: boolean;
  pinnedIds: Set<string>;
  onTogglePin: (itemId: string) => void;
  onTabSelect?: (tab: import("@/lib/navigation/sidebar-types").AdminTab) => void;
  registerFocusable: (
    key: string
  ) => (element: HTMLAnchorElement | HTMLButtonElement | null) => void;
  onArrowKey: (event: React.KeyboardEvent<HTMLElement>, key: string) => void;
}

export default function SidebarFavorites({
  items,
  activeItemIds,
  badges,
  collapsed,
  pinnedIds,
  onTogglePin,
  onTabSelect,
  registerFocusable,
  onArrowKey,
}: SidebarFavoritesProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className={collapsed ? "" : "space-y-2"}>
      {!collapsed ? (
        <div className="px-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
            Favorites
          </p>
        </div>
      ) : null}
      <div className="space-y-1">
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
            focusRef={registerFocusable(`favorite:${item.id}`)}
            onKeyDown={(event) => onArrowKey(event, `favorite:${item.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
