"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Link2, UserPlus, XCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { InstantlyBadge } from "./StatusBadge";
import type { CRMUnmatchedInstantlyLead, DuplicateMatch, InstantlyStatus } from "./types";

interface UnmatchedLeadsViewProps {
  campaignId?: string;
  onResolved?: () => void;
}

export default function UnmatchedLeadsView({ campaignId, onResolved }: UnmatchedLeadsViewProps) {
  const [leads, setLeads] = useState<CRMUnmatchedInstantlyLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<DuplicateMatch[]>([]);
  const [searchMatch, setSearchMatch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const toast = useToast();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const params = new URLSearchParams({
        resolution: "pending",
        page: String(page),
        per_page: String(perPage),
      });
      if (campaignId) params.set("campaign_id", campaignId);

      const res = await fetch(`/api/admin/crm/unmatched-leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch {
      toast.error("Fout bij laden unmatched leads");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, perPage, toast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function handleMatch(unmatchedId: string) {
    // Open matching modal - search for duplicates
    setMatchingId(unmatchedId);
    setMatchSuggestions([]);
    setSearchMatch("");

    const unmatched = leads.find(l => l.id === unmatchedId);
    if (!unmatched) return;

    const token = await getToken();
    const res = await fetch("/api/admin/crm/duplicates", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: unmatched.email,
        phone: unmatched.phone,
        company_name: unmatched.company_name,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setMatchSuggestions(data.duplicates || []);
    }
  }

  async function confirmMatch(unmatchedId: string, leadId: string) {
    setProcessingId(unmatchedId);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/unmatched-leads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: unmatchedId, action: "match", lead_id: leadId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lead gekoppeld");
      setMatchingId(null);
      fetchLeads();
      onResolved?.();
    } catch {
      toast.error("Koppelen mislukt");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCreate(unmatchedId: string) {
    setProcessingId(unmatchedId);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/unmatched-leads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: unmatchedId, action: "create" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Nieuwe lead aangemaakt");
      fetchLeads();
      onResolved?.();
    } catch {
      toast.error("Aanmaken mislukt");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleIgnore(unmatchedId: string) {
    setProcessingId(unmatchedId);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/unmatched-leads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: unmatchedId, action: "ignore" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lead genegeerd");
      fetchLeads();
      onResolved?.();
    } catch {
      toast.error("Negeren mislukt");
    } finally {
      setProcessingId(null);
    }
  }

  const totalPages = Math.ceil(total / perPage);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-white rounded-lg border border-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <p className="text-sm">Geen unmatched leads</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">{total} leads zonder CRM match</p>

      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Bedrijf</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Status</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-500">Opens</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-500">Replies</th>
              <th className="text-right px-4 py-3 font-medium text-neutral-500">Acties</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-900">{lead.email}</td>
                <td className="px-4 py-3 text-neutral-600">{lead.company_name || "-"}</td>
                <td className="px-4 py-3">
                  <InstantlyBadge status={lead.email_status as InstantlyStatus} />
                </td>
                <td className="px-4 py-3 text-center text-neutral-600">{lead.open_count}</td>
                <td className="px-4 py-3 text-center text-neutral-600">{lead.reply_count}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {processingId === lead.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleMatch(lead.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Match aan bestaande lead"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCreate(lead.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Maak nieuwe lead"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleIgnore(lead.id)}
                          className="p-1.5 text-neutral-400 hover:bg-neutral-100 rounded-lg"
                          title="Negeer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-500">{total} totaal</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Match modal */}
      {matchingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setMatchingId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">Match aan bestaande lead</h3>
              <p className="text-sm text-neutral-500 mt-1">
                {leads.find(l => l.id === matchingId)?.email}
              </p>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
              {matchSuggestions.length > 0 ? (
                <>
                  <p className="text-xs font-medium text-neutral-500 uppercase">Suggesties</p>
                  {matchSuggestions.map(match => (
                    <div
                      key={match.lead_id}
                      className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">{match.company_name}</p>
                        <p className="text-xs text-neutral-500">{match.city} &middot; {match.email || match.phone}</p>
                        <div className="flex gap-1 mt-1">
                          {match.match_reasons.map((reason, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => confirmMatch(matchingId, match.lead_id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Koppel
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-neutral-500">Geen suggesties gevonden</p>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setMatchingId(null)}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
