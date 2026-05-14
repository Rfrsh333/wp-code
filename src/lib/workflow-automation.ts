/**
 * Workflow Automation
 *
 * Logische operationele automatisering gebaseerd op bestaande data.
 *
 * GEEN:
 * - Fake AI
 * - Chat assistant
 * - Extra dashboard-rommel
 * - Fake backend acties
 *
 * WEL:
 * - Candidate aging detection
 * - Contextuele next actions
 * - Smart reminders
 * - Auto-prioritization
 * - Workflow completion states
 */

import { trackEvent, TelemetryEvents } from './telemetry';

/**
 * Aging severity based on hours without action
 */
export type AgingSeverity = 'normal' | 'medium' | 'high' | 'critical';

export interface AgingState {
  severity: AgingSeverity;
  hoursWithoutAction: number;
  message: string;
  label: string;
}

/**
 * Calculate aging state for candidate/request/document
 *
 * Edge cases handled:
 * - null/undefined dates
 * - Invalid dates
 * - Future dates (timezone issues)
 * - Very old dates (>1 year)
 */
export function calculateAging(lastActionDate: Date | string | null | undefined): AgingState {
  // No date provided
  if (!lastActionDate) {
    return {
      severity: 'critical',
      hoursWithoutAction: 999,
      message: 'Nog geen actie ondernomen',
      label: 'Geen actie',
    };
  }

  // Convert to Date object
  const lastAction = typeof lastActionDate === 'string' ? new Date(lastActionDate) : lastActionDate;

  // Invalid date
  if (isNaN(lastAction.getTime())) {
    return {
      severity: 'medium',
      hoursWithoutAction: 0,
      message: 'Datum onbekend',
      label: 'Onbekend',
    };
  }

  const now = Date.now();
  const timeDiff = now - lastAction.getTime();

  // Future date (timezone issue or invalid data)
  if (timeDiff < 0) {
    return {
      severity: 'normal',
      hoursWithoutAction: 0,
      message: 'Recent',
      label: 'Recent',
    };
  }

  const hoursWithoutAction = Math.floor(timeDiff / 1000 / 60 / 60);

  // Very old (>1 year) - likely data issue, cap at critical
  if (hoursWithoutAction > 8760) {
    return {
      severity: 'critical',
      hoursWithoutAction: 8760,
      message: 'Meer dan 1 jaar geen actie',
      label: '>1j',
    };
  }

  // Aging thresholds
  if (hoursWithoutAction <= 24) {
    return {
      severity: 'normal',
      hoursWithoutAction,
      message: `${hoursWithoutAction} uur geleden`,
      label: 'Recent',
    };
  }

  if (hoursWithoutAction <= 48) {
    return {
      severity: 'medium',
      hoursWithoutAction,
      message: `${hoursWithoutAction} uur zonder actie`,
      label: `${hoursWithoutAction}u`,
    };
  }

  if (hoursWithoutAction <= 72) {
    return {
      severity: 'high',
      hoursWithoutAction,
      message: `${Math.floor(hoursWithoutAction / 24)} dagen zonder opvolging`,
      label: `${Math.floor(hoursWithoutAction / 24)}d`,
    };
  }

  // >72 hours
  const days = Math.floor(hoursWithoutAction / 24);
  return {
    severity: 'critical',
    hoursWithoutAction,
    message: `${days} dagen geen opvolging`,
    label: `${days}d`,
  };
}

/**
 * Reminder states for workflow management
 */
export type ReminderState =
  | 'follow_up_recommended'
  | 'overdue'
  | 'blocked'
  | 'ready_to_process'
  | 'completed';

export interface ReminderStatus {
  state: ReminderState;
  priority: number; // 1-5, where 5 is most urgent
  label: string;
  message: string;
  color: 'orange' | 'amber' | 'slate' | 'emerald';
}

/**
 * Determine reminder state based on context
 */
export function getReminderState(context: {
  status: string;
  lastAction?: Date | string | null;
  hasDocuments?: boolean;
  documentsApproved?: boolean;
  isBlocked?: boolean;
}): ReminderStatus {
  const { status, lastAction, hasDocuments, documentsApproved, isBlocked } = context;

  // Blocked state (highest priority)
  if (isBlocked) {
    return {
      state: 'blocked',
      priority: 5,
      label: 'Geblokkeerd',
      message: 'Kan niet verder zonder actie',
      color: 'orange',
    };
  }

  // Completed state
  if (status === 'inzetbaar' || status === 'afgerond' || status === 'goedgekeurd') {
    return {
      state: 'completed',
      priority: 1,
      label: 'Afgerond',
      message: 'Workflow compleet',
      color: 'emerald',
    };
  }

  // Ready to process (documents received but not approved)
  if (hasDocuments && !documentsApproved) {
    return {
      state: 'ready_to_process',
      priority: 4,
      label: 'Te beoordelen',
      message: 'Documenten ontvangen, wacht op review',
      color: 'amber',
    };
  }

  // Aging-based states
  if (lastAction) {
    const aging = calculateAging(lastAction);

    if (aging.severity === 'critical' || aging.severity === 'high') {
      return {
        state: 'overdue',
        priority: 5,
        label: 'Te laat',
        message: aging.message,
        color: 'orange',
      };
    }

    if (aging.severity === 'medium') {
      return {
        state: 'follow_up_recommended',
        priority: 3,
        label: 'Opvolgen',
        message: aging.message,
        color: 'amber',
      };
    }
  }

  // Default: follow-up recommended
  return {
    state: 'follow_up_recommended',
    priority: 2,
    label: 'Opvolgen',
    message: 'Opvolging nodig',
    color: 'slate',
  };
}

/**
 * Suggested action types
 *
 * NOTE: Only include actions that have real backend support.
 * Navigation-only actions are OK (e.g., "Bekijk kandidaat").
 * Fake actions (approve, assign, schedule) without backend are NOT included.
 */
export type SuggestedActionType =
  | 'view_candidate'     // Navigate to candidate (real)
  | 'view_documents'     // Navigate to documents (real)
  | 'view_requests';     // Navigate to requests (real)

export interface SuggestedAction {
  type: SuggestedActionType;
  label: string;
  priority: 'primary' | 'secondary';
  icon?: string; // lucide icon name
  navigateTo?: string; // Tab/route to navigate to
}

/**
 * Get suggested next actions based on status and context
 *
 * IMPORTANT: Only return actions that actually work (navigation).
 * No fake backend actions (approve, assign, schedule) without real implementation.
 */
export function getSuggestedActions(context: {
  status: string;
  hasDocuments?: boolean;
  documentsApproved?: boolean;
  hasRecruiter?: boolean;
  intakeScheduled?: boolean;
  aging?: AgingState;
  count?: number;
}): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const { status, hasDocuments, documentsApproved, count = 1 } = context;

  // All suggested actions navigate to the relevant tab where user can take real action
  // We don't show fake buttons for actions that don't have backend support

  // New candidates/requests - navigate to view them
  if (status === 'nieuw') {
    actions.push({
      type: 'view_candidate',
      label: 'Bekijk kandidaten',
      priority: 'primary',
      icon: 'Eye',
      navigateTo: 'inschrijvingen',
    });
    return actions.slice(0, 1); // Only 1 action - keep it simple
  }

  // Documents need review - navigate to documents
  if (status === 'documenten_opvragen' || (hasDocuments && !documentsApproved)) {
    actions.push({
      type: 'view_documents',
      label: count > 1 ? 'Controleer documenten' : 'Controleer document',
      priority: 'primary',
      icon: 'FileCheck',
      navigateTo: 'inschrijvingen',
    });
    return actions.slice(0, 1);
  }

  // No specific action - return empty
  // User can always click the insight CTA if they want to navigate
  return [];
}

/**
 * Workflow completion states
 */
export interface WorkflowCompletionState {
  isComplete: boolean;
  message: string;
  variant: 'success' | 'neutral';
}

/**
 * Check if workflow is in a good/complete state
 */
export function getWorkflowCompletionState(context: {
  type: 'candidates' | 'documents' | 'planning' | 'requests';
  pendingCount: number;
  overdueCount: number;
  totalCount: number;
}): WorkflowCompletionState {
  const { type, pendingCount, overdueCount, totalCount } = context;

  // No items at all
  if (totalCount === 0) {
    return {
      isComplete: false,
      message: '',
      variant: 'neutral',
    };
  }

  // Everything complete
  if (pendingCount === 0 && overdueCount === 0) {
    const messages = {
      candidates: 'Alle kandidaten opgevolgd',
      documents: 'Geen openstaande documentreviews',
      planning: 'Planning ziet er compleet uit',
      requests: 'Alle aanvragen verwerkt',
    };

    return {
      isComplete: true,
      message: messages[type],
      variant: 'success',
    };
  }

  return {
    isComplete: false,
    message: '',
    variant: 'neutral',
  };
}

/**
 * Calculate priority score for auto-prioritization
 * Higher score = higher priority
 *
 * Test cases (verifying urgency > quantity):
 *
 * 1. 1 kandidaat >72u zonder actie:
 *    aging(100) + severity:critical(80) + count:1(5) = 185
 *
 * 2. 10 nieuwe aanvragen vandaag:
 *    aging:normal(10) + severity:medium(30) + count:10(capped 25) = 65
 *
 *    Result: 185 > 65 ✓ Urgency wins
 *
 * 3. 5 documenten blocking onboarding:
 *    aging:medium(40) + severity:high(50) + blocking(50) + count:5(25) = 165
 *
 * 4. 3 no-shows vandaag:
 *    aging:normal(10) + severity:medium(30) + count:3(15) = 55
 *
 *    Result: 165 > 55 ✓ Blocking issues prioritized
 *
 * 5. Alles onder controle (completion state):
 *    severity:low(10) + count:0(0) = 10
 *
 *    Result: Always lowest priority ✓
 */
export function calculatePriorityScore(context: {
  aging?: AgingState;
  count?: number;
  isBlocking?: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}): number {
  const { aging, count = 0, isBlocking = false, severity = 'low' } = context;

  let score = 0;

  // Aging weighs heavily (urgency > quantity)
  if (aging) {
    switch (aging.severity) {
      case 'critical':
        score += 100;
        break;
      case 'high':
        score += 70;
        break;
      case 'medium':
        score += 40;
        break;
      case 'normal':
        score += 10;
        break;
    }
  }

  // Severity
  const severityScores = {
    critical: 80,
    high: 50,
    medium: 30,
    low: 10,
  };
  score += severityScores[severity];

  // Blocking issues get extra weight
  if (isBlocking) {
    score += 50;
  }

  // Count adds smaller weight (capped at 25)
  // This ensures quantity never outweighs urgency
  score += Math.min(count * 5, 25);

  return score;
}

/**
 * Automation event names (for consistency)
 * Use these with trackEvent() from telemetry.ts
 */
export const AutomationEvents = {
  SUGGESTION_SHOWN: 'automation_suggestion_shown',
  SUGGESTION_CLICKED: 'automation_suggestion_clicked',
  REMINDER_GENERATED: 'reminder_generated',
  WORKFLOW_COMPLETED: 'workflow_completed_from_suggestion',
} as const;
