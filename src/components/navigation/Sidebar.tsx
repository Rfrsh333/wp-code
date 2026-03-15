"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  allSidebarItems,
  getSidebarHref,
  sidebarDefaultGroupState,
  sidebarGroups,
  sidebarItems,
  sidebarQuickAccess,
} from "@/lib/navigation/sidebar-config";
import {
  readCollapsedGroups,
  readFavoriteIds,
  readSidebarCollapsed,
  writeCollapsedGroups,
  writeFavoriteIds,
  writeSidebarCollapsed,
} from "@/lib/navigation/sidebar-storage";
import type { AdminTab, SidebarBadgeMap, SidebarItemDefinition } from "@/lib/navigation/sidebar-types";
import { cn } from "@/lib/utils";
import SidebarCollapsedToggle from "@/components/navigation/SidebarCollapsedToggle";
import SidebarFavorites from "@/components/navigation/SidebarFavorites";
import SidebarGroup from "@/components/navigation/SidebarGroup";
import SidebarItem from "@/components/navigation/SidebarItem";
import SidebarSearch from "@/components/navigation/SidebarSearch";

interface SidebarProps {
  activeTab?: AdminTab;
  badges?: SidebarBadgeMap;
  onTabSelect?: (tab: AdminTab) => void;
  forceVisible?: boolean;
}

export default function Sidebar({ activeTab, badges = {}, onTabSelect, forceVisible }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const focusableRefs = useRef<Record<string, HTMLButtonElement | HTMLAnchorElement | null>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => setStorageReady(true), []);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);
  const [query, setQuery] = useState("");
  const [collapsedState, setCollapsedState] = useState<boolean | null>(null);
  const [favoriteIdsState, setFavoriteIdsState] = useState<string[] | null>(null);
  const [groupStateState, setGroupStateState] = useState<Record<string, boolean> | null>(null);
  const collapsed = collapsedState ?? (storageReady ? readSidebarCollapsed() : false);
  const favoriteIds = favoriteIdsState ?? (storageReady ? readFavoriteIds() : []);
  const groupState = groupStateState ?? (
    storageReady
      ? {
          ...sidebarDefaultGroupState,
          ...readCollapsedGroups(),
        }
      : sidebarDefaultGroupState
  );

  const activeItemIds = (() => {
    const result = new Set<string>();

    allSidebarItems.forEach((item) => {
      if (item.kind === "tab") {
        if (pathname === "/admin" && activeTab && item.tab === activeTab) {
          result.add(item.id);
        }
        return;
      }

      const href = item.href ?? "";
      const routeMatch = item.routeMatch ?? "exact";
      const isMatch =
        routeMatch === "prefix"
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === href;

      if (isMatch) {
        result.add(item.id);
      }
    });

    return result;
  })();

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (item: SidebarItemDefinition) => {
    if (!normalizedQuery) {
      return true;
    }

    return [item.title, ...(item.keywords ?? [])].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  };

  const favoriteItems: SidebarItemDefinition[] = favoriteIds
    .map((id) => allSidebarItems.find((item) => item.id === id))
    .flatMap((item) => (item ? [item] : []))
    .filter((item) => matchesQuery(item));

  const visibleQuickItems: SidebarItemDefinition[] = sidebarQuickAccess
    .map((id) => sidebarItems[id as keyof typeof sidebarItems])
    .filter((item) => matchesQuery(item));

  const visibleGroups: Array<(typeof sidebarGroups)[number] & { items: SidebarItemDefinition[] }> = sidebarGroups
    .map((group) => ({
      ...group,
      items: group.itemIds
        .map((id) => sidebarItems[id as keyof typeof sidebarItems])
        .filter((item) => matchesQuery(item)),
    }))
    .filter((group) => group.items.length > 0);

  const resolvedGroupState = (() => {
    const next = { ...groupState };

    visibleGroups.forEach((group) => {
      const containsActiveItem = group.items.some((item) => activeItemIds.has(item.id));
      if (normalizedQuery || containsActiveItem) {
        next[group.id] = true;
      }
    });

    return next;
  })();

  const collapsedItems = (() => {
    const seen = new Set<string>();
    const list: SidebarItemDefinition[] = [];
    [...favoriteItems, ...visibleQuickItems, ...visibleGroups.flatMap((group) => group.items), sidebarItems.settings].forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        list.push(item);
      }
    });
    return list;
  })();

  const togglePin = (itemId: string) => {
    setFavoriteIdsState((currentState) => {
      const current = currentState ?? favoriteIds;
      const next = current.includes(itemId)
        ? current.filter((value) => value !== itemId)
        : [...current, itemId];
      writeFavoriteIds(next);
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setGroupStateState((currentState) => {
      const current = currentState ?? groupState;
      const next = {
        ...current,
        [groupId]: !current[groupId],
      };
      writeCollapsedGroups(next);
      return next;
    });
  };

  const toggleCollapsed = () => {
    setCollapsedState((currentState) => {
      const current = currentState ?? collapsed;
      const next = !current;
      writeSidebarCollapsed(next);
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingInField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (!isTypingInField && event.key === "/") {
        event.preventDefault();
        if (!collapsed) {
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsed]);

  const focusableKeys = (() => {
    const keys: string[] = [];
    if (!collapsed) {
      keys.push(...favoriteItems.map((item) => `favorite:${item.id}`));
      keys.push(...visibleQuickItems.map((item) => `quick:${item.id}`));
      visibleGroups.forEach((group) => {
        keys.push(`group:${group.id}`);
        if (resolvedGroupState[group.id]) {
          keys.push(...group.items.map((item) => `item:${item.id}`));
        }
      });
      keys.push("footer:settings");
      keys.push("footer:logout");
      return keys;
    }

    keys.push(...collapsedItems.map((item) => `collapsed:${item.id}`));
    keys.push("collapsed:logout");
    return keys;
  })();

  const registerFocusable =
    (key: string) => (element: HTMLAnchorElement | HTMLButtonElement | null) => {
      focusableRefs.current[key] = element;
    };

  const onArrowKey = (event: React.KeyboardEvent<HTMLElement>, key: string) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const keys = focusableKeys.filter((focusKey) => focusableRefs.current[focusKey]);
    const currentIndex = keys.indexOf(key);
    if (currentIndex === -1) {
      return;
    }

    let targetKey = key;
    if (event.key === "ArrowDown") {
      targetKey = keys[(currentIndex + 1) % keys.length];
    } else if (event.key === "ArrowUp") {
      targetKey = keys[(currentIndex - 1 + keys.length) % keys.length];
    } else if (event.key === "Home") {
      targetKey = keys[0];
    } else if (event.key === "End") {
      targetKey = keys[keys.length - 1];
    }

    focusableRefs.current[targetKey]?.focus();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Verwijder de auth cookie zodat de proxy ook weet dat de sessie verlopen is
    document.cookie = "sb-access-token=; path=/; max-age=0";
    router.push("/admin/login");
  };

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 flex-col border-r border-neutral-200/80 bg-[#fbfbfc] transition-[width] duration-200",
        forceVisible ? "flex" : "hidden lg:flex",
        collapsed ? "w-[92px]" : "w-[320px]"
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 px-5 py-5">
        <Link href="/admin" className={cn("flex items-center gap-3", collapsed && "sr-only")}>
          <Image
            src="/favicon-icon.png"
            alt="TopTalent"
            width={40}
            height={40}
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F27501]">
              TopTalent
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold text-neutral-950">Admin navigation</h1>
          </div>
        </Link>
        <SidebarCollapsedToggle collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-5">
          <SidebarSearch
            collapsed={collapsed}
            value={query}
            onChange={setQuery}
            inputRef={searchInputRef}
          />

          {!collapsed ? (
            <section className="space-y-2">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                Quick
              </div>
              <div className="space-y-1">
                {visibleQuickItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    href={getSidebarHref(item)}
                    active={activeItemIds.has(item.id)}
                    collapsed={false}
                    badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                    pinned={favoriteIds.includes(item.id)}
                    onTogglePin={togglePin}
                    onSelect={item.kind === "tab" && onTabSelect ? () => onTabSelect(item.tab!) : undefined}
                    focusRef={registerFocusable(`quick:${item.id}`)}
                    onKeyDown={(event) => onArrowKey(event, `quick:${item.id}`)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <SidebarFavorites
            items={favoriteItems}
            activeItemIds={activeItemIds}
            badges={badges}
            collapsed={collapsed}
            pinnedIds={new Set(favoriteIds)}
            onTogglePin={togglePin}
            onTabSelect={onTabSelect}
            registerFocusable={registerFocusable}
            onArrowKey={onArrowKey}
          />

          {collapsed ? (
            <div className="space-y-1 border-t border-neutral-200/80 pt-4">
              {collapsedItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  href={getSidebarHref(item)}
                  active={activeItemIds.has(item.id)}
                  collapsed
                  badge={undefined}
                  pinned={favoriteIds.includes(item.id)}
                  onTogglePin={togglePin}
                  onSelect={item.kind === "tab" && onTabSelect ? () => onTabSelect(item.tab!) : undefined}
                  focusRef={registerFocusable(`collapsed:${item.id}`)}
                  onKeyDown={(event) => onArrowKey(event, `collapsed:${item.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {visibleGroups.map((group) => (
                <SidebarGroup
                  key={group.id}
                  group={group}
                  items={group.items}
                  open={resolvedGroupState[group.id] ?? false}
                  collapsed={false}
                  showDivider={Boolean(group.dividerBefore)}
                  activeItemIds={activeItemIds}
                  badges={badges}
                  pinnedIds={new Set(favoriteIds)}
                  onTogglePin={togglePin}
                  onToggleGroup={toggleGroup}
                  onTabSelect={onTabSelect}
                  registerFocusable={registerFocusable}
                  onArrowKey={onArrowKey}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-200/80 px-4 py-4">
        <div className="space-y-1">
          {!collapsed ? (
            <>
              <SidebarItem
                item={sidebarItems.settings}
                href={getSidebarHref(sidebarItems.settings)}
                active={activeItemIds.has(sidebarItems.settings.id)}
                collapsed={false}
                pinned={favoriteIds.includes(sidebarItems.settings.id)}
                onTogglePin={togglePin}
                focusRef={registerFocusable("footer:settings")}
                onKeyDown={(event) => onArrowKey(event, "footer:settings")}
              />
              {/* User info + logout */}
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-neutral-50 px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F27501]/10 text-[#F27501]">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-neutral-900">
                    {userEmail ? userEmail.split("@")[0] : "Admin"}
                  </p>
                  <p className="text-[10px] text-neutral-500">Admin</p>
                </div>
                <button
                  ref={registerFocusable("footer:logout") as React.Ref<HTMLButtonElement>}
                  onClick={handleLogout}
                  onKeyDown={(event) => onArrowKey(event, "footer:logout")}
                  aria-label="Uitloggen"
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white hover:text-neutral-700"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              ref={registerFocusable("collapsed:logout") as React.Ref<HTMLButtonElement>}
              onClick={handleLogout}
              onKeyDown={(event) => onArrowKey(event, "collapsed:logout")}
              aria-label="Uitloggen"
              title="Uitloggen"
              className="group relative flex w-full items-center justify-center rounded-2xl px-0 py-3 text-neutral-500 transition hover:bg-white hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F27501]/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-inherit">
                <LogOut className="h-4.5 w-4.5" />
              </span>
              <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-neutral-950 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
                Uitloggen
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
