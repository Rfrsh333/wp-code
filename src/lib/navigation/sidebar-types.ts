import type { LucideIcon } from "lucide-react";

export const adminTabs = [
  "overzicht",
  "stats",
  "aanvragen",
  "inschrijvingen",
  "contact",
  "calculator",
  "medewerkers",
  "diensten",
  "filters",
  "uren",
  "facturen",
  "matching",
  "ai",
  "acquisitie",
  "klanten",
  "referrals",
  "offertes",
  "faq",
  "tickets",
  "pricing",
  "content",
  "agenda",
  "berichten",
  "planning",
  "leads",
  "boetes",
  "livechat",
  "contracten",
  "platform-options",
  "geo",
] as const;

export type AdminTab = (typeof adminTabs)[number];

export type SidebarBadgeKey =
  | "aanvragenNieuw"
  | "inschrijvingenNieuw"
  | "contactNieuw"
  | "calculatorTotaal"
  | "offertesConcepten";

export type SidebarItemKind = "tab" | "route";
export type SidebarRouteMatch = "exact" | "prefix";

export interface SidebarItemDefinition {
  id: string;
  title: string;
  icon: LucideIcon;
  kind: SidebarItemKind;
  tab?: AdminTab;
  href?: string;
  badgeKey?: SidebarBadgeKey;
  keywords?: string[];
  pinnable?: boolean;
  routeMatch?: SidebarRouteMatch;
}

export interface SidebarGroupConfig {
  id: string;
  label: string;
  itemIds: string[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  dividerBefore?: boolean;
}

export type SidebarBadgeMap = Partial<Record<SidebarBadgeKey, number>>;
