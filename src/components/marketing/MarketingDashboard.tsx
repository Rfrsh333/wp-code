"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MarketingShell from "@/components/navigation/MarketingShell";
import { isMarketingTab } from "@/lib/navigation/marketing-sidebar-config";
import type { MarketingTab } from "@/lib/navigation/marketing-sidebar-types";
import dynamic from "next/dynamic";

const TabSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-neutral-200 rounded-lg" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-white rounded-2xl shadow-sm p-5">
          <div className="h-10 w-10 bg-neutral-100 rounded-xl mb-3" />
          <div className="h-6 w-16 bg-neutral-100 rounded" />
          <div className="h-4 w-24 bg-neutral-50 rounded mt-1" />
        </div>
      ))}
    </div>
  </div>
);

// Lazy load tab components
const DashboardTab = dynamic(() => import("./tabs/DashboardTab"), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const ContentTab = dynamic(() => import("../admin/ContentTab"), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const BlogTab = dynamic(() => import("./tabs/BlogTab"), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const GeoTab = dynamic(() => import("../admin/GeoTab"), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const LeadsTab = dynamic(() => import("../admin/LeadsTab"), {
  loading: () => <TabSkeleton />,
  ssr: false,
});

export default function MarketingDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTabValue: MarketingTab = tabParam && isMarketingTab(tabParam)
    ? tabParam
    : "dashboard";

  const [activeTab, setActiveTab] = useState<MarketingTab>(activeTabValue);

  const handleTabSelect = (tab: MarketingTab) => {
    // Content and Blog have standalone pages
    if (tab === "content" || tab === "blog") {
      router.push("/marketing/content");
      return;
    }

    setActiveTab(tab);
    router.push(`/marketing?tab=${tab}`, { scroll: false });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "content":
        return <ContentTab />;
      case "blog":
        return <BlogTab />;
      case "geo":
        return <GeoTab />;
      case "leads":
        return <LeadsTab />;
      case "social":
        return (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Social Media Planning
            </h2>
            <p className="text-neutral-600">Binnenkort beschikbaar</p>
          </div>
        );
      case "analytics":
        return (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Analytics & Performance
            </h2>
            <p className="text-neutral-600">Binnenkort beschikbaar</p>
          </div>
        );
      case "email":
        return (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Email Marketing
            </h2>
            <p className="text-neutral-600">Binnenkort beschikbaar</p>
          </div>
        );
      case "seo":
        return (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              SEO Optimalisatie
            </h2>
            <p className="text-neutral-600">Binnenkort beschikbaar</p>
          </div>
        );
      default:
        return <DashboardTab />;
    }
  };

  return (
    <MarketingShell
      activeTab={activeTab}
      badges={{}}
      onTabSelect={handleTabSelect}
    >
      {renderActiveTab()}
    </MarketingShell>
  );
}
