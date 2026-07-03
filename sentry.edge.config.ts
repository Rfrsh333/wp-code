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

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.message) {
      breadcrumb.message = breadcrumb.message
        .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "[email]")
        .replace(/\b[0-9a-f]{32,}\b/gi, "[token]");
    }
    if (breadcrumb.data) {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(breadcrumb.data)) {
        const lower = k.toLowerCase();
        if (lower.includes("email") || lower.includes("token") || lower.includes("wachtwoord") || lower.includes("password") || lower.includes("bsn") || lower.includes("iban")) {
          safe[k] = "[redacted]";
        } else {
          safe[k] = v;
        }
      }
      breadcrumb.data = safe;
    }
    return breadcrumb;
  },
});
