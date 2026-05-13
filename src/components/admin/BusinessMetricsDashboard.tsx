"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LineChart, Line, BarChart, Bar, FunnelChart, Funnel, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { downloadCSV, metricsToCSV } from "@/lib/export-utils";

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
  charts: {
    revenueTrend: Array<{ month: string; revenue: number }>;
    channelPerformance: Array<{ channel: string; contacts: number; positive: number }>;
    pipelineFunnel: Array<{ stage: string; count: number }>;
  };
}

export default function BusinessMetricsDashboard() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "6m" | "1y">("30d");
  const [selectedBranche, setSelectedBranche] = useState<string>("all");
  const [selectedStad, setSelectedStad] = useState<string>("all");
  const [branches] = useState<string[]>(["Horeca", "Bouw", "Logistiek", "Retail", "Evenementen"]);
  const [steden] = useState<string[]>(["Amsterdam", "Rotterdam", "Utrecht", "Den Haag", "Eindhoven"]);

  useEffect(() => {
    fetchMetrics();
  }, [dateRange, selectedBranche, selectedStad]);

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

      const params = new URLSearchParams({
        range: dateRange,
        ...(selectedBranche !== "all" && { branche: selectedBranche }),
        ...(selectedStad !== "all" && { stad: selectedStad }),
      });

      const res = await fetch(`/api/admin/analytics/business?${params}`, {
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

  const handleCSVExport = () => {
    if (!metrics) return;
    const csvData = metricsToCSV(metrics);
    downloadCSV(csvData, "toptalent-business-metrics");
  };

  const handlePDFExport = async () => {
    if (!metrics) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return;

      const res = await fetch("/api/admin/analytics/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ metrics }),
      });

      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `business-metrics-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("PDF export mislukt");
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Business Metrics</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {dateRange === "7d" && "Laatste 7 dagen"}
            {dateRange === "30d" && "Laatste 30 dagen"}
            {dateRange === "90d" && "Laatste 90 dagen"}
            {dateRange === "6m" && "Laatste 6 maanden"}
            {dateRange === "1y" && "Laatste jaar"}
            {" • "}Bijgewerkt: {new Date().toLocaleString("nl-NL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
          >
            <option value="7d">7 dagen</option>
            <option value="30d">30 dagen</option>
            <option value="90d">90 dagen</option>
            <option value="6m">6 maanden</option>
            <option value="1y">1 jaar</option>
          </select>

          {/* Branche Filter */}
          <select
            value={selectedBranche}
            onChange={(e) => setSelectedBranche(e.target.value)}
            className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
          >
            <option value="all">Alle branches</option>
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Stad Filter */}
          <select
            value={selectedStad}
            onChange={(e) => setSelectedStad(e.target.value)}
            className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
          >
            <option value="all">Alle steden</option>
            {steden.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Export Buttons */}
          <button
            onClick={handleCSVExport}
            disabled={!metrics}
            className="px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg text-sm font-medium text-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📄 CSV
          </button>

          <button
            onClick={handlePDFExport}
            disabled={!metrics}
            className="px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg text-sm font-medium text-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📕 PDF
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors"
          >
            🔄 Ververs
          </button>
        </div>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <span>📈</span>
            Omzet Trend (6 Maanden)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics.charts.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#999"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#999"
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [`€${value.toLocaleString("nl-NL")}`, "Omzet"]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px"
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#F27501"
                strokeWidth={3}
                dot={{ fill: "#F27501", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <span>🎯</span>
            Pipeline Funnel
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.charts.pipelineFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#999" />
              <YAxis
                dataKey="stage"
                type="category"
                tick={{ fontSize: 12 }}
                stroke="#999"
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [`${value} leads`, "Aantal"]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {metrics.charts.pipelineFunnel.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={[
                    "#93c5fd", // blue-300
                    "#60a5fa", // blue-400
                    "#3b82f6", // blue-500
                    "#F27501", // orange
                    "#16a34a", // green-600
                  ][index] || "#F27501"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Performance */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <span>💬</span>
            Kanaal Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.charts.channelPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="channel"
                tick={{ fontSize: 11 }}
                stroke="#999"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Bar dataKey="contacts" fill="#94a3b8" name="Totaal" radius={[8, 8, 0, 0]} />
              <Bar dataKey="positive" fill="#22c55e" name="Positief" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
