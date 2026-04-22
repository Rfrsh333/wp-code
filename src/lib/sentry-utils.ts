import * as Sentry from "@sentry/nextjs";

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
