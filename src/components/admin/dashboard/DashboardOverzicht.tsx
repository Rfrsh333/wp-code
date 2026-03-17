"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Calculator,
  ChevronDown,
  Inbox,
  Plus,
  ClipboardList,
  Target,
  CalendarRange,
  Sun,
  Zap,
  Users,
  TrendingUp,
  Euro,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminDashboardExtended, type DashboardExtendedData } from "@/hooks/queries/useAdminQueries";
import StatCard from "./StatCard";
import type { AdminTab } from "@/lib/navigation/sidebar-types";

// ─── Types ───
interface OnboardingMetrics {
  nieuw: number;
  documenten_opvragen: number;
  goedgekeurd: number;
  inzetbaar: number;
}

interface WorkflowAlert {
  label: string;
  value: number;
  tone: string;
}

interface OpsSnapshot {
  health: {
    resendConfigured: boolean;
    redisConfigured: boolean;
    cronConfigured: boolean;
    serviceRoleConfigured: boolean;
  };
  counters: {
    expiredUploadLinks: number;
    candidatesWaitingTooLong: number;
    inzetbaarWithoutProfile: number;
    pendingDocumentReviews: number;
    bouncedEmails: number;
    openTasks: number;
    overdueTasks: number;
    testCandidates: number;
  };
  recentAudit: Array<{
    id: string;
    actor_email: string | null;
    actor_role: string | null;
    action: string;
    target_table: string;
    target_id: string | null;
    summary: string;
    created_at: string;
  }>;
}

interface Stats {
  aanvragen: { total: number; nieuw: number };
  inschrijvingen: { total: number; nieuw: number };
  contact: { total: number; nieuw: number };
  calculator: { total: number; downloaded: number };
}

interface ActivityItem {
  id: string;
  created_at: string;
  type: "aanvraag" | "inschrijving" | "contact";
  naam: string;
}

interface DashboardOverzichtProps {
  stats: Stats;
  onboardingMetrics: { metrics: OnboardingMetrics; avgProcessingTime: number };
  workflowAlerts: WorkflowAlert[];
  opsSnapshot: OpsSnapshot | null;
  activityItems: ActivityItem[];
  onTabChange: (tab: AdminTab) => void;
  onExportFunnel: () => void;
}

// ─── Mini bar chart ───
function MiniBarChart({ data }: { data: { week: string; omzet: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-neutral-400">Nog geen data</p>;
  const max = Math.max(...data.map((d) => d.omzet), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 60 }}>
      {data.map((d, i) => (
        <div key={d.week} className="flex flex-col items-center flex-1">
          <div
            className={cn("w-full rounded", i === data.length - 1 ? "bg-violet-600" : "bg-violet-200")}
            style={{ height: Math.max(6, (d.omzet / max) * 60), transition: "height 0.3s" }}
          />
          <span className="text-[10px] text-neutral-400 mt-1">{d.week}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart ───
function DonutChart({ segments, size = 100 }: { segments: { value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="36" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <text x="50" y="48" textAnchor="middle" className="text-lg font-bold fill-neutral-900">0</text>
        <text x="50" y="62" textAnchor="middle" className="text-[9px] fill-neutral-400">totaal</text>
      </svg>
    );
  }
  let cumulative = 0;
  const r = 36;
  const circumference = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {segments
        .filter((s) => s.value > 0)
        .map((seg, i) => {
          const offset = (cumulative / total) * circumference;
          const length = (seg.value / total) * circumference;
          cumulative += seg.value;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="10"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
              style={{ transition: "all 0.5s ease" }}
            />
          );
        })}
      <text x="50" y="48" textAnchor="middle" style={{ fontSize: 18, fontWeight: 700 }} className="fill-neutral-900">
        {total}
      </text>
      <text x="50" y="62" textAnchor="middle" style={{ fontSize: 9 }} className="fill-neutral-400">
        totaal
      </text>
    </svg>
  );
}

// ─── Collapsible card ───
function CollapsibleCard({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="font-semibold text-[15px] text-neutral-900">{title}</span>
          {badge && (
            <span className="bg-green-100 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-neutral-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div
        className={cn("overflow-hidden transition-all duration-300", open ? "max-h-[500px]" : "max-h-0")}
      >
        <div className="px-6 pb-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main component ───
export default function DashboardOverzicht({
  stats,
  onboardingMetrics,
  workflowAlerts,
  opsSnapshot,
  activityItems,
  onTabChange,
  onExportFunnel,
}: DashboardOverzichtProps) {
  const { data: extendedData } = useAdminDashboardExtended();
  const [showHiddenStats, setShowHiddenStats] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"week" | "vandaag" | "maand">("week");

  const vandaag = extendedData?.vandaag ?? { dienstenActief: 0, medewerkerIngepland: 0, openDiensten: 0, noShows: 0 };
  const beschikbaarheid = extendedData?.beschikbaarheid ?? { totaal: 0, actief: 0, ingepland: 0, beschikbaar: 0, gepauzeerd: 0 };
  const omzet = extendedData?.omzet ?? { dezeMaand: 0, vorigeMaand: 0, openstaand: 0, weekData: [] };

  const omzetChange = omzet.vorigeMaand > 0
    ? Math.round(((omzet.dezeMaand - omzet.vorigeMaand) / omzet.vorigeMaand) * 100)
    : 0;

  // Actie vereist: combine workflow alerts with new aanvragen
  const allActies = useMemo(() => {
    const acties: { id: string; text: string; urgent: boolean; tab: AdminTab }[] = [];
    if (stats.aanvragen.nieuw > 0) {
      acties.push({ id: "aanvragen", text: `${stats.aanvragen.nieuw} nieuwe personeel aanvragen`, urgent: true, tab: "aanvragen" });
    }
    for (const alert of workflowAlerts) {
      acties.push({
        id: alert.label,
        text: `${alert.label}: ${alert.value}`,
        urgent: alert.tone.includes("red"),
        tab: "inschrijvingen",
      });
    }
    return acties;
  }, [stats, workflowAlerts]);

  // Filter activity items
  const filteredActivity = useMemo(() => {
    const now = Date.now();
    return activityItems.filter((item) => {
      const age = now - new Date(item.created_at).getTime();
      if (activityFilter === "vandaag") return age < 24 * 60 * 60 * 1000;
      if (activityFilter === "week") return age < 7 * 24 * 60 * 60 * 1000;
      return age < 30 * 24 * 60 * 60 * 1000;
    });
  }, [activityItems, activityFilter]);

  // Hidden stat cards (value = 0)
  const hasHiddenStats = stats.contact.total === 0 || stats.calculator.total === 0;
  const visibleStatsCount = (stats.contact.total > 0 || showHiddenStats ? 1 : 0) + (stats.calculator.total > 0 || showHiddenStats ? 1 : 0);

  const { metrics, avgProcessingTime } = onboardingMetrics;
  const totalActive = Math.max(1, metrics.nieuw + metrics.documenten_opvragen + metrics.goedgekeurd + metrics.inzetbaar);

  return (
    <div>
      {/* ─── ROW 1: Vandaag + Actie Vereist ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        {/* Vandaag */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-amber-900">Vandaag</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Actieve diensten", value: vandaag.dienstenActief, color: "text-green-600" },
              { label: "Ingepland", value: vandaag.medewerkerIngepland, color: "text-blue-600" },
              { label: "Open diensten", value: vandaag.openDiensten, color: "text-amber-600" },
              { label: "No-shows", value: vandaag.noShows, color: vandaag.noShows > 0 ? "text-red-600" : "text-neutral-400" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={cn("text-2xl sm:text-3xl font-bold tabular-nums", item.color)}>{item.value}</div>
                <div className="text-xs text-stone-600">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actie vereist */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-bold text-neutral-900">Actie Vereist</h2>
            </div>
            {allActies.filter((a) => a.urgent).length > 0 && (
              <span className="bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {allActies.filter((a) => a.urgent).length} urgent
              </span>
            )}
          </div>
          <div>
            {allActies.length === 0 ? (
              <div className="mx-6 mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                Alles is bijgewerkt — geen openstaande acties.
              </div>
            ) : (
              allActies.map((actie) => (
                <button
                  key={actie.id}
                  onClick={() => onTabChange(actie.tab)}
                  className="flex items-center justify-between w-full px-6 py-2.5 border-t border-neutral-50 hover:bg-neutral-50 transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {actie.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                    {!actie.urgent && <span className="w-1.5" />}
                    <span className="text-sm text-neutral-700">{actie.text}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-300" />
                </button>
              ))
            )}
            <div className="mx-6 mb-4 mt-2 rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-2.5 text-sm text-neutral-700">
              Open taken: <strong>{opsSnapshot?.counters.openTasks ?? 0}</strong> · Testkandidaten: <strong>{opsSnapshot?.counters.testCandidates ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick actions ─── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { label: "Nieuwe Medewerker", icon: Plus, color: "text-[#F27501]", tab: "inschrijvingen" as AdminTab },
          { label: "Aanvraag verwerken", icon: ClipboardList, color: "text-blue-500", tab: "aanvragen" as AdminTab },
          { label: "Lead toevoegen", icon: Target, color: "text-green-500", tab: "leads" as AdminTab },
          { label: "Planning", icon: CalendarRange, color: "text-purple-500", tab: "planning" as AdminTab },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => onTabChange(btn.tab)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 hover:border-neutral-300"
          >
            <btn.icon className={cn("h-4 w-4", btn.color)} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* ─── ROW 2: Stat cards (slim) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Personeel aanvragen"
          value={stats.aanvragen.total}
          icon={BriefcaseBusiness}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          badge={stats.aanvragen.nieuw > 0 ? { count: stats.aanvragen.nieuw, label: "nieuw", color: "bg-red-100 text-red-600" } : undefined}
          onClick={() => onTabChange("aanvragen")}
        />
        <StatCard
          title="Inschrijvingen"
          value={stats.inschrijvingen.total}
          icon={Users}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          badge={stats.inschrijvingen.nieuw > 0 ? { count: stats.inschrijvingen.nieuw, label: "nieuw", color: "bg-red-100 text-red-600" } : undefined}
          onClick={() => onTabChange("inschrijvingen")}
        />
        {(stats.contact.total > 0 || showHiddenStats) && (
          <StatCard
            title="Contact berichten"
            value={stats.contact.total}
            icon={Inbox}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            badge={stats.contact.nieuw > 0 ? { count: stats.contact.nieuw, label: "nieuw", color: "bg-red-100 text-red-600" } : undefined}
            onClick={() => onTabChange("contact")}
          />
        )}
        {(stats.calculator.total > 0 || showHiddenStats) && (
          <StatCard
            title="Calculator leads"
            value={stats.calculator.total}
            icon={Calculator}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            badge={stats.calculator.downloaded > 0 ? { count: stats.calculator.downloaded, label: "PDF", color: "bg-green-100 text-green-600" } : undefined}
            onClick={() => onTabChange("calculator")}
          />
        )}
        {hasHiddenStats && !showHiddenStats && (
          <button
            onClick={() => setShowHiddenStats(true)}
            className="flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 text-neutral-400 text-sm hover:border-neutral-400 hover:text-neutral-500 transition min-h-[112px]"
          >
            +{(stats.contact.total === 0 ? 1 : 0) + (stats.calculator.total === 0 ? 1 : 0)} meer
          </button>
        )}
      </div>

      {/* ─── ROW 3: Beschikbaarheid + Omzet ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <CollapsibleCard
          title="Beschikbaarheid"
          icon={<Users className="h-5 w-5 text-blue-600" />}
        >
          <div className="flex items-center gap-6">
            <DonutChart
              size={110}
              segments={[
                { value: beschikbaarheid.beschikbaar, color: "#22c55e" },
                { value: beschikbaarheid.ingepland, color: "#3b82f6" },
                { value: beschikbaarheid.gepauzeerd, color: "#f59e0b" },
              ]}
            />
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                { label: "Beschikbaar", value: beschikbaarheid.beschikbaar, color: "bg-green-500" },
                { label: "Ingepland", value: beschikbaarheid.ingepland, color: "bg-blue-500" },
                { label: "Gepauzeerd", value: beschikbaarheid.gepauzeerd, color: "bg-amber-500" },
                { label: "Actief totaal", value: beschikbaarheid.actief, color: "bg-neutral-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                  <div>
                    <div className="text-lg font-bold text-neutral-900 tabular-nums">{item.value}</div>
                    <div className="text-xs text-neutral-500">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Omzet"
          icon={<Euro className="h-5 w-5 text-violet-600" />}
          badge={omzetChange !== 0 ? `${omzetChange > 0 ? "+" : ""}${omzetChange}%` : undefined}
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Deze maand</div>
              <div className="text-2xl font-bold text-neutral-900 tabular-nums">
                €{omzet.dezeMaand.toLocaleString("nl-NL")}
              </div>
              {omzetChange !== 0 && (
                <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", omzetChange > 0 ? "text-green-600" : "text-red-500")}>
                  <TrendingUp className="h-3 w-3" />
                  <span>{omzetChange > 0 ? "+" : ""}{omzetChange}% vs vorige maand</span>
                </div>
              )}
              {omzet.openstaand > 0 && (
                <div className="mt-3 text-sm text-amber-600 font-medium">
                  €{omzet.openstaand.toLocaleString("nl-NL")} openstaand
                </div>
              )}
            </div>
            <div className="w-36">
              <MiniBarChart data={omzet.weekData} />
            </div>
          </div>
        </CollapsibleCard>
      </div>

      {/* ─── ROW 4: Funnel + Activiteit + Operations ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        {/* Onboarding Funnel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-neutral-900">Onboarding Funnel</h3>
            <button
              onClick={onExportFunnel}
              className="text-sm text-violet-600 font-medium hover:text-violet-700"
            >
              Exporteer
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {([
              ["Nieuw", metrics.nieuw],
              ["Docs opvragen", metrics.documenten_opvragen],
              ["Goedgekeurd", metrics.goedgekeurd],
              ["Inzetbaar", metrics.inzetbaar],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-neutral-50 p-4 text-center">
                <p className="text-2xl font-bold text-neutral-900">{value}</p>
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{Math.round((value / totalActive) * 100)}%</p>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-neutral-100 mb-3">
            {[
              { value: metrics.nieuw, color: "bg-violet-600" },
              { value: metrics.documenten_opvragen, color: "bg-violet-400" },
              { value: metrics.goedgekeurd, color: "bg-violet-300" },
              { value: metrics.inzetbaar, color: "bg-green-500" },
            ].map((step, i) => (
              <div
                key={i}
                className={cn(step.color, "transition-all duration-300")}
                style={{ flex: step.value > 0 ? step.value : 0 }}
              />
            ))}
          </div>
          <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 text-sm text-green-800">
            Gemiddelde doorlooptijd: <strong>{avgProcessingTime > 0 ? `${avgProcessingTime.toFixed(1)} dagen` : "nog onvoldoende data"}</strong>
          </div>
        </div>

        {/* Activiteit + Operations */}
        <div className="flex flex-col gap-5">
          {/* Recente activiteit */}
          <div className="bg-white rounded-2xl p-6 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-neutral-900">Recente activiteit</h3>
              <div className="flex gap-1">
                {(["vandaag", "week", "maand"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActivityFilter(f)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium transition",
                      activityFilter === f
                        ? "bg-violet-600 text-white"
                        : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    {f === "vandaag" ? "Vandaag" : f === "week" ? "Week" : "Maand"}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-neutral-100">
              {filteredActivity.slice(0, 6).map((item) => {
                const typeConfig = {
                  aanvraag: { icon: BriefcaseBusiness, bg: "bg-blue-100", color: "text-blue-600", badgeColor: "bg-blue-100 text-blue-700", badgeLabel: "Aanvraag" },
                  inschrijving: { icon: Users, bg: "bg-green-100", color: "text-green-600", badgeColor: "bg-green-100 text-green-700", badgeLabel: "Kandidaat" },
                  contact: { icon: Inbox, bg: "bg-purple-100", color: "text-purple-600", badgeColor: "bg-purple-100 text-purple-700", badgeLabel: "Bericht" },
                }[item.type];
                const Icon = typeConfig.icon;
                const timeAgo = getTimeAgo(item.created_at);
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", typeConfig.bg)}>
                      <Icon className={cn("h-4 w-4", typeConfig.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{item.naam}</p>
                    </div>
                    <span className={cn("hidden sm:inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", typeConfig.badgeColor)}>
                      {typeConfig.badgeLabel}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400 tabular-nums">{timeAgo}</span>
                  </div>
                );
              })}
              {filteredActivity.length === 0 && (
                <p className="py-4 text-sm text-neutral-400 text-center">Geen activiteit in deze periode</p>
              )}
            </div>
          </div>

          {/* Operations compact */}
          <div className="bg-white rounded-2xl px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-neutral-900">Operations</span>
              {opsSnapshot && Object.values(opsSnapshot.counters).slice(0, 4).every((v) => v === 0) ? (
                <span className="text-xs text-green-600 font-medium">Alles OK</span>
              ) : (
                <span className="text-xs text-neutral-500">Live checks</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {[
                { label: "Verlopen uploadlinks", value: opsSnapshot?.counters.expiredUploadLinks ?? 0 },
                { label: "Wachten te lang", value: opsSnapshot?.counters.candidatesWaitingTooLong ?? 0 },
                { label: "In review docs", value: opsSnapshot?.counters.pendingDocumentReviews ?? 0 },
                { label: "Zonder profiel", value: opsSnapshot?.counters.inzetbaarWithoutProfile ?? 0 },
              ].map((op) => (
                <div key={op.label} className="flex items-center justify-between text-xs py-1">
                  <span className="text-neutral-500">{op.label}</span>
                  <span className={cn("font-semibold tabular-nums", op.value > 0 ? "text-red-600" : "text-green-600")}>
                    {op.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 5: Audit log ─── */}
      {opsSnapshot?.recentAudit && opsSnapshot.recentAudit.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-neutral-900 mb-4">Audit log</h3>
          <div className="space-y-2">
            {opsSnapshot.recentAudit.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">{item.summary}</p>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {new Date(item.created_at).toLocaleString("nl-NL")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {item.actor_email || "onbekend"} · {item.target_table} · {item.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Nu";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Gisteren";
  return `${days} dagen`;
}
