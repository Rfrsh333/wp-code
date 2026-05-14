# Elite Product Experience — Implementation Plan

**Target:** Transform dashboard from "premium SaaS" to "elite operational cockpit"
**Benchmark:** Linear + Attio + Stripe + Raycast + enterprise operations tooling
**Principle:** Sneller, slimmer, rustiger, meer operationeel

---

## Architecture Analysis

### Current State (✅ Strong Foundation)
- Premium visual hierarchy
- Polished spacing (4/8/12/16/24/32px rhythm)
- Intelligent insights system (dashboard-intelligence.ts)
- Smart KPI states (handles null/zero/insufficient data)
- Contextual empty states
- Component system: MetricCard, InsightCard, CompactSummary, CompactEmptyState
- Build: Clean, no errors

### Current Sections (in order)
1. Key Metrics (Executive KPIs) - 4 cards
2. Intelligent Insights - Max 3 InsightCards
3. Vandaag & Operationeel - 6 inline stats
4. Operationeel Overzicht - 2 CompactSummary grids
5. Recente Activiteit - Filtered timeline
6. Operations Checklist - Live monitoring counters
7. Business Analytics - BusinessMetricsDashboard component

---

## PHASE 1 — OPERATIONAL COCKPIT UX

### 1.1 Temporal Awareness
**Where:**
- InsightCard: "Laatst bijgewerkt X min geleden"
- Activity items: Better timestamp formatting
- Operations checklist: "Live monitoring" → "Bijgewerkt X min geleden"
- Kandidaten waiting: Emphasize "48 uur zonder reactie"

**Implementation:**
```typescript
// Create: src/lib/temporal.ts
export function getRelativeTime(date: Date | string): string
export function getUpdateTime(lastUpdate: Date | string): string
export function getUrgencyTime(hours: number): string
```

**Components to update:**
- InsightCard.tsx (add timestamp prop)
- Activity section in DashboardOverzicht.tsx
- Operations checklist section

### 1.2 Live Operational Feel
**Where:**
- Subtle status dot on critical insights (amber pulse)
- Refresh microstate on Operations checklist
- Live indicator on activity feed header

**Implementation:**
- Create StatusDot component (subtle, no animation overload)
- Add refresh state to sections that update frequently
- Add "Live" badge to Operations checklist when hasCriticalIssues

### 1.3 Operational Flow Optimization
**Current flow is GOOD but needs minor tweaks:**

```
✓ Business health first (KPIs)
✓ Attention required (Insights)
✓ Operations (Vandaag & Operationeel)
✓ Activity (Recent stream)
✓ Operations monitoring (Checklist)
✓ Analytics (Business metrics)
```

**Tweak:** Move Operations Checklist BEFORE Activity (operations > activity > analytics)

---

## PHASE 2 — INTERACTION INTELLIGENCE

### 2.1 Quick Actions from InsightCards
**Add quick action buttons to critical/high severity insights:**

```tsx
<InsightCard
  quickActions={[
    { label: "Contact", icon: Phone, onClick: () => {} },
    { label: "Bekijken", icon: Eye, onClick: () => {} }
  ]}
/>
```

**Implementation:**
- Update InsightCard.tsx with quickActions prop
- Add small icon buttons (secondary styling, subtle)
- Only show on critical/high severity insights

### 2.2 Smart Hover Previews
**Create HoverPreview component:**
- Kandidaat naam + status + laatste update
- Aanvraag bedrijf + functie + datum
- Compact (max 200px wide, 4-5 lines)
- Subtle shadow, fast fade-in
- Position: above/below based on viewport

**Components:**
- Create: src/components/admin/dashboard/HoverPreview.tsx
- Add to activity items
- Add to operations checklist items (when clickable)

### 2.3 Command Palette Foundation
**Create architecture, basic implementation:**

```typescript
// src/components/CommandPalette.tsx
// Trigger: CMD+K / CTRL+K
// Actions:
// - Navigate to tabs
// - Search kandidaten (future)
// - Quick actions (future)
```

**Phase 2 scope:** Just architecture + navigation
**Future:** Search, quick actions

---

## PHASE 3 — ADAPTIVE INTELLIGENCE

### 3.1 Adaptive Emphasis
**Use dashboardIntelligence.contextualPriority:**

```typescript
if (contextualPriority === 'actions') {
  // Insights elevated (border, subtle glow)
  // Analytics faded (opacity-90)
}

if (contextualPriority === 'normal') {
  // Analytics normal
  // All sections equal weight
}
```

**Implementation:**
- Add adaptive styling to sections based on contextualPriority
- Subtle: opacity, border, background tint

### 3.2 Smart Density
**Adjust spacing based on content volume:**

```typescript
const activityDensity = filteredActivity.length > 5 ? 'compact' : 'comfortable';
// compact: py-1.5
// comfortable: py-2.5
```

**Apply to:**
- Activity feed rows
- Operations checklist rows
- Insights (when >2, reduce spacing)

### 3.3 Dynamic Priorities
**Use insights to drive UI:**

```typescript
const showExpandedOperations = hasCriticalIssues || hasWarnings;
const showCompactAnalytics = hasCriticalIssues;
const emphasizeActivity = !hasCriticalIssues && !hasWarnings;
```

---

## PHASE 4 — PRODUCT EMOTION

### 4.1 Calm, Confident Microcopy
**Update all user-facing strings:**

**Current → New:**
- "Alles onder controle" → "Alles loopt soepel vandaag"
- "Geen urgente actiepunten op dit moment" → "Geen openstaande acties"
- "Nog geen gegevens" → "Nog geen data beschikbaar"

**Tone:**
- ✓ Calm, confident
- ✓ Operational
- ✗ NOT cringe
- ✗ NOT "AI assistant"
- ✗ NOT overdreven vriendelijk

### 4.2 Empty State Emotion
**Make empty states productive:**
- "Geen activiteit deze week" → "Geen nieuwe activiteit. Updates verschijnen hier automatisch."
- Add subtle context about what will appear

---

## PHASE 5 — VISUAL DEPTH SYSTEM

### 5.1 Layer Hierarchy
**Subtle depth through backgrounds:**

```typescript
// Sidebar: bg-slate-50 (slightly darker than main)
// Main: bg-white
// KPI row: bg-white with border-slate-200 + shadow-sm (elevated)
// Analytics: bg-slate-50/50 (softer)
// Monitoring: bg-white (neutral)
```

### 5.2 Surface Semantics (Ultra Subtle)
**Tinted backgrounds for insights:**

```typescript
const surfaceColors = {
  critical: 'bg-orange-50/30', // Not red!
  high: 'bg-amber-50/30',
  medium: 'bg-slate-50/50',
  success: 'bg-emerald-50/30',
  info: 'bg-blue-50/30',
};
```

**Rule:** Amber/orange for critical operational alerts. Red reserved for failures/destructive.

### 5.3 Alert Semantics
**Color hierarchy:**
- 🟠 Amber/Orange: Critical operational (candidates waiting, docs pending)
- 🔴 Red: System failures, destructive actions only
- 🟡 Yellow: Warnings, optimization
- 🟢 Green: Success, positive states
- 🔵 Blue: Info, neutral

---

## PHASE 6 — ACTIVITY FEED REFINEMENT

### 6.1 Compact Rows
**Current:** py-2
**New:** py-1.5 when >5 items, py-2 otherwise

### 6.2 Better Timestamps
**Current:** "2 min", "3 uur"
**New:**
- < 1 min: "Nu"
- < 60 min: "X min"
- < 6 hours: "X uur geleden"
- Today: "Vandaag om HH:MM"
- Yesterday: "Gisteren om HH:MM"
- Older: "DD MMM"

### 6.3 Grouped Activity
**Group by day:**
```
Vandaag
  - Item 1 (2 min)
  - Item 2 (1 uur)
Gisteren
  - Item 3
```

### 6.4 Status Dots/Avatars
Add subtle status indicator to activity items (optional, if data available).

### 6.5 Smaller Empty State
**Current:** Large CompactEmptyState
**New:** Inline empty state (1-2 lines, centered, subtle)

---

## PHASE 7 — SYSTEM CONSISTENCY

### 7.1 Interaction Consistency Audit
**Check all components:**
- Hover: opacity-90 or bg change
- Focus: ring-2 ring-offset-1 ring-slate-900
- Active: scale-[0.98]
- Transitions: duration-200
- Easing: ease-in-out

### 7.2 Typography Consistency Audit
**Hierarchy:**
- Page title: text-2xl font-bold
- Section title: text-sm font-semibold
- Card title: text-[11px] uppercase tracking-wide font-medium
- Body: text-sm
- Metadata: text-xs or text-[10px]
- Numbers: tabular-nums

### 7.3 Component Consistency Audit
**Check:**
- Icon sizing: w-[15px], w-[18px], w-5, w-6 (pick 2-3 sizes max)
- Badge sizing: px-1.5 py-0.5 text-[10px]
- Card padding: p-4
- Section spacing: space-y-4
- Grid gaps: gap-3
- Border radius: rounded-lg

### 7.4 Semantic Color Consistency
**Audit all severity/status colors:**
- Critical: orange-600 / amber-600
- High: amber-500
- Medium: slate-600
- Low: emerald-600
- Success: emerald-600
- Warning: amber-600
- Error: red-600 (failures only)
- Info: blue-600

---

## PHASE 8 — PERFORMANCE FEEL

### 8.1 Skeleton Loading
**Create SkeletonCard component:**

```tsx
<SkeletonCard className="h-[120px]" /> // KPI
<SkeletonInsight /> // Insight
<SkeletonActivityRow /> // Activity
```

**Show skeletons while:**
- Data loading
- Exact same dimensions as real component
- Subtle pulse animation (duration-1500)

### 8.2 Deferred Rendering
**Lazy load BusinessMetricsDashboard:**

```tsx
const BusinessMetricsDashboard = lazy(() => import('./BusinessMetricsDashboard'));

<Suspense fallback={<SkeletonAnalytics />}>
  <BusinessMetricsDashboard />
</Suspense>
```

### 8.3 No Layout Shift
**All loading states must match real dimensions:**
- KPI cards: h-[120px]
- Insights: min-h-[80px]
- Activity rows: h-[48px]

### 8.4 Fast-Feeling Interactions
**Optimize:**
- Filter switches: instant (no debounce)
- Tab switches: instant navigation
- Hover: 0ms delay, immediate
- Focus: immediate ring
- Transitions: 200ms max

---

## PHASE 9 — ENTERPRISE MATURITY

### 9.1 Role-Aware Architecture
**Prepare for role-based views:**

```typescript
// src/lib/dashboard-intelligence.ts
export interface DashboardConfig {
  role: 'owner' | 'recruitment' | 'finance';
  visibleSections: string[];
  kpiPriority: string[];
}

export function getDashboardConfig(role: string): DashboardConfig
```

**Phase 9 scope:** Architecture only, implement later.

### 9.2 Persisted Preferences
**Save to localStorage:**

```typescript
// src/lib/preferences.ts
export function savePreferences(prefs: DashboardPreferences)
export function loadPreferences(): DashboardPreferences

interface DashboardPreferences {
  activityFilter: 'vandaag' | 'week' | 'maand';
  collapsedSections: string[];
  // Future: role, kpis, etc.
}
```

**Restore on mount.**

### 9.3 Audit Friendliness
**Log important dashboard interactions:**

```typescript
// When quick action taken from insight
logAuditEvent({
  action: 'insight_quick_action',
  target: 'kandidaat',
  insight_id: 'candidates-waiting',
});
```

**Phase 9 scope:** Hook up to existing audit system.

### 9.4 State Trust
**Every data point should explain itself:**
- Tooltips on KPIs explain calculation
- Insights explain why they're shown
- Empty states explain when data will appear
- Loading states show what's loading

---

## PHASE 10 — FINAL EXPERIENCE QA

### QA Checklist

**3-Second Comprehension:**
- [ ] Ziet gebruiker business health (KPIs) binnen 3s?
- [ ] Ziet gebruiker urgente acties binnen 3s?
- [ ] Is prioriteit duidelijk (wat eerst)?

**Intelligence:**
- [ ] Voelt dashboard slim zonder druk te zijn?
- [ ] Helpt het prioriteren?
- [ ] Is cognitive load laag?

**Operational Feel:**
- [ ] Voelt het als operations center?
- [ ] Voelt het snel (instant interactions)?
- [ ] Voelt het live (temporal awareness)?

**Polish:**
- [ ] Voelt het rustig maar krachtig?
- [ ] Is alles consistent (spacing/typography/colors)?
- [ ] Zijn alle states duidelijk (loading/empty/error)?

**Trust:**
- [ ] Voelt de UI betrouwbaar?
- [ ] Begrijpt gebruiker waarom data wordt getoond?
- [ ] Zijn data states eerlijk (null vs 0 vs insufficient)?

**Daily Use:**
- [ ] Zou operations manager dit dagelijks gebruiken?
- [ ] Bespaart het werk?
- [ ] Voelt het als één coherent systeem?

---

## Implementation Order

### Sprint 1 (Core Experience)
1. ✅ PHASE 7 — System consistency audit (foundation)
2. ✅ PHASE 5 — Visual depth system (subtle layers)
3. ✅ PHASE 1 — Operational cockpit UX (temporal, live feel)
4. ✅ PHASE 4 — Product emotion (microcopy)

### Sprint 2 (Intelligence)
5. ✅ PHASE 3 — Adaptive intelligence (dynamic UI)
6. ✅ PHASE 6 — Activity feed refinement
7. ✅ PHASE 2 — Interaction intelligence (quick actions, hover)

### Sprint 3 (Performance & Maturity)
8. ✅ PHASE 8 — Performance feel (skeletons, deferred)
9. ✅ PHASE 9 — Enterprise maturity (preferences, audit)
10. ✅ PHASE 10 — Final experience QA

---

## Success Metrics

**Before:**
- Premium SaaS dashboard
- Beautiful but passive
- Shows data

**After:**
- Elite operational cockpit
- Intelligent and active
- Guides decisions
- Feels like Linear/Attio/Stripe/Raycast
- Operations manager's daily tool

**Key Differentiator:**
The dashboard doesn't just show information — it actively helps you understand what matters and what to do next.

---

## Technical Constraints

**DO NOT:**
- Break existing business logic
- Break TypeScript types
- Add flashy animations
- Add unnecessary widgets
- Over-engineer
- Break mobile/tablet layouts

**DO:**
- Keep component system clean
- Maintain spacing rhythm
- Follow established patterns
- Test all viewport sizes
- Keep build fast
- Keep bundle small
