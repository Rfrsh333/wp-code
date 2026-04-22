import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f8b72e668665790291e578e574357a20@o4511040949387264.ingest.de.sentry.io/4511040950566992",

  release: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,

  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      if (event.request.headers) {
        const { "user-agent": ua, "accept-language": lang } = event.request.headers;
        event.request.headers = { ...(ua && { "user-agent": ua }), ...(lang && { "accept-language": lang }) };
      }
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    return event;
  },
});
