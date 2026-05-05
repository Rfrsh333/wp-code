"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, Mail, Send, Eye, Reply, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { CRMInstantlyCampaign } from "./types";

interface CampaignViewProps {
  onSelectCampaign: (id: string, name: string) => void;
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Draft", color: "bg-neutral-100 text-neutral-600" },
  1: { label: "Active", color: "bg-green-100 text-green-700" },
  2: { label: "Paused", color: "bg-yellow-100 text-yellow-700" },
  3: { label: "Completed", color: "bg-blue-100 text-blue-700" },
};

export default function CampaignView({ onSelectCampaign }: CampaignViewProps) {
  const [campaigns, setCampaigns] = useState<CRMInstantlyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const toast = useToast();

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/crm/campaigns?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setCampaigns(await res.json());
    } catch {
      toast.error("Fout bij laden campagnes");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleSyncAll() {
    setSyncing(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/admin/crm/campaigns", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync mislukt");
      toast.success(`Sync voltooid: ${result.campaigns_synced} campagnes, ${result.leads_matched} matched, ${result.leads_unmatched} unmatched`);
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync mislukt");
    } finally {
      setSyncing(false);
    }
  }

  function getReplyRate(c: CRMInstantlyCampaign): string {
    if (c.leads_sent === 0) return "0%";
    return `${Math.round((c.leads_replied / c.leads_sent) * 100)}%`;
  }

  function getOpenRate(c: CRMInstantlyCampaign): string {
    if (c.leads_sent === 0) return "0%";
    return `${Math.round((c.leads_opened / c.leads_sent) * 100)}%`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Instantly Campagnes</h3>
          <p className="text-sm text-neutral-500">{campaigns.length} campagnes</p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchroniseren..." : "Sync alle campagnes"}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Zoek op campagne naam..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400"
        />
      </div>

      {/* Campaign cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-xl border border-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <Mail className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          <p className="text-sm">Geen campagnes gevonden</p>
          <p className="text-xs text-neutral-400 mt-1">Klik &quot;Sync alle campagnes&quot; om te starten</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map(campaign => {
            const statusInfo = STATUS_LABELS[campaign.status] || STATUS_LABELS[0];
            return (
              <div
                key={campaign.id}
                className="bg-white rounded-xl border border-neutral-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectCampaign(campaign.id, campaign.name)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-semibold text-neutral-900 truncate flex-1 mr-2">{campaign.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <CampaignStat icon={Send} label="Sent" value={campaign.leads_sent} color="text-cyan-500" />
                  <CampaignStat icon={Eye} label="Opened" value={campaign.leads_opened} color="text-blue-500" />
                  <CampaignStat icon={Reply} label="Replied" value={campaign.leads_replied} color="text-green-500" />
                  <CampaignStat icon={AlertCircle} label="Bounced" value={campaign.leads_bounced} color="text-red-500" />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span>{campaign.total_leads} leads</span>
                    <span>Open rate: {getOpenRate(campaign)}</span>
                    <span>Reply rate: {getReplyRate(campaign)}</span>
                  </div>
                  {campaign.last_synced_at && (
                    <span className="text-[10px] text-neutral-400">
                      Synced {new Date(campaign.last_synced_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CampaignStat({ icon: Icon, label, value, color }: { icon: typeof Send; label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
      <p className="text-sm font-bold text-neutral-900">{value}</p>
      <p className="text-[9px] text-neutral-400">{label}</p>
    </div>
  );
}
