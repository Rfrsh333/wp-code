"use client";

import { useState } from "react";
import { LayoutDashboard, List, Upload, Clock, TrendingUp } from "lucide-react";
import DashboardView from "./restaurant-crm/DashboardView";
import LeadListView from "./restaurant-crm/LeadListView";
import ImportView from "./restaurant-crm/ImportView";
import FollowupView from "./restaurant-crm/FollowupView";
import FunnelView from "./restaurant-crm/FunnelView";
import CallingSessionModal from "./restaurant-crm/CallingSessionModal";

type SubTab = "dashboard" | "leads" | "import" | "followups" | "pipeline";

const SUB_TABS: { id: SubTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: List },
  { id: "pipeline", label: "Pipeline", icon: TrendingUp },
  { id: "followups", label: "Follow-ups", icon: Clock },
  { id: "import", label: "Import/Export", icon: Upload },
];

export default function RestaurantCRMTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("dashboard");
  const [showCallingSession, setShowCallingSession] = useState(false);

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
            onClick={() => setActiveSubTab(tab.id)}
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
      {activeSubTab === "leads" && <LeadListView />}
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
