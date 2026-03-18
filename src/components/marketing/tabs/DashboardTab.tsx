"use client";

import {
  FileText,
  Newspaper,
  Linkedin,
  Globe,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
} from "lucide-react";

export default function DashboardTab() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#F27501] to-[#FF8C42] rounded-2xl shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Marketing Dashboard</h1>
        <p className="text-white/90">
          Welkom bij het TopTalent marketing dashboard. Beheer content, social media, leads en meer.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Newspaper}
          title="Blog Posts"
          value="12"
          subtitle="Gepubliceerd deze maand"
          color="blue"
        />
        <StatCard
          icon={Linkedin}
          title="LinkedIn Posts"
          value="24"
          subtitle="Dit kwartaal"
          color="indigo"
        />
        <StatCard
          icon={Users}
          title="Nieuwe Leads"
          value="47"
          subtitle="Deze week"
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          title="Conversie Rate"
          value="3.2%"
          subtitle="+0.5% vs vorige maand"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">
          Snelle Acties
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            icon={FileText}
            title="Nieuw Blog Artikel"
            description="Maak een nieuw blog artikel aan"
            color="blue"
          />
          <QuickAction
            icon={Linkedin}
            title="LinkedIn Post"
            description="Genereer een LinkedIn post"
            color="indigo"
          />
          <QuickAction
            icon={Globe}
            title="GEO Content"
            description="Genereer content met AI"
            color="purple"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">
          Recente Activiteit
        </h2>
        <div className="space-y-3">
          <ActivityItem
            icon={CheckCircle}
            title="Blog artikel gepubliceerd"
            subtitle="'Werken in de horeca: Tips voor werkgevers'"
            time="2 uur geleden"
          />
          <ActivityItem
            icon={Linkedin}
            title="LinkedIn post gedeeld"
            subtitle="Nieuwe vacatures in Utrecht"
            time="5 uur geleden"
          />
          <ActivityItem
            icon={Users}
            title="Nieuwe lead toegevoegd"
            subtitle="Restaurant De Gouden Beker"
            time="1 dag geleden"
          />
          <ActivityItem
            icon={Calendar}
            title="Content planning bijgewerkt"
            subtitle="Q2 2026 content kalender"
            time="2 dagen geleden"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: any;
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "indigo" | "green" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-[#F27501]",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div
        className={`inline-flex p-3 rounded-xl ${colorClasses[color]} mb-4`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-3xl font-bold text-neutral-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-neutral-700 mb-1">{title}</div>
      <div className="text-xs text-neutral-500">{subtitle}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: any;
  title: string;
  description: string;
  color: "blue" | "indigo" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
    purple: "bg-purple-50 text-purple-600 hover:bg-purple-100",
  };

  return (
    <button
      className={`flex items-start gap-4 p-4 rounded-xl transition-colors text-left ${colorClasses[color]}`}
    >
      <div className="p-2 bg-white rounded-lg shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-neutral-900 mb-0.5">{title}</div>
        <div className="text-sm text-neutral-600">{description}</div>
      </div>
    </button>
  );
}

function ActivityItem({
  icon: Icon,
  title,
  subtitle,
  time,
}: {
  icon: any;
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
      <div className="p-2 bg-neutral-100 rounded-lg">
        <Icon className="h-4 w-4 text-neutral-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 text-sm">{title}</div>
        <div className="text-sm text-neutral-600">{subtitle}</div>
        <div className="text-xs text-neutral-400 mt-0.5">{time}</div>
      </div>
    </div>
  );
}
