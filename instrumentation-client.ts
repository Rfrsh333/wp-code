import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f8b72e668665790291e578e574357a20@o4511040949387264.ingest.de.sentry.io/4511040950566992",

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "dev",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

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

  beforeSend(event) {
    // Strip user PII from client-side events
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
