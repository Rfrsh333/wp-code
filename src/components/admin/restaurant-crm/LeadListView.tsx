"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Phone, Mail, Instagram, Facebook } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { StatusBadge, OutreachBadge, ChannelBadge, InstantlyBadge } from "./StatusBadge";
import NextActionBadge, { getContactAttemptBadge } from "./NextActionBadge";
import LeadDetailPanel from "./LeadDetailPanel";
import BulkActionsBar from "./BulkActionsBar";
import type { CRMLead, CRMLeadListResponse } from "./types";

export default function LeadListView() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [outreachFilter, setOutreachFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const toast = useToast();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (outreachFilter) params.set("outreach_status", outreachFilter);
      if (channelFilter) params.set("next_best_channel", channelFilter);

      const res = await fetch(`/api/admin/crm/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: CRMLeadListResponse = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch {
      toast.error("Fout bij laden leads");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter, outreachFilter, channelFilter, toast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  }

  const totalPages = Math.ceil(total / perPage);

  function formatRelative(dateStr: string | null) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Vandaag";
    if (days === 1) return "Gisteren";
    if (days < 7) return `${days}d geleden`;
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Zoek op naam, telefoon, email, stad..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters ? "bg-orange-50 border-orange-200 text-orange-700" : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"}`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
            <option value="">Alle statussen</option>
            <option value="nieuw">Nieuw</option>
            <option value="te_bellen">Te bellen</option>
            <option value="gebeld_geen_gehoor">Geen gehoor</option>
            <option value="in_gesprek">In gesprek</option>
            <option value="email_gestuurd">Email gestuurd</option>
            <option value="dm_gestuurd">DM gestuurd</option>
            <option value="gewonnen">Gewonnen</option>
            <option value="verloren">Verloren</option>
            <option value="geen_interesse">Geen interesse</option>
          </select>
          <select value={outreachFilter} onChange={e => { setOutreachFilter(e.target.value); setPage(1); }} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
            <option value="">Alle outreach</option>
            <option value="not_started">Niet gestart</option>
            <option value="in_progress">Bezig</option>
            <option value="contacted">Benaderd</option>
            <option value="replied">Gereageerd</option>
            <option value="interested">Geïnteresseerd</option>
            <option value="not_interested">Geen interesse</option>
            <option value="converted">Klant</option>
          </select>
          <select value={channelFilter} onChange={e => { setChannelFilter(e.target.value); setPage(1); }} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
            <option value="">Alle kanalen</option>
            <option value="phone">Bellen</option>
            <option value="email">Email</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="none">Geen</option>
          </select>
          <div className="w-full flex flex-wrap gap-1.5 pt-2 border-t border-neutral-200">
            <QuickFilter label="Heeft Instagram" active={channelFilter === "instagram"} onClick={() => { setChannelFilter(channelFilter === "instagram" ? "" : "instagram"); setPage(1); }} />
            <QuickFilter label="Heeft Facebook" active={channelFilter === "facebook"} onClick={() => { setChannelFilter(channelFilter === "facebook" ? "" : "facebook"); setPage(1); }} />
            <QuickFilter label="DM gestuurd" active={statusFilter === "dm_gestuurd"} onClick={() => { setStatusFilter(statusFilter === "dm_gestuurd" ? "" : "dm_gestuurd"); setPage(1); }} />
            <QuickFilter label="Replied" active={outreachFilter === "replied"} onClick={() => { setOutreachFilter(outreachFilter === "replied" ? "" : "replied"); setPage(1); }} />
            <QuickFilter label="Geen gehoor" active={statusFilter === "gebeld_geen_gehoor"} onClick={() => { setStatusFilter(statusFilter === "gebeld_geen_gehoor" ? "" : "gebeld_geen_gehoor"); setPage(1); }} />
            <QuickFilter label="Niet gestart" active={outreachFilter === "not_started"} onClick={() => { setOutreachFilter(outreachFilter === "not_started" ? "" : "not_started"); setPage(1); }} />
          </div>
          {(statusFilter || outreachFilter || channelFilter) && (
            <button onClick={() => { setStatusFilter(""); setOutreachFilter(""); setChannelFilter(""); setPage(1); }} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedIds={Array.from(selectedIds)}
          onComplete={() => { setSelectedIds(new Set()); fetchLeads(); }}
        />
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{total} leads gevonden</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={toggleSelectAll} className="rounded" />
                </th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Bedrijf</th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Stad</th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Kanalen</th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Status</th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Outreach</th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Actie</th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Laatste contact</th>
                <th className="text-left px-3 py-3 font-medium text-neutral-600">Pogingen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-3"><div className="h-4 w-4 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-32 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-20 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-20 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-20 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-neutral-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-8 bg-neutral-100 rounded" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-neutral-500">Geen leads gevonden</td>
                </tr>
              ) : leads.map(lead => (
                <tr
                  key={lead.id}
                  className="hover:bg-neutral-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-neutral-900">{lead.company_name}</div>
                    {lead.phone && <div className="text-xs text-neutral-500">{lead.phone}</div>}
                  </td>
                  <td className="px-3 py-3 text-neutral-600">{lead.city || "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {lead.phone_available && <Phone className="w-3.5 h-3.5 text-blue-500" />}
                      {lead.email_available && <Mail className="w-3.5 h-3.5 text-cyan-500" />}
                      {lead.instagram_available && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                      {lead.facebook_available && <Facebook className="w-3.5 h-3.5 text-indigo-500" />}
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-3 py-3"><OutreachBadge status={lead.outreach_status} /></td>
                  <td className="px-3 py-3"><NextActionBadge lead={lead} size="sm" /></td>
                  <td className="px-3 py-3 text-neutral-500 text-xs">{formatRelative(lead.last_contacted_at)}</td>
                  <td className="px-3 py-3">
                    {(() => {
                      const badge = getContactAttemptBadge(lead);
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color} ${badge.bgColor}`}>
                          {badge.label} ({lead.call_count + lead.email_count + lead.instagram_dm_count + lead.facebook_dm_count})
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Pagina {page} van {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 hover:bg-neutral-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 hover:bg-neutral-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updatedLead) => {
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
            setSelectedLead(updatedLead);
          }}
        />
      )}
    </div>
  );
}

function QuickFilter({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );
}
