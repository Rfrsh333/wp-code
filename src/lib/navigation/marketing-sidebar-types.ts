import type { LucideIcon } from "lucide-react";

export const marketingTabs = [
  "dashboard",
  "content",
  "blog",
  "linkedin",
  "social",
  "geo",
  "leads",
  "analytics",
  "email",
  "seo",
] as const;

export type MarketingTab = (typeof marketingTabs)[number];

export type MarketingSidebarBadgeKey =
  | "contentDrafts"
  | "leadsNew"
  | "socialScheduled";

export type SidebarItemKind = "tab" | "route";
export type SidebarRouteMatch = "exact" | "prefix";

export interface MarketingSidebarItemDefinition {
  id: string;
  kind: SidebarItemKind;
  icon: LucideIcon;
  title: string;
  description?: string;
  tab?: MarketingTab;
  href?: string;
  routeMatch?: SidebarRouteMatch;
  badgeKey?: MarketingSidebarBadgeKey;
  keywords?: string[];
}

export interface MarketingSidebarGroup {
  label: string;
  itemIds: string[];
}

export type MarketingSidebarBadgeMap = Partial<Record<MarketingSidebarBadgeKey, number>>;
