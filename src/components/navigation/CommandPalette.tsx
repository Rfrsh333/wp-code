"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  allSidebarItems,
  getSidebarHref,
  sidebarGroups,
  sidebarItems,
} from "@/lib/navigation/sidebar-config";
import type { AdminTab, SidebarBadgeMap, SidebarItemDefinition } from "@/lib/navigation/sidebar-types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTabSelect?: (tab: AdminTab) => void;
  badges?: SidebarBadgeMap;
}

const groupLabelMap: Record<string, string> = {
  dashboard: "Dashboard",
  recruitment: "Recruitment",
  finance: "Finance",
  support: "Support",
  marketing: "Growth",
  content: "Content",
  system: "System",
};

function findGroupForItem(itemId: string): string | null {
  for (const group of sidebarGroups) {
    if (group.itemIds.includes(itemId)) {
      return group.id;
    }
  }
  return null;
}

export default function CommandPalette({
  open,
  onOpenChange,
  onTabSelect,
  badges,
}: CommandPaletteProps) {
  const router = useRouter();
  const [recentTabs, setRecentTabs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tt-recent-tabs");
      if (stored) setRecentTabs(JSON.parse(stored));
    } catch {}
  }, [open]);

  const addToRecent = useCallback((itemId: string) => {
    setRecentTabs((prev) => {
      const next = [itemId, ...prev.filter((id) => id !== itemId)].slice(0, 5);
      try {
        localStorage.setItem("tt-recent-tabs", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (itemId: string) => {
      const item = allSidebarItems.find((i) => i.id === itemId);
      if (!item) return;

      addToRecent(itemId);
      onOpenChange(false);

      if (item.kind === "tab" && item.tab && onTabSelect) {
        onTabSelect(item.tab);
        router.push(getSidebarHref(item));
      } else {
        router.push(getSidebarHref(item));
      }
    },
    [addToRecent, onOpenChange, onTabSelect, router]
  );

  // Groepeer items per sidebar group
  const groupedItems = sidebarGroups.map((group) => ({
    ...group,
    label: groupLabelMap[group.id] || group.label,
    items: group.itemIds
      .map((id) => sidebarItems[id as keyof typeof sidebarItems] as SidebarItemDefinition)
      .filter(Boolean),
  }));

  // Recent items (cast nodig vanwege satisfies pattern in sidebar-config)
  const allItems: SidebarItemDefinition[] = allSidebarItems;
  const recentItems = recentTabs
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is SidebarItemDefinition => Boolean(item));

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Navigatie"
      description="Zoek en navigeer naar secties"
    >
      <CommandInput placeholder="Zoek een sectie..." />
      <CommandList>
        <CommandEmpty>Geen resultaten gevonden.</CommandEmpty>

        {recentItems.length > 0 && (
          <CommandGroup heading="Recent">
            {recentItems.map((item) => {
              if (!item) return null;
              const Icon = item.icon;
              const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;
              return (
                <CommandItem
                  key={`recent-${item.id}`}
                  value={`${item.title} ${(item.keywords || []).join(" ")}`}
                  onSelect={() => handleSelect(item.id)}
                >
                  <Icon className="mr-2 h-4 w-4 text-neutral-500" />
                  <span>{item.title}</span>
                  {badge && badge > 0 && (
                    <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                      {badge}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {groupedItems.map((group) => (
          <CommandGroup key={group.id} heading={group.label}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;
              return (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${(item.keywords || []).join(" ")}`}
                  onSelect={() => handleSelect(item.id)}
                >
                  <Icon className="mr-2 h-4 w-4 text-neutral-500" />
                  <span>{item.title}</span>
                  {badge && badge > 0 && (
                    <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                      {badge}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
