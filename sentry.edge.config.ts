import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f8b72e668665790291e578e574357a20@o4511040949387264.ingest.de.sentry.io/4511040950566992",

  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,
});
