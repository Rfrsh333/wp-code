"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, Instagram, MessageCircle, Users, Target, Clock, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import DailyTargets from "./DailyTargets";
import HotLeads from "./HotLeads";
import ActionLists from "./ActionLists";
import type { CRMLead, CRMDashboardResponse } from "./types";

interface DashboardViewProps {
  onStartCallingSession?: () => void;
  onSelectLead?: (lead: CRMLead) => void;
  onNavigateFilter?: (filter: string) => void;
}

export default function DashboardView({ onStartCallingSession, onSelectLead, onNavigateFilter }: DashboardViewProps) {
  const [data, setData] = useState<CRMDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/admin/crm/dashboard/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Fout bij laden dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-28 bg-white rounded-2xl shadow-sm" />
        ))}
      </div>
    );
  }

  if (!data) return null;
  const { stats, todo, hot_leads = [], action_phone = [], action_followup_overdue = [] } = data;

  function handleQuickAction(lead: CRMLead, action: string) {
    if (onSelectLead) onSelectLead(lead);
  }

  function handleNavigate(filter: string) {
    if (onNavigateFilter) onNavigateFilter(filter);
  }

  // Count closing stage leads from stats
  const closingCount = 0; // Will be populated from API when available

  return (
    <div className="space-y-6">
      {/* 1. Daily Targets + Start Belsessie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DailyTargets
            callsToday={stats.calls_today}
            dmsToday={stats.instagram_dms_today + stats.facebook_dms_today}
            gesprekkenToday={stats.gesprekken_today}
            interestToday={stats.interest_today || 0}
            appointmentsToday={stats.appointments_today || 0}
          />
        </div>
        <div className="flex flex-col gap-3">
          {onStartCallingSession && (
            <button
              onClick={onStartCallingSession}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 group"
            >
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <Zap className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">Start Belsessie</p>
                <p className="text-blue-200 text-sm">{todo.phone} leads te bellen</p>
              </div>
            </button>
          )}
          <div className="bg-white border border-neutral-100 rounded-2xl p-4 flex-1">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-3">Vandaag doen</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Te bellen</span>
                <span className="text-sm font-bold text-blue-700">{todo.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Follow-ups verlopen</span>
                <span className={`text-sm font-bold ${todo.followup_overdue > 0 ? "text-red-600" : "text-neutral-400"}`}>{todo.followup_overdue}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Replies opvolgen</span>
                <span className="text-sm font-bold text-purple-700">{todo.replied}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hot Leads */}
      <HotLeads
        leads={hot_leads}
        onSelectLead={lead => onSelectLead?.(lead)}
        onQuickAction={handleQuickAction}
      />

      {/* 3. Action Lists */}
      <ActionLists
        phoneTodo={todo.phone}
        repliedCount={todo.replied}
        closingCount={closingCount}
        overdueCount={todo.followup_overdue}
        onNavigate={handleNavigate}
      />

      {/* 4. Activity Stats Vandaag */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Activiteit vandaag</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Phone} label="Calls" value={stats.calls_today} color="blue" />
          <StatCard icon={Mail} label="Emails" value={stats.emails_today} color="cyan" />
          <StatCard icon={Instagram} label="Instagram DMs" value={stats.instagram_dms_today} color="pink" />
          <StatCard icon={MessageCircle} label="Facebook" value={stats.facebook_dms_today} color="indigo" />
          <StatCard icon={Users} label="Gesprekken" value={stats.gesprekken_today} color="green" />
        </div>
      </div>

      {/* 5. Pipeline Stats */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Target} label="Totaal leads" value={stats.total} color="gray" />
          <StatCard icon={Users} label="Nieuw" value={stats.nieuw} color="blue" />
          <StatCard icon={MessageCircle} label="In gesprek" value={stats.in_gesprek} color="purple" />
          <StatCard icon={TrendingUp} label="Conversie" value={`${stats.conversion_rate}%`} color="green" />
        </div>
      </div>

      {/* 6. Outreach Funnel */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Outreach funnel</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Target} label="Gereageerd" value={stats.replies_total} color="purple" />
          <StatCard icon={TrendingUp} label="Geïnteresseerd" value={stats.interested_total} color="green" />
          <StatCard icon={Users} label="Klant geworden" value={stats.converted_total} color="emerald" />
          <StatCard icon={Clock} label="Follow-ups open" value={stats.followups_due} color="orange" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Phone; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    cyan: "bg-cyan-50 text-cyan-700",
    pink: "bg-pink-50 text-pink-700",
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-neutral-50 text-neutral-700",
  };
  const classes = colorMap[color] || colorMap.gray;

  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4">
      <div className={`inline-flex p-2 rounded-lg ${classes} mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
