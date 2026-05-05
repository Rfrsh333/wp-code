"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle, CheckCircle, Phone, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { FOLLOWUP_TYPE_CONFIG } from "./constants";
import type { CRMFollowup } from "./types";

type FilterType = "overdue" | "upcoming" | "all";

export default function FollowupView() {
  const [followups, setFollowups] = useState<CRMFollowup[]>([]);
  const [filter, setFilter] = useState<FilterType>("overdue");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { fetchFollowups(); }, [filter]);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function fetchFollowups() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/crm/followups?filter=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setFollowups(await res.json());
    } catch {
      toast.error("Fout bij laden follow-ups");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(id: string) {
    const token = await getToken();
    const res = await fetch("/api/admin/crm/followups/", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "voltooid" }),
    });
    if (res.ok) {
      setFollowups(prev => prev.filter(f => f.id !== id));
      toast.success("Follow-up voltooid");
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isOverdue = d < now;
    const formatted = d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return { formatted, isOverdue };
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { id: "overdue", label: "Verlopen", icon: AlertTriangle },
          { id: "upcoming", label: "Deze week", icon: Calendar },
          { id: "all", label: "Alles", icon: Clock },
        ] as { id: FilterType; label: string; icon: typeof Clock }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              filter === tab.id ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Follow-up list */}
      <div className="bg-white rounded-xl border border-neutral-100 divide-y divide-neutral-50">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse flex gap-4">
              <div className="h-10 w-10 bg-neutral-100 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-neutral-100 rounded" />
                <div className="h-3 w-24 bg-neutral-50 rounded" />
              </div>
            </div>
          ))
        ) : followups.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-sm">
            Geen {filter === "overdue" ? "verlopen" : "geplande"} follow-ups
          </div>
        ) : followups.map(followup => {
          const { formatted, isOverdue } = formatDate(followup.scheduled_at);
          const typeConfig = FOLLOWUP_TYPE_CONFIG[followup.type];
          return (
            <div key={followup.id} className="p-4 flex items-center gap-4 hover:bg-neutral-50">
              <div className={`p-2 rounded-lg ${isOverdue ? "bg-red-50" : "bg-blue-50"}`}>
                <Phone className={`w-5 h-5 ${isOverdue ? "text-red-600" : "text-blue-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900">{followup.lead?.company_name || "Onbekend"}</p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{followup.lead?.city}</span>
                  {followup.lead?.phone && <span>• {followup.lead.phone}</span>}
                </div>
                {followup.notes && <p className="text-xs text-neutral-400 mt-1">{followup.notes}</p>}
              </div>
              <div className="text-right">
                <p className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-neutral-600"}`}>{formatted}</p>
                <p className="text-xs text-neutral-400">{typeConfig?.label}</p>
              </div>
              <button
                onClick={() => markComplete(followup.id)}
                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                title="Markeer als voltooid"
              >
                <CheckCircle className="w-5 h-5 text-green-600" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
