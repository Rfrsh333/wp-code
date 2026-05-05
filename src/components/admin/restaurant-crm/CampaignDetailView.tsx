"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Search, Phone, Instagram, Eye, Reply, Send, AlertCircle, ChevronLeft, ChevronRight, Filter, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { InstantlyBadge } from "./StatusBadge";
import LeadDetailPanel from "./LeadDetailPanel";
import UnmatchedLeadsView from "./UnmatchedLeadsView";
import type { CRMInstantlyCampaign, CRMLeadCampaign, CRMLead, InstantlyStatus } from "./types";

interface CampaignDetailViewProps {
  campaignId: string;
  campaignName: string;
  onBack: () => void;
}

export default function CampaignDetailView({ campaignId, campaignName, onBack }: CampaignDetailViewProps) {
  const [campaign, setCampaign] = useState<CRMInstantlyCampaign | null>(null);
  const [leadCampaigns, setLeadCampaigns] = useState<CRMLeadCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [emailStatusFilter, setEmailStatusFilter] = useState("");
  const [needsCall, setNeedsCall] = useState(false);
  const [needsDm, setNeedsDm] = useState(false);
  const [hasInstagram, setHasInstagram] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "unmatched">("leads");
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set("search", search);
      if (emailStatusFilter) params.set("email_status", emailStatusFilter);
      if (needsCall) params.set("needs_call", "true");
      if (needsDm) params.set("needs_dm", "true");
      if (hasInstagram) params.set("has_instagram", "true");

      const res = await fetch(`/api/admin/crm/campaigns/${campaignId}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCampaign(data.campaign);
      setLeadCampaigns(data.leads || []);
      setTotal(data.total);
      setUnmatchedCount(data.unmatched_count);
    } catch {
      toast.error("Fout bij laden campagne");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, perPage, search, emailStatusFilter, needsCall, needsDm, hasInstagram, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleSync() {
    setSyncing(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`/api/admin/crm/campaigns/${campaignId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync mislukt");
      toast.success(`Sync: ${result.matched} matched, ${result.unmatched} unmatched`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync mislukt");
    } finally {
      setSyncing(false);
    }
  }

  const totalPages = Math.ceil(total / perPage);

  function getPercent(value: number, total: number): string {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Campagnes
        </button>
        <span className="text-neutral-300">/</span>
        <span className="text-sm font-medium text-neutral-900">{campaignName}</span>
      </div>

      {/* Stats bar */}
      {campaign && (
        <div className="bg-white rounded-xl border border-neutral-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-neutral-900">{campaign.name}</h3>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 rounded-lg hover:bg-cyan-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync campagne"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <StatBlock label="Sent" value={campaign.leads_sent} sub={getPercent(campaign.leads_sent, campaign.total_leads)} icon={Send} color="text-cyan-600" />
            <StatBlock label="Opened" value={campaign.leads_opened} sub={getPercent(campaign.leads_opened, campaign.leads_sent)} icon={Eye} color="text-blue-600" />
            <StatBlock label="Replied" value={campaign.leads_replied} sub={getPercent(campaign.leads_replied, campaign.leads_sent)} icon={Reply} color="text-green-600" />
            <StatBlock label="Clicked" value={campaign.leads_clicked} sub={getPercent(campaign.leads_clicked, campaign.leads_sent)} icon={Eye} color="text-purple-600" />
            <StatBlock label="Bounced" value={campaign.leads_bounced} sub={getPercent(campaign.leads_bounced, campaign.leads_sent)} icon={AlertCircle} color="text-red-600" />
            <StatBlock label="Total" value={campaign.total_leads} sub={`${campaign.leads_unsubscribed} unsubs`} icon={Send} color="text-neutral-600" />
          </div>
        </div>
      )}

      {/* Tab switch: Leads | Unmatched */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("leads")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "leads" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Leads ({total})
        </button>
        <button
          onClick={() => setActiveTab("unmatched")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "unmatched" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          {unmatchedCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          Unmatched ({unmatchedCount})
        </button>
      </div>

      {activeTab === "unmatched" ? (
        <UnmatchedLeadsView campaignId={campaignId} onResolved={fetchData} />
      ) : (
        <>
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Zoek op bedrijf, stad, email..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                showFilters ? "bg-cyan-50 border-cyan-200 text-cyan-700" : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              <select
                value={emailStatusFilter}
                onChange={e => { setEmailStatusFilter(e.target.value); setPage(1); }}
                className="text-sm border border-neutral-200 rounded-lg px-3 py-2"
              >
                <option value="">Alle email statussen</option>
                <option value="sent">Sent</option>
                <option value="opened">Opened</option>
                <option value="replied">Replied</option>
                <option value="clicked">Clicked</option>
                <option value="bounced">Bounced</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input type="checkbox" checked={needsCall} onChange={e => { setNeedsCall(e.target.checked); setPage(1); }} className="rounded" />
                Needs call
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input type="checkbox" checked={needsDm} onChange={e => { setNeedsDm(e.target.checked); setPage(1); }} className="rounded" />
                Needs DM
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input type="checkbox" checked={hasInstagram} onChange={e => { setHasInstagram(e.target.checked); setPage(1); }} className="rounded" />
                Has Instagram
              </label>
              {(emailStatusFilter || needsCall || needsDm || hasInstagram) && (
                <button
                  onClick={() => { setEmailStatusFilter(""); setNeedsCall(false); setNeedsDm(false); setHasInstagram(false); }}
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}

          {/* Leads table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-white rounded-lg border border-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : leadCampaigns.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p className="text-sm">Geen leads in deze campagne</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th className="text-left px-4 py-3 font-medium text-neutral-500">Bedrijf</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-500">Stad</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-500">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-500">Telefoon</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-500">Status</th>
                      <th className="text-center px-4 py-3 font-medium text-neutral-500">Opens</th>
                      <th className="text-center px-4 py-3 font-medium text-neutral-500">Replies</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-500">Kanalen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadCampaigns.map(lc => {
                      const lead = lc.lead as CRMLead | undefined;
                      return (
                        <tr
                          key={lc.id}
                          className="border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer transition-colors"
                          onClick={() => lead && setSelectedLead(lead)}
                        >
                          <td className="px-4 py-3 font-medium text-neutral-900">
                            {lead?.company_name || lc.instantly_lead_email}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">{lead?.city || "-"}</td>
                          <td className="px-4 py-3 text-neutral-600 max-w-[200px] truncate">{lc.instantly_lead_email}</td>
                          <td className="px-4 py-3 text-neutral-600">{lead?.phone || "-"}</td>
                          <td className="px-4 py-3">
                            <InstantlyBadge status={lc.email_status as InstantlyStatus} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-medium ${lc.open_count > 0 ? "text-blue-600" : "text-neutral-400"}`}>
                              {lc.open_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-medium ${lc.reply_count > 0 ? "text-green-600" : "text-neutral-400"}`}>
                              {lc.reply_count}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {lead?.phone_available && <Phone className="w-3.5 h-3.5 text-blue-500" />}
                              {lead?.instagram_available && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
                  <span className="text-xs text-neutral-500">
                    {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} van {total}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Lead detail panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

function StatBlock({ label, value, sub, icon: Icon, color }: {
  label: string;
  value: number;
  sub: string;
  icon: typeof Send;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-neutral-900">{value}</p>
      <p className="text-[10px] text-neutral-400">{sub}</p>
    </div>
  );
}
