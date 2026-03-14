import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring: 10% van requests
  tracesSampleRate: 0.1,

  // Session replay voor debugging
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.5,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Alleen in productie
  enabled: process.env.NODE_ENV === "production",

  // Filter ruis
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "Load failed",
    "ChunkLoadError",
  ],
});
