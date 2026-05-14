/**
 * Reliability & Trust Layer
 *
 * Production-grade error handling, retry patterns, and trust states.
 *
 * Design principles:
 * - Retry intelligently, don't hammer the server
 * - Show subtle trust indicators, not scary errors
 * - Cancel obsolete requests to avoid race conditions
 * - Detect stale data and inform users
 * - Graceful degradation, never crash the UI
 */

import { trackError, trackPerformance } from './telemetry';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses?: number[];
}

export interface RequestState {
  isLoading: boolean;
  error: RequestError | null;
  lastSuccess: Date | null;
  isStale: boolean;
  retryCount: number;
}


const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1s
  maxDelay: 10000, // 10s
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.initialDelay;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      // Track successful request
      trackPerformance('request_success', duration, {
        attempt,
        retriesNeeded: attempt - 1,
      });

      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        trackError(error as Error, {
          context: 'retry_exhausted',
          attempts: attempt,
        });
        break;
      }

      // Check if error is retryable
      const isRetryable = isRetryableError(error, finalConfig);
      if (!isRetryable) {
        trackError(error as Error, {
          context: 'non_retryable_error',
          attempts: attempt,
        });
        break;
      }

      // Wait before retry with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);

      // Log retry attempt in dev
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Reliability] Retry attempt ${attempt}/${finalConfig.maxAttempts}`, {
          delay: `${delay}ms`,
          error: (error as Error).message,
        });
      }
    }
  }

  throw lastError;
}

/**
 * Fetch with automatic retry and timeout
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const { timeout = 15000, ...fetchOptions } = options;

  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new RequestError({
          type: 'server',
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          retryable: isRetryableStatus(response.status, retryConfig),
        });
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof RequestError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new RequestError({
          type: 'timeout',
          message: 'Request timed out',
          retryable: true,
        });
      }

      throw new RequestError({
        type: 'network',
        message: 'Network error',
        retryable: true,
      });
    }
  }, retryConfig);
}

/**
 * Request cancellation manager
 * Prevents race conditions by canceling obsolete requests
 */
export class RequestCanceller {
  private controllers = new Map<string, AbortController>();

  /**
   * Get abort signal for a request key
   * Cancels any previous request with same key
   */
  getSignal(key: string): AbortSignal {
    // Cancel previous request if exists
    const existing = this.controllers.get(key);
    if (existing) {
      existing.abort();
      if (process.env.NODE_ENV === 'development') {
        console.log('[Reliability] Cancelled obsolete request:', key);
      }
    }

    // Create new controller
    const controller = new AbortController();
    this.controllers.set(key, controller);

    return controller.signal;
  }

  /**
   * Mark request as complete
   */
  complete(key: string): void {
    this.controllers.delete(key);
  }

  /**
   * Cancel specific request
   */
  cancel(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }
}

/**
 * Stale data detector
 */
export function isDataStale(
  lastUpdate: Date | string | null,
  thresholdMinutes: number = 5
): boolean {
  if (!lastUpdate) return true;

  const updateTime = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  const now = Date.now();
  const ageMinutes = (now - updateTime.getTime()) / 1000 / 60;

  return ageMinutes > thresholdMinutes;
}

/**
 * Get trust state message
 */
export function getTrustStateMessage(state: Partial<RequestState>): string | null {
  if (state.error) {
    if (state.error.type === 'network') {
      return 'Geen internetverbinding';
    }
    if (state.error.type === 'timeout') {
      return 'Verzoek duurde te lang';
    }
    if (state.error.retryable) {
      return 'Data tijdelijk niet beschikbaar';
    }
    return 'Fout bij laden van data';
  }

  if (state.isStale && state.lastSuccess) {
    const updateTime = state.lastSuccess;
    const now = Date.now();
    const ageMinutes = Math.floor((now - updateTime.getTime()) / 1000 / 60);

    if (ageMinutes < 60) {
      return `Data van ${ageMinutes} min geleden`;
    }
    const ageHours = Math.floor(ageMinutes / 60);
    if (ageHours < 24) {
      return `Data van ${ageHours} uur geleden`;
    }
    return 'Data mogelijk verouderd';
  }

  return null;
}

/**
 * Request Error class
 */
export class RequestError extends Error {
  type: 'network' | 'server' | 'timeout' | 'unknown';
  statusCode?: number;
  retryable: boolean;

  constructor(options: {
    type: 'network' | 'server' | 'timeout' | 'unknown';
    message: string;
    statusCode?: number;
    retryable: boolean;
  }) {
    super(options.message);
    this.name = 'RequestError';
    this.type = options.type;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable;
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown, config: Partial<RetryConfig>): boolean {
  if (error instanceof RequestError) {
    return error.retryable;
  }

  // Network errors are retryable
  if ((error as Error).name === 'TypeError' || (error as Error).name === 'AbortError') {
    return true;
  }

  return false;
}

/**
 * Check if HTTP status is retryable
 */
function isRetryableStatus(status: number, config: Partial<RetryConfig>): boolean {
  const retryableStatuses = config.retryableStatuses || DEFAULT_RETRY_CONFIG.retryableStatuses!;
  return retryableStatuses.includes(status);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get human-readable error message
 */
export function getErrorMessage(error: RequestError | Error | unknown): string {
  if (error instanceof RequestError) {
    switch (error.type) {
      case 'network':
        return 'Controleer je internetverbinding';
      case 'timeout':
        return 'Het verzoek duurde te lang';
      case 'server':
        if (error.statusCode === 404) {
          return 'Data niet gevonden';
        }
        if (error.statusCode && error.statusCode >= 500) {
          return 'Server tijdelijk niet bereikbaar';
        }
        return 'Er ging iets mis';
      default:
        return 'Er is een fout opgetreden';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Er is een onbekende fout opgetreden';
}

/**
 * Check if error should show retry button
 */
export function shouldShowRetry(error: RequestError | Error | unknown): boolean {
  if (error instanceof RequestError) {
    return error.retryable;
  }
  // Unknown errors are retryable by default
  return true;
}
