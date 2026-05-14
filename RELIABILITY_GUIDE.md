# Production-Grade Reliability Guide

This guide explains the reliability patterns implemented in the TopTalent dashboard for production-grade operational software.

## Overview

The reliability system provides:
- **Automatic retry** with exponential backoff
- **Race condition prevention** via request cancellation
- **Stale data detection** and trust indicators
- **Graceful error handling** with user-friendly messages
- **Network resilience** with timeout and fallback patterns
- **Telemetry integration** for error tracking

## Core Modules

### `/src/lib/reliability.ts`

Core reliability utilities for production-grade error handling.

**Key Functions:**

```typescript
// Retry with exponential backoff
await retryWithBackoff(async () => {
  return await fetchData();
}, {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
});

// Fetch with automatic retry and timeout
const data = await fetchWithRetry<DataType>(
  '/api/endpoint',
  {
    method: 'GET',
    timeout: 10000, // 10s
  },
  {
    maxAttempts: 3,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  }
);

// Request cancellation (prevents race conditions)
const canceller = new RequestCanceller();
const signal = canceller.getSignal('request-key');
// Automatically cancels previous request with same key

// Stale data detection
const isStale = isDataStale(lastUpdate, 5); // 5 minutes threshold

// Trust state messages
const message = getTrustStateMessage(state);
// Returns: "Geen internetverbinding", "Data van 5 min geleden", etc.
```

### `/src/hooks/useReliableData.ts`

React hook for reliable data fetching with complete error handling.

**Usage:**

```typescript
const { data, state, reload, trustMessage } = useReliableData<DataType>(
  'unique-key',
  fetchFunction,
  {
    enabled: true,
    staleThresholdMinutes: 5,
    refetchOnMount: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retryConfig: {
      maxAttempts: 3,
      initialDelay: 1000,
    },
    onSuccess: (data) => {
      console.log('Data loaded:', data);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  }
);

// State interface:
interface RequestState {
  isLoading: boolean;
  error: RequestError | null;
  lastSuccess: Date | null;
  isStale: boolean;
  retryCount: number;
}
```

### `/src/components/ErrorBoundary.tsx`

Production-grade error boundaries for graceful error handling.

**Usage:**

```tsx
// Page-level (full page fallback)
<ErrorBoundary level="page">
  <YourPage />
</ErrorBoundary>

// Section-level (card/section fallback)
<ErrorBoundary level="section">
  <YourSection />
</ErrorBoundary>

// Component-level (inline fallback)
<ErrorBoundary level="component">
  <YourComponent />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={<CustomFallback />}>
  <YourComponent />
</ErrorBoundary>

// Reset on prop changes
<ErrorBoundary resetKeys={[userId, dataVersion]}>
  <YourComponent />
</ErrorBoundary>
```

### `/src/components/admin/dashboard/ReliabilityIndicator.tsx`

Subtle trust and error state indicators.

**Usage:**

```tsx
import { ReliabilityIndicator, ReliabilityBadge, ReliabilityBanner } from './ReliabilityIndicator';

// Inline indicator (subtle)
<ReliabilityIndicator
  state={state}
  trustMessage={trustMessage}
  onRetry={reload}
  variant="inline"
/>

// Badge variant (for cards)
<ReliabilityBadge
  state={state}
  trustMessage="Data van 5 min geleden"
  onRetry={reload}
/>

// Banner variant (for prominent sections)
<ReliabilityBanner
  state={state}
  trustMessage="Data tijdelijk niet beschikbaar"
  onRetry={reload}
/>
```

## Complete Integration Example

### 1. Create Data Hook

```typescript
// /src/hooks/useDashboardMetrics.ts
import { useReliableData } from './useReliableData';
import { fetchWithRetry } from '@/lib/reliability';

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return await fetchWithRetry<DashboardMetrics>(
    '/api/dashboard/metrics',
    {
      method: 'GET',
      timeout: 10000,
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
    }
  );
}

export function useDashboardMetrics() {
  return useReliableData<DashboardMetrics>(
    'dashboard-metrics',
    fetchDashboardMetrics,
    {
      staleThresholdMinutes: 5,
      refetchInterval: 5 * 60 * 1000,
    }
  );
}
```

### 2. Use in Component

```tsx
// /src/components/admin/dashboard/MetricsSection.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReliabilityBanner } from './ReliabilityIndicator';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

export function MetricsSection() {
  const { data, state, reload, trustMessage } = useDashboardMetrics();

  return (
    <ErrorBoundary level="section">
      <div className="space-y-4">
        {/* Error/stale banner */}
        <ReliabilityBanner
          state={state}
          trustMessage={trustMessage}
          onRetry={reload}
        />

        {/* Loading state */}
        {state.isLoading && <SkeletonMetrics />}

        {/* Error state (if no previous data) */}
        {state.error && !data && (
          <ErrorState
            message={trustMessage || 'Data niet beschikbaar'}
            onRetry={reload}
            retryable={state.error.retryable}
          />
        )}

        {/* Success state (show data even if stale) */}
        {data && (
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Omzet"
              value={formatCurrency(data.omzet.dezeMaand)}
              change={calculateChange(data.omzet)}
            />
            {/* More cards... */}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
```

## Design Principles

### 1. **Retry Intelligently**
- Use exponential backoff to avoid hammering the server
- Limit retry attempts (typically 2-3 for non-critical, 3-5 for critical)
- Only retry retryable errors (network, timeout, 5xx, 429)

### 2. **Show Subtle Trust Indicators**
- No scary error messages for users
- Use calm language: "Data tijdelijk niet beschikbaar" not "ERROR: Failed to fetch"
- Show last success time to build trust
- Orange/amber for operational issues, red reserved for critical failures

### 3. **Prevent Race Conditions**
- Cancel obsolete requests when new ones are initiated
- Use RequestCanceller for keyed requests
- Clean up on component unmount

### 4. **Graceful Degradation**
- Show stale data while fetching fresh data
- Provide retry buttons for recoverable errors
- Never crash the UI - always show fallback

### 5. **Performance Conscious**
- Batch telemetry events
- Use reasonable refetch intervals (not too aggressive)
- Cancel requests that are no longer needed

## Error Severity Levels

### Network Errors (Retryable)
- **Type:** `network`
- **Message:** "Geen internetverbinding"
- **Retry:** Yes
- **Severity:** Medium

### Timeout Errors (Retryable)
- **Type:** `timeout`
- **Message:** "Verzoek duurde te lang"
- **Retry:** Yes
- **Severity:** Medium

### Server Errors (Conditionally Retryable)
- **Type:** `server`
- **Status 5xx:** Retryable (server issue)
- **Status 4xx:** Not retryable (client error, except 408, 429)
- **Severity:** Medium to High

### Unknown Errors (Not Retryable)
- **Type:** `unknown`
- **Message:** "Er is een fout opgetreden"
- **Retry:** No
- **Severity:** High

## Testing Reliability

### Development Testing

```typescript
// Simulate network error
throw new RequestError({
  type: 'network',
  message: 'Network error',
  retryable: true,
});

// Simulate timeout
throw new RequestError({
  type: 'timeout',
  message: 'Request timed out',
  retryable: true,
});

// Simulate server error
throw new RequestError({
  type: 'server',
  message: 'HTTP 503',
  statusCode: 503,
  retryable: true,
});
```

### Console Logging

In development mode, reliability system logs:
- Retry attempts: `[Reliability] Retry attempt 2/3 { delay: "2000ms" }`
- Request cancellations: `[Reliability] Cancelled obsolete request: request-key`
- Error tracking: Automatically sent to telemetry

## Best Practices

### DO:
✅ Use `useReliableData` for all critical data fetching
✅ Show stale data while fetching fresh data
✅ Provide retry buttons for recoverable errors
✅ Use ErrorBoundary at appropriate levels
✅ Set reasonable stale thresholds (2-5 minutes)
✅ Use calm, user-friendly error messages
✅ Track errors with telemetry

### DON'T:
❌ Show scary technical error messages to users
❌ Retry non-retryable errors (4xx except 408, 429)
❌ Use aggressive refetch intervals (< 1 minute)
❌ Forget to cancel requests on unmount
❌ Block UI while retrying (show loading state)
❌ Hide that data is stale
❌ Ignore error tracking

## Migration Guide

### Before (Unreliable)

```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetch('/api/data')
    .then(res => res.json())
    .then(data => {
      setData(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
}, []);
```

**Problems:**
- No retry on failure
- No timeout handling
- No race condition prevention
- No stale data detection
- Poor error handling

### After (Reliable)

```typescript
const { data, state, reload, trustMessage } = useReliableData(
  'my-data',
  () => fetchWithRetry('/api/data', { timeout: 10000 }),
  {
    staleThresholdMinutes: 5,
    refetchInterval: 5 * 60 * 1000,
  }
);

return (
  <ErrorBoundary level="section">
    <ReliabilityBanner state={state} trustMessage={trustMessage} onRetry={reload} />
    {state.isLoading && <Skeleton />}
    {data && <Content data={data} />}
  </ErrorBoundary>
);
```

**Benefits:**
✅ Automatic retry with exponential backoff
✅ Timeout handling
✅ Race condition prevention
✅ Stale data detection
✅ User-friendly error states
✅ Telemetry integration
✅ Graceful degradation

## Configuration Reference

### `retryWithBackoff` Options

```typescript
interface RetryConfig {
  maxAttempts: number;        // Default: 3
  initialDelay: number;       // Default: 1000ms
  maxDelay: number;           // Default: 10000ms
  backoffMultiplier: number;  // Default: 2 (exponential)
  retryableStatuses?: number[]; // Default: [408, 429, 500, 502, 503, 504]
}
```

### `useReliableData` Options

```typescript
interface UseReliableDataOptions {
  enabled?: boolean;                 // Default: true
  staleThresholdMinutes?: number;    // Default: 5
  retryConfig?: Partial<RetryConfig>;
  refetchOnMount?: boolean;          // Default: true
  refetchInterval?: number;          // Default: undefined (no auto-refetch)
  onSuccess?: (data: any) => void;
  onError?: (error: RequestError) => void;
}
```

## Telemetry Integration

All reliability events are automatically tracked:

- `performance_metric` - Request success with duration
- `error_occurred` - Request failures with context
- `request_success` - Successful request with retry count
- `retry_exhausted` - All retry attempts failed
- `non_retryable_error` - Error that cannot be retried

View telemetry in development console or configure backend endpoint in `/src/lib/telemetry.ts`.

---

**Production-grade operational software. Reliable, trustworthy, calm.**
