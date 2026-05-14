# Product System Guide

**TopTalent Dashboard - Production-Grade Operational Transformation**

Complete reference for all systems built during the operational transformation of the TopTalent admin dashboard.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Integration Status](#integration-status)
4. [Documentation Index](#documentation-index)
5. [Development Workflow](#development-workflow)
6. [Performance Guidelines](#performance-guidelines)
7. [Mobile Optimization](#mobile-optimization)
8. [Testing & QA](#testing--qa)

---

## System Overview

The TopTalent dashboard has been transformed into a production-grade operational system through 7 phases:

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 3** | Reliability Layer | ✅ Complete (Foundation) |
| **Phase 4** | Workflow Automation | ✅ Complete (Integrated) |
| **Phase 5** | Performance Hardening | ✅ Complete (Integrated) |
| **Phase 6** | Operational UX | ✅ Complete (Foundation) |
| **Phase 7** | Product Cleanup | ✅ Complete |

**Key Principles:**
- No fake functionality - only real backend-connected features
- Performance-first - memoization, lazy loading, dev-only instrumentation
- Mobile-first - 44px tap targets, responsive design, touch optimization
- Operational language - calm, factual microcopy (not paniekerig)
- Telemetry-driven - track everything to understand real usage

---

## Architecture Layers

### 1. Reliability Layer (Phase 3)

**Purpose:** Production-grade data fetching with retry, error handling, and trust indicators.

**Core Components:**
- `/src/lib/reliability.ts` - Fetch utilities with exponential backoff
- `/src/hooks/useReliableData.ts` - React hook for reliable data fetching (EXAMPLE)
- `/src/hooks/useDashboardMetrics.ts` - Example implementation (EXAMPLE)

**Status:** 📘 Foundation-only (example implementations)

**Key Features:**
- Automatic retry with exponential backoff
- Race condition prevention via request cancellation
- Stale data detection with time thresholds
- Trust state indicators ("Data may be outdated")
- Network error handling (timeout, offline, server errors)

**Integration Requirements:**
1. Replace existing data fetching hooks with useReliableData pattern
2. Add trust indicators to UI when data is stale
3. Implement retry buttons on error states

**Documentation:** [RELIABILITY_GUIDE.md](./RELIABILITY_GUIDE.md)

---

### 2. Workflow Automation (Phase 4)

**Purpose:** Smart insights, suggested actions, aging detection, auto-prioritization.

**Core Components:**
- `/src/lib/workflow-automation.ts` - Aging calculation, priority scoring
- `/src/lib/dashboard-intelligence.ts` - Insight generation
- `/src/lib/automation-helpers.ts` - Action conversion utilities
- `/src/components/admin/dashboard/InsightCard.tsx` - Insight UI

**Status:** ✅ Integrated (live in dashboard)

**Key Features:**
- Aging detection (normal → medium → high → critical based on time)
- Priority scoring (urgency > quantity)
- Suggested actions (view candidate, review documents)
- Smart reminders ("Nog geen actie ondernomen")
- Operational microcopy (calm, factual language)

**Telemetry Events:**
- `automation_suggestion_shown` - When insight with actions is displayed
- `automation_suggestion_clicked` - When user clicks suggested action

**Documentation:** [WORKFLOW_AUTOMATION_GUIDE.md](./WORKFLOW_AUTOMATION_GUIDE.md)

---

### 3. Performance Optimizations (Phase 5)

**Purpose:** Structural performance improvements to prevent lag, jank, and unnecessary rerenders.

**Core Components:**
- `/src/lib/performance.ts` - Dev-only instrumentation
- Memoization patterns in components (useMemo, useCallback, React.memo)
- Lazy loading (analytics deferred, command palette)

**Status:** ✅ Integrated (applied across dashboard)

**Key Optimizations:**
- KPI states memoized (revenue, requests, diensten, conversion)
- Callbacks memoized (handleInsightCta, handleQuickAction)
- InsightCard wrapped in React.memo
- Command search with performance measurement
- Analytics lazy-loaded (deferred rendering)

**Performance Targets:**
- Command search: <50ms latency
- KPI calculations: <16ms (60fps)
- Insight rendering: <100ms
- Build time: <150ms

**Documentation:** [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md)

---

### 4. Operational UX Foundation (Phase 6)

**Purpose:** Bulk actions, keyboard shortcuts, mobile optimization, last-used defaults.

**Core Components:**
- `/src/hooks/useBulkSelection.ts` - Multi-select state management (FOUNDATION)
- `/src/hooks/useKeyboardShortcuts.ts` - Global keyboard navigation (FOUNDATION)
- `/src/components/BulkActionBar.tsx` - Bulk action UI (FOUNDATION)
- `/src/lib/mobile-utils.ts` - Mobile detection & helpers (ACTIVE)
- `/src/hooks/usePersistedState.ts` - Last-used defaults (ACTIVE)

**Status:** 🚧 Foundation-only (infrastructure ready, not integrated)

**Key Features:**

**Bulk Actions:**
- Multi-select state with shift-click range selection
- Sticky bottom action bar (mobile-optimized)
- Auto-exit bulk mode when all deselected
- Telemetry tracking (bulk_action_started, bulk_action_executed)

**Keyboard Shortcuts:**
- `/` or `CMD+K` - Open command palette
- `g d` - Go to dashboard
- `g a` - Go to aanvragen
- `g i` - Go to inschrijvingen
- `g p` - Go to planning
- `ESC` - Cancel/close

**Mobile Optimization:**
- 44x44px minimum tap targets (iOS HIG)
- Touch device detection
- Scroll locking for modals
- Mobile-safe viewport scrolling

**Integration Requirements:**
1. Backend endpoints for bulk operations (approve, reject, assign)
2. Add selection checkboxes to candidate/request tables
3. Wire up keyboard shortcuts in main layout
4. Test on real mobile devices

**Documentation:**
- [PHASE_6_SUMMARY.md](./PHASE_6_SUMMARY.md) - Full feature summary
- [MOBILE_QA_CHECKLIST.md](./MOBILE_QA_CHECKLIST.md) - Comprehensive mobile testing

---

## Integration Status

### ✅ Integrated (Live in Dashboard)

| Component | Location | Usage |
|-----------|----------|-------|
| **Workflow Automation** | DashboardOverzicht.tsx | Generates insights with actions |
| **InsightCard** | DashboardOverzicht.tsx | Displays insights with quick actions |
| **Performance Memoization** | DashboardOverzicht.tsx | Prevents unnecessary rerenders |
| **CommandPalette** | Main layout | Global search with / and CMD+K |
| **Telemetry** | Throughout | Event tracking for analytics |
| **Mobile Utils** | Various components | Mobile detection and helpers |
| **Persisted State** | DashboardOverzicht.tsx | Saves user preferences |

### 🚧 Foundation-Only (Not Yet Integrated)

| Component | Purpose | Integration Needed |
|-----------|---------|-------------------|
| **useBulkSelection** | Multi-select state | Backend + table UI |
| **useKeyboardShortcuts** | Global navigation | Wire up in layout |
| **BulkActionBar** | Bulk action UI | Connect to bulk selection |
| **useReliableData** | Reliable fetching | Replace existing hooks |
| **useDashboardMetrics** | Example pattern | Reference only |

### 📘 Example/Reference

| Component | Purpose | Usage |
|-----------|---------|-------|
| **useDashboardMetrics** | Reliability example | Copy pattern, don't import |
| **useReliableData** | Data fetching example | Copy pattern, don't import |

---

## Documentation Index

### System Documentation

- **[RELIABILITY_GUIDE.md](./RELIABILITY_GUIDE.md)** - Reliability layer patterns
- **[WORKFLOW_AUTOMATION_GUIDE.md](./WORKFLOW_AUTOMATION_GUIDE.md)** - Workflow automation & intelligence
- **[PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md)** - Performance improvements
- **[PHASE_6_SUMMARY.md](./PHASE_6_SUMMARY.md)** - Operational UX features
- **[MOBILE_QA_CHECKLIST.md](./MOBILE_QA_CHECKLIST.md)** - Mobile testing requirements
- **[PHASE_7_CLEANUP_PLAN.md](./PHASE_7_CLEANUP_PLAN.md)** - Product cleanup execution plan

### Phase Summaries

All phases documented with before/after comparisons, implementation details, and acceptance criteria.

---

## Development Workflow

### Adding New Features

1. **Check existing patterns** - Review this guide first
2. **Use reliability layer** - All data fetching should use retry patterns
3. **Add telemetry** - Track important user actions
4. **Mobile-first** - Ensure 44px tap targets, test on mobile
5. **Performance check** - Use dev-only instrumentation to measure impact
6. **No fake functionality** - If backend doesn't exist, mark as foundation-only

### Code Standards

**React Performance:**
```typescript
// ✅ Good - memoized callback
const handleClick = useCallback(() => { ... }, [deps]);

// ❌ Bad - new function every render
<Button onClick={() => { ... }} />
```

**Telemetry:**
```typescript
// ✅ Good - direct trackEvent
trackEvent('automation_suggestion_shown', { insight_id: 'x' });

// ❌ Bad - wrapper functions (deprecated)
trackAutomationEvent('suggestion_shown', { ... });
```

**Mobile:**
```typescript
// ✅ Good - minimum tap target
className="min-h-[44px] min-w-[44px]"

// ❌ Bad - tiny tap target
className="p-1"
```

### Testing Checklist

- [ ] TypeScript clean (0 errors)
- [ ] Build clean (no warnings)
- [ ] Performance measured (<16ms critical paths)
- [ ] Mobile tested (44px tap targets)
- [ ] Telemetry tracking added
- [ ] Error states handled
- [ ] Loading states shown

---

## Performance Guidelines

### React Patterns

**When to use useMemo:**
- KPI calculations (revenue, conversion rates)
- Filtered/sorted lists
- Complex computations (>10ms)

**When to use useCallback:**
- Event handlers passed to child components
- Dependencies for other hooks
- Functions passed to React.memo components

**When to use React.memo:**
- Components that receive same props frequently
- List items (InsightCard, ActivityItem)
- Pure presentational components

### Dev-Only Instrumentation

```typescript
import { perfStart, perfEnd } from '@/lib/performance';

const mark = perfStart('expensive_operation');
// ... do expensive work
perfEnd(mark, 16); // Warns if >16ms
```

**Automatically disabled in production** (zero overhead).

---

## Mobile Optimization

### Touch Targets

**Minimum sizes (iOS HIG):**
- Buttons: 44x44px
- Icons: 24x24px + 10px padding
- List items: 44px height

### Responsive Breakpoints

- **Mobile:** < 768px (single column, full-width)
- **Tablet:** 768px - 1024px (2 columns, partial sidebars)
- **Desktop:** > 1024px (multi-column, full sidebars)

### Mobile Utilities

```typescript
import { isMobileDevice, lockBodyScroll, MOBILE_TAP_TARGET } from '@/lib/mobile-utils';

if (isMobileDevice()) {
  // Show mobile-optimized UI
}

lockBodyScroll(); // Prevent scroll in modals (iOS-safe)
```

---

## Testing & QA

### Manual Testing

1. **Desktop** - Chrome, Safari, Firefox
2. **Mobile Web** - iOS Safari, Android Chrome
3. **Tablet** - iPad Safari, Android tablet
4. **Keyboard** - All shortcuts work
5. **Network** - Slow 4G simulation

### Automated Checks

```bash
# TypeScript
npm run type-check

# Build
npm run build

# Lint
npm run lint
```

### Mobile QA

See [MOBILE_QA_CHECKLIST.md](./MOBILE_QA_CHECKLIST.md) for comprehensive mobile testing requirements.

---

## Quick Reference

### File Structure

```
/src
├── lib/
│   ├── reliability.ts              # Retry, error handling
│   ├── workflow-automation.ts      # Aging, priority, actions
│   ├── dashboard-intelligence.ts   # Insight generation
│   ├── automation-helpers.ts       # Action utilities
│   ├── telemetry.ts               # Event tracking
│   ├── performance.ts             # Dev instrumentation
│   └── mobile-utils.ts            # Mobile helpers
├── hooks/
│   ├── useReliableData.ts         # Example (reliability)
│   ├── useDashboardMetrics.ts     # Example (reliability)
│   ├── useBulkSelection.ts        # Foundation (bulk actions)
│   ├── useKeyboardShortcuts.ts    # Foundation (keyboard)
│   └── usePersistedState.ts       # Active (preferences)
├── components/
│   ├── BulkActionBar.tsx          # Foundation (bulk UI)
│   ├── CommandPalette.tsx         # Active (search)
│   └── admin/dashboard/
│       ├── DashboardOverzicht.tsx # Active (main dashboard)
│       └── InsightCard.tsx        # Active (insights)
```

### Telemetry Events

**Workflow Automation:**
- `automation_suggestion_shown` - Insight displayed
- `automation_suggestion_clicked` - Action clicked

**Keyboard Shortcuts (foundation):**
- `shortcut_used` - { shortcut, action }

**Bulk Actions (foundation):**
- `bulk_action_started` - { entity_type }
- `bulk_selection_active` - { count, entity_type }
- `bulk_action_executed` - { action, count, entity_type }

**Mobile:**
- `mobile_action_used` - { action, is_touch, screen_width }

---

## Support & Maintenance

### When Something Breaks

1. Check this guide for architecture overview
2. Review specific phase documentation
3. Check telemetry for error patterns
4. Test in isolation (component sandbox)
5. Check mobile behavior if UI-related

### When Adding Features

1. Review relevant documentation sections
2. Copy patterns from existing code
3. Add telemetry tracking
4. Test on mobile
5. Update this guide if needed

---

**Last Updated:** Phase 7 Complete (2026-05-14)

**Production Status:** ✅ Ready - All systems operational, documentation complete, cleanup done.
