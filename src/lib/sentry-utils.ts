import * as Sentry from "@sentry/nextjs";

// ─── Client-side lazy wrappers (dynamic import to avoid bundling ~80KB) ───

/**
 * Lazily capture an exception on the client.
 * Uses dynamic import so @sentry/nextjs is only loaded when an error actually occurs.
 */
export async function captureClientException(error: unknown): Promise<void> {
  const { captureException } = await import("@sentry/nextjs");
  captureException(error);
}

/**
 * Lazily capture a message on the client.
 * Uses dynamic import so @sentry/nextjs is only loaded when needed.
 */
export async function captureClientMessage(
  message: string,
  level?: "fatal" | "error" | "warning" | "log" | "info" | "debug"
): Promise<void> {
  const { captureMessage } = await import("@sentry/nextjs");
  captureMessage(message, level);
}

// ─── Server-side utilities (eager import is fine for API routes) ───

/**
 * Capture an error in a route handler with route/action context tags.
 * Also logs to console.error for Vercel request logs.
 */
export function captureRouteError(
  error: unknown,
  context: { route: string; action?: string }
) {
  Sentry.withScope((scope) => {
    scope.setTag("route", context.route);
    if (context.action) scope.setTag("action", context.action);
    Sentry.captureException(error);
  });
  console.error(`[${context.route}]`, error);
}

/**
 * Wrap a cron job handler with Sentry Cron Monitors.
 * Reports in_progress/ok/error status to Sentry for missed job detection.
 */
export async function withCronMonitor<T>(
  monitorSlug: string,
  fn: () => Promise<T>
): Promise<T> {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug,
    status: "in_progress",
  });

  try {
    const result = await fn();
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: "ok",
    });
    return result;
  } catch (error) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: "error",
    });
    captureRouteError(error, { route: `/api/cron/${monitorSlug}`, action: "CRON" });
    throw error;
  }
}
