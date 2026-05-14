/**
 * useReliableData - Production-grade data fetching hook
 *
 * 📘 EXAMPLE IMPLEMENTATION - Reference pattern for reliable data fetching
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Race condition prevention
 * - Stale data detection
 * - Trust state indicators
 * - Network error handling
 * - Request cancellation on unmount
 *
 * This is a reference implementation showing production-grade data fetching.
 * Use this pattern for all critical dashboard data.
 *
 * See RELIABILITY_GUIDE.md for detailed documentation.
 *
 * Usage:
 * ```typescript
 * const { data, state, reload } = useReliableData(
 *   'dashboard-metrics',
 *   fetchDashboardMetrics,
 *   { staleThresholdMinutes: 5 }
 * );
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  retryWithBackoff,
  RequestCanceller,
  isDataStale,
  getTrustStateMessage,
  RequestState,
  RequestError,
  RetryConfig,
} from '@/lib/reliability';
import { trackError, trackPerformance } from '@/lib/telemetry';

export interface UseReliableDataOptions {
  enabled?: boolean;
  staleThresholdMinutes?: number;
  retryConfig?: Partial<RetryConfig>;
  refetchOnMount?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: RequestError) => void;
}

export interface UseReliableDataResult<T> {
  data: T | null;
  state: RequestState;
  reload: () => void;
  trustMessage: string | null;
}

/**
 * Hook for reliable data fetching with retry and error handling
 */
export function useReliableData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseReliableDataOptions = {}
): UseReliableDataResult<T> {
  const {
    enabled = true,
    staleThresholdMinutes = 5,
    retryConfig = {},
    refetchOnMount = true,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<RequestState>({
    isLoading: false,
    error: null,
    lastSuccess: null,
    isStale: false,
    retryCount: 0,
  });

  const cancellerRef = useRef(new RequestCanceller());
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  /**
   * Fetch data with reliability patterns
   */
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel any pending requests
    const signal = cancellerRef.current.getSignal(key);

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    const startTime = Date.now();

    try {
      const result = await retryWithBackoff(
        async () => {
          // Check if cancelled
          if (signal.aborted) {
            throw new Error('Request cancelled');
          }
          return await fetcher();
        },
        retryConfig
      );

      // Only update if still mounted and not cancelled
      if (!mountedRef.current || signal.aborted) {
        return;
      }

      const duration = Date.now() - startTime;
      trackPerformance('data_fetch_success', duration, { key });

      setData(result);
      setState({
        isLoading: false,
        error: null,
        lastSuccess: new Date(),
        isStale: false,
        retryCount: retryCountRef.current,
      });

      retryCountRef.current = 0;
      cancellerRef.current.complete(key);

      onSuccess?.(result);
    } catch (error) {
      // Only update if still mounted and not cancelled
      if (!mountedRef.current || signal.aborted) {
        return;
      }

      const requestError =
        error instanceof RequestError
          ? error
          : new RequestError({
              type: 'unknown',
              message: (error as Error).message,
              retryable: false,
            });

      trackError(requestError, { key, retryCount: retryCountRef.current });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: requestError,
        isStale: prev.lastSuccess ? isDataStale(prev.lastSuccess, staleThresholdMinutes) : true,
        retryCount: retryCountRef.current,
      }));

      retryCountRef.current++;
      cancellerRef.current.complete(key);

      onError?.(requestError);
    }
  }, [key, fetcher, enabled, retryConfig, staleThresholdMinutes, onSuccess, onError]);

  /**
   * Manual reload
   */
  const reload = useCallback(() => {
    retryCountRef.current = 0;
    fetchData();
  }, [fetchData]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
      cancellerRef.current.cancel(key);
    };
  }, [key, enabled, refetchOnMount, fetchData]);

  /**
   * Periodic refetch
   */
  useEffect(() => {
    if (!enabled || !refetchInterval) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [enabled, refetchInterval, fetchData]);

  /**
   * Stale data detection
   */
  useEffect(() => {
    if (!state.lastSuccess) return;

    const checkInterval = setInterval(() => {
      const isStale = isDataStale(state.lastSuccess!, staleThresholdMinutes);
      if (isStale !== state.isStale) {
        setState((prev) => ({ ...prev, isStale }));
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [state.lastSuccess, state.isStale, staleThresholdMinutes]);

  const trustMessage = getTrustStateMessage(state);

  return {
    data,
    state,
    reload,
    trustMessage,
  };
}

