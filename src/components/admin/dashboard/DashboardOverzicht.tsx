"use client";

import { useMemo, useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import {
  BriefcaseBusiness,
  AlertCircle,
  Inbox,
  Users,
  TrendingUp,
  Euro,
  Activity,
  CheckCircle2,
  Clock,
  UserCheck,
  Calendar,
  Briefcase,
  AlertTriangle,
  Target,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminDashboardExtended } from "@/hooks/queries/useAdminQueries";
import type { AdminTab } from "@/lib/navigation/sidebar-types";
import { MetricCard } from "./MetricCard";
import { ActionCard } from "./ActionCard";
import { CompactSummary } from "./CompactSummary";
import { CompactEmptyState } from "./CompactEmptyState";
import { InsightCard } from "./InsightCard";
import { StatusDot } from "./StatusDot";

// Lazy load analytics (deferred rendering for performance)
const BusinessMetricsDashboard = lazy(() => import("@/components/admin/BusinessMetricsDashboard"));

// Skeleton for analytics
function SkeletonAnalytics() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-48 w-full bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
}
import { getDashboardInsights, formatKpiState, getEmptyStateContent } from "@/lib/dashboard-intelligence";
import { getRelativeTime } from "@/lib/temporal";
import { convertToQuickActions } from "@/lib/automation-helpers";
import { trackEvent } from "@/lib/telemetry";
import type { DashboardData } from "@/lib/dashboard-intelligence";

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

// ─── Main component ───
export default function DashboardOverzicht({
  stats,
  onboardingMetrics,
  workflowAlerts,
  opsSnapshot,
  activityItems,
  onTabChange,
}: DashboardOverzichtProps) {
  const { data: extendedData } = useAdminDashboardExtended();
  const [activityFilter, setActivityFilter] = useState<"week" | "vandaag" | "maand">("week");
  const [now] = useState(() => Date.now());

  const vandaag = extendedData?.vandaag ?? { dienstenActief: 0, medewerkerIngepland: 0, openDiensten: 0, noShows: 0 };
  const beschikbaarheid = extendedData?.beschikbaarheid ?? { totaal: 0, actief: 0, ingepland: 0, beschikbaar: 0, gepauzeerd: 0 };
  const omzet = extendedData?.omzet ?? { dezeMaand: 0, vorigeMaand: 0, openstaand: 0, weekData: [] };

  // Trend: alleen tonen bij voldoende historische data
  // Als vorige maand 0 is, hebben we geen betrouwbare vergelijkingsbasis
  const omzetChange = (omzet.vorigeMaand > 0 && omzet.dezeMaand > 0)
    ? Math.round(((omzet.dezeMaand - omzet.vorigeMaand) / omzet.vorigeMaand) * 100)
    : null;

  // Generate intelligent insights based on dashboard data
  const dashboardIntelligence = useMemo(() => {
    const data: DashboardData = {
      stats,
      onboardingMetrics,
      workflowAlerts,
      opsSnapshot,
      omzet,
      vandaag,
    };
    return getDashboardInsights(data);
  }, [stats, onboardingMetrics, workflowAlerts, opsSnapshot, omzet, vandaag]);

  // Track automation events - only when insights change, not on every render
  const trackedInsightsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    dashboardIntelligence.insights.forEach((insight) => {
      // Only track if this insight has suggestions and hasn't been tracked yet
      if (insight.suggestedActions && insight.suggestedActions.length > 0) {
        const trackingKey = `${insight.id}-${insight.metric || 0}`;

        if (!trackedInsightsRef.current.has(trackingKey)) {
          trackEvent('automation_suggestion_shown', {
            insight_id: insight.id,
            count: insight.metric || 0,
            aging: insight.agingSeverity,
            priority_score: insight.priorityScore,
          });

          trackedInsightsRef.current.add(trackingKey);
        }
      }
    });
  }, [dashboardIntelligence.insights]);

  // Memoized handlers for insight actions (prevent unnecessary rerenders)
  const handleInsightCta = useCallback((tab: AdminTab) => {
    onTabChange(tab);
  }, [onTabChange]);

  const handleQuickAction = useCallback((insightId: string, actionType: string, tab?: AdminTab) => {
    // Track automation click
    trackEvent('automation_suggestion_clicked', {
      insight: insightId,
      action: actionType,
    });

    // Navigate to relevant tab
    if (tab) {
      onTabChange(tab);
    }
  }, [onTabChange]);

  // Legacy action list (fallback for ActionCard if needed)
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
    return activityItems.filter((item) => {
      const age = now - new Date(item.created_at).getTime();
      if (activityFilter === "vandaag") return age < 24 * 60 * 60 * 1000;
      if (activityFilter === "week") return age < 7 * 24 * 60 * 60 * 1000;
      return age < 30 * 24 * 60 * 60 * 1000;
    });
  }, [activityItems, activityFilter, now]);

  // Adaptive density: compact when many items
  const activityDensity = filteredActivity.length > 5 ? 'compact' : 'comfortable';
  const activityRowPadding = activityDensity === 'compact' ? 'py-1.5' : 'py-2';

  const { metrics } = onboardingMetrics;

  // Calculate conversion rate (kandidaten die het proces succesvol doorlopen)
  // Minimum sample size: 5 kandidaten voor betrouwbare ratio
  // Memoized to prevent recalculation on every render
  const conversionData = useMemo(() => {
    const totalActive = metrics.nieuw + metrics.documenten_opvragen + metrics.goedgekeurd + metrics.inzetbaar;
    const hasEnoughData = totalActive >= 5;
    const conversionRate = hasEnoughData ? Math.round((metrics.inzetbaar / totalActive) * 100) : 0;
    return { totalActive, hasEnoughData, conversionRate };
  }, [metrics.nieuw, metrics.documenten_opvragen, metrics.goedgekeurd, metrics.inzetbaar]);

  // Smart KPI states - memoized to prevent unnecessary recalculations
  const revenueState = useMemo(() =>
    formatKpiState('revenue', omzet.dezeMaand, { openstaand: omzet.openstaand }),
    [omzet.dezeMaand, omzet.openstaand]
  );

  const requestsState = useMemo(() =>
    formatKpiState('requests', stats.aanvragen.nieuw, { total: stats.aanvragen.total }),
    [stats.aanvragen.nieuw, stats.aanvragen.total]
  );

  const dienstenState = useMemo(() =>
    formatKpiState('diensten', vandaag.dienstenActief, { open: vandaag.openDiensten }),
    [vandaag.dienstenActief, vandaag.openDiensten]
  );

  const conversionState = useMemo(() =>
    formatKpiState('conversion', conversionData.conversionRate, {
      hasData: conversionData.hasEnoughData,
      inzetbaar: metrics.inzetbaar
    }),
    [conversionData.conversionRate, conversionData.hasEnoughData, metrics.inzetbaar]
  );

  // ═══ ADAPTIVE INTELLIGENCE ═══
  // Dashboard dynamically adjusts based on operational context
  const { contextualPriority, hasCriticalIssues, hasWarnings, hasPositiveState } = dashboardIntelligence;

  // Adaptive spacing: tighter when urgent actions exist
  const sectionSpacing = hasCriticalIssues ? 'space-y-3' : 'space-y-4';

  // Adaptive analytics: subtle when attention needed elsewhere
  const analyticsOpacity = hasCriticalIssues ? 'opacity-75' : 'opacity-100';
  const analyticsTransition = 'transition-opacity duration-500';

  // Adaptive insights emphasis: elevated when critical
  const insightsContainerStyle = hasCriticalIssues
    ? 'ring-1 ring-orange-100 bg-orange-50/10 p-3 rounded-lg -mx-1'
    : '';

  return (
    <div className={cn(sectionSpacing, "transition-all duration-300")}>
      {/* ═══ SECTION 1: KEY METRICS (Executive KPIs) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Omzet - Primary metric with emphasis */}
        <MetricCard
          title="Omzet deze maand"
          value={revenueState.value}
          subtitle={revenueState.subtitle}
          icon={Euro}
          variant="accent"
          trend={omzetChange !== null ? { value: omzetChange } : undefined}
          isEmpty={revenueState.isEmpty}
          isInsufficient={revenueState.isInsufficient}
          tooltip={revenueState.tooltip}
        />

        {/* Nieuwe aanvragen - Growth indicator */}
        <MetricCard
          title="Nieuwe aanvragen"
          value={requestsState.value}
          subtitle={requestsState.subtitle}
          icon={Target}
          onClick={() => onTabChange("aanvragen")}
          isEmpty={requestsState.isEmpty}
          isInsufficient={requestsState.isInsufficient}
          tooltip={requestsState.tooltip}
        />

        {/* Actieve diensten - Operational activity */}
        <MetricCard
          title="Actieve diensten"
          value={dienstenState.value}
          subtitle={dienstenState.subtitle}
          icon={CalendarCheck}
          isEmpty={dienstenState.isEmpty}
          isInsufficient={dienstenState.isInsufficient}
          tooltip={dienstenState.tooltip}
        />

        {/* Conversieratio - Efficiency metric */}
        <MetricCard
          title="Conversieratio"
          value={conversionState.value}
          subtitle={conversionState.subtitle}
          icon={TrendingUp}
          isEmpty={conversionState.isEmpty}
          isInsufficient={conversionState.isInsufficient}
          tooltip={conversionState.tooltip}
        />
      </div>

      {/* ═══ SECTION 2: INTELLIGENT INSIGHTS ═══ */}
      <div className={cn("space-y-2", insightsContainerStyle, "transition-all duration-300")}>
        {dashboardIntelligence.insights.map((insight) => {
          // Convert suggested actions to quick actions format (using memoized handler)
          const quickActions = insight.suggestedActions
            ? convertToQuickActions(
                insight.suggestedActions,
                (actionType) => handleQuickAction(insight.id, actionType, insight.ctaAction as AdminTab | undefined)
              )
            : undefined;

          return (
            <InsightCard
              key={insight.id}
              title={insight.title}
              description={insight.description}
              severity={insight.severity}
              type={insight.type}
              metric={insight.metric}
              ctaLabel={insight.ctaLabel}
              ctaAction={insight.ctaAction ? () => handleInsightCta(insight.ctaAction as AdminTab) : undefined}
              showLiveIndicator={hasCriticalIssues && insight.severity === 'critical'}
              quickActions={quickActions}
            />
          );
        })}

        {/* Hidden insights indicator */}
        {dashboardIntelligence.hiddenInsightsCount > 0 && (
          <div className="flex items-center justify-center pt-1">
            <button
              onClick={() => onTabChange('inschrijvingen')}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors duration-200"
            >
              + {dashboardIntelligence.hiddenInsightsCount} aandachtspunt{dashboardIntelligence.hiddenInsightsCount > 1 ? 'en' : ''} verborgen
            </button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: VANDAAG & OPERATIONEEL ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-[18px] w-[18px] text-[#F27501]" />
          <h2 className="text-sm font-semibold text-slate-900">Vandaag & Operationeel</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Actieve diensten", value: vandaag.dienstenActief, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Ingepland", value: vandaag.medewerkerIngepland, icon: Calendar, color: "text-blue-600" },
            { label: "Open diensten", value: vandaag.openDiensten, icon: Briefcase, color: "text-amber-600" },
            { label: "No-shows", value: vandaag.noShows, icon: AlertTriangle, color: vandaag.noShows > 0 ? "text-red-600" : "text-slate-400" },
            { label: "Aanvragen totaal", value: stats.aanvragen.total, icon: BriefcaseBusiness, color: "text-blue-600" },
            { label: "Actieve medewerkers", value: beschikbaarheid.actief, icon: Users, color: "text-slate-600" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0">
                  <Icon className={cn("w-[15px] h-[15px]", item.color)} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-slate-500">{item.label}</span>
                  <span className={cn("text-xl font-semibold tabular-nums leading-none", item.color)}>{item.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ SECTION 4: OPERATIONEEL OVERZICHT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CompactSummary
          title="Medewerkers"
          items={[
            { label: "Beschikbaar", value: beschikbaarheid.beschikbaar, icon: CheckCircle2 },
            { label: "Ingepland", value: beschikbaarheid.ingepland, icon: Calendar },
            { label: "Gepauzeerd", value: beschikbaarheid.gepauzeerd, icon: Clock },
            { label: "Totaal actief", value: beschikbaarheid.actief, icon: Users },
          ]}
        />

        <CompactSummary
          title="Onboarding pipeline"
          items={[
            { label: "Nieuw", value: metrics.nieuw, icon: Inbox },
            { label: "Docs opvragen", value: metrics.documenten_opvragen, icon: AlertCircle },
            { label: "Goedgekeurd", value: metrics.goedgekeurd, icon: CheckCircle2 },
            { label: "Inzetbaar", value: metrics.inzetbaar, icon: UserCheck },
          ]}
        />
      </div>

      {/* ═══ SECTION 5: RECENTE ACTIVITEIT ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Recente activiteit</h3>
            {filteredActivity.length > 0 && (
              <span className="text-[10px] text-slate-500 font-medium">
                {filteredActivity.length} {activityFilter === 'vandaag' ? 'vandaag' : activityFilter === 'week' ? 'deze week' : 'deze maand'}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {(["vandaag", "week", "maand"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded font-medium transition-all duration-200",
                  activityFilter === f
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {f === "vandaag" ? "Vandaag" : f === "week" ? "Week" : "Maand"}
              </button>
            ))}
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <div className="py-6 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 mb-2">
              <Activity className="w-[18px] h-[18px] text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Geen activiteit</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Updates verschijnen hier automatisch
            </p>
          </div>
        ) : (
          <div className={cn("divide-y", activityDensity === 'compact' ? "divide-slate-100" : "divide-slate-50")}>
            {filteredActivity.slice(0, 10).map((item) => {
              const typeConfig = {
                aanvraag: {
                  icon: BriefcaseBusiness,
                  bg: "bg-blue-50",
                  color: "text-blue-600",
                  dotVariant: 'neutral' as const,
                },
                inschrijving: {
                  icon: Users,
                  bg: "bg-emerald-50",
                  color: "text-emerald-600",
                  dotVariant: 'active' as const,
                },
                contact: {
                  icon: Inbox,
                  bg: "bg-purple-50",
                  color: "text-purple-600",
                  dotVariant: 'neutral' as const,
                },
              }[item.type];
              const Icon = typeConfig.icon;
              const timeAgo = getRelativeTime(item.created_at, now);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2.5 first:pt-0 last:pb-0 group hover:bg-slate-50/50 -mx-1 px-1 rounded transition-colors duration-150",
                    activityRowPadding
                  )}
                >
                  {/* Icon with status dot */}
                  <div className="relative flex-shrink-0">
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", typeConfig.bg)}>
                      <Icon className={cn("h-[15px] w-[15px]", typeConfig.color)} />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot variant={typeConfig.dotVariant} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 group-hover:text-slate-950">
                      {item.naam}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {item.type === 'aanvraag' ? 'Nieuwe aanvraag' :
                       item.type === 'inschrijving' ? 'Nieuwe inschrijving' :
                       'Contactbericht'}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="shrink-0 text-[10px] text-slate-400 tabular-nums font-medium">
                    {timeAgo}
                  </span>
                </div>
              );
            })}

            {/* Show more indicator if items truncated */}
            {filteredActivity.length > 10 && (
              <div className="pt-3 text-center">
                <span className="text-xs text-slate-500">
                  + {filteredActivity.length - 10} oudere items
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ SECTION 6: OPERATIONS CHECKLIST ═══ */}
      {opsSnapshot && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Operations checklist</h3>
            {Object.values(opsSnapshot.counters).slice(0, 4).every((v) => v === 0) ? (
              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Alles OK
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Live monitoring</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              { label: "Verlopen uploadlinks", value: opsSnapshot.counters.expiredUploadLinks },
              { label: "Kandidaten wachten te lang", value: opsSnapshot.counters.candidatesWaitingTooLong },
              { label: "Documenten in review", value: opsSnapshot.counters.pendingDocumentReviews },
              { label: "Inzetbaar zonder profiel", value: opsSnapshot.counters.inzetbaarWithoutProfile },
              { label: "Open taken", value: opsSnapshot.counters.openTasks },
              { label: "Testkandidaten", value: opsSnapshot.counters.testCandidates },
            ].map((op) => (
              <div key={op.label} className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-600">{op.label}</span>
                <span className={cn("font-semibold tabular-nums", op.value > 0 ? "text-red-600" : "text-emerald-600")}>
                  {op.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION 7: BUSINESS ANALYTICS ═══ */}
      <div className={cn(analyticsOpacity, analyticsTransition)}>
        <Suspense fallback={<SkeletonAnalytics />}>
          <BusinessMetricsDashboard />
        </Suspense>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string, referenceNow?: number): string {
  const diff = (referenceNow ?? Date.now()) - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Nu";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Gisteren";
  return `${days} dagen`;
}
