import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  CalendarRange,
  Clock3,
  FileSpreadsheet,
  FileText,
  Files,
  FolderKanban,
  Gauge,
  Inbox,
  MessageCircle,
  Newspaper,
  Receipt,
  Settings,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type {
  AdminTab,
  SidebarGroupConfig,
  SidebarItemDefinition,
} from "@/lib/navigation/sidebar-types";

export const sidebarItems = {
  overview: {
    id: "overview",
    title: "Overzicht",
    icon: Gauge,
    kind: "tab",
    tab: "overzicht",
    pinnable: true,
    keywords: ["dashboard", "home"],
  },
  stats: {
    id: "stats",
    title: "Statistieken",
    icon: BarChart3,
    kind: "tab",
    tab: "stats",
    pinnable: true,
    keywords: ["analytics", "rapportage"],
  },
  aanvragen: {
    id: "aanvragen",
    title: "Personeel aanvragen",
    icon: BriefcaseBusiness,
    kind: "tab",
    tab: "aanvragen",
    badgeKey: "aanvragenNieuw",
    pinnable: true,
    keywords: ["recruitment", "aanvraag", "klant"],
  },
  inschrijvingen: {
    id: "inschrijvingen",
    title: "Inschrijvingen",
    icon: Users,
    kind: "tab",
    tab: "inschrijvingen",
    badgeKey: "inschrijvingenNieuw",
    pinnable: true,
    keywords: ["kandidaten", "onboarding"],
  },
  medewerkers: {
    id: "medewerkers",
    title: "Medewerkers",
    icon: Users,
    kind: "tab",
    tab: "medewerkers",
    pinnable: true,
    keywords: ["team", "planning"],
  },
  diensten: {
    id: "diensten",
    title: "Diensten",
    icon: Clock3,
    kind: "tab",
    tab: "diensten",
    pinnable: true,
    keywords: ["shifts", "agenda"],
  },
  uren: {
    id: "uren",
    title: "Uren goedkeuren",
    icon: FileSpreadsheet,
    kind: "tab",
    tab: "uren",
    pinnable: true,
    keywords: ["timesheets", "goedkeuren"],
  },
  facturen: {
    id: "facturen",
    title: "Facturen",
    icon: Receipt,
    kind: "tab",
    tab: "facturen",
    pinnable: true,
    keywords: ["billing", "finance"],
  },
  contact: {
    id: "contact",
    title: "Contact berichten",
    icon: Inbox,
    kind: "tab",
    tab: "contact",
    badgeKey: "contactNieuw",
    pinnable: true,
    keywords: ["support", "berichten"],
  },
  calculator: {
    id: "calculator",
    title: "Calculator leads",
    icon: Calculator,
    kind: "tab",
    tab: "calculator",
    badgeKey: "calculatorTotaal",
    pinnable: true,
    keywords: ["marketing", "leads"],
  },
  contentOverview: {
    id: "contentOverview",
    title: "Content overview",
    icon: Newspaper,
    kind: "route",
    href: "/admin/news",
    routeMatch: "exact",
    pinnable: true,
    keywords: ["nieuws", "editorial", "content"],
  },
  contentSources: {
    id: "contentSources",
    title: "Bronnen beheren",
    icon: Files,
    kind: "route",
    href: "/admin/news/sources",
    routeMatch: "prefix",
    pinnable: true,
    keywords: ["sources", "rss"],
  },
  contentClusters: {
    id: "contentClusters",
    title: "Clusters",
    icon: FolderKanban,
    kind: "route",
    href: "/admin/news/clusters",
    routeMatch: "prefix",
    pinnable: true,
    keywords: ["clusters", "review"],
  },
  contentDrafts: {
    id: "contentDrafts",
    title: "Draft reviews",
    icon: Sparkles,
    kind: "route",
    href: "/admin/news/drafts",
    routeMatch: "prefix",
    pinnable: true,
    keywords: ["drafts", "ai"],
  },
  planning: {
    id: "planning",
    title: "Planningsbord",
    icon: CalendarRange,
    kind: "tab",
    tab: "planning",
    pinnable: true,
    keywords: ["planning", "weekrooster", "shifts", "toewijzen"],
  },
  leads: {
    id: "leads",
    title: "Social Leads",
    icon: Target,
    kind: "tab",
    tab: "leads",
    pinnable: true,
    keywords: ["leads", "acquisitie", "facebook", "linkedin", "bookmarklet"],
  },
  offertes: {
    id: "offertes",
    title: "Offertes",
    icon: FileText,
    kind: "tab",
    tab: "offertes",
    badgeKey: "offertesConcepten",
    pinnable: true,
    keywords: ["offerte", "quote", "voorstel", "tarief"],
  },
  boetes: {
    id: "boetes",
    title: "Boetes",
    icon: AlertTriangle,
    kind: "tab",
    tab: "boetes",
    pinnable: true,
    keywords: ["boete", "no-show", "straf", "pauzeren"],
  },
  livechat: {
    id: "livechat",
    title: "Live Chat",
    icon: MessageCircle,
    kind: "tab",
    tab: "livechat",
    pinnable: true,
    keywords: ["chat", "chatbot", "support", "ai"],
  },
  settings: {
    id: "settings",
    title: "Instellingen",
    icon: Settings,
    kind: "route",
    href: "/admin/settings",
    routeMatch: "prefix",
    pinnable: true,
    keywords: ["2fa", "security"],
  },
} satisfies Record<string, SidebarItemDefinition>;

export const sidebarQuickAccess = ["overview", "aanvragen", "inschrijvingen"] as const;

export const sidebarGroups: SidebarGroupConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    itemIds: ["overview", "stats"],
    collapsible: true,
    defaultOpen: true,
  },
  {
    id: "recruitment",
    label: "Recruitment",
    itemIds: ["aanvragen", "inschrijvingen", "medewerkers", "diensten", "planning", "boetes"],
    collapsible: true,
    defaultOpen: true,
    dividerBefore: true,
  },
  {
    id: "finance",
    label: "Finance",
    itemIds: ["uren", "facturen", "offertes"],
    collapsible: true,
    dividerBefore: true,
  },
  {
    id: "support",
    label: "Support",
    itemIds: ["contact", "livechat"],
    collapsible: true,
    dividerBefore: true,
  },
  {
    id: "marketing",
    label: "Growth",
    itemIds: ["calculator", "leads"],
    collapsible: true,
    dividerBefore: true,
  },
  {
    id: "content",
    label: "Content",
    itemIds: ["contentOverview", "contentSources", "contentClusters", "contentDrafts"],
    collapsible: true,
    dividerBefore: true,
  },
  {
    id: "system",
    label: "System",
    itemIds: ["settings"],
    collapsible: true,
    dividerBefore: true,
  },
];

export const sidebarDefaultGroupState = Object.fromEntries(
  sidebarGroups.map((group) => [group.id, Boolean(group.defaultOpen)])
) as Record<string, boolean>;

export const allSidebarItems = Object.values(sidebarItems);

export function isAdminTab(value: string | null | undefined): value is AdminTab {
  return allSidebarItems.some((item) => item.kind === "tab" && item.tab === value);
}

export function getSidebarHref(item: SidebarItemDefinition) {
  if (item.kind === "route") {
    return item.href ?? "/admin";
  }

  const params = new URLSearchParams();
  if (item.tab && item.tab !== "overzicht") {
    params.set("tab", item.tab);
  }

  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}
