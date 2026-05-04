"use client";

import { useState } from "react";
import { Archive, Tag, Clock, Download } from "lucide-react";
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
  const toast = useToast();

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function bulkUpdate(updates: Record<string, unknown>) {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/leads", {
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
          onClick={exportSelected}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-orange-200 rounded-lg hover:bg-orange-100"
        >
          <Download className="w-3.5 h-3.5" />Export CSV
        </button>
      </div>
    </div>
  );
}
