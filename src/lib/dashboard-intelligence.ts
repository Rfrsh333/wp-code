/**
 * Dashboard Intelligence Layer
 *
 * Context-aware dashboard logic voor slimme prioritering,
 * actionable insights en state management.
 *
 * Integrates workflow automation for:
 * - Aging-based prioritization
 * - Suggested next actions
 * - Smart reminders
 * - Workflow completion states
 */

import {
  calculateAging,
  getSuggestedActions,
  getWorkflowCompletionState,
  calculatePriorityScore,
  type AgingSeverity,
  type SuggestedAction,
} from './workflow-automation';

export interface DashboardData {
  stats: {
    aanvragen: { total: number; nieuw: number };
    inschrijvingen: { total: number; nieuw: number };
  };
  onboardingMetrics: {
    metrics: {
      nieuw: number;
      documenten_opvragen: number;
      goedgekeurd: number;
      inzetbaar: number;
    };
    avgProcessingTime: number;
  };
  workflowAlerts: Array<{ label: string; value: number; tone: string }>;
  opsSnapshot: {
    counters: {
      candidatesWaitingTooLong: number;
      pendingDocumentReviews: number;
      expiredUploadLinks: number;
      inzetbaarWithoutProfile: number;
      openTasks: number;
      testCandidates: number;
    };
  } | null;
  omzet: {
    dezeMaand: number;
    vorigeMaand: number;
  };
  vandaag: {
    dienstenActief: number;
    noShows: number;
    openDiensten: number;
  };
}

export interface DashboardInsight {
  id: string;
  type: 'action' | 'warning' | 'info' | 'success';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  ctaLabel?: string;
  ctaAction?: string; // tab name or route
  metric?: number;
  agingSeverity?: AgingSeverity;
  suggestedActions?: SuggestedAction[];
  priorityScore?: number;
}

export interface DashboardIntelligence {
  insights: DashboardInsight[];
  hiddenInsightsCount: number;
  hasCriticalIssues: boolean;
  hasWarnings: boolean;
  hasPositiveState: boolean;
  recommendedPrimaryAction: string | null;
  contextualPriority: 'actions' | 'operations' | 'growth' | 'normal';
}

/**
 * Analyseert dashboard data en genereert intelligente insights
 *
 * QA discipline:
 * - Max 3 insights tegelijk (prevent overload)
 * - Critical alleen voor directe operationele risico's
 * - Severity-based prioritization
 * - Deduplicatie per onderwerp
 */
export function getDashboardInsights(data: DashboardData): DashboardIntelligence {
  const allInsights: DashboardInsight[] = [];
  let hasCriticalIssues = false;
  let hasWarnings = false;
  let hasPositiveState = false;
  let recommendedPrimaryAction: string | null = null;

  // CRITICAL: Kandidaten wachten te lang (>48u zonder actie)
  // Dit is een direct operationeel risico - kandidaten kunnen verloren gaan
  const candidatesWaiting = data.opsSnapshot?.counters?.candidatesWaitingTooLong ?? 0;
  if (candidatesWaiting > 0) {
    // Calculate aging for prioritization (assume 72h for critical threshold)
    const aging = calculateAging(new Date(Date.now() - 72 * 60 * 60 * 1000));

    // Get suggested actions
    const suggestedActions = getSuggestedActions({
      status: 'nieuw',
      aging,
      count: candidatesWaiting,
    });

    const priorityScore = calculatePriorityScore({
      aging,
      count: candidatesWaiting,
      severity: 'critical',
    });

    allInsights.push({
      id: 'candidates-waiting',
      type: 'action',
      severity: 'critical',
      title: `${candidatesWaiting} kandidaat${candidatesWaiting > 1 ? 'en' : ''} wacht${candidatesWaiting === 1 ? 't' : 'en'} te lang`,
      description: `${aging.message}. Opvolging vereist.`,
      ctaLabel: 'Bekijk kandidaten',
      ctaAction: 'inschrijvingen',
      metric: candidatesWaiting,
      agingSeverity: aging.severity,
      suggestedActions,
      priorityScore,
    });
    hasCriticalIssues = true;
    if (!recommendedPrimaryAction) recommendedPrimaryAction = 'inschrijvingen';
  }

  // HIGH: Documenten wachten op review
  // Belangrijk maar niet urgent - blokkeert voortgang kandidaten
  const pendingDocs = data.opsSnapshot?.counters?.pendingDocumentReviews ?? 0;
  if (pendingDocs >= 3) { // Threshold: toon alleen bij 3+ documenten
    // Get suggested actions for document review
    const suggestedActions = getSuggestedActions({
      status: 'documenten_opvragen',
      hasDocuments: true,
      documentsApproved: false,
      count: pendingDocs,
    });

    const priorityScore = calculatePriorityScore({
      count: pendingDocs,
      severity: 'high',
      isBlocking: true, // Documents block candidate progress
    });

    allInsights.push({
      id: 'docs-review',
      type: 'action',
      severity: 'high',
      title: `${pendingDocs} document${pendingDocs > 1 ? 'en' : ''} te reviewen`,
      description: 'Blokkeert onboarding. Review nodig om verder te kunnen.',
      ctaLabel: 'Controleer documenten',
      ctaAction: 'inschrijvingen',
      metric: pendingDocs,
      suggestedActions,
      priorityScore,
    });
    hasWarnings = true;
    if (!recommendedPrimaryAction) recommendedPrimaryAction = 'inschrijvingen';
  }

  // MEDIUM: Nieuwe aanvragen
  // Optimalisatie - nieuwe business opportunities
  const newRequests = data.stats.aanvragen.nieuw;
  if (newRequests >= 2) { // Threshold: toon alleen bij 2+ aanvragen
    allInsights.push({
      id: 'new-requests',
      type: 'action',
      severity: 'medium',
      title: `${newRequests} nieuwe aanvra${newRequests === 1 ? 'ag' : 'gen'}`,
      description: 'Personeelaanvragen wachten op verwerking.',
      ctaLabel: 'Bekijk aanvragen',
      ctaAction: 'aanvragen',
      metric: newRequests,
    });
    hasWarnings = true;
    if (!recommendedPrimaryAction) recommendedPrimaryAction = 'aanvragen';
  }

  // MEDIUM: No-shows vandaag
  // Informatief - operationele monitoring
  const noShows = data.vandaag.noShows;
  if (noShows >= 2) { // Threshold: toon alleen bij 2+ no-shows
    allInsights.push({
      id: 'no-shows',
      type: 'warning',
      severity: 'medium',
      title: `${noShows} no-show${noShows > 1 ? 's' : ''} vandaag`,
      description: 'Medewerkers zijn niet verschenen op geplande diensten.',
      metric: noShows,
    });
    hasWarnings = true;
  }

  // LOW: Positive state - alles onder controle
  // Alleen tonen als er geen andere insights zijn
  if (allInsights.length === 0) {
    // Check workflow completion states
    const candidatesComplete = getWorkflowCompletionState({
      type: 'candidates',
      pendingCount: candidatesWaiting,
      overdueCount: candidatesWaiting,
      totalCount: data.onboardingMetrics.metrics.nieuw + data.onboardingMetrics.metrics.documenten_opvragen,
    });

    const documentsComplete = getWorkflowCompletionState({
      type: 'documents',
      pendingCount: pendingDocs,
      overdueCount: pendingDocs,
      totalCount: pendingDocs,
    });

    // Build description from completion states
    const completionMessages: string[] = [];
    if (candidatesComplete.isComplete && candidatesComplete.message) {
      completionMessages.push(candidatesComplete.message);
    }
    if (documentsComplete.isComplete && documentsComplete.message) {
      completionMessages.push(documentsComplete.message);
    }

    const description = completionMessages.length > 0
      ? completionMessages.join('. ') + '.'
      : 'Geen openstaande actiepunten. Je dashboard ziet er goed uit.';

    allInsights.push({
      id: 'all-good',
      type: 'success',
      severity: 'low',
      title: 'Alles onder controle',
      description,
    });
    hasPositiveState = true;
  }

  // Priority score-based sorting (urgency weighs heavier than quantity)
  // Falls back to severity if no priority score
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedInsights = allInsights.sort((a, b) => {
    // Use priority score if available (higher score = higher priority)
    if (a.priorityScore !== undefined && b.priorityScore !== undefined) {
      return b.priorityScore - a.priorityScore;
    }
    // Fallback to severity
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Limit to max 3 insights (prevent overload)
  const MAX_INSIGHTS = 3;
  const visibleInsights = sortedInsights.slice(0, MAX_INSIGHTS);
  const hiddenInsightsCount = Math.max(0, sortedInsights.length - MAX_INSIGHTS);

  // Bepaal contextuele prioriteit
  let contextualPriority: 'actions' | 'operations' | 'growth' | 'normal' = 'normal';
  if (hasCriticalIssues) contextualPriority = 'actions';
  else if (hasWarnings && data.vandaag.dienstenActief > 0) contextualPriority = 'operations';
  else if (newRequests > 5) contextualPriority = 'growth';

  return {
    insights: visibleInsights,
    hiddenInsightsCount,
    hasCriticalIssues,
    hasWarnings,
    hasPositiveState,
    recommendedPrimaryAction,
    contextualPriority,
  };
}

/**
 * Formateert KPI state met slimme fallbacks
 */
export interface KpiState {
  value: string | number;
  subtitle: string;
  isEmpty: boolean;
  isInsufficient: boolean;
  tooltip?: string;
}

export function formatKpiState(
  type: 'revenue' | 'requests' | 'diensten' | 'conversion',
  value: number | null | undefined,
  context?: any
): KpiState {
  switch (type) {
    case 'revenue':
      if (value === null || value === undefined) {
        return {
          value: '—',
          subtitle: 'Nog geen omzetdata',
          isEmpty: true,
          isInsufficient: false,
        };
      }
      if (value === 0) {
        return {
          value: '€0',
          subtitle: 'Geen omzet geboekt deze maand',
          isEmpty: true,
          isInsufficient: false,
          tooltip: 'Zodra facturen worden aangemaakt verschijnt hier je omzet',
        };
      }
      return {
        value: `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`,
        subtitle: context?.openstaand
          ? `€${context.openstaand.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} openstaand`
          : 'Deze maand',
        isEmpty: false,
        isInsufficient: false,
      };

    case 'requests':
      if (value === 0) {
        return {
          value: 0,
          subtitle: 'Geen nieuwe aanvragen',
          isEmpty: true,
          isInsufficient: false,
        };
      }
      return {
        value: value || 0,
        subtitle: `${context?.total || 0} totaal`,
        isEmpty: false,
        isInsufficient: false,
      };

    case 'diensten':
      if (value === 0) {
        return {
          value: 0,
          subtitle: 'Geen actieve diensten vandaag',
          isEmpty: true,
          isInsufficient: false,
        };
      }
      return {
        value: value || 0,
        subtitle: context?.open > 0 ? `${context.open} open` : 'Alle bezet',
        isEmpty: false,
        isInsufficient: false,
      };

    case 'conversion':
      if (!context?.hasData) {
        return {
          value: '—',
          subtitle: 'Nog te weinig data',
          isEmpty: false,
          isInsufficient: true,
          tooltip: 'Conversieratio wordt berekend vanaf 5 kandidaten in het proces',
        };
      }
      if (value === 0) {
        return {
          value: '0%',
          subtitle: 'Nog geen inzetbare kandidaten',
          isEmpty: false,
          isInsufficient: true,
        };
      }
      return {
        value: `${value}%`,
        subtitle: `${context?.inzetbaar || 0} inzetbaar`,
        isEmpty: false,
        isInsufficient: false,
      };

    default:
      return {
        value: value ?? '—',
        subtitle: '',
        isEmpty: !value,
        isInsufficient: false,
      };
  }
}

/**
 * Genereert contextuele empty state content
 */
export interface EmptyStateContent {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaAction?: string;
}

export function getEmptyStateContent(
  type: 'revenue' | 'activity' | 'analytics' | 'operations' | 'channels'
): EmptyStateContent {
  switch (type) {
    case 'revenue':
      return {
        title: 'Nog geen omzettrend',
        description: 'Zodra facturen worden aangemaakt, verschijnt hier de omzetontwikkeling.',
        ctaLabel: 'Bekijk facturen',
        ctaAction: 'facturen',
      };

    case 'activity':
      return {
        title: 'Geen activiteit in deze periode',
        description: 'Nieuwe aanvragen, inschrijvingen en updates verschijnen hier automatisch.',
      };

    case 'analytics':
      return {
        title: 'Nog geen analysedata',
        description: 'Zodra er voldoende data is, zie je hier trends en patronen.',
      };

    case 'operations':
      return {
        title: 'Alles onder controle',
        description: 'Er zijn momenteel geen urgente operationele aandachtspunten.',
      };

    case 'channels':
      return {
        title: 'Nog geen kanaaldata',
        description: 'Zodra leads via kanalen binnenkomen, zie je hier welke kanalen presteren.',
      };

    default:
      return {
        title: 'Nog geen gegevens',
        description: 'Data verschijnt hier zodra beschikbaar.',
      };
  }
}
