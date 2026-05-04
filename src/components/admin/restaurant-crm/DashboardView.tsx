"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, Instagram, MessageCircle, Users, Target, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

interface DashboardData {
  stats: {
    total: number;
    nieuw: number;
    in_gesprek: number;
    gewonnen: number;
    verloren: number;
    followups_due: number;
    followups_overdue: number;
    contacted_today: number;
    conversion_rate: number;
    calls_today: number;
    emails_today: number;
    instagram_dms_today: number;
    facebook_dms_today: number;
    gesprekken_today: number;
    replies_total: number;
    interested_total: number;
    converted_total: number;
  };
  todo: {
    phone: number;
    followup_overdue: number;
    replied: number;
  };
}

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/admin/crm/dashboard", {
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
  const { stats, todo } = data;

  return (
    <div className="space-y-6">
      {/* Vandaag Doen */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-orange-900 mb-3">Vandaag doen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{todo.phone}</p>
              <p className="text-sm text-neutral-600">Te bellen</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{todo.followup_overdue}</p>
              <p className="text-sm text-neutral-600">Verlopen follow-ups</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{todo.replied}</p>
              <p className="text-sm text-neutral-600">Wachten op opvolging</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats Vandaag */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">Activiteit vandaag</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Phone} label="Calls" value={stats.calls_today} color="blue" />
          <StatCard icon={Mail} label="Emails" value={stats.emails_today} color="cyan" />
          <StatCard icon={Instagram} label="Instagram DMs" value={stats.instagram_dms_today} color="pink" />
          <StatCard icon={MessageCircle} label="Facebook" value={stats.facebook_dms_today} color="indigo" />
          <StatCard icon={Users} label="Gesprekken" value={stats.gesprekken_today} color="green" />
        </div>
      </div>

      {/* Pipeline Stats */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Target} label="Totaal leads" value={stats.total} color="gray" />
          <StatCard icon={Users} label="Nieuw" value={stats.nieuw} color="blue" />
          <StatCard icon={MessageCircle} label="In gesprek" value={stats.in_gesprek} color="purple" />
          <StatCard icon={TrendingUp} label="Conversie" value={`${stats.conversion_rate}%`} color="green" />
        </div>
      </div>

      {/* Outreach Funnel */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">Outreach funnel</h3>
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
