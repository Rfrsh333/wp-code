import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Linkedin,
  Share2,
  Globe,
  Users,
  BarChart3,
  Mail,
  Search,
} from "lucide-react";
import type {
  MarketingSidebarItemDefinition,
  MarketingSidebarGroup,
  MarketingTab,
} from "./marketing-sidebar-types";

export const marketingSidebarItems: MarketingSidebarItemDefinition[] = [
  {
    id: "dashboard",
    kind: "tab",
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Overzicht en statistieken",
    tab: "dashboard",
    keywords: ["overview", "home", "start"],
  },
  {
    id: "content",
    kind: "tab",
    icon: FileText,
    title: "Content Management",
    description: "Beheer alle content",
    tab: "content",
    badgeKey: "contentDrafts",
    keywords: ["content", "manage", "cms"],
  },
  {
    id: "blog",
    kind: "tab",
    icon: Newspaper,
    title: "Blog & Artikelen",
    description: "Blog posts en nieuwsartikelen",
    tab: "blog",
    keywords: ["blog", "articles", "news", "editorial"],
  },
  {
    id: "linkedin",
    kind: "tab",
    icon: Linkedin,
    title: "LinkedIn",
    description: "LinkedIn post generator",
    tab: "linkedin",
    keywords: ["linkedin", "social", "posts"],
  },
  {
    id: "social",
    kind: "tab",
    icon: Share2,
    title: "Social Media",
    description: "Social media planning",
    tab: "social",
    badgeKey: "socialScheduled",
    keywords: ["social", "instagram", "facebook", "twitter"],
  },
  {
    id: "geo",
    kind: "tab",
    icon: Globe,
    title: "GEO Agent",
    description: "AI content generatie",
    tab: "geo",
    keywords: ["geo", "ai", "generate", "content"],
  },
  {
    id: "leads",
    kind: "tab",
    icon: Users,
    title: "Lead Management",
    description: "Leads en contacten",
    tab: "leads",
    badgeKey: "leadsNew",
    keywords: ["leads", "contacts", "prospects"],
  },
  {
    id: "analytics",
    kind: "tab",
    icon: BarChart3,
    title: "Analytics",
    description: "Performance en statistieken",
    tab: "analytics",
    keywords: ["analytics", "stats", "performance", "metrics"],
  },
  {
    id: "email",
    kind: "tab",
    icon: Mail,
    title: "Email Marketing",
    description: "Email campagnes",
    tab: "email",
    keywords: ["email", "newsletter", "campaigns"],
  },
  {
    id: "seo",
    kind: "tab",
    icon: Search,
    title: "SEO",
    description: "Zoekmachine optimalisatie",
    tab: "seo",
    keywords: ["seo", "search", "google", "optimization"],
  },
];

export const marketingSidebarGroups: MarketingSidebarGroup[] = [
  {
    label: "Overzicht",
    itemIds: ["dashboard"],
  },
  {
    label: "Content",
    itemIds: ["content", "blog", "geo"],
  },
  {
    label: "Social Media",
    itemIds: ["linkedin", "social"],
  },
  {
    label: "Acquisitie",
    itemIds: ["leads", "email"],
  },
  {
    label: "Analyse",
    itemIds: ["analytics", "seo"],
  },
];

export function isMarketingTab(value: string): value is MarketingTab {
  return marketingSidebarItems.some(
    (item) => item.kind === "tab" && item.tab === value
  );
}
