"use client";

import { useState } from "react";
import { LayoutDashboard, List, Upload, Clock, TrendingUp, Mail } from "lucide-react";
import DashboardView from "./restaurant-crm/DashboardView";
import LeadListsView from "./restaurant-crm/LeadListsView";
import LeadListView from "./restaurant-crm/LeadListView";
import ImportView from "./restaurant-crm/ImportView";
import FollowupView from "./restaurant-crm/FollowupView";
import FunnelView from "./restaurant-crm/FunnelView";
import CampaignView from "./restaurant-crm/CampaignView";
import CampaignDetailView from "./restaurant-crm/CampaignDetailView";
import CallingSessionModal from "./restaurant-crm/CallingSessionModal";

type SubTab = "dashboard" | "leads" | "campaigns" | "import" | "followups" | "pipeline";

const SUB_TABS: { id: SubTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: List },
  { id: "campaigns", label: "Campagnes", icon: Mail },
  { id: "pipeline", label: "Pipeline", icon: TrendingUp },
  { id: "followups", label: "Follow-ups", icon: Clock },
  { id: "import", label: "Import/Export", icon: Upload },
];

export default function RestaurantCRMTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("dashboard");
  const [showCallingSession, setShowCallingSession] = useState(false);
  const [selectedLeadListId, setSelectedLeadListId] = useState<string | null>(null);
  const [selectedLeadListName, setSelectedLeadListName] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);

  function handleSelectList(listId: string, listName: string) {
    setSelectedLeadListId(listId);
    setSelectedLeadListName(listName);
  }

  function handleBackToLists() {
    setSelectedLeadListId(null);
    setSelectedLeadListName(null);
  }

  function handleViewAllLeads() {
    setSelectedLeadListId(null);
    setSelectedLeadListName(null);
    setSelectedLeadListId("__all__");
  }

  function handleSelectCampaign(id: string, name: string) {
    setSelectedCampaignId(id);
    setSelectedCampaignName(name);
  }

  function handleBackToCampaigns() {
    setSelectedCampaignId(null);
    setSelectedCampaignName(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Sales Cockpit</h2>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id);
              if (tab.id === "leads") {
                setSelectedLeadListId(null);
                setSelectedLeadListName(null);
              }
              if (tab.id === "campaigns") {
                setSelectedCampaignId(null);
                setSelectedCampaignName(null);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === tab.id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === "dashboard" && (
        <DashboardView
          onStartCallingSession={() => setShowCallingSession(true)}
          onSelectLead={() => setActiveSubTab("leads")}
          onNavigateFilter={() => setActiveSubTab("leads")}
        />
      )}
      {activeSubTab === "leads" && (
        selectedLeadListId === "__all__" ? (
          <LeadListView onBackToLists={handleBackToLists} />
        ) : selectedLeadListId ? (
          <LeadListView
            leadListId={selectedLeadListId}
            leadListName={selectedLeadListName || undefined}
            onBackToLists={handleBackToLists}
          />
        ) : (
          <LeadListsView
            onSelectList={handleSelectList}
            onViewAllLeads={handleViewAllLeads}
            onNavigateImport={() => setActiveSubTab("import")}
          />
        )
      )}
      {activeSubTab === "campaigns" && (
        selectedCampaignId ? (
          <CampaignDetailView
            campaignId={selectedCampaignId}
            campaignName={selectedCampaignName || ""}
            onBack={handleBackToCampaigns}
          />
        ) : (
          <CampaignView onSelectCampaign={handleSelectCampaign} />
        )
      )}
      {activeSubTab === "pipeline" && <FunnelView />}
      {activeSubTab === "followups" && <FollowupView />}
      {activeSubTab === "import" && <ImportView />}

      {/* Calling Session Modal */}
      {showCallingSession && (
        <CallingSessionModal onClose={() => setShowCallingSession(false)} />
      )}
    </div>
  );
}
