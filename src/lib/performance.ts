/**
 * Performance Instrumentation (Dev-Only)
 *
 * Lightweight performance monitoring for development.
 * Zero impact in production.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

interface PerformanceMark {
  name: string;
  startTime: number;
}

/**
 * Start performance measurement
 */
export function perfStart(name: string): PerformanceMark | null {
  if (!IS_DEV) return null;

  return {
    name,
    startTime: performance.now(),
  };
}

/**
 * End performance measurement and log if slow
 */
export function perfEnd(mark: PerformanceMark | null, threshold: number = 16): void {
  if (!IS_DEV || !mark) return;

  const duration = performance.now() - mark.startTime;

  if (duration > threshold) {
    console.warn(`[Performance] ${mark.name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
  }
}

/**
 * Measure async operation
 */
export async function perfMeasure<T>(
  name: string,
  fn: () => Promise<T>,
  threshold: number = 100
): Promise<T> {
  if (!IS_DEV) return fn();

  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (duration > threshold) {
      console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Measure render performance with React hook
 */
export function usePerfMeasure(componentName: string, threshold: number = 16): void {
  if (!IS_DEV) return;

  const renderStart = performance.now();

  // Use useEffect to measure after render
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      const renderDuration = performance.now() - renderStart;

      if (renderDuration > threshold) {
        console.warn(
          `[Performance] ${componentName} render took ${renderDuration.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    });
  }
}

/**
 * Log slow operations
 */
export function logSlowOperation(operation: string, duration: number, threshold: number = 100): void {
  if (!IS_DEV) return;

  if (duration > threshold) {
    console.warn(`[Performance] Slow operation: ${operation} (${duration.toFixed(2)}ms)`);
  }
}

/**
 * Measure command search latency
 */
export function measureSearchLatency(query: string, resultsCount: number, duration: number): void {
  if (!IS_DEV) return;

  const threshold = 50; // Search should be < 50ms

  if (duration > threshold) {
    console.warn(
      `[Performance] Command search slow: "${query}" returned ${resultsCount} results in ${duration.toFixed(2)}ms`
    );
  }
}
