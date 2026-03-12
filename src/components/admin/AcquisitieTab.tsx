"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const SubTabSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-6 w-40 bg-neutral-200 rounded" />
    <div className="h-48 bg-neutral-100 rounded-xl" />
  </div>
);

const DashboardView = dynamic(() => import("./acquisitie/DashboardView"), { loading: () => <SubTabSkeleton />, ssr: false });
const LijstView = dynamic(() => import("./acquisitie/LijstView"), { loading: () => <SubTabSkeleton />, ssr: false });
const PipelineView = dynamic(() => import("./acquisitie/PipelineView"), { loading: () => <SubTabSkeleton />, ssr: false });
const LeadDetailPanel = dynamic(() => import("./acquisitie/LeadDetailPanel"), { ssr: false });
const DiscoveryView = dynamic(() => import("./acquisitie/DiscoveryView"), { loading: () => <SubTabSkeleton />, ssr: false });
const CampagnesView = dynamic(() => import("./acquisitie/CampagnesView"), { loading: () => <SubTabSkeleton />, ssr: false });
const BellijstView = dynamic(() => import("./acquisitie/BellijstView"), { loading: () => <SubTabSkeleton />, ssr: false });
const TerritoryView = dynamic(() => import("./acquisitie/TerritoryView"), { loading: () => <SubTabSkeleton />, ssr: false });
const CompetitiveView = dynamic(() => import("./acquisitie/CompetitiveView"), { loading: () => <SubTabSkeleton />, ssr: false });
const PredictiveView = dynamic(() => import("./acquisitie/PredictiveView"), { loading: () => <SubTabSkeleton />, ssr: false });
const SegmentenView = dynamic(() => import("./acquisitie/SegmentenView"), { loading: () => <SubTabSkeleton />, ssr: false });
const ROIView = dynamic(() => import("./acquisitie/ROIView"), { loading: () => <SubTabSkeleton />, ssr: false });

type SubTab = "dashboard" | "lijst" | "pipeline" | "discovery" | "campagnes" | "bellijst" | "territory" | "competitive" | "predictive" | "segmenten" | "roi";

export default function AcquisitieTab() {
  const [subTab, setSubTab] = useState<SubTab>("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  const subTabs: { id: SubTab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { id: "lijst", label: "Leads", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
    { id: "pipeline", label: "Pipeline", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" },
    { id: "discovery", label: "Discovery", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { id: "campagnes", label: "Campagnes", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
    { id: "bellijst", label: "Bellijst", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
    { id: "territory", label: "Territory", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "competitive", label: "Concurrentie", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
    { id: "predictive", label: "Predictive AI", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
    { id: "segmenten", label: "Segmenten", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" },
    { id: "roi", label: "ROI", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">Klantacquisitie</h2>

      {/* Sub tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setSubTab(tab.id); setSelectedLeadId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              subTab === tab.id
                ? "bg-[#F27501] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lead detail panel (overlay) */}
      {selectedLeadId && (
        <LeadDetailPanel
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={refresh}
        />
      )}

      {/* Tab content */}
      {subTab === "dashboard" && (
        <DashboardView onSelectLead={setSelectedLeadId} />
      )}
      {subTab === "lijst" && (
        <LijstView
          key={refreshKey}
          onSelectLead={setSelectedLeadId}
          onRefresh={refresh}
        />
      )}
      {subTab === "pipeline" && (
        <PipelineView
          key={refreshKey}
          onSelectLead={setSelectedLeadId}
          onRefresh={refresh}
        />
      )}
      {subTab === "discovery" && (
        <DiscoveryView onRefresh={refresh} />
      )}
      {subTab === "campagnes" && (
        <CampagnesView key={refreshKey} />
      )}
      {subTab === "bellijst" && (
        <BellijstView
          key={refreshKey}
          onSelectLead={setSelectedLeadId}
        />
      )}
      {subTab === "territory" && (
        <TerritoryView
          key={refreshKey}
          onSelectLead={setSelectedLeadId}
        />
      )}
      {subTab === "competitive" && (
        <CompetitiveView
          key={refreshKey}
          onSelectLead={setSelectedLeadId}
        />
      )}
      {subTab === "predictive" && (
        <PredictiveView
          key={refreshKey}
          onSelectLead={setSelectedLeadId}
        />
      )}
      {subTab === "segmenten" && (
        <SegmentenView
          key={refreshKey}
          onSelectLead={setSelectedLeadId}
        />
      )}
      {subTab === "roi" && (
        <ROIView key={refreshKey} />
      )}
    </div>
  );
}
