"use client";

import Link from "next/link";
import { Pin, PinOff } from "lucide-react";
import type { SidebarBadgeKey, SidebarItemDefinition } from "@/lib/navigation/sidebar-types";
import { cn } from "@/lib/utils";

const badgeColors: Record<SidebarBadgeKey, { bg: string; text: string; activeBg: string; activeText: string }> = {
  aanvragenNieuw: { bg: "bg-red-100", text: "text-red-600", activeBg: "bg-red-100", activeText: "text-red-700" },
  inschrijvingenNieuw: { bg: "bg-red-100", text: "text-red-600", activeBg: "bg-red-100", activeText: "text-red-700" },
  contactNieuw: { bg: "bg-blue-100", text: "text-blue-600", activeBg: "bg-blue-100", activeText: "text-blue-700" },
  calculatorTotaal: { bg: "bg-green-100", text: "text-green-600", activeBg: "bg-green-100", activeText: "text-green-700" },
};

interface SidebarItemProps {
  item: SidebarItemDefinition;
  href: string;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  pinned: boolean;
  onTogglePin?: (itemId: string) => void;
  onSelect?: () => void;
  focusRef?: (element: HTMLAnchorElement | HTMLButtonElement | null) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}

export default function SidebarItem({
  item,
  href,
  active,
  collapsed,
  badge,
  pinned,
  onTogglePin,
  onSelect,
  focusRef,
  onKeyDown,
}: SidebarItemProps) {
  const Icon = item.icon;
  const content = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
          active
            ? "border-[#F27501]/20 bg-[#F27501]/12 text-[#C95F00]"
            : "border-transparent bg-transparent text-neutral-500 group-hover/item:bg-white group-hover/item:text-neutral-700"
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
          {typeof badge === "number" && badge > 0 ? (
            (() => {
              const colors = item.badgeKey && badgeColors[item.badgeKey];
              return (
                <span
                  className={cn(
                    "ml-3 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums",
                    active
                      ? colors ? `${colors.activeBg} ${colors.activeText}` : "bg-[#F27501]/14 text-[#C95F00]"
                      : colors ? `${colors.bg} ${colors.text}` : "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {badge}
                </span>
              );
            })()
          ) : null}
          {onTogglePin ? (
            <span
              role="button"
              tabIndex={0}
              aria-label={pinned ? `${item.title} losmaken` : `${item.title} vastmaken`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTogglePin(item.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onTogglePin(item.id);
                }
              }}
              className={cn(
                "ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 opacity-0 transition cursor-pointer",
                "hover:bg-white hover:text-neutral-700 group-hover/item:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F27501]/20",
                pinned && "opacity-100 text-[#C95F00]"
              )}
            >
              {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </span>
          ) : null}
        </>
      ) : (
        <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-neutral-950 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover/item:block group-focus-within/item:block">
          {item.title}
        </span>
      )}
    </>
  );

  const className = cn(
    "group/item relative flex w-full items-center rounded-2xl px-2 py-1.5 text-left text-neutral-600 transition outline-none",
    "focus-visible:ring-4 focus-visible:ring-[#F27501]/10",
    active
      ? "bg-[#fff4eb] text-neutral-900 shadow-[inset_0_0_0_1px_rgba(242,117,1,0.10)]"
      : "hover:bg-white/85 hover:text-neutral-900",
    collapsed && "justify-center px-0"
  );

  if (onSelect) {
    return (
      <button
        ref={focusRef as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onSelect}
        onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement>}
        title={collapsed ? item.title : undefined}
        className={className}
      >
        {active ? <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#F27501]" /> : null}
        {content}
      </button>
    );
  }

  return (
    <Link
      ref={focusRef as React.Ref<HTMLAnchorElement>}
      href={href}
      onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLAnchorElement>}
      title={collapsed ? item.title : undefined}
      className={className}
    >
      {active ? <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#F27501]" /> : null}
      {content}
    </Link>
  );
}
