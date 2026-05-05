"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { ChevronRight } from "lucide-react";

interface FunnelStage {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  count: number;
}

interface FunnelViewProps {
  onNavigateFilter?: (filter: string) => void;
}

export default function FunnelView({ onNavigateFilter }: FunnelViewProps) {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchFunnelData();
  }, []);

  async function fetchFunnelData() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/admin/crm/leads?per_page=1&page=1", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Get all leads to count by status/outreach
      const allRes = await fetch("/api/admin/crm/leads?per_page=9999&page=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!allRes.ok) throw new Error();
      const data = await allRes.json();
      const leads = data.leads || [];

      const funnelStages: FunnelStage[] = [
        {
          key: "nieuw",
          label: "Nieuw",
          color: "text-blue-700",
          bgColor: "bg-blue-50",
          count: leads.filter((l: { outreach_status: string }) => l.outreach_status === "not_started").length,
        },
        {
          key: "benaderd",
          label: "Benaderd",
          color: "text-indigo-700",
          bgColor: "bg-indigo-50",
          count: leads.filter((l: { outreach_status: string }) => ["in_progress", "contacted"].includes(l.outreach_status)).length,
        },
        {
          key: "gereageerd",
          label: "Gereageerd",
          color: "text-purple-700",
          bgColor: "bg-purple-50",
          count: leads.filter((l: { outreach_status: string }) => l.outreach_status === "replied").length,
        },
        {
          key: "geinteresseerd",
          label: "Geinteresseerd",
          color: "text-green-700",
          bgColor: "bg-green-50",
          count: leads.filter((l: { outreach_status: string }) => l.outreach_status === "interested").length,
        },
        {
          key: "afspraak",
          label: "Afspraak",
          color: "text-teal-700",
          bgColor: "bg-teal-50",
          count: leads.filter((l: { status: string }) => l.status === "afspraak_gepland").length,
        },
        {
          key: "testdienst",
          label: "Testdienst",
          color: "text-sky-700",
          bgColor: "bg-sky-50",
          count: leads.filter((l: { status: string }) => ["testdienst_ingepland", "testdienst_afgerond"].includes(l.status)).length,
        },
        {
          key: "klant",
          label: "Klant",
          color: "text-emerald-700",
          bgColor: "bg-emerald-50",
          count: leads.filter((l: { status: string; outreach_status: string }) => l.status === "klant_geworden" || l.outreach_status === "converted").length,
        },
      ];

      setStages(funnelStages);
    } catch {
      toast.error("Fout bij laden funnel");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-16 bg-neutral-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const totalStart = stages[0]?.count || 1;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-neutral-900">Sales Pipeline</h3>

      {/* Visual funnel */}
      <div className="space-y-2">
        {stages.map((stage, i) => {
          const widthPct = Math.max(20, (stage.count / maxCount) * 100);
          const prevCount = i > 0 ? stages[i - 1].count : stage.count;
          const convPct = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;

          return (
            <button
              key={stage.key}
              onClick={() => onNavigateFilter?.(`outreach_status=${stage.key}`)}
              className="w-full group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`${stage.bgColor} rounded-xl p-4 transition-all hover:ring-2 ring-neutral-200 flex items-center justify-between`}
                  style={{ width: `${widthPct}%`, minWidth: "200px" }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                  </div>
                  <span className={`text-2xl font-bold ${stage.color}`}>{stage.count}</span>
                </div>
                {i > 0 && (
                  <span className={`text-xs font-medium ${convPct > 50 ? "text-green-600" : convPct > 20 ? "text-orange-600" : "text-red-500"}`}>
                    {convPct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-neutral-50 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-neutral-900">{stages[0]?.count || 0}</p>
            <p className="text-xs text-neutral-500">Totaal in funnel</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{stages[stages.length - 1]?.count || 0}</p>
            <p className="text-xs text-neutral-500">Klanten</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">
              {totalStart > 0 ? Math.round(((stages[stages.length - 1]?.count || 0) / totalStart) * 100) : 0}%
            </p>
            <p className="text-xs text-neutral-500">Conversie</p>
          </div>
        </div>
      </div>
    </div>
  );
}
