"use client";

import { useState } from "react";
import { Archive, Tag, Clock, Download, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { STATUS_CONFIG } from "./constants";
import type { CRMStatus } from "./types";

interface BulkActionsBarProps {
  selectedIds: string[];
  onComplete: () => void;
}

export default function BulkActionsBar({ selectedIds, onComplete }: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [showInstantly, setShowInstantly] = useState(false);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const toast = useToast();

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function bulkUpdate(updates: Record<string, unknown>) {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/leads/", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, updates }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selectedIds.length} leads bijgewerkt`);
      onComplete();
    } catch {
      toast.error("Bulk actie mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaigns() {
    const token = await getToken();
    const res = await fetch("/api/admin/crm/instantly/", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setShowInstantly(true);
    } else {
      toast.error("Campagnes laden mislukt");
    }
  }

  async function pushToInstantly(campaignId: string) {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/instantly/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, lead_ids: selectedIds }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const data = await res.json();
      toast.success(`${data.added} leads naar Instantly gestuurd`);
      setShowInstantly(false);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Push mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function exportSelected() {
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/export?ids=${selectedIds.join(",")}&format=instantly`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { toast.error("Export mislukt"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export gedownload");
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
      <span className="text-sm font-medium text-orange-800">{selectedIds.length} geselecteerd</span>
      <div className="flex gap-2 ml-auto">
        <select
          disabled={loading}
          onChange={e => { if (e.target.value) bulkUpdate({ status: e.target.value }); e.target.value = ""; }}
          className="text-xs border border-orange-200 rounded-lg px-2 py-1.5 bg-white"
        >
          <option value="">Status wijzigen...</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <button
          onClick={() => bulkUpdate({ archived_at: new Date().toISOString() })}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-orange-200 rounded-lg hover:bg-orange-100"
        >
          <Archive className="w-3.5 h-3.5" />Archiveren
        </button>
        <button
          onClick={loadCampaigns}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100"
        >
          <Send className="w-3.5 h-3.5" />Instantly
        </button>
        <button
          onClick={exportSelected}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-orange-200 rounded-lg hover:bg-orange-100"
        >
          <Download className="w-3.5 h-3.5" />Export CSV
        </button>
      </div>
      {/* Instantly campaign picker */}
      {showInstantly && campaigns.length > 0 && (
        <div className="mt-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
          <p className="text-xs font-medium text-cyan-800 mb-2">Kies campagne:</p>
          <div className="flex flex-wrap gap-2">
            {campaigns.map(c => (
              <button
                key={c.id}
                onClick={() => pushToInstantly(c.id)}
                disabled={loading}
                className="px-3 py-1.5 text-xs bg-white border border-cyan-200 rounded-lg hover:bg-cyan-100 disabled:opacity-50"
              >
                {c.name}
              </button>
            ))}
            <button onClick={() => setShowInstantly(false)} className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700">
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
