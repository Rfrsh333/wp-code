"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface BusinessMetrics {
  pipeline: {
    total: number;
    byStage: {
      nieuw: number;
      benaderd: number;
      interesse: number;
      offerte: number;
      klant: number;
      afgewezen: number;
    };
    conversionRate: number;
    recentLeads: number;
    avgEngagement: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    trend: number;
    total: number;
  };
  operations: {
    activeDiensten: number;
    completedDiensten: number;
    fillRate: number;
    activeMedewerkers: number;
  };
  candidates: {
    newApplications: number;
    pendingReview: number;
    approvedThisMonth: number;
  };
  engagement: {
    totalContacts: number;
    positiveRate: number;
    topChannel: string | null;
    avgResponseTime: number;
    emailOpenRate: number;
  };
  period: {
    from: string;
    to: string;
  };
}

export default function BusinessMetricsDashboard() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setError("Niet ingelogd");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/admin/analytics/business", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Kon metrics niet ophalen");
      }

      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error("Metrics fetch error:", err);
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error || "Geen data beschikbaar"}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours * 10) / 10} uur`;
    return `${Math.round(hours / 24)} dagen`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Business Metrics</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Laatste 30 dagen • Bijgewerkt: {new Date().toLocaleString("nl-NL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors"
        >
          Ververs
        </button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <MetricCard
          title="Omzet Deze Maand"
          value={formatCurrency(metrics.revenue.thisMonth)}
          trend={metrics.revenue.trend}
          icon="💰"
          subtitle={`Vorige maand: ${formatCurrency(metrics.revenue.lastMonth)}`}
        />

        {/* Pipeline */}
        <MetricCard
          title="Leads in Pipeline"
          value={metrics.pipeline.total.toString()}
          subtitle={`${metrics.pipeline.recentLeads} nieuwe (30d)`}
          icon="🎯"
          trend={null}
        />

        {/* Active Diensten */}
        <MetricCard
          title="Actieve Diensten"
          value={metrics.operations.activeDiensten.toString()}
          subtitle={`${metrics.operations.fillRate}% bezetting`}
          icon="📅"
          trend={null}
        />

        {/* Conversion Rate */}
        <MetricCard
          title="Conversie Rate"
          value={`${metrics.pipeline.conversionRate}%`}
          subtitle={`${metrics.pipeline.byStage.klant} klanten`}
          icon="✨"
          trend={null}
        />
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Breakdown */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <span>📊</span>
            Pipeline Overzicht
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.pipeline.byStage).map(([stage, count]) => {
              const percentage = metrics.pipeline.total > 0
                ? (count / metrics.pipeline.total) * 100
                : 0;

              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-neutral-700 capitalize">
                      {stage}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div
                      className="bg-[#F27501] h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Gemiddelde Engagement</span>
              <span className="font-semibold text-neutral-900">{metrics.pipeline.avgEngagement}/100</span>
            </div>
          </div>
        </div>

        {/* Operations Stats */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <span>⚙️</span>
            Operationeel
          </h3>
          <div className="space-y-4">
            <StatRow
              label="Actieve Medewerkers"
              value={metrics.operations.activeMedewerkers.toString()}
              icon="👥"
            />
            <StatRow
              label="Diensten Voltooid"
              value={metrics.operations.completedDiensten.toString()}
              icon="✅"
            />
            <StatRow
              label="Bezettingsgraad"
              value={`${metrics.operations.fillRate}%`}
              icon="📈"
            />
            <StatRow
              label="Nieuwe Aanmeldingen"
              value={metrics.candidates.newApplications.toString()}
              icon="📝"
            />
            <StatRow
              label="In Beoordeling"
              value={metrics.candidates.pendingReview.toString()}
              icon="⏳"
            />
            <StatRow
              label="Goedgekeurd (Maand)"
              value={metrics.candidates.approvedThisMonth.toString()}
              icon="🎉"
            />
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <span>💬</span>
            Engagement
          </h3>
          <div className="space-y-4">
            <StatRow
              label="Totaal Contactmomenten"
              value={metrics.engagement.totalContacts.toString()}
              icon="📞"
            />
            <StatRow
              label="Positieve Reacties"
              value={`${metrics.engagement.positiveRate}%`}
              icon="😊"
            />
            <StatRow
              label="Top Kanaal"
              value={metrics.engagement.topChannel || "N/A"}
              icon="🏆"
            />
            <StatRow
              label="Gemiddelde Reactietijd"
              value={formatHours(metrics.engagement.avgResponseTime)}
              icon="⚡"
            />
            <StatRow
              label="Email Open Rate"
              value={`${metrics.engagement.emailOpenRate}%`}
              icon="📧"
            />
          </div>
        </div>

        {/* Revenue Details */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
            <span>💵</span>
            Financieel Overzicht
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-green-700 mb-1">Deze Maand</p>
              <p className="text-3xl font-bold text-green-900">
                {formatCurrency(metrics.revenue.thisMonth)}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700 mb-1">Vorige Maand</p>
              <p className="text-xl font-semibold text-green-800">
                {formatCurrency(metrics.revenue.lastMonth)}
              </p>
            </div>
            <div className="pt-4 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Trend</span>
                <span className={`text-lg font-bold ${
                  metrics.revenue.trend >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {metrics.revenue.trend >= 0 ? "+" : ""}
                  {metrics.revenue.trend}%
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Totaal Omzet</span>
                <span className="text-lg font-bold text-green-900">
                  {formatCurrency(metrics.revenue.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend: number | null;
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend !== null && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend >= 0
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-sm text-neutral-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-neutral-900 mb-2">{value}</p>
      <p className="text-xs text-neutral-500">{subtitle}</p>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  icon: string;
}

function StatRow({ label, value, icon }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-600 flex items-center gap-2">
        <span>{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold text-neutral-900">{value}</span>
    </div>
  );
}
