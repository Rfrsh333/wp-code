import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f8b72e668665790291e578e574357a20@o4511040949387264.ingest.de.sentry.io/4511040950566992",

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "dev",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  sendDefaultPii: false,

  // Performance: 10% in prod, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay — sample rates are picked up when replay integration loads
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Structured logs
  enableLogs: true,

  // Replay integration is lazy-loaded below to reduce initial bundle (~80KB saving)
  integrations: [],

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

// Lazy-load Session Replay — alléén ná cookie-consent (analytics/marketing).
// Session Replay neemt de DOM van (geauthenticeerde) pagina's op; dat mag pas met
// toestemming (AVG). Consent = localStorage "ttj_cookie_consent" === "all", identiek
// aan de GTM-loader. Errortracking hierboven blijft actief (gerechtvaardigd belang).
if (typeof window !== "undefined") {
  let replayGeladen = false;

  const loadReplay = () => {
    if (replayGeladen) return;
    if (window.localStorage.getItem("ttj_cookie_consent") !== "all") return;
    replayGeladen = true;
    setTimeout(() => {
      import("@sentry/nextjs").then(({ replayIntegration, addIntegration }) => {
        addIntegration(replayIntegration());
      });
    }, 3000);
  };

  const scheduleWhenReady = () => {
    if (document.readyState === "complete") {
      loadReplay();
    } else {
      window.addEventListener("load", loadReplay, { once: true });
    }
  };

  // Nu laden als consent al gegeven is; anders zodra consent later wordt verleend.
  scheduleWhenReady();
  window.addEventListener("ttj-cookie-consent", (event) => {
    if ((event as CustomEvent<string>).detail === "all") loadReplay();
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
