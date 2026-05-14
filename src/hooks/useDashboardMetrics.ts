/**
 * useDashboardMetrics - Reliable dashboard data fetching
 *
 * 📘 EXAMPLE IMPLEMENTATION - Reference pattern for reliability
 *
 * This file demonstrates how to use reliability patterns:
 * - Automatic retry with exponential backoff
 * - Race condition prevention
 * - Stale data detection
 * - Error handling with trust indicators
 *
 * This is a reference implementation showing the production-grade pattern
 * that should be used for all critical data fetching in the dashboard.
 *
 * See RELIABILITY_GUIDE.md for detailed documentation.
 */

import { useReliableData } from './useReliableData';
import { fetchWithRetry } from '@/lib/reliability';

/**
 * Dashboard metrics type (matches existing structure)
 */
export interface DashboardMetrics {
  omzet: {
    dezeMaand: number;
    vorigeMaand: number;
    openstaand: number;
  };
  aanvragen: {
    nieuw: number;
    inBehandeling: number;
    afgerond: number;
  };
  diensten: {
    totaal: number;
    actief: number;
    inactief: number;
  };
  kandidaten: {
    nieuw: number;
    documenten_opvragen: number;
    goedgekeurd: number;
    inzetbaar: number;
  };
}

/**
 * Fetch dashboard metrics with reliability patterns
 */
async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  // Example: fetch from API with automatic retry
  return await fetchWithRetry<DashboardMetrics>(
    '/api/admin/dashboard/metrics',
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000, // 10s timeout
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
    }
  );
}

/**
 * Hook for dashboard metrics with reliability patterns
 *
 * Usage in components:
 * ```tsx
 * const { data, state, reload, trustMessage } = useDashboardMetrics();
 *
 * if (state.isLoading) return <SkeletonMetrics />;
 * if (state.error) return <ErrorState message={trustMessage} onRetry={reload} />;
 * if (!data) return null;
 *
 * return <MetricsDisplay data={data} />;
 * ```
 */
export function useDashboardMetrics() {
  return useReliableData<DashboardMetrics>(
    'dashboard-metrics',
    fetchDashboardMetrics,
    {
      enabled: true,
      staleThresholdMinutes: 5,
      refetchOnMount: true,
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
      },
    }
  );
}

/**
 * Activity feed data
 */
export interface DashboardActivity {
  id: string;
  type: 'aanvraag' | 'kandidaat' | 'dienst';
  naam: string;
  bedrijf?: string;
  functie?: string;
  created_at: string;
}

async function fetchDashboardActivity(): Promise<DashboardActivity[]> {
  return await fetchWithRetry<DashboardActivity[]>(
    '/api/admin/dashboard/activity',
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000,
    },
    {
      maxAttempts: 2, // Activity is less critical, fewer retries
      initialDelay: 500,
    }
  );
}

/**
 * Hook for dashboard activity feed
 */
export function useDashboardActivity() {
  return useReliableData<DashboardActivity[]>(
    'dashboard-activity',
    fetchDashboardActivity,
    {
      enabled: true,
      staleThresholdMinutes: 2, // Activity should be fresher
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
      retryConfig: {
        maxAttempts: 2,
        initialDelay: 500,
      },
    }
  );
}

/**
 * Example: Fetch insights data
 */
export interface DashboardInsight {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'action' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  metric?: number;
  timestamp?: string;
}

async function fetchDashboardInsights(): Promise<DashboardInsight[]> {
  return await fetchWithRetry<DashboardInsight[]>(
    '/api/admin/dashboard/insights',
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
    }
  );
}

/**
 * Hook for dashboard insights
 */
export function useDashboardInsights() {
  return useReliableData<DashboardInsight[]>(
    'dashboard-insights',
    fetchDashboardInsights,
    {
      enabled: true,
      staleThresholdMinutes: 3,
      refetchOnMount: true,
      refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
      },
    }
  );
}
