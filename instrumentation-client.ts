import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f8b72e668665790291e578e574357a20@o4511040949387264.ingest.de.sentry.io/4511040950566992",

  sendDefaultPii: false,

  // Performance: 10% in prod, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Structured logs
  enableLogs: true,

  integrations: [Sentry.replayIntegration()],

  // Filter ruis
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "Load failed",
    "ChunkLoadError",
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
