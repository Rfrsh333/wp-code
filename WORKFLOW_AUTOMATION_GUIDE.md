# Workflow Automation Guide

Logische operationele automatisering voor het TopTalent dashboard. **GEEN fake AI, GEEN chat assistant, ALLEEN contextuele suggesties gebaseerd op bestaande data.**

## Overzicht

Het workflow automation systeem biedt:
- **Candidate aging detection** - Detecteert kandidaten/aanvragen zonder actie
- **Suggested next actions** - Contextuele acties gebaseerd op status
- **Smart reminders** - Reminder states voor prioritering
- **Auto-prioritization** - Urgentie weegt zwaarder dan aantal
- **Workflow completion states** - Positieve feedback wanneer alles goed staat
- **Telemetry tracking** - Alle automation events worden gelogd

## Core Modules

### `/src/lib/workflow-automation.ts`

Kern van het automation systeem.

**Aging Detection:**

```typescript
// Calculate aging voor candidate/request/document
const aging = calculateAging(lastActionDate);

// Returns:
interface AgingState {
  severity: 'normal' | 'medium' | 'high' | 'critical';
  hoursWithoutAction: number;
  message: string; // "26 uur zonder actie", "3 dagen geen opvolging"
  label: string;   // "26u", "3d"
}

// Thresholds:
// ≤24 uur = normal
// ≤48 uur = medium
// ≤72 uur = high
// >72 uur = critical
```

**Suggested Actions:**

```typescript
// Get contextuele next actions
const actions = getSuggestedActions({
  status: 'nieuw',
  hasDocuments: true,
  documentsApproved: false,
  hasRecruiter: true,
  intakeScheduled: false,
  aging: agingState,
});

// Returns max 2 actions:
interface SuggestedAction {
  type: 'contact' | 'review_documents' | 'schedule_intake' |
        'assign_recruiter' | 'mark_followed_up' | 'request_documents' |
        'approve' | 'complete';
  label: string;
  priority: 'primary' | 'secondary';
  icon?: string; // lucide icon name
}
```

**Reminder States:**

```typescript
// Determine reminder state
const reminder = getReminderState({
  status: 'documenten_opvragen',
  lastAction: new Date(),
  hasDocuments: true,
  documentsApproved: false,
  isBlocked: false,
});

// Returns:
interface ReminderStatus {
  state: 'follow_up_recommended' | 'overdue' | 'blocked' |
         'ready_to_process' | 'completed';
  priority: number; // 1-5, waar 5 = meest urgent
  label: string;
  message: string;
  color: 'orange' | 'amber' | 'slate' | 'emerald';
}
```

**Priority Scoring:**

```typescript
// Calculate priority score (hoger = urgenter)
const score = calculatePriorityScore({
  aging: agingState,
  count: 5,
  isBlocking: true,
  severity: 'critical',
});

// Weights:
// - Aging: critical +100, high +70, medium +40, normal +10
// - Severity: critical +80, high +50, medium +30, low +10
// - Blocking issues: +50
// - Count: +5 per item (max +25)
//
// Regel: Urgentie (tijd) weegt zwaarder dan aantallen
```

**Workflow Completion:**

```typescript
// Check workflow completion state
const completion = getWorkflowCompletionState({
  type: 'candidates',
  pendingCount: 0,
  overdueCount: 0,
  totalCount: 10,
});

// Returns:
interface WorkflowCompletionState {
  isComplete: boolean;
  message: string; // "Alle kandidaten opgevolgd"
  variant: 'success' | 'neutral';
}
```

**Telemetry:**

```typescript
// Track automation events
trackAutomationEvent('suggestion_shown', {
  insight: 'candidates-waiting',
  count: 5,
  aging: 'critical',
});

trackAutomationEvent('suggestion_clicked', {
  insight: 'docs-review',
  action: 'review_documents',
});

// Events:
// - suggestion_shown
// - suggestion_clicked
// - reminder_generated
// - workflow_completed
```

## Dashboard Intelligence Integratie

### `/src/lib/dashboard-intelligence.ts`

Dashboard insights zijn geüpdatet met workflow automation:

```typescript
const intelligence = getDashboardInsights(dashboardData);

// Insights bevatten nu:
interface DashboardInsight {
  id: string;
  type: 'action' | 'warning' | 'info' | 'success';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: number;

  // NEW: Automation fields
  agingSeverity?: 'normal' | 'medium' | 'high' | 'critical';
  suggestedActions?: SuggestedAction[];
  priorityScore?: number;
}
```

**Auto-prioritization:**

Insights worden nu gesorteerd op `priorityScore` in plaats van alleen `severity`:

```typescript
// Prioriteit bepaald door:
// 1. Aging (urgentie)
// 2. Severity
// 3. Blocking status
// 4. Aantallen (kleinste weight)

// Voorbeeld:
// - 2 kandidaten >72u zonder actie (score: 110)
// - 10 nieuwe aanvragen vandaag (score: 80)
// → Kandidaten worden eerst getoond (urgentie > aantallen)
```

**Workflow Completion States:**

Wanneer alles goed staat, toon je specifieke completion messages:

```typescript
// In plaats van generiek "Alles onder controle"
// Toon je nu:
// - "Alle kandidaten opgevolgd"
// - "Geen openstaande documentreviews"
// - "Planning ziet er compleet uit"
```

## Component Integratie

### InsightCard met Suggested Actions

In `DashboardOverzicht.tsx`:

```tsx
import { convertToQuickActions } from '@/lib/automation-helpers';
import { trackAutomationEvent } from '@/lib/workflow-automation';

// In component:
{dashboardIntelligence.insights.map((insight) => {
  // Convert suggested actions naar quick actions
  const quickActions = insight.suggestedActions
    ? convertToQuickActions(insight.suggestedActions, (actionType) => {
        // Track click
        trackAutomationEvent('suggestion_clicked', {
          insight: insight.id,
          action: actionType,
        });

        // Navigate
        if (insight.ctaAction) {
          onTabChange(insight.ctaAction);
        }
      })
    : undefined;

  return (
    <InsightCard
      key={insight.id}
      title={insight.title}
      description={insight.description}
      severity={insight.severity}
      type={insight.type}
      quickActions={quickActions} // Pass suggested actions
      showLiveIndicator={hasCriticalIssues && insight.severity === 'critical'}
    />
  );
})}
```

### Helper Utilities

`/src/lib/automation-helpers.ts` bevat helpers voor icon mapping en formatting:

```typescript
import { getSuggestedActionIcon, formatAgingLabel, getAgingColor } from '@/lib/automation-helpers';

// Icon mapping
const icon = getSuggestedActionIcon('Phone'); // Returns Phone icon from lucide-react

// Aging label
const label = formatAgingLabel('critical'); // "Urgent"

// Aging color classes
const color = getAgingColor('high'); // "text-amber-700 bg-amber-100"
```

## Workflow Examples

### Example 1: Nieuwe Kandidaat

```typescript
const candidate = {
  status: 'nieuw',
  created_at: '2024-01-01T10:00:00Z',
  recruiter_assigned: false,
};

// Calculate aging
const aging = calculateAging(candidate.created_at);
// Result: { severity: 'critical', hoursWithoutAction: 96, message: '4 dagen geen opvolging' }

// Get suggested actions
const actions = getSuggestedActions({
  status: candidate.status,
  hasRecruiter: candidate.recruiter_assigned,
  aging,
});
// Result: [
//   { type: 'assign_recruiter', label: 'Wijs recruiter toe', priority: 'primary' },
//   { type: 'mark_followed_up', label: 'Markeer als opgevolgd', priority: 'secondary' }
// ]

// Calculate priority
const score = calculatePriorityScore({
  aging,
  severity: 'critical',
  count: 1,
});
// Result: 180 (100 aging + 80 severity)
```

### Example 2: Document Review

```typescript
const candidate = {
  status: 'documenten_opvragen',
  last_action: '2024-01-01T10:00:00Z',
  documents_received: true,
  documents_approved: false,
};

// Reminder state
const reminder = getReminderState({
  status: candidate.status,
  lastAction: candidate.last_action,
  hasDocuments: candidate.documents_received,
  documentsApproved: candidate.documents_approved,
});
// Result: {
//   state: 'ready_to_process',
//   priority: 4,
//   label: 'Te beoordelen',
//   message: 'Documenten ontvangen, wacht op review'
// }

// Suggested actions
const actions = getSuggestedActions({
  status: candidate.status,
  hasDocuments: true,
  documentsApproved: false,
});
// Result: [
//   { type: 'review_documents', label: 'Controleer documenten', priority: 'primary' },
//   { type: 'approve', label: 'Keur goed', priority: 'secondary' }
// ]
```

### Example 3: Workflow Complete

```typescript
const completion = getWorkflowCompletionState({
  type: 'candidates',
  pendingCount: 0,
  overdueCount: 0,
  totalCount: 15,
});
// Result: {
//   isComplete: true,
//   message: 'Alle kandidaten opgevolgd',
//   variant: 'success'
// }

// In dashboard insight:
{
  id: 'all-good',
  type: 'success',
  severity: 'low',
  title: 'Alles onder controle',
  description: 'Alle kandidaten opgevolgd. Geen openstaande documentreviews.',
}
```

## Design Principles

### 1. **GEEN Fake AI**
❌ "AI-powered candidate scoring"
❌ "Smart predictions based on machine learning"
❌ "Automated candidate matching"

✅ Logische regels gebaseerd op tijd en status
✅ Contextuele suggesties gebaseerd op bestaande data
✅ Transparante thresholds (24u, 48u, 72u)

### 2. **Graceful Fallback**
Als data ontbreekt:
```typescript
if (!lastActionDate) {
  return {
    severity: 'critical',
    message: 'Nog geen actie ondernomen',
  };
}
```

### 3. **Urgentie > Aantallen**
```typescript
// 2 kandidaten >72u = score 110
// 10 nieuwe aanvragen = score 80
// → Oude kandidaten krijgen voorrang
```

### 4. **Max 2 Suggested Actions**
```typescript
// Prevent overload
const actions = getSuggestedActions(context);
return actions.slice(0, 2);
```

### 5. **Contextuele Acties**
```typescript
// Status = 'nieuw' + geen recruiter
→ "Wijs recruiter toe"

// Status = 'documenten_opvragen' + documenten ontvangen
→ "Controleer documenten"

// Status = 'goedgekeurd' + geen intake
→ "Plan intake"
```

## Telemetry Tracking

Alle automation events worden automatisch getracked:

```typescript
// Wanneer suggestion wordt getoond
trackAutomationEvent('suggestion_shown', {
  insight: 'candidates-waiting',
  count: 5,
  aging: 'critical',
});

// Wanneer gebruiker op suggestie klikt
trackAutomationEvent('suggestion_clicked', {
  insight: 'docs-review',
  action: 'review_documents',
});

// Wanneer reminder wordt gegenereerd
trackAutomationEvent('reminder_generated', {
  type: 'overdue',
  count: 3,
});

// Wanneer workflow compleet is via suggestie
trackAutomationEvent('workflow_completed', {
  workflow: 'candidate_review',
  fromSuggestion: true,
});
```

View telemetry in development console of configureer backend endpoint in `/src/lib/telemetry.ts`.

## Configuration

### Aging Thresholds

Pas thresholds aan in `/src/lib/workflow-automation.ts`:

```typescript
// Huidige thresholds:
if (hoursWithoutAction <= 24) return { severity: 'normal' };
if (hoursWithoutAction <= 48) return { severity: 'medium' };
if (hoursWithoutAction <= 72) return { severity: 'high' };
return { severity: 'critical' };

// Aanpassen:
if (hoursWithoutAction <= 12) return { severity: 'normal' };   // Sneller reageren
if (hoursWithoutAction <= 24) return { severity: 'medium' };
if (hoursWithoutAction <= 48) return { severity: 'high' };
return { severity: 'critical' };
```

### Priority Score Weights

Pas weights aan voor verschillende factoren:

```typescript
// Huidige weights:
const agingWeights = {
  critical: 100,
  high: 70,
  medium: 40,
  normal: 10,
};

const severityWeights = {
  critical: 80,
  high: 50,
  medium: 30,
  low: 10,
};

// Blocking issues: +50
// Count: +5 per item (max +25)
```

### Suggested Actions per Status

Voeg nieuwe suggested actions toe in `getSuggestedActions()`:

```typescript
// Voorbeeld: Nieuwe status 'waiting_for_contract'
if (status === 'waiting_for_contract') {
  actions.push({
    type: 'send_contract',
    label: 'Verstuur contract',
    priority: 'primary',
    icon: 'FileText',
  });
  return actions.slice(0, 2);
}
```

## Best Practices

### DO:
✅ Gebruik aging voor prioritering
✅ Toon max 2 suggested actions per insight
✅ Track automation events voor analytics
✅ Geef specifieke completion messages
✅ Fallback gracefully bij missende data
✅ Gebruik contextuele actions gebaseerd op status
✅ Laat urgentie zwaarder wegen dan aantallen

### DON'T:
❌ Fake AI/ML features toevoegen
❌ Chat assistant functionaliteit bouwen
❌ Extra dashboard-rommel maken
❌ Fake backend acties uitvoeren
❌ Meer dan 2 actions per insight tonen
❌ Generieke messages gebruiken ("Alles onder controle")
❌ Alleen op aantallen sorteren

## Testing

### Development Testing

```typescript
// Simuleer oude kandidaat
const aging = calculateAging(
  new Date(Date.now() - 96 * 60 * 60 * 1000) // 96 uur geleden
);
console.log(aging);
// { severity: 'critical', hoursWithoutAction: 96, message: '4 dagen geen opvolging' }

// Test suggested actions
const actions = getSuggestedActions({
  status: 'nieuw',
  hasRecruiter: false,
  aging,
});
console.log(actions);
// [{ type: 'assign_recruiter', label: 'Wijs recruiter toe', priority: 'primary' }]

// Test priority scoring
const score = calculatePriorityScore({
  aging,
  severity: 'critical',
  count: 2,
  isBlocking: false,
});
console.log(score);
// 190 (100 + 80 + 10)
```

### Console Logging

In development mode zie je:
- Automation events: `[Telemetry] automation_suggestion_shown { insight: "candidates-waiting", count: 5 }`
- Priority scores in insight objects
- Aging states in dashboard intelligence

---

**Production-grade workflow automation. Logisch, contextueel, zonder fake AI.**
